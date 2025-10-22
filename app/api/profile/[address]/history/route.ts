import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 10; // Vercel Hobby plan max

interface PredictionHistoryEntry {
  matchId: number;
  matchName: string;
  userPrediction: number;
  actualResult: number | null;
  isCorrect: boolean | null;
  timestamp: number;
  homeTeam: string;
  awayTeam: string;
}

interface MatchInfo {
  id: bigint;
  startTime: bigint;
  homeScore: bigint;
  awayScore: bigint;
  isRecorded: boolean;
  exists: boolean;
}

export async function GET(
  request: Request,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address.toLowerCase() as `0x${string}`;

    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    console.log(`[History] Fetching for ${address}`);

    // Get user stats first
    const stats = await publicClient.readContract({
      address: CONTRACTS.SEERSLEAGUE,
      abi: SEERSLEAGUE_ABI,
      functionName: 'getUserStats',
      args: [address]
    }) as unknown as {
      correctPredictions: bigint;
      totalPredictions: bigint;
      freePredictionsUsed: bigint;
      currentStreak: bigint;
      longestStreak: bigint;
    };

    const totalPredictions = Number(stats.totalPredictions);
    console.log(`[History] User has ${totalPredictions} total predictions`);

    if (totalPredictions === 0) {
      return NextResponse.json({
        history: [],
        cached: false,
        lastUpdated: new Date().toISOString()
      });
    }

    // Fetch recent events only (last 50000 blocks ~7 days on Base)
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - 50000n;

    console.log(`[History] Fetching events from block ${fromBlock} to ${currentBlock}`);

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
      args: { user: address },
      fromBlock,
      toBlock: 'latest'
    });

    console.log(`[History] Found ${predictionEvents.length} prediction events`);

    // Build history with complete data
    const history: PredictionHistoryEntry[] = [];
    const processedMatches = new Set<string>(); // Avoid duplicates

    for (const event of predictionEvents) {
      if (!event.args || !event.args.matchIds) continue;

      const matchIds = event.args.matchIds as bigint[];
      const block = await publicClient.getBlock({ blockNumber: event.blockNumber });

      for (const matchId of matchIds) {
        const matchIdStr = `${matchId}-${event.blockNumber}`;
        if (processedMatches.has(matchIdStr)) continue;
        processedMatches.add(matchIdStr);

        try {
          // Fetch user's prediction for this match
          const userPrediction = await publicClient.readContract({
            address: CONTRACTS.SEERSLEAGUE,
            abi: SEERSLEAGUE_ABI,
            functionName: 'getUserPrediction',
            args: [address, matchId]
          }) as unknown as bigint;

          // Fetch match info
          const matchInfo = await publicClient.readContract({
            address: CONTRACTS.SEERSLEAGUE,
            abi: SEERSLEAGUE_ABI,
            functionName: 'getMatch',
            args: [matchId]
          }) as unknown as MatchInfo;

          const predictionNum = Number(userPrediction);

          // Calculate outcome from scores (1=Home Win, 2=Draw, 3=Away Win)
          let outcomeNum: number | null = null;
          if (matchInfo.isRecorded) {
            const homeScore = Number(matchInfo.homeScore);
            const awayScore = Number(matchInfo.awayScore);
            if (homeScore > awayScore) {
              outcomeNum = 1; // Home win
            } else if (homeScore === awayScore) {
              outcomeNum = 2; // Draw
            } else {
              outcomeNum = 3; // Away win
            }
          }

          // Determine correctness
          let isCorrect: boolean | null = null;
          if (matchInfo.isRecorded && predictionNum > 0 && outcomeNum !== null) {
            isCorrect = predictionNum === outcomeNum;
          }

          // Use match ID as identifier (team names can be fetched by frontend if needed)
          const homeTeam = `Team ${matchId}A`;
          const awayTeam = `Team ${matchId}B`;

          history.push({
            matchId: Number(matchId),
            matchName: `${homeTeam} vs ${awayTeam}`,
            homeTeam,
            awayTeam,
            userPrediction: predictionNum,
            actualResult: outcomeNum,
            isCorrect: isCorrect,
            timestamp: Number(block.timestamp)
          });

        } catch (error) {
          console.error(`[History] Error fetching details for match ${matchId}:`, error);

          // Fallback with minimal data
          history.push({
            matchId: Number(matchId),
            matchName: `Match #${matchId}`,
            homeTeam: 'Unknown',
            awayTeam: 'Unknown',
            userPrediction: 0,
            actualResult: null,
            isCorrect: null,
            timestamp: Number(block.timestamp)
          });
        }
      }
    }

    // Sort by timestamp (newest first)
    history.sort((a, b) => b.timestamp - a.timestamp);

    console.log(`[History] Returning ${history.length} predictions`);

    return NextResponse.json({
      history: history.slice(0, 50), // Return last 50 predictions
      total: history.length,
      cached: false,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching prediction history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prediction history', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
