/**
 * Notification system exports
 */

export {
  saveNotificationDetails,
  getNotificationDetails,
  deleteNotificationDetails,
  hasNotificationsEnabled,
  type NotificationDetails,
} from './storage';

export {
  sendNotification,
  sendBulkNotifications,
  type SendNotificationRequest,
  type SendNotificationResponse,
  type SendNotificationResult,
} from './send';

export { redis, getNotificationKey, NOTIFICATION_KEY_PREFIX } from './redis';
