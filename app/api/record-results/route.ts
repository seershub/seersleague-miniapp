import { NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for processing

// Coinbase RPC endpoint (most reliable)
const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC || 'https://api.developer.coinbase.com/rpc/v1/base/DzCv9JnMZKpreOiukHveGNUBbW7NBYUa';
const PAYMASTER_URL = process.env.COINBASE_PAYMASTER_URL || 'https://api.developer.coinbase.com/rpc/v1/base/DzCv9JnMZKpreOiukHveGNUBbW7NBYUa';
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

interface MatchToRecord {
  matchId: bigint;
  homeScore: number;
  awayScore: number;
  outcome: 1 | 2 | 3;
}

/**
 * Determine match outcome from scores
 */
function determineOutcome(homeScore: number, awayScore: number): 1 | 2 | 3 {
  if (homeScore > awayScore) return 1; // Home win
  if (homeScore < awayScore) return 3; // Away win
  return 2; // Draw
}

/**
 * Send transaction with Coinbase Paymaster sponsorship
 */
async function sendPaymasterTransaction(
  account: any,
  contractAddress: string,
  functionName: 'submitPredictions' | 'registerMatches' | 'recordResult' | 'batchRecordResults' | 'distributePrizes' | 'setTreasury' | 'pause' | 'unpause',
  args: readonly unknown[]
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    if (!PAYMASTER_URL) {
      console.log('Paymaster not configured, using regular transaction');
      // Fallback to regular transaction
      const walletClient = createWalletClient({
        account,
        chain: base,
        transport: http(RPC_URL)
      });

      const txHash = await walletClient.writeContract({
        account,
        address: contractAddress as `0x${string}`,
        abi: SEERSLEAGUE_ABI,
        functionName,
        args: args as any
      });

      return { success: true, txHash };
    }

    // Create transaction data
    const transactionData = {
      to: contractAddress,
      data: encodeFunctionData({
        abi: SEERSLEAGUE_ABI,
        functionName,
        args: args as any
      })
    };

    // Send to Paymaster
    const response = await fetch(PAYMASTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'eth_sendTransaction',
        params: [transactionData],
        id: 1
      })
    });

    if (!response.ok) {
      throw new Error(`Paymaster request failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`Paymaster error: ${result.error.message}`);
    }

    return { success: true, txHash: result.result };
  } catch (error) {
    console.error('Paymaster transaction failed:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Fetch match result from Football-data.org API
 * Docs: https://docs.football-data.org/general/v4/index.html
 */
async function fetchMatchResult(matchId: string): Promise<{ homeScore: number; awayScore: number; outcome: 1 | 2 | 3; finished: boolean } | null> {
  try {
    if (!FOOTBALL_DATA_API_KEY) {
      console.error('FOOTBALL_DATA_API_KEY not configured');
      return null;
    }

    const response = await fetch(`${FOOTBALL_DATA_BASE}/matches/${matchId}`, {
      headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
      cache: 'no-store'
    });

    if (!response.ok) {
      console.error(`Football-data.org API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const match = data.match;

    // Check if match is finished
    if (match.status === 'FINISHED') {
      const homeScore = match.score?.fullTime?.home ?? 0;
      const awayScore = match.score?.fullTime?.away ?? 0;

      console.log(`Match ${matchId} finished: ${homeScore}-${awayScore}`);

      return {
        homeScore,
        awayScore,
        outcome: determineOutcome(homeScore, awayScore),
        finished: true
      };
    }

    // Match not finished yet (IN_PLAY, TIMED, PAUSED, etc.)
    console.log(`Match ${matchId} status: ${match.status} - not finished`);
    return { homeScore: 0, awayScore: 0, outcome: 2, finished: false };

  } catch (error) {
    console.error(`Failed to fetch result for match ${matchId}:`, error);
    return null;
  }
}

/**
 * Get all users who made predictions for a specific match
 * IMPROVED: Uses wider block range to catch all users
 */
async function getUsersForMatch(matchId: bigint): Promise<string[]> {
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL)
    });

    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const currentBlock = await publicClient.getBlockNumber();

    // CRITICAL FIX: Use much wider block range to catch all users
    // If deployment block not set, scan last 1M blocks (~23 days on Base)
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 1000000n;

    console.log(`[getUsersForMatch] Scanning from block ${fromBlock} to latest (${currentBlock})`);
    console.log(`[getUsersForMatch] Block range: ${currentBlock - fromBlock} blocks`);

    // Fetch PredictionsSubmitted events
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

    console.log(`[getUsersForMatch] Found ${events.length} total prediction events`);

    // Filter events where matchIds includes our matchId
    const users = new Set<string>();

    for (const event of events) {
      if (event.args?.matchIds && event.args?.user) {
        const matchIds = event.args.matchIds as bigint[];
        if (matchIds.some(id => id === matchId)) {
          users.add(event.args.user.toLowerCase());
        }
      }
    }

    console.log(`[getUsersForMatch] Match ${matchId}: Found ${users.size} users with predictions`);
    return Array.from(users);
  } catch (error) {
    console.error(`Error fetching users for match ${matchId}:`, error);
    return [];
  }
}

/**
 * Check user's prediction and determine if it was correct
 */
async function checkUserPrediction(
  userAddress: string,
  matchId: bigint,
  actualOutcome: 1 | 2 | 3
): Promise<boolean> {
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL)
    });

    const prediction = await publicClient.readContract({
      address: CONTRACTS.SEERSLEAGUE,
      abi: SEERSLEAGUE_ABI,
      functionName: 'getUserPrediction',
      args: [userAddress as `0x${string}`, matchId]
    }) as { matchId: bigint; outcome: number; timestamp: bigint };

    // If no prediction or outcome is 0, user didn't predict
    if (!prediction || prediction.outcome === 0) {
      return false;
    }

    // Compare prediction with actual outcome
    return prediction.outcome === actualOutcome;
  } catch (error) {
    console.error(`Error checking prediction for ${userAddress} on match ${matchId}:`, error);
    return false;
  }
}

