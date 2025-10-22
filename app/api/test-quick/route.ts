import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 5;

/**
 * Quick RPC test - single blockchain call
 */
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  // Test 1: Get current block (fastest RPC call)
  try {
    const startTime = Date.now();
    const blockNumber = await publicClient.getBlockNumber();
    const duration = Date.now() - startTime;

    results.tests.blockNumber = {
      status: 'success',
      block: blockNumber.toString(),
      duration: `${duration}ms`
    };
  } catch (error) {
    results.tests.blockNumber = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Test 2: Contract address check
  results.tests.contractAddress = {
    seersLeague: CONTRACTS.SEERSLEAGUE || '❌ NOT SET',
    usdc: CONTRACTS.USDC || '❌ NOT SET'
  };

  return NextResponse.json(results, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
