import { NextResponse } from 'next/server';

/**
 * Manual trigger for leaderboard update
 * This calls the cron endpoint to update the leaderboard immediately
 */
export async function GET() {
  try {
    console.log('[Trigger] Manually triggering leaderboard update...');
    
    const baseUrl = process.env.NEXT_PUBLIC_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const cronUrl = `${baseUrl}/api/cron/update-leaderboard`;
    
    console.log('[Trigger] Calling:', cronUrl);
    
    const response = await fetch(cronUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET || ''}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    console.log('[Trigger] Update response:', data);
    
    return NextResponse.json({
      success: response.ok,
      message: 'Leaderboard update triggered',
      updateResult: data
    });
    
  } catch (error) {
    console.error('[Trigger] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
