/**
 * Role Revocation Listener Hook
 * --------------------------------------------------------------
 * Listens for real-time role revocation events from admin panel.
 * When a user's role is revoked, this hook will:
 * 1. Show a notification to the user
 * 2. Immediately redirect them away from the role-specific dashboard
 * 3. Clear any cached role data
 * 
 * Also listens for reinstatement events and performs a targeted route refresh.
 */

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';

interface RoleRevocationPayload {
  userId: string;
  revokedRole: 'organizer' | 'venue_owner';
  timestamp: string;
  reason: string;
}

interface RoleReinstatementPayload {
  userId: string;
  reinstatedRole: 'organizer' | 'venue_owner';
  timestamp: string;
  reason: string;
}

export function useRoleRevocationListener(targetRole: 'organizer' | 'venue_owner') {
  const router = useRouter();
  const { user, refreshRoles } = useAuth();
  const toast = useToast();
  const revocationChannelRef = useRef<any>(null);
  const reinstatementChannelRef = useRef<any>(null);
  const hasHandledRevocation = useRef(false);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const supabase = createClient();
    
    // Create a channel to listen for revocation events
    const revocationChannel = supabase.channel(`role-revocation-${user.id}`);
    revocationChannelRef.current = revocationChannel;

    revocationChannel
      .on('broadcast', { event: 'role_revoked' }, (payload: { payload: RoleRevocationPayload }) => {
        const data = payload.payload;
        
        // Check if this revocation is for the current user and role
        if (data.userId === user.id && data.revokedRole === targetRole && !hasHandledRevocation.current) {
          hasHandledRevocation.current = true;
          
          // Show notification with specific role name
          const roleDisplayName = targetRole === 'organizer' ? 'Event Organizer' : 'Venue Owner';
          toast.showError(
            'Role Access Revoked',
            `Your ${roleDisplayName} role has been revoked by an administrator. You no longer have access to that dashboard. ${data.reason ? `Reason: ${data.reason}` : 'If you believe this is an error, please contact support.'}`,
            10000
          );
          
          // Refresh roles to update context
          refreshRoles?.();
          
          // Redirect to user dashboard after a short delay
          setTimeout(() => {
            router.push('/dashboards/user?revoked=true');
          }, 2000);
        }
      })
      .subscribe();

    // Create a channel to listen for reinstatement events
    const reinstatementChannel = supabase.channel(`role-reinstatement-${user.id}`);
    reinstatementChannelRef.current = reinstatementChannel;

    reinstatementChannel
      .on('broadcast', { event: 'role_reinstated' }, (payload: { payload: RoleReinstatementPayload }) => {
        const data = payload.payload;
        
        // Check if this reinstatement is for the current user and role
        if (data.userId === user.id && data.reinstatedRole === targetRole) {
          // Show notification
          toast.showSuccess(
            'Role Reinstated',
            `Your ${targetRole === 'organizer' ? 'Event Organizer' : 'Venue Owner'} role has been reinstated. ${data.reason}`
          );
          
          // Refresh roles to update context
          refreshRoles?.();
          
          // Refresh route state without forcing a full browser reload.
          setTimeout(() => {
            const targetDashboard = targetRole === 'organizer'
              ? '/dashboards/organizer?reinstated=true'
              : '/dashboards/venue-owner?reinstated=true';
            router.replace(targetDashboard);
            router.refresh();
          }, 1500);
        }
      })
      .subscribe();

    // Cleanup on unmount
    return () => {
      if (revocationChannelRef.current) {
        supabase.removeChannel(revocationChannelRef.current);
        revocationChannelRef.current = null;
      }
      if (reinstatementChannelRef.current) {
        supabase.removeChannel(reinstatementChannelRef.current);
        reinstatementChannelRef.current = null;
      }
    };
  }, [user?.id, targetRole, router, toast, refreshRoles]);
}
