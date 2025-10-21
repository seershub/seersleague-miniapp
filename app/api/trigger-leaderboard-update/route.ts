import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

interface LeaderboardEntry {
  rank: number;
  address: string;
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Manual trigger for leaderboard update
 * Directly updates the leaderboard in KV
 */
export async function GET() {
  try {
    console.log('[Trigger] Starting leaderboard update...');
    
    const currentBlock = await publicClient.getBlockNumber();
    console.log(`Current block: ${currentBlock}`);

    // Fetch all prediction events
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
      fromBlock: currentBlock - 100000n, // Last ~2.3 days
      toBlock: 'latest'
    });

    console.log(`Found ${predictionEvents.length} prediction events`);

    // Extract unique users
    const uniqueUsers = new Set<string>();
    predictionEvents.forEach(event => {
      if (event.args && event.args.user) {
        uniqueUsers.add(event.args.user.toLowerCase());
      }
    });

    console.log(`Found ${uniqueUsers.size} unique users`);

    // Fetch stats for each user
    const leaderboardData: LeaderboardEntry[] = [];

    for (const userAddress of uniqueUsers) {
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
          const accuracy = Math.round((correctPredictions / totalPredictions) * 100);

          leaderboardData.push({
            rank: 0,
            address: userAddress,
            accuracy,
            totalPredictions,
            correctPredictions,
            currentStreak: Number(stats.currentStreak || 0),
            longestStreak: Number(stats.longestStreak || 0)
          });
        }
      } catch (error) {
        console.error(`Error fetching stats for ${userAddress}:`, error);
      }
    }

    // Sort leaderboard
    leaderboardData.sort((a, b) => {
      if (a.accuracy !== b.accuracy) return b.accuracy - a.accuracy;
      if (a.totalPredictions !== b.totalPredictions) return b.totalPredictions - a.totalPredictions;
      return b.currentStreak - a.currentStreak;
    });

    // Assign ranks
    leaderboardData.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Store in KV
    await kv.set('leaderboard:all', leaderboardData);
    await kv.set('leaderboard:lastUpdated', new Date().toISOString());
    
    console.log(`[Trigger] Leaderboard updated with ${leaderboardData.length} entries`);

    return NextResponse.json({
      success: true,
      totalPlayers: leaderboardData.length,
      topPlayers: leaderboardData.slice(0, 10),
      lastUpdated: new Date().toISOString(),
      message: 'Leaderboard updated successfully!'
    });

  } catch (error) {
    console.error('[Trigger] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
