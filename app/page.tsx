import { Match } from '@/lib/matches';
import Home from './page-client';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS } from '@/lib/contract-interactions';

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

/**
 * Fetch matches DIRECTLY from blockchain (no API call to avoid VERCEL_URL issues)
 * This ensures SSR always works and provides stable embedded matches
 */
async function fetchMatchesServer(): Promise<Match[]> {
  console.log('=== SSR: FETCHING MATCHES DIRECTLY FROM BLOCKCHAIN ===');

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

    // Enrich with Football-data.org in parallel
    const enrichPromises = upcoming.map(async (match) => {
      try {
        const response = await fetch(`${FOOTBALL_DATA_BASE}/matches/${match.matchId}`, {
          headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
          next: { revalidate: 1800 } // Cache 30min
        });

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
            status: 'Not Started'
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
          status: 'Not Started'
        };
      } catch {
        // Fallback on error
        return {
          id: match.matchId,
          homeTeam: 'Home Team',
          awayTeam: 'Away Team',
          league: 'Football',
          kickoff: new Date(match.startTime * 1000).toISOString(),
          venue: 'TBA',
          homeTeamBadge: '/default-badge.svg',
          awayTeamBadge: '/default-badge.svg',
          status: 'Not Started'
        };
      }
    });

    const enriched = await Promise.all(enrichPromises);
    console.log(`✅ [SSR] Successfully enriched ${enriched.length} matches`);

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