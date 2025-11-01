/**
 * Notification token storage functions
 * Handles saving, retrieving, and deleting notification tokens in Redis
 */

import { redis, getNotificationKey } from './redis';

export interface NotificationDetails {
  url: string;
  token: string;
  createdAt?: string;
}

/**
 * Save notification details for a user
 * @param fid - User's Farcaster ID
 * @param appFid - Client app's Farcaster ID
 * @param details - Notification URL and token
 */
export async function saveNotificationDetails(
  fid: number,
  appFid: number,
  details: { url: string; token: string }
): Promise<void> {
  const key = getNotificationKey(fid, appFid);
  const data: NotificationDetails = {
    ...details,
    createdAt: new Date().toISOString(),
  };

  await redis.set(key, JSON.stringify(data));
}

/**
 * Get notification details for a user
 * @param fid - User's Farcaster ID
 * @param appFid - Client app's Farcaster ID
 * @returns Notification details or null if not found
 */
export async function getNotificationDetails(
  fid: number,
  appFid: number
): Promise<NotificationDetails | null> {
  const key = getNotificationKey(fid, appFid);

  // Upstash Redis automatically parses JSON, so we don't need JSON.parse()
  const data = await redis.get<NotificationDetails>(key);

  if (!data) {
    return null;
  }

  return data;
}

/**
 * Delete notification details for a user
 * Called when user removes app or disables notifications
 * @param fid - User's Farcaster ID
 * @param appFid - Client app's Farcaster ID
 */
export async function deleteNotificationDetails(
  fid: number,
  appFid: number
): Promise<void> {
  const key = getNotificationKey(fid, appFid);
  await redis.del(key);
}

/**
 * Check if notifications are enabled for a user
 * @param fid - User's Farcaster ID
 * @param appFid - Client app's Farcaster ID
 */
export async function hasNotificationsEnabled(
  fid: number,
  appFid: number
): Promise<boolean> {
  const details = await getNotificationDetails(fid, appFid);
  return details !== null;
}
