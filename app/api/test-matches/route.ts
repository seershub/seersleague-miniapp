import { NextResponse } from 'next/server';

const SPORTS_DB_BASE = 'https://www.thesportsdb.com/api/v1/json';
const API_KEY = process.env.SPORTS_DB_API_KEY || '3';

export async function GET() {
  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    console.log('=== TESTING API FOR DATE:', dateStr, '===');
    
    // Test different approaches
    const tests = [];
    
    // Test 1: Premier League (4328)
    const testUrl1 = `${SPORTS_DB_BASE}/${API_KEY}/eventsday.php?d=${dateStr}&l=4328`;
    console.log('Test URL 1:', testUrl1);
    const response1 = await fetch(testUrl1);
    const data1 = await response1.json();
    tests.push({
      test: 'Premier League (4328)',
      url: testUrl1,
      eventsCount: data1.events ? data1.events.length : 0,
      response: data1
    });
    
    // Test 2: Different date format (DD-MM-YYYY)
    const dateStr2 = dateStr.split('-').reverse().join('-');
    const testUrl2 = `${SPORTS_DB_BASE}/${API_KEY}/eventsday.php?d=${dateStr2}&l=4328`;
    console.log('Test URL 2:', testUrl2);
    const response2 = await fetch(testUrl2);
    const data2 = await response2.json();
    tests.push({
      test: 'Premier League (DD-MM-YYYY)',
      url: testUrl2,
      eventsCount: data2.events ? data2.events.length : 0,
      response: data2
    });
    
    // Test 3: Different league (La Liga - 4335)
    const testUrl3 = `${SPORTS_DB_BASE}/${API_KEY}/eventsday.php?d=${dateStr}&l=4335`;
    console.log('Test URL 3:', testUrl3);
    const response3 = await fetch(testUrl3);
    const data3 = await response3.json();
    tests.push({
      test: 'La Liga (4335)',
      url: testUrl3,
      eventsCount: data3.events ? data3.events.length : 0,
      response: data3
    });
    
    // Test 4: Try upcoming matches endpoint
    const testUrl4 = `${SPORTS_DB_BASE}/${API_KEY}/eventsupcoming.php?id=4328`;
    console.log('Test URL 4:', testUrl4);
    const response4 = await fetch(testUrl4);
    const data4 = await response4.json();
    tests.push({
      test: 'Premier League Upcoming',
      url: testUrl4,
      eventsCount: data4.events ? data4.events.length : 0,
      response: data4
    });
    
    return NextResponse.json({
      date: dateStr,
      tests: tests
    });
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      date: new Date().toISOString().split('T')[0]
    }, { status: 500 });
  }
}
