import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SimpleLeaderboardEntry {
  rank: number;
  address: string;
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Fast leaderboard endpoint - reads from KV cache
 * Data is updated by /api/cron/update-leaderboard (runs daily)
 */
export async function GET() {
  try {
    console.log('[Simple Leaderboard] Reading from KV cache...');
    
    // Read cached leaderboard from KV
    const cachedLeaderboard = await kv.get<SimpleLeaderboardEntry[]>('leaderboard:all');
    const lastUpdated = await kv.get<string>('leaderboard:lastUpdated');
    
    if (cachedLeaderboard && cachedLeaderboard.length > 0) {
      console.log(`[Simple Leaderboard] Returning ${cachedLeaderboard.length} entries from cache`);
      return NextResponse.json({
        success: true,
        totalPlayers: cachedLeaderboard.length,
        leaderboard: cachedLeaderboard,
        topPlayers: cachedLeaderboard.slice(0, 65),
        lastUpdated: lastUpdated || new Date().toISOString(),
        source: 'cache'
      });
    }
    
    // No cache found
    console.log('[Simple Leaderboard] No cache found');
    return NextResponse.json({
      success: true,
      totalPlayers: 0,
      leaderboard: [],
      topPlayers: [],
      lastUpdated: new Date().toISOString(),
      source: 'empty',
      message: 'Leaderboard is being updated. Please refresh in a moment.'
    });

  } catch (error) {
    console.error('[Simple Leaderboard] Error:', error);
    
    // Return empty on error
    return NextResponse.json({
      success: true,
      totalPlayers: 0,
      leaderboard: [],
      topPlayers: [],
      lastUpdated: new Date().toISOString(),
      source: 'error',
      message: 'Unable to load leaderboard. Please try again.'
    });
  }
}
