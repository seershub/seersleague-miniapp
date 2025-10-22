import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';

/**
 * Test endpoint - directly read from contract, no cache
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address') as `0x${string}`;

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    console.log(`[Test] Reading stats for ${address}`);

    // Direct contract read
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

    // Get current block for reference
    const currentBlock = await publicClient.getBlockNumber();

    // Count events to verify
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
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
      fromBlock: deploymentBlock > 0n ? deploymentBlock : currentBlock - 10000n,
      toBlock: 'latest'
    });

    // Count total predictions from events
    let totalFromEvents = 0;
    const matchIds: number[] = [];
    predictionEvents.forEach(event => {
      if (event.args && event.args.matchIds) {
        const ids = event.args.matchIds as bigint[];
        totalFromEvents += ids.length;
        ids.forEach(id => matchIds.push(Number(id)));
      }
    });

    return NextResponse.json({
      address,
      currentBlock: currentBlock.toString(),
      contractStats: {
        correctPredictions: Number(stats.correctPredictions),
        totalPredictions: Number(stats.totalPredictions),
        freePredictionsUsed: Number(stats.freePredictionsUsed),
        currentStreak: Number(stats.currentStreak),
        longestStreak: Number(stats.longestStreak)
      },
      eventsAnalysis: {
        eventsCount: predictionEvents.length,
        totalPredictionsFromEvents: totalFromEvents,
        matchIds: matchIds,
        uniqueMatches: [...new Set(matchIds)].length
      },
      comparison: {
        match: Number(stats.totalPredictions) === totalFromEvents,
        difference: Number(stats.totalPredictions) - totalFromEvents
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Test] Error:', error);
    return NextResponse.json(
      { error: 'Test failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
