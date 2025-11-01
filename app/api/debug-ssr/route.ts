import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS } from '@/lib/contract-interactions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Debug SSR - Test NEW blockchain-direct fetching
 * SSR no longer uses API calls, fetches directly from blockchain
 */
export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    vercelUrl: process.env.VERCEL_URL || 'NOT SET',
    nodeEnv: process.env.NODE_ENV,
    deployment: process.env.VERCEL ? 'Vercel' : 'Local',
    deploymentBlock: process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || 'NOT SET',
    footballApiKey: process.env.FOOTBALL_DATA_API_KEY ? 'SET ✅' : 'NOT SET ❌'
  };

  // Test NEW SSR logic - Direct blockchain fetch
  let blockchainTest = null;
  try {
    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 100000n;

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
    const upcoming = events
      .filter((e): e is typeof e & { args: { matchId: bigint; startTime: bigint } } =>
        Boolean(e.args?.matchId && e.args?.startTime)
      )
      .map(e => ({
        matchId: e.args.matchId.toString(),
        startTime: Number(e.args.startTime)
      }))
      .filter(m => m.startTime > now);

    blockchainTest = {
      success: true,
      currentBlock: currentBlock.toString(),
      scannedFrom: fromBlock.toString(),
      totalEvents: events.length,
      upcomingMatches: upcoming.length,
      sampleMatchIds: upcoming.slice(0, 3).map(m => m.matchId)
    };
  } catch (error) {
    blockchainTest = {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  // Verdict
  const ssrWillWork = blockchainTest?.success && (blockchainTest?.upcomingMatches ?? 0) > 0;

  return NextResponse.json({
    diagnostics,
    blockchainDirectFetch: blockchainTest,
    verdict: ssrWillWork
      ? `✅ NEW SSR WORKING! Found ${blockchainTest?.upcomingMatches} matches from blockchain`
      : '❌ SSR WILL FAIL - Blockchain fetch failed or no matches found',
    note: 'SSR now fetches DIRECTLY from blockchain (no API dependency)',
    deployment: {
      latestCommit: '9cfcf6b - TypeScript fix',
      expectedBehavior: 'SSR should bypass API completely and fetch from blockchain'
    }
  });
}
