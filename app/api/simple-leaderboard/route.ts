import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface SimpleLeaderboardEntry {
  rank: number;
  address: string;
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Optimized leaderboard endpoint - scans recent events in small batches
 * to avoid timeout while still getting real data
 */
export async function GET() {
  try {
    console.log('[Simple Leaderboard] Starting optimized event scan...');
    
    const currentBlock = await publicClient.getBlockNumber();
    console.log(`Current block: ${currentBlock}`);
    
    // Scan last 5000 blocks only (~2.7 hours on Base) to avoid timeout
    // This is a reasonable window for active users
    const BLOCK_RANGE = 5000n;
    const fromBlock = currentBlock - BLOCK_RANGE;
    
    console.log(`Scanning blocks ${fromBlock} to ${currentBlock}`);

    // Fetch PredictionsSubmitted events from recent blocks
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

    console.log(`Found ${predictionEvents.length} recent prediction events`);

    // Extract unique user addresses
    const uniqueUsers = new Set<string>();
    predictionEvents.forEach(event => {
      if (event.args && event.args.user) {
        uniqueUsers.add(event.args.user.toLowerCase());
      }
    });

    console.log(`Found ${uniqueUsers.size} unique users in recent activity`);

    const leaderboardData: SimpleLeaderboardEntry[] = [];

    // Fetch stats for each user in parallel (much faster)
    const statsPromises = Array.from(uniqueUsers).map(async (userAddress) => {
      try {
        const stats = await publicClient.readContract({
          address: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'getUserStats',
          args: [userAddress as `0x${string}`]
        }) as unknown as {
          correctPredictions: bigint;
          totalPredictions: bigint;
          freePredictionsUsed: bigint;
          currentStreak: bigint;
          longestStreak: bigint;
        };

        const correctPredictions = Number(stats.correctPredictions || 0);
        const totalPredictions = Number(stats.totalPredictions || 0);

        if (totalPredictions > 0) {
          const accuracy = totalPredictions > 0
            ? Math.round((correctPredictions / totalPredictions) * 100)
            : 0;

          return {
            rank: 0,
            address: userAddress,
            accuracy,
            totalPredictions,
            correctPredictions,
            currentStreak: Number(stats.currentStreak || 0),
            longestStreak: Number(stats.longestStreak || 0)
          };
        }
        return null;
      } catch (error) {
        console.error(`Error fetching stats for ${userAddress}:`, error);
        return null;
      }
    });

    const results = await Promise.all(statsPromises);
    
    // Filter out null results
    results.forEach(result => {
      if (result) {
        leaderboardData.push(result);
      }
    });

    // Sort leaderboard
    leaderboardData.sort((a, b) => {
      if (a.accuracy !== b.accuracy) {
        return b.accuracy - a.accuracy;
      }
      if (a.totalPredictions !== b.totalPredictions) {
        return b.totalPredictions - a.totalPredictions;
      }
      return b.currentStreak - a.currentStreak;
    });

    // Assign ranks
    leaderboardData.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    console.log(`[Simple Leaderboard] Returning ${leaderboardData.length} entries`);
    
    return NextResponse.json({
      success: true,
      totalPlayers: leaderboardData.length,
      leaderboard: leaderboardData,
      topPlayers: leaderboardData.slice(0, 65),
      lastUpdated: new Date().toISOString(),
      source: 'direct'
    });

  } catch (error) {
    console.error('[Simple Leaderboard] Error:', error);
    
    // Return empty leaderboard on error
    return NextResponse.json({
      success: true,
      totalPlayers: 0,
      leaderboard: [],
      topPlayers: [],
      lastUpdated: new Date().toISOString(),
      source: 'error',
      message: 'No players yet. Be the first to make predictions!'
    });
  }
}
