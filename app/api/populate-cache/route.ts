import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Vercel Pro max: 5 minutes for initial cache population

/**
 * MANUAL TRIGGER - Populate Leaderboard Cache
 *
 * This is a public endpoint for manual testing.
 * No auth required - just for initial setup.
 */
export async function GET() {
  try {
    console.log('[Manual Trigger] Starting leaderboard generation...');

    const currentBlock = await publicClient.getBlockNumber();

    // ALCHEMY FREE TIER FIX: Scan last 10K blocks in chunks of 10 blocks
    const totalBlocks = 10000n;
    const chunkSize = 10n; // Alchemy Free Tier limit: 10 blocks per request
    const fromBlock = currentBlock - totalBlocks;

    console.log(`[Manual Trigger] Fetching events from block ${fromBlock} to ${currentBlock}`);
    console.log(`[Manual Trigger] Using chunked fetching: ${totalBlocks / chunkSize} chunks of ${chunkSize} blocks`);

    // Fetch events in chunks to stay within Alchemy Free Tier limit
    // Process chunks in parallel batches for speed (10 at a time to avoid rate limiting)
    const allPredictionEvents = [];
    const totalChunks = Number(totalBlocks / chunkSize);
    const batchSize = 10; // Process 10 chunks in parallel
    const chunks = [];

    // Create all chunk ranges
    for (let start = fromBlock; start < currentBlock; start += chunkSize) {
      const end = start + chunkSize - 1n > currentBlock ? currentBlock : start + chunkSize - 1n;
      chunks.push({ start, end });
    }

    console.log(`[Manual Trigger] Processing ${chunks.length} chunks in batches of ${batchSize}...`);

    // Process chunks in batches
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);

      const batchPromises = batch.map(async ({ start, end }) => {
        try {
          return await publicClient.getLogs({
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
            fromBlock: start,
            toBlock: end
          });
        } catch (error) {
          console.error(`[Manual Trigger] Error fetching chunk ${start}-${end}:`, error);
          return [];
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(events => allPredictionEvents.push(...events));

      // Log progress
      const processedSoFar = Math.min(i + batchSize, chunks.length);
      console.log(`[Manual Trigger] Progress: ${processedSoFar}/${totalChunks} chunks (${Math.round(processedSoFar / totalChunks * 100)}%)`);
    }

    const predictionEvents = allPredictionEvents;
    console.log(`[Manual Trigger] Found ${predictionEvents.length} prediction events from ${chunks.length} chunks`);

    // Extract unique users
    const uniqueUsers = new Set<string>();
    predictionEvents.forEach(event => {
      if (event.args && event.args.user) {
        uniqueUsers.add(event.args.user.toLowerCase());
      }
    });

    console.log(`[Manual Trigger] Found ${uniqueUsers.size} unique users`);

    // Fetch stats for all users in parallel
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
        console.error(`[Manual Trigger] Error fetching stats for ${userAddress}:`, error);
        return null;
      }
    });

    const allUserStats = await Promise.all(userStatsPromises);
    const leaderboardData = allUserStats.filter((entry): entry is any => entry !== null);

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
    try {
      await kv.set('leaderboard:all', leaderboardData);
      await kv.set('leaderboard:lastUpdated', new Date().toISOString());
      console.log(`[Manual Trigger] ✅ Cached ${leaderboardData.length} entries to KV`);
    } catch (kvError) {
      console.error('[Manual Trigger] KV cache error:', kvError);
    }

    return NextResponse.json({
      success: true,
      message: '✅ Leaderboard cache populated successfully!',
      totalPlayers: leaderboardData.length,
      topPlayers: leaderboardData.slice(0, 10),
      lastUpdated: new Date().toISOString(),
      instructions: 'Now refresh your app pages - leaderboard, profile, and matches should all work!'
    });

  } catch (error) {
    console.error('[Manual Trigger] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate leaderboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
