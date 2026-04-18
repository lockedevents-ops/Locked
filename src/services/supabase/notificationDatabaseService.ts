/**
 * Notification Database Service
 * --------------------------------------------------------------
 * Provides database-backed notification functionality using Supabase.
 * Replaces localStorage-based notification storage with persistent database storage.
 * Supports both admin notifications and user notifications.
 */

import { createClient } from '@/lib/supabase/client/client';

export interface DatabaseNotification {
  id: string;
  user_id: string;
  type: 'role_request' | 'event_approval' | 'event_rejection' | 'venue_approval' | 'venue_rejection' | 'system_message' | 'admin_message' | 'general';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  link?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  expires_at?: string;
  is_admin_notification: boolean;
  created_by?: string;
}

export interface CreateNotificationInput {
  user_id: string;
  type: 'role_request' | 'event_approval' | 'event_rejection' | 'venue_approval' | 'venue_rejection' | 'system_message' | 'admin_message' | 'general';
  title: string;
  message: string;
  link?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, any>;
  expires_at?: string;
  is_admin_notification?: boolean;
  created_by?: string;
}

export const notificationDatabaseService = {
  /**
   * Fetch notifications for a specific user
   */
  async fetchUserNotifications(userId: string, limit = 50): Promise<DatabaseNotification[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Fetch admin notifications (notifications with is_admin_notification = true)
   */
  async fetchAdminNotifications(limit = 100): Promise<DatabaseNotification[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_admin_notification', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching admin notifications:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Create a new notification
   */
  async createNotification(input: CreateNotificationInput): Promise<DatabaseNotification> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: input.user_id,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        priority: input.priority || 'normal',
        metadata: input.metadata || {},
        expires_at: input.expires_at,
        is_admin_notification: input.is_admin_notification || false,
        created_by: input.created_by,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      throw error;
    }

    return data;
  },

  /**
   * Create an admin notification (broadcasts to all admin users)
   * Uses the new database function for better RLS handling
   */
  async createAdminNotification(input: {
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, any>;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    type?: DatabaseNotification['type'];
  }): Promise<DatabaseNotification[]> {
    const supabase = createClient();
    
    try {
      const { data: createdNotifications, error } = await supabase
        .rpc('notify_admins', {
          p_title: input.title,
          p_message: input.message,
          p_type: input.type || 'admin_message',
          p_link: input.link || null,
          p_metadata: input.metadata || {},
          p_priority: input.priority || 'normal'
        });

      if (error) {
        // Fallback to the old method if the new function doesn't exist yet
        // PGRST202 is the PostgREST error for function not found in schema cache
        if (error.code === '42883' || error.code === 'PGRST202' || error.message?.includes('does not exist')) {
          console.warn('⚠️ Notification function not available, falling back to old method. Please run notifications.sql migration');
          return await this.createAdminNotificationFallback(input);
        }
        console.error('Error creating admin notifications:', error);
        throw error;
      }

      if (!createdNotifications || createdNotifications.length === 0) {
        console.warn('⚠️ No admin users found in database. Admin notifications will not be created.');
        return [];
      }

      // Fetch the full notification records that were created
  // createdNotifications returned by RPC: array of objects with notification_id
  const notificationIds = (createdNotifications as { notification_id: string }[]).map((n) => n.notification_id);
      const { data: fullNotifications, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .in('id', notificationIds);

      if (fetchError) {
        console.error('Error fetching created admin notifications:', fetchError);
        throw fetchError;
      }

      return fullNotifications || [];
    } catch (error) {
      console.error('Failed to create admin notification:', error);
      // Try fallback method as last resort
      try {
        return await this.createAdminNotificationFallback(input);
      } catch (fallbackError) {
        console.error('Fallback admin notification method also failed:', fallbackError);
        throw error; // Throw original error
      }
    }
  },

  /**
   * Fallback method for creating admin notifications (legacy)
   * Used when the new database function is not available
   */
  async createAdminNotificationFallback(input: {
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, any>;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    type?: DatabaseNotification['type'];
  }): Promise<DatabaseNotification[]> {
    const supabase = createClient();
    
    // First, get all users with admin roles
    const { data: adminUsers, error: adminError } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'super_admin', 'support_agent']);

    if (adminError) {
      console.error('Error fetching admin users:', adminError);
      throw adminError;
    }

    if (!adminUsers || adminUsers.length === 0) {
      console.warn('⚠️ No admin users found for notification broadcast');
      return [];
    }

    // Create notifications for all admin users
    const notifications = adminUsers.map((admin: any) => ({
      user_id: admin.user_id,
      type: (input.type || 'admin_message') as DatabaseNotification['type'],
      title: input.title,
      message: input.message,
      link: input.link,
      priority: input.priority || 'normal',
      metadata: input.metadata || {},
      expires_at: null,
      is_admin_notification: true,
      created_by: null,
      is_read: false
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      console.error('Error creating admin notifications (fallback):', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<DatabaseNotification> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }

    return data;
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  /**
   * Mark all admin notifications as read for a user
   */
  async markAllAdminAsRead(userId: string): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        updated_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .eq('is_admin_notification', true)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all admin notifications as read:', error);
      throw error;
    }
  },

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  /**
   * Delete all notifications for a user
   */
  async deleteAllUserNotifications(userId: string): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting all user notifications:', error);
      throw error;
    }
  },

  /**
   * Delete all admin notifications for a user
   */
  async deleteAllAdminNotifications(userId: string): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_admin_notification', true);

    if (error) {
      console.error('Error deleting all admin notifications:', error);
      throw error;
    }
  },

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const supabase = createClient();
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }

    return count || 0;
  },

  /**
   * Get unread admin notification count for a user
   */
  async getUnreadAdminCount(userId: string): Promise<number> {
    const supabase = createClient();
    
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_admin_notification', true)
      .eq('is_read', false);

    if (error) {
      console.error('Error getting unread admin count:', error);
      throw error;
    }

    return count || 0;
  }
};
