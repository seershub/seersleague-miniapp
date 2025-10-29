import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * EMERGENCY DIAGNOSTIC - Check blockchain state NOW
 */
export async function GET() {
  try {
    const currentBlock = await publicClient.getBlockNumber();
    console.log(`Current block: ${currentBlock}`);

    // Check deployment block
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    console.log(`Deployment block: ${deploymentBlock}`);

    // Use 5M block range
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 5000000n;

    console.log('🔍 Fetching PredictionsSubmitted events...');

    // Get ALL prediction events
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

    console.log(`✅ Found ${events.length} prediction events`);

    // Extract users
    const users = new Set<string>();
    const userPredictionCounts = new Map<string, number>();

    events.forEach((event: any) => {
      const user = event.args?.user?.toLowerCase();
      const matchIds = event.args?.matchIds || [];

      if (user) {
        users.add(user);
        const count = userPredictionCounts.get(user) || 0;
        userPredictionCounts.set(user, count + matchIds.length);
      }
    });

    console.log(`👥 Found ${users.size} unique users`);

    // Check contract stats for first 10 users
    const userStatsCheck = [];
    let checkCount = 0;

    for (const userAddress of Array.from(users).slice(0, 10)) {
      try {
        const stats = await publicClient.readContract({
          address: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'getUserStats',
          args: [userAddress as `0x${string}`]
        }) as {
          correctPredictions: bigint;
          totalPredictions: bigint;
          freePredictionsUsed: bigint;
          currentStreak: bigint;
          longestStreak: bigint;
        };

        userStatsCheck.push({
          address: userAddress,
          totalPredictions: Number(stats.totalPredictions),
          correctPredictions: Number(stats.correctPredictions),
          predictionsFromEvents: userPredictionCounts.get(userAddress) || 0
        });

        checkCount++;
      } catch (error) {
        console.error(`Error checking ${userAddress}:`, error);
      }
    }

    // Get ResultRecorded events
    console.log('🔍 Fetching ResultRecorded events...');

    const resultEvents = await publicClient.getLogs({
      address: CONTRACTS.SEERSLEAGUE,
      event: {
        type: 'event',
        name: 'ResultRecorded',
        inputs: [
          { name: 'user', type: 'address', indexed: true },
          { name: 'matchId', type: 'uint256', indexed: false },
          { name: 'correct', type: 'bool', indexed: false }
        ]
      },
      fromBlock,
      toBlock: 'latest'
    });

    console.log(`✅ Found ${resultEvents.length} result recorded events`);

    return NextResponse.json({
      blockchainStatus: {
        currentBlock: currentBlock.toString(),
        deploymentBlock: deploymentBlock.toString(),
        scanRange: `${fromBlock} to ${currentBlock}`,
        blocksScanned: Number(currentBlock - fromBlock)
      },

      dataFound: {
        predictionEvents: events.length,
        uniqueUsers: users.size,
        resultRecordedEvents: resultEvents.length,
        usersChecked: checkCount
      },

      firstTenUsers: userStatsCheck,

      diagnosis: {
        hasUsers: users.size > 0 ? '✅ Users found in blockchain' : '❌ NO USERS FOUND',
        hasResults: resultEvents.length > 0 ? '✅ Results recorded' : '❌ NO RESULTS',
        contractWorking: checkCount > 0 ? '✅ Contract readable' : '❌ CONTRACT ERROR',

        possibleIssues: [
          users.size === 0 ? '🚨 NO PREDICTION EVENTS - Wrong contract address?' : null,
          resultEvents.length === 0 ? '⚠️ NO RESULTS RECORDED - smart-recount never succeeded?' : null,
          checkCount === 0 ? '🚨 CANNOT READ CONTRACT - RPC issue?' : null
        ].filter(Boolean)
      },

      contractAddress: CONTRACTS.SEERSLEAGUE,

      testInstructions: {
        message: 'If blockchain data exists but frontend shows nothing, problem is in API/Frontend',
        nextSteps: [
          '1. Check /api/leaderboard response',
          '2. Check /api/user-predictions response',
          '3. Check frontend console errors',
          '4. Verify contract address matches'
        ]
      }
    });

  } catch (error) {
    console.error('EMERGENCY DIAGNOSTIC ERROR:', error);
    return NextResponse.json({
      error: (error as Error).message,
      stack: (error as Error).stack,
      status: '🚨 CRITICAL FAILURE'
    }, { status: 500 });
  }
}
