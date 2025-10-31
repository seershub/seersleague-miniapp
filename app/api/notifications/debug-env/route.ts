/**
 * Debug endpoint to check ALL environment variables related to notifications
 * This helps identify naming mismatches
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Check all possible variations
  const envCheck = {
    timestamp: new Date().toISOString(),
    looking_for: {
      NOTIFY_REST_API_URL: process.env.NOTIFY_REST_API_URL || '❌ Not found',
      NOTIFY_REST_API_TOKEN: process.env.NOTIFY_REST_API_TOKEN || '❌ Not found',
      NOTIFY_REST_API_READ_ONLY_TOKEN: process.env.NOTIFY_REST_API_READ_ONLY_TOKEN || '❌ Not found',
    },
    all_notify_vars: {} as Record<string, string>,
    all_upstash_vars: {} as Record<string, string>,
    all_kv_vars: {} as Record<string, string>,
  };

  // Find all NOTIFY_* variables
  Object.keys(process.env).forEach((key) => {
    if (key.startsWith('NOTIFY_')) {
      envCheck.all_notify_vars[key] = process.env[key]
        ? `✅ Set (${process.env[key]?.substring(0, 20)}...)`
        : '❌ Empty';
    }
    if (key.startsWith('UPSTASH_')) {
      envCheck.all_upstash_vars[key] = process.env[key]
        ? `✅ Set (${process.env[key]?.substring(0, 20)}...)`
        : '❌ Empty';
    }
    if (key.startsWith('KV_')) {
      envCheck.all_kv_vars[key] = process.env[key]
        ? `✅ Set (${process.env[key]?.substring(0, 20)}...)`
        : '❌ Empty';
    }
  });

  return NextResponse.json(envCheck, { status: 200 });
}
