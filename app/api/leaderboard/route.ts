import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

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

    // Get leaderboard from KV with error handling
    let leaderboard: LeaderboardEntry[] = [];
    try {
      const kvData = await kv.get<LeaderboardEntry[]>('leaderboard:all');
      leaderboard = kvData || [];
    } catch (kvError) {
      console.error('KV fetch error:', kvError);
      // Return empty data if KV fails
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

    // Get top 65 players
    const topPlayers = leaderboard.slice(0, 65);

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
      totalPlayers: leaderboard.length,
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
