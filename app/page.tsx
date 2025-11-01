import { Match } from '@/lib/matches';
import Home from './page-client';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS } from '@/lib/contract-interactions';

// CRITICAL: Force dynamic rendering - disable Next.js page cache
export const dynamic = 'force-dynamic';
export const revalidate = 0; // Never cache, always fresh

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

/**
 * Fetch matches DIRECTLY from blockchain (no API call to avoid VERCEL_URL issues)
 * This ensures SSR always works and provides stable embedded matches
 */
async function fetchMatchesServer(): Promise<Match[]> {
  const timestamp = new Date().toISOString();
  console.log(`\n=== SSR: FETCHING MATCHES (${timestamp}) ===`);
  console.log('[SSR] DYNAMIC RENDERING ENABLED - Fresh data on every request');

  // CRITICAL FIX: Multi-layered approach with retries and safer block range
  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
    try {
      const currentBlock = await publicClient.getBlockNumber();

      // CRITICAL: Use separate deployment block for matches vs leaderboard
      // Leaderboard needs ALL users from contract start (37043123)
      // Matches only needs RECENT valid matches to avoid old test data
      const matchDeploymentBlock = BigInt(process.env.NEXT_PUBLIC_MATCH_DEPLOYMENT_BLOCK || '0');
      const leaderboardDeploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
      const deploymentBlock = matchDeploymentBlock > 0n ? matchDeploymentBlock : leaderboardDeploymentBlock;

      // CRITICAL FIX: Limit block range to prevent timeout
      // Max 100K blocks (~8 days) to get valid matches while avoiding old test data
      const maxBlockRange = 100000n;
      let fromBlock: bigint;

      if (deploymentBlock > 0n) {
        const blockSource = matchDeploymentBlock > 0n ? 'NEXT_PUBLIC_MATCH_DEPLOYMENT_BLOCK' : 'NEXT_PUBLIC_DEPLOYMENT_BLOCK';
        fromBlock = deploymentBlock;
        console.log(`[SSR] Using ${blockSource}: ${fromBlock}`);
      } else {
        fromBlock = currentBlock - maxBlockRange;
        console.warn(`⚠️ [SSR] No deployment block set! Using last ${maxBlockRange} blocks (~8 days)`);
        console.warn(`⚠️ [SSR] Set NEXT_PUBLIC_MATCH_DEPLOYMENT_BLOCK in Vercel to avoid old test matches`);
      }

      const blockRange = currentBlock - fromBlock;
      console.log(`[SSR] Scanning blocks ${fromBlock} to ${currentBlock} (${blockRange} blocks)`);

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

      // Filter to upcoming matches only
      const upcoming = events
        .filter((e): e is typeof e & { args: { matchId: bigint; startTime: bigint } } =>
          Boolean(e.args?.matchId && e.args?.startTime)
        )
        .map(e => ({
          matchId: e.args.matchId.toString(),
          startTime: Number(e.args.startTime)
        }))
        .filter(m => m.startTime > now)
        .sort((a, b) => a.startTime - b.startTime)
        .slice(0, 20); // Take first 20

      console.log(`✅ [SSR] Found ${events.length} total events, ${upcoming.length} upcoming matches`);

      if (upcoming.length === 0) {
        console.warn('⚠️ [SSR] No upcoming matches found in blockchain');
        console.warn('[SSR] Possible reasons: 1) No matches registered, 2) All matches started, 3) Wrong contract address');
        return [];
      }

      // FAST SSR: Return basic match data immediately (no Football API enrichment)
      // This ensures SSR completes quickly and matches are always embedded
      const matches = upcoming.map(match => ({
        id: match.matchId,
        homeTeam: `Match ${match.matchId}`, // Will be enriched client-side
        awayTeam: 'vs TBD',
        league: 'Football',
        kickoff: new Date(match.startTime * 1000).toISOString(),
        venue: 'TBA',
        homeTeamBadge: '/default-badge.svg',
        awayTeamBadge: '/default-badge.svg',
        status: 'Not Started' as const
      }));

      console.log(`✅ [SSR] Returning ${matches.length} matches (basic data - fast!)`);
      console.log(`[SSR] Client will enrich with team names in background\n`);

      return matches;

    } catch (error) {
      retryCount++;
      const isLastRetry = retryCount >= maxRetries;

      console.error(`❌ [SSR] Error fetching matches (attempt ${retryCount}/${maxRetries}):`, error);

      if (!isLastRetry) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, retryCount - 1) * 1000;
        console.log(`[SSR] Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      // All retries failed - return empty and let client handle
      console.error(`❌ [SSR] All ${maxRetries} attempts failed. Blockchain query not responding.`);
      console.error('[SSR] Client-side fallback will attempt to fetch matches from API');
      return [];
    }
  }

  return [];
}

export default async function Page() {
  const matches = await fetchMatchesServer();

  return <Home initialMatches={matches} />;
}