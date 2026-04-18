/**
 * useAdminNotifications – Admin Notifications Hook (Database-Backed)
 * --------------------------------------------------------------
 * UPDATED ROLE:
 *  - Provides async database-backed admin notification management
 *  - Handles loading states and error handling
 *  - Maintains local state for UI reactivity
 *
 * FEATURES:
 *  - Database persistence via Supabase
 *  - Async operations with proper error handling
 *  - Loading and error states
 *  - Auto-refresh capabilities
 *
 * MIGRATION STATUS: COMPLETED
 *  - Replaced localStorage with Supabase database
 *  - Added async state management
 *  - Maintained interface compatibility
 */
import { useCallback, useEffect, useState } from 'react';
import { adminNotificationService, AdminNotificationDTO } from '@/services/notificationService';
import { useAuth } from '@/contexts/AuthContext';

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotificationDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isReady } = useAuth();

  const refresh = useCallback(async () => {
    // Don't attempt to fetch if user is not authenticated yet
    if (!user || !isReady) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await adminNotificationService.list();
      setNotifications(data);
    } catch (err) {
      console.error('Error refreshing admin notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user, isReady]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = useCallback(async (id: string) => {
    try {
      await adminNotificationService.markRead(id);
      // Optimistically update local state
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
      // Refresh to get the correct state
      refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    try {
      await adminNotificationService.markAllRead();
      // Optimistically update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read');
      // Refresh to get the correct state
      refresh();
    }
  }, [refresh]);

  const clear = useCallback(async () => {
    try {
      await adminNotificationService.clear();
      // Optimistically update local state
      setNotifications([]);
    } catch (err) {
      console.error('Error clearing notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear notifications');
      // Refresh to get the correct state
      refresh();
    }
  }, [refresh]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    markAllRead,
    clear,
    refresh
  };
}
