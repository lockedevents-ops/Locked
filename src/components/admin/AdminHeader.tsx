"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, ChevronDown, LogOut, Search as SearchIcon, Settings, User, Menu, Sun, Moon, Monitor } from 'lucide-react'; 
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { useTheme } from '@/contexts/ThemeContext';
import { createClient } from '@/lib/supabase/client/client';
import { AdminSearchModal } from './AdminSearchModal';

interface AdminHeaderProps {
  user: any;
  pathname: string;
  onOpenMobileSidebar: () => void;
  logout: () => void;
}

interface ProfileData {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface UserRoleData {
  role: string;
}

// Map pathname to a simple page title
function derivePageTitle(pathname: string): string {
  if (!pathname) return 'Dashboard';
  const clean = pathname.replace(/\/$/, '');
  if (clean === '/admin' || clean === '/admin/dashboard') return 'Dashboard';
  const parts = clean.split('/').filter(Boolean).slice(1);
  
  if (!parts.length) return 'Dashboard';
  return parts
    .map(p => p.replace(/-/g, ' '))
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' • ');
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  user,
  pathname,
  onOpenMobileSidebar,
  logout,
}) => {
  const { notifications, unreadCount, markAllRead, markRead, clear } = useAdminNotifications();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false); // Search modal state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setIsThemeDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard shortcut for search (Ctrl/Cmd + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch profile and role data
  useEffect(() => {
    let isMounted = true;
    
    const fetchProfileData = async () => {
      if (!user?.id) {
        // Clear data when user is logged out
        setProfileData(null);
        setAvatarUrl('');
        setUserRole('');
        return;
      }

      try {
        // ✅ SECURITY: Verify user is still authenticated before making request
        const { data: { user: verifiedUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !verifiedUser || !isMounted) {
          return;
        }

        // Fetch profile data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          return;
        }

        if (profile && isMounted) {
          setProfileData(profile);

          // Generate signed URL for avatar if exists
          if (profile.avatar_url) {
            try {
              // Check cache first
              const cacheKey = `avatar_signed_url_${user.id}`;
              const cachedData = localStorage.getItem(cacheKey);
              
              if (cachedData) {
                const { url, path, expiresAt } = JSON.parse(cachedData);
                // Use cache if still valid and path matches
                if (url && path === profile.avatar_url && expiresAt > Date.now() + 86400000) {
                  if (isMounted) setAvatarUrl(url);
                  // Don't return here, continue to fetch role
                } else {
                  let filePath = profile.avatar_url;
                  if (profile.avatar_url.includes('admin-avatars')) {
                    const parts = profile.avatar_url.split('admin-avatars/');
                    filePath = parts[1] || profile.avatar_url;
                  }

                  const { data: signedUrlData } = await supabase.storage
                    .from('admin-avatars')
                    .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

                  if (signedUrlData?.signedUrl && isMounted) {
                    setAvatarUrl(signedUrlData.signedUrl);
                    // Cache the signed URL
                    localStorage.setItem(cacheKey, JSON.stringify({
                      url: signedUrlData.signedUrl,
                      path: profile.avatar_url,
                      expiresAt: Date.now() + (60 * 60 * 24 * 365 * 1000)
                    }));
                  }
                }
              } else {
                let filePath = profile.avatar_url;
                if (profile.avatar_url.includes('admin-avatars')) {
                  const parts = profile.avatar_url.split('admin-avatars/');
                  filePath = parts[1] || profile.avatar_url;
                }

                const { data: signedUrlData } = await supabase.storage
                  .from('admin-avatars')
                  .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

                if (signedUrlData?.signedUrl && isMounted) {
                  setAvatarUrl(signedUrlData.signedUrl);
                  // Cache the signed URL
                  localStorage.setItem(cacheKey, JSON.stringify({
                    url: signedUrlData.signedUrl,
                    path: profile.avatar_url,
                    expiresAt: Date.now() + (60 * 60 * 24 * 365 * 1000)
                  }));
                }
              }
            } catch (err) {
              console.error('Error generating signed URL:', err);
            }
          } else {
            // Clear cache if no avatar
            localStorage.removeItem(`avatar_signed_url_${user.id}`);
          }
        }

        // Fetch user role - check if still mounted
        if (!isMounted) return;
        
        const { data: roles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .is('revoked_at', null);

        if (rolesError) {
          console.error('Error fetching roles:', rolesError);
          return;
        }

        if (roles && roles.length > 0 && isMounted) {
          // Prioritize super_admin, then admin, then others
          const roleData = roles as UserRoleData[];
          if (roleData.some(r => r.role === 'super_admin')) {
            setUserRole('Super Admin');
          } else if (roleData.some(r => r.role === 'admin')) {
            setUserRole('Admin');
          } else if (roleData.some(r => r.role === 'support_agent')) {
            setUserRole('Support Agent');
          } else {
            const formattedRole = roleData[0].role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            setUserRole(formattedRole);
          }
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
      }
    };

    fetchProfileData();
    
    // Cleanup function to prevent updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [user?.id, supabase]);

  // Theme helpers
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setIsThemeDropdownOpen(false);
  };

  const getThemeIcon = () => {
    if (theme === 'system') return <Monitor className="h-5 w-5" />;
    return theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />;
  };

  const getThemeLabel = () => {
    if (theme === 'system') return `System (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`;
    return theme === 'dark' ? 'Dark' : 'Light';
  };

  const title = derivePageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-neutral-800/60">
      <div className="flex items-center w-full h-11 md:h-13 px-3 sm:px-4 gap-2 md:gap-4">
        {/* Mobile menu */}
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Title */}
        <h1 className="text-xs xs:text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 tracking-tight truncate max-w-[40vw] sm:max-w-[45vw] md:max-w-[260px]">
          {title}
        </h1>

        {/* Spacer to push actions to the right */}
        <div className="flex-1"></div>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 ml-auto">
          {/* Search button - Pill-shaped */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="hidden md:flex items-center gap-2 h-9 px-4 rounded-full bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors focus:outline-none text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
          >
            <SearchIcon className="h-4 w-4" />
            <span className="text-sm">Search</span>
            <span className="text-xs ml-2 opacity-60">⌘K</span>
          </button>

          {/* Mobile Search Button */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="md:hidden h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none cursor-pointer"
          >
            <SearchIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setIsNotificationsOpen(o => !o)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-neutral-800/60 transition-all focus:outline-none relative cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {isNotificationsOpen && (
              <div className="fixed top-14 left-1/2 -translate-x-1/2 md:absolute md:top-auto md:left-auto md:right-0 md:translate-x-0 mt-2 w-[min(96vw,370px)] sm:w-96 max-w-[420px] rounded-xl 
    md:rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 
    shadow-2xl md:shadow-lg z-50 animate-in fade-in slide-in-from-top-2 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-neutral-800">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                  <button
                    onClick={() => { markAllRead(); }}
                    className="text-xs text-primary hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-gray-200 dark:divide-neutral-600">
                  {notifications.length ? notifications.slice(0, 5).map(n => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-neutral-700/50 transition cursor-pointer ${
                        !n.read ? 'bg-gray-100/60 dark:bg-neutral-800/80' : ''
                      }`}
                      onClick={() => { markRead(n.id); }}
                    >
                      <p className="font-medium text-gray-900 dark:text-gray-100 line-clamp-1">{n.title}</p>
                      <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5 line-clamp-2">{n.message}</p>
                      {n.time && <p className="text-gray-400 dark:text-gray-500 text-[10px] mt-1">{n.time}</p>}
                    </div>
                  )) : (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      No new notifications
                    </div>
                  )}
                </div>
                <div className="px-4 py-2 border-t border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <Link
                    href="/admin/notifications"
                    className="text-xs font-medium text-primary hover:underline cursor-pointer"
                    onClick={() => setIsNotificationsOpen(false)}
                  >View all</Link>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => { clear(); }}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:underline cursor-pointer self-start sm:self-auto"
                    >Clear read</button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <div className="relative" ref={themeRef}>
            <button
              onClick={() => setIsThemeDropdownOpen(o => !o)}
              className="h-10 w-10 inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-neutral-800/60 transition-all focus:outline-none cursor-pointer"
              title="Toggle theme"
            >
              {getThemeIcon()}
            </button>
            {isThemeDropdownOpen && (
              <div className="absolute md:right-0 right-1 mt-2 w-44 max-w-[calc(100vw-1.25rem)] rounded-xl border-0 bg-gradient-to-br from-white/95 to-gray-100 dark:from-neutral-900 dark:to-neutral-800 shadow-2xl ring-1 ring-primary/20 z-50 animate-in fade-in slide-in-from-top-2 overflow-hidden">
                <div className="py-1">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer ${
                      theme === 'light' ? 'text-primary bg-primary/10' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5" />
                    Light
                  </button>
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer ${
                      theme === 'dark' ? 'text-primary bg-primary/10' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5" />
                    Dark
                  </button>
                  <button
                    onClick={() => handleThemeChange('system')}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-xs hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer ${
                      theme === 'system' ? 'text-primary bg-primary/10' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Monitor className="h-3.5 w-3.5" />
                    System
                  </button>
                </div>
                <div className="px-4 py-2 border-t border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Current: {getThemeLabel()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileDropdownOpen(o => !o)}
              className="inline-flex items-center gap-1 sm:gap-2 h-10 pl-2 pr-2 sm:pr-3 rounded-full bg-gray-100 dark:bg-neutral-800 hover:bg-gray-100/60 dark:hover:bg-neutral-800/60 focus:outline-none cursor-pointer max-w-[40vw] md:max-w-none transition-all"
              aria-haspopup="menu"
              aria-expanded={isProfileDropdownOpen}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-primary/30 dark:ring-neutral-700"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/80 to-primary dark:from-neutral-900 dark:to-neutral-700 dark:bg-none flex items-center justify-center text-white dark:text-gray-200 text-xs font-medium ring-1 ring-primary/30 dark:ring-neutral-700">
                  {(() => {
                    const name = profileData?.full_name || user?.name || 'Admin';
                    const parts = name.trim().split(' ');
                    if (parts.length >= 2) {
                      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
                    }
                    return name.slice(0, 2).toUpperCase();
                  })()}
                </div>
              )}
              <ChevronDown className={`h-3.5 w-3.5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-[min(60vw,250px)] sm:w-56 max-w-[280px] rounded-xl 
    md:rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 
    shadow-2xl md:shadow-lg text-xs z-50 animate-in fade-in slide-in-from-top-2 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-neutral-800">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate text-xs">
                    {profileData?.full_name || user?.name || 'Admin'}
                  </p>
                  {userRole && (
                    <p className="text-[10px] text-primary dark:text-primary font-medium">
                      {userRole}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate">
                    {profileData?.email || user?.email}
                  </p>
                </div>
                <div className="py-1">
                  <Link
                    href="/admin/settings/profile"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer text-gray-700 dark:text-gray-300"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  >
                    <User className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                    Profile Settings
                  </Link>
                  <Link
                    href="/admin/settings"
                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer text-gray-700 dark:text-gray-300"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  >
                    <Settings className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                    System Settings
                  </Link>
                </div>
                <div className="border-t border-gray-200 dark:border-neutral-800">
                  <button
                    onClick={() => { logout(); setIsProfileDropdownOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Modal Component */}
      <AdminSearchModal 
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </header>
  );
};
