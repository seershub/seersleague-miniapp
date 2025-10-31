/**
 * Debug endpoint to check notification system health
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Check for both possible variable names (with and without __KV)
  const redisUrl = process.env.NOTIFY__KV_REST_API_URL || process.env.NOTIFY_REST_API_URL;
  const redisToken = process.env.NOTIFY__KV_REST_API_TOKEN || process.env.NOTIFY_REST_API_TOKEN;

  const checks: {
    timestamp: string;
    environment: {
      found_variables: string;
      NOTIFY__KV_REST_API_URL?: string;
      NOTIFY_REST_API_URL?: string;
      redis_url_used?: string;
    };
    runtime: string;
    redis?: string;
    error?: string;
  } = {
    timestamp: new Date().toISOString(),
    environment: {
      found_variables: '',
      NOTIFY__KV_REST_API_URL: process.env.NOTIFY__KV_REST_API_URL ? '✅ Set' : '❌ Missing',
      NOTIFY_REST_API_URL: process.env.NOTIFY_REST_API_URL ? '✅ Set' : '❌ Missing',
      redis_url_used: redisUrl ? `✅ Using: ${redisUrl.substring(0, 30)}...` : '❌ None found',
    },
    runtime: 'nodejs',
  };

  checks.environment.found_variables = redisUrl && redisToken ? '✅ Found' : '❌ Missing';

  // Test Redis connection
  try {
    const { Redis } = await import('@upstash/redis');

    if (!redisUrl || !redisToken) {
      checks.redis = '❌ Environment variables missing';
      checks.error = 'NOTIFY__KV_REST_API_URL or NOTIFY_REST_API_URL not set';
      return NextResponse.json(checks);
    }

    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
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
