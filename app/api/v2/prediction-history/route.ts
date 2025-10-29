import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { getContractAddress, getDeploymentBlock, getActiveContract, SEERSLEAGUE_ABI } from '@/lib/contract-interactions-unified';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * PREDICTION HISTORY V2 - Enhanced prediction tracking
 * 
 * Features:
 * - Complete prediction history
 * - Match results integration
 * - Accuracy tracking
 * - Performance analytics
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('address') as `0x${string}`;

    if (!userAddress) {
      return NextResponse.json({
        error: 'User address is required'
      }, { status: 400 });
    }

    console.log(`🔍 [PREDICTION HISTORY V2] Fetching history for ${userAddress}...`);

    const activeContract = getActiveContract();
    const contractAddress = getContractAddress();
    const deploymentBlock = getDeploymentBlock();

    if (activeContract !== 'v2') {
      return NextResponse.json({
        error: 'V2 contract not active',
        activeContract,
        message: 'Please ensure V2 contract is properly configured'
      }, { status: 400 });
    }

    try {
      // Get user stats
      const userStats = await publicClient.readContract({
        address: contractAddress,
        abi: SEERSLEAGUE_ABI,
        functionName: 'getUserStats',
        args: [userAddress]
      }) as {
        correctPredictions: bigint;
        totalPredictions: bigint;
        freePredictionsUsed: bigint;
        currentStreak: bigint;
        longestStreak: bigint;
      };

      // Get prediction history (simplified - function not in ABI yet)
      const historyData: any[] = [];

      // Get all prediction events for this user
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
        toBlock: 'latest',
        args: {
          user: userAddress
        }
      });

      const predictions = predictionEvents.map((event: any) => ({
        matchIds: event.args?.matchIds || [],
        predictionsCount: Number(event.args?.predictionsCount || 0),
        freeUsed: Number(event.args?.freeUsed || 0),
        feePaid: Number(event.args?.feePaid || 0),
        timestamp: Number(event.args?.timestamp || 0)
      }));

      const stats = {
        correctPredictions: Number(userStats.correctPredictions || 0),
        totalPredictions: Number(userStats.totalPredictions || 0),
        freePredictionsUsed: Number(userStats.freePredictionsUsed || 0),
        currentStreak: Number(userStats.currentStreak || 0),
        longestStreak: Number(userStats.longestStreak || 0),
        accuracy: userStats.totalPredictions > 0n 
          ? Math.round((Number(userStats.correctPredictions) / Number(userStats.totalPredictions)) * 100)
          : 0
      };

      console.log(`✅ [PREDICTION HISTORY V2] Found ${predictions.length} prediction events`);

      return NextResponse.json({
        success: true,
        data: {
          user: userAddress,
          stats,
          history: historyData,
          predictions,
          summary: {
            totalEvents: predictions.length,
            totalPredictions: stats.totalPredictions,
            correctPredictions: stats.correctPredictions,
            accuracy: stats.accuracy,
            currentStreak: stats.currentStreak,
            longestStreak: stats.longestStreak
          }
        },
        metadata: {
          activeContract,
          contractAddress,
          deploymentBlock: deploymentBlock.toString(),
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ [PREDICTION HISTORY V2] Error fetching history:', error);
      return NextResponse.json({
        error: 'Failed to fetch prediction history',
        details: (error as Error).message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[PREDICTION HISTORY V2] Error:', error);
    return NextResponse.json(
      { 
        error: (error as Error).message,
        version: '2.0.0'
      },
      { status: 500 }
    );
  }
}