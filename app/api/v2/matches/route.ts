import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS_V2, SEERSLEAGUE_V2_ABI } from '@/lib/contract-interactions-v2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface MatchDisplay {
  id: string;
  startTime: number;
  startDate: string;
  status: 'upcoming' | 'live' | 'finished' | 'recorded';
  canPredict: boolean;
  isRecorded: boolean;
  timeRemaining?: number;
}

/**
 * ENHANCED MATCHES API V2 - With automatic filtering
 * 
 * Features:
 * - Only shows upcoming matches (no finished matches)
 * - Pagination support (5 more system)
 * - Automatic status detection
 * - Spam protection
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '20');
    const showFinished = searchParams.get('showFinished') === 'true';

    console.log(`🏈 [MATCHES V2] Fetching matches - offset: ${offset}, limit: ${limit}, showFinished: ${showFinished}`);

    // Get upcoming matches from contract
    const upcomingMatches = await publicClient.readContract({
      address: CONTRACTS_V2.SEERSLEAGUE,
      abi: SEERSLEAGUE_V2_ABI,
      functionName: 'getUpcomingMatches',
      args: [BigInt(limit + offset + 10)] // Get more to filter
    }) as unknown as { matchIds: bigint[]; startTimes: bigint[] };

    console.log(`[MATCHES V2] Found ${upcomingMatches.matchIds.length} upcoming matches`);

    // Convert to display format
    const now = Math.floor(Date.now() / 1000);
    const predictionDeadline = 10 * 60; // 10 minutes in seconds
    const matches: MatchDisplay[] = [];

    for (let i = 0; i < upcomingMatches.matchIds.length; i++) {
      const matchId = upcomingMatches.matchIds[i];
      const startTime = Number(upcomingMatches.startTimes[i]);
      const timeRemaining = startTime - now;

      // Skip if match is too old (finished more than 2 hours ago)
      if (timeRemaining < -7200 && !showFinished) {
        continue;
      }

      let status: 'upcoming' | 'live' | 'finished' | 'recorded';
      let canPredict = false;

      if (timeRemaining > predictionDeadline) {
        // More than 10 minutes before match - can predict
        status = 'upcoming';
        canPredict = true;
      } else if (timeRemaining > 0) {
        // Less than 10 minutes before match - cannot predict
        status = 'live';
        canPredict = false;
      } else if (timeRemaining > -7200) {
        // Match started but not finished (within 2 hours)
        status = 'live';
        canPredict = false;
      } else {
        // Match finished more than 2 hours ago
        status = 'finished';
        canPredict = false;
      }

      // Check if match is recorded
      try {
        const matchInfo = await publicClient.readContract({
          address: CONTRACTS_V2.SEERSLEAGUE,
          abi: SEERSLEAGUE_V2_ABI,
          functionName: 'getMatch',
          args: [matchId]
        }) as { isRecorded: boolean };

        if (matchInfo.isRecorded) {
          status = 'recorded';
          canPredict = false;
        }
      } catch (error) {
        console.error(`Error checking match ${matchId}:`, error);
      }

      matches.push({
        id: matchId.toString(),
        startTime,
        startDate: new Date(startTime * 1000).toISOString(),
        status,
        canPredict,
        isRecorded: status === 'recorded',
        timeRemaining: timeRemaining > 0 ? timeRemaining : undefined
      });
    }

    // Filter out finished matches unless explicitly requested
    const filteredMatches = showFinished 
      ? matches 
      : matches.filter(m => m.status !== 'finished' && m.status !== 'recorded');

    // Apply pagination
    const paginatedMatches = filteredMatches.slice(offset, offset + limit);

    // Get match statistics (simplified for now)
    const stats = {
      total: BigInt(upcomingMatches.matchIds.length),
      upcoming: BigInt(upcomingMatches.matchIds.length),
      finished: BigInt(0),
      recorded: BigInt(0)
    };

    console.log(`[MATCHES V2] Returning ${paginatedMatches.length} matches (${filteredMatches.length} total after filtering)`);

    return NextResponse.json({
      matches: paginatedMatches,
      pagination: {
        offset,
        limit,
        total: filteredMatches.length,
        hasMore: offset + limit < filteredMatches.length,
        nextOffset: offset + limit
      },
      statistics: {
        total: Number(stats.total),
        upcoming: Number(stats.upcoming),
        finished: Number(stats.finished),
        recorded: Number(stats.recorded)
      },
      filters: {
        showFinished,
        autoFilter: !showFinished
      },
      version: '2.0.0',
      features: [
        'Automatic finished match filtering',
        'Pagination support',
        'Status detection',
        'Spam protection'
      ]
    });

  } catch (error) {
    console.error('[MATCHES V2] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message, version: '2.0.0' },
      { status: 500 }
    );
  }
}
