import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * FIX CONTRACT DATA - Analyze and fix data inconsistencies
 * 
 * This endpoint:
 * 1. Finds users with impossible stats (correctPredictions > totalPredictions)
 * 2. Provides recommendations for fixing
 * 3. Shows which users need data correction
 */
export async function GET() {
  try {
    console.log('🔧 [FIX CONTRACT DATA] Analyzing data inconsistencies...');

    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 5000000n;

    // Get all users from events
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

    const allUsers = new Set<string>();
    const userMatchCounts = new Map<string, number>();

    predictionEvents.forEach((event: any) => {
      const user = event.args?.user?.toLowerCase();
      const matchIds = event.args?.matchIds || [];

      if (user) {
        allUsers.add(user);
        const currentCount = userMatchCounts.get(user) || 0;
        userMatchCounts.set(user, currentCount + matchIds.length);
      }
    });

    console.log(`👥 Found ${allUsers.size} unique users`);

    // Check each user's stats for inconsistencies
    const userAnalysis = [];
    const inconsistentUsers = [];

    for (const userAddress of allUsers) {
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

        const totalPredictions = Number(stats.totalPredictions || 0);
        const correctPredictions = Number(stats.correctPredictions || 0);
        const predictionsFromEvents = userMatchCounts.get(userAddress) || 0;

        const analysis = {
          address: userAddress,
          contractStats: {
            totalPredictions,
            correctPredictions,
            freePredictionsUsed: Number(stats.freePredictionsUsed || 0),
            currentStreak: Number(stats.currentStreak || 0),
            longestStreak: Number(stats.longestStreak || 0)
          },
          predictionsFromEvents,
          issues: [] as string[],
          recommendations: [] as string[]
        };

        // Check for impossible stats
        if (correctPredictions > totalPredictions) {
          analysis.issues.push(`❌ IMPOSSIBLE: correctPredictions (${correctPredictions}) > totalPredictions (${totalPredictions})`);
          analysis.recommendations.push(`🔧 Reset correctPredictions to 0 or fix contract data`);
          inconsistentUsers.push(analysis);
        }

        if (totalPredictions !== predictionsFromEvents) {
          analysis.issues.push(`⚠️ MISMATCH: ${predictionsFromEvents} events vs ${totalPredictions} in contract`);
          analysis.recommendations.push(`🔧 Verify totalPredictions count`);
        }

        if (correctPredictions > 0 && totalPredictions === 0) {
          analysis.issues.push(`❌ IMPOSSIBLE: correctPredictions (${correctPredictions}) but totalPredictions is 0`);
          analysis.recommendations.push(`🔧 Reset correctPredictions to 0`);
          inconsistentUsers.push(analysis);
        }

        if (analysis.issues.length === 0) {
          analysis.issues.push('✅ OK');
        }

        userAnalysis.push(analysis);

      } catch (error) {
        userAnalysis.push({
          address: userAddress,
          error: (error as Error).message,
          predictionsFromEvents: userMatchCounts.get(userAddress) || 0,
          issues: ['❌ Error fetching stats'],
          recommendations: ['🔧 Check contract connection']
        });
      }
    }

    // Sort by severity of issues
    userAnalysis.sort((a, b) => {
      const aIssues = a.issues?.filter(i => i.includes('❌')).length || 0;
      const bIssues = b.issues?.filter(i => i.includes('❌')).length || 0;
      return bIssues - aIssues;
    });

    return NextResponse.json({
      summary: {
        totalUsers: allUsers.size,
        inconsistentUsers: inconsistentUsers.length,
        criticalIssues: inconsistentUsers.filter(u => 
          u.issues?.some(i => i.includes('correctPredictions') && i.includes('totalPredictions'))
        ).length
      },
      
      criticalIssue: inconsistentUsers.length > 0
        ? `🚨 ${inconsistentUsers.length} users have impossible stats! Contract data is corrupted.`
        : '✅ All user stats are consistent',

      inconsistentUsers: inconsistentUsers,
      allUsers: userAnalysis,

      recommendations: [
        inconsistentUsers.length > 0 ? 
          `🚨 CRITICAL: ${inconsistentUsers.length} users have impossible stats. Contract needs data correction.` : null,
        inconsistentUsers.length > 0 ?
          `🔧 Consider deploying a new contract with proper data validation` : null,
        inconsistentUsers.length > 0 ?
          `🔧 Or implement a data migration function to fix existing data` : null
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('[FIX CONTRACT DATA] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message, stack: (error as Error).stack },
      { status: 500 }
    );
  }
}
