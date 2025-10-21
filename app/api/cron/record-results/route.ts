import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Vercel Cron Job: Record match results
 * Runs daily at 00:00 UTC
 *
 * This endpoint calls the record-results API to process finished matches
 * and update user stats on the blockchain.
 */
export async function GET(request: Request) {
  try {
    console.log('[CRON] Record results job started');

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('[CRON] CRON_SECRET not configured');
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      );
    }

    // Call the record-results API endpoint
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/record-results`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[CRON] Record results failed:', data);
      return NextResponse.json(
        { error: data.error || 'Failed to record results' },
        { status: response.status }
      );
    }

    console.log('[CRON] Record results completed:', data);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: data
    });

  } catch (error) {
    console.error('[CRON] Record results job error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST handler for manual triggering (requires auth)
 */
export async function POST(request: Request) {
  try {
    // Verify Vercel Cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Forward to GET handler
    return GET(request);

  } catch (error) {
    console.error('[CRON] Manual trigger error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
