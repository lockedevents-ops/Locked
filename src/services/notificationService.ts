/**
 * Admin Notification Service (Database-Backed)
 * --------------------------------------------------------------
 * UPDATED ROLE:
 *  - Database-backed admin notification management using Supabase
 *  - Per-user admin notification state (proper multi-admin support)
 *  - Async operations with proper error handling
 *
 * FEATURES:
 *  - Database persistence via Supabase
 *  - User-scoped admin notifications
 *  - Real-time capabilities through database triggers
 *  - Proper admin user role checking
 *
 * MIGRATION STATUS: COMPLETED
 *  - Replaced localStorage with Supabase database
 *  - Added proper multi-admin support
 *  - Maintained interface compatibility
 */
import { notificationDatabaseService, type DatabaseNotification } from '@/services/supabase/notificationDatabaseService';
import { createClient } from '@/lib/supabase/client/client';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type?: string;
  read: boolean;
  time: string;
  link?: string;
  [k: string]: any;
}

export interface CreateAdminNotificationInput {
  title: string;
  message: string;
  type?: string;
  link?: string;
  meta?: Record<string, any>;
}

// Transform database notification to AdminNotification format
function transformToAdminNotification(dbNotif: DatabaseNotification): AdminNotification {
  return {
    id: dbNotif.id,
    title: dbNotif.title,
    message: dbNotif.message,
    // Preserve the original type so UI filters (e.g., 'role_request') work
    type: dbNotif.type || (dbNotif.is_admin_notification ? 'admin' : undefined),
    read: dbNotif.is_read,
    time: dbNotif.created_at,
    link: dbNotif.link,
    ...(dbNotif.metadata || {})
  };
}

export const adminNotificationService = {
  /**
   * Get admin notifications for the current user
   */
  async list(userId?: string): Promise<AdminNotification[]> {
    try {
      let effectiveUserId = userId;
      
      if (!effectiveUserId) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        effectiveUserId = user?.id;
      }
      
      if (!effectiveUserId) {
        throw new Error('User not authenticated');
      }

      // Fetch admin notifications for the current user
      const dbNotifications = await notificationDatabaseService.fetchUserNotifications(effectiveUserId);
      const adminNotifications = dbNotifications
        .filter(notif => notif.is_admin_notification)
        .map(transformToAdminNotification);
      
      return adminNotifications;
    } catch (error) {
      console.error('Error listing admin notifications:', error);
      return [];
    }
  },

  /**
   * Create an admin notification (broadcasts to all admin users)
   */
  async create(input: CreateAdminNotificationInput): Promise<AdminNotification[]> {
    try {
      const notifications = await notificationDatabaseService.createAdminNotification({
        title: input.title,
        message: input.message,
        link: input.link,
        // Ensure the DB record has the correct type for filtering
        type: input.type as DatabaseNotification['type'],
        metadata: {
          ...(input.meta || {})
        }
      });

      return notifications.map(transformToAdminNotification);
    } catch (error) {
      console.error('Error creating admin notification:', error);
      throw error;
    }
  },

  /**
   * Mark an admin notification as read
   */
  async markRead(id: string): Promise<void> {
    try {
      await notificationDatabaseService.markAsRead(id);
    } catch (error) {
      console.error('Error marking admin notification as read:', error);
      throw error;
    }
  },

  /**
   * Mark all admin notifications as read for the current user
   */
  async markAllRead(userId?: string): Promise<void> {
    try {
      let effectiveUserId = userId;
      
      if (!effectiveUserId) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        effectiveUserId = user?.id;
      }
      
      if (!effectiveUserId) {
        throw new Error('User not authenticated');
      }

      await notificationDatabaseService.markAllAdminAsRead(effectiveUserId);
    } catch (error) {
      console.error('Error marking all admin notifications as read:', error);
      throw error;
    }
  },

  /**
   * Clear all admin notifications for the current user
   */
  async clear(userId?: string): Promise<void> {
    try {
      let effectiveUserId = userId;
      
      if (!effectiveUserId) {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        effectiveUserId = user?.id;
      }
      
      if (!effectiveUserId) {
        throw new Error('User not authenticated');
      }

      await notificationDatabaseService.deleteAllAdminNotifications(effectiveUserId);
    } catch (error) {
      console.error('Error clearing admin notifications:', error);
      throw error;
    }
  }
};

export type AdminNotificationDTO = AdminNotification;
