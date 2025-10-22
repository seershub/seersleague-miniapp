import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
  homeTeam: string;
  awayTeam: string;
  startTime: bigint;
  outcome: bigint;
  isFinalized: boolean;
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

    // Fetch ALL events from deployment block
    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 100000n;

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
          const outcomeNum = Number(matchInfo.outcome);

          // Determine correctness
          let isCorrect: boolean | null = null;
          if (matchInfo.isFinalized && predictionNum > 0) {
            isCorrect = predictionNum === outcomeNum;
          }

          history.push({
            matchId: Number(matchId),
            matchName: `${matchInfo.homeTeam} vs ${matchInfo.awayTeam}`,
            homeTeam: matchInfo.homeTeam,
            awayTeam: matchInfo.awayTeam,
            userPrediction: predictionNum,
            actualResult: matchInfo.isFinalized ? outcomeNum : null,
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
