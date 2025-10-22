import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Simple test endpoint to debug history issues
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = (searchParams.get('address') || '0x2F8b89f74C0540B638CF808515dFabe565796aAA').toLowerCase() as `0x${string}`;

    console.log('[Test] Testing history for:', address);

    // Step 1: Get current block
    const currentBlock = await publicClient.getBlockNumber();
    console.log('[Test] Current block:', currentBlock.toString());

    // Step 2: Get user stats
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

    console.log('[Test] User stats:', {
      total: Number(stats.totalPredictions),
      correct: Number(stats.correctPredictions)
    });

    // Step 3: Try to fetch events (2000 blocks)
    const fromBlock = currentBlock - 2000n;
    console.log('[Test] Fetching events from block:', fromBlock.toString());

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

    console.log('[Test] Found events:', predictionEvents.length);

    return NextResponse.json({
      success: true,
      address,
      currentBlock: currentBlock.toString(),
      fromBlock: fromBlock.toString(),
      blockRange: 2000,
      stats: {
        total: Number(stats.totalPredictions),
        correct: Number(stats.correctPredictions),
        free: Number(stats.freePredictionsUsed)
      },
      eventsFound: predictionEvents.length,
      events: predictionEvents.map(e => ({
        blockNumber: e.blockNumber.toString(),
        matchIds: (e.args?.matchIds as bigint[])?.map(id => id.toString()) || []
      }))
    });

  } catch (error) {
    console.error('[Test] Error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed', 
        message: error instanceof Error ? error.message : 'Unknown',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
