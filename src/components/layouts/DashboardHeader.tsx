"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Search, 
  Bell, 
  Settings, 
  LogOut,
  Calendar,
  Ticket,
  Building,
  Shield,
  X,
  File,
  User,
  LayoutDashboard,
  CreditCard,
  Users,
  Menu
} from 'lucide-react';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { AdminNotificationDTO } from '@/services/notificationService';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { useNotificationStore, type Notification as UserNotification } from '@/store/notificationStore';
import { Home } from 'lucide-react';
import { isVenuesEnabled } from '@/lib/network';

// Union type for both admin and user notifications
type UnifiedNotification = (AdminNotificationDTO | UserNotification) & {
  created_at?: string; // for backward compatibility
  time?: string; // AdminNotification
  date?: string; // UserNotification
};

interface DashboardHeaderProps {
  role?: 'user' | 'organizer' | 'venue_owner' | 'admin';
  onSearch?: (query: string) => void;
  showSearch?: boolean;
  onToggleSidebar?: () => void;
  hasRequiredRole?: boolean; // Whether user has the required role for this dashboard
}

interface DashboardLink {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function DashboardHeader({ 
  role = 'user', 
  onSearch,
  showSearch = true,
  onToggleSidebar,
  hasRequiredRole = true // Default to true for user dashboard
}: DashboardHeaderProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const venuesEnabled = isVenuesEnabled();
  
  // UI State
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  
  // Refs for click outside detection
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLDivElement>(null);

  // Use notification store for all users (like Navbar does)
  const { unreadCount, fetchNotifications, notifications: userNotifications } = useNotificationStore();
  
  // Fetch notifications when component mounts
  useEffect(() => {
    if (user?.id) {
      fetchNotifications(user.id);
    }
  }, [user?.id, fetchNotifications]);

  // Admin notifications (only for admin role)
  const adminNotificationsHook = role === 'admin' ? useAdminNotifications() : null;
  
  // Use admin notifications for admin role, user notifications for others
  const notifications = role === 'admin' && adminNotificationsHook 
    ? adminNotificationsHook.notifications 
    : (userNotifications || []);
  const notificationsLoading = role === 'admin' && adminNotificationsHook ? adminNotificationsHook.loading : false;
  const markRead = role === 'admin' && adminNotificationsHook ? adminNotificationsHook.markRead : () => Promise.resolve();

  // User display data
  const avatarUrl = user?.user_metadata?.avatar_url || user?.avatar_url;
  const displayName = user?.user_metadata?.full_name || user?.name || user?.email?.split('@')[0] || 'User';

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut: Ctrl+K to open search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setShowSearchDropdown(true);
        // Focus the search input on desktop
        const searchInput = searchInputRef.current?.querySelector('input');
        if (searchInput) {
          (searchInput as HTMLInputElement).focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Event handlers
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  }, [onSearch, searchQuery]);

  const handleSignOut = useCallback(async () => {
    setShowProfileMenu(false);
    await signOut();
    router.push('/');
  }, [signOut, router]);

  const handleNotificationClick = useCallback((notification: UnifiedNotification) => {
    markRead(notification.id);
    const targetUrl = (notification as AdminNotificationDTO).action_url || (notification as UserNotification).link;
    if (targetUrl) {
      router.push(targetUrl);
      setShowNotifications(false);
    }
  }, [markRead, router]);

  const handleDashboardLinkClick = useCallback((href: string) => {
    router.push(href);
    setShowProfileMenu(false);
  }, [router]);

