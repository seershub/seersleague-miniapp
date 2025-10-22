import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

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
    
    // Get user stats first (single call)
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

    // Fetch only recent events (last 2000 blocks ~1.5 hours)
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - 2000n;

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

    console.log(`[History] Found ${predictionEvents.length} recent events`);

    // Build simple history from events only (no contract calls)
    const history: PredictionHistoryEntry[] = [];
    
    for (const event of predictionEvents) {
      if (!event.args || !event.args.matchIds) continue;
      
      const matchIds = event.args.matchIds as bigint[];
      const block = await publicClient.getBlock({ blockNumber: event.blockNumber });
      
      for (const matchId of matchIds) {
        history.push({
          matchId: Number(matchId),
          matchName: `Match #${matchId}`,
          homeTeam: 'TBD',
          awayTeam: 'TBD',
          userPrediction: 0, // Will be filled by frontend if needed
          actualResult: null,
          isCorrect: null,
          timestamp: Number(block.timestamp)
        });
      }
    }

    // Sort by timestamp (newest first)
    history.sort((a, b) => b.timestamp - a.timestamp);

    console.log(`[History] Returning ${history.length} predictions`);

    return NextResponse.json({
      history: history.slice(0, 10), // Only return last 10
      cached: false,
      lastUpdated: new Date().toISOString(),
      note: 'Showing recent predictions from last 1.5 hours'
    });

  } catch (error) {
    console.error('Error fetching prediction history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prediction history' },
      { status: 500 }
    );
  }
}
