/**
 * Database-backed Activity Service
 * --------------------------------------------------------------
 * REPLACES: localStorage-based activityService.ts
 * 
 * NEW ROLE:
 *  - All activity logging goes directly to Supabase database
 *  - Real-time activity retrieval from database
 *  - Comprehensive logging of authentication, user actions, system events
 *  - NO LOCAL STORAGE - everything is database-backed
 *
 * FEATURES:
 *  - Real-time activity logging to Supabase
 *  - Structured activity data with proper relationships
 *  - Automatic user context capture
 *  - IP address and device info tracking
 *  - Severity levels and priority handling
 *  - Admin activity dashboard data
 */

import { createClient } from '@/lib/supabase/client/client';

// Activity interfaces
export interface ActivityLog {
  id: string;
  created_at: string;
  updated_at: string;
  admin_user_id: string | null;
  admin_user_name: string | null;
  admin_user_email: string | null;
  admin_user_role: string | null;
  action_type: string;
  target_type: string;
  target_id: string | null;
  target_name: string | null;
  target_email: string | null;
  status: string;
  title: string;
  description: string;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  device_info: any;
  session_id: string | null;
  severity: string;
  priority: number;
  metadata: any;
}

export interface LogActivityParams {
  user_id?: string | null;
  user_name?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  action_type: string;
  target_type: string;
  target_id?: string | null;
  target_name?: string | null;
  target_email?: string | null;
  status?: string;
  title: string;
  description: string;
  details?: any;
  severity?: string;
  priority?: number;
  metadata?: any;
}

export interface ActivitySummary {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  status?: string | null;
  userId?: string | null;
  userName?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  icon: string;
  userRole?: string | null;
  userAgent?: string | null;
  deviceInfo?: any;
  ipAddress?: string | null;
  userAvatar?: string | null;
  location?: { city: string; country: string } | null;
  action?: string | null;
}

// Initialize Supabase client
const supabase = createClient();

// Runtime flags to avoid spamming console when logging is misconfigured
let activityLoggingDisabled = false;
let ambiguousFunctionReported = false;

// Admin roles that should have their activities logged
const ADMIN_ROLES = ['super_admin', 'admin', 'support_agent'];

// Check if user should have activities logged (admin roles only)
function shouldLogActivity(userRole: string | null | undefined): boolean {
  if (!userRole) return false;
  const normalizedRole = normalizeAdminRole(userRole);
  return ADMIN_ROLES.includes(normalizedRole);
}

// Normalize admin roles to standard format
function normalizeAdminRole(role: string | null | undefined): string {
  if (!role) return '';
  
  const lowerRole = role.toLowerCase().trim();
  switch (lowerRole) {
    case 'super_admin':
    case 'superadmin':
    case 'super admin':
      return 'super_admin';
    case 'admin':
      return 'admin';
    case 'support_agent':
    case 'supportagent':
    case 'support agent':
      return 'support_agent';
    case 'system':
      return 'system';
    default:
      return lowerRole;
  }
}

// Check if current context is admin dashboard
function isAdminDashboardContext(): boolean {
  if (typeof window === 'undefined') return false;
  
  const pathname = window.location.pathname;
  return pathname.startsWith('/admin');
}

// Get client IP and user agent info
export function getClientInfo() {
  const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : null;
  
  // Extract device info
  const deviceInfo: any = {};
  if (userAgent) {
    deviceInfo.userAgent = userAgent;
    deviceInfo.platform = navigator.platform;
    deviceInfo.language = navigator.language;
    deviceInfo.cookieEnabled = navigator.cookieEnabled;
    deviceInfo.onLine = navigator.onLine;
  }
  
  return {
    userAgent,
    deviceInfo
  };
}

// Get session ID from Supabase
async function getSessionId(): Promise<string | null> {
  try {
    // QUICK CHECK: Get session directly from local state without server round-trip verification
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? session.access_token.slice(-16) : null;
  } catch {
    return null;
  }
}

/**
 * Log an activity to the database (non-blocking, fire-and-forget)
 * Only logs activities for admin users in admin dashboard context
 */
