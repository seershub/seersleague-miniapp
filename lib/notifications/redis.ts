/**
 * Upstash Redis client for notification token storage
 * Uses environment variables created by Vercel Upstash integration
 */

import { Redis } from '@upstash/redis';

// Get the correct environment variables (Vercel adds __KV suffix)
const REDIS_URL = process.env.NOTIFY__KV_REST_API_URL || process.env.NOTIFY_REST_API_URL;
const REDIS_TOKEN = process.env.NOTIFY__KV_REST_API_TOKEN || process.env.NOTIFY_REST_API_TOKEN;

if (!REDIS_URL || !REDIS_TOKEN) {
  throw new Error(
    'Missing Redis credentials. Please ensure NOTIFY__KV_REST_API_URL and NOTIFY__KV_REST_API_TOKEN are set.'
  );
}

// Initialize Redis client with Vercel environment variables
export const redis = new Redis({
  url: REDIS_URL,
  token: REDIS_TOKEN,
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
