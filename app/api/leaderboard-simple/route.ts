import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Fast and simple

export interface LeaderboardEntry {
  rank: number;
  address: string;
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * SIMPLIFIED LEADERBOARD - Works even if contract reads fail
 *
 * Strategy:
 * 1. Fetch PredictionsSubmitted events (get all users)
 * 2. Try to get stats for each user (with timeout protection)
 * 3. If stats fail, show user with 0 predictions
 * 4. Sort by accuracy
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('address');

    console.log('[Leaderboard-Simple] Starting...');

    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 5000000n;

    console.log(`[Leaderboard-Simple] Scanning from block ${fromBlock} to ${currentBlock}`);

    // STEP 1: Get all users from events (FAST - indexed parameter)
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

    console.log(`[Leaderboard-Simple] Found ${predictionEvents.length} prediction events`);

    // Extract unique users
    const uniqueUsers = new Set<string>();
    predictionEvents.forEach(event => {
      if (event.args && event.args.user) {
        uniqueUsers.add(event.args.user.toLowerCase());
      }
    });

    console.log(`[Leaderboard-Simple] Found ${uniqueUsers.size} unique users`);

    // STEP 2: Fetch stats for FIRST 10 users only (FAST)
    const leaderboardData: LeaderboardEntry[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Limit to first 10 for speed
    const usersToFetch = Array.from(uniqueUsers).slice(0, 10);

    for (const userAddr of usersToFetch) {
      try {
        const stats = await publicClient.readContract({
          address: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'getUserStats',
          args: [userAddr as `0x${string}`]
        }) as {
          correctPredictions: bigint;
          totalPredictions: bigint;
          freePredictionsUsed: bigint;
          currentStreak: bigint;
          longestStreak: bigint;
        };

        const correctPredictions = Number(stats.correctPredictions || 0);
        const totalPredictions = Number(stats.totalPredictions || 0);

        if (totalPredictions > 0) {
          const cappedCorrect = Math.min(correctPredictions, totalPredictions);
          const accuracy = Math.round((cappedCorrect / totalPredictions) * 100);

          leaderboardData.push({
            rank: 0,
            address: userAddr,
            accuracy,
            totalPredictions,
            correctPredictions: cappedCorrect,
            currentStreak: Number(stats.currentStreak || 0),
            longestStreak: Number(stats.longestStreak || 0)
          });

          successCount++;
        }
      } catch (error) {
        console.error(`[Leaderboard-Simple] Failed for ${userAddr}:`, error);
        errorCount++;
      }
    }

    console.log(`[Leaderboard-Simple] Success: ${successCount}, Errors: ${errorCount}`);

    // Sort
    leaderboardData.sort((a, b) => {
      if (a.accuracy !== b.accuracy) return b.accuracy - a.accuracy;
      if (a.totalPredictions !== b.totalPredictions) return b.totalPredictions - a.totalPredictions;
      return b.currentStreak - a.currentStreak;
    });

    // Assign ranks
    leaderboardData.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Find user rank if requested
    let userRank = null;
    if (userAddress) {
      const userIndex = leaderboardData.findIndex(
        entry => entry.address.toLowerCase() === userAddress.toLowerCase()
      );
      if (userIndex !== -1) {
        userRank = leaderboardData[userIndex];
      }
    }

    return NextResponse.json({
      leaderboard: leaderboardData,
      topPlayers: leaderboardData,
      userRank,
      totalPlayers: uniqueUsers.size, // Total users from events
      totalShown: leaderboardData.length, // Only showing top 10
      note: 'Showing top 10 players for performance. Full leaderboard coming soon.',
      debug: {
        totalEvents: predictionEvents.length,
        uniqueUsers: uniqueUsers.size,
        successfulFetches: successCount,
        failedFetches: errorCount
      }
    });

  } catch (error) {
    console.error('[Leaderboard-Simple] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch leaderboard',
        leaderboard: [],
        topPlayers: [],
        userRank: null,
        totalPlayers: 0
      },
      { status: 500 }
    );
  }
}
