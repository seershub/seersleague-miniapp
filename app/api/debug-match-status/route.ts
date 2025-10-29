import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

/**
 * Debug endpoint to check status of ALL matches that have predictions
 *
 * This will show:
 * 1. All match IDs from PredictionsSubmitted events
 * 2. Their startTime from contract
 * 3. Their status from Football-data.org
 * 4. Why they're not being counted as "finished"
 */
export async function GET(request: Request) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 5000000n;

    console.log('🔍 Fetching all PredictionsSubmitted events...');

    // Get all predictions
    const predictionEvents = await publicClient.getLogs({
      address: CONTRACTS.SEERSLEAGUE,
      event: {
        type: 'event',
        name: 'PredictionsSubmitted',
        inputs: [
          { name: 'user', type: 'address', indexed: true },
          { name: 'matchIds', type: 'uint256[]', indexed: false },
          { name: 'predictionsCount', type: 'uint256', indexed: false },
          { name: 'freeUsed', type: 'uint256', indexed: false },
          { name: 'feePaid', type: 'uint256', indexed: false }
        ]
      },
      fromBlock,
      toBlock: 'latest'
    });

    // Extract unique match IDs
    const matchIdSet = new Set<string>();
    const userCount = new Set<string>();

    predictionEvents.forEach((event: any) => {
      const user = event.args?.user?.toLowerCase();
      const matchIds = event.args?.matchIds || [];

      if (user) userCount.add(user);
      matchIds.forEach((id: bigint) => matchIdSet.add(id.toString()));
    });

    console.log(`✅ Found ${matchIdSet.size} unique match IDs from ${userCount.size} users`);

    // Check each match
    const matchStatuses = [];

    for (const matchId of Array.from(matchIdSet)) {
      try {
        // Get contract state
        const matchInfo = await publicClient.readContract({
          address: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'getMatch',
          args: [BigInt(matchId)]
        }) as {
          id: bigint;
          startTime: bigint;
          homeScore: bigint;
          awayScore: bigint;
          isRecorded: boolean;
          exists: boolean
        };

        const startTime = Number(matchInfo.startTime);
        const twoHours = 2 * 60 * 60;
        const timeSinceStart = now - startTime;
        const canCheckResult = now >= startTime + twoHours;

        let apiStatus = 'NOT_CHECKED';
        let apiScore = null;
        let apiError = null;

        // Only check API if match should be finished
        if (canCheckResult) {
          try {
            const response = await fetch(`${FOOTBALL_DATA_BASE}/matches/${matchId}`, {
              headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
              cache: 'no-store'
            });

            if (response.ok) {
              const data = await response.json();
              const match = data.match || data;
              apiStatus = match.status;
              apiScore = match.score?.fullTime;
            } else {
              apiError = `HTTP ${response.status}`;
            }
          } catch (error) {
            apiError = (error as Error).message;
          }
        }

        matchStatuses.push({
          matchId,
          contract: {
            exists: matchInfo.exists,
            startTime,
            startDate: new Date(startTime * 1000).toISOString(),
            isRecorded: matchInfo.isRecorded,
            recordedScore: matchInfo.isRecorded ?
              `${matchInfo.homeScore}-${matchInfo.awayScore}` : null
          },
          timing: {
            now: new Date(now * 1000).toISOString(),
            isStarted: now >= startTime,
            timeSinceStart: timeSinceStart > 0 ? `${Math.floor(timeSinceStart / 60)} minutes` : 'not started',
            canCheckResult,
            reason: !canCheckResult ?
              (now < startTime ? 'Match not started yet' : 'Less than 2 hours since start')
              : 'Ready to check'
          },
          api: {
            status: apiStatus,
            score: apiScore,
            error: apiError
          },
          analysis: {
            shouldBeRecorded: canCheckResult && apiStatus === 'FINISHED',
            blockers: [
              !matchInfo.exists ? '❌ Match not in contract' : null,
              now < startTime ? '⏰ Match not started yet' : null,
              !canCheckResult && now >= startTime ? '⏰ Less than 2h since start' : null,
              canCheckResult && apiStatus !== 'FINISHED' ? `📊 API status: ${apiStatus}` : null,
              matchInfo.isRecorded ? '✅ Already recorded' : null
            ].filter(Boolean)
          }
        });

      } catch (error) {
        matchStatuses.push({
          matchId,
          error: (error as Error).message
        });
      }
    }

    // Categorize matches
    const categorized = {
      finished: matchStatuses.filter(m => m.api?.status === 'FINISHED'),
      scheduled: matchStatuses.filter(m => m.api?.status === 'SCHEDULED' || m.api?.status === 'TIMED'),
      inPlay: matchStatuses.filter(m => m.api?.status === 'IN_PLAY'),
      notStarted: matchStatuses.filter(m => m.timing && !m.timing.isStarted),
      tooRecent: matchStatuses.filter(m => m.timing?.isStarted && !m.timing?.canCheckResult),
      alreadyRecorded: matchStatuses.filter(m => m.contract?.isRecorded),
      apiError: matchStatuses.filter(m => m.api?.error),
      notChecked: matchStatuses.filter(m => m.api?.status === 'NOT_CHECKED')
    };

    return NextResponse.json({
      summary: {
        totalMatchIds: matchIdSet.size,
        totalUsers: userCount.size,
        currentTime: new Date(now * 1000).toISOString(),
        categories: {
          finished: categorized.finished.length,
          scheduled: categorized.scheduled.length,
          inPlay: categorized.inPlay.length,
          notStarted: categorized.notStarted.length,
          tooRecent: categorized.tooRecent.length,
          alreadyRecorded: categorized.alreadyRecorded.length,
          apiError: categorized.apiError.length,
          notChecked: categorized.notChecked.length
        }
      },

      // Show all matches with details
      allMatches: matchStatuses,

      // Highlight problematic matches
      problematic: {
        shouldBeFinishedButNot: matchStatuses.filter(m =>
          m.timing?.canCheckResult &&
          m.api?.status !== 'FINISHED' &&
          m.api?.status !== 'NOT_CHECKED' &&
          !m.contract?.isRecorded
        ),
        apiErrors: categorized.apiError
      },

      recommendation: categorized.finished.length > 6
        ? `⚠️ Found ${categorized.finished.length} finished matches but smart-recount only recorded 6. Check why.`
        : categorized.tooRecent.length > 20
        ? `⏰ ${categorized.tooRecent.length} matches started less than 2h ago. Try again later.`
        : categorized.notStarted.length > 30
        ? `📅 ${categorized.notStarted.length} matches haven't started yet. This is normal.`
        : '🔍 Check "allMatches" for detailed breakdown'
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
