import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

/**
 * DEBUG ENDPOINT: Check why matches aren't being processed
 * Shows detailed info about each match
 */
export async function GET() {
  const debug: any = {
    timestamp: new Date().toISOString(),
    footballDataApiKey: FOOTBALL_DATA_API_KEY ? 'Set ✅' : 'Missing ❌',
    matches: [],
    summary: {
      total: 0,
      canProcess: 0,
      reasons: {}
    }
  };

  try {
    // Get all registered matches
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const currentBlock = await publicClient.getBlockNumber();

    const matchEvents = await publicClient.getLogs({
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

    debug.summary.total = matchEvents.length;

    // Check each match in detail
    for (const event of matchEvents.slice(0, 20)) { // Limit to 20 for performance
      if (!event.args?.matchId) continue;

      const matchId = event.args.matchId;
      const matchDebug: any = {
        matchId: matchId.toString(),
        checks: {}
      };

      try {
        // 1. Get match info from contract
        const matchInfo = await publicClient.readContract({
          address: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'getMatch',
          args: [matchId]
        }) as { id: bigint; startTime: bigint; homeScore: bigint; awayScore: bigint; isRecorded: boolean; exists: boolean };

        matchDebug.startTime = new Date(Number(matchInfo.startTime) * 1000).toISOString();
        matchDebug.isRecorded = matchInfo.isRecorded;
        matchDebug.exists = matchInfo.exists;

        // 2. Check if already recorded
        if (matchInfo.isRecorded) {
          matchDebug.checks.alreadyRecorded = '✅ Already recorded';
          matchDebug.canProcess = false;
          matchDebug.reason = 'Already recorded';
        } else {
          // 3. Check if match has finished (+2 hours buffer)
          const now = Math.floor(Date.now() / 1000);
          const startTime = Number(matchInfo.startTime);
          const twoHours = 2 * 60 * 60;
          const timePassed = now - startTime;

          matchDebug.checks.timePassed = `${Math.floor(timePassed / 3600)} hours ago`;

          if (now < startTime + twoHours) {
            matchDebug.checks.timeCheck = `⏳ Not finished yet (needs ${Math.floor((startTime + twoHours - now) / 3600)} more hours)`;
            matchDebug.canProcess = false;
            matchDebug.reason = 'Not finished yet';
          } else {
            matchDebug.checks.timeCheck = '✅ Match finished';

            // 4. Try to fetch from Football Data API
            try {
              const response = await fetch(`${FOOTBALL_DATA_BASE}/matches/${matchId}`, {
                headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
                cache: 'no-store'
              });

              matchDebug.checks.footballDataStatus = response.status;

              if (response.ok) {
                const data = await response.json();
                const match = data.match;

                matchDebug.checks.footballDataMatch = {
                  status: match.status,
                  homeTeam: match.homeTeam?.name,
                  awayTeam: match.awayTeam?.name,
                  score: match.score?.fullTime ? `${match.score.fullTime.home}-${match.score.fullTime.away}` : 'No score'
                };

                if (match.status === 'FINISHED') {
                  matchDebug.checks.footballDataResult = '✅ Match finished in API';
                  matchDebug.canProcess = true;
                  matchDebug.reason = 'Can process!';
                  debug.summary.canProcess++;
                } else {
                  matchDebug.checks.footballDataResult = `⏳ Status: ${match.status}`;
                  matchDebug.canProcess = false;
                  matchDebug.reason = `API status: ${match.status}`;
                }
              } else {
                const errorText = await response.text();
                matchDebug.checks.footballDataError = `❌ ${response.status}: ${response.statusText}`;
                matchDebug.checks.footballDataDetails = errorText.substring(0, 200);
                matchDebug.canProcess = false;
                matchDebug.reason = `Football Data API error: ${response.status}`;
              }
            } catch (apiError: any) {
              matchDebug.checks.footballDataError = `❌ ${apiError.message}`;
              matchDebug.canProcess = false;
              matchDebug.reason = `API fetch error: ${apiError.message}`;
            }
          }
        }
      } catch (error: any) {
        matchDebug.error = error.message;
        matchDebug.canProcess = false;
        matchDebug.reason = `Contract error: ${error.message}`;
      }

      // Count reasons
      const reason = matchDebug.reason || 'Unknown';
      debug.summary.reasons[reason] = (debug.summary.reasons[reason] || 0) + 1;

      debug.matches.push(matchDebug);
    }

    // Add recommendations
    debug.recommendations = [];

    if (debug.summary.canProcess === 0) {
      debug.recommendations.push({
        issue: 'No matches can be processed',
        possibleReasons: [
          'All matches already recorded',
          'Matches not finished yet (need +2 hours after kickoff)',
          'Match IDs not found in Football Data API',
          'Football Data API errors'
        ]
      });
    }

    if (!FOOTBALL_DATA_API_KEY) {
      debug.recommendations.push({
        severity: 'CRITICAL',
        issue: 'FOOTBALL_DATA_API_KEY not set'
      });
    }

    return NextResponse.json(debug, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
