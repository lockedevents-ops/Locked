"use client";
/**
 * useRoleCheck – DEPRECATED: Use useAuth().hasRole() instead
 * 
 * This hook is kept for backward compatibility only.
 * All role checking should go through AuthContext.
 * 
 * @deprecated Use const { hasRole } = useAuth() instead
 */

import { useAuth } from '@/contexts/AuthContext';

export function useRoleCheck(requiredRole: string) {
  const { hasRole, rolesLoading } = useAuth();
  
  // For backward compatibility, return the old structure
  // but use AuthContext under the hood
  return {
    hasRequiredRole: hasRole(requiredRole),
    loading: rolesLoading,
    userRoles: [], // Not exposed in AuthContext, use roles array if needed
  };
}