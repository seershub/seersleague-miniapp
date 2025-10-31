/**
 * Debug endpoint to troubleshoot notification sending issues
 * Shows what FID you're using vs what FIDs have tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis, NOTIFICATION_KEY_PREFIX } from '@/lib/notifications/redis';
import { getNotificationDetails } from '@/lib/notifications/storage';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { fid, appFid = 309857 } = await request.json();

    // Get all tokens in Redis
    const allKeys = await redis.keys(`${NOTIFICATION_KEY_PREFIX}:*`);

    // Parse all FIDs from keys
    const allTokens: Array<{ fid: number; appFid: number; hasToken: boolean }> = [];

    for (const key of allKeys) {
      const parts = key.split(':');
      const keyFid = parseInt(parts[2]);
      const keyAppFid = parseInt(parts[3]);
      allTokens.push({
        fid: keyFid,
        appFid: keyAppFid,
        hasToken: true,
      });
    }

    // Check if the requested FID has a token
    const requestedToken = await getNotificationDetails(fid, appFid);

    return NextResponse.json({
      debug_info: {
        your_request: {
          fid,
          appFid,
          has_token: requestedToken !== null,
        },
        all_tokens_in_redis: allTokens,
        total_users_with_tokens: allTokens.length,
        match_found: allTokens.some(t => t.fid === fid && t.appFid === appFid),
        help: {
          message: 'If match_found is false, you are using a different FID than the one registered',
          solution: 'Use one of the FIDs listed in all_tokens_in_redis',
        },
      },
      requested_token_details: requestedToken,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to debug',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST with { "fid": YOUR_FID, "appFid": 309857 }',
  });
}
