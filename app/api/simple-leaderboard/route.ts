import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';
export const maxDuration = 10; // 10 seconds max

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
 * Fast leaderboard endpoint - reads from KV cache only
 * Data is updated by /api/cron/update-leaderboard every 10 minutes
 */
export async function GET() {
  try {
    console.log('[Simple Leaderboard] Reading from KV cache...');
    
    // Read cached leaderboard from KV (updated by cron job)
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
    
    // No cache found - return empty but don't fail
    console.log('[Simple Leaderboard] No cache found, returning empty leaderboard');
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
    
    // Return empty leaderboard on error to prevent UI from breaking
    return NextResponse.json({
      success: false,
      totalPlayers: 0,
      leaderboard: [],
      topPlayers: [],
      lastUpdated: new Date().toISOString(),
      source: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Unable to load leaderboard. Please try again later.'
    });
  }
}
