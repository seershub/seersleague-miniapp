import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { CONTRACTS_V2, SEERSLEAGUE_V2_ABI } from '@/lib/contract-interactions-v2';
import { kv } from '@vercel/kv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for Vercel Pro

interface LeaderboardEntry {
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
 * UPDATE LEADERBOARD V2 - Daily leaderboard update with real results
 * 
 * Features:
 * - Processes all finished matches
 * - Updates user statistics
 * - Calculates accurate leaderboard
 * - Caches results for performance
 */
export async function POST(request: Request) {
  try {
    console.log('🏆 [UPDATE LEADERBOARD V2] Starting daily leaderboard update...');

    // Check authorization
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET;
    
    if (!authHeader || !expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if leaderboard was updated recently
    const lastUpdate = await kv.get('leaderboard:lastUpdated');
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    if (lastUpdate && Number(lastUpdate) > oneDayAgo) {
      return NextResponse.json({
        success: true,
        message: 'Leaderboard already updated today',
        lastUpdate: new Date(Number(lastUpdate)).toISOString(),
        version: '2.0.0'
      });
    }

    // 1. First, run smart-recount to process all finished matches
    console.log('🔄 [UPDATE LEADERBOARD V2] Running smart-recount first...');
    const smartRecountResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/v2/smart-recount`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${expectedToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!smartRecountResponse.ok) {
      console.error('Smart-recount failed:', await smartRecountResponse.text());
    } else {
      const smartRecountResult = await smartRecountResponse.json();
      console.log('✅ Smart-recount completed:', smartRecountResult.message);
    }

    // 2. Get all users from prediction events
    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK_V2 || '0');
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 1000000n;

    console.log(`[UPDATE LEADERBOARD V2] Scanning from block ${fromBlock} to ${currentBlock}`);

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

    console.log(`[UPDATE LEADERBOARD V2] Found ${allUsers.size} unique users`);

    // 3. Get user stats and build leaderboard
    const leaderboardEntries: LeaderboardEntry[] = [];

    for (const userAddress of allUsers) {
      try {
        const stats = await publicClient.readContract({
          address: CONTRACTS_V2.SEERSLEAGUE,
          abi: SEERSLEAGUE_V2_ABI,
          functionName: 'getUserStats',
          args: [userAddress as `0x${string}`]
        }) as {
          correctPredictions: bigint;
          totalPredictions: bigint;
          freePredictionsUsed: bigint;
          currentStreak: bigint;
          longestStreak: bigint;
          lastPredictionTime: bigint;
          totalFeesPaid: bigint;
        };

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
        console.error(`[UPDATE LEADERBOARD V2] Error fetching stats for ${userAddress}:`, error);
      }
    }

    // 4. Sort by accuracy (descending), then by total predictions (descending)
    leaderboardEntries.sort((a, b) => {
      if (a.accuracy !== b.accuracy) {
        return b.accuracy - a.accuracy;
      }
      return b.totalPredictions - a.totalPredictions;
    });

    // 5. Set ranks
    leaderboardEntries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // 6. Cache the leaderboard
    await kv.set('leaderboard:v2', leaderboardEntries);
    await kv.set('leaderboard:lastUpdated', now.toString());

    // 7. Update contract leaderboard (if needed)
    try {
      const privateKey = process.env.PRIVATE_KEY;
      if (privateKey) {
        const account = privateKeyToAccount(privateKey as `0x${string}`);
        const walletClient = createWalletClient({
          account,
          chain: base,
          transport: http(process.env.NEXT_PUBLIC_ALCHEMY_API_KEY 
            ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
            : 'https://mainnet.base.org'
          )
        });

        await walletClient.writeContract({
          account,
          address: CONTRACTS_V2.SEERSLEAGUE,
          abi: SEERSLEAGUE_V2_ABI,
          functionName: 'updateLeaderboard'
        });

        console.log('✅ Contract leaderboard updated');
      }
    } catch (error) {
      console.error('Error updating contract leaderboard:', error);
    }

    console.log(`✅ [UPDATE LEADERBOARD V2] Complete! Updated ${leaderboardEntries.length} users`);

    return NextResponse.json({
      success: true,
      message: 'Leaderboard updated successfully',
      totalUsers: leaderboardEntries.length,
      topPlayers: leaderboardEntries.slice(0, 10),
      lastUpdated: new Date(now).toISOString(),
      version: '2.0.0',
      features: [
        'Real match results',
        'Accurate calculations',
        'Daily updates',
        'Performance caching'
      ]
    });

  } catch (error) {
    console.error('[UPDATE LEADERBOARD V2] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message, version: '2.0.0' },
      { status: 500 }
    );
  }
}
