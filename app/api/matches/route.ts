import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Vercel Pro max

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
    console.log(`[API] Using ${blockSource}: ${fromBlock}`);
  } else {
    fromBlock = currentBlock - maxBlockRange;
    console.warn(`⚠️ [API] No deployment block set! Using last ${maxBlockRange} blocks (~8 days)`);
    console.warn(`⚠️ [API] Set NEXT_PUBLIC_MATCH_DEPLOYMENT_BLOCK in Vercel to avoid old test matches`);
  }

  const blockRange = currentBlock - fromBlock;
  console.log(`[API] Scanning blocks ${fromBlock} to ${currentBlock} (${blockRange} blocks)`);

  // Single fetch - much faster for matches
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

  console.log(`📊 [API] Found ${events.length} registered matches, ${upcoming.length} upcoming`);

  return upcoming;
}

/**
 * Enrich match data from Football-data.org (PARALLEL for speed)
 */
async function enrichMatches(matches: { matchId: string; startTime: number }[], limit: number = 5): Promise<Match[]> {
  const toEnrich = matches.slice(0, Math.min(limit, matches.length));

  console.log(`🌐 Enriching ${toEnrich.length} matches from Football-data.org (parallel)...`);

  // PARALLEL FETCH with timeout protection
  const enrichPromises = toEnrich.map(async (match) => {
    try {
      // 3 second timeout per match
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(`${FOOTBALL_DATA_BASE}/matches/${match.matchId}`, {
        headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
        signal: controller.signal,
        next: { revalidate: 1800 } // Cache for 30 minutes
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`⚠️ Match ${match.matchId} not in API, using fallback`);

        // Fallback: Basic data
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
        homeTeam: m?.homeTeam?.name || m?.homeTeam || 'Home Team',
        awayTeam: m?.awayTeam?.name || m?.awayTeam || 'Away Team',
        league: m.competition?.name || 'Football',
        kickoff: m.utcDate || new Date(match.startTime * 1000).toISOString(),
        venue: m.venue || 'TBA',
        homeTeamBadge: m.homeTeam?.crest || '/default-badge.svg',
        awayTeamBadge: m.awayTeam?.crest || '/default-badge.svg',
        status: 'Not Started'
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown';
      const isTimeout = errorMsg.includes('abort');

      if (isTimeout) {
        console.warn(`⏱️ Match ${match.matchId} enrichment timeout (>3s), using fallback`);
      } else {
        console.error(`❌ Match ${match.matchId} enrichment error: ${errorMsg}`);
      }

      // Fallback on error or timeout
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

  // Wait for all enrichments in parallel
  const enriched = await Promise.all(enrichPromises);

  console.log(`✅ Enriched ${enriched.length} matches`);

  return enriched;
}

/**
 * GET /api/matches
 *
 * Returns registered + upcoming matches only.
 *
 * Query params:
 * - limit: Max matches to return (default: 5, max: 20)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '5', 10), 50);

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

    // REMOVED: Final safety filter that caused race condition
    // The filter in getUpcomingRegisteredMatches() already handles upcoming matches
    // Re-filtering here after enrichment caused matches to disappear if they started during enrichment
    // Users should see matches even if they just started (they might have predictions on them)

    return NextResponse.json({
      matches: enriched,
      total: upcoming.length,
      returned: enriched.length,
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
