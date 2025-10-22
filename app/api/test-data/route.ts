import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Pro plan - full diagnostic testing

/**
 * TEST ENDPOINT: Check Blockchain Data & Cache Status
 *
 * GET /api/test-data
 *
 * This endpoint checks:
 * 1. If there's any data on blockchain (predictions, users, matches)
 * 2. If KV cache is working
 * 3. Performance estimates
 */
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: {},
    errors: []
  };

  try {
    // CHECK 1: Blockchain Connection
    console.log('TEST 1: Checking blockchain connection...');
    const startBlock = Date.now();
    const currentBlock = await publicClient.getBlockNumber();
    const blockTime = Date.now() - startBlock;

    results.checks.blockchain = {
      status: 'connected',
      currentBlock: currentBlock.toString(),
      responseTime: `${blockTime}ms`
    };

    // CHECK 2: Prediction Events
    console.log('TEST 2: Fetching prediction events...');
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 10000n;

    const startEvents = Date.now();
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
    const eventsTime = Date.now() - startEvents;

    // Extract unique users
    const uniqueUsers = new Set<string>();
    predictionEvents.forEach(event => {
      if (event.args && event.args.user) {
        uniqueUsers.add(event.args.user.toLowerCase());
      }
    });

    results.checks.predictions = {
      totalEvents: predictionEvents.length,
      uniqueUsers: uniqueUsers.size,
      blockRange: `${fromBlock.toString()} - ${currentBlock.toString()}`,
      fetchTime: `${eventsTime}ms`,
      hasData: predictionEvents.length > 0
    };

    if (predictionEvents.length === 0) {
      results.checks.predictions.warning = 'NO DATA: Blockchain has no predictions yet!';
      results.checks.predictions.solution = 'Make some test predictions first.';
    }

    // CHECK 3: User Stats Performance (sample 3 users)
    if (uniqueUsers.size > 0) {
      console.log('TEST 3: Testing user stats fetching...');
      const sampleUsers = Array.from(uniqueUsers).slice(0, 3);
      const userStatsTimes: number[] = [];

      for (const userAddress of sampleUsers) {
        const startUser = Date.now();
        try {
          await publicClient.readContract({
            address: CONTRACTS.SEERSLEAGUE,
            abi: SEERSLEAGUE_ABI,
            functionName: 'getUserStats',
            args: [userAddress as `0x${string}`]
          });
          const userTime = Date.now() - startUser;
          userStatsTimes.push(userTime);
        } catch (error) {
          console.error(`Error fetching stats for ${userAddress}:`, error);
        }
      }

      const avgFetchTime = userStatsTimes.length > 0
        ? Math.round(userStatsTimes.reduce((a, b) => a + b, 0) / userStatsTimes.length)
        : 300;

      // Estimate parallel vs sequential
      const sequentialTime = uniqueUsers.size * avgFetchTime;
      const parallelTime = Math.max(1000, avgFetchTime * 2); // Parallel is much faster

      results.checks.performance = {
        sampleUsers: sampleUsers.length,
        avgFetchTime: `${avgFetchTime}ms`,
        totalUsers: uniqueUsers.size,
        estimatedSequential: `${(sequentialTime / 1000).toFixed(1)}s`,
        estimatedParallel: `${(parallelTime / 1000).toFixed(1)}s`,
        withinHobbyLimit: parallelTime <= 10000,
        withinProLimit: parallelTime <= 60000
      };

      if (parallelTime > 10000) {
        results.checks.performance.warning = 'May exceed 10s Hobby limit';
        results.checks.performance.recommendation = 'Upgrade to Vercel Pro (60s timeout)';
      } else {
        results.checks.performance.status = 'Should work on Hobby plan with parallel fetching';
      }
    }

    // CHECK 4: KV Cache Status
    console.log('TEST 4: Checking KV cache...');
    try {
      const cachedLeaderboard = await kv.get('leaderboard:all');
      const lastUpdated = await kv.get('leaderboard:lastUpdated');

      results.checks.cache = {
        status: 'connected',
        hasLeaderboard: !!cachedLeaderboard,
        leaderboardSize: cachedLeaderboard ? (cachedLeaderboard as any[]).length : 0,
        lastUpdated: lastUpdated || 'never',
        working: !!cachedLeaderboard
      };

      if (!cachedLeaderboard) {
        results.checks.cache.warning = 'KV cache is empty';
        results.checks.cache.solution = 'Run POST /api/cron/update-leaderboard to populate cache';
      }
    } catch (kvError) {
      results.checks.cache = {
        status: 'error',
        error: kvError instanceof Error ? kvError.message : 'Unknown error'
      };
      results.errors.push(`KV Cache Error: ${kvError instanceof Error ? kvError.message : 'Unknown'}`);
    }

    // CHECK 5: Match Registration
    console.log('TEST 5: Checking registered matches...');
    try {
      const startMatches = Date.now();
      const matchEvents = await publicClient.getLogs({
        address: CONTRACTS.SEERSLEAGUE,
        event: {
          type: 'event',
          name: 'MatchRegistered',
          inputs: [
            { name: 'matchId', type: 'uint256', indexed: true },
            { name: 'startTime', type: 'uint256', indexed: false }
          ]
        },
        fromBlock,
        toBlock: 'latest'
      });
      const matchesTime = Date.now() - startMatches;

      const now = Math.floor(Date.now() / 1000);
      const upcomingMatches = matchEvents.filter((e): e is typeof e & { args: { matchId: bigint; startTime: bigint } } =>
        Boolean(e.args?.matchId && e.args?.startTime && Number(e.args.startTime) > now)
      );

      results.checks.matches = {
        totalRegistered: matchEvents.length,
        upcomingMatches: upcomingMatches.length,
        fetchTime: `${matchesTime}ms`,
        hasMatches: matchEvents.length > 0
      };

      if (matchEvents.length === 0) {
        results.checks.matches.warning = 'NO MATCHES: No matches registered yet';
        results.checks.matches.solution = 'Run POST /api/batch-register-matches';
      }
    } catch (matchError) {
      results.checks.matches = {
        status: 'error',
        error: matchError instanceof Error ? matchError.message : 'Unknown error'
      };
    }

    // OVERALL SUMMARY
    results.summary = {
      blockchainConnected: !!results.checks.blockchain,
      hasData: results.checks.predictions?.hasData || false,
      cacheWorking: results.checks.cache?.working || false,
      hasMatches: results.checks.matches?.hasMatches || false,
      needsVercelPro: results.checks.performance?.withinHobbyLimit === false,
      readyForProduction: (
        results.checks.predictions?.hasData &&
        results.checks.cache?.working &&
        results.checks.matches?.hasMatches
      )
    };

    // RECOMMENDATIONS
    results.recommendations = [];

    if (!results.checks.predictions?.hasData) {
      results.recommendations.push('⚠️  Make test predictions to populate blockchain data');
    }

    if (!results.checks.cache?.working) {
      results.recommendations.push('⚠️  Run POST /api/cron/update-leaderboard to populate cache');
    }

    if (!results.checks.matches?.hasMatches) {
      results.recommendations.push('⚠️  Run POST /api/batch-register-matches to add matches');
    }

    if (results.checks.performance?.withinHobbyLimit === false) {
      results.recommendations.push('💰 UPGRADE TO VERCEL PRO for 60s timeout (will solve all timeout issues)');
    }

    if (results.summary.readyForProduction) {
      results.recommendations.push('✅ All checks passed! System is ready for production.');
    }

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('Test endpoint error:', error);
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    results.summary = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    return NextResponse.json(results, { status: 500 });
  }
}
