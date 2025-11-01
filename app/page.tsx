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

  try {
    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 100000n;

    console.log(`[SSR] Scanning blocks ${fromBlock} to ${currentBlock}`);

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

    console.log(`[SSR] Found ${upcoming.length} upcoming matches`);

    if (upcoming.length === 0) {
      console.log('[SSR] No upcoming matches, returning empty');
      return [];
    }

    // Enrich with Football-data.org in parallel (with timeout protection)
    const enrichPromises = upcoming.map(async (match) => {
      try {
        // 5 second timeout per match to prevent SSR hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${FOOTBALL_DATA_BASE}/matches/${match.matchId}`, {
          headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
          signal: controller.signal,
          next: { revalidate: 1800 } // Cache 30min
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          // Fallback data
          return {
            id: match.matchId,
            homeTeam: 'Home Team',
            awayTeam: 'Away Team',
            league: 'Football',
            kickoff: new Date(match.startTime * 1000).toISOString(),
            venue: 'TBA',
            homeTeamBadge: '/default-badge.svg',
            awayTeamBadge: '/default-badge.svg',
            status: 'Not Started' as const
          };
        }

        const data = await response.json();
        const m = data.match || data;

        return {
          id: match.matchId,
          homeTeam: m?.homeTeam?.name || 'Home Team',
          awayTeam: m?.awayTeam?.name || 'Away Team',
          league: m.competition?.name || 'Football',
          kickoff: m.utcDate || new Date(match.startTime * 1000).toISOString(),
          venue: m.venue || 'TBA',
          homeTeamBadge: m.homeTeam?.crest || '/default-badge.svg',
          awayTeamBadge: m.awayTeam?.crest || '/default-badge.svg',
          status: 'Not Started' as const
        };
      } catch (error) {
        // Fallback on error (timeout, API failure, etc.)
        const errorMsg = error instanceof Error ? error.message : 'Unknown';
        console.warn(`[SSR] Match ${match.matchId} enrichment failed (${errorMsg}), using fallback`);

        return {
          id: match.matchId,
          homeTeam: 'Home Team',
          awayTeam: 'Away Team',
          league: 'Football',
          kickoff: new Date(match.startTime * 1000).toISOString(),
          venue: 'TBA',
          homeTeamBadge: '/default-badge.svg',
          awayTeamBadge: '/default-badge.svg',
          status: 'Not Started' as const
        };
      }
    });

    const enriched = await Promise.all(enrichPromises);
    console.log(`✅ [SSR] Successfully enriched ${enriched.length} matches`);
    console.log(`[SSR] Returning ${enriched.length} matches to client\n`);

    return enriched;

  } catch (error) {
    console.error('❌ [SSR] Error fetching matches:', error);
    // Return empty - client will handle
    return [];
  }
}

export default async function Page() {
  const matches = await fetchMatchesServer();

  return <Home initialMatches={matches} />;
}