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
async function generateLeaderboardFromContract(): Promise<LeaderboardEntry[]> {
  console.log('Generating leaderboard directly from contract...');
  
  try {
    // Alchemy PAYG: Optimize for cost
    // 10,000 blocks = ~5.5 hours on Base (2s per block)
    // No indexed parameter here, so keep range reasonable
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - 10000n;

    console.log(`[Leaderboard] Fetching from block ${fromBlock} to ${currentBlock} (10k blocks)`);

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
          const accuracy = totalPredictions > 0
            ? Math.round((correctPredictions / totalPredictions) * 100)
            : 0;

          leaderboardData.push({
            rank: 0, // Will be set after sorting
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

    console.log(`Generated leaderboard with ${leaderboardData.length} entries`);
    return leaderboardData;

  } catch (error) {
    console.error('Error generating leaderboard from contract:', error);
    return [];
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
    try {
      leaderboard = await generateLeaderboardFromContract();
      console.log(`Generated leaderboard with ${leaderboard.length} entries`);
    } catch (contractError) {
      console.error('Contract fetch failed:', contractError);
      leaderboard = [];
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

    // Get top 65 players
    const topPlayers = leaderboard.slice(0, 65);

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
      totalPlayers: leaderboard.length,
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
