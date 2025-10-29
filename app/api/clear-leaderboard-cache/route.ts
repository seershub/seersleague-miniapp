import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Clear stale leaderboard cache in Vercel KV
 * This forces the next request to regenerate from contract
 */
export async function POST(request: Request) {
  try {
    // Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Clear Cache] Deleting leaderboard cache keys...');

    // Delete both cache keys
    await kv.del('leaderboard:all');
    await kv.del('leaderboard:lastUpdated');

    console.log('[Clear Cache] ✅ Cache cleared successfully');

    return NextResponse.json({
      success: true,
      message: 'Leaderboard cache cleared. Next request will regenerate from contract.',
      cleared: ['leaderboard:all', 'leaderboard:lastUpdated']
    });

  } catch (error) {
    console.error('[Clear Cache] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'Clear Leaderboard Cache',
    description: 'Clears stale leaderboard cache in Vercel KV',
    method: 'POST',
    authentication: 'Bearer token required (CRON_SECRET)',
    usage: 'curl -X POST /api/clear-leaderboard-cache -H "Authorization: Bearer $CRON_SECRET"'
  });
}
