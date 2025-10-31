/**
 * Webhook endpoint for Farcaster/Base miniapp events
 *
 * CRITICAL: This endpoint must respond within 10 seconds to avoid timeout on Base app.
 * We use fire-and-forget pattern for token storage to ensure fast response.
 *
 * Events received:
 * - miniapp_added: User adds the Mini App
 * - miniapp_removed: User removes the Mini App
 * - notifications_enabled: User enables notifications
 * - notifications_disabled: User disables notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseWebhookEvent, verifyAppKeyWithNeynar } from '@farcaster/miniapp-node';
import {
  saveNotificationDetails,
  deleteNotificationDetails,
} from '@/lib/notifications/storage';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[Webhook] 📥 Incoming request received');

    // Parse the request body
    const requestJson = await request.json();
    console.log('[Webhook] ✅ Request body parsed');

    // Check if Neynar API key is available
    if (!process.env.NEYNAR_API_KEY) {
      console.error('[Webhook] ❌ NEYNAR_API_KEY not found!');
      return NextResponse.json(
        { error: 'Webhook verification not configured' },
        { status: 500 }
      );
    }

    console.log('[Webhook] 🔐 Verifying with Neynar...');

    // Parse and verify the webhook event
    let data;
    try {
      data = await parseWebhookEvent(requestJson, verifyAppKeyWithNeynar);
      console.log('[Webhook] ✅ Verification successful!');
    } catch (error) {
      console.error('[Webhook] ❌ Verification failed:', error);
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const { fid, appFid, event } = data;

    console.log(`[Webhook] 📨 Event: ${event.event} | FID: ${fid} | AppFID: ${appFid}`);

    // CRITICAL: Respond immediately (within 10 seconds for Base app)
    // Process token storage asynchronously after response
    const response = NextResponse.json({ success: true });

    // Fire-and-forget: Process event after sending response
    // This ensures we respond quickly to avoid timeout
    Promise.resolve().then(async () => {
      try {
        switch (event.event) {
          case 'miniapp_added':
            if (event.notificationDetails) {
              await saveNotificationDetails(fid, appFid, event.notificationDetails);
              console.log(`[Webhook] Saved notification token for fid=${fid}, appFid=${appFid}`);
            }
            break;

          case 'miniapp_removed':
            await deleteNotificationDetails(fid, appFid);
            console.log(`[Webhook] Deleted notification token for fid=${fid}, appFid=${appFid}`);
            break;

          case 'notifications_enabled':
            if (event.notificationDetails) {
              await saveNotificationDetails(fid, appFid, event.notificationDetails);
              console.log(`[Webhook] Enabled notifications for fid=${fid}, appFid=${appFid}`);
            }
            break;

          case 'notifications_disabled':
            await deleteNotificationDetails(fid, appFid);
            console.log(`[Webhook] Disabled notifications for fid=${fid}, appFid=${appFid}`);
            break;

          default:
            console.warn(`[Webhook] Unknown event type: ${(event as any).event}`);
        }
      } catch (error) {
        console.error('[Webhook] Error processing event:', error);
      }
    });

    return response;
  } catch (error) {
    console.error('[Webhook] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
