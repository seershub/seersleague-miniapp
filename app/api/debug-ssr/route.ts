import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Debug SSR Configuration
 * Checks if SSR can properly fetch matches
 */
export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    vercelUrl: process.env.VERCEL_URL || 'NOT SET',
    nodeEnv: process.env.NODE_ENV,
    deployment: process.env.VERCEL ? 'Vercel' : 'Local',

    // Construct the URL that SSR uses
    protocol: process.env.VERCEL_URL ? 'https' : 'http',
    host: process.env.VERCEL_URL || 'localhost:3000',
  };

  const baseUrl = `${diagnostics.protocol}://${diagnostics.host}`;

  // Try to fetch matches like SSR does
  let ssrFetchResult = null;
  try {
    const response = await fetch(`${baseUrl}/api/matches?limit=20`, {
      cache: 'no-store'
    });

    if (response.ok) {
      const data = await response.json();
      ssrFetchResult = {
        success: true,
        status: response.status,
        matchesCount: data.matches?.length || 0,
        total: data.total
      };
    } else {
      ssrFetchResult = {
        success: false,
        status: response.status,
        error: `HTTP ${response.status}`
      };
    }
  } catch (error) {
    ssrFetchResult = {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  return NextResponse.json({
    diagnostics,
    baseUrl,
    ssrFetchResult,
    verdict: ssrFetchResult?.success
      ? '✅ SSR should work correctly'
      : '❌ SSR WILL FAIL - This causes matches to disappear!'
  });
}
