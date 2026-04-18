import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdminNotifications } from '../useAdminNotifications';
import { adminNotificationService } from '@/services/notificationService';

// Mock the dependencies
jest.mock('@/services/notificationService');

const mockAdminNotificationService = adminNotificationService as jest.Mocked<typeof adminNotificationService>;

const mockNotifications = [
  {
    id: '1',
    title: 'Test Notification 1',
    message: 'This is a test notification',
    type: 'info',
    read: false,
    time: new Date().toISOString(),
  },
  {
    id: '2', 
    title: 'Test Notification 2',
    message: 'This is another test notification',
    type: 'warning',
    read: true,
    time: new Date().toISOString(),
  },
];

describe('useAdminNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminNotificationService.list.mockResolvedValue(mockNotifications);
    mockAdminNotificationService.markRead.mockResolvedValue(undefined);
    mockAdminNotificationService.markAllRead.mockResolvedValue(undefined);
    mockAdminNotificationService.clear.mockResolvedValue(undefined);
  });

  it('should initialize with notifications from the service', async () => {
    const { result } = renderHook(() => useAdminNotifications());

    // Initially loading should be true and notifications empty
    expect(result.current.loading).toBe(false); // Initial state
    expect(result.current.notifications).toEqual([]);

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(result.current.notifications).toEqual(mockNotifications);
    });

    expect(result.current.unreadCount).toBe(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(mockAdminNotificationService.list).toHaveBeenCalledTimes(1);
  });

  it('should calculate unread count correctly', async () => {
    const { result } = renderHook(() => useAdminNotifications());

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(1);
    });
  });

  it('should mark notification as read', async () => {
    const { result } = renderHook(() => useAdminNotifications());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.notifications).toEqual(mockNotifications);
    });

    await act(async () => {
      await result.current.markRead('1');
    });

    expect(mockAdminNotificationService.markRead).toHaveBeenCalledWith('1');
    
    // Check optimistic update
    await waitFor(() => {
      expect(result.current.notifications[0].read).toBe(true);
    });
  });

  it('should mark all notifications as read', async () => {
    const { result } = renderHook(() => useAdminNotifications());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.notifications).toEqual(mockNotifications);
    });

    await act(async () => {
      await result.current.markAllRead();
    });

    expect(mockAdminNotificationService.markAllRead).toHaveBeenCalled();
    
    // Check optimistic update
    await waitFor(() => {
      expect(result.current.notifications.every((n: any) => n.read)).toBe(true);
    });
  });

  it('should clear all notifications', async () => {
    const { result } = renderHook(() => useAdminNotifications());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.notifications).toEqual(mockNotifications);
    });

    await act(async () => {
      await result.current.clear();
    });

    expect(mockAdminNotificationService.clear).toHaveBeenCalled();
    
    // Check optimistic update
    await waitFor(() => {
      expect(result.current.notifications).toEqual([]);
    });
  });

  it('should refresh notifications', async () => {
    const { result } = renderHook(() => useAdminNotifications());

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(mockAdminNotificationService.list).toHaveBeenCalledTimes(2); // Initial + refresh
    });
  });

  it('should handle empty notification list', async () => {
    mockAdminNotificationService.list.mockResolvedValue([]);
    
    const { result } = renderHook(() => useAdminNotifications());

    await waitFor(() => {
      expect(result.current.notifications).toEqual([]);
      expect(result.current.unreadCount).toBe(0);
    });
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'Failed to load notifications';
    mockAdminNotificationService.list.mockRejectedValue(new Error(errorMessage));
    
    const { result } = renderHook(() => useAdminNotifications());

    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle mark read errors', async () => {
    const { result } = renderHook(() => useAdminNotifications());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.notifications).toEqual(mockNotifications);
    });

    const errorMessage = 'Failed to mark as read';
    mockAdminNotificationService.markRead.mockRejectedValue(new Error(errorMessage));
    // Mock refresh call that happens on error
    mockAdminNotificationService.list.mockResolvedValueOnce(mockNotifications);

    await act(async () => {
      await result.current.markRead('1');
    });

    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage);
    });
  });
});
