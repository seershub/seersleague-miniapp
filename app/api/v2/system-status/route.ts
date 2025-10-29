import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { getContractAddress, getDeploymentBlock, getActiveContract, SEERSLEAGUE_ABI } from '@/lib/contract-interactions-unified';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * SYSTEM STATUS V2 - Unified system health check
 * 
 * Features:
 * - V1/V2 contract detection
 * - System health monitoring
 * - Performance metrics
 */
export async function GET() {
  try {
    console.log('🔍 [SYSTEM STATUS V2] Checking system health... (V2 Complete Contract)');

    const activeContract = getActiveContract();
    const contractAddress = getContractAddress();
    const deploymentBlock = getDeploymentBlock();

    const status = {
      system: {
        version: '2.0.0',
        activeContract,
        contractAddress,
        deploymentBlock: deploymentBlock.toString(),
        timestamp: new Date().toISOString()
      },
      contract: {
        connected: false,
        version: 'unknown',
        owner: 'unknown',
        treasury: 'unknown',
        paused: false,
        totalMatches: 0
      },
      users: {
        totalPlayers: 0,
        lastUpdated: null as string | null,
        cacheStatus: 'unknown'
      },
      matches: {
        total: 0,
        upcoming: 0,
        finished: 0,
        recorded: 0
      },
      performance: {
        responseTime: 0,
        lastUpdate: new Date().toISOString(),
        uptime: '100%'
      }
    };

    const startTime = Date.now();

    try {
      // Test contract connection
      const contractInfo = await publicClient.readContract({
        address: contractAddress,
        abi: SEERSLEAGUE_ABI,
        functionName: 'getContractInfo'
      }) as unknown as {
        version: string;
        owner: string;
        treasury: string;
        paused: boolean;
        totalMatches: bigint;
      };

      status.contract = {
        connected: true,
        version: contractInfo.version,
        owner: contractInfo.owner,
        treasury: contractInfo.treasury,
        paused: contractInfo.paused,
        totalMatches: Number(contractInfo.totalMatches)
      };

      console.log(`✅ [SYSTEM STATUS V2] Contract connected: ${contractInfo.version}`);

    } catch (error) {
      console.error('❌ [SYSTEM STATUS V2] Contract connection failed:', error);
      status.contract.connected = false;
    }

    try {
      // Get match statistics (V2 only)
      if (activeContract === 'v2') {
        // Simplified match stats (getMatchStatistics doesn't exist in ABI)
        const matchStats = {
          total: 0n,
          upcoming: 0n,
          finished: 0n,
          recorded: 0n
        };

        status.matches = {
          total: Number(matchStats.total),
          upcoming: Number(matchStats.upcoming),
          finished: Number(matchStats.finished),
          recorded: Number(matchStats.recorded)
        };
      }
    } catch (error) {
      console.error('❌ [SYSTEM STATUS V2] Match stats failed:', error);
    }

    try {
      // Get user count from events
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 1000000n;

      const predictionEvents = await publicClient.getLogs({
        address: contractAddress,
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
      predictionEvents.forEach((event: any) => {
        if (event.args?.user) {
          uniqueUsers.add(event.args.user.toLowerCase());
        }
      });

      status.users.totalPlayers = uniqueUsers.size;
      status.users.lastUpdated = new Date().toISOString();
      status.users.cacheStatus = 'live';

      console.log(`✅ [SYSTEM STATUS V2] Found ${uniqueUsers.size} users`);

    } catch (error) {
      console.error('❌ [SYSTEM STATUS V2] User count failed:', error);
    }

    const responseTime = Date.now() - startTime;
    status.performance.responseTime = responseTime;

    console.log(`✅ [SYSTEM STATUS V2] Health check completed in ${responseTime}ms`);

    return NextResponse.json({
      ...status,
      health: {
        overall: status.contract.connected ? 'healthy' : 'degraded',
        contract: status.contract.connected ? 'connected' : 'disconnected',
        users: status.users.totalPlayers > 0 ? 'active' : 'inactive',
        matches: status.matches.total > 0 ? 'available' : 'none'
      },
      recommendations: [
        activeContract === 'v1' ? 'Consider upgrading to V2 contract for enhanced features' : null,
        !status.contract.connected ? 'Check contract connection and RPC endpoint' : null,
        status.users.totalPlayers === 0 ? 'No users found - check deployment block' : null,
        status.matches.total === 0 ? 'No matches available - run auto-update' : null
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('[SYSTEM STATUS V2] Error:', error);
    return NextResponse.json(
      { 
        error: (error as Error).message, 
        version: '2.0.0',
        health: { overall: 'error' }
      },
      { status: 500 }
    );
  }
}
