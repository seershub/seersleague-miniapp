import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * DEBUG LEADERBOARD - Shows ALL users who made predictions
 * This helps understand why leaderboard shows only 20 users instead of 47
 */
export async function GET() {
  try {
    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');

    // Use same range as smart-recount and analyze-contract-state
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 5000000n;

    console.log(`[Debug Leaderboard] Scanning from block ${fromBlock} to ${currentBlock}`);

    // Get ALL PredictionsSubmitted events
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

    console.log(`[Debug Leaderboard] Found ${predictionEvents.length} prediction events`);

    // Extract unique users and their prediction counts
    const userMap = new Map<string, { predictionCount: number; matchIds: Set<string> }>();
    
    predictionEvents.forEach((event: any) => {
      const user = event.args?.user?.toLowerCase();
      const matchIds = event.args?.matchIds || [];

      if (user) {
        if (!userMap.has(user)) {
          userMap.set(user, { predictionCount: 0, matchIds: new Set() });
        }
        
        const userData = userMap.get(user)!;
        userData.predictionCount += matchIds.length;
        matchIds.forEach((id: bigint) => {
          userData.matchIds.add(id.toString());
        });
      }
    });

    console.log(`[Debug Leaderboard] Found ${userMap.size} unique users from events`);

    // Get contract stats for each user
    const userAnalysis = [];
    
    for (const [userAddress, eventData] of userMap) {
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
        const predictionsFromEvents = eventData.predictionCount;

        userAnalysis.push({
          address: userAddress,
          predictionsFromEvents,
          contractStats: {
            totalPredictions,
            correctPredictions,
            freePredictionsUsed: Number(stats.freePredictionsUsed || 0),
            currentStreak: Number(stats.currentStreak || 0),
            longestStreak: Number(stats.longestStreak || 0)
          },
          wouldAppearInLeaderboard: totalPredictions > 0,
          issue: totalPredictions === 0 ? '❌ No predictions in contract' :
                 totalPredictions !== predictionsFromEvents ? `⚠️ Mismatch: ${predictionsFromEvents} events vs ${totalPredictions} in contract` :
                 '✅ OK'
        });

      } catch (error) {
        userAnalysis.push({
          address: userAddress,
          predictionsFromEvents: eventData.predictionCount,
          error: (error as Error).message,
          wouldAppearInLeaderboard: false,
          issue: '❌ Error fetching stats'
        });
      }
    }

    // Categorize users
    const usersInLeaderboard = userAnalysis.filter(u => u.wouldAppearInLeaderboard);
    const usersNotInLeaderboard = userAnalysis.filter(u => !u.wouldAppearInLeaderboard);
    const usersWithMismatch = userAnalysis.filter(u => 
      u.contractStats && 
      u.contractStats.totalPredictions > 0 && 
      u.contractStats.totalPredictions !== u.predictionsFromEvents
    );

    return NextResponse.json({
      summary: {
        totalUsersFromEvents: userMap.size,
        usersInLeaderboard: usersInLeaderboard.length,
        usersNotInLeaderboard: usersNotInLeaderboard.length,
        usersWithMismatch: usersWithMismatch.length,
        blockRange: {
          fromBlock: fromBlock.toString(),
          currentBlock: currentBlock.toString(),
          range: Number(currentBlock - fromBlock)
        }
      },
      
      criticalIssue: usersNotInLeaderboard.length > 0
        ? `🚨 ${usersNotInLeaderboard.length} users made predictions but won't appear in leaderboard!`
        : usersInLeaderboard.length < userMap.size / 2
        ? `⚠️ Less than half of users appear in leaderboard`
        : '✅ All users appear in leaderboard',

      usersInLeaderboard: usersInLeaderboard.sort((a, b) => 
        (b.contractStats?.totalPredictions || 0) - (a.contractStats?.totalPredictions || 0)
      ),

      usersNotInLeaderboard: usersNotInLeaderboard.sort((a, b) => 
        b.predictionsFromEvents - a.predictionsFromEvents
      ),

      usersWithMismatch: usersWithMismatch,

      recommendations: [
        usersNotInLeaderboard.length > 0 ?
          `⚠️ ${usersNotInLeaderboard.length} users need smart-recount to record their predictions` : null,
        usersWithMismatch.length > 0 ?
          `⚠️ ${usersWithMismatch.length} users have mismatched prediction counts` : null,
        usersInLeaderboard.length < userMap.size ?
          `⚠️ Only ${usersInLeaderboard.length}/${userMap.size} users appear in leaderboard` : null
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('[Debug Leaderboard] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message, stack: (error as Error).stack },
      { status: 500 }
    );
  }
}