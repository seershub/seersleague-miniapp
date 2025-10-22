import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

/**
 * ULTRA MINIMAL TEST: Just 1 RPC call
 *
 * If this times out → RPC connection problem
 * If this works → Too much data / need Vercel Pro
 */
export async function GET() {
  const start = Date.now();

  try {
    // Single RPC call - should be instant
    const blockNumber = await publicClient.getBlockNumber();
    const elapsed = Date.now() - start;

    return NextResponse.json({
      success: true,
      blockNumber: blockNumber.toString(),
      responseTime: `${elapsed}ms`,
      message: elapsed < 1000
        ? '✅ RPC is fast! Problem is too much data - UPGRADE TO VERCEL PRO'
        : '⚠️ RPC is slow - check Alchemy API key',
      vercelProNeeded: elapsed < 1000,
      recommendation: elapsed < 1000
        ? 'Your blockchain calls work fine. The timeout happens because you have too much data to process in 10s. Vercel Pro (60s timeout) will solve this 100%.'
        : 'RPC is slow. Add Alchemy API key or upgrade to Vercel Pro for more time.'
    });

  } catch (error) {
    const elapsed = Date.now() - start;
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown',
      responseTime: `${elapsed}ms`,
      message: '❌ RPC connection failed'
    }, { status: 500 });
  }
}
