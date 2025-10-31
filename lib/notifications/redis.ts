/**
 * Upstash Redis client for notification token storage
 * Uses environment variables created by Vercel Upstash integration
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client with Vercel environment variables
export const redis = new Redis({
  url: process.env.NOTIFY_REST_API_URL!,
  token: process.env.NOTIFY_REST_API_TOKEN!,
});

// Key prefix for notification tokens
export const NOTIFICATION_KEY_PREFIX = 'miniapp:notifications';

/**
 * Generate Redis key for a user's notification token
 * @param fid - User's Farcaster ID
 * @param appFid - Client app's Farcaster ID (309857 for Base)
 */
export function getNotificationKey(fid: number, appFid: number): string {
  return `${NOTIFICATION_KEY_PREFIX}:${fid}:${appFid}`;
}
