import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC || 'https://mainnet.base.org';
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';

/**
 * TEST ENDPOINT: Check system configuration and status
 * NO AUTH REQUIRED - Safe for testing
 */
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: {},
    contract: {},
    api: {},
    matches: {},
    recommendations: []
  };

  // 1. Check Environment Variables
  results.environment = {
    FOOTBALL_DATA_API_KEY: FOOTBALL_DATA_API_KEY ? '✅ Set' : '❌ Missing',
    PRIVATE_KEY: process.env.PRIVATE_KEY ? '✅ Set' : '❌ Missing',
    CRON_SECRET: process.env.CRON_SECRET ? '✅ Set' : '❌ Missing',
    NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL ? '✅ Set' : '❌ Missing',
    DEPLOYMENT_BLOCK: process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || 'Not set (will scan last 10K blocks)'
  };

  if (!FOOTBALL_DATA_API_KEY) {
    results.recommendations.push({
      severity: 'CRITICAL',
      issue: 'FOOTBALL_DATA_API_KEY missing',
      fix: 'Add FOOTBALL_DATA_API_KEY to Vercel environment variables',
      howTo: 'Get free key at https://www.football-data.org/client/register'
    });
  }

  if (!process.env.PRIVATE_KEY) {
    results.recommendations.push({
      severity: 'CRITICAL',
      issue: 'PRIVATE_KEY missing',
      fix: 'Add PRIVATE_KEY to Vercel environment variables',
      note: 'Required to record results to blockchain (must be contract owner)'
    });
  }

  if (!process.env.CRON_SECRET) {
    results.recommendations.push({
      severity: 'WARNING',
      issue: 'CRON_SECRET missing',
      fix: 'Add CRON_SECRET to Vercel environment variables',
      note: 'Required for automated cron jobs'
    });
  }

  // 2. Test Football Data API
  if (FOOTBALL_DATA_API_KEY) {
    try {
      const testMatchId = '471534'; // Recent Premier League match for testing
      const response = await fetch(`https://api.football-data.org/v4/matches/${testMatchId}`, {
        headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        results.api.footballData = {
          status: '✅ Working',
          testMatch: {
            id: testMatchId,
            status: data.match?.status,
            homeTeam: data.match?.homeTeam?.name,
            awayTeam: data.match?.awayTeam?.name
          }
        };
      } else {
        results.api.footballData = {
          status: '❌ Failed',
          error: `HTTP ${response.status}: ${response.statusText}`,
          hint: response.status === 403 ? 'Invalid API key' : 'API error'
        };
        results.recommendations.push({
          severity: 'CRITICAL',
          issue: `Football Data API returned ${response.status}`,
          fix: response.status === 403
            ? 'Check your API key is correct'
            : 'API might be temporarily down'
        });
      }
    } catch (error: any) {
      results.api.footballData = {
        status: '❌ Error',
        error: error.message
      };
    }
  } else {
    results.api.footballData = {
      status: '❌ Cannot test',
      reason: 'FOOTBALL_DATA_API_KEY not configured'
    };
  }

  // 3. Check Contract Data
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL)
    });

    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const currentBlock = await publicClient.getBlockNumber();

    results.contract.blockchain = {
      status: '✅ Connected',
      currentBlock: currentBlock.toString(),
      scanningFrom: deploymentBlock > 0n
        ? deploymentBlock.toString()
        : (currentBlock - 10000n).toString()
    };

    // Get registered matches
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

    results.matches.registered = {
      total: matchEvents.length,
      status: matchEvents.length > 0 ? '✅ Found' : '⚠️ None found'
    };

    if (matchEvents.length > 0) {
      // Check first few matches for recording status
      const sampleMatches = matchEvents.slice(0, 5);
      const matchStatuses = [];

      for (const event of sampleMatches) {
        if (!event.args?.matchId) continue;
        const matchId = event.args.matchId;

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

        const now = Math.floor(Date.now() / 1000);
        const startTime = Number(matchInfo.startTime);
        const isPast = now > startTime + (2 * 60 * 60); // +2 hours buffer

        matchStatuses.push({
          matchId: matchId.toString(),
          startTime: new Date(startTime * 1000).toISOString(),
          isPast,
          isRecorded: matchInfo.isRecorded,
          status: matchInfo.isRecorded
            ? '✅ Recorded'
            : (isPast ? '⚠️ Finished but not recorded' : '⏳ Not finished yet')
        });
      }

      results.matches.samples = matchStatuses;

      const recordedCount = matchStatuses.filter(m => m.isRecorded).length;
      const finishedUnrecorded = matchStatuses.filter(m => m.isPast && !m.isRecorded).length;

      if (finishedUnrecorded > 0) {
        results.recommendations.push({
          severity: 'WARNING',
          issue: `${finishedUnrecorded} finished matches not recorded`,
          fix: 'Manually trigger: POST /api/record-results with Authorization header',
          note: 'Cron should handle this automatically at 00:00 UTC'
        });
      }
    } else {
      results.recommendations.push({
        severity: 'INFO',
        issue: 'No matches found in recent blocks',
        note: 'Matches need to be registered first via /api/batch-register-matches'
      });
    }

  } catch (error: any) {
    results.contract.blockchain = {
      status: '❌ Error',
      error: error.message
    };
  }

  // 4. Check Prediction Events
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL)
    });

    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const currentBlock = await publicClient.getBlockNumber();

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
      fromBlock: deploymentBlock > 0n ? deploymentBlock : currentBlock - 10000n,
      toBlock: 'latest'
    });

    results.matches.predictions = {
      total: predictionEvents.length,
      uniqueUsers: new Set(predictionEvents.map(e => e.args?.user?.toLowerCase())).size,
      status: predictionEvents.length > 0 ? '✅ Found' : '⚠️ None found'
    };

  } catch (error: any) {
    results.matches.predictions = {
      status: '❌ Error',
      error: error.message
    };
  }

  // 5. Summary
  const criticalIssues = results.recommendations.filter((r: any) => r.severity === 'CRITICAL').length;
  const warnings = results.recommendations.filter((r: any) => r.severity === 'WARNING').length;

  results.summary = {
    status: criticalIssues > 0 ? '❌ Not Ready' : warnings > 0 ? '⚠️ Issues Found' : '✅ All Good',
    criticalIssues,
    warnings,
    nextSteps: criticalIssues > 0
      ? 'Fix critical issues first'
      : warnings > 0
        ? 'Check warnings and manually trigger record-results'
        : 'System ready - wait for cron (00:00 UTC) or manually trigger'
  };

  return NextResponse.json(results, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}