export function logActivity(params: LogActivityParams, options?: { blocking?: boolean }): Promise<string | null> {
  const executeLogging = async () => {
    if (activityLoggingDisabled) return null;
    
    // Only log activities for admin users OR when in admin dashboard context
    const isAdminUser = shouldLogActivity(params.user_role);
    const isAdminContext = isAdminDashboardContext();
    
    // RELAXATION: If it's a login event, we should be more lenient with context
    // because the user might be mid-transition from /admin/login to /admin
    const isAuthEvent = ['login', 'logout', 'register'].includes(params.action_type);
    
    if (!isAdminUser && !isAdminContext && !isAuthEvent) {
      return null;
    }
    
    try {
      const { userAgent, deviceInfo } = getClientInfo();
      const sessionId = await getSessionId();
      
      // Normalize the user role before sending to database
      const normalizedRole = normalizeAdminRole(params.user_role) || params.user_role;
      
      // Call local API route to ensure IP capture (server-side)
      const response = await fetch('/api/admin/activity/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_user_id: params.user_id || null,
          admin_user_name: params.user_name || null,
          admin_user_email: params.user_email || null,
          admin_user_role: normalizedRole || null,
          action_type: params.action_type,
          target_type: params.target_type,
          target_id: params.target_id && /[0-9a-fA-F-]{36}/.test(params.target_id) ? params.target_id : null,
          target_name: params.target_name || null,
          target_email: params.target_email || null,
          status: params.status || 'success',
          title: params.title,
          description: params.description,
          details: params.details || {},
          user_agent: userAgent,
          device_info: deviceInfo || {},
          session_id: sessionId,
          severity: params.severity || 'info',
          priority: params.priority || 0,
          metadata: params.metadata || {}
        }),
      });

      if (!response.ok) {
        // If API fails (e.g., net error), we could fallback to direct RPC, 
        // but for now let's just log the error to avoid complexity
        console.error('Failed to log activity via API:', response.statusText);
        return null;
      }

      const data = await response.json();
      return data.id || null;
    } catch (err) {
      console.error('Error in logActivity:', err);
      return null;
    }
  };

  if (options?.blocking) {
    return executeLogging();
  }

  // Non-blocking version (default)
  return new Promise((resolve) => {
    resolve(null);
    setTimeout(executeLogging, 0);
  });
}

/**
 * Get recent activities from database
 */
export async function getRecentActivities(limit: number = 5, daysBack: number = 7): Promise<ActivitySummary[]> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const { data: activities, error } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }

    return activities?.map(transformToActivitySummary) || [];
  } catch (error) {
    console.error('Failed to fetch recent activities:', error);
    return [];
  }
}

/**
 * Get all activities from database (with pagination)
 */
export async function getAllActivities(daysBack: number = 30, limit: number = 100, offset: number = 0): Promise<ActivitySummary[]> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const { data: activities, error } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching all activities:', error);
      return [];
    }

    const transformedActivities = activities?.map(transformToActivitySummary) || [];
    
    // Deduplicate by ID to prevent React key conflicts
    const uniqueActivities = transformedActivities.filter((activity: any, index: number, self: any[]) => 
      index === self.findIndex((a: any) => a.id === activity.id)
    );
    
    if (uniqueActivities.length !== transformedActivities.length) {
      console.warn(`⚠️ Database returned ${transformedActivities.length - uniqueActivities.length} duplicate activities, deduplicated to ${uniqueActivities.length}`);
    }
    
    return uniqueActivities;
  } catch (error) {
    console.error('Failed to fetch all activities:', error);
    return [];
  }
}

/**
 * Get activities by type
 */
export async function getActivitiesByType(type: string, daysBack: number = 30, limit: number = 50): Promise<ActivitySummary[]> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const { data: activities, error } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .eq('target_type', type)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(`Error fetching ${type} activities:`, error);
      return [];
    }

    return activities?.map(transformToActivitySummary) || [];
  } catch (error) {
    console.error(`Failed to fetch ${type} activities:`, error);
    return [];
  }
}

/**
 * Get activities by user
 */
