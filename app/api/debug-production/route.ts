import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI, USDC_ABI } from '@/lib/contract-interactions';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

/**
 * Comprehensive production debug endpoint
 * Visit: https://league.seershub.com/api/debug-production
 */
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    checks: {}
  };

  // 1. Environment Variables Check
  results.checks.environmentVariables = {
    status: 'checking',
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || 'MISSING',
    NEXT_PUBLIC_CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 'MISSING',
    NEXT_PUBLIC_USDC_ADDRESS: process.env.NEXT_PUBLIC_USDC_ADDRESS || 'MISSING',
    NEXT_PUBLIC_DEPLOYMENT_BLOCK: process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || 'MISSING',
    NEXT_PUBLIC_BASE_RPC: process.env.NEXT_PUBLIC_BASE_RPC ? 'SET' : 'MISSING',
    FOOTBALL_DATA_API_KEY: process.env.FOOTBALL_DATA_API_KEY ? 'SET' : 'MISSING',
    KV_REST_API_URL: process.env.KV_REST_API_URL ? 'SET' : 'MISSING',
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? 'SET' : 'MISSING'
  };

  // 2. RPC Connection Check
  try {
    const blockNumber = await publicClient.getBlockNumber();
    results.checks.rpcConnection = {
      status: 'success',
      currentBlock: blockNumber.toString(),
      message: 'Successfully connected to Base RPC'
    };
  } catch (error) {
    results.checks.rpcConnection = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 3. Contract Access Check
  try {
    const matchInfo = await publicClient.readContract({
      address: CONTRACTS.SEERSLEAGUE,
      abi: SEERSLEAGUE_ABI,
      functionName: 'getMatch',
      args: [BigInt(1)]
    });
    results.checks.contractAccess = {
      status: 'success',
      contractAddress: CONTRACTS.SEERSLEAGUE,
      message: 'Successfully read from contract'
    };
  } catch (error) {
    results.checks.contractAccess = {
      status: 'error',
      contractAddress: CONTRACTS.SEERSLEAGUE,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 4. USDC Contract Check
  try {
    const usdcName = await publicClient.readContract({
      address: CONTRACTS.USDC,
      abi: USDC_ABI,
      functionName: 'name',
      args: []
    });
    results.checks.usdcContract = {
      status: 'success',
      contractAddress: CONTRACTS.USDC,
      tokenName: usdcName,
      message: 'USDC contract accessible'
    };
  } catch (error) {
    results.checks.usdcContract = {
      status: 'error',
      contractAddress: CONTRACTS.USDC,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 5. KV Store Check
  try {
    await kv.set('debug:test', Date.now());
    const testValue = await kv.get('debug:test');
    results.checks.kvStore = {
      status: 'success',
      message: 'KV store read/write working',
      testValue
    };
  } catch (error) {
    results.checks.kvStore = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 6. Football-data API Check
  try {
    const response = await fetch('https://api.football-data.org/v4/competitions', {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY || '' }
    });
    results.checks.footballDataAPI = {
      status: response.ok ? 'success' : 'error',
      statusCode: response.status,
      message: response.ok ? 'API accessible' : 'API returned error'
    };
  } catch (error) {
    results.checks.footballDataAPI = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // 7. Check deployed matches
  try {
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const currentBlock = await publicClient.getBlockNumber();

    const events = await publicClient.getLogs({
      address: CONTRACTS.SEERSLEAGUE,
      event: {
        type: 'event',
        name: 'MatchRegistered',
        inputs: [
          { name: 'matchId', type: 'uint256', indexed: true },
          { name: 'startTime', type: 'uint256', indexed: false }
        ]
      },
      fromBlock: deploymentBlock > 0n ? deploymentBlock : currentBlock - 10000n,
      toBlock: 'latest'
    });

    results.checks.registeredMatches = {
      status: 'success',
      totalMatches: events.length,
      message: `Found ${events.length} registered matches`
    };
  } catch (error) {
    results.checks.registeredMatches = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }

  // Summary
  const failedChecks = Object.values(results.checks).filter((check: any) => check.status === 'error').length;
  const totalChecks = Object.keys(results.checks).length;

  results.summary = {
    totalChecks,
    passedChecks: totalChecks - failedChecks,
    failedChecks,
    overallStatus: failedChecks === 0 ? 'HEALTHY' : failedChecks < totalChecks ? 'DEGRADED' : 'CRITICAL'
  };

  return NextResponse.json(results, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
