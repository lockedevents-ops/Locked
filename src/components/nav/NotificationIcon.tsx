import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { createClient } from '@/lib/supabase/client/client';

interface NotificationIconProps {
  onClick?: () => void;
}

export function NotificationIcon({ onClick }: NotificationIconProps) {
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user and fetch notifications
  useEffect(() => {
    const getCurrentUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        await fetchNotifications(user.id);
      }
    };
    
    getCurrentUser();
  }, [fetchNotifications]);
  
  return (
    <button 
      onClick={onClick}
      className="relative p-2 rounded-full hover:bg-neutral-800 transition-colors cursor-pointer flex items-center justify-center"
      aria-label="Notifications"
    >
      <Bell className="w-5 h-5 text-white" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </button>
  );
}