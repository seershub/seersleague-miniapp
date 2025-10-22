import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Debug endpoint - shows raw blockchain data
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address')?.toLowerCase() as `0x${string}`;

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    console.log(`[Debug] Fetching data for ${address}`);

    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const currentBlock = await publicClient.getBlockNumber();

    // Fetch PredictionsSubmitted events
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

    console.log(`[Debug] Found ${predictionEvents.length} events`);

    // Extract all match IDs
    const allMatchIds: number[] = [];
    predictionEvents.forEach(event => {
      if (event.args && event.args.matchIds) {
        const matchIds = event.args.matchIds as bigint[];
        matchIds.forEach(id => allMatchIds.push(Number(id)));
      }
    });

    console.log(`[Debug] Match IDs: ${allMatchIds.join(', ')}`);

    // Fetch user stats
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

    // Fetch predictions for each match
    const predictions = [];
    for (const matchId of allMatchIds) {
      try {
        const prediction = await publicClient.readContract({
          address: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'getUserPrediction',
          args: [address, BigInt(matchId)]
        }) as unknown as { matchId: bigint; outcome: number; timestamp: bigint };

        predictions.push({
          matchId,
          outcome: prediction.outcome,
          timestamp: Number(prediction.timestamp),
          date: new Date(Number(prediction.timestamp) * 1000).toISOString()
        });
      } catch (err) {
        console.error(`Error fetching prediction for match ${matchId}:`, err);
      }
    }

    return NextResponse.json({
      address,
      stats: {
        total: Number(stats.totalPredictions),
        correct: Number(stats.correctPredictions),
        free: Number(stats.freePredictionsUsed)
      },
      events: predictionEvents.length,
      matchIds: allMatchIds,
      predictions: predictions.sort((a, b) => b.timestamp - a.timestamp),
      currentBlock: currentBlock.toString(),
      deploymentBlock: deploymentBlock.toString()
    });

  } catch (error) {
    console.error('[Debug] Error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
