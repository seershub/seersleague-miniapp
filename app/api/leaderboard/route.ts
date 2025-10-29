import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export interface LeaderboardEntry {
  rank: number;
  address: string;
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
  currentStreak: number;
  longestStreak: number;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Generate leaderboard directly from contract (fallback when KV fails)
// Returns top 20 users in leaderboard, but totalUsers count includes ALL users
async function generateLeaderboardFromContract(): Promise<{ leaderboard: LeaderboardEntry[], totalUsers: number }> {
  console.log('Generating leaderboard directly from contract...');

  try {
    // Get contract deployment block
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const currentBlock = await publicClient.getBlockNumber();

    // CRITICAL FIX: Use much wider block range to catch all users
    // If deployment block not set, scan last 5M blocks (~1 month on Base)
    // This matches smart-recount's range to ensure we find all users
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 5000000n;

    console.log(`[Leaderboard] Scanning from block ${fromBlock} to latest (${currentBlock})`);
    console.log(`[Leaderboard] Block range: ${currentBlock - fromBlock} blocks`);

    // Fetch PredictionsSubmitted events
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

    console.log(`Found ${predictionEvents.length} prediction events`);

    // Extract unique user addresses
    const uniqueUsers = new Set<string>();
    predictionEvents.forEach(event => {
      if (event.args && event.args.user) {
        uniqueUsers.add(event.args.user.toLowerCase());
      }
    });

    console.log(`Found ${uniqueUsers.size} unique users`);

    // Store total unique users count (for accurate totalPlayers display)
    const totalUniqueUsers = uniqueUsers.size;

    // Fetch stats for each user with BATCH and TIMEOUT protection
    const leaderboardData: LeaderboardEntry[] = [];
    let successCount = 0;
    let errorCount = 0;

    console.log(`[Leaderboard] Fetching stats for ${uniqueUsers.size} users (max 20 for speed)...`);

    // LIMIT TO 20 USERS for performance
    const usersArray = Array.from(uniqueUsers).slice(0, 20);

    // Fetch in batches of 5 with Promise.allSettled
    const BATCH_SIZE = 5;
    for (let i = 0; i < usersArray.length; i += BATCH_SIZE) {
      const batch = usersArray.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (userAddress) => {
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
            const cappedCorrect = Math.min(correctPredictions, totalPredictions);
            const accuracy = Math.round((cappedCorrect / totalPredictions) * 100);

            return {
              rank: 0,
              address: userAddress,
              accuracy,
              totalPredictions,
              correctPredictions: cappedCorrect,
              currentStreak: Number(stats.currentStreak || 0),
              longestStreak: Number(stats.longestStreak || 0)
            };
          }
          return null;
        } catch (error) {
          console.error(`[Leaderboard] Error for ${userAddress}:`, error);
          return null;
        }
      });

      const results = await Promise.allSettled(batchPromises);

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          leaderboardData.push(result.value);
          successCount++;
        } else {
          errorCount++;
        }
      });

      console.log(`[Leaderboard] Batch ${i / BATCH_SIZE + 1} complete: ${successCount} success, ${errorCount} errors`);
    }

    console.log(`[Leaderboard] Final: Success ${successCount}, Errors ${errorCount}`);

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

    console.log(`Generated leaderboard with ${leaderboardData.length} entries (out of ${totalUniqueUsers} total users)`);
    return {
      leaderboard: leaderboardData,
      totalUsers: totalUniqueUsers
    };

  } catch (error) {
    console.error('Error generating leaderboard from contract:', error);
    return { leaderboard: [], totalUsers: 0 };
  }
}

// Trigger background update if data is stale (> 1 hour old)
async function triggerUpdateIfStale() {
  try {
    const lastUpdated = await kv.get<string>('leaderboard:lastUpdated');

    if (!lastUpdated) {
      // No data yet, trigger update
      triggerBackgroundUpdate();
      return;
    }

    const lastUpdateTime = new Date(lastUpdated).getTime();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // If data is older than 1 hour, trigger background update
    if (now - lastUpdateTime > oneHour) {
      console.log('Leaderboard data is stale, triggering background update...');
      triggerBackgroundUpdate();
    }
  } catch (error) {
    console.error('Error checking leaderboard staleness:', error);
  }
}

// Trigger background update without blocking response
function triggerBackgroundUpdate() {
  // Don't await - let it run in background
  fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/cron/update-leaderboard`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      'Content-Type': 'application/json'
    }
  }).catch(err => {
    console.error('Background update failed:', err);
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('address');

    // Trigger update if data is stale (non-blocking)
    triggerUpdateIfStale();

    // Always generate leaderboard directly from contract (KV is unreliable)
    console.log('Generating leaderboard directly from contract...');
    let leaderboard: LeaderboardEntry[] = [];
    let totalUsers = 0;
    try {
      const result = await generateLeaderboardFromContract();
      leaderboard = result.leaderboard;
      totalUsers = result.totalUsers;
      console.log(`Generated leaderboard with ${leaderboard.length} entries out of ${totalUsers} total users`);
    } catch (contractError) {
      console.error('Contract fetch failed:', contractError);
      leaderboard = [];
      totalUsers = 0;
    }

    if (!leaderboard || leaderboard.length === 0) {
      console.log('No leaderboard data found, triggering update...');
      return NextResponse.json({
        leaderboard: [],
        topPlayers: [],
        userRank: null,
        totalPlayers: 0,
        needsUpdate: true,
        message: 'No data available, update in progress...'
      });
    }

    // Get top 20 players (already limited in generateLeaderboardFromContract)
    const topPlayers = leaderboard.slice(0, 20);

    // Find user rank if address provided
    let userRank = null;
    if (userAddress) {
      const userIndex = leaderboard.findIndex(
        entry => entry.address.toLowerCase() === userAddress.toLowerCase()
      );
      if (userIndex !== -1) {
        userRank = {
          ...leaderboard[userIndex],
          rank: userIndex + 1
        };
      }
    }

    return NextResponse.json({
      leaderboard: topPlayers,
      topPlayers,
      userRank,
      totalPlayers: totalUsers, // Total unique users who made predictions
      lastUpdated: await kv.get('leaderboard:lastUpdated')
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
