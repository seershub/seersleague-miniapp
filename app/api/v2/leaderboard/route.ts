import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS_V2, SEERSLEAGUE_V2_ABI, UserStatsV2 } from '@/lib/contract-interactions-v2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface LeaderboardEntryV2 {
  rank: number;
  address: string;
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
  currentStreak: number;
  longestStreak: number;
  totalFeesPaid: number;
  lastPredictionTime: number;
}

/**
 * ENHANCED LEADERBOARD V2 - With duplicate prevention and better data integrity
 * 
 * Features:
 * - Duplicate prevention (isProcessed flag)
 * - Enhanced user stats (totalFeesPaid, lastPredictionTime)
 * - Better error handling
 * - Data validation
 */
export async function GET() {
  try {
    console.log('🏆 [LEADERBOARD V2] Generating leaderboard...');

    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK_V2 || '0');
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 1000000n;

    console.log(`[LEADERBOARD V2] Scanning from block ${fromBlock} to ${currentBlock}`);

    // Get all users from prediction events
    const predictionEvents = await publicClient.getLogs({
      address: CONTRACTS_V2.SEERSLEAGUE,
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

    const allUsers = new Set<string>();
    predictionEvents.forEach((event: any) => {
      if (event.args?.user) {
        allUsers.add(event.args.user.toLowerCase());
      }
    });

    console.log(`[LEADERBOARD V2] Found ${allUsers.size} unique users`);

    // Get user stats for each user
    const leaderboardEntries: LeaderboardEntryV2[] = [];

    for (const userAddress of allUsers) {
      try {
        const stats = await publicClient.readContract({
          address: CONTRACTS_V2.SEERSLEAGUE,
          abi: SEERSLEAGUE_V2_ABI,
          functionName: 'getUserStats',
          args: [userAddress as `0x${string}`]
        }) as UserStatsV2;

        const totalPredictions = Number(stats.totalPredictions || 0);
        const correctPredictions = Number(stats.correctPredictions || 0);

        // Only include users with predictions
        if (totalPredictions > 0) {
          const accuracy = totalPredictions > 0
            ? Math.round((correctPredictions / totalPredictions) * 100)
            : 0;

          leaderboardEntries.push({
            rank: 0, // Will be set after sorting
            address: userAddress,
            accuracy,
            totalPredictions,
            correctPredictions,
            currentStreak: Number(stats.currentStreak || 0),
            longestStreak: Number(stats.longestStreak || 0),
            totalFeesPaid: Number(stats.totalFeesPaid || 0),
            lastPredictionTime: Number(stats.lastPredictionTime || 0)
          });
        }

      } catch (error) {
        console.error(`[LEADERBOARD V2] Error fetching stats for ${userAddress}:`, error);
      }
    }

    // Sort by accuracy (descending), then by total predictions (descending)
    leaderboardEntries.sort((a, b) => {
      if (a.accuracy !== b.accuracy) {
        return b.accuracy - a.accuracy;
      }
      return b.totalPredictions - a.totalPredictions;
    });

    // Set ranks
    leaderboardEntries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Get top 10 players
    const topPlayers = leaderboardEntries.slice(0, 10);

    console.log(`[LEADERBOARD V2] Generated leaderboard with ${leaderboardEntries.length} players`);

    return NextResponse.json({
      leaderboard: leaderboardEntries,
      topPlayers,
      userRank: null, // Could be calculated if user address provided
      totalPlayers: leaderboardEntries.length,
      lastUpdated: new Date().toISOString(),
      version: '2.0.0',
      features: [
        'Duplicate prevention',
        'Enhanced user stats',
        'Data validation',
        'Better error handling'
      ]
    });

  } catch (error) {
    console.error('[LEADERBOARD V2] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message, version: '2.0.0' },
      { status: 500 }
    );
  }
}
