/**
 * notificationStore – End-User Notification Inbox (Database-Backed)
 * --------------------------------------------------------------
 * UPDATED ROLE:
 *  - Manages notification state with Supabase database persistence
 *  - Provides async methods for CRUD operations
 *  - Maintains local state for UI reactivity with database sync
 *
 * FEATURES:
 *  - Database-backed persistence via Supabase
 *  - Real-time updates through database triggers
 *  - Proper user-scoped notifications
 *  - Admin notification support
 *
 * MIGRATION STATUS: COMPLETED
 *  - Replaced localStorage with Supabase database
 *  - Added async methods for all operations
 *  - Maintained interface compatibility for existing components
 */
import { create } from 'zustand';
import { notificationDatabaseService, type DatabaseNotification } from '@/services/supabase/notificationDatabaseService';
import { createClient } from '@/lib/supabase/client/client';

export interface Notification {
  id: string;
  type: 'role_request' | 'event_approval' | 'event_rejection' | 'venue_approval' | 'venue_rejection' | 'system_message' | 'admin_message' | 'general';
  title: string;
  message: string;
  read: boolean;
  date: string;
  link?: string;
  metadata?: Record<string, any>;
}

// Transform database notification to UI notification
function transformDatabaseNotification(dbNotif: DatabaseNotification): Notification {
  return {
    id: dbNotif.id,
    type: dbNotif.type,
    title: dbNotif.title,
    message: dbNotif.message,
    read: dbNotif.is_read,
    date: dbNotif.created_at,
    link: dbNotif.link,
    metadata: dbNotif.metadata
  };
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  
  // Async database operations
  fetchNotifications: (userId?: string) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'date' | 'read'>, userId?: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userId?: string) => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  clearAll: (userId?: string) => Promise<void>;
  
  // Local state management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateLocalState: (notifications: Notification[]) => void;
}

export const useNotificationStore = create<NotificationStore>()((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  // Helper to get current user ID
  getCurrentUserId: async (): Promise<string | null> => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  },

  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  updateLocalState: (notifications) => {
    const unreadCount = notifications.filter(n => !n.read).length;
    set({ notifications, unreadCount });
  },

  fetchNotifications: async (userId) => {
    try {
      set({ loading: true, error: null });
      
      const effectiveUserId = userId || await (get() as any).getCurrentUserId();
      if (!effectiveUserId) {
        throw new Error('User not authenticated');
      }

      const dbNotifications = await notificationDatabaseService.fetchUserNotifications(effectiveUserId);
      const notifications = dbNotifications.map(transformDatabaseNotification);
      
      get().updateLocalState(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch notifications' });
    } finally {
      set({ loading: false });
    }
  },

  addNotification: async (notification, userId) => {
    try {
      const effectiveUserId = userId || await (get() as any).getCurrentUserId();
      if (!effectiveUserId) {
        throw new Error('User not authenticated');
      }

      await notificationDatabaseService.createNotification({
        user_id: effectiveUserId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        metadata: notification.metadata
      });

      // Refresh the notifications list
      await get().fetchNotifications(effectiveUserId);
    } catch (error) {
      console.error('Error adding notification:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to add notification' });
    }
  },

  markAsRead: async (id) => {
    try {
      await notificationDatabaseService.markAsRead(id);
      
      // Update local state optimistically
      const state = get();
      const notifications = state.notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      );
      state.updateLocalState(notifications);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to mark notification as read' });
    }
  },

  markAllAsRead: async (userId) => {
    try {
      const effectiveUserId = userId || await (get() as any).getCurrentUserId();
      if (!effectiveUserId) {
        throw new Error('User not authenticated');
      }

      await notificationDatabaseService.markAllAsRead(effectiveUserId);
      
      // Update local state optimistically
      const state = get();
      const notifications = state.notifications.map(n => ({ ...n, read: true }));
      state.updateLocalState(notifications);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to mark all notifications as read' });
    }
  },

  removeNotification: async (id) => {
    try {
      await notificationDatabaseService.deleteNotification(id);
      
      // Update local state optimistically
      const state = get();
      const notifications = state.notifications.filter(n => n.id !== id);
      state.updateLocalState(notifications);
    } catch (error) {
      console.error('Error removing notification:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to remove notification' });
    }
  },

  clearAll: async (userId) => {
    try {
      const effectiveUserId = userId || await (get() as any).getCurrentUserId();
      if (!effectiveUserId) {
        throw new Error('User not authenticated');
      }

      await notificationDatabaseService.deleteAllUserNotifications(effectiveUserId);
      
      // Update local state
      set({ notifications: [], unreadCount: 0 });
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to clear all notifications' });
    }
  }
}));