export async function getActivitiesByUser(userId: string, daysBack: number = 30, limit: number = 50): Promise<ActivitySummary[]> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const { data: activities, error } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .eq('admin_user_id', userId)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user activities:', error);
      return [];
    }

    return activities?.map(transformToActivitySummary) || [];
  } catch (error) {
    console.error('Failed to fetch user activities:', error);
    return [];
  }
}

/**
 * Transform database activity to ActivitySummary format (for compatibility with existing UI)
 */
function transformToActivitySummary(activity: ActivityLog): ActivitySummary {
  const details = activity.details || {};
  const actionType = details.action_type || activity.action_type || 'unknown';
  let targetType = details.target_type || activity.target_type || 'unknown';
  const title = details.title || activity.title || 'Activity';
  
  // Categorization: Force lockouts/security lockdown into 'system' category
  const isSecurityEvent = actionType === 'ip_lockout' || 
                         title.toLowerCase().includes('lockout') || 
                         title.toLowerCase().includes('lockdown') ||
                         targetType === 'security';

  if (isSecurityEvent) {
    targetType = 'system';
  }

  const description = details.description || activity.description || `${actionType} action performed`;
  const status = details.status || activity.status || 'success';
  const adminUserName = details.admin_user_name || activity.admin_user_name || 'Unknown User';
  const adminUserRole = details.admin_user_role || activity.admin_user_role || 'user';
  const targetId = details.target_id || activity.target_id;
  
  return {
    id: activity.id,
    type: targetType,
    title: title,
    description: description,
    timestamp: activity.created_at,
    status: mapStatusToLegacyFormat(status),
    userId: activity.admin_user_id || null,
    userName: adminUserName,
    entityId: targetId,
    entityType: targetType,
    icon: getIconForActivityType(targetType, actionType),
    userRole: adminUserRole,
    userAgent: details.user_agent || activity.user_agent || null,
    deviceInfo: details.device_info || activity.device_info || null,
    ipAddress: activity.ip_address || activity.device_info?.ip || details.device_info?.ip || details.detected_ip || null,
    userAvatar: details.user_avatar || null,
    location: details.device_info?.location || null,
    action: actionType
  };
}

/**
 * Map database status to legacy UI status format
 */
function mapStatusToLegacyFormat(status: string): string | null {
  switch (status) {
    case 'success': return 'approved';
    case 'failure': return 'failed';
    case 'pending': return 'pending';
    case 'warning': return 'locked';
    default: return status;
  }
}

/**
 * Get appropriate icon based on activity type and action
 */
function getIconForActivityType(targetType: string, actionType: string): string {
  // Authentication activities
  if (targetType === 'authentication' || targetType === 'auth') {
    return 'Users';
  }

  // Role request activities
  if (targetType === 'role_request') {
    if (actionType === 'approve') return 'CheckCircle';
    if (actionType === 'reject') return 'XCircle';
    return 'Users';
  }

  // Event activities
  if (targetType === 'event') {
    return 'CalendarCheck';
  }

  // Venue activities
  if (targetType === 'venue') {
    return 'Building';
  }

  // User activities
  if (targetType === 'user') {
    return 'User';
  }

  // System activities
  if (targetType === 'system') {
    return 'Settings';
  }

  // Default
  return 'Info';
}

// =============================================================================
// SPECIFIC ACTIVITY LOGGING FUNCTIONS
// =============================================================================

/**
 * Log authentication events (login/logout) - Only for admin users in admin dashboard context
 */
export async function logAuthEvent(
  userId: string | null,
  userEmail: string | null,
  userName: string | null,
  userRole: string | null,
  actionType: 'login' | 'logout' | 'register',
  status: 'success' | 'failure' = 'success',
  details?: string,
  avatarUrl?: string | null
): Promise<void> {
  // Always log auth events if an admin role is present or we're in admin context
  const isAdminUser = shouldLogActivity(userRole);
  const isAdminContext = isAdminDashboardContext();
  
  if (!isAdminUser && !isAdminContext) {
    return;
  }
  
  const titles = {
    login: 'Admin Login',
    logout: 'Admin Logout', 
    register: 'User Registration'
  };

  const descriptions = {
    login: `${userName || userEmail || 'Unknown user'} logged in`,
    logout: `${userName || userEmail || 'Unknown user'} logged out`,
    register: `${userName || userEmail || 'Unknown user'} registered a new account`
  };

  // Auth events should block to ensure they persist before navigation/session cleanup
  await logActivity({
    user_id: userId,
    user_name: userName,
    user_email: userEmail,
    user_role: userRole,
    action_type: actionType,
    target_type: 'auth',
    status: status,
    title: titles[actionType] || 'Auth Event',
    description: descriptions[actionType] || details || 'Authentication event',
    details: details ? { note: details } : {},
    severity: status === 'failure' ? 'warning' : 'info'
  }, { blocking: true });
}

