import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('Testing leaderboard update...');
    
    // Test the update endpoint
    const updateUrl = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/cron/update-leaderboard`;
    
    const response = await fetch(updateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Update failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Leaderboard update triggered successfully',
      result
    });

  } catch (error) {
    console.error('Test leaderboard error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test leaderboard update', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
