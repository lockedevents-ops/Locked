"use client";

import { useState, useEffect, ReactNode } from 'react';
import {
  CalendarCheck,
  Building,
  User,
  Users,
  Clock,
  Settings,
  AlertCircle,
  Filter as FilterIcon,
  Search,
  ChevronDown,
  CheckCircle,
  XCircle,
  Info,
  RotateCw,
  Edit,
  Trash2,
  UserPlus,
  PlusCircle,
  Lock,
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client/client';
import { getAllActivities } from '@/services/databaseActivityService';
import { useSearchParams } from 'next/navigation';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import { RefreshButton } from '@/components/admin/RefreshButton';
import { PageLoader } from '@/components/loaders/PageLoader';

// Enhanced activity interface
interface Activity {
  id: string;
  type: string;          // The general category (event, venue, user, system, role_request)
  action?: string;       // The specific action (e.g., login_failed)
  title: string;
  description: string;
  timestamp: string;
  status?: 'pending' | 'approved' | 'rejected' | 'published' | 'draft' | 'active' | 'locked' | null;
  userId?: string;
  userName?: string;
  entityId?: string;
  entityType?: string;
  userRole?: string;     // Added this property for role filtering (admin, user, organizer, venue-owner)
  userAgent?: string;
  deviceInfo?: any;
  ipAddress?: string;
  userAvatar?: string | null;
  location?: { city: string; country: string } | null;
}

// Function to get icon based on activity type and action
const getActivityIcon = (activity: Activity) => {
  const title = (activity.title || '').toLowerCase();
  const action = (activity.action || '').toLowerCase();

  // 1. High-priority Action-specific icons
  if (action === 'login_failed' || title === 'failed login' || title === 'login failed') {
    return <XCircle className="h-5 w-5 text-red-500" />;
  }

  // Security / Lockouts (USER REQUEST)
  if (action === 'ip_lockout' || action === 'lockout' || title.includes('lockout') || title.includes('blocked') || title.includes('lockdown')) {
    return <ShieldAlert className="h-5 w-5 text-red-600" />;
  }

  // Deletions
  if (action === 'delete' || title.includes('delete') || title.includes('removed')) {
    return <Trash2 className="h-5 w-5 text-red-500" />;
  }

  // Updates / Edits (USER REQUEST)
  if (action === 'update' || action === 'edit' || title.includes('update') || title.includes('edit')) {
    return <Edit className="h-5 w-5 text-amber-500" />;
  }

  // Creations
  if (action === 'create' || title.includes('create') || title.includes('new ') || title.includes('registration')) {
    if (activity.type === 'user' || activity.type === 'auth') {
      return <UserPlus className="h-5 w-5 text-blue-500" />;
    }
    return <PlusCircle className="h-5 w-5 text-blue-500" />;
  }
  
  // 2. Fallback to Type-specific icons
  switch (activity.type) {
    case 'authentication':
    case 'auth':
      return <Users className="h-5 w-5 text-indigo-500" />;
    case 'role_request':
      return <Users className="h-5 w-5 text-blue-500" />;
    case 'event':
      return <CalendarCheck className="h-5 w-5 text-green-500" />;
    case 'venue':
      return <Building className="h-5 w-5 text-purple-500" />;
    case 'user':
      return <User className="h-5 w-5 text-orange-500" />;
    case 'system':
      return <Settings className="h-5 w-5 text-gray-500" />;
    case 'alert':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Info className="h-5 w-5 text-gray-500" />;
  }
};

/**
 * Helper to parse User Agent into OS and Browser
 */
const parseDeviceDetails = (ua: string) => {
  let os = 'Unknown OS';
  const uaLower = ua.toLowerCase();
  
  if (ua.includes('iPhone') || ua.includes('iPad')) {
    const iosMatch = ua.match(/OS ([\d_]+)/);
    const iosVersion = iosMatch ? iosMatch[1].replace(/_/g, '.') : '';
    os = `iOS ${iosVersion}`.trim();
  }
  else if (ua.includes('Mac OS X')) {
    const macMatch = ua.match(/Mac OS X ([\d_.]+)/);
    const macVersion = macMatch ? macMatch[1].replace(/_/g, '.') : '';
    os = `macOS ${macVersion}`.trim();
  }
  else if (ua.includes('Windows NT')) {
    if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
    else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
    else if (ua.includes('Windows NT 6.2')) os = 'Windows 8';
    else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
    else os = 'Windows';
  }
  else if (ua.includes('Android')) {
    const androidMatch = ua.match(/Android ([\d.]+)/);
    os = `Android ${androidMatch ? androidMatch[1] : ''}`.trim();
  }
  else if (ua.includes('Linux')) os = 'Linux';
  
  let browser = 'Unknown Browser';
  if (ua.includes('Edg/')) {
    const version = ua.match(/Edg\/([\d.]+)/)?.[1];
    browser = `Edge ${version || ''}`;
  }
  else if (ua.includes('CriOS/')) { // Chrome on iOS
    const version = ua.match(/CriOS\/([\d.]+)/)?.[1]?.split('.')[0];
    browser = `Chrome ${version || ''}`;
  }
  else if (ua.includes('FxiOS/')) { // Firefox on iOS
    const version = ua.match(/FxiOS\/([\d.]+)/)?.[1]?.split('.')[0];
    browser = `Firefox ${version || ''}`;
  }
  else if (ua.includes('Chrome/')) {
    const version = ua.match(/Chrome\/([\d.]+)/)?.[1]?.split('.')[0];
    browser = `Chrome ${version || ''}`;
  }
  else if (ua.includes('Firefox/')) {
      const version = ua.match(/Firefox\/([\d.]+)/)?.[1]?.split('.')[0];
      browser = `Firefox ${version || ''}`;
  }
  else if (ua.includes('Safari/') && ua.includes('Version/')) {
      const version = ua.match(/Version\/([\d.]+)/)?.[1];
      browser = `Safari ${version || ''}`;
  }
  else if (ua.includes('Safari/')) {
      browser = 'Safari';
  }
  else if (ua.includes('OPR/') || ua.includes('Opera')) {
      const version = ua.match(/OPR\/([\d.]+)/)?.[1]?.split('.')[0];
      browser = `Opera ${version || ''}`;
  }
  
  return { os, browser };
};

// Activity item component (compact row)
const ActivityItem = ({ activity }: { activity: Activity }) => {
  let statusComponent: ReactNode = null;
  if (activity.status === 'pending') {
    statusComponent = (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
        <Clock className="mr-1 h-3 w-3" /> Pending
      </span>
    );
  } else if (activity.status === 'approved') {
    statusComponent = (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
        <CheckCircle className="mr-1 h-3 w-3" /> Approved
      </span>
    );
  } else if (activity.status === 'rejected') {
    statusComponent = (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
        <XCircle className="mr-1 h-3 w-3" /> Rejected
      </span>
    );
  } else if (activity.status === 'locked' || (activity.action === 'ip_lockout' || activity.action === 'lockout') || activity.title.includes('Lockout') || activity.title.includes('Lockdown')) {
    statusComponent = (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
        <Lock className="mr-1 h-3 w-3" /> Locked
      </span>
    );
  } else if (['failure', 'failed', 'error'].includes(activity.status as string)) {
    // Map generic failure statuses (e.g., failed authentication) to a Failed badge
    statusComponent = (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
        <XCircle className="mr-1 h-3 w-3" /> Failed
      </span>
    );
  } else if (activity.status) {
    statusComponent = (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-neutral-700">
        <Info className="mr-1 h-3 w-3" /> {String(activity.status)}
      </span>
    );
  }

  return (
    <div className="flex border-b border-gray-100 dark:border-neutral-800 last:border-0 py-2">
      <div className="mr-3 flex items-center">
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 dark:bg-neutral-700">
          {getActivityIcon(activity)}
        </div>
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h4 className={`text-sm font-medium truncate ${
            activity.action === 'login_failed' || activity.title === 'Failed Login'
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-900 dark:text-gray-100'
          }`}>
            {activity.title}
          </h4>
          {statusComponent && <div className="flex-shrink-0 ml-auto">{statusComponent}</div>}
        </div>
        {/* Description */}
        <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 leading-snug line-clamp-2">
          {activity.description}
        </p>
        
        {/* Date Row (Top) */}
        <div className="mt-2">
           <time className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
            {new Date(activity.timestamp).toLocaleString()}
          </time>
        </div>

        {/* Name and Device Row (Bottom) - Inline */}
        <div className="mt-1 flex flex-wrap items-stretch gap-2">
          {/* Admin Name */}
          {activity.userName && (
            <span className="text-[11px] font-medium text-primary/80 dark:text-primary/60 flex items-center gap-1 bg-primary/5 dark:bg-primary/10 px-1.5 py-0.5 rounded h-full min-h-[22px]">
              <User className="h-3 w-3" />
              {activity.userName} {activity.userRole ? `(${activity.userRole})` : ''}
            </span>
          )}

          {/* Device Info (Inline with Name) */}
          {(activity.userAgent || activity.deviceInfo) && (() => {
            const { os, browser } = parseDeviceDetails(activity.userAgent || '');
            
            return (
              <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5 bg-gray-50 dark:bg-neutral-800/50 px-1.5 py-0.5 rounded border border-gray-100 dark:border-neutral-800">
                <Clock className="h-3 w-3 text-gray-300" />
                {os} • {browser}
              </span>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

// Predefined filter options to ensure consistent availability regardless of data
const ACTIVITY_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'user', label: 'User Activities' },
  { value: 'auth', label: 'Authentication Events' },  // Add this option
  { value: 'event', label: 'Event Activities' },
  { value: 'venue', label: 'Venue Activities' },
  { value: 'role_request', label: 'Role Requests' },
  { value: 'system', label: 'System Activities' }
];

const STATUS_TYPES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' }
];

const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' }
];

const ROLE_TYPES = [
  { value: 'all', label: 'All Roles' },
  { value: 'user', label: 'User' },
  { value: 'organizer', label: 'Organizer' },
  { value: 'venue_owner', label: 'Venue Owner' },
  { value: 'admin', label: 'Admin' }
];

// Enhanced filter dropdown component
function FilterDropdown({ 
  id, 
  value, 
  onChange, 
  options, 
  label 
}: { 
  id: string; 
  value: string; 
  onChange: (value: string) => void; 
  options: {value: string; label: string}[];
  label: string;
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label}</label>
      <div className="relative">
        <select
          id={id}
          className="appearance-none block w-full rounded-md border border-gray-300 dark:border-neutral-800 py-2 pl-3 pr-10 text-sm 
                    focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors
                    cursor-pointer bg-white dark:bg-neutral-800 dark:text-gray-100"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </div>
      </div>
    </div>
  );
}

// Avatar component that handles signed URLs similar to AdminHeader
function ActivityAvatar({ path, name, role }: { path?: string | null, name?: string, role?: string }) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    const fetchAvatar = async () => {
      if (!path) {
        setAvatarUrl(null);
        return;
      }

      // If it's already a full URL, use it
      if (path.startsWith('http')) {
        setAvatarUrl(path);
        return;
      }

      // Logic from AdminHeader to handle storage paths
      try {
        const cacheKey = `avatar_signed_url_${path}`;
        const cachedData = localStorage.getItem(cacheKey);

        if (cachedData) {
          const { url, expiresAt } = JSON.parse(cachedData);
          if (url && expiresAt > Date.now() + 3600000) { // 1 hour buffer
             if (isMounted) setAvatarUrl(url);
             return;
          }
        }

        let filePath = path;
        // Clean path if needed (though database usually stores strict path)
        if (path.includes('admin-avatars/')) {
           const parts = path.split('admin-avatars/');
           filePath = parts[1] || path;
        }

        const { data } = await supabase.storage
          .from('admin-avatars')
          .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 1 week

        if (data?.signedUrl && isMounted) {
          setAvatarUrl(data.signedUrl);
          try {
            localStorage.setItem(cacheKey, JSON.stringify({
              url: data.signedUrl,
              expiresAt: Date.now() + (60 * 60 * 24 * 7 * 1000)
            }));
          } catch (e) {
            // Ignore storage errors
          }
        }
      } catch (err) {
        console.error('Error loading avatar:', err);
      }
    };

    fetchAvatar();

    return () => {
      isMounted = false;
    };
  }, [path]);

  if (avatarUrl) {
    return (
      <div className="relative h-7 w-7 rounded-full overflow-hidden border border-gray-100 dark:border-neutral-700 flex-shrink-0">
        <Image 
          src={avatarUrl} 
          alt={name || 'User'}
          fill
          sizes="28px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-br from-primary/80 to-primary dark:from-neutral-900 dark:to-neutral-700 flex-shrink-0 text-white text-[10px] font-bold border border-white/10 shadow-sm">
       {(() => {
         const userName = name || 'User';
         const parts = userName.trim().split(/\s+/);
         if (parts.length >= 2) {
           return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
         }
         return userName.slice(0, 2).toUpperCase();
       })()}
    </div>
  );
}