  // Memoized dashboard links based on role
  const dashboardLinks = useMemo((): DashboardLink[] => {
    switch (role) {
      case 'admin':
        return [
          { label: 'Admin Dashboard', href: '/admin', icon: Shield },
          { label: 'Settings', href: '/dashboards/settings', icon: Settings },
        ];
      case 'organizer':
        return [
          { label: 'Organizer Dashboard', href: '/dashboards/organizer', icon: Calendar },
          { label: 'My Events', href: '/dashboards/organizer/events', icon: Calendar },
          { label: 'Create Event', href: '/dashboards/organizer/create-event', icon: Calendar },
          { label: 'Settings', href: '/dashboards/settings?tab=organization', icon: Settings },
        ];
      case 'venue_owner':
        return venuesEnabled
          ? [
              { label: 'Venue Dashboard', href: '/dashboards/venue-owner', icon: Building },
              { label: 'My Venues', href: '/dashboards/venue-owner/venues', icon: Building },
              { label: 'Settings', href: '/dashboards/settings?tab=venue-settings', icon: Settings },
            ]
          : [
              { label: 'My Tickets', href: '/dashboards/user/tickets', icon: Ticket },
              { label: 'Settings', href: '/dashboards/settings', icon: Settings },
            ];
      default:
        return [
          { label: 'My Tickets', href: '/dashboards/user/tickets', icon: Ticket },
          { label: 'Settings', href: '/dashboards/settings', icon: Settings },
        ];
    }
  }, [role, venuesEnabled]);

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-20">
      <div className="flex items-center justify-between px-4 md:px-6 h-14 gap-3">
        
        {/* Left side - Mobile Toggle + Return to Main Site */}
        <div className="flex items-center gap-2">
          {/* Mobile Sidebar Toggle - Only visible on mobile */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5 text-neutral-900" />
            </button>
          )}
          
          {/* Return to Main Site */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-2 sm:px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
          >
            {/* Mobile: Show home icon, Desktop: Show arrow */}
            <Home className="h-5 w-5 text-neutral-900 sm:hidden" />
            <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="hidden sm:inline">Back to Main Site</span>
          </button>
        </div>

        {/* Right side items */}
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          {showSearch && (
            <SearchBar 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              handleSearch={handleSearch}
              role={role}
              router={router}
              showSearchDropdown={showSearchDropdown}
              setShowSearchDropdown={setShowSearchDropdown}
              searchInputRef={searchInputRef}
              dashboardLinks={dashboardLinks}
              hasRequiredRole={hasRequiredRole}
            />
          )}

          {/* Notifications */}
          <NotificationsDropdown
            role={role}
            showNotifications={showNotifications}
            setShowNotifications={setShowNotifications}
            notificationsRef={notificationsRef}
            notifications={notifications}
            unreadCount={unreadCount}
            notificationsLoading={notificationsLoading}
            handleNotificationClick={handleNotificationClick}
            router={router}
          />

          {/* Profile Menu */}
        <ProfileMenu
          showProfileMenu={showProfileMenu}
          setShowProfileMenu={setShowProfileMenu}
          profileMenuRef={profileMenuRef}
          avatarUrl={avatarUrl}
          displayName={displayName}
          user={user}
          dashboardLinks={dashboardLinks}
          handleDashboardLinkClick={handleDashboardLinkClick}
          handleSignOut={handleSignOut}
          role={role}
          hasRequiredRole={hasRequiredRole}
        />
        </div>
      </div>
    </header>
  );
}

// Sub-components for better organization

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleSearch: (e: React.FormEvent) => void;
  role: string;
  router: any;
  showSearchDropdown: boolean;
  setShowSearchDropdown: (show: boolean) => void;
  searchInputRef: React.RefObject<HTMLDivElement | null>;
  dashboardLinks: DashboardLink[];
  hasRequiredRole: boolean;
}

