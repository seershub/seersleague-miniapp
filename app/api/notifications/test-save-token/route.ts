/**
 * Test endpoint to manually save a notification token
 * Use this to bypass webhook and directly save token to Redis
 */

import { NextRequest, NextResponse } from 'next/server';
import { saveNotificationDetails } from '@/lib/notifications/storage';

export const dynamic = 'force-dynamic';

interface TestSaveBody {
  fid: number;
  appFid?: number;
  url?: string;
  token?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TestSaveBody = await request.json();
    const { fid, appFid = 309857, url, token } = body;

    if (!fid) {
      return NextResponse.json({ error: 'fid is required' }, { status: 400 });
    }

    // Use test values if not provided
    const testUrl = url || 'https://api.farcaster.xyz/v1/frame-notifications';
    const testToken = token || `test-token-${fid}-${Date.now()}`;

    await saveNotificationDetails(fid, appFid, {
      url: testUrl,
      token: testToken,
    });

    return NextResponse.json({
      success: true,
      message: 'Token saved successfully',
      saved: {
        fid,
        appFid,
        url: testUrl,
        token: testToken.substring(0, 20) + '...',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to save token',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to save a test token',
    example: {
      method: 'POST',
      body: {
        fid: 1076503,
        appFid: 309857,
        url: 'https://api.farcaster.xyz/v1/frame-notifications',
        token: 'your-test-token',
      },
    },
  });
}
