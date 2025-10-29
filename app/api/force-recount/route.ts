import { NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC || 'https://api.developer.coinbase.com/rpc/v1/base/DzCv9JnMZKpreOiukHveGNUBbW7NBYUa';
const PAYMASTER_URL = process.env.COINBASE_PAYMASTER_URL;

/**
 * Send transaction with or without Paymaster
 */
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
      transport: http(RPC_URL)
    });

    console.log('Sending transaction without Paymaster (using private key wallet)...');
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

/**
 * Get ALL users who made any predictions (from ALL time)
 */
async function getAllUsers(publicClient: any, fromBlock: bigint): Promise<Set<string>> {
  console.log(`Fetching all users from block ${fromBlock}...`);

  const events = await publicClient.getLogs({
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

  const users = new Set<string>();
  events.forEach(event => {
    if (event.args?.user) {
      users.add(event.args.user.toLowerCase());
    }
  });

  console.log(`Found ${users.size} unique users who made predictions`);
  return users;
}

/**
 * Get ALL matches that are finished (from Football-data.org)
 */
async function getAllFinishedMatches(publicClient: any, fromBlock: bigint): Promise<Map<bigint, { homeScore: number; awayScore: number; outcome: 1 | 2 | 3 }>> {
  console.log('Fetching all registered matches...');

  const matchEvents = await publicClient.getLogs({
    address: CONTRACTS.SEERSLEAGUE,
    event: {
      type: 'event',
      name: 'MatchRegistered',
      inputs: [
        { name: 'matchId', type: 'uint256', indexed: true },
        { name: 'startTime', type: 'uint256', indexed: false }
      ]
    },
    fromBlock,
    toBlock: 'latest'
  });

  console.log(`Found ${matchEvents.length} registered matches`);

  const finishedMatches = new Map<bigint, { homeScore: number; awayScore: number; outcome: 1 | 2 | 3 }>();

  for (const event of matchEvents) {
    if (!event.args?.matchId) continue;
    const matchId = event.args.matchId;

    // Check if match has started (with 2 hour buffer)
    const matchInfo = await publicClient.readContract({
      address: CONTRACTS.SEERSLEAGUE,
      abi: SEERSLEAGUE_ABI,
      functionName: 'getMatch',
      args: [matchId]
    }) as { id: bigint; startTime: bigint; homeScore: bigint; awayScore: bigint; isRecorded: boolean; exists: boolean };

    const now = Math.floor(Date.now() / 1000);
    const startTime = Number(matchInfo.startTime);
    const twoHours = 2 * 60 * 60;

    if (now < startTime + twoHours) {
      continue; // Match not finished yet
    }

    // Fetch result from Football-data.org
    const result = await fetchMatchResult(matchId.toString());
    if (result && result.finished) {
      finishedMatches.set(matchId, {
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        outcome: result.outcome
      });
      console.log(`Match ${matchId}: ${result.homeScore}-${result.awayScore} (outcome: ${result.outcome})`);
    }
  }

  console.log(`Found ${finishedMatches.size} finished matches`);
  return finishedMatches;
}

/**
 * Fetch match result from Football-data.org
 */
async function fetchMatchResult(matchId: string): Promise<{ homeScore: number; awayScore: number; outcome: 1 | 2 | 3; finished: boolean } | null> {
  try {
    const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;
    if (!FOOTBALL_DATA_API_KEY) return null;

    const response = await fetch(`https://api.football-data.org/v4/matches/${matchId}`, {
      headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
      cache: 'no-store'
    });

    if (!response.ok) return null;

    const data = await response.json();
    const match = data.match;

    if (match.status === 'FINISHED') {
      const homeScore = match.score?.fullTime?.home ?? 0;
      const awayScore = match.score?.fullTime?.away ?? 0;
      const outcome = homeScore > awayScore ? 1 : homeScore < awayScore ? 3 : 2;

      return { homeScore, awayScore, outcome: outcome as 1 | 2 | 3, finished: true };
    }

    return { homeScore: 0, awayScore: 0, outcome: 2, finished: false };
  } catch (error) {
    console.error(`Failed to fetch match ${matchId}:`, error);
    return null;
  }
}

/**
 * Check user's prediction for a specific match
 */
async function getUserPrediction(
  publicClient: any,
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

/**
 * FORCE RECOUNT: Recalculate ALL user predictions for finished matches
 * This endpoint ignores "isRecorded" flag and recounts everything
 */
export async function POST(request: Request) {
  try {
    console.log('🔄 [FORCE-RECOUNT] Starting complete recount...');

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
    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL)
    });

    // Find deployment block by binary search (contract creation)
    console.log('Finding contract deployment block...');
    const currentBlock = await publicClient.getBlockNumber();
    let deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');

    if (deploymentBlock === 0n) {
      // Use a reasonable default: scan last 1M blocks (~23 days on Base)
      deploymentBlock = currentBlock - 1000000n;
      console.log(`⚠️ DEPLOYMENT_BLOCK not set, using ${deploymentBlock} (1M blocks ago)`);
    }

    // Step 1: Get ALL users
    const allUsers = await getAllUsers(publicClient, deploymentBlock);
    console.log(`📊 Total users: ${allUsers.size}`);

    // Step 2: Get ALL finished matches
    const finishedMatches = await getAllFinishedMatches(publicClient, deploymentBlock);
    console.log(`⚽ Total finished matches: ${finishedMatches.size}`);

    if (finishedMatches.size === 0) {
      return NextResponse.json({
        success: true,
        message: 'No finished matches to process',
        usersFound: allUsers.size,
        matchesFound: 0
      });
    }

    // Step 3: Check each user's prediction for each finished match
    const batchUsers: string[] = [];
    const batchMatchIds: bigint[] = [];
    const batchCorrects: boolean[] = [];

    console.log('🔍 Checking all user predictions...');
    let checkedCount = 0;

    for (const user of allUsers) {
      for (const [matchId, matchResult] of finishedMatches) {
        const userPrediction = await getUserPrediction(publicClient, user, matchId);

        if (userPrediction !== 0) {
          // User made a prediction for this match
          const isCorrect = userPrediction === matchResult.outcome;

          batchUsers.push(user);
          batchMatchIds.push(matchId);
          batchCorrects.push(isCorrect);

          checkedCount++;

          if (checkedCount % 10 === 0) {
            console.log(`Processed ${checkedCount} predictions...`);
          }
        }
      }
    }

    console.log(`✅ Total predictions to record: ${batchUsers.length}`);

    if (batchUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No predictions found to record',
        usersFound: allUsers.size,
        matchesFound: finishedMatches.size,
        predictionsFound: 0
      });
    }

    // Step 4: Send batch transaction to blockchain
    console.log('📤 Sending batch transaction to blockchain...');
    const txResult = await sendTransaction(account, batchUsers, batchMatchIds, batchCorrects);

    if (!txResult.success) {
      return NextResponse.json(
        { error: txResult.error || 'Transaction failed' },
        { status: 500 }
      );
    }

    console.log(`✅ [FORCE-RECOUNT] Complete! TxHash: ${txResult.txHash}`);

    return NextResponse.json({
      success: true,
      message: 'Force recount completed successfully',
      usersFound: allUsers.size,
      matchesFound: finishedMatches.size,
      predictionsRecorded: batchUsers.length,
      txHash: txResult.txHash,
      breakdown: {
        correctPredictions: batchCorrects.filter(c => c).length,
        incorrectPredictions: batchCorrects.filter(c => !c).length
      }
    });

  } catch (error) {
    console.error('❌ [FORCE-RECOUNT] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'Force Recount All Predictions',
    description: 'Recalculates ALL user predictions for finished matches, ignoring isRecorded flag',
    method: 'POST',
    authentication: 'Bearer token required (CRON_SECRET)',
    warning: 'This endpoint may take several minutes to complete for many users/matches'
  });
}
