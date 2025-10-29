import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';
import { kv } from '@vercel/kv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * SYSTEM STATUS - Comprehensive health check
 * 
 * This endpoint provides:
 * 1. Contract state analysis
 * 2. Leaderboard status
 * 3. Cache status
 * 4. Recent activity
 * 5. System recommendations
 */
export async function GET() {
  try {
    console.log('🔍 [SYSTEM STATUS] Running comprehensive health check...');

    const status = {
      timestamp: new Date().toISOString(),
      system: {
        status: 'unknown',
        uptime: 'unknown',
        version: '1.0.0'
      },
      contract: {
        connected: false,
        deploymentBlock: process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0',
        currentBlock: '0',
        users: {
          total: 0,
          withPredictions: 0,
          inLeaderboard: 0
        }
      },
      leaderboard: {
        totalPlayers: 0,
        lastUpdated: null,
        cacheStatus: 'unknown'
      },
      matches: {
        total: 0,
        finished: 0,
        recorded: 0
      },
      issues: [] as string[],
      recommendations: [] as string[]
    };

    // Check contract connection
    try {
      const currentBlock = await publicClient.getBlockNumber();
      status.contract.connected = true;
      status.contract.currentBlock = currentBlock.toString();
      console.log(`✅ Contract connected, current block: ${currentBlock}`);
    } catch (error) {
      status.contract.connected = false;
      status.issues.push('❌ Cannot connect to blockchain');
      console.error('❌ Contract connection failed:', error);
    }

    if (status.contract.connected) {
      // Get user statistics
      try {
        const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
        const fromBlock = deploymentBlock > 0n ? deploymentBlock : BigInt(status.contract.currentBlock) - 5000000n;

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

        const uniqueUsers = new Set<string>();
        const allMatchIds = new Set<string>();

        predictionEvents.forEach((event: any) => {
          if (event.args?.user) {
            uniqueUsers.add(event.args.user.toLowerCase());
          }
          if (event.args?.matchIds) {
            event.args.matchIds.forEach((id: bigint) => {
              allMatchIds.add(id.toString());
            });
          }
        });

        status.contract.users.total = uniqueUsers.size;
        status.matches.total = allMatchIds.size;

        console.log(`📊 Found ${uniqueUsers.size} users and ${allMatchIds.size} matches`);

        // Check how many users have predictions in contract
        let usersWithPredictions = 0;
        let usersInLeaderboard = 0;

        for (const userAddress of Array.from(uniqueUsers).slice(0, 10)) { // Sample first 10 users
          try {
            const stats = await publicClient.readContract({
              address: CONTRACTS.SEERSLEAGUE,
              abi: SEERSLEAGUE_ABI,
              functionName: 'getUserStats',
              args: [userAddress as `0x${string}`]
            }) as {
              totalPredictions: bigint;
              correctPredictions: bigint;
            };

            const totalPredictions = Number(stats.totalPredictions || 0);
            if (totalPredictions > 0) {
              usersWithPredictions++;
              usersInLeaderboard++;
            }
          } catch (error) {
            // User might not have stats yet
          }
        }

        status.contract.users.withPredictions = usersWithPredictions;
        status.contract.users.inLeaderboard = usersInLeaderboard;

      } catch (error) {
        status.issues.push('❌ Failed to analyze contract data');
        console.error('❌ Contract analysis failed:', error);
      }
    }

    // Check leaderboard status
    try {
      const leaderboardData = await kv.get('leaderboard:all');
      const lastUpdated = await kv.get('leaderboard:lastUpdated');

      if (leaderboardData && Array.isArray(leaderboardData)) {
        status.leaderboard.totalPlayers = leaderboardData.length;
        status.leaderboard.cacheStatus = 'active';
      } else {
        status.leaderboard.cacheStatus = 'empty';
      }

      status.leaderboard.lastUpdated = lastUpdated as string || null;

    } catch (error) {
      status.leaderboard.cacheStatus = 'error';
      status.issues.push('❌ KV cache error');
      console.error('❌ Leaderboard cache check failed:', error);
    }

    // Generate recommendations
    if (status.contract.users.total > 0 && status.contract.users.inLeaderboard < status.contract.users.total) {
      const missingUsers = status.contract.users.total - status.contract.users.inLeaderboard;
      status.recommendations.push(`⚠️ ${missingUsers} users need smart-recount to appear in leaderboard`);
    }

    if (status.leaderboard.cacheStatus === 'empty') {
      status.recommendations.push('🔄 Leaderboard cache is empty, run update-leaderboard');
    }

    if (status.contract.users.total === 0) {
      status.recommendations.push('📊 No users found, check deployment block configuration');
    }

    if (status.issues.length === 0) {
      status.system.status = 'healthy';
    } else if (status.issues.length <= 2) {
      status.system.status = 'warning';
    } else {
      status.system.status = 'error';
    }

    // Add system recommendations
    if (status.contract.users.total > 0 && status.contract.users.inLeaderboard < status.contract.users.total) {
      status.recommendations.push('🚀 Run smart-recount to record all finished matches');
    }

    if (status.leaderboard.totalPlayers === 0) {
      status.recommendations.push('🏆 Run update-leaderboard to generate leaderboard data');
    }

    console.log(`✅ [SYSTEM STATUS] Health check completed - Status: ${status.system.status}`);

    return NextResponse.json(status);

  } catch (error) {
    console.error('❌ [SYSTEM STATUS] Fatal error:', error);
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        system: { status: 'error' },
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
}
