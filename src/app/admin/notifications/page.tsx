"use client";

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Trash2, CalendarClock, UserCog, AlertCircle, User, Info, CheckCheck, Building } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { PageLoader } from '@/components/loaders/PageLoader';

export default function AdminNotificationsPage() {
  const [filter, setFilter] = useState<string>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { notifications, markAllRead, clear, markRead, unreadCount } = useAdminNotifications();
  const isLoading = false; // hook handles loading instantly
  const router = useRouter();

  const filteredNotifications = useMemo(() => notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.type === filter;
  }), [notifications, filter]);

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'role_request':
        return <UserCog className="h-5 w-5 text-blue-500" />;
      case 'event_approval':
      case 'event_rejection':
        return <CalendarClock className="h-5 w-5 text-green-500" />;
      case 'venue_approval':
      case 'venue_rejection':
        return <Building className="h-5 w-5 text-purple-500" />;
      case 'admin_message':
        return <User className="h-5 w-5 text-purple-500" />;
      case 'system_message':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const markAllAsRead = () => markAllRead();
  const clearAll = () => {
    clear();
    setShowClearConfirm(false);
  };
  const markAsRead = (id: string) => markRead(id);

  // Custom Tabs component with black background
  const CustomTabsList = ({ children }: { children: React.ReactNode }) => (
    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
      {children}
    </div>
  );

  const CustomTabsTrigger = ({ 
    value, 
    activeValue,
    onClick, 
    children 
  }: { 
    value: string, 
    activeValue: string,
    onClick: () => void, 
    children: React.ReactNode 
  }) => (
    <button
  className={`px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
        activeValue === value 
          ? 'bg-black dark:bg-white text-white dark:text-black' 
          : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-700'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );

  if (isLoading) {
    return <PageLoader message="Loading notifications..." fullHeight />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
        
        {notifications.length > 0 && (
          <div className="flex space-x-3">
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className={`flex items-center px-3 py-1.5 text-sm rounded-md border ${
                unreadCount === 0 
                  ? 'border-gray-200 dark:border-neutral-800 text-gray-400 dark:text-gray-600 cursor-not-allowed' 
                  : 'border-primary dark:border-primary text-primary dark:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer'
              }`}
              title={unreadCount === 0 ? "No unread notifications" : "Mark all as read"}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </button>
            
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={notifications.length === 0}
              className="flex items-center px-3 py-1.5 text-sm rounded-md border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
              title="Clear all notifications"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear all
            </button>
          </div>
        )}
      </div>
      
      {/* Custom tabs with black background for active tab */}
      <div className="mb-6">
        <CustomTabsList>
          <CustomTabsTrigger value="all" activeValue={filter} onClick={() => setFilter('all')}>
            All
          </CustomTabsTrigger>
          <CustomTabsTrigger value="unread" activeValue={filter} onClick={() => setFilter('unread')}>
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </CustomTabsTrigger>
          <CustomTabsTrigger value="role_request" activeValue={filter} onClick={() => setFilter('role_request')}>
            Role Requests
          </CustomTabsTrigger>
          <CustomTabsTrigger value="event_approval" activeValue={filter} onClick={() => setFilter('event_approval')}>
            Events
          </CustomTabsTrigger>
          <CustomTabsTrigger value="venue_approval" activeValue={filter} onClick={() => setFilter('venue_approval')}>
            Venues
          </CustomTabsTrigger>
          <CustomTabsTrigger value="admin_message" activeValue={filter} onClick={() => setFilter('admin_message')}>
            Admin
          </CustomTabsTrigger>
        </CustomTabsList>
      </div>
        
      {/* Animated tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={filter}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {filteredNotifications.length > 0 ? (
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              {filteredNotifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => {
                    // Mark as read immediately
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                    // Navigate if link present
                    if (notification.link) {
                      router.push(notification.link);
                    } else if ((notification as any).requestId) {
                      router.push(`/admin/role-requests?requestId=${encodeURIComponent((notification as any).requestId)}`);
                    }
                  }}
                  className={`w-full text-left border-b border-neutral-100 dark:border-neutral-800 last:border-0 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                  } focus:outline-none focus:ring-2 focus:ring-primary/40`}
                >
                  <div className="flex p-4 gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          {notification.title}
                          {!notification.read && <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />}
                        </h3>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {!notification.read && (
                            <span className="text-[10px] uppercase tracking-wide text-blue-600 dark:text-blue-400 font-semibold">New</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{notification.message}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{notification.time}</p>
                      { (notification as any).requestId && (
                        <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">Request ID: {(notification as any).requestId}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-800">
              <Bell className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
              <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">No notifications</h3>
              <p className="text-neutral-600 dark:text-gray-300">
                {filter === "all" 
                  ? "You don't have any notifications at the moment." 
                  : `You don't have any ${filter === "unread" ? "unread" : filter} notifications.`}
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-md w-full p-6 border border-neutral-200 dark:border-neutral-800"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Clear All Notifications?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                  This will permanently delete all {notifications.length} notification{notifications.length !== 1 ? 's' : ''}. This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={clearAll}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 rounded-md transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
