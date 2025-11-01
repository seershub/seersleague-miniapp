/**
 * Send notifications to users via Farcaster/Base notification system
 */

import { getNotificationDetails } from './storage';

export interface SendNotificationRequest {
  notificationId: string; // Unique ID for idempotency (max 128 chars)
  title: string; // Max 32 characters
  body: string; // Max 128 characters
  targetUrl: string; // URL to open when clicked (max 1024 chars, same domain)
  tokens: string[]; // Max 100 tokens
}

export interface SendNotificationResponse {
  result: {
    successfulTokens: string[];
    invalidTokens: string[];
    rateLimitedTokens: string[];
  };
}

export type SendNotificationResult =
  | { state: 'success' }
  | { state: 'no_token' }
  | { state: 'rate_limit' }
  | { state: 'error'; error: unknown };

/**
 * Send a notification to a specific user
 * @param fid - User's Farcaster ID
 * @param appFid - Client app's Farcaster ID (309857 for Base)
 * @param title - Notification title (max 32 chars)
 * @param body - Notification body (max 128 chars)
 * @param targetUrl - Optional URL to open (defaults to home page)
 */
export async function sendNotification(
  fid: number,
  appFid: number,
  title: string,
  body: string,
  targetUrl?: string
): Promise<SendNotificationResult> {
  console.log(`[SendNotif] 🚀 Sending notification to fid=${fid}, appFid=${appFid}`);

  // Get user's notification details from Redis
  const notificationDetails = await getNotificationDetails(fid, appFid);

  if (!notificationDetails) {
    console.log(`[SendNotif] ❌ No token found for fid=${fid}, appFid=${appFid}`);
    return { state: 'no_token' };
  }

  console.log(`[SendNotif] ✅ Token found: ${notificationDetails.token.substring(0, 20)}...`);
  console.log(`[SendNotif] 🌐 Notification URL: ${notificationDetails.url}`);

  // Use provided targetUrl or default to home page
  const url = targetUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://league.seershub.com';

  // Generate unique notification ID for idempotency
  const notificationId = `${Date.now()}-${fid}-${Math.random().toString(36).substring(7)}`;

  const payload: SendNotificationRequest = {
    notificationId,
    title: title.substring(0, 32), // Ensure max 32 chars
    body: body.substring(0, 128), // Ensure max 128 chars
    targetUrl: url.substring(0, 1024), // Ensure max 1024 chars
    tokens: [notificationDetails.token],
  };

  console.log(`[SendNotif] 📦 Payload: ${JSON.stringify(payload)}`);

  try {
    const startTime = Date.now();
    const response = await fetch(notificationDetails.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const duration = Date.now() - startTime;

    console.log(`[SendNotif] 📡 Response status: ${response.status} (${duration}ms)`);

    if (response.status === 200) {
      const responseData: SendNotificationResponse = await response.json();
      console.log(`[SendNotif] 📊 Response data: ${JSON.stringify(responseData)}`);

      if (responseData.result.rateLimitedTokens.length > 0) {
        console.log(`[SendNotif] ⏱️ Rate limited!`);
        return { state: 'rate_limit' };
      }

      if (responseData.result.invalidTokens.length > 0) {
        // Token is invalid, should be removed from database
        console.warn(`[SendNotif] ⚠️ Invalid token for fid ${fid}, appFid ${appFid}`);
        return { state: 'error', error: 'Invalid token' };
      }

      console.log(`[SendNotif] ✅ Notification sent successfully!`);
      return { state: 'success' };
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[SendNotif] ❌ Error response: ${JSON.stringify(errorData)}`);
      return { state: 'error', error: errorData };
    }
  } catch (error) {
    console.error('[SendNotif] ❌ Exception:', error);
    return { state: 'error', error };
  }
}

/**
 * Send notifications to multiple users
 * @param notifications - Array of { fid, appFid, title, body, targetUrl? }
 */
export async function sendBulkNotifications(
  notifications: Array<{
    fid: number;
    appFid: number;
    title: string;
    body: string;
    targetUrl?: string;
  }>
): Promise<{
  successful: number;
  failed: number;
  rateLimited: number;
}> {
  const results = await Promise.allSettled(
    notifications.map((notif) =>
      sendNotification(notif.fid, notif.appFid, notif.title, notif.body, notif.targetUrl)
    )
  );

  let successful = 0;
  let failed = 0;
  let rateLimited = 0;

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      if (result.value.state === 'success') {
        successful++;
      } else if (result.value.state === 'rate_limit') {
        rateLimited++;
      } else {
        failed++;
      }
    } else {
      failed++;
    }
  });

  return { successful, failed, rateLimited };
}
