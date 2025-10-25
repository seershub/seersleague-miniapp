import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const txHash = searchParams.get('hash') || '0x6ec85802bd32c68d85e957b95b1556e687f818ad0d51b32c053366551e7bc65e';

  try {
    // Get transaction receipt
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`
    });

    // Get transaction details
    const tx = await publicClient.getTransaction({
      hash: txHash as `0x${string}`
    });

    // Check some user stats after this transaction
    const testUsers = [
      '0x2f8b89f74c0540b638cf808515dfabe565796aaa',
      '0x95ac688bd952d5708466463255dcbec10d50ca74',
      '0xbb26d3292b4ffd690c045dfa775731d03941b9cb'
    ];

    const userStatsAfterTx = await Promise.all(
      testUsers.map(async (address) => {
        const stats = await publicClient.readContract({
          address: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'getUserStats',
          args: [address as `0x${string}`]
        }) as any;

        return {
          address,
          correctPredictions: Number(stats.correctPredictions || 0),
          totalPredictions: Number(stats.totalPredictions || 0),
          accuracy: Number(stats.totalPredictions) > 0
            ? Math.round((Number(stats.correctPredictions) / Number(stats.totalPredictions)) * 100)
            : 0
        };
      })
    );

    return NextResponse.json({
      transaction: {
        hash: txHash,
        status: receipt.status,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        to: tx.to,
        from: tx.from,
        input: tx.input.slice(0, 10), // First 4 bytes = function selector
        logsCount: receipt.logs.length
      },
      logs: receipt.logs.map(log => ({
        address: log.address,
        topics: log.topics,
        data: log.data.slice(0, 66) // First 32 bytes
      })),
      userStatsAfterTx,
      conclusion: receipt.status === 'success'
        ? '✅ Transaction successful - check if user stats updated'
        : '❌ Transaction failed'
    });

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      txHash
    }, { status: 500 });
  }
}
