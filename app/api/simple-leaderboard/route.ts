import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 10; // Vercel Hobby limit

// Fallback: Known active users (updated periodically)
const KNOWN_ACTIVE_USERS = [
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  // Add more as users join
];

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
 * Simple and reliable leaderboard
 * Scans recent events (last 2000 blocks) for active users
 * Edge runtime = no timeout issues
 */
export async function GET() {
  try {
    console.log('[Leaderboard] Starting...');
    
    const currentBlock = await publicClient.getBlockNumber();
    
    // Scan only last 1000 blocks (~30 min on Base)
    // Very small range for maximum speed
    const fromBlock = currentBlock - 1000n;
    
    console.log(`Scanning blocks ${fromBlock} to ${currentBlock}`);

    // Get prediction events
    const events = await publicClient.getLogs({
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

    console.log(`Found ${events.length} events`);

    // Get unique users
    const users = new Set<string>();
    events.forEach(e => {
      if (e.args?.user) users.add(e.args.user.toLowerCase());
    });

    console.log(`Found ${users.size} users`);

    if (users.size === 0) {
      return NextResponse.json({
        success: true,
        totalPlayers: 0,
        leaderboard: [],
        topPlayers: [],
        lastUpdated: new Date().toISOString()
      });
    }

    const leaderboardData: SimpleLeaderboardEntry[] = [];

    // Fetch stats in parallel
    const promises = Array.from(users).map(async (addr) => {
      try {
        const stats = await publicClient.readContract({
          address: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'getUserStats',
          args: [addr as `0x${string}`]
        }) as unknown as {
          correctPredictions: bigint;
          totalPredictions: bigint;
          freePredictionsUsed: bigint;
          currentStreak: bigint;
          longestStreak: bigint;
        };

        const correct = Number(stats.correctPredictions || 0);
        const total = Number(stats.totalPredictions || 0);

        if (total > 0) {
          return {
            rank: 0,
            address: addr,
            accuracy: Math.round((correct / total) * 100),
            totalPredictions: total,
            correctPredictions: correct,
            currentStreak: Number(stats.currentStreak || 0),
            longestStreak: Number(stats.longestStreak || 0)
          };
        }
        return null;
      } catch (err) {
        console.error(`Error for ${addr}:`, err);
        return null;
      }
    });

    const results = await Promise.all(promises);
    results.forEach(r => r && leaderboardData.push(r));

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
    console.error('[Simple Leaderboard] Error, using fallback:', error);
    
    // Fallback: Fetch stats for known users
    try {
      const leaderboardData: SimpleLeaderboardEntry[] = [];
      
      for (const addr of KNOWN_ACTIVE_USERS) {
        try {
          const stats = await publicClient.readContract({
            address: CONTRACTS.SEERSLEAGUE,
            abi: SEERSLEAGUE_ABI,
            functionName: 'getUserStats',
            args: [addr as `0x${string}`]
          }) as unknown as {
            correctPredictions: bigint;
            totalPredictions: bigint;
            freePredictionsUsed: bigint;
            currentStreak: bigint;
            longestStreak: bigint;
          };

          const correct = Number(stats.correctPredictions || 0);
          const total = Number(stats.totalPredictions || 0);

          if (total > 0) {
            leaderboardData.push({
              rank: 0,
              address: addr.toLowerCase(),
              accuracy: Math.round((correct / total) * 100),
              totalPredictions: total,
              correctPredictions: correct,
              currentStreak: Number(stats.currentStreak || 0),
              longestStreak: Number(stats.longestStreak || 0)
            });
          }
        } catch (err) {
          console.error(`Fallback error for ${addr}:`, err);
        }
      }

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

      return NextResponse.json({
        success: true,
        totalPlayers: leaderboardData.length,
        leaderboard: leaderboardData,
        topPlayers: leaderboardData.slice(0, 65),
        lastUpdated: new Date().toISOString(),
        source: 'fallback'
      });
    } catch (fallbackError) {
      console.error('[Simple Leaderboard] Fallback also failed:', fallbackError);
      
      // Last resort: empty response
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
}
