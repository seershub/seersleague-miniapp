/**
 * Quick debug endpoint to check why matches are not showing
 */

import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 100000n;

    console.log(`Scanning from block ${fromBlock} to ${currentBlock}`);

    // Fetch MatchRegistered events
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

    const allMatches = events
      .filter((e): e is typeof e & { args: { matchId: bigint; startTime: bigint } } =>
        Boolean(e.args?.matchId && e.args?.startTime)
      )
      .map(e => ({
        matchId: e.args.matchId.toString(),
        startTime: Number(e.args.startTime),
        startDate: new Date(Number(e.args.startTime) * 1000).toISOString(),
        hasStarted: Number(e.args.startTime) < now,
        timeUntilStart: Number(e.args.startTime) - now
      }));

    const upcoming = allMatches.filter(m => !m.hasStarted);
    const started = allMatches.filter(m => m.hasStarted);

    return NextResponse.json({
      status: {
        blockchain: '✅ Connected',
        contract: CONTRACTS.SEERSLEAGUE,
        currentBlock: currentBlock.toString(),
        deploymentBlock: deploymentBlock.toString(),
        scanRange: `${fromBlock} to ${currentBlock}`,
      },
      matches: {
        total: allMatches.length,
        upcoming: upcoming.length,
        started: started.length,
      },
      upcomingMatches: upcoming.slice(0, 10),
      startedMatches: started.slice(0, 5),
      diagnosis: {
        problem: upcoming.length === 0 ? '❌ NO UPCOMING MATCHES' : '✅ Matches found',
        solution: upcoming.length === 0
          ? 'Run: POST /api/batch-register-matches?days=7 to register new matches'
          : 'Matches are registered and upcoming. Check frontend.',
        nextSteps: upcoming.length === 0
          ? [
              '1. Go to Vercel Dashboard',
              '2. Open your project',
              '3. Go to Deployments → Latest → Function Logs',
              '4. Manually call: curl -X POST https://league.seershub.com/api/batch-register-matches?days=7',
              '5. Or use admin panel if you have one'
            ]
          : ['Frontend should be showing matches. Check browser console for errors.']
      }
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to diagnose',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
