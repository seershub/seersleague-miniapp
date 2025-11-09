import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Debug endpoint to see why no matches are showing
 */
export async function GET() {
  try {
    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const matchDeploymentBlock = BigInt(process.env.NEXT_PUBLIC_MATCH_DEPLOYMENT_BLOCK || process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');

    const now = Math.floor(Date.now() / 1000);
    const nowDate = new Date(now * 1000).toISOString();

    console.log(`[Debug Matches] Current time: ${nowDate}`);
    console.log(`[Debug Matches] Current block: ${currentBlock}`);
    console.log(`[Debug Matches] Deployment block: ${deploymentBlock}`);
    console.log(`[Debug Matches] Match deployment block: ${matchDeploymentBlock}`);

    // Determine which block to use
    const maxBlockRange = 100000n;
    let fromBlock: bigint;

    if (matchDeploymentBlock > 0n) {
      fromBlock = matchDeploymentBlock;
    } else {
      fromBlock = currentBlock - maxBlockRange;
    }

    console.log(`[Debug Matches] Scanning from block: ${fromBlock}`);

    // Fetch all MatchRegistered events
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

    console.log(`[Debug Matches] Found ${events.length} total MatchRegistered events`);

    // Process events
    const matches = events
      .filter((e): e is typeof e & { args: { matchId: bigint; startTime: bigint } } =>
        Boolean(e.args?.matchId && e.args?.startTime)
      )
      .map(e => ({
        matchId: e.args.matchId.toString(),
        startTime: Number(e.args.startTime),
        startTimeDate: new Date(Number(e.args.startTime) * 1000).toISOString(),
        isUpcoming: Number(e.args.startTime) > now,
        hoursUntilStart: (Number(e.args.startTime) - now) / 3600,
        blockNumber: e.blockNumber?.toString()
      }))
      .sort((a, b) => a.startTime - b.startTime);

    const upcomingMatches = matches.filter(m => m.isUpcoming);
    const pastMatches = matches.filter(m => !m.isUpcoming);

    return NextResponse.json({
      success: true,
      currentTime: nowDate,
      currentTimeUnix: now,
      currentBlock: currentBlock.toString(),
      deploymentBlock: deploymentBlock.toString(),
      matchDeploymentBlock: matchDeploymentBlock.toString(),
      fromBlock: fromBlock.toString(),
      blockRange: (currentBlock - fromBlock).toString(),
      summary: {
        totalMatches: matches.length,
        upcomingMatches: upcomingMatches.length,
        pastMatches: pastMatches.length
      },
      upcomingMatches: upcomingMatches.slice(0, 10),
      pastMatches: pastMatches.slice(-10), // Last 10 past matches
      diagnosis: {
        noMatchesReason: matches.length === 0
          ? '❌ No MatchRegistered events found in blockchain. Need to register new matches!'
          : upcomingMatches.length === 0
          ? '⚠️ All registered matches have already started. Need to register NEW upcoming matches!'
          : `✅ Found ${upcomingMatches.length} upcoming matches`,
        recommendation: matches.length === 0
          ? 'Run /api/batch-register-matches to register new matches'
          : upcomingMatches.length === 0
          ? 'Register new matches with future start times using /api/batch-register-matches'
          : `Frontend should display ${upcomingMatches.length} matches. Check client-side code.`,
        nextMatchInfo: upcomingMatches.length > 0
          ? {
              matchId: upcomingMatches[0].matchId,
              startTime: upcomingMatches[0].startTimeDate,
              hoursUntilStart: upcomingMatches[0].hoursUntilStart.toFixed(2)
            }
          : null
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
