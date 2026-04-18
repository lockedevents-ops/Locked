"use client";

import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { IdleLogout } from '@/components/system/IdleLogout';

/**
 * AdminIdleLogout – Admin-specific idle logout wrapper
 * ----------------------------------------------------------------
 * This component only renders the IdleLogout functionality when:
 * 1. The user is authenticated
 * 2. The user has admin privileges (admin, super_admin, or support_agent roles)
 * 3. The user is currently on an admin route (/admin/*)
 * 
 * This prevents the auto-logout functionality from affecting regular users
 * across the site and restricts it only to the admin dashboard.
 */
export function AdminIdleLogout() {
  const { isAuthenticated, isAdmin } = useAuth();
  const pathname = usePathname();

  // Only apply idle logout if:
  // - User is authenticated
  // - User has admin privileges
  // - Currently on an admin route
  const shouldApplyIdleLogout = isAuthenticated && isAdmin && pathname.startsWith('/admin');

  // If conditions aren't met, don't render anything
  if (!shouldApplyIdleLogout) {
    return null;
  }

  // Render the idle logout component for admin users in admin dashboard
  return <IdleLogout />;
}
