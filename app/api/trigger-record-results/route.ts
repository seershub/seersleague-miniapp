import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Manual trigger for record-results endpoint
 * This endpoint calls the record-results API internally
 */
export async function GET() {
  try {
    console.log('[Trigger] Starting manual record-results trigger...');
    
    const recordResultsUrl = `${process.env.NEXT_PUBLIC_URL || 'https://league.seershub.com'}/api/record-results`;
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      );
    }

    // Call the record-results endpoint
    const response = await fetch(recordResultsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Record results failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Record results triggered successfully',
      result
    });

  } catch (error) {
    console.error('[Trigger] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to trigger record results', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Also allow POST method
export async function POST() {
  return GET();
}
