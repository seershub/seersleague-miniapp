import { NextResponse } from 'next/server';

const SPORTS_DB_BASE = 'https://www.thesportsdb.com/api/v1/json';
const API_KEY = process.env.SPORTS_DB_API_KEY || '123'; // Correct free API key

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
    
    let data1;
    let text1 = '';
    try {
      text1 = await response1.text();
      console.log('Response 1 text:', text1.substring(0, 500));
      data1 = JSON.parse(text1);
    } catch (parseError) {
      data1 = { error: 'JSON parse error', rawResponse: text1.substring(0, 200) };
    }
    
    tests.push({
      test: 'Premier League (4328)',
      url: testUrl1,
      status: response1.status,
      eventsCount: data1.events ? data1.events.length : 0,
      response: data1
    });
    
    // Test 2: Different date format (DD-MM-YYYY)
    const dateStr2 = dateStr.split('-').reverse().join('-');
    const testUrl2 = `${SPORTS_DB_BASE}/${API_KEY}/eventsday.php?d=${dateStr2}&l=4328`;
    console.log('Test URL 2:', testUrl2);
    const response2 = await fetch(testUrl2);
    
    let data2;
    let text2 = '';
    try {
      text2 = await response2.text();
      console.log('Response 2 text:', text2.substring(0, 500));
      data2 = JSON.parse(text2);
    } catch (parseError) {
      data2 = { error: 'JSON parse error', rawResponse: text2.substring(0, 200) };
    }
    
    tests.push({
      test: 'Premier League (DD-MM-YYYY)',
      url: testUrl2,
      status: response2.status,
      eventsCount: data2.events ? data2.events.length : 0,
      response: data2
    });
    
    // Test 3: Different league (La Liga - 4335)
    const testUrl3 = `${SPORTS_DB_BASE}/${API_KEY}/eventsday.php?d=${dateStr}&l=4335`;
    console.log('Test URL 3:', testUrl3);
    const response3 = await fetch(testUrl3);
    
    let data3;
    let text3 = '';
    try {
      text3 = await response3.text();
      console.log('Response 3 text:', text3.substring(0, 500));
      data3 = JSON.parse(text3);
    } catch (parseError) {
      data3 = { error: 'JSON parse error', rawResponse: text3.substring(0, 200) };
    }
    
    tests.push({
      test: 'La Liga (4335)',
      url: testUrl3,
      status: response3.status,
      eventsCount: data3.events ? data3.events.length : 0,
      response: data3
    });
    
    // Test 4: Try upcoming matches endpoint
    const testUrl4 = `${SPORTS_DB_BASE}/${API_KEY}/eventsupcoming.php?id=4328`;
    console.log('Test URL 4:', testUrl4);
    const response4 = await fetch(testUrl4);
    
    let data4;
    let text4 = '';
    try {
      text4 = await response4.text();
      console.log('Response 4 text:', text4.substring(0, 500));
      data4 = JSON.parse(text4);
    } catch (parseError) {
      data4 = { error: 'JSON parse error', rawResponse: text4.substring(0, 200) };
    }
    
    tests.push({
      test: 'Premier League Upcoming',
      url: testUrl4,
      status: response4.status,
      eventsCount: data4.events ? data4.events.length : 0,
      response: data4
    });
    
    // Test 5: Try season events endpoint (from documentation)
    const testUrl5 = `${SPORTS_DB_BASE}/${API_KEY}/eventsseason.php?id=4328&s=2024-2025`;
    console.log('Test URL 5:', testUrl5);
    const response5 = await fetch(testUrl5);
    
    let data5;
    let text5 = '';
    try {
      text5 = await response5.text();
      console.log('Response 5 text:', text5.substring(0, 500));
      data5 = JSON.parse(text5);
    } catch (parseError) {
      data5 = { error: 'JSON parse error', rawResponse: text5.substring(0, 200) };
    }
    
    tests.push({
      test: 'Premier League Season 2024-2025',
      url: testUrl5,
      status: response5.status,
      eventsCount: data5.events ? data5.events.length : 0,
      response: data5
    });
    
    // Test 6: Try next 10 events in league (from documentation)
    const testUrl6 = `${SPORTS_DB_BASE}/${API_KEY}/eventsnextleague.php?id=4328`;
    console.log('Test URL 6:', testUrl6);
    const response6 = await fetch(testUrl6);
    
    let data6;
    let text6 = '';
    try {
      text6 = await response6.text();
      console.log('Response 6 text:', text6.substring(0, 500));
      data6 = JSON.parse(text6);
    } catch (parseError) {
      data6 = { error: 'JSON parse error', rawResponse: text6.substring(0, 200) };
    }
    
    tests.push({
      test: 'Premier League Next Events',
      url: testUrl6,
      status: response6.status,
      eventsCount: data6.events ? data6.events.length : 0,
      response: data6
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
