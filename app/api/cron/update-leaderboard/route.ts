import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI, calculateAccuracy } from '@/lib/contract-interactions';
import type { LeaderboardEntry } from '../../leaderboard/route';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// This endpoint should be called by Vercel Cron
export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access (optional for testing)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;
    
    if (process.env.CRON_SECRET && authHeader !== expectedAuth) {
      console.log('Auth check failed:', { authHeader, expectedAuth });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Auth check passed or skipped for testing');

    console.log('Starting leaderboard update...');

    // Get contract deployment block (to optimize event fetching)
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const currentBlock = await publicClient.getBlockNumber();

    console.log('Fetching contract events...');
    
    // Fetch PredictionsSubmitted events to get all unique users
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
      fromBlock: deploymentBlock > 0n ? deploymentBlock : currentBlock - 10000n,
      toBlock: 'latest'
    });

    console.log(`Found ${predictionEvents.length} prediction events`);

    // Extract unique user addresses
    const uniqueUsers = new Set<string>();
    predictionEvents.forEach(event => {
      if (event.args && event.args.user) {
        uniqueUsers.add(event.args.user.toLowerCase());
      }
    });

    console.log(`Found ${uniqueUsers.size} unique users`);

    // Fetch stats for ALL users in PARALLEL (much faster!)
    const userStatsPromises = Array.from(uniqueUsers).map(async (userAddress) => {
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

        // Only include users who have made predictions
        if (totalPredictions > 0) {
          const accuracy = totalPredictions > 0
            ? Math.round((correctPredictions / totalPredictions) * 100)
            : 0;

          return {
            rank: 0, // Will be set after sorting
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

    const allUserStats = await Promise.all(userStatsPromises);
    const leaderboardData = allUserStats.filter((entry): entry is LeaderboardEntry => entry !== null);

    // Sort leaderboard by:
    // 1. Accuracy (descending)
    // 2. Total predictions (descending)
    // 3. Current streak (descending)
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

    // Store in KV with error handling
    try {
      await kv.set('leaderboard:all', leaderboardData);
      await kv.set('leaderboard:lastUpdated', new Date().toISOString());
      console.log(`Leaderboard stored in KV successfully with ${leaderboardData.length} entries`);
    } catch (kvError) {
      console.error('KV storage error:', kvError);
      // Continue without failing - data will be returned in response
    }

    console.log(`Leaderboard updated successfully with ${leaderboardData.length} entries`);

    return NextResponse.json({
      success: true,
      totalPlayers: leaderboardData.length,
      topPlayers: leaderboardData.slice(0, 10),
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error updating leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to update leaderboard', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also allow POST for manual triggers
export async function POST(request: Request) {
  return GET(request);
}
