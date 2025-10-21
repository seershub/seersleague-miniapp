import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 10; // Keep it fast

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

    // Validate address format
    if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // Try to get cached history from KV first
    try {
      const cachedHistory = await kv.get<PredictionHistoryEntry[]>(`history:${address}`);
      
      if (cachedHistory && cachedHistory.length > 0) {
        console.log(`Returning cached history for ${address}: ${cachedHistory.length} entries`);
        return NextResponse.json({
          history: cachedHistory,
          cached: true,
          lastUpdated: await kv.get(`history:${address}:lastUpdated`)
        });
      }
    } catch (kvError) {
      console.log('KV cache error:', kvError);
    }

    // If no cache, fetch from blockchain events
    console.log(`Fetching history from blockchain for ${address}...`);
    
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const currentBlock = await publicClient.getBlockNumber();

    // Fetch PredictionsSubmitted events for this user
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
      args: {
        user: address
      },
      fromBlock: deploymentBlock > 0n ? deploymentBlock : currentBlock - 10000n,
      toBlock: 'latest'
    });

    // Fetch ResultRecorded events
    const resultEvents = await publicClient.getLogs({
      address: CONTRACTS.SEERSLEAGUE,
      event: {
        type: 'event',
        name: 'ResultRecorded',
        inputs: [
          { name: 'matchId', type: 'uint256', indexed: true },
          { name: 'outcome', type: 'uint8', indexed: false }
        ]
      },
      fromBlock: deploymentBlock > 0n ? deploymentBlock : currentBlock - 10000n,
      toBlock: 'latest'
    });

    // Create a map of match results
    const matchResults = new Map<number, number>();
    resultEvents.forEach(event => {
      if (event.args && event.args.matchId !== undefined && event.args.outcome !== undefined) {
        matchResults.set(Number(event.args.matchId), Number(event.args.outcome));
      }
    });

    // Build prediction history - only fetch recent predictions to stay fast
    const history: PredictionHistoryEntry[] = [];
    const uniqueMatchIds = new Set<number>();

    // Collect all unique match IDs from events
    for (const event of predictionEvents) {
      if (!event.args || !event.args.matchIds) continue;
      const matchIds = event.args.matchIds as bigint[];
      matchIds.forEach(id => uniqueMatchIds.add(Number(id)));
    }

    console.log(`Found ${uniqueMatchIds.size} unique matches`);

    // Limit to last 10 matches to avoid timeout
    const recentMatchIds = Array.from(uniqueMatchIds).slice(-10);
    console.log(`Processing ${recentMatchIds.length} recent matches...`);

    // Fetch predictions in parallel
    const predictionPromises = recentMatchIds.map(async (matchIdNum) => {
      try {
        const prediction = await publicClient.readContract({
          address: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'getUserPrediction',
          args: [address, BigInt(matchIdNum)]
        }) as unknown as { matchId: bigint; outcome: number; timestamp: bigint };

        const actualResult = matchResults.get(matchIdNum) || null;
        const isCorrect = actualResult !== null ? prediction.outcome === actualResult : null;

        // Get match details from KV
        let matchDetails = null;
        try {
          matchDetails = await kv.get<any>(`match:${matchIdNum}`);
        } catch (e) {
          console.log(`No match details for ${matchIdNum}`);
        }

        return {
          matchId: matchIdNum,
          matchName: matchDetails?.name || `Match #${matchIdNum}`,
          homeTeam: matchDetails?.homeTeam || 'Unknown',
          awayTeam: matchDetails?.awayTeam || 'Unknown',
          userPrediction: prediction.outcome,
          actualResult,
          isCorrect,
          timestamp: Number(prediction.timestamp)
        };
      } catch (error) {
        console.error(`Error fetching prediction for match ${matchIdNum}:`, error);
        return null;
      }
    });

    const results = await Promise.all(predictionPromises);
    results.forEach(r => r && history.push(r));

    // Sort by timestamp (newest first)
    history.sort((a, b) => b.timestamp - a.timestamp);

    // Cache the history in KV (expires in 5 minutes for faster updates)
    if (history.length > 0) {
      try {
        await kv.set(`history:${address}`, history, { ex: 300 });
        await kv.set(`history:${address}:lastUpdated`, new Date().toISOString(), { ex: 300 });
        console.log(`Cached ${history.length} predictions for ${address}`);
      } catch (cacheError) {
        console.error('Failed to cache history:', cacheError);
      }
    }

    return NextResponse.json({
      history,
      cached: false,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching prediction history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prediction history' },
      { status: 500 }
    );
  }
}
