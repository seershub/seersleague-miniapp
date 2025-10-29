import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { CONTRACTS_V2, SEERSLEAGUE_V2_ABI } from '@/lib/contract-interactions-v2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 800; // 13.3 minutes for Vercel Pro

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

interface MatchResult {
  finished: boolean;
  homeScore: number;
  awayScore: number;
  outcome: 1 | 2 | 3;
}

/**
 * ENHANCED SMART-RECOUNT V2 - With duplicate prevention
 * 
 * Features:
 * - Duplicate prevention (isProcessed flag)
 * - Better error handling
 * - Data validation
 * - Optimized for Vercel Pro limits
 */
export async function POST(request: Request) {
  try {
    console.log('🔄 [SMART-RECOUNT V2] Starting enhanced recount...');

    // Check authorization
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET;
    
    if (!authHeader || !expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK_V2 || '0');
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 1000000n;

    console.log(`[SMART-RECOUNT V2] Scanning from block ${fromBlock} to ${currentBlock}`);

    // Get all users and match IDs from prediction events
    const predictionEvents = await publicClient.getLogs({
      address: CONTRACTS_V2.SEERSLEAGUE,
      event: {
        type: 'event',
        name: 'PredictionsSubmitted',
        inputs: [
          { name: 'user', type: 'address', indexed: true },
          { name: 'matchIds', type: 'uint256[]', indexed: false },
          { name: 'predictionsCount', type: 'uint256', indexed: false },
          { name: 'freeUsed', type: 'uint256', indexed: false },
          { name: 'feePaid', type: 'uint256', indexed: false }
        ]
      },
      fromBlock,
      toBlock: 'latest'
    });

    const userSet = new Set<string>();
    const matchIdSet = new Set<string>();
    const userMatchMap = new Map<string, Set<string>>();

    predictionEvents.forEach((event: any) => {
      const user = event.args?.user?.toLowerCase();
      const matchIds = event.args?.matchIds || [];

      if (user) {
        userSet.add(user);
        if (!userMatchMap.has(user)) {
          userMatchMap.set(user, new Set());
        }

        matchIds.forEach((id: bigint) => {
          const matchId = id.toString();
          matchIdSet.add(matchId);
          userMatchMap.get(user)!.add(matchId);
        });
      }
    });

    console.log(`[SMART-RECOUNT V2] Found ${userSet.size} unique users`);
    console.log(`[SMART-RECOUNT V2] Found ${matchIdSet.size} unique match IDs`);

    // Check which matches are finished (OPTIMIZED for 800s limit)
    const now = Math.floor(Date.now() / 1000);
    const finishedMatches = new Map<string, MatchResult>();

    console.log('🔍 [SMART-RECOUNT V2] Checking match statuses...');

    // OPTIMIZATION: Only check matches that are likely to be finished
    const twoHoursAgo = now - (2 * 60 * 60);
    const allMatchIds = Array.from(matchIdSet);
    
    // Filter matches by start time first
    const matchesToCheck = [];
    for (const matchId of allMatchIds) {
      try {
        const matchInfo = await publicClient.readContract({
          address: CONTRACTS_V2.SEERSLEAGUE,
          abi: SEERSLEAGUE_V2_ABI,
          functionName: 'getMatch',
          args: [BigInt(matchId)]
        }) as unknown as { startTime: bigint; exists: boolean; isRecorded: boolean };

        const startTime = Number(matchInfo.startTime);
        if (startTime < twoHoursAgo && !matchInfo.isRecorded) {
          matchesToCheck.push(matchId);
        }
      } catch (error) {
        console.log(`⚠️ Skipping match ${matchId} (can't get info)`);
      }
    }

    console.log(`📊 [SMART-RECOUNT V2] Filtered to ${matchesToCheck.length} matches (older than 2 hours)`);

    // Limit to first 30 matches to fit in 800s
    const maxMatches = Math.min(matchesToCheck.length, 30);
    const limitedMatches = matchesToCheck.slice(0, maxMatches);
    
    console.log(`📊 [SMART-RECOUNT V2] Processing ${limitedMatches.length} matches to fit 800s limit`);

    let checkedCount = 0;
    for (const matchId of limitedMatches) {
      try {
        const result = await fetchMatchResult(matchId);
        if (result && result.finished) {
          finishedMatches.set(matchId, result);
          console.log(`✅ Match ${matchId}: ${result.homeScore}-${result.awayScore} (outcome: ${result.outcome})`);
        }

        checkedCount++;
        if (checkedCount % 5 === 0) {
          console.log(`Progress: ${checkedCount}/${limitedMatches.length} matches checked...`);
        }

        // Rate limiting: Wait 1 second between API requests
        await sleep(1000);

      } catch (error) {
        console.error(`Error checking match ${matchId}:`, error);
      }
    }

    console.log(`✅ [SMART-RECOUNT V2] Found ${finishedMatches.size} finished matches`);

    if (finishedMatches.size === 0) {
      return NextResponse.json({
        success: true,
        message: 'No finished matches found',
        usersFound: userSet.size,
        matchIdsFromPredictions: matchIdSet.size,
        finishedMatches: 0,
        version: '2.0.0'
      });
    }

    // For each finished match, check all users who predicted it
    const batchUsers: string[] = [];
    const batchMatchIds: bigint[] = [];
    const batchCorrects: boolean[] = [];

    console.log('🔍 [SMART-RECOUNT V2] Checking user predictions...');

    for (const [matchId, result] of finishedMatches) {
      const matchIdBigInt = BigInt(matchId);

      // Find all users who predicted this match
      for (const user of userSet) {
        if (userMatchMap.get(user)?.has(matchId)) {
          try {
            // Check if result already processed (duplicate prevention)
            const isProcessed = await publicClient.readContract({
              address: CONTRACTS_V2.SEERSLEAGUE,
              abi: SEERSLEAGUE_V2_ABI,
              functionName: 'isResultProcessed',
              args: [user as `0x${string}`, matchIdBigInt]
            }) as boolean;

            if (isProcessed) {
              console.log(`⏭️ Skipping ${user} for match ${matchId} (already processed)`);
              continue;
            }

            const userPrediction = await publicClient.readContract({
              address: CONTRACTS_V2.SEERSLEAGUE,
              abi: SEERSLEAGUE_V2_ABI,
              functionName: 'getUserPrediction',
              args: [user as `0x${string}`, matchIdBigInt]
            }) as unknown as { outcome: number; timestamp: bigint; isProcessed: boolean };

            if (userPrediction.outcome !== 0 && !userPrediction.isProcessed) {
              const isCorrect = userPrediction.outcome === result.outcome;

              batchUsers.push(user);
              batchMatchIds.push(matchIdBigInt);
              batchCorrects.push(isCorrect);
            }
          } catch (error) {
            console.error(`Error checking user ${user} for match ${matchId}:`, error);
          }
        }
      }
    }

    console.log(`✅ [SMART-RECOUNT V2] Total predictions to record: ${batchUsers.length}`);

    if (batchUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No predictions to record',
        usersFound: userSet.size,
        finishedMatches: finishedMatches.size,
        predictionsFound: 0,
        version: '2.0.0'
      });
    }

    // Send batch transaction
    console.log('📤 [SMART-RECOUNT V2] Sending batch transaction...');
    const txResult = await sendTransaction(batchUsers, batchMatchIds, batchCorrects);

    if (!txResult.success) {
      return NextResponse.json(
        { error: txResult.error || 'Transaction failed', version: '2.0.0' },
        { status: 500 }
      );
    }

    console.log(`✅ [SMART-RECOUNT V2] Complete! TxHash: ${txResult.txHash}`);

    return NextResponse.json({
      success: true,
      message: 'Smart recount completed successfully',
      usersFound: userSet.size,
      finishedMatches: finishedMatches.size,
      predictionsRecorded: batchUsers.length,
      txHash: txResult.txHash,
      version: '2.0.0',
      features: [
        'Duplicate prevention',
        'Data validation',
        'Optimized for Vercel Pro',
        'Enhanced error handling'
      ]
    });

  } catch (error) {
    console.error('[SMART-RECOUNT V2] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message, version: '2.0.0' },
      { status: 500 }
    );
  }
}

