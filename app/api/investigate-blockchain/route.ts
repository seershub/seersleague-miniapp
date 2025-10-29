import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

interface MatchState {
  matchId: string;
  startTime: number;
  homeScore: number;
  awayScore: number;
  isRecorded: boolean;
  exists: boolean;
}

interface FootballDataMatch {
  id: number;
  status: string;
  score?: {
    fullTime?: {
      home?: number;
      away?: number;
    };
  };
}

/**
 * DEEP BLOCKCHAIN INVESTIGATION
 *
 * This endpoint will:
 * 1. Fetch ALL MatchRegistered events
 * 2. Check contract state for each match (isRecorded, scores)
 * 3. Fetch ALL ResultRecorded events
 * 4. Fetch ALL PredictionsSubmitted events
 * 5. Query Football-data.org for each match status
 * 6. Cross-reference everything to find the root cause
 */
export async function GET(request: Request) {
  try {
    const currentBlock = await publicClient.getBlockNumber();
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const fromBlock = deploymentBlock > 0n ? deploymentBlock : currentBlock - 100000n;

    console.log(`\n🔍 BLOCKCHAIN INVESTIGATION`);
    console.log(`📊 Scanning from block ${fromBlock} to ${currentBlock}`);
    console.log(`📊 Range: ${Number(currentBlock - fromBlock).toLocaleString()} blocks\n`);

    // STEP 1: Fetch all MatchRegistered events
    console.log('1️⃣ Fetching MatchRegistered events...');
    const matchRegisteredEvents = await publicClient.getLogs({
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

    console.log(`✅ Found ${matchRegisteredEvents.length} MatchRegistered events\n`);

    // STEP 2: Check contract state for each match
    console.log('2️⃣ Checking contract state for all matches...');
    const matchStates: MatchState[] = [];

    for (const event of matchRegisteredEvents) {
      if (!event.args?.matchId || !event.args?.startTime) continue;

      const matchId = event.args.matchId;
      const startTime = Number(event.args.startTime);

      try {
        const matchInfo = await publicClient.readContract({
          address: CONTRACTS.SEERSLEAGUE,
          abi: SEERSLEAGUE_ABI,
          functionName: 'getMatch',
          args: [matchId]
        }) as {
          id: bigint;
          startTime: bigint;
          homeScore: bigint;
          awayScore: bigint;
          isRecorded: boolean;
          exists: boolean
        };

        matchStates.push({
          matchId: matchId.toString(),
          startTime,
          homeScore: Number(matchInfo.homeScore),
          awayScore: Number(matchInfo.awayScore),
          isRecorded: matchInfo.isRecorded,
          exists: matchInfo.exists
        });
      } catch (error) {
        console.error(`❌ Error reading match ${matchId}:`, error);
      }
    }

    console.log(`✅ Retrieved state for ${matchStates.length} matches\n`);

    // STEP 3: Fetch all ResultRecorded events
    console.log('3️⃣ Fetching ResultRecorded events...');
    const resultRecordedEvents = await publicClient.getLogs({
      address: CONTRACTS.SEERSLEAGUE,
      event: {
        type: 'event',
        name: 'ResultRecorded',
        inputs: [
          { name: 'matchId', type: 'uint256', indexed: true },
          { name: 'homeScore', type: 'uint8', indexed: false },
          { name: 'awayScore', type: 'uint8', indexed: false },
          { name: 'outcome', type: 'uint8', indexed: false }
        ]
      },
      fromBlock,
      toBlock: 'latest'
    });

    console.log(`✅ Found ${resultRecordedEvents.length} ResultRecorded events\n`);

    // STEP 4: Fetch all PredictionsSubmitted events
    console.log('4️⃣ Fetching PredictionsSubmitted events...');
    const predictionsEvents = await publicClient.getLogs({
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

    console.log(`✅ Found ${predictionsEvents.length} PredictionsSubmitted events\n`);

    // STEP 5: Query Football-data.org for match statuses
    console.log('5️⃣ Querying Football-data.org for match statuses...');
    const now = Math.floor(Date.now() / 1000);
    const finishedMatches: { matchId: string; status: string; homeScore?: number; awayScore?: number }[] = [];

    // Debug: Show first 5 matches with their startTimes
    console.log(`\n🔍 DEBUG: Current timestamp: ${now} (${new Date(now * 1000).toISOString()})`);
    console.log(`🔍 DEBUG: First 5 matches:`);
    matchStates.slice(0, 5).forEach(m => {
      console.log(`  Match ${m.matchId}: startTime=${m.startTime} (${new Date(m.startTime * 1000).toISOString()}) - ${m.startTime < now ? 'STARTED' : 'UPCOMING'}`);
    });

    // Only check matches that have already started
    const startedMatches = matchStates.filter(m => m.startTime < now);
    console.log(`\n📊 ${startedMatches.length} matches have started (out of ${matchStates.length} total)`);

    for (const match of startedMatches.slice(0, 20)) { // Limit to first 20 to avoid rate limits
      try {
        const response = await fetch(`${FOOTBALL_DATA_BASE}/matches/${match.matchId}`, {
          headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY }
        });

        if (response.ok) {
          const data = await response.json();
          const apiMatch: FootballDataMatch = data.match || data;

          finishedMatches.push({
            matchId: match.matchId,
            status: apiMatch.status,
            homeScore: apiMatch.score?.fullTime?.home,
            awayScore: apiMatch.score?.fullTime?.away
          });
        }
      } catch (error) {
        console.error(`Error fetching match ${match.matchId}:`, error);
      }
    }

    console.log(`✅ Retrieved status for ${finishedMatches.length} matches from API\n`);

    // STEP 6: Analysis
    const analysis = {
      totalRegisteredMatches: matchRegisteredEvents.length,
      matchesWithState: matchStates.length,
      matchesRecorded: matchStates.filter(m => m.isRecorded).length,
      matchesNotRecorded: matchStates.filter(m => !m.isRecorded).length,
      matchesStarted: startedMatches.length,
      matchesUpcoming: matchStates.filter(m => m.startTime > now).length,
      resultRecordedEvents: resultRecordedEvents.length,
      totalPredictionEvents: predictionsEvents.length,
      uniqueUsers: new Set(predictionsEvents.map(e => e.args?.user?.toLowerCase()).filter(Boolean)).size,
      matchesFinishedOnAPI: finishedMatches.filter(m => m.status === 'FINISHED').length,

      // Key Insights
      discrepancies: {
        recordedInContractButNoEvent: matchStates.filter(m =>
          m.isRecorded && !resultRecordedEvents.some(e => e.args?.matchId?.toString() === m.matchId)
        ).length,
        eventButNotRecordedInContract: resultRecordedEvents.filter(e =>
          !matchStates.some(m => m.matchId === e.args?.matchId?.toString() && m.isRecorded)
        ).length,
        finishedButNotRecorded: finishedMatches.filter(fm =>
          fm.status === 'FINISHED' &&
          !matchStates.find(m => m.matchId === fm.matchId)?.isRecorded
        ).length
      }
    };

    // Detailed breakdown
    const recordedMatches = matchStates.filter(m => m.isRecorded);
    const notRecordedButFinished = finishedMatches.filter(fm =>
      fm.status === 'FINISHED' &&
      !matchStates.find(m => m.matchId === fm.matchId)?.isRecorded
    );

    // User predictions breakdown
    const userPredictions: { [user: string]: number } = {};
    predictionsEvents.forEach((e: any) => {
      const user = e.args?.user?.toLowerCase();
      if (user) {
        userPredictions[user] = (userPredictions[user] || 0) + (e.args?.matchIds?.length || 0);
      }
    });

    return NextResponse.json({
      debug: {
        currentTimestamp: now,
        currentDate: new Date(now * 1000).toISOString(),
        first5Matches: matchStates.slice(0, 5).map(m => ({
          matchId: m.matchId,
          startTime: m.startTime,
          startDate: new Date(m.startTime * 1000).toISOString(),
          isStarted: m.startTime < now,
          exists: m.exists,
          isRecorded: m.isRecorded
        }))
      },

      summary: analysis,

      recordedMatches: recordedMatches.map(m => ({
        matchId: m.matchId,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        startTime: new Date(m.startTime * 1000).toISOString()
      })),

      notRecordedButFinished: notRecordedButFinished.map(m => ({
        matchId: m.matchId,
        status: m.status,
        apiScores: { home: m.homeScore, away: m.awayScore },
        contractState: matchStates.find(ms => ms.matchId === m.matchId)
      })),

      resultRecordedEvents: resultRecordedEvents.map((e: any) => ({
        matchId: e.args?.matchId?.toString(),
        homeScore: e.args?.homeScore,
        awayScore: e.args?.awayScore,
        outcome: e.args?.outcome,
        blockNumber: e.blockNumber?.toString(),
        transactionHash: e.transactionHash
      })),

      topUsers: Object.entries(userPredictions)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([user, count]) => ({ user, predictionCount: count })),

      // Critical findings
      criticalFindings: {
        hasRecordedMatches: recordedMatches.length > 0,
        hasResultRecordedEvents: resultRecordedEvents.length > 0,
        finishedMatchesWaitingToBeRecorded: notRecordedButFinished.length,
        possibleIssue: analysis.discrepancies.finishedButNotRecorded > 0
          ? '⚠️ FOUND FINISHED MATCHES NOT RECORDED IN CONTRACT'
          : recordedMatches.length === 0
          ? '⚠️ NO MATCHES RECORDED AT ALL - record-results has never run successfully'
          : '✅ System appears to be working'
      }
    });

  } catch (error) {
    console.error('Investigation error:', error);
    return NextResponse.json(
      { error: (error as Error).message, stack: (error as Error).stack },
      { status: 500 }
    );
  }
}
