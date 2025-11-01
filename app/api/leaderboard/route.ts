import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { publicClient } from '@/lib/viem-config';
import { CONTRACTS, SEERSLEAGUE_ABI } from '@/lib/contract-interactions';

export interface LeaderboardEntry {
  rank: number;
  address: string;
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
  currentStreak: number;
  longestStreak: number;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Generate leaderboard directly from contract (fallback when KV fails)
// Returns top 20 users in leaderboard, but totalUsers count includes ALL users
async function generateLeaderboardFromContract(): Promise<{ leaderboard: LeaderboardEntry[], totalUsers: number }> {
  console.log('Generating leaderboard directly from contract...');

  try {
    // Get contract deployment block
    const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK || '0');
    const currentBlock = await publicClient.getBlockNumber();

    // CRITICAL FIX: Limit block range to prevent RPC timeout
    // Match disappearing fix proved 100K blocks can timeout
    // Use 200K as fallback (safer than 5M but covers ~1.5 days)
    // PERMANENT SOLUTION: Set NEXT_PUBLIC_DEPLOYMENT_BLOCK in Vercel env
    const maxFallbackRange = 200000n;
    let fromBlock: bigint;

    if (deploymentBlock > 0n) {
      // Deployment block is set - use it (most reliable)
      fromBlock = deploymentBlock;
      console.log(`[Leaderboard] ✅ Using deployment block: ${fromBlock}`);
    } else {
      // No deployment block - use limited fallback
      fromBlock = currentBlock - maxFallbackRange;
      console.warn(`[Leaderboard] ⚠️ NEXT_PUBLIC_DEPLOYMENT_BLOCK not set!`);
      console.warn(`[Leaderboard] ⚠️ Using fallback: last ${maxFallbackRange} blocks`);
      console.warn(`[Leaderboard] ⚠️ This may miss older users! Set deployment block for full history.`);
    }

    console.log(`[Leaderboard] Scanning from block ${fromBlock} to latest (${currentBlock})`);
    console.log(`[Leaderboard] Block range: ${currentBlock - fromBlock} blocks`);

    // CRITICAL FIX: Add retry mechanism (same as match disappearing fix)
    // RPC can timeout on heavy queries, retry with exponential backoff
    let predictionEvents: any[] = [];
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        // Fetch PredictionsSubmitted events
        predictionEvents = await publicClient.getLogs({
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

        console.log(`[Leaderboard] ✅ Found ${predictionEvents.length} prediction events`);
        break; // Success, exit retry loop

      } catch (error) {
        retryCount++;
        if (retryCount < maxRetries) {
          const delayMs = Math.pow(2, retryCount - 1) * 1000; // 1s, 2s, 4s
          console.warn(`[Leaderboard] ⚠️ Attempt ${retryCount} failed, retrying in ${delayMs}ms...`);
          console.warn(`[Leaderboard] Error:`, error);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        } else {
          console.error(`[Leaderboard] ❌ All ${maxRetries} attempts failed`);
          throw error; // Re-throw after all retries exhausted
        }
      }
    }

    // Extract unique user addresses
    const uniqueUsers = new Set<string>();
    predictionEvents.forEach(event => {
      if (event.args && event.args.user) {
        uniqueUsers.add(event.args.user.toLowerCase());
      }
    });

    console.log(`Found ${uniqueUsers.size} unique users`);

    // Store total unique users count (for accurate totalPlayers display)
    const totalUniqueUsers = uniqueUsers.size;

    // Fetch stats for each user with BATCH and TIMEOUT protection
    const leaderboardData: LeaderboardEntry[] = [];
    let successCount = 0;
    let errorCount = 0;

    console.log(`[Leaderboard] Fetching stats for ${uniqueUsers.size} users (max 20 for speed)...`);

    // CRITICAL FIX: Fetch ResultRecorded events to get REAL correctPredictions count
    // Contract has duplicate bug, so we can't trust stats.correctPredictions
    // Instead, count unique ResultRecorded events per user
    console.log('[Leaderboard] Fetching ResultRecorded events for accurate counts...');

    // CRITICAL FIX: Add retry mechanism for ResultRecorded events too
    let resultEvents: any[] = [];
    retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        resultEvents = await publicClient.getLogs({
          address: CONTRACTS.SEERSLEAGUE,
          event: {
            type: 'event',
            name: 'ResultRecorded',
            inputs: [
              { name: 'user', type: 'address', indexed: true },
              { name: 'matchId', type: 'uint256', indexed: false },
              { name: 'correct', type: 'bool', indexed: false }
            ]
          },
          fromBlock,
          toBlock: 'latest'
        });

        console.log(`[Leaderboard] ✅ Found ${resultEvents.length} ResultRecorded events`);
        break; // Success

      } catch (error) {
        retryCount++;
        if (retryCount < maxRetries) {
          const delayMs = Math.pow(2, retryCount - 1) * 1000;
          console.warn(`[Leaderboard] ⚠️ ResultRecorded attempt ${retryCount} failed, retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        } else {
          console.error(`[Leaderboard] ❌ ResultRecorded fetch failed after ${maxRetries} attempts`);
          // Don't throw - continue with empty resultEvents (better than total failure)
          resultEvents = [];
          break;
        }
      }
    }

    // Count REAL correctPredictions per user from UNIQUE (user, matchId) pairs
    // CRITICAL FIX: Same (user, match) can have multiple ResultRecorded events (duplicate bug)
    // We must count unique pairs only - a user can only be correct ONCE per match
    const uniqueCorrectPairs = new Set<string>();
    resultEvents.forEach((event: any) => {
      const user = event.args?.user?.toLowerCase();
      const matchId = event.args?.matchId?.toString();
      const correct = event.args?.correct;

      if (user && matchId && correct === true) {
        // Only count each (user, match) pair once
        uniqueCorrectPairs.add(`${user}-${matchId}`);
      }
    });

    console.log(`[Leaderboard] ${uniqueCorrectPairs.size} unique correct predictions (after dedup from ${resultEvents.length} events)`);

    // Now count per user from unique pairs
    const userCorrectCounts = new Map<string, number>();
    uniqueCorrectPairs.forEach(pair => {
      const [user] = pair.split('-');
      userCorrectCounts.set(user, (userCorrectCounts.get(user) || 0) + 1);
    });

    console.log(`[Leaderboard] Calculated correct counts for ${userCorrectCounts.size} users`);

    // LIMIT TO 20 USERS for performance
    const usersArray = Array.from(uniqueUsers).slice(0, 20);

    // Fetch in batches of 5 with Promise.allSettled
    const BATCH_SIZE = 5;
    for (let i = 0; i < usersArray.length; i += BATCH_SIZE) {
      const batch = usersArray.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (userAddress) => {
        try {
          const stats = await publicClient.readContract({
            address: CONTRACTS.SEERSLEAGUE,
            abi: SEERSLEAGUE_ABI,
            functionName: 'getUserStats',
            args: [userAddress as `0x${string}`]
          }) as unknown as {
            correctPredictions: bigint;
            totalPredictions: bigint;
            freePredictionsUsed: bigint;
            currentStreak: bigint;
            longestStreak: bigint;
          };

          const totalPredictions = Number(stats.totalPredictions || 0);

          // CRITICAL: Use REAL correctPredictions from events, NOT from contract
          // Contract has duplicate bug (batchRecordResults called multiple times)
          const realCorrectPredictions = userCorrectCounts.get(userAddress) || 0;

          if (totalPredictions > 0) {
            const accuracy = Math.round((realCorrectPredictions / totalPredictions) * 100);

            return {
              rank: 0,
              address: userAddress,
              accuracy,
              totalPredictions,
              correctPredictions: realCorrectPredictions, // Use event count, not contract
              currentStreak: Number(stats.currentStreak || 0),
              longestStreak: Number(stats.longestStreak || 0)
            };
          }
          return null;
        } catch (error) {
          console.error(`[Leaderboard] Error for ${userAddress}:`, error);
          return null;
        }
      });

      const results = await Promise.allSettled(batchPromises);

      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          leaderboardData.push(result.value);
          successCount++;
        } else {
          errorCount++;
        }
      });

      console.log(`[Leaderboard] Batch ${i / BATCH_SIZE + 1} complete: ${successCount} success, ${errorCount} errors`);
    }

    console.log(`[Leaderboard] Final: Success ${successCount}, Errors ${errorCount}`);

    // Sort leaderboard - FIXED LOGIC
    // PRIMARY: correctPredictions (most correct wins!)
    // SECONDARY: accuracy (if same correct, higher % wins)
    // TERTIARY: totalPredictions (if still tied, more participation wins)
    leaderboardData.sort((a, b) => {
      // 1. Most important: Who got MORE correct predictions?
      if (a.correctPredictions !== b.correctPredictions) {
        return b.correctPredictions - a.correctPredictions;
      }
      // 2. If same correct: Who has HIGHER accuracy?
      if (a.accuracy !== b.accuracy) {
        return b.accuracy - a.accuracy;
      }
      // 3. If still tied: Who made MORE predictions (more active)?
      if (a.totalPredictions !== b.totalPredictions) {
        return b.totalPredictions - a.totalPredictions;
      }
      // 4. Final tiebreaker: current streak
      return b.currentStreak - a.currentStreak;
    });

    // Assign ranks
    leaderboardData.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    console.log(`Generated leaderboard with ${leaderboardData.length} entries (out of ${totalUniqueUsers} total users)`);
    return {
      leaderboard: leaderboardData,
      totalUsers: totalUniqueUsers
    };

  } catch (error) {
    console.error('Error generating leaderboard from contract:', error);
    return { leaderboard: [], totalUsers: 0 };
  }
}

// Trigger background update if data is stale (> 1 hour old)
async function triggerUpdateIfStale() {
  try {
    const lastUpdated = await kv.get<string>('leaderboard:lastUpdated');

    if (!lastUpdated) {
      // No data yet, trigger update
      triggerBackgroundUpdate();
      return;
    }

    const lastUpdateTime = new Date(lastUpdated).getTime();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // If data is older than 1 hour, trigger background update
    if (now - lastUpdateTime > oneHour) {
      console.log('Leaderboard data is stale, triggering background update...');
      triggerBackgroundUpdate();
    }
  } catch (error) {
    console.error('Error checking leaderboard staleness:', error);
  }
}

// Trigger background update without blocking response
function triggerBackgroundUpdate() {
  // Don't await - let it run in background
  fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/cron/update-leaderboard`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      'Content-Type': 'application/json'
    }
  }).catch(err => {
    console.error('Background update failed:', err);
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('address');

    // Trigger update if data is stale (non-blocking)
    triggerUpdateIfStale();

    // Always generate leaderboard directly from contract (KV is unreliable)
    console.log('Generating leaderboard directly from contract...');
    let leaderboard: LeaderboardEntry[] = [];
    let totalUsers = 0;
    try {
      const result = await generateLeaderboardFromContract();
      leaderboard = result.leaderboard;
      totalUsers = result.totalUsers;
      console.log(`Generated leaderboard with ${leaderboard.length} entries out of ${totalUsers} total users`);
    } catch (contractError) {
      console.error('Contract fetch failed:', contractError);
      leaderboard = [];
      totalUsers = 0;
    }

    if (!leaderboard || leaderboard.length === 0) {
      console.log('No leaderboard data found, triggering update...');
      return NextResponse.json({
        leaderboard: [],
        topPlayers: [],
        userRank: null,
        totalPlayers: 0,
        needsUpdate: true,
        message: 'No data available, update in progress...'
      });
    }

    // Get top 20 players (already limited in generateLeaderboardFromContract)
    const topPlayers = leaderboard.slice(0, 20);

    // Find user rank if address provided
    let userRank = null;
    if (userAddress) {
      const userIndex = leaderboard.findIndex(
        entry => entry.address.toLowerCase() === userAddress.toLowerCase()
      );
      if (userIndex !== -1) {
        userRank = {
          ...leaderboard[userIndex],
          rank: userIndex + 1
        };
      }
    }

    return NextResponse.json({
      leaderboard: topPlayers,
      topPlayers,
      userRank,
      totalPlayers: totalUsers, // Total unique users who made predictions
      lastUpdated: await kv.get('leaderboard:lastUpdated')
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
