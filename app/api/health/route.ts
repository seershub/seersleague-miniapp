import { NextResponse } from 'next/server';

/**
 * SIMPLEST POSSIBLE ENDPOINT
 * NO RPC, NO EXTERNAL CALLS, JUST RETURN JSON
 *
 * If this times out → Vercel configuration problem!
 */
export async function GET() {
  return NextResponse.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    message: 'If you see this, basic endpoint works',
    env: {
      VERCEL_ENV: process.env.VERCEL_ENV || 'not-set',
      VERCEL_REGION: process.env.VERCEL_REGION || 'not-set',
      NODE_ENV: process.env.NODE_ENV || 'not-set',
    }
  });
}
