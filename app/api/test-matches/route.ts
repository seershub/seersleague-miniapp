import { NextResponse } from 'next/server';

const SPORTS_DB_BASE = 'https://www.thesportsdb.com/api/v1/json';
const API_KEY = process.env.SPORTS_DB_API_KEY || '3';

export async function GET() {
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    console.log('=== TESTING API FOR DATE:', dateStr, '===');
    
    // Test Premier League for today
    const testUrl = `${SPORTS_DB_BASE}/${API_KEY}/eventsday.php?d=${dateStr}&l=4328`;
    console.log('Test URL:', testUrl);
    
    const response = await fetch(testUrl);
    const data = await response.json();
    
    return NextResponse.json({
      date: dateStr,
      url: testUrl,
      response: data,
      eventsCount: data.events ? data.events.length : 0,
      sampleEvents: data.events ? data.events.slice(0, 3) : []
    });
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      date: new Date().toISOString().split('T')[0]
    }, { status: 500 });
  }
}
