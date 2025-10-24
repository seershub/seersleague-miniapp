import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * MANUAL TRIGGER ENDPOINT
 * Calls record-results with proper authentication
 * Use this to manually trigger result recording
 */
export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json({
        error: 'CRON_SECRET not configured',
        hint: 'Add CRON_SECRET to environment variables',
        howTo: 'Generate with: openssl rand -hex 32'
      }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_URL ||
                    (request.headers.get('host')
                      ? `https://${request.headers.get('host')}`
                      : 'http://localhost:3000');

    console.log(`[Manual Trigger] Calling record-results at ${baseUrl}`);

    const response = await fetch(`${baseUrl}/api/record-results`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Manual Trigger] Failed:', data);
      return NextResponse.json({
        error: 'Record results failed',
        details: data,
        status: response.status
      }, { status: response.status });
    }

    console.log('[Manual Trigger] Success:', data);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: data
    });

  } catch (error: any) {
    console.error('[Manual Trigger] Error:', error);
    return NextResponse.json({
      error: error.message,
      hint: 'Check environment variables and try again'
    }, { status: 500 });
  }
}

/**
 * GET endpoint shows usage instructions
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'Manual Record Results Trigger',
    method: 'POST',
    description: 'Manually trigger match result recording',
    usage: 'POST /api/trigger-record-results',
    note: 'No authentication required for this endpoint',
    whatItDoes: [
      '1. Calls /api/record-results with proper authentication',
      '2. Records finished match results to blockchain',
      '3. Updates user stats (correct/incorrect predictions)',
      '4. Updates leaderboard data'
    ],
    requirements: [
      'CRON_SECRET must be set',
      'FOOTBALL_DATA_API_KEY must be set',
      'PRIVATE_KEY must be set (contract owner)',
      'NEXT_PUBLIC_URL must be set'
    ],
    testing: 'Visit /api/test-record-results first to check configuration'
  });
}
