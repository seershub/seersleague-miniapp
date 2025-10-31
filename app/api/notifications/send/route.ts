/**
 * Example API endpoint for sending notifications
 *
 * Usage:
 * POST /api/notifications/send
 * {
 *   "fid": 1076503,
 *   "appFid": 309857,
 *   "title": "New Match Available!",
 *   "body": "5 new matches are ready for prediction",
 *   "targetUrl": "https://league.seershub.com" // optional
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notifications';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

interface SendNotificationBody {
  fid: number;
  appFid: number;
  title: string;
  body: string;
  targetUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SendNotificationBody = await request.json();
    const { fid, appFid, title, body: notificationBody, targetUrl } = body;

    // Validate input
    if (!fid || !appFid || !title || !notificationBody) {
      return NextResponse.json(
        { error: 'Missing required fields: fid, appFid, title, body' },
        { status: 400 }
      );
    }

    // Send notification
    const result = await sendNotification(fid, appFid, title, notificationBody, targetUrl);

    switch (result.state) {
      case 'success':
        return NextResponse.json({ success: true, message: 'Notification sent successfully' });

      case 'no_token':
        return NextResponse.json(
          { error: 'User has not enabled notifications' },
          { status: 404 }
        );

      case 'rate_limit':
        return NextResponse.json(
          { error: 'Rate limit exceeded. Try again later.' },
          { status: 429 }
        );

      case 'error':
        return NextResponse.json(
          { error: 'Failed to send notification', details: result.error },
          { status: 500 }
        );

      default:
        return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in send notification endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
