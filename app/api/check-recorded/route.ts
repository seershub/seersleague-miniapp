import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * CHECK WHICH RESULTS ARE ALREADY RECORDED
 *
 * Contract has a bug: batchRecordResults doesn't check for duplicates.
 * This causes correctPredictions to increment multiple times for the same match.
 *
 * This endpoint checks which (user, matchId) pairs have already been recorded
 * by analyzing ResultRecorded events.
 */
export async function GET() {
  try {
    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 5000000n;

    console.log('🔍 Fetching ALL ResultRecorded events...');

    // Get ALL ResultRecorded events
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

    console.log(`✅ Found ${resultEvents.length} ResultRecorded events`);

    // Build a map of recorded (user, matchId) pairs
    const recordedPairs = new Map<string, number>(); // key: "user-matchId", value: count
    const userMatchCounts = new Map<string, Map<string, number>>(); // user -> matchId -> count

    resultEvents.forEach((event: any) => {
      const user = event.args?.user?.toLowerCase();
      const matchId = event.args?.matchId?.toString();
      const correct = event.args?.correct;

      if (user && matchId) {
        const key = `${user}-${matchId}`;
        const count = recordedPairs.get(key) || 0;
        recordedPairs.set(key, count + 1);

        // Track per-user per-match
        if (!userMatchCounts.has(user)) {
          userMatchCounts.set(user, new Map());
        }
        const userMap = userMatchCounts.get(user)!;
        userMap.set(matchId, (userMap.get(matchId) || 0) + 1);
      }
    });

    // Find duplicates
    const duplicates = Array.from(recordedPairs.entries())
      .filter(([key, count]) => count > 1)
      .map(([key, count]) => {
        const [user, matchId] = key.split('-');
        return { user, matchId, count };
      });

    console.log(`❌ Found ${duplicates.length} duplicate recordings`);

    // Find users with duplicate recordings
    const usersWithDuplicates = new Map<string, any>();

    for (const [user, matchMap] of userMatchCounts.entries()) {
      const duplicateMatches = Array.from(matchMap.entries())
        .filter(([matchId, count]) => count > 1);

      if (duplicateMatches.length > 0) {
        // Get user stats to see the damage
        try {
          const stats = await publicClient.readContract({
            address: CONTRACTS.SEERSLEAGUE,
            abi: SEERSLEAGUE_ABI,
            functionName: 'getUserStats',
            args: [user as `0x${string}`]
          }) as {
            correctPredictions: bigint;
            totalPredictions: bigint;
          };

          const totalDuplicates = duplicateMatches.reduce((sum, [, count]) => sum + (count - 1), 0);

          usersWithDuplicates.set(user, {
            address: user,
            contractStats: {
              totalPredictions: Number(stats.totalPredictions),
              correctPredictions: Number(stats.correctPredictions),
              isImpossible: Number(stats.correctPredictions) > Number(stats.totalPredictions)
            },
            duplicateMatches: duplicateMatches.map(([matchId, count]) => ({
              matchId,
              recordedTimes: count,
              extraRecordings: count - 1
            })),
            totalExtraRecordings: totalDuplicates
          });
        } catch (error) {
          console.error(`Error fetching stats for ${user}:`, error);
        }
      }
    }

    return NextResponse.json({
      summary: {
        totalResultEvents: resultEvents.length,
        uniquePairs: recordedPairs.size,
        duplicatePairs: duplicates.length,
        usersAffected: usersWithDuplicates.size
      },

      duplicates: duplicates.slice(0, 20), // First 20 duplicates

      usersWithDuplicates: Array.from(usersWithDuplicates.values())
        .sort((a, b) => b.totalExtraRecordings - a.totalExtraRecordings)
        .slice(0, 10), // Top 10 affected users

      diagnosis: {
        hasDuplicates: duplicates.length > 0,
        contractBug: '🚨 CONTRACT HAS NO DUPLICATE PROTECTION',
        impact: `${duplicates.length} duplicate recordings found`,
        recommendation: 'Need to track recorded pairs in API to prevent calling batchRecordResults multiple times for same (user, match)'
      }
    });

  } catch (error) {
    console.error('Check recorded error:', error);
    return NextResponse.json({
      error: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
}
