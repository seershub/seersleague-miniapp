/**
 * Debug endpoint to check Redis storage
 * Lists all notification tokens in Redis
 */

import { NextResponse } from 'next/server';
import { redis, NOTIFICATION_KEY_PREFIX } from '@/lib/notifications/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get all notification keys
    const pattern = `${NOTIFICATION_KEY_PREFIX}:*`;
    const keys = await redis.keys(pattern);

    const tokens: Record<string, any> = {};

    // Get all token data
    for (const key of keys) {
      const data = await redis.get(key);
      tokens[key] = data;
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      total_users: keys.length,
      pattern_searched: pattern,
      keys: keys,
      tokens: tokens,
      help: {
        message: 'If this is empty, webhook events are not being received or processed',
        check: 'Go to Vercel Dashboard → Functions → Logs → Filter: /api/webhook',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to read from Redis',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
