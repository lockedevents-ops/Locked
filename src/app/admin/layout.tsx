"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client/client';
import Link from 'next/link';
import Image from 'next/image';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  Home,
  Settings, 
  LogOut, 
  ClipboardList,
  X,
  Building,
  LifeBuoy,
  MessageSquare,
  Clock,
  AlertCircle,
  Database,
  Flag,
  DollarSign,
  Shield,
  UserX
} from 'lucide-react';
/**
 * @deprecated authService moved to /legacy/auth/authService.ts
 * Use roleRequestRepo from storage instead
 */
// ToastContainer moved to main layout to avoid duplicates
import { AdminHeader } from '@/components/admin/AdminHeader';
import { preferencesRepo, roleRequestRepo } from '@/storage/repositories';
import { useFilteredStorageEvents } from '@/storage/events';
import { useBoolViewMode, useViewMode } from '@/hooks/useViewMode';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import type { User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { AdminIdleLogout } from '@/components/admin/AdminIdleLogout';
import { requestCache } from '@/lib/requestCache';
import { Tooltip } from '@/components/ui/Tooltip';
import { isVenuesEnabled } from '@/lib/network';

const ADMIN_PREFETCH_CACHE_TTL = 60 * 1000; // 1 minute
const ADMIN_PREFETCH_TIMEOUT = 20000; // 20 seconds

const fetchWithAdminCache = <T,>(key: string, fetcher: () => Promise<T>) =>
  requestCache.fetch(key, fetcher, {
    ttl: ADMIN_PREFETCH_CACHE_TTL,
    staleWhileRevalidate: true,
    timeout: ADMIN_PREFETCH_TIMEOUT,
  });

const fetchAdminStatsCached = (supabaseClient: ReturnType<typeof createClient>) =>
  fetchWithAdminCache('admin:stats', async () => {
    const [usersCountRes, eventsCountRes, pendingRoleReqsRes] = await Promise.all([
      supabaseClient.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseClient.from('events').select('id', { count: 'exact', head: true }),
      supabaseClient
        .from('role_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ]);

    return {
      totalUsers: usersCountRes.count || 0,
      totalEvents: eventsCountRes.count || 0,
      totalVenues: 0,
      pendingApprovals: pendingRoleReqsRes.count || 0,
    };
  });

const fetchAdminEventsSummaryCached = (supabaseClient: ReturnType<typeof createClient>) =>
  fetchWithAdminCache('admin:events:summary', async () => {
    const { data } = await supabaseClient
      .from('events')
      .select('id, title, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    return data || [];
  });

const fetchAdminRoleRequestsCached = (supabaseClient: ReturnType<typeof createClient>) =>
  fetchWithAdminCache('admin:roleRequests', async () => {
    const { data } = await supabaseClient
      .from('role_requests')
      .select('id, user_id, request_type, status, submitted_at, reviewed_at')
      .order('submitted_at', { ascending: false })
      .limit(100);
    return data || [];
  });

const fetchAdminRoleRequestsNormalizedCached = () =>
  fetchWithAdminCache('admin:roleRequests:normalized', async () => {
    const res = await fetch('/api/admin/role-requests');
    if (!res.ok) throw new Error('Failed');
    return res.json();
  });
// AdminToastProvider now applied globally in AppProviders; local import removed

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sidebar collapsed state via viewModes abstraction
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useBoolViewMode('adminSidebarCollapsed', false);
  
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingRoleRequestCount, setPendingRoleRequestCount] = useState(0);
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  
  // Simplified auth state - single consolidated state
  const [authState, setAuthState] = useState<'loading' | 'checking' | 'authenticated' | 'unauthenticated'>('loading');
  const [hasRedirectedToLast, setHasRedirectedToLast] = useState(false);
  const [authLoadTimedOut, setAuthLoadTimedOut] = useState(false);
  const venuesEnabled = isVenuesEnabled();
  
  const pathname = usePathname();
  const router = useRouter();
  const { user, session, loading: authLoading, roles, rolesLoading, signOut, isReady, isAdmin: authIsAdmin, isSigningOut, isLoggingIn } = useAuth() as { user: any; session: any; loading: boolean; roles: string[]; rolesLoading: boolean; signOut: (reason?: 'manual' | 'idle' | 'session_expired') => Promise<void>; isReady: boolean; isAdmin: boolean; isSigningOut: boolean; isLoggingIn: boolean };
  const supabase = createClient();
  const queryClient = useQueryClient();
  
  // Use ref to prevent infinite loop
  const initialUpdateDone = useRef(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Stable toggle function using useCallback
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  }, [isSidebarCollapsed, setIsSidebarCollapsed]);

  // Handle auth redirect and role checks
  // Public (unauthenticated) admin routes (auth not required)
    const publicAdminPaths = useMemo(
      () => ['/admin/login', '/admin/forgot-password', '/admin/reset-password'],
      []
    );

  // Single consolidated auth check effect
  useEffect(() => {
    // Public admin paths: immediately mark authenticated (no gating)
    if (publicAdminPaths.includes(pathname)) {
      setAuthState('authenticated');
      return;
    }

    // If signing out, show loading (don't redirect to login during signout)
    if (isSigningOut) {
      setAuthState('loading');
      return;
    }

    // RACE CONDITION FIX: If logging in, show loading (don't redirect while session is being set)
    if (isLoggingIn) {
      setAuthState('loading');
      return;
    }

    // Show loading while auth is initializing
    if (!isReady && (authLoading || rolesLoading)) {
      setAuthState('loading');
      return;
    }

    // RACE CONDITION FIX: If auth is not ready but loading states are false,
    // wait a moment before redirecting - state might be transitioning
    if (!isReady) {
      setAuthState('loading');
      return;
    }

    // If no session, redirect and mark unauthenticated
    if (!user || !session) {
      preferencesRepo.update(p => ({ ...p, postLoginAdminRoute: pathname }));
      router.replace('/admin/login');
      setAuthState('unauthenticated');
      return;
    }

    // Check admin role
    if (!authIsAdmin) {
      router.replace('/admin/login');
      setAuthState('unauthenticated');
      return;
    }

    // Success - user is authenticated admin
    setAuthState('authenticated');
    }, [authLoading, rolesLoading, user, session, roles, pathname, router, isReady, authIsAdmin, publicAdminPaths, isSigningOut, isLoggingIn]);

  // Fail-safe: avoid indefinite admin loading screen if auth readiness stalls.
  useEffect(() => {
    const isBlockingLoad = authState === 'loading' || (authState === 'checking' && !publicAdminPaths.includes(pathname));
    if (!isBlockingLoad) {
      setAuthLoadTimedOut(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setAuthLoadTimedOut(true);
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [authState, pathname, publicAdminPaths]);

  // Delayed background prefetch - keep this lightweight to avoid flooding the network.
  useEffect(() => {
    if (authState !== 'authenticated' || !authIsAdmin) return;
    
    const warmDashboardLists = pathname === '/admin' || pathname.startsWith('/admin/role-requests');

    const timer = setTimeout(async () => {
      try {
        // Stats only (most important for dashboard)
        queryClient.prefetchQuery({
          queryKey: ['admin','stats'],
          queryFn: () => fetchAdminStatsCached(supabase)
        });

        if (warmDashboardLists) {
          queryClient.prefetchQuery({ 
            queryKey: ['admin','events'], 
            queryFn: () => fetchAdminEventsSummaryCached(supabase)
          });

          queryClient.prefetchQuery({ 
            queryKey: ['admin','roleRequests'], 
            queryFn: () => fetchAdminRoleRequestsCached(supabase)
          });
        }
        
      } catch (e) {
        console.warn('Admin prefetch failed (non-critical)', e);
      }
    }, 1200);

    const normalizedTimer = setTimeout(async () => {
      if (authState !== 'authenticated') return;
      try {
        queryClient.prefetchQuery({ 
          queryKey: ['admin','roleRequests','normalized'], 
          queryFn: () => fetchAdminRoleRequestsNormalizedCached()
        });
      } catch (e) {
        console.warn('Role requests prefetch error', e);
      }
    }, 2500);

    return () => {
      clearTimeout(timer);
      clearTimeout(normalizedTimer);
    };
  }, [authState, authIsAdmin, pathname, queryClient, supabase]);
  
  // Set up interval for updating last active time (simplified for Supabase)
  useEffect(() => {
    // Skip for login page or if not authenticated
    if (pathname === '/admin/login' || !user || !session) {
      return;
    }
    
    // Update last active periodically (you can implement this in your user table if needed)
    const interval = setInterval(() => {
      // Optional: Update last_active timestamp in database
      // supabase.from('user_profiles').update({ last_active: new Date().toISOString() }).eq('id', user.id)
    }, 60000); // every minute
    
    return () => clearInterval(interval);
  }, [user, session, pathname]);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
      if (notificationsDropdownRef.current && !notificationsDropdownRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keyboard shortcut: Ctrl+B to toggle sidebar
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        toggleSidebar();
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleSidebar]);
  
  // (hydration handled by hook)
  
  // Load role request count from database
  useEffect(() => {
    const fetchPendingCount = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

      try {
        const { count } = await supabase
          .from('role_requests')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        setPendingRoleRequestCount(count || 0);
      } catch (err) {
        console.warn('Failed to fetch pending role requests count:', err);
      }
    };

    if (authState === 'authenticated') {
      fetchPendingCount();

      // Poll every 60 seconds to reduce repetitive background traffic.
      const interval = setInterval(fetchPendingCount, 60000);
      return () => clearInterval(interval);
    }
  }, [authState, supabase]);

  // Update role request badge when role requests change (backup/immediate update)
  useFilteredStorageEvents(['ROLE_REQUEST_CREATED','ROLE_REQUEST_UPDATED'], async () => {
    try {
      const { count } = await supabase
        .from('role_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingRoleRequestCount(count || 0);
    } catch {}
  }, [supabase]);
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery) {
      router.push(`/admin/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };
  
  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // -------------------------------------------------------------
  // IMPORTANT: All hooks must appear before any conditional return
  // The following hooks were previously placed AFTER early returns
  // causing a hook order mismatch when auth state changed.
  // -------------------------------------------------------------

  // Persist last visited admin route (excluding root) after auth
  useEffect(() => {
    if (authState !== 'authenticated' || !authIsAdmin) return;
    if (pathname.startsWith('/admin') && pathname !== '/admin' && pathname !== '/admin/login') {
      preferencesRepo.update(p => ({ ...p, lastAdminRoute: pathname }));
    }
  }, [authState, authIsAdmin, pathname]);

  // Consolidated redirect + manual navigation guard with timestamp for diagnostics
  useEffect(() => {
    if (authState !== 'authenticated' || !authIsAdmin) return; // need auth context
    if (hasRedirectedToLast) return;      // already settled once

    // Helpers local to effect to avoid file-level bloat
    const getPrefs = () => {
      const { postLoginAdminRoute, lastAdminRoute, adminRedirectPerformedAt } = preferencesRepo.get();
      return { postLoginAdminRoute, lastAdminRoute, adminRedirectPerformedAt } as {
        postLoginAdminRoute?: string; lastAdminRoute?: string; adminRedirectPerformedAt?: number;
      };
    };
    const markPerformed = () => {
      preferencesRepo.update(p => ({ ...p, adminRedirectPerformedAt: Date.now(), postLoginAdminRoute: undefined }));
      setHasRedirectedToLast(true);
    };

    // If user is NOT on /admin (either deep-linked or already clicked a tab) treat as manual and lock
    if (pathname !== '/admin') {
      markPerformed();
      return;
    }

    // At root: decide if we should auto-redirect to intended/last
    const { postLoginAdminRoute, lastAdminRoute } = getPrefs();
    const intended = postLoginAdminRoute && postLoginAdminRoute.startsWith('/admin') && postLoginAdminRoute !== '/admin'
      ? postLoginAdminRoute : null;
    const last = lastAdminRoute && lastAdminRoute.startsWith('/admin') && lastAdminRoute !== '/admin'
      ? lastAdminRoute : null;
    const target = intended || last;

    if (target) {
      markPerformed();
      router.replace(target);
    } else {
      // Stay on dashboard, still record timestamp (useful for diagnosing race conditions later)
      markPerformed();
    }
  }, [authState, authIsAdmin, pathname, hasRedirectedToLast, router]);

  // State for tabbed admin pages (persist per path)
  const [activeTab, setActiveTabRaw] = useViewMode(`adminTab:${pathname}`, 'default');
  const setActiveTab = (v: string) => setActiveTabRaw(v);

  // Listen for preference updates (multi-tab sync)
  // (cross-tab sync handled by hook)
  
  // If on login page, wrap with ThemeProvider (toast provider is global now)
  if (publicAdminPaths.includes(pathname)) {
    return (
      <ThemeProvider>
        {children}
      </ThemeProvider>
    );
  }
  
  // Simplified loading state based on authState
  if (authState === 'loading' || (authState === 'checking' && !publicAdminPaths.includes(pathname))) {
    if (authLoadTimedOut) {
      return (
        <div className="h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-black dark:to-neutral-900 px-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 text-center max-w-md w-full">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Admin Workspace Is Taking Too Long</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-5">
              Authentication setup exceeded the expected time. Please refresh or return to login.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors cursor-pointer"
              >
                Refresh
              </button>
              <button
                onClick={() => router.replace('/admin/login')}
                className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-black dark:to-neutral-900">
        {/* Modern animated loading container */}
        <div className="flex flex-col items-center justify-center gap-6">
          {/* Animated dots with shimmer effect */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-shimmer blur-lg"></div>
            <div className="relative flex items-center justify-center gap-2 p-4">
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
          
          {/* Loading text with fade animation - different for logout vs signin */}
          <div className="text-center">
            <p className="text-lg font-semibold text-neutral-900 dark:text-white tracking-wide animate-pulse">
              {isSigningOut ? 'Signing you out' : 'Preparing admin workspace'}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              {isSigningOut ? 'Clearing your session...' : 'Setting up your session...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (authState === 'unauthenticated' && !publicAdminPaths.includes(pathname)) {
    // While redirect effect runs, show nothing to avoid flash of protected UI
    return null;
  }

  // Additional access control for support_agent
  const isSupportAgent = authState === 'authenticated' && roles.includes('support_agent');
  if (isSupportAgent && !publicAdminPaths.includes(pathname)) {
    const allowed = ['/admin/support', '/admin/settings', '/admin', '/admin/login'];
    const isAllowed = allowed.some(p => pathname === p || pathname.startsWith(p + '/'));
    if (!isAllowed) {
      // Redirect support agents trying to access other sections
      router.replace('/admin/support');
      return null;
    }
  }
  
  // Navigation items
  const baseNav = [
    { name: 'Dashboard', href: '/admin', icon: Home },
    { name: 'Role Requests', href: '/admin/role-requests', icon: ClipboardList, badge: pendingRoleRequestCount },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Deleted Accounts', href: '/admin/deleted-accounts', icon: UserX },
    { name: 'Admin Management', href: '/admin/admins', icon: Shield },
    { name: 'Events', href: '/admin/events', icon: Calendar },
    ...(venuesEnabled ? [{ name: 'Venues', href: '/admin/venues', icon: Building }] : []),
    { name: 'Finances', href: '/admin/finances', icon: DollarSign },
    { name: 'Flagged Items', href: '/admin/flagged-items', icon: Flag },
    { name: 'Activity Logs', href: '/admin/activity', icon: Clock },
    { name: 'Communications', href: '/admin/communications', icon: MessageSquare },
    { name: 'Support Center', href: '/admin/support', icon: LifeBuoy },
    { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
  // Dedicated backups console (separate from generic Settings tabs)
  { name: 'Backups', href: '/admin/settings/backup', icon: Database },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];
  // Support Agents: restrict to Support Center and Settings only (plus Dashboard minimal)
  const navigation = isSupportAgent
    ? baseNav.filter(i => ['Dashboard','Support Center','Settings'].includes(i.name))
    : baseNav;
    
  // Create user object for AdminHeader (convert Supabase user to expected format)
  const adminUser = user ? {
    id: user.id, // Add user ID for profile fetching
    email: user.email || '',
    role: isSupportAgent ? 'support_agent' : 'admin',
    name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin',
    is2FAVerified: true // Simplified for now
  } : null;
  
  const handleLogout = async () => {
    // ID to track if the process has already finished
    let finished = false;
    
    // Safeguard: force redirect if logout hangs indefinitely
    const forceRedirectTimeout = setTimeout(() => {
      if (!finished) {
        console.warn('⚠️ Admin logout safeguard triggered - forcing redirect');
        setAuthState('unauthenticated');
        router.replace('/admin/login');
        finished = true;
      }
    }, 8000); // 8 second total safeguard

    try {
      setAuthState('loading'); // Pre-emptively set loading state
      
      // Don't log here - signOut() now handles all logout logging with proper reason
      // This prevents duplicate logging
      
      // Wait for signOut to fully complete
      await signOut('manual'); // Pass 'manual' reason for dashboard logout button
      
      if (!finished) {
        clearTimeout(forceRedirectTimeout);
        // Force auth state update before navigation
        setAuthState('unauthenticated');
        router.replace('/admin/login');
        finished = true;
      }
    } catch (error) {
      console.error('Admin logout error:', error);
      if (!finished) {
        clearTimeout(forceRedirectTimeout);
        setAuthState('authenticated');
      }
    }
  };
  
  return (
    <ThemeProvider>
      <AdminIdleLogout />
      <div className="flex h-screen bg-gray-100 dark:bg-black overflow-hidden">
        {/* Sidebar */}
        <div 
          className={`fixed inset-y-0 left-0 z-40 bg-white dark:bg-neutral-900 shadow-md transition-all duration-500 ease-in-out overflow-y-auto ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 lg:relative lg:block ${
            isSidebarCollapsed ? 'lg:w-[52px]' : 'lg:w-64'
          }`}
        >
          {/* Logo and brand */}
          <div className={`flex h-11 md:h-13 items-center border-b border-gray-200 dark:border-neutral-800 ${
  isSidebarCollapsed ? 'justify-center' : 'justify-between px-4'
}`}>
  {/* Make logo area clickable to toggle sidebar on desktop */}
  <div className={`flex ${isSidebarCollapsed ? 'justify-center' : 'justify-between w-full'} items-center`}>
    <button 
      className={`flex items-center focus:outline-none md:cursor-pointer ${
        isSidebarCollapsed ? 'justify-center p-0' : ''
      }`}
      onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      onMouseEnter={() => setIsLogoHovered(true)}
      onMouseLeave={() => setIsLogoHovered(false)}
    >
      <div className="relative h-8 w-8 flex-shrink-0">
        <Image 
          src={isSidebarCollapsed && isLogoHovered ? "/sidebar.png" : "/logo.png"}
          alt="Locked Logo" 
          fill
          className="object-contain transition-opacity duration-300"
          sizes="32px"
        />
      </div>
          {!isSidebarCollapsed && (
            <div className="ml-3 text-xl font-bold text-primary cursor-pointer">
              {isSupportAgent ? 'Support' : 'Administrator'}
            </div>
          )}
    </button>
    
    {/* Collapse button - only shown when sidebar is expanded */}
    
  </div>
  
  {/* Mobile close button (only show when not collapsed) */}
  {!isSidebarCollapsed && (
    <button
      className="md:hidden p-1 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-700 dark:hover:text-gray-300"
      onClick={() => setIsMobileSidebarOpen(false)}
    >
      <X className="h-5 w-5" />
    </button>
  )}
</div>
          
          {/* Navigation links */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {navigation.map((item) => {
                // Active state logic:
                // - Dashboard: exact match only
                // - Backups: match /admin/settings/backup and deeper
                // - Settings: exact /admin/settings only (NOT /admin/settings/backup which has its own nav item)
                // - Others: exact or nested path prefix
                let isActive: boolean;
                if (item.href === '/admin') {
                  isActive = pathname === '/admin';
                } else if (item.href === '/admin/settings/backup') {
                  isActive = pathname === '/admin/settings/backup' || pathname.startsWith('/admin/settings/backup/');
                } else if (item.href === '/admin/settings') {
                  isActive = pathname === '/admin/settings';
                } else {
                  isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                }
                
                return (
                  <li key={item.name}>
                    <Tooltip content={item.name} disabled={!isSidebarCollapsed} position="right" delay={0.1}>
                      <Link
                        href={item.href}
                        className={`flex items-center py-2 px-3 rounded-md w-full ${
                          isActive
                            ? 'bg-black dark:bg-black text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800'
                        } ${
                          isSidebarCollapsed ? 'justify-center' : ''
                        }`}
                        onClick={() => setIsMobileSidebarOpen(false)}
                      >
                        <div className="relative">
                          <item.icon
                            className={`h-5 w-5 flex-shrink-0 ${
                              isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                            }`}
                            aria-hidden="true"
                          />
                          {typeof item.badge === 'number' && item.badge > 0 && (
                            <span className={`pointer-events-none select-none absolute -top-2 -right-2 min-w-[18px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center leading-none ${isSidebarCollapsed ? '' : 'shadow-sm'}`}>{item.badge > 99 ? '99+' : item.badge}</span>
                          )}
                        </div>
                        {!isSidebarCollapsed && (
                          <span className="ml-3 truncate">{item.name}</span>
                        )}
                      </Link>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </nav>
          
          {/* Sidebar footer: show only logout icon when collapsed; full sign out button when expanded */}
          <div className="border-t border-gray-200 dark:border-neutral-800 p-3">
            {isSidebarCollapsed ? (
              <div className="flex justify-center">
                <Tooltip content="Sign out" disabled={!isSidebarCollapsed} position="right">
                  <button
                    onClick={handleLogout}
                    className="w-10 h-10 flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Sign out</span>
                  </button>
                </Tooltip>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign out</span>
              </button>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className={`flex-1 flex flex-col transition-all duration-300 overflow-hidden`}>
          {/* New modular header component */}
          <AdminHeader
            user={adminUser}
            pathname={pathname}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            logout={handleLogout}
          />
          
          {/* Main content area - blur target for search modal */}
          <div id="admin-page-content" className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </div>
      
      {/* Backdrop for mobile sidebar */}
      {isMobileSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
  </ThemeProvider>
  );
}