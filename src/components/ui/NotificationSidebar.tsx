"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Check, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useNotificationStore } from '@/store/notificationStore';

interface NotificationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationSidebar({ isOpen, onClose }: NotificationSidebarProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotificationStore();

  // Handle Mark All Read
  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  // Handle Clear All
  const handleClearAll = async () => {
    await clearAll();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
          />

          {/* Sidebar Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white dark:bg-neutral-900 shadow-2xl z-[101] flex flex-col overflow-hidden border-l border-neutral-200 dark:border-neutral-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Bell className="w-5 h-5 text-neutral-900 dark:text-white" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border-2 border-white dark:border-neutral-900" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Notifications</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
                aria-label="Close notifications"
              >
                <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
              </button>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {unreadCount} unread
              </span>
              <div className="flex gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1.5 text-xs font-medium text-brand-purple hover:text-brand-purple-dark transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear text
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length > 0 ? (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {notifications.map((notification) => (
                    <Link
                      key={notification.id}
                      href={notification.link || '#'}
                      onClick={() => {
                         if (!notification.read) markAsRead(notification.id);
                         onClose();
                      }}
                      className={`block p-5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all ${
                        !notification.read ? 'bg-purple-50/40 dark:bg-purple-900/10 border-l-4 border-l-brand-purple' : 'border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3 mb-1">
                        <h4 className={`text-sm ${!notification.read ? 'font-semibold text-neutral-900 dark:text-white' : 'font-medium text-neutral-700 dark:text-neutral-300'}`}>
                          {notification.title}
                        </h4>
                        <span className="text-[10px] text-neutral-400 whitespace-nowrap pt-0.5">
                          {new Date(notification.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-2">
                        {notification.message}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center text-neutral-500 dark:text-neutral-400">
                  <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white mb-1">No notifications</p>
                  <p className="text-xs">You're all caught up!</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <Link
                href="/dashboards/user/notifications"
                onClick={onClose}
                className="flex items-center justify-center w-full py-3 bg-neutral-900 dark:bg-white hover:bg-black dark:hover:bg-neutral-200 text-white dark:text-black rounded-xl font-semibold text-sm transition-all"
              >
                View Full Page
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
