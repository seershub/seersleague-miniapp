import { NextResponse } from 'next/server';

const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';
const API_KEY = process.env.FOOTBALL_DATA_API_KEY || '';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  if (process.env.ENABLE_API_TESTS !== 'true') {
    return NextResponse.json({ success: false, disabled: true }, { status: 404 });
  }
  console.log('=== TESTING FOOTBALL-DATA.ORG API ===');
  
  const results = [];
  
  try {
    // Test 1: Get today's matches across all competitions
    const today = new Date().toISOString().split('T')[0];
    const todayUrl = `${FOOTBALL_DATA_BASE}/matches?date=${today}`;
    
    console.log('Test 1: Today\'s matches:', todayUrl);
    
    const todayResponse = await fetch(todayUrl, {
      headers: {
        'X-Auth-Token': API_KEY,
      },
    });
    
    const todayData = await todayResponse.json();
    results.push({
      test: 'Today\'s matches',
      url: todayUrl,
      status: todayResponse.status,
      matchesCount: todayData.matches?.length || 0,
      sampleMatch: todayData.matches?.[0] || null,
    });
    
    // Test 2: Get Turkish Super Lig matches
    const tslUrl = `${FOOTBALL_DATA_BASE}/competitions/TSL/matches?date=${today}&status=SCHEDULED`;
    
    console.log('Test 2: Turkish Super Lig today matches:', tslUrl);
    
    const tslResponse = await fetch(tslUrl, {
      headers: {
        'X-Auth-Token': API_KEY,
      },
    });
    
    const tslData = await tslResponse.json();
    results.push({
      test: 'Turkish Super Lig today matches',
      url: tslUrl,
      status: tslResponse.status,
      matchesCount: tslData.matches?.length || 0,
      sampleMatch: tslData.matches?.[0] || null,
    });
    
    // Test 3: Get tomorrow's matches
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const tomorrowUrl = `${FOOTBALL_DATA_BASE}/matches?date=${tomorrowStr}`;
    
    console.log('Test 3: Tomorrow\'s matches:', tomorrowUrl);
    
    const tomorrowResponse = await fetch(tomorrowUrl, {
      headers: {
        'X-Auth-Token': API_KEY,
      },
    });
    
    const tomorrowData = await tomorrowResponse.json();
    results.push({
      test: 'Tomorrow\'s matches',
      url: tomorrowUrl,
      status: tomorrowResponse.status,
      matchesCount: tomorrowData.matches?.length || 0,
      sampleMatch: tomorrowData.matches?.[0] || null,
    });
    
    // Test 4: Get Champions League matches
    const clUrl = `${FOOTBALL_DATA_BASE}/competitions/CL/matches?status=SCHEDULED`;
    
    console.log('Test 4: Champions League scheduled matches:', clUrl);
    
    const clResponse = await fetch(clUrl, {
      headers: {
        'X-Auth-Token': API_KEY,
      },
    });
    
    const clData = await clResponse.json();
    results.push({
      test: 'Champions League scheduled matches',
      url: clUrl,
      status: clResponse.status,
      matchesCount: clData.matches?.length || 0,
      sampleMatch: clData.matches?.[0] || null,
    });
    
    console.log('=== API TEST RESULTS ===');
    console.log('Results:', results);
    
    return NextResponse.json({
      success: true,
      date: today,
      tomorrow: tomorrowStr,
      results: results,
    });
    
  } catch (error) {
    console.error('Error testing Football-Data.org API:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      results: results,
    }, { status: 500 });
  }
}