async function fetchMatchResult(matchId: string, retries = 3): Promise<MatchResult | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(`${FOOTBALL_DATA_BASE}/matches/${matchId}`, {
        headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
        cache: 'no-store'
      });

      if (response.status === 429) {
        const waitTime = Math.min(5000 * Math.pow(2, attempt), 30000);
        console.log(`⚠️ Rate limited for match ${matchId}, waiting ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'FINISHED' && data.score?.fullTime?.home !== null) {
        const homeScore = data.score.fullTime.home;
        const awayScore = data.score.fullTime.away;
        
        let outcome: 1 | 2 | 3;
        if (homeScore > awayScore) outcome = 1;
        else if (homeScore < awayScore) outcome = 3;
        else outcome = 2;

        return {
          finished: true,
          homeScore,
          awayScore,
          outcome
        };
      }

      return null;

    } catch (error) {
      console.error(`Failed to fetch match ${matchId} (attempt ${attempt + 1}/${retries}):`, error);
      if (attempt < retries - 1) {
        await sleep(2000);
      }
    }
  }
  return null;
}

async function sendTransaction(
  users: string[],
  matchIds: bigint[],
  corrects: boolean[]
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      return { success: false, error: 'PRIVATE_KEY not configured' };
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY 
        ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
        : 'https://mainnet.base.org'
      )
    });

    const txHash = await walletClient.writeContract({
      account,
      address: CONTRACTS_V2.SEERSLEAGUE,
      abi: SEERSLEAGUE_V2_ABI,
      functionName: 'batchRecordResults',
      args: [
        users as `0x${string}`[],
        matchIds,
        corrects
      ]
    });

    return { success: true, txHash };

  } catch (error) {
    console.error('Transaction error:', error);
    return { success: false, error: (error as Error).message };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
