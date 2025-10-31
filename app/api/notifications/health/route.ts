/**
 * Debug endpoint to check notification system health
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks: {
    timestamp: string;
    environment: {
      NOTIFY_REST_API_URL: string;
      NOTIFY_REST_API_TOKEN: string;
    };
    runtime: string;
    redis?: string;
    error?: string;
  } = {
    timestamp: new Date().toISOString(),
    environment: {
      NOTIFY_REST_API_URL: process.env.NOTIFY_REST_API_URL ? '✅ Set' : '❌ Missing',
      NOTIFY_REST_API_TOKEN: process.env.NOTIFY_REST_API_TOKEN ? '✅ Set' : '❌ Missing',
    },
    runtime: 'nodejs',
  };

  // Test Redis connection
  try {
    const { Redis } = await import('@upstash/redis');

    if (!process.env.NOTIFY_REST_API_URL || !process.env.NOTIFY_REST_API_TOKEN) {
      checks.redis = '❌ Environment variables missing';
      checks.error = 'NOTIFY_REST_API_URL or NOTIFY_REST_API_TOKEN not set';
      return NextResponse.json(checks);
    }

    const redis = new Redis({
      url: process.env.NOTIFY_REST_API_URL,
      token: process.env.NOTIFY_REST_API_TOKEN,
    });

    // Simple ping test
    await redis.set('health-check', Date.now(), { ex: 10 });
    const value = await redis.get('health-check');

    checks.redis = value ? '✅ Connected' : '⚠️ Set failed';
  } catch (error) {
    checks.redis = `❌ Error: ${error instanceof Error ? error.message : String(error)}`;
  }

  return NextResponse.json(checks);
}