/**
 * Log role request events
 */
export async function logRoleRequestEvent(
  userId: string,
  userName: string,
  userEmail: string,
  requestId: string,
  requestType: string,
  actionType: 'create' | 'approve' | 'reject',
  adminName?: string,
  rejectionNote?: string
): Promise<void> {
  const roleType = requestType === 'organizer' ? 'Organizer' : 'Venue Owner';
  
  let title: string;
  let description: string;
  let status: string = 'success';

  switch (actionType) {
    case 'create':
      title = `${roleType} Role Request Submitted`;
      description = `${userName} submitted a ${roleType} role request`;
      status = 'pending';
      break;
    case 'approve':
      title = `${roleType} Role Request Approved`;
      description = `${adminName || 'Admin'} approved ${userName}'s ${roleType} request`;
      break;
    case 'reject':
      title = `${roleType} Role Request Rejected`;
      description = `${adminName || 'Admin'} rejected ${userName}'s ${roleType} request${rejectionNote ? ': ' + rejectionNote : ''}`;
      status = 'warning';
      break;
  }

  await logActivity({
    user_id: userId,
    user_name: userName,
    user_email: userEmail,
    user_role: 'user',
    action_type: actionType,
    target_type: 'role_request',
    target_id: requestId,
    target_name: `${roleType} Role Request`,
    status: status,
    title: title,
    description: description,
    details: { requestType, adminName, rejectionNote },
    severity: status === 'warning' ? 'warning' : 'info'
  });
}

/**
 * Log user management events (suspend, activate, delete, etc.)
 */
export async function logUserManagementEvent(
  adminId: string,
  adminName: string,
  adminEmail: string,
  targetUserId: string,
  targetUserName: string,
  targetUserEmail: string,
  actionType: 'suspend' | 'activate' | 'delete' | 'update',
  details?: string
): Promise<void> {
  const actions = {
    suspend: 'User Suspended',
    activate: 'User Activated',
    delete: 'User Deleted',
    update: 'User Updated'
  };

  await logActivity({
    user_id: adminId,
    user_name: adminName,
    user_email: adminEmail,
    user_role: 'admin',
    action_type: actionType,
    target_type: 'user',
    target_id: targetUserId,
    target_name: targetUserName,
    target_email: targetUserEmail,
    status: 'success',
    title: actions[actionType],
    description: `${adminName} ${actionType}d user ${targetUserName}${details ? ' - ' + details : ''}`,
    severity: actionType === 'delete' || actionType === 'suspend' ? 'warning' : 'info'
  });
}

/**
 * Log system events
 */
export async function logSystemEvent(
  actionType: string,
  title: string,
  description: string,
  severity: 'info' | 'warning' | 'error' = 'info',
  details?: any
): Promise<void> {
  await logActivity({
    user_id: null,
    user_name: 'System',
    user_email: 'system@locked.app',
    user_role: 'system',
    action_type: actionType,
    target_type: 'system',
    status: 'success',
    title: title,
    description: description,
    details: details,
    severity: severity
  });
}

/**
 * Migration helper: Log that the system has been migrated from localStorage
 */
export async function logMigrationEvent(): Promise<void> {
  await logSystemEvent(
    'migration',
    'Activity Logging Migration Completed',
    'Successfully migrated activity logging from localStorage to database',
    'info',
    { 
      migration_type: 'localStorage_to_database',
      migration_date: new Date().toISOString(),
      version: '1.0.0'
    }
  );
}