function SearchBar({ 
  searchQuery, 
  setSearchQuery, 
  handleSearch, 
  role, 
  router,
  showSearchDropdown,
  setShowSearchDropdown,
  searchInputRef,
  dashboardLinks,
  hasRequiredRole
}: SearchBarProps) {
  const { roles: userRoles } = useAuth();
  const venuesEnabled = isVenuesEnabled();
  
  // Check if user has specific roles
  const hasOrganizerRole = userRoles?.includes('organizer') || false;
  const hasVenueOwnerRole = userRoles?.includes('venue_owner') || false;
  
  // Define search options based on role
  const searchOptions = useMemo(() => {
    const options = [
      ...dashboardLinks.map(link => {
        // If user is on organizer/venue_owner dashboard without required role, disable role-specific links
        const isOrganizerDashboard = role === 'organizer';
        const isVenueOwnerDashboard = role === 'venue_owner';
        
        // Disable dashboard links if on role dashboard without required role
        if ((isOrganizerDashboard && !hasRequiredRole) || (isVenueOwnerDashboard && !hasRequiredRole)) {
          // Only allow navigation to settings and back to main site
          const isSettings = link.href.includes('/settings');
          if (!isSettings) return null;
        }
        
        return {
          label: link.label,
          href: link.href,
          icon: link.icon,
          category: 'Pages'
        };
      }).filter(Boolean) as Array<{label: string; href: string; icon: any; category: string}>
    ];

    // Add common settings for all roles (always accessible)
    if (role !== 'admin') {
      options.push(
        { label: 'Personal Settings', href: '/dashboards/settings?tab=personal', icon: User, category: 'Settings' },
        { label: 'Security', href: '/dashboards/settings?tab=security', icon: Shield, category: 'Settings' },
        { label: 'Social Links', href: '/dashboards/settings?tab=socials', icon: Users, category: 'Settings' }
      );
    }

    // Add role-specific settings (only if user has the required role)
    if ((role === 'organizer' && hasOrganizerRole && hasRequiredRole) || (role === 'venue_owner' && hasVenueOwnerRole && hasRequiredRole)) {
      options.push(
        { label: 'Organization', href: '/dashboards/settings?tab=organization', icon: Building, category: 'Settings' },
        { label: 'Team Management', href: '/dashboards/settings?tab=team', icon: Users, category: 'Settings' },
        { label: 'Payment Settings', href: '/dashboards/settings?tab=payment-settings', icon: CreditCard, category: 'Settings' }
      );
    }

    if (venuesEnabled && role === 'venue_owner' && hasVenueOwnerRole && hasRequiredRole) {
      options.push(
        { label: 'Venue Settings', href: '/dashboards/settings?tab=venue-settings', icon: Building, category: 'Settings' }
      );
    }

    return options;
  }, [role, dashboardLinks, hasOrganizerRole, hasVenueOwnerRole, hasRequiredRole, venuesEnabled]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return searchOptions;
    const query = searchQuery.toLowerCase();
    return searchOptions.filter(option => 
      option.label.toLowerCase().includes(query)
    );
  }, [searchQuery, searchOptions]);

  const handleOptionClick = (href: string) => {
    router.push(href);
    setShowSearchDropdown(false);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={searchInputRef}>
      <form onSubmit={handleSearch}>
        {/* Mobile: Search input */}
        <div className="sm:hidden relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearchDropdown(true)}
            className="w-full pl-10 pr-4 py-1.5 border border-neutral-200 rounded-full focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:border-neutral-300 text-xs cursor-text bg-neutral-50 hover:bg-white transition-colors"
          />
        </div>

        {/* Desktop: Full search input */}
        <div className="hidden sm:block relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSearchDropdown(true)}
            className="w-56 pl-10 pr-4 py-1.5 border border-neutral-200 rounded-full focus:outline-none focus:ring-1 focus:ring-neutral-300 focus:border-neutral-300 text-xs cursor-text bg-neutral-50 hover:bg-white transition-colors"
          />
        </div>
      </form>

      {/* Search Dropdown */}
      {showSearchDropdown && (
        <div className="fixed sm:absolute top-[4.5rem] sm:top-full left-4 right-4 sm:left-0 sm:right-auto mt-0 sm:mt-2 w-auto sm:w-80 sm:max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-neutral-200 overflow-hidden z-50">
          <div className="max-h-96 overflow-y-auto scrollbar-hide">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-neutral-500">
                No results found
              </div>
            ) : (
              <>
                {/* Group by category */}
                {['Pages', 'Settings'].map(category => {
                  const categoryOptions = filteredOptions.filter(opt => opt.category === category);
                  if (categoryOptions.length === 0) return null;
                  
                  return (
                    <div key={category}>
                      <div className="px-3 py-2 text-xs font-semibold text-neutral-500 bg-neutral-50 border-b border-neutral-100">
                        {category}
                      </div>
                      {categoryOptions.map((option, index) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={`${category}-${index}`}
                            onClick={() => handleOptionClick(option.href)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 transition-colors text-left cursor-pointer border-b border-neutral-50 last:border-0"
                          >
                            <Icon className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                            <span className="text-sm text-neutral-700">{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface NotificationsDropdownProps {
  role: string;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  notificationsRef: React.RefObject<HTMLDivElement | null>;
  notifications: UnifiedNotification[];
  unreadCount: number;
  notificationsLoading: boolean;
  handleNotificationClick: (notification: UnifiedNotification) => void;
  router: any;
}

function NotificationsDropdown({
  role,
  showNotifications,
  setShowNotifications,
  notificationsRef,
  notifications,
  unreadCount,
  notificationsLoading,
  handleNotificationClick,
  router
}: NotificationsDropdownProps) {
  // Show for all roles (will be empty for non-admins but icon still visible)
  // if (role !== 'admin') return null;

  return (
    <div className="relative" ref={notificationsRef}>
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-neutral-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className="fixed sm:absolute top-[4.5rem] sm:top-full left-4 right-4 sm:left-auto sm:right-0 mt-0 sm:mt-2 w-auto sm:w-80 bg-white rounded-lg shadow-lg border border-neutral-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <button
              onClick={() => setShowNotifications(false)}
              className="p-1 hover:bg-neutral-100 rounded transition-colors cursor-pointer"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto scrollbar-hide">
            {notificationsLoading ? (
              <div className="p-4 text-center text-sm text-neutral-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">No notifications</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => {
                const notificationDate = notification.time || notification.date || notification.created_at || '';
                return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <p className="text-sm font-medium text-neutral-900">
                    {notification.title}
                  </p>
                  <p className="text-xs text-neutral-600 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    {new Date(notificationDate).toLocaleDateString()}
                  </p>
                </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-neutral-200 bg-neutral-50">
              <button
                onClick={() => {
                  router.push('/dashboards/user/notifications');
                  setShowNotifications(false);
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer transition-colors"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ProfileMenuProps {
  showProfileMenu: boolean;
  setShowProfileMenu: (show: boolean) => void;
  profileMenuRef: React.RefObject<HTMLDivElement | null>;
  avatarUrl: string | null | undefined;
  displayName: string;
  user: any;
  dashboardLinks: DashboardLink[];
  handleDashboardLinkClick: (href: string) => void;
  handleSignOut: () => void;
  role: 'user' | 'organizer' | 'venue_owner' | 'admin';
  hasRequiredRole: boolean;
}

function ProfileMenu({
  showProfileMenu,
  setShowProfileMenu,
  profileMenuRef,
  avatarUrl,
  displayName,
  user,
  dashboardLinks,
  handleDashboardLinkClick,
  handleSignOut,
  role,
  hasRequiredRole
}: ProfileMenuProps) {
  return (
    <div className="relative" ref={profileMenuRef}>
      <button
        onClick={() => setShowProfileMenu(!showProfileMenu)}
        className="p-1 bg-neutral-100 hover:bg-neutral-100/60 rounded-full transition-all cursor-pointer"
        aria-label="Profile menu"
      >
        <ProfileAvatar 
          avatarUrl={avatarUrl}
          name={displayName}
          size="small"
        />
      </button>

      {showProfileMenu && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-neutral-200 overflow-hidden">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50">
            <p className="text-sm font-semibold text-neutral-900 truncate">
              {displayName}
            </p>
            <p className="text-xs text-neutral-600 truncate">
              {user?.email}
            </p>
          </div>

          {/* Quick Links */}
          <div className="py-2">
            {dashboardLinks.map((link) => {
              // Filter out role-specific links if user doesn't have required role
              const isOrganizerDashboard = role === 'organizer';
              const isVenueOwnerDashboard = role === 'venue_owner';
              
              // Hide non-settings links when on role dashboard without required role
              if ((isOrganizerDashboard && !hasRequiredRole) || (isVenueOwnerDashboard && !hasRequiredRole)) {
                const isSettings = link.href.includes('/settings');
                if (!isSettings) return null;
              }
              
              const IconComponent = link.icon;
              return (
                <button
                  key={link.href}
                  onClick={() => handleDashboardLinkClick(link.href)}
                  className="w-full px-4 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100 flex items-center gap-3 cursor-pointer transition-colors"
                >
                  <IconComponent className="h-4 w-4" />
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Sign Out */}
          <div className="border-t border-neutral-200">
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 cursor-pointer transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
