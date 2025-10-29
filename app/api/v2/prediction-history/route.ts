import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS_V2, SEERSLEAGUE_V2_ABI } from '@/lib/contract-interactions-v2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface PredictionHistoryItem {
  matchId: string;
  predictedOutcome: number;
  actualOutcome: number;
  isProcessed: boolean;
  isCorrect: boolean;
  timestamp: number;
  startTime: number;
  startDate: string;
  homeScore?: number;
  awayScore?: number;
  status: 'pending' | 'correct' | 'incorrect' | 'not_processed';
}

/**
 * PREDICTION HISTORY API V2 - User's prediction history with results
 * 
 * Features:
 * - Shows all user predictions
 * - Real match results from contract
 * - Correct/incorrect status
 * - Pagination support
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('user');
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      );
    }

    console.log(`📊 [PREDICTION HISTORY V2] Fetching history for ${userAddress}`);

    // Get user's prediction history with results from contract
    const historyData = await publicClient.readContract({
      address: CONTRACTS_V2.SEERSLEAGUE,
      abi: SEERSLEAGUE_V2_ABI,
      functionName: 'getUserPredictionHistoryWithResults',
      args: [userAddress as `0x${string}`, BigInt(offset), BigInt(limit)]
    }) as {
      matchIds: bigint[];
      outcomes: number[];
      timestamps: bigint[];
      results: number[];
      matchResults: number[];
    };

    console.log(`[PREDICTION HISTORY V2] Found ${historyData.matchIds.length} predictions`);

    // Convert to display format
    const predictions: PredictionHistoryItem[] = [];

    for (let i = 0; i < historyData.matchIds.length; i++) {
      const matchId = historyData.matchIds[i];
      const predictedOutcome = historyData.outcomes[i];
      const timestamp = Number(historyData.timestamps[i]);
      const result = historyData.results[i];
      const actualOutcome = historyData.matchResults[i];

      // Get match details
      let matchInfo;
      try {
        matchInfo = await publicClient.readContract({
          address: CONTRACTS_V2.SEERSLEAGUE,
          abi: SEERSLEAGUE_V2_ABI,
          functionName: 'getMatch',
          args: [matchId]
        }) as {
          startTime: bigint;
          homeScore: bigint;
          awayScore: bigint;
          isRecorded: boolean;
          exists: boolean;
        };
      } catch (error) {
        console.error(`Error fetching match ${matchId}:`, error);
        continue;
      }

      const startTime = Number(matchInfo.startTime);
      const isProcessed = result !== 0;
      const isCorrect = result === 1;

      let status: 'pending' | 'correct' | 'incorrect' | 'not_processed';
      if (!isProcessed) {
        status = 'not_processed';
      } else if (isCorrect) {
        status = 'correct';
      } else {
        status = 'incorrect';
      }

      predictions.push({
        matchId: matchId.toString(),
        predictedOutcome,
        actualOutcome,
        isProcessed,
        isCorrect,
        timestamp,
        startTime,
        startDate: new Date(startTime * 1000).toISOString(),
        homeScore: matchInfo.isRecorded ? Number(matchInfo.homeScore) : undefined,
        awayScore: matchInfo.isRecorded ? Number(matchInfo.awayScore) : undefined,
        status
      });
    }

    // Sort by timestamp (most recent first)
    predictions.sort((a, b) => b.timestamp - a.timestamp);

    // Get user's detailed stats
    let userStats;
    try {
      userStats = await publicClient.readContract({
        address: CONTRACTS_V2.SEERSLEAGUE,
        abi: SEERSLEAGUE_V2_ABI,
        functionName: 'getUserDetailedStats',
        args: [userAddress as `0x${string}`]
      }) as {
        stats: {
          correctPredictions: bigint;
          totalPredictions: bigint;
          freePredictionsUsed: bigint;
          currentStreak: bigint;
          longestStreak: bigint;
          lastPredictionTime: bigint;
          totalFeesPaid: bigint;
        };
        accuracy: bigint;
        rank: bigint;
        recentPredictions: any[];
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      userStats = null;
    }

    console.log(`[PREDICTION HISTORY V2] Returning ${predictions.length} predictions`);

    return NextResponse.json({
      predictions,
      userStats: userStats ? {
        totalPredictions: Number(userStats.stats.totalPredictions),
        correctPredictions: Number(userStats.stats.correctPredictions),
        accuracy: Number(userStats.accuracy),
        currentStreak: Number(userStats.stats.currentStreak),
        longestStreak: Number(userStats.stats.longestStreak),
        freePredictionsUsed: Number(userStats.stats.freePredictionsUsed),
        totalFeesPaid: Number(userStats.stats.totalFeesPaid),
        lastPredictionTime: Number(userStats.stats.lastPredictionTime)
      } : null,
      pagination: {
        offset,
        limit,
        total: predictions.length,
        hasMore: predictions.length === limit
      },
      version: '2.0.0',
      features: [
        'Real match results',
        'Correct/incorrect status',
        'Detailed match info',
        'User statistics'
      ]
    });

  } catch (error) {
    console.error('[PREDICTION HISTORY V2] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message, version: '2.0.0' },
      { status: 500 }
    );
  }
}
