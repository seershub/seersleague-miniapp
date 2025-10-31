/**
 * Test endpoint to verify Neynar API key is configured correctly
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const neynarApiKey = process.env.NEYNAR_API_KEY;

  const status = {
    timestamp: new Date().toISOString(),
    neynar_api_key: neynarApiKey ? '✅ Set' : '❌ Missing',
    neynar_api_key_prefix: neynarApiKey ? `${neynarApiKey.substring(0, 8)}...` : 'N/A',
    webhook_verification: neynarApiKey ? '✅ Enabled' : '⚠️ Disabled (will fail)',
    ready_for_production: neynarApiKey ? '✅ Yes' : '❌ No',
  };

  return NextResponse.json(status);
}