export default function ActivityPage() {
  // ✅ SESSION MANAGEMENT: Prevent session expiration on activity page
  useSessionManagement();
  
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const searchParams = useSearchParams();

  // Initialize from query params (e.g., ?type=auth)
  useEffect(() => {
    const qpType = searchParams?.get('type');
    if (qpType && ACTIVITY_TYPES.some(t => t.value === qpType)) {
      setTypeFilter(qpType);
    }
  }, [searchParams]);
  
  // Load activities from database (replaces localStorage aggregation)
  const loadActivities = async (silent = false) => {
    if (!silent) setIsLoading(true);
    
    try {
      const allSummaries = await getAllActivities(30); // past 30 days from database
      console.log(`✅ Loaded ${allSummaries.length} activities from database`);
      
      // Deduplicate activities by ID to prevent React key conflicts
      const uniqueSummaries = allSummaries.filter((activity, index, self) => 
        index === self.findIndex(a => a.id === activity.id)
      );
      
      // Map ActivitySummary objects to Activity interface
      const mappedActivities: Activity[] = uniqueSummaries.map(summary => {
        let ip = summary.ipAddress;
        
        
        let description = summary.description;
        
        // For IP Lockout events
        if ((!ip || ip === 'unknown') && (
            summary.action === 'ip_lockout' || 
            summary.title.includes('Lockout') || 
            summary.title.includes('Lockdown')
        )) {
           // 1. Extract IP
           const ipMatch = summary.description.match(/(?:IP\s+|Address\s+)([a-f0-9.:]+)/i);
           if (ipMatch && ipMatch[1]) {
             ip = ipMatch[1];
             // 2. Clean description to remove redundant IP info
             description = description.replace(ipMatch[0], '').replace(/\s+locked/, 'Locked').trim();
           }
        }
        
        let type = summary.type;
        // Reinforce System categorization for lockouts/security in frontend
        const isSecurity = summary.action === 'ip_lockout' || 
                          (summary.title || '').toLowerCase().includes('lockout') || 
                          (summary.title || '').toLowerCase().includes('lockdown');
        
        if (isSecurity) {
          type = 'system';
        }
        
        return {
          id: summary.id,
          type: type,
          title: summary.title,
          description: description,
          timestamp: summary.timestamp,
          status: summary.status as Activity['status'],
          userId: summary.userId || undefined,
          userName: summary.userName || undefined,
          entityId: summary.entityId || undefined,
          entityType: summary.entityType || undefined,
          userRole: summary.userRole || undefined,
          userAgent: summary.userAgent || undefined,
          deviceInfo: summary.deviceInfo || undefined,
          ipAddress: ip || undefined,
          location: summary.location || undefined,
          userAvatar: summary.userAvatar || undefined,
          action: summary.action || undefined
        };
      });
      
      setActivities(mappedActivities);
      setFilteredActivities(mappedActivities);
      
    } catch (error) {
      console.error('Failed to load activity logs:', error);
      // Don't show error toast on silent reload or initial load to avoid annoyance
      if (!silent) {
        // toast.error('Failed to load activities'); 
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);
  
  // Filter activities when search or filters change
  useEffect(() => {
    let results = [...activities];
    
    // Apply type filter (support legacy 'auth' value mapping to 'authentication')
    if (typeFilter !== 'all') {
      results = results.filter(a => {
        if (typeFilter === 'auth') return a.type === 'auth' || a.type === 'authentication';
        return a.type === typeFilter;
      });
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      results = results.filter(activity => activity.status === statusFilter);
    }
    
    // Apply date filter (include a month option)
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      if (dateFilter === 'today') {
        results = results.filter(activity => {
          const activityDate = new Date(activity.timestamp);
          return activityDate >= today;
        });
      } else if (dateFilter === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        results = results.filter(activity => {
          const activityDate = new Date(activity.timestamp);
          return activityDate >= yesterday && activityDate < today;
        });
      } else if (dateFilter === 'week') {
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);
        
        results = results.filter(activity => {
          const activityDate = new Date(activity.timestamp);
          return activityDate >= lastWeek;
        });
      } else if (dateFilter === 'month') {
        const lastMonth = new Date(today);
        lastMonth.setDate(lastMonth.getDate() - 30);
        
        results = results.filter(activity => {
          const activityDate = new Date(activity.timestamp);
          return activityDate >= lastMonth;
        });
      }
    }
    
    // Apply role filter - use our newly added userRole property
    if (roleFilter !== 'all') {
      results = results.filter(activity => activity.userRole === roleFilter);
    }
    
    // Apply search term
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      results = results.filter(activity => {
        // Parse device for smart searching
        const { os, browser } = parseDeviceDetails(activity.userAgent || '');
        
        return (
          (activity.title?.toLowerCase().includes(lowerSearchTerm) || false) || 
          (activity.description?.toLowerCase().includes(lowerSearchTerm) || false) ||
          (activity.userName?.toLowerCase().includes(lowerSearchTerm) || false) ||
          (activity.ipAddress?.toLowerCase().includes(lowerSearchTerm) || false) ||
          (activity.location?.city?.toLowerCase().includes(lowerSearchTerm) || false) ||
          (activity.location?.country?.toLowerCase().includes(lowerSearchTerm) || false) ||
          (os.toLowerCase().includes(lowerSearchTerm)) ||
          (browser.toLowerCase().includes(lowerSearchTerm)) ||
          (activity.userRole?.toLowerCase().includes(lowerSearchTerm) || false)
        );
      });
    }
    
    setFilteredActivities(results);
  setCurrentPage(1); // reset to first page after filter changes
  }, [activities, typeFilter, statusFilter, dateFilter, searchTerm, roleFilter]);
  
  // Get unique activity types for filter
  const activityTypes = Array.from(new Set(activities.map(a => a.type)));
  
  if (isLoading) {
    return <PageLoader message="Loading activity..." fullHeight />;
  }
  
  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / PAGE_SIZE));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const paginated = filteredActivities.slice((currentPageSafe - 1) * PAGE_SIZE, currentPageSafe * PAGE_SIZE);

  // Export handlers
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredActivities, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'activity-log.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!filteredActivities.length) return;
    const headers = ['id','type','title','description','timestamp','status','userId','userName','userRole'];
    const rows = filteredActivities.map(a => headers.map(h => {
      const val = (a as any)[h];
      // Escape quotes
      if (val === undefined || val === null) return '';
      const str = String(val).replace(/"/g,'""');
      return `"${str}"`;
    }).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'activity-log.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-gray-100">Activity Log</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{filteredActivities.length} matching of {activities.length} total entries (last 30 days)</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex gap-2 mr-auto md:mr-0">
              <button onClick={handleExportCSV} className="px-3 py-2 text-sm border border-gray-300 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 cursor-pointer">Export CSV</button>
              <button onClick={handleExportJSON} className="px-3 py-2 text-sm border border-gray-300 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 cursor-pointer">Export JSON</button>
            </div>
            <RefreshButton 
              onRefresh={loadActivities}
              isLoading={isLoading}
              className="md:order-last"
            />
        </div>
      </div>
      
      {/* Search and filters */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-2 lg:mr-4">
            <FilterIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Filters</span>
          </div>
          
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <FilterDropdown
              id="typeFilter"
              value={typeFilter}
              onChange={setTypeFilter}
              options={ACTIVITY_TYPES}
              label="Activity Type"
            />
            
            <FilterDropdown
              id="statusFilter"
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_TYPES}
              label="Status"
            />
            
            <FilterDropdown
              id="dateFilter"
              value={dateFilter}
              onChange={setDateFilter}
              options={DATE_RANGES}
              label="Date"
            />
            
            <FilterDropdown
              id="roleFilter"
              value={roleFilter}
              onChange={setRoleFilter}
              options={ROLE_TYPES}
              label="User Role"
            />
          </div>
          
          {/* Search input */}
          <div className="relative w-full lg:w-72 flex-shrink-0">
            <label htmlFor="search" className="sr-only">
              Search
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                id="search"
                placeholder="Search activities..."
                className="block w-full rounded-md border border-gray-300 dark:border-neutral-800 py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Activity List - Table layout */}
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-neutral-800/50 border-b border-gray-200 dark:border-neutral-800 text-xs uppercase text-gray-500 dark:text-gray-400">
                <th className="px-6 py-3 font-medium w-[160px]">Timestamp</th>
                <th className="px-6 py-3 font-medium w-[200px]">User</th>
                <th className="px-6 py-3 font-medium">Action</th>
                <th className="px-6 py-3 font-medium w-[160px]">IP / Location</th>
                <th className="px-6 py-3 font-medium w-[200px]">Device</th>
                <th className="px-6 py-3 font-medium w-[100px] text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
              {paginated.length > 0 ? (
                paginated.map((activity) => (
                  <tr 
                    key={activity.id} 
                    className="hover:bg-gray-50/50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="px-6 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(activity.timestamp).toLocaleString()}
                    </td>

                    {/* User */}
                    <td className="px-6 py-3">
                       <div className="flex items-center gap-2">
                        {activity.userName ? (
                          <div className="flex items-center gap-2">
                             <ActivityAvatar 
                               path={activity.userAvatar} 
                               name={activity.userName} 
                               role={activity.userRole}
                             />
                             <div className="flex flex-col">
                               <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                                 {activity.userName}
                               </span>
                               <span className="text-[10px] text-gray-500 capitalize">
                                 {activity.userRole?.replace('_', ' ') || 'User'}
                               </span>
                             </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Unknown User</span>
                        )}
                       </div>
                    </td>

                    {/* Action */}
                    <td className="px-6 py-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500">
                           {getActivityIcon(activity)}
                        </div>
                        <div>
                           <p className={`text-sm font-medium ${
                              activity.action === 'login_failed' || activity.title === 'Failed Login'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-900 dark:text-gray-100'
                            }`}>
                              {activity.title}
                           </p>
                           <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                              {activity.description}
                           </p>
                        </div>
                      </div>
                    </td>

                    {/* IP / Location */}
                    <td className="px-6 py-3">
                       <div className="flex flex-col text-[10px]">
                         <span className="text-gray-900 dark:text-gray-100 font-mono">
                           {activity.ipAddress && activity.ipAddress !== 'unknown' ? activity.ipAddress : '-'}
                         </span>
                         {activity.location?.city ? (
                            <span className="text-gray-500 dark:text-gray-400 mt-0.5">
                              {activity.location.city}, {activity.location.country}
                            </span>
                         ) : (
                            <span className="text-gray-400 mt-0.5 italic">Unknown location</span>
                         )}
                       </div>
                    </td>

                    {/* Device */}
                    <td className="px-6 py-3">
                      {(activity.userAgent || activity.deviceInfo) ? (() => {
                        const { os, browser } = parseDeviceDetails(activity.userAgent || '');

                        return (
                          <div className="flex flex-col text-[10px] text-gray-500">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{os}</span>
                            <span>{browser}</span>
                          </div>
                        );
                      })() : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>

                    {/* Status (Right aligned) */}
                    <td className="px-6 py-3 text-right">
                       {activity.status === 'pending' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                          <Clock className="mr-1 h-3 w-3" /> Pending
                        </span>
                       )}
                       {activity.status === 'approved' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
                          <CheckCircle className="mr-1 h-3 w-3" /> Success
                        </span>
                       )}
                        {activity.status === 'rejected' && (
                         <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                           <XCircle className="mr-1 h-3 w-3" /> Rejected
                         </span>
                        )}
                        {activity.status === 'locked' && (
                         <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                           <Lock className="mr-1 h-3 w-3" /> Locked
                         </span>
                        )}
                         {(['failure', 'failed', 'error'].includes(activity.status as string)) && (
                         <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                           <XCircle className="mr-1 h-3 w-3" /> Failed
                         </span>
                        )}
                        {/* Fallback for any other status that might be string but not covered above */}
                        {activity.status && !['pending', 'approved', 'rejected', 'locked', 'failure', 'failed', 'error'].includes(activity.status) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-neutral-700">
                           <Info className="mr-1 h-3 w-3" /> {String(activity.status)}
                         </span>
                        )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-gray-50 dark:bg-neutral-800 p-3 rounded-full mb-3">
                        <FilterIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No activities found</p>
                      <p className="text-xs mt-1">Try adjusting your filters or clearing them to see more results</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
        
        {/* Pagination footer */}
        {filteredActivities.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800 text-sm">
            <div className="text-gray-500 dark:text-gray-400">Showing {(currentPageSafe - 1) * PAGE_SIZE + 1}-{Math.min(currentPageSafe * PAGE_SIZE, filteredActivities.length)} of {filteredActivities.length}</div>
            <div className="flex gap-2">
              <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPageSafe === 1}
              className={`px-3 py-1.5 rounded-md border border-gray-300 dark:border-neutral-800 text-sm ${currentPageSafe === 1 ? 'opacity-40 cursor-not-allowed' : 'bg-white dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-600 cursor-pointer dark:text-gray-100'}`}
              >Prev</button>
              <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPageSafe === totalPages}
              className={`px-3 py-1.5 rounded-md border border-gray-300 dark:border-neutral-800 text-sm ${currentPageSafe === totalPages ? 'opacity-40 cursor-not-allowed' : 'bg-white dark:bg-neutral-900 hover:bg-gray-100 dark:hover:bg-neutral-600 cursor-pointer dark:text-gray-100'}`}
              >Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}