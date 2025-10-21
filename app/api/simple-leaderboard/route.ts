import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';

interface SimpleLeaderboardEntry {
  rank: number;
  address: string;
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
  currentStreak: number;
  longestStreak: number;
}

export async function GET() {
  try {
    console.log('Simple leaderboard - checking cache first...');
    
    // Try to get cached leaderboard from KV first
    try {
      const cachedLeaderboard = await kv.get<SimpleLeaderboardEntry[]>('leaderboard:all');
      const lastUpdated = await kv.get<string>('leaderboard:lastUpdated');
      
      if (cachedLeaderboard && cachedLeaderboard.length > 0) {
        console.log(`Returning cached leaderboard with ${cachedLeaderboard.length} entries`);
        return NextResponse.json({
          success: true,
          totalPlayers: cachedLeaderboard.length,
          leaderboard: cachedLeaderboard,
          topPlayers: cachedLeaderboard.slice(0, 65),
          lastUpdated: lastUpdated || new Date().toISOString(),
          cached: true
        });
      }
    } catch (kvError) {
      console.log('KV cache miss or error:', kvError);
    }
    
    console.log('No cache found, fetching from contract...');
    
    // Get contract deployment block
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const currentBlock = await publicClient.getBlockNumber();
    
    console.log(`Current block: ${currentBlock}, deployment block: ${deploymentBlock}`);

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

    console.log(`Found ${predictionEvents.length} prediction events`);

    // Extract unique user addresses
    const uniqueUsers = new Set<string>();
    predictionEvents.forEach(event => {
      if (event.args && event.args.user) {
        uniqueUsers.add(event.args.user.toLowerCase());
      }
    });

    console.log(`Found ${uniqueUsers.size} unique users:`, Array.from(uniqueUsers));

    // Fetch stats for each user
    const leaderboardData: SimpleLeaderboardEntry[] = [];

    for (const userAddress of uniqueUsers) {
      try {
        console.log(`Fetching stats for ${userAddress}...`);
        
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

        console.log(`User ${userAddress}: ${correctPredictions}/${totalPredictions} correct`);

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

    console.log(`Final leaderboard with ${leaderboardData.length} entries:`, leaderboardData);

    // Cache the result in KV for 5 minutes
    const now = new Date().toISOString();
    try {
      await kv.set('leaderboard:all', leaderboardData, { ex: 300 }); // 5 minutes
      await kv.set('leaderboard:lastUpdated', now, { ex: 300 });
      console.log('Leaderboard cached successfully');
    } catch (cacheError) {
      console.error('Failed to cache leaderboard:', cacheError);
    }
    
    return NextResponse.json({
      success: true,
      totalPlayers: leaderboardData.length,
      leaderboard: leaderboardData,
      topPlayers: leaderboardData.slice(0, 65),
      lastUpdated: now,
      cached: false,
      debug: {
        eventsCount: predictionEvents.length,
        uniqueUsers: uniqueUsers.size,
        contractAddress: CONTRACTS.SEERSLEAGUE,
        currentBlock: currentBlock.toString()
      }
    });

  } catch (error) {
    console.error('Simple leaderboard error:', error);
    
    // Return empty leaderboard instead of error to prevent UI from breaking
    return NextResponse.json({
      success: false,
      totalPlayers: 0,
      leaderboard: [],
      topPlayers: [],
      lastUpdated: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'No data available. Please try again later.'
    });
  }
}
