/**
 * Health check endpoint for matches system
 * Monitors: blockchain connection, API availability, match count
 */

import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  const checks: any = {
    timestamp: new Date().toISOString(),
    status: 'unknown',
    blockchain: {},
    api: {},
    matches: {},
    issues: [],
  };

  try {
    // 1. Blockchain Health
    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 100000n;

    checks.blockchain = {
      status: '✅ Connected',
      currentBlock: currentBlock.toString(),
      contractAddress: CONTRACTS.SEERSLEAGUE,
      scanRange: `${fromBlock} to ${currentBlock}`,
    };

    // 2. Fetch Match Count from Blockchain
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
      fromBlock,
      toBlock: 'latest'
    });

    const now = Math.floor(Date.now() / 1000);
    const upcoming = events.filter((e: any) =>
      e.args?.startTime && Number(e.args.startTime) > now
    );

    checks.matches = {
      total: events.length,
      upcoming: upcoming.length,
      started: events.length - upcoming.length,
    };

    // 3. Check Football API
    const footballApiKey = process.env.FOOTBALL_DATA_API_KEY;
    checks.api = {
      football_api_key: footballApiKey ? '✅ Set' : '❌ Missing',
    };

    // 4. Detect Issues
    if (upcoming.length === 0) {
      checks.issues.push({
        severity: 'ERROR',
        message: 'No upcoming matches in blockchain',
        action: 'Run POST /api/batch-register-matches?days=7',
      });
    }

    if (!footballApiKey) {
      checks.issues.push({
        severity: 'WARNING',
        message: 'Football API key missing',
        action: 'Set FOOTBALL_DATA_API_KEY in Vercel env vars',
      });
    }

    // 5. Overall Status
    if (checks.issues.some((i: any) => i.severity === 'ERROR')) {
      checks.status = '❌ UNHEALTHY';
    } else if (checks.issues.length > 0) {
      checks.status = '⚠️ WARNING';
    } else {
      checks.status = '✅ HEALTHY';
    }

    return NextResponse.json(checks);

  } catch (error) {
    checks.status = '❌ ERROR';
    checks.error = error instanceof Error ? error.message : String(error);
    checks.issues.push({
      severity: 'CRITICAL',
      message: 'Health check failed',
      details: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(checks, { status: 500 });
  }
}
