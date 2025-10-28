import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Comprehensive analysis of the real problem:
 * Why only 1 user's stats updated out of 27-28 users
 */
export async function GET() {
  try {
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 10000n;

    console.log(`[Analysis] Scanning from block ${fromBlock} to ${currentBlock}`);

    // 1. Get all registered matches
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

    console.log(`[Analysis] Found ${matchEvents.length} registered matches`);

    // 2. Get all predictions
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

    console.log(`[Analysis] Found ${predictionEvents.length} prediction events`);

    // 3. Get all ResultRecorded events
    const resultEvents = await publicClient.getLogs({
      address: CONTRACTS.SEERSLEAGUE,
      event: {
        type: 'event',
        name: 'ResultRecorded',
        inputs: [
          { name: 'user', type: 'address', indexed: true },
          { name: 'matchId', type: 'uint256', indexed: false },
          { name: 'correct', type: 'bool', indexed: false }
        ]
      },
      fromBlock,
      toBlock: 'latest'
    });

    console.log(`[Analysis] Found ${resultEvents.length} result recorded events`);

    // 4. Get unique users who made predictions
    const usersWithPredictions = new Set<string>();
    const userPredictionCounts = new Map<string, number>();

    for (const event of predictionEvents) {
      if (event.args?.user) {
        const user = (event.args.user as string).toLowerCase();
        usersWithPredictions.add(user);
        userPredictionCounts.set(user, (userPredictionCounts.get(user) || 0) + 1);
      }
    }

    console.log(`[Analysis] ${usersWithPredictions.size} unique users made predictions`);

    // 5. Get users whose results were recorded
    const usersWithResults = new Set<string>();
    const userResultCounts = new Map<string, { total: number; correct: number }>();

    for (const event of resultEvents) {
      if (event.args?.user) {
        const user = (event.args.user as string).toLowerCase();
        const correct = event.args.correct as boolean;

        usersWithResults.add(user);

        const current = userResultCounts.get(user) || { total: 0, correct: 0 };
        current.total++;
        if (correct) current.correct++;
        userResultCounts.set(user, current);
      }
    }

    console.log(`[Analysis] ${usersWithResults.size} users have recorded results`);

    // 6. Get actual user stats from contract
    const userStatsFromContract = new Map<string, any>();

    for (const user of usersWithPredictions) {
      try {
        const stats = await publicClient.readContract({
          address: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'getUserStats',
          args: [user as `0x${string}`]
        }) as { correctPredictions: bigint; totalPredictions: bigint; freePredictionsUsed: bigint; currentStreak: bigint; longestStreak: bigint };

        userStatsFromContract.set(user, {
          totalPredictions: Number(stats.totalPredictions),
          correctPredictions: Number(stats.correctPredictions),
          currentStreak: Number(stats.currentStreak),
          longestStreak: Number(stats.longestStreak),
          freePredictionsUsed: Number(stats.freePredictionsUsed)
        });
      } catch (error) {
        console.error(`Error fetching stats for ${user}:`, error);
      }
    }

    // 7. Analyze discrepancies
    const analysis = {
      totalRegisteredMatches: matchEvents.length,
      totalPredictionEvents: predictionEvents.length,
      totalResultEvents: resultEvents.length,
      totalUniqueUsersWithPredictions: usersWithPredictions.size,
      totalUniqueUsersWithResults: usersWithResults.size,

      userBreakdown: Array.from(usersWithPredictions).map(user => {
        const predictionCount = userPredictionCounts.get(user) || 0;
        const resultData = userResultCounts.get(user) || { total: 0, correct: 0 };
        const contractStats = userStatsFromContract.get(user);

        return {
          user,
          predictionsSubmitted: predictionCount,
          resultsRecorded: resultData.total,
          correctResults: resultData.correct,
          contractStats: contractStats || 'NOT_FOUND',
          hasDiscrepancy: resultData.total !== (contractStats?.correctPredictions || 0)
        };
      }),

      matches: matchEvents.slice(0, 10).map(e => ({
        matchId: e.args?.matchId?.toString(),
        startTime: e.args?.startTime ? new Date(Number(e.args.startTime) * 1000).toISOString() : 'unknown'
      })),

      recentResultEvents: resultEvents.slice(-20).map(e => ({
        user: e.args?.user,
        matchId: e.args?.matchId?.toString(),
        correct: e.args?.correct,
        blockNumber: e.blockNumber.toString(),
        transactionHash: e.transactionHash
      })),

      diagnosis: {
        problemIdentified: usersWithPredictions.size > usersWithResults.size,
        usersAffected: usersWithPredictions.size - usersWithResults.size,
        possibleCauses: [
          usersWithPredictions.size > usersWithResults.size ? '❌ Results not being recorded for all users' : '✅ All users have results',
          resultEvents.length === 0 ? '❌ No ResultRecorded events found at all' : '✅ Some results recorded',
          '🔍 Check if record-results endpoint is working',
          '🔍 Check if batchRecordResults is actually updating contract state',
          '🔍 Check RPC endpoint reliability (mainnet.base.org 503 errors)'
        ]
      }
    };

    return NextResponse.json(analysis, { status: 200 });

  } catch (error) {
    console.error('[Analysis] Error:', error);
    return NextResponse.json(
      {
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
