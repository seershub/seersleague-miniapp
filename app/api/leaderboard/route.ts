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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('address');

    // Get leaderboard from KV
    const leaderboard = await kv.get<LeaderboardEntry[]>('leaderboard:all');

    if (!leaderboard || leaderboard.length === 0) {
      return NextResponse.json({
        leaderboard: [],
        topPlayers: [],
        userRank: null,
        totalPlayers: 0
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