/**
 * Record results to blockchain using batchRecordResults
 */
async function batchRecordResults(
  users: string[],
  matchIds: bigint[],
  corrects: boolean[]
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      return { success: false, error: 'No private key configured' };
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);

    // Use Paymaster for gas sponsorship
    const result = await sendPaymasterTransaction(
      account,
      CONTRACTS.SEERSLEAGUE,
      'batchRecordResults',
      [
        users as `0x${string}`[],
        matchIds,
        corrects
      ]
    );

    if (!result.success) {
      throw new Error(result.error || 'Transaction failed');
    }

    return { success: true, txHash: result.txHash };
  } catch (error) {
    console.error('Error recording results to blockchain:', error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Main endpoint: Record results for finished matches
 */
export async function POST(request: Request) {
  try {
    // Verify authorization (cron job secret or admin)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL)
    });

    // Get all registered matches from contract
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const currentBlock = await publicClient.getBlockNumber();

    // CRITICAL FIX: Use much wider block range
    // If deployment block not set, scan last 1M blocks (~23 days on Base)
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 1000000n;

    console.log(`[record-results] Scanning from block ${fromBlock} to latest (${currentBlock})`);
    console.log(`[record-results] Block range: ${currentBlock - fromBlock} blocks`);
    console.log(`[record-results] Deployment block env: ${process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || 'NOT SET'}`);

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

    console.log(`[record-results] Found ${matchEvents.length} registered matches`);

    // Check each match to see if it's finished and not yet recorded
    const matchesToProcess: MatchToRecord[] = [];

    for (const event of matchEvents) {
      if (!event.args?.matchId) continue;

      const matchId = event.args.matchId;

      // Check if result already recorded
      const matchInfo = await publicClient.readContract({
        address: CONTRACTS.SEERSLEAGUE,
        abi: SEERSLEAGUE_ABI,
        functionName: 'getMatch',
        args: [matchId]
      }) as { id: bigint; startTime: bigint; homeScore: bigint; awayScore: bigint; isRecorded: boolean; exists: boolean };

      // Skip if already recorded
      if (matchInfo.isRecorded) {
        console.log(`Match ${matchId} already recorded, skipping`);
        continue;
      }

      // Check if match has started (startTime + 2 hours buffer)
      const now = Math.floor(Date.now() / 1000);
      const startTime = Number(matchInfo.startTime);
      const twoHours = 2 * 60 * 60;

      if (now < startTime + twoHours) {
        console.log(`Match ${matchId} not finished yet, skipping`);
        continue;
      }

      // Fetch result from Sports API
      const result = await fetchMatchResult(matchId.toString());

      if (!result || !result.finished) {
        console.log(`Match ${matchId} - no result or not finished`);
        continue;
      }

      matchesToProcess.push({
        matchId,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        outcome: result.outcome
      });
    }

    if (matchesToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No matches to process',
        processed: 0
      });
    }

    console.log(`Processing ${matchesToProcess.length} finished matches`);

    // For each match, get users and check their predictions
    const batchUsers: string[] = [];
    const batchMatchIds: bigint[] = [];
    const batchCorrects: boolean[] = [];

    console.log(`[record-results] Processing ${matchesToProcess.length} finished matches...`);

    for (const match of matchesToProcess) {
      const users = await getUsersForMatch(match.matchId);
      console.log(`[record-results] Match ${match.matchId}: ${users.length} users made predictions`);

      if (users.length === 0) {
        console.warn(`[record-results] ⚠️ No users found for match ${match.matchId} - this is suspicious!`);
      }

      for (const user of users) {
        const isCorrect = await checkUserPrediction(user, match.matchId, match.outcome);

        batchUsers.push(user);
        batchMatchIds.push(match.matchId);
        batchCorrects.push(isCorrect);

        console.log(`[record-results]   User ${user.slice(0, 10)}...: ${isCorrect ? '✓ CORRECT' : '✗ WRONG'}`);
      }
    }

    console.log(`[record-results] Total predictions to record: ${batchUsers.length}`);
    console.log(`[record-results] Breakdown: ${batchCorrects.filter(c => c).length} correct, ${batchCorrects.filter(c => !c).length} incorrect`);

    if (batchUsers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No predictions to record',
        matchesChecked: matchesToProcess.length,
        recorded: 0
      });
    }

    // Record all results in batch
    const recordResult = await batchRecordResults(batchUsers, batchMatchIds, batchCorrects);

    if (!recordResult.success) {
      return NextResponse.json(
        { error: recordResult.error || 'Failed to record results' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      matchesProcessed: matchesToProcess.length,
      predictionsRecorded: batchUsers.length,
      txHash: recordResult.txHash,
      matches: matchesToProcess.map(m => ({
        matchId: m.matchId.toString(),
        score: `${m.homeScore}-${m.awayScore}`,
        outcome: m.outcome === 1 ? 'HOME' : m.outcome === 3 ? 'AWAY' : 'DRAW'
      }))
    });

  } catch (error) {
    console.error('Error in record-results endpoint:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for manual testing/status check
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'Record Match Results',
    method: 'POST',
    description: 'Records finished match results to blockchain',
    authentication: 'Bearer token required (CRON_SECRET)',
    note: 'This endpoint is called automatically by cron job'
  });
}
