import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * COMPREHENSIVE CONTRACT STATE ANALYSIS
 *
 * This endpoint checks:
 * 1. ALL users who made predictions (from events)
 * 2. Each user's contract stats (totalPredictions, correctPredictions)
 * 3. Why some users might be missing from leaderboard
 * 4. Match IDs from predictions vs match IDs in contract
 */
export async function GET() {
  try {
    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');

    // Use MAXIMUM range to ensure we find ALL users
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 5000000n;

    console.log(`📊 Scanning from block ${fromBlock} to ${currentBlock}`);

    // STEP 1: Get ALL PredictionsSubmitted events
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

    console.log(`✅ Found ${predictionEvents.length} prediction events`);

    // Extract ALL unique users and match IDs
    const allUsers = new Set<string>();
    const allMatchIds = new Set<string>();
    const userMatchCounts = new Map<string, number>();

    predictionEvents.forEach((event: any) => {
      const user = event.args?.user?.toLowerCase();
      const matchIds = event.args?.matchIds || [];

      if (user) {
        allUsers.add(user);
        const currentCount = userMatchCounts.get(user) || 0;
        userMatchCounts.set(user, currentCount + matchIds.length);

        matchIds.forEach((id: bigint) => {
          allMatchIds.add(id.toString());
        });
      }
    });

    console.log(`👥 Found ${allUsers.size} unique users`);
    console.log(`⚽ Found ${allMatchIds.size} unique match IDs`);

    // STEP 2: Check contract stats for EACH user
    const userAnalysis = [];

    for (const userAddress of allUsers) {
      try {
        const stats = await publicClient.readContract({
          address: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'getUserStats',
          args: [userAddress as `0x${string}`]
        }) as {
          correctPredictions: bigint;
          totalPredictions: bigint;
          freePredictionsUsed: bigint;
          currentStreak: bigint;
          longestStreak: bigint;
        };

        const totalPredictions = Number(stats.totalPredictions || 0);
        const correctPredictions = Number(stats.correctPredictions || 0);
        const predictionsFromEvents = userMatchCounts.get(userAddress) || 0;

        userAnalysis.push({
          address: userAddress,
          contractStats: {
            totalPredictions,
            correctPredictions,
            freePredictionsUsed: Number(stats.freePredictionsUsed || 0),
            currentStreak: Number(stats.currentStreak || 0),
            longestStreak: Number(stats.longestStreak || 0)
          },
          predictionsFromEvents,
          issue: totalPredictions === 0 ? '❌ No predictions in contract' :
                 totalPredictions !== predictionsFromEvents ? `⚠️ Mismatch: ${predictionsFromEvents} events vs ${totalPredictions} in contract` :
                 '✅ OK'
        });

      } catch (error) {
        userAnalysis.push({
          address: userAddress,
          error: (error as Error).message,
          predictionsFromEvents: userMatchCounts.get(userAddress) || 0
        });
      }
    }

    // STEP 3: Check random match IDs to see if they exist in contract
    const matchSample = Array.from(allMatchIds).slice(0, 10);
    const matchExistence = [];

    for (const matchId of matchSample) {
      try {
        const matchInfo = await publicClient.readContract({
          address: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'getMatch',
          args: [BigInt(matchId)]
        }) as {
          id: bigint;
          startTime: bigint;
          homeScore: bigint;
          awayScore: bigint;
          isRecorded: boolean;
          exists: boolean
        };

        matchExistence.push({
          matchId,
          exists: matchInfo.exists,
          isRecorded: matchInfo.isRecorded,
          startTime: Number(matchInfo.startTime),
          startDate: new Date(Number(matchInfo.startTime) * 1000).toISOString()
        });

      } catch (error) {
        matchExistence.push({
          matchId,
          error: (error as Error).message
        });
      }
    }

    // Categorize users
    const usersWithStats = userAnalysis.filter(u => u.contractStats && u.contractStats.totalPredictions > 0);
    const usersWithoutStats = userAnalysis.filter(u => u.contractStats && u.contractStats.totalPredictions === 0);
    const usersWithMismatch = userAnalysis.filter(u =>
      u.contractStats &&
      u.contractStats.totalPredictions > 0 &&
      u.contractStats.totalPredictions !== u.predictionsFromEvents
    );

    return NextResponse.json({
      summary: {
        totalUsersFoundInEvents: allUsers.size,
        totalMatchIdsInPredictions: allMatchIds.size,
        usersWithStatsInContract: usersWithStats.length,
        usersWithoutStatsInContract: usersWithoutStats.length,
        usersWithMismatchedStats: usersWithMismatch.length
      },

      criticalIssue: usersWithoutStats.length > 0
        ? `🚨 ${usersWithoutStats.length} users made predictions but have totalPredictions=0 in contract!`
        : usersWithStats.length < allUsers.size / 2
        ? `⚠️ Less than half of users have stats recorded`
        : '✅ All users have stats in contract',

      allUsers: userAnalysis.sort((a, b) =>
        (b.contractStats?.totalPredictions || 0) - (a.contractStats?.totalPredictions || 0)
      ),

      matchSample: {
        description: `Checked ${matchSample.length} random match IDs from predictions`,
        matches: matchExistence
      },

      recommendations: [
        usersWithoutStats.length > 0 ?
          `⚠️ ${usersWithoutStats.length} users need their predictions to be recorded via smart-recount` : null,
        usersWithMismatch.length > 0 ?
          `⚠️ ${usersWithMismatch.length} users have mismatched prediction counts` : null,
        matchExistence.some(m => !m.exists) ?
          `⚠️ Some match IDs from predictions don't exist in contract` : null
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: (error as Error).message, stack: (error as Error).stack },
      { status: 500 }
    );
  }
}
