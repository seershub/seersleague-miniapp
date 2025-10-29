import { NextResponse } from 'next/server';
import { createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';
import { publicClient, baseRpcUrl } from '@/lib/viem-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

/**
 * SMART RECOUNT - Prediction-based approach
 *
 * Instead of scanning MatchRegistered events (which might be outside block range),
 * we scan PredictionsSubmitted events to find which matches users actually predicted on.
 * Then we check if those matches are finished and record results.
 *
 * This solves the problem where old matches (registered 7+ days ago) are outside
 * the 1M block scan range.
 */

interface MatchResult {
  matchId: string;
  homeScore: number;
  awayScore: number;
  outcome: 1 | 2 | 3;
  finished: boolean;
}

// Helper: Sleep function for rate limiting
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchMatchResult(matchId: string, retries = 3): Promise<MatchResult | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(`${FOOTBALL_DATA_BASE}/matches/${matchId}`, {
        headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
        cache: 'no-store'
      });

      // Handle rate limiting (429)
      if (response.status === 429) {
        const waitTime = Math.min(5000 * Math.pow(2, attempt), 30000); // Exponential backoff: 5s, 10s, 20s
        console.log(`⚠️ Rate limited for match ${matchId}, waiting ${waitTime}ms...`);
        await sleep(waitTime);
        continue; // Retry
      }

      if (!response.ok) {
        console.error(`API error for match ${matchId}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const match = data.match || data;  // Handle both response formats

      if (match.status === 'FINISHED') {
        const homeScore = match.score?.fullTime?.home ?? 0;
        const awayScore = match.score?.fullTime?.away ?? 0;
        const outcome = homeScore > awayScore ? 1 : homeScore < awayScore ? 3 : 2;

        return {
          matchId,
          homeScore,
          awayScore,
          outcome: outcome as 1 | 2 | 3,
          finished: true
        };
      }

      return null;
    } catch (error) {
      console.error(`Failed to fetch match ${matchId} (attempt ${attempt + 1}/${retries}):`, error);
      if (attempt < retries - 1) {
        await sleep(2000); // Wait 2s before retry
      }
    }
  }
  return null;
}

async function getUserPrediction(
  userAddress: string,
  matchId: bigint
): Promise<number> {
  try {
    const prediction = await publicClient.readContract({
      address: CONTRACTS.SEERSLEAGUE,
      abi: SEERSLEAGUE_ABI,
      functionName: 'getUserPrediction',
      args: [userAddress as `0x${string}`, matchId]
    }) as { matchId: bigint; outcome: number; timestamp: bigint };

    return prediction?.outcome || 0;
  } catch (error) {
    return 0;
  }
}

async function sendTransaction(
  account: any,
  users: string[],
  matchIds: bigint[],
  corrects: boolean[]
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(baseRpcUrl)
    });

    const txHash = await walletClient.writeContract({
      account,
      address: CONTRACTS.SEERSLEAGUE,
      abi: SEERSLEAGUE_ABI,
      functionName: 'batchRecordResults',
      args: [
        users as `0x${string}`[],
        matchIds,
        corrects
      ]
    });

    return { success: true, txHash };
  } catch (error) {
    console.error('Transaction failed:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function POST(request: Request) {
  try {
    console.log('🧠 [SMART-RECOUNT] Starting prediction-based recount...');

    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: 'PRIVATE_KEY not configured' }, { status: 500 });
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);

    // STEP 1: Get ALL PredictionsSubmitted events (NO BLOCK LIMIT!)
    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');

    // Use deployment block if set, otherwise scan last 5M blocks (~1 month on Base)
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 5000000n;

    console.log(`📊 Scanning from block ${fromBlock} to ${currentBlock}`);
    console.log(`📊 Range: ${Number(currentBlock - fromBlock).toLocaleString()} blocks (~${Math.floor(Number(currentBlock - fromBlock) / 172800)} days)`);

    const predictionEvents = await publicClient.getLogs({
      address: CONTRACTS.SEERSLEAGUE,
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

    console.log(`✅ Found ${predictionEvents.length} PredictionsSubmitted events`);

    // STEP 2: Extract unique match IDs and users from predictions
    const matchIdSet = new Set<string>();
    const userSet = new Set<string>();
    const userMatchMap = new Map<string, Set<string>>(); // user -> match IDs

    predictionEvents.forEach((event: any) => {
      const user = event.args?.user?.toLowerCase();
      const matchIds = event.args?.matchIds || [];

      if (user) {
        userSet.add(user);

        if (!userMatchMap.has(user)) {
          userMatchMap.set(user, new Set());
        }

        matchIds.forEach((matchId: bigint) => {
          const matchIdStr = matchId.toString();
          matchIdSet.add(matchIdStr);
          userMatchMap.get(user)?.add(matchIdStr);
        });
      }
    });

    console.log(`👥 Found ${userSet.size} unique users`);
    console.log(`⚽ Found ${matchIdSet.size} unique match IDs from predictions`);

    // STEP 3: Check which matches are finished
    const now = Math.floor(Date.now() / 1000);
    const finishedMatches = new Map<string, MatchResult>();

    console.log('🔍 Checking match statuses from Football-data.org...');
    console.log('⚠️ Using rate limiting (1 request per second) to avoid HTTP 429...');

    let checkedCount = 0;
    for (const matchId of Array.from(matchIdSet)) {
      // First check if match has started (from contract)
      try {
        const matchInfo = await publicClient.readContract({
          address: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'getMatch',
          args: [BigInt(matchId)]
        }) as { startTime: bigint; exists: boolean };

        const startTime = Number(matchInfo.startTime);

        // Skip if not started yet (no buffer needed - Football-data API will tell us if finished)
        if (now < startTime) {
          continue;
        }

        // Fetch result from Football-data (with retry logic)
        const result = await fetchMatchResult(matchId);
        if (result && result.finished) {
          finishedMatches.set(matchId, result);
          console.log(`✅ Match ${matchId}: ${result.homeScore}-${result.awayScore} (outcome: ${result.outcome})`);
        }

        checkedCount++;
        if (checkedCount % 10 === 0) {
          console.log(`Progress: ${checkedCount}/${matchIdSet.size} matches checked...`);
        }

        // Rate limiting: Wait 1 second between API requests to avoid 429
        await sleep(1000);

      } catch (error) {
        console.error(`Error checking match ${matchId}:`, error);
      }
    }

    console.log(`✅ Found ${finishedMatches.size} finished matches`);

    if (finishedMatches.size === 0) {
      return NextResponse.json({
        success: true,
        message: 'No finished matches found',
        usersFound: userSet.size,
        matchIdsFromPredictions: matchIdSet.size,
        finishedMatches: 0
      });
    }

    // STEP 4: For each finished match, check all users who predicted it
    const batchUsers: string[] = [];
    const batchMatchIds: bigint[] = [];
    const batchCorrects: boolean[] = [];

    console.log('🔍 Checking user predictions...');

    for (const [matchId, result] of finishedMatches) {
      const matchIdBigInt = BigInt(matchId);

      // Find all users who predicted this match
      for (const user of userSet) {
        if (userMatchMap.get(user)?.has(matchId)) {
          const userPrediction = await getUserPrediction(user, matchIdBigInt);

          if (userPrediction !== 0) {
            const isCorrect = userPrediction === result.outcome;

            batchUsers.push(user);
            batchMatchIds.push(matchIdBigInt);
            batchCorrects.push(isCorrect);
          }
        }
      }
    }

    console.log(`✅ Total predictions to record: ${batchUsers.length}`);

    if (batchUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No predictions to record',
        usersFound: userSet.size,
        finishedMatches: finishedMatches.size,
        predictionsFound: 0
      });
    }

    // STEP 5: Send batch transaction
    console.log('📤 Sending batch transaction to blockchain...');
    const txResult = await sendTransaction(account, batchUsers, batchMatchIds, batchCorrects);

    if (!txResult.success) {
      return NextResponse.json(
        { error: txResult.error || 'Transaction failed' },
        { status: 500 }
      );
    }

    console.log(`✅ [SMART-RECOUNT] Complete! TxHash: ${txResult.txHash}`);

    return NextResponse.json({
      success: true,
      message: 'Smart recount completed successfully',
      usersFound: userSet.size,
      matchIdsFromPredictions: matchIdSet.size,
      finishedMatches: finishedMatches.size,
      predictionsRecorded: batchUsers.length,
      txHash: txResult.txHash,
      breakdown: {
        correctPredictions: batchCorrects.filter(c => c).length,
        incorrectPredictions: batchCorrects.filter(c => !c).length
      }
    });

  } catch (error) {
    console.error('❌ [SMART-RECOUNT] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'Smart Recount (Prediction-based)',
    description: 'Finds match IDs from PredictionsSubmitted events, then checks which are finished',
    method: 'POST',
    authentication: 'Bearer token required (CRON_SECRET)',
    advantages: [
      'No dependency on MatchRegistered event block range',
      'Finds ALL matches that users predicted on',
      'Works even if matches were registered months ago',
      'More efficient - only checks matches with predictions'
    ]
  });
}
