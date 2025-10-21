import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org';
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

/**
 * SMART MATCH FILTERING - No More Manual Registration!
 *
 * OLD PROBLEM:
 * - Had to manually toggle ENABLE_AUTO_REGISTRATION
 * - Spam transactions when left on
 * - Started matches still showing up
 *
 * NEW SOLUTION:
 * 1. Admin runs /api/batch-register-matches once per week
 * 2. This endpoint fetches registered matches from blockchain
 * 3. Filters out matches that already started
 * 4. Enriches with Football-data.org
 * 5. Returns only playable matches
 *
 * Result: Always shows REGISTERED + NOT STARTED matches only!
 */

interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  kickoff: string;
  venue: string;
  homeTeamBadge: string;
  awayTeamBadge: string;
  status: string;
}

/**
 * Get registered matches from blockchain that haven't started yet
 */
async function getUpcomingRegisteredMatches(): Promise<{ matchId: string; startTime: number }[]> {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(RPC_URL)
  });

  const currentBlock = await publicClient.getBlockNumber();
  const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');

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
    fromBlock: deploymentBlock > 0n ? deploymentBlock : currentBlock - 10000n,
    toBlock: 'latest'
  });

  const now = Math.floor(Date.now() / 1000);

  // Filter to only matches that haven't started
  const upcoming = events
    .filter((e): e is typeof e & { args: { matchId: bigint; startTime: bigint } } =>
      Boolean(e.args?.matchId && e.args?.startTime)
    )
    .map(e => ({
      matchId: e.args.matchId.toString(),
      startTime: Number(e.args.startTime)
    }))
    .filter(m => m.startTime > now) // Only future matches
    .sort((a, b) => a.startTime - b.startTime); // Earliest first

  console.log(`📊 Found ${events.length} registered matches, ${upcoming.length} upcoming`);

  return upcoming;
}

/**
 * Enrich match data from Football-data.org (with caching + batching)
 */
async function enrichMatches(matches: { matchId: string; startTime: number }[], limit: number = 20): Promise<Match[]> {
  const enriched: Match[] = [];
  const toEnrich = matches.slice(0, Math.min(limit, matches.length));

  console.log(`🌐 Enriching ${toEnrich.length} matches from Football-data.org...`);

  for (const match of toEnrich) {
    try {
      const response = await fetch(`${FOOTBALL_DATA_BASE}/matches/${match.matchId}`, {
        headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
        next: { revalidate: 1800 } // Cache for 30 minutes
      });

      if (!response.ok) {
        console.log(`⚠️ Match ${match.matchId} not in API, using fallback`);

        // Fallback: Basic data
        enriched.push({
          id: match.matchId,
          homeTeam: 'Home Team',
          awayTeam: 'Away Team',
          league: 'Football',
          kickoff: new Date(match.startTime * 1000).toISOString(),
          venue: 'TBA',
          homeTeamBadge: '/default-badge.svg',
          awayTeamBadge: '/default-badge.svg',
          status: 'Not Started'
        });
        continue;
      }

      const data = await response.json();
      const m = data.match || data;

      enriched.push({
        id: match.matchId,
        homeTeam: m?.homeTeam?.name || m?.homeTeam || 'Home Team',
        awayTeam: m?.awayTeam?.name || m?.awayTeam || 'Away Team',
        league: m.competition?.name || 'Football',
        kickoff: m.utcDate || new Date(match.startTime * 1000).toISOString(),
        venue: m.venue || 'TBA',
        homeTeamBadge: m.homeTeam?.crest || '/default-badge.svg',
        awayTeamBadge: m.awayTeam?.crest || '/default-badge.svg',
        status: 'Not Started'
      });

      // Rate limiting (25 req/min for free tier)
      await new Promise(resolve => setTimeout(resolve, 2500));

    } catch (error) {
      console.error(`Error enriching match ${match.matchId}:`, error);
    }
  }

  console.log(`✅ Enriched ${enriched.length} matches`);

  return enriched;
}

/**
 * GET /api/matches
 *
 * Returns registered + upcoming matches only.
 *
 * Query params:
 * - limit: Max matches to return (default: 20, max: 50)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    console.log(`\n📥 Fetching matches (limit: ${limit})\n`);

    // Step 1: Get upcoming registered matches from blockchain
    const upcoming = await getUpcomingRegisteredMatches();

    if (upcoming.length === 0) {
      console.log('⚠️ No upcoming matches found. Run /api/batch-register-matches');

      // Return empty with helpful message
      return NextResponse.json({
        matches: [],
        total: 0,
        message: 'No upcoming matches registered. Admin should run batch-register-matches.',
        adminHint: 'POST /api/batch-register-matches?days=14'
      });
    }

    // Step 2: Enrich with Football-data.org
    const enriched = await enrichMatches(upcoming, limit);

    // Step 3: Final safety filter - remove any that may have started during enrichment
    const now = Math.floor(Date.now() / 1000);
    const final = enriched.filter((_, idx) => upcoming[idx].startTime > now);

    return NextResponse.json({
      matches: final,
      total: upcoming.length,
      returned: final.length,
      hasMore: upcoming.length > limit,
      registeredTotal: upcoming.length
    });

  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
