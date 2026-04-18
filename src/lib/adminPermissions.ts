/**
 * adminPermissions.ts – Admin Capability Helpers (Consolidated)
 * 
 * All role checking now goes through AuthContext for consistency.
 * No more direct localStorage access or duplicate role checking logic.
 */
import { useAuth } from '@/contexts/AuthContext';

// Permission checking functions
export function canDeleteUser(adminRole: string, targetUserId: string): boolean {
  // Only super_admins can delete users
  return adminRole === 'super_admin';
}

export function canSuspendUser(adminRole: string, targetUserId: string): boolean {
  // Super_admins can suspend any user
  // Regular admins can suspend regular users (not admins)
  return adminRole === 'super_admin' || adminRole === 'admin';
}

export function canEditUser(adminRole: string, targetUserId: string): boolean {
  // Super_admins can edit any user
  // Regular admins can edit regular users (not admins)
  return adminRole === 'super_admin' || adminRole === 'admin';
}

export function canManagePassword(adminRole: string, targetUserId: string, targetRole?: string): boolean {
  // Only super_admins can directly set passwords
  return adminRole === 'super_admin';
}

/**
 * Hook to get all admin permissions for current user
 * All role checks consolidated through AuthContext.hasRole()
 */
export function useAdminPermissions() {
  const { hasRole, hasAnyRole } = useAuth();
  
  // Determine current admin role
  const isSuperAdmin = hasRole('super_admin');
  const isAdmin = hasRole('admin');
  const isSupportAgent = hasRole('support_agent');
  const isAdminOfAnyKind = hasAnyRole(['admin', 'super_admin', 'support_agent']);
  
  return {
    // User management
    canDeleteUsers: isSuperAdmin,
    canSuspendUsers: isAdminOfAnyKind,
    canManageAdmins: isSuperAdmin,
    canEditUser: isAdminOfAnyKind,
    canManagePassword: isSuperAdmin,
    
    // Content management
    canDeleteEvents: isSuperAdmin,
    canDeleteVenues: isSuperAdmin,
    canModerateContent: isAdminOfAnyKind,
    
    // System
    canAccessSystemSettings: isSuperAdmin,
    canViewAuditLogs: isSuperAdmin,
    canExportData: isAdminOfAnyKind,
    canApproveRoleRequests: isAdminOfAnyKind,
    
    // Role info
    isSuperAdmin,
    isAdmin,
    isSupportAgent,
    isAdminOfAnyKind,
  };
}