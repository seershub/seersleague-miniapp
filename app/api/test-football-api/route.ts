import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

/**
 * Test Football-data.org API for a specific match
 *
 * Usage: /api/test-football-api?matchId=537886
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const matchId = url.searchParams.get('matchId');

    if (!matchId) {
      return NextResponse.json({
        error: 'Missing matchId parameter',
        usage: '/api/test-football-api?matchId=537886'
      }, { status: 400 });
    }

    if (!FOOTBALL_DATA_API_KEY) {
      return NextResponse.json({
        error: 'FOOTBALL_DATA_API_KEY not configured'
      }, { status: 500 });
    }

    console.log(`Testing Football-data.org API for match ${matchId}...`);

    const response = await fetch(`${FOOTBALL_DATA_BASE}/matches/${matchId}`, {
      headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json({
        error: `API returned ${response.status} ${response.statusText}`,
        matchId,
        status: response.status
      }, { status: response.status });
    }

    const data = await response.json();

    // Test both parsing methods
    const method1 = data.match;  // Old buggy way
    const method2 = data.match || data;  // Fixed way

    return NextResponse.json({
      matchId,
      success: true,
      rawResponse: data,

      parsing: {
        method1_buggy: method1 ? {
          status: method1.status,
          homeTeam: method1.homeTeam?.name,
          awayTeam: method1.awayTeam?.name,
          score: method1.score?.fullTime
        } : 'undefined (this is the bug!)',

        method2_fixed: {
          status: method2.status,
          homeTeam: method2.homeTeam?.name,
          awayTeam: method2.awayTeam?.name,
          score: method2.score?.fullTime,
          utcDate: method2.utcDate
        }
      },

      analysis: {
        responseHasMatchProperty: 'match' in data,
        responseHasStatusProperty: 'status' in data,
        correctParsing: method2.status === 'FINISHED' ? 'Match is FINISHED' : `Match status: ${method2.status}`
      }
    });

  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
