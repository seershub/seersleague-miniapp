import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60; // Vercel Pro plan - allows full leaderboard generation

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
 * Generate leaderboard from blockchain (fallback when cache is empty)
 */
async function generateLeaderboardFromContract(): Promise<SimpleLeaderboardEntry[]> {
  console.log('[Simple Leaderboard] Generating from contract...');

  const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
  const currentBlock = await publicClient.getBlockNumber();

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
    fromBlock: deploymentBlock > 0n ? deploymentBlock : currentBlock - 10000n,
    toBlock: 'latest'
  });

  console.log(`[Simple Leaderboard] Found ${predictionEvents.length} prediction events`);

  // Extract unique users
  const uniqueUsers = new Set<string>();
  predictionEvents.forEach(event => {
    if (event.args && event.args.user) {
      uniqueUsers.add(event.args.user.toLowerCase());
    }
  });

  console.log(`[Simple Leaderboard] Found ${uniqueUsers.size} unique users`);

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

      if (totalPredictions > 0) {
        const accuracy = Math.round((correctPredictions / totalPredictions) * 100);

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
      console.error(`[Simple Leaderboard] Error fetching stats for ${userAddress}:`, error);
      return null;
    }
  });

  const allUserStats = await Promise.all(userStatsPromises);
  const leaderboardData = allUserStats.filter((entry): entry is SimpleLeaderboardEntry => entry !== null);

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

  console.log(`[Simple Leaderboard] Generated ${leaderboardData.length} entries`);
  return leaderboardData;
}

/**
 * Fast leaderboard endpoint - reads from KV cache with fallback
 * Data is updated by /api/cron/update-leaderboard (runs daily)
 */
export async function GET() {
  try {
    console.log('[Simple Leaderboard] Reading from KV cache...');

    // Try to read cached leaderboard from KV
    let cachedLeaderboard = await kv.get<SimpleLeaderboardEntry[]>('leaderboard:all');
    let lastUpdated = await kv.get<string>('leaderboard:lastUpdated');

    if (cachedLeaderboard && cachedLeaderboard.length > 0) {
      console.log(`[Simple Leaderboard] Returning ${cachedLeaderboard.length} entries from cache`);
      return NextResponse.json({
        success: true,
        totalPlayers: cachedLeaderboard.length,
        leaderboard: cachedLeaderboard,
        topPlayers: cachedLeaderboard.slice(0, 65),
        lastUpdated: lastUpdated || new Date().toISOString(),
        source: 'cache'
      });
    }

    // No cache found - generate from contract
    console.log('[Simple Leaderboard] No cache found, generating from contract...');
    const freshLeaderboard = await generateLeaderboardFromContract();

    if (freshLeaderboard.length > 0) {
      // Try to cache it for next time (non-blocking)
      try {
        await kv.set('leaderboard:all', freshLeaderboard);
        await kv.set('leaderboard:lastUpdated', new Date().toISOString());
        console.log('[Simple Leaderboard] Cached fresh data to KV');
      } catch (cacheError) {
        console.error('[Simple Leaderboard] Failed to cache:', cacheError);
      }

      return NextResponse.json({
        success: true,
        totalPlayers: freshLeaderboard.length,
        leaderboard: freshLeaderboard,
        topPlayers: freshLeaderboard.slice(0, 65),
        lastUpdated: new Date().toISOString(),
        source: 'contract-fallback'
      });
    }

    // No data at all
    console.log('[Simple Leaderboard] No data found');
    return NextResponse.json({
      success: true,
      totalPlayers: 0,
      leaderboard: [],
      topPlayers: [],
      lastUpdated: new Date().toISOString(),
      source: 'empty',
      message: 'No players yet. Be the first to make predictions!'
    });

  } catch (error) {
    console.error('[Simple Leaderboard] Error:', error);

    // Return empty on error
    return NextResponse.json({
      success: false,
      totalPlayers: 0,
      leaderboard: [],
      topPlayers: [],
      lastUpdated: new Date().toISOString(),
      source: 'error',
      message: 'Unable to load leaderboard. Please try again.',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
