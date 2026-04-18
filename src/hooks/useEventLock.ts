import { useOptimisticMutation } from '@/hooks/useSupabaseQuery';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { useLockStore } from '@/store/lockStore';
import { engagementService } from '@/services/engagementService';
import { requestCache } from '@/lib/requestCache';
import { sharedEventService } from '@/services/sharedEventService';
import { createClient } from '@/lib/supabase/client/client';
import { createElement, useEffect, useRef, useState } from 'react';
import { SignInModal } from '@/components/ui/SignInModal';
import { usePathname } from 'next/navigation';

interface UseEventLockProps {
  eventId: string;
  eventSlug?: string;
  organizerId?: string;
  eventTitle?: string;
  initialLockCount?: number;
  lockMetadata?: any;
  onRequireSignIn?: () => void;
}

export function useEventLock({
  eventId,
  eventSlug,
  organizerId,
  eventTitle = 'Event',
  initialLockCount,
  lockMetadata,
  onRequireSignIn,
}: UseEventLockProps) {
  const toast = useToast();
  const { user, isAuthenticated } = useAuth();
  const isItemLocked = useLockStore(state => state.isItemLocked);
  const toggleLock = useLockStore(state => state.toggleLock);
  const setLockCount = useLockStore(state => state.setLockCount);
  const lockCountFromStore = useLockStore(state => state.lockCounts[eventId]);

  const [showSignInModal, setShowSignInModal] = useState(false);
  const pathname = usePathname();

  const isLocked = isItemLocked(eventId, 'event');
  const currentLockCount = lockCountFromStore ?? initialLockCount ?? 0;

  const lockPayloadRef = useRef<any>(lockMetadata);

  useEffect(() => {
    lockPayloadRef.current = lockMetadata;
  }, [lockMetadata]);

  useEffect(() => {
    if (initialLockCount === undefined || lockCountFromStore !== undefined) {
      return;
    }
    setLockCount(eventId, initialLockCount);
  }, [eventId, initialLockCount, lockCountFromStore, setLockCount]);

  // ✅ REALTIME: Subscribe to lock count updates for this event
  useEffect(() => {
    const supabase = createClient();
    
    const channel = supabase
      .channel(`lock-count-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        (payload: any) => {
          const newCount = payload.new.lock_count || 0;
          console.log(`[useEventLock] Realtime update: event ${eventId} lock count = ${newCount}`);
          setLockCount(eventId, newCount);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, setLockCount]);

  const { mutate: mutateLock, isMutating: isLockMutating } = useOptimisticMutation<
    { eventId: string; userId: string; action: 'lock' | 'unlock' },
    { success: boolean; newCount?: number }
  >(
    async (vars) => {
      return await engagementService.trackLock(vars.eventId, vars.userId, vars.action);
    },
    {
      onMutate: (vars) => {
        const previousCount = currentLockCount;
        return { previousCount };
      },
      onSuccess: (data, vars) => {
        if (!data.success) {
          toast.showError('Lock Update Failed', 'Failed to update lock. Please try again.');
          toggleLock(vars.eventId, 'event');
        } else if (data.newCount !== undefined) {
          // 1. Update the global store (optimistic, will be confirmed by realtime)
          setLockCount(vars.eventId, data.newCount);

          // 2. ✅ REALTIME: Invalidate lock count cache
          sharedEventService.invalidateLockCounts([vars.eventId]);
          
          // 3. Invalidate request cache for detail pages
          requestCache.invalidate(`event-details:view:${vars.eventId}`);
          if (eventSlug) {
            requestCache.invalidate(`event-details:view:${eventSlug}`);
          }
          if (organizerId) {
            requestCache.invalidate(`profile:${organizerId}`);
          }
        }
      },
      onError: (err, vars, context) => {
        console.error('[useEventLock] Lock mutation failed:', err);
        toast.showError('Lock Update Failed', 'Failed to update lock. Please try again.');
        toggleLock(vars.eventId, 'event');
        if (context?.previousCount !== undefined) {
          setLockCount(vars.eventId, context.previousCount);
        }
      },
      invalidateKeys: []
    }
  );

  const handleLock = async (eventDataForToggle?: any) => {
    if (!isAuthenticated || !user?.id) {
      if (onRequireSignIn) {
        onRequireSignIn();
      } else {
        setShowSignInModal(true);
      }
      return;
    }

    if (isLockMutating) return;

    const action = isLocked ? 'unlock' : 'lock';
    const payload = eventDataForToggle ?? lockPayloadRef.current;

    // Optimistically update the UI
    toggleLock(eventId, 'event', payload);

    if (action === 'lock') {
      toast.showSuccess('Event Locked', `"${eventTitle}" has been added to your locked events`);
    } else {
      toast.showSuccess('Event Unlocked', `"${eventTitle}" has been removed from your locked events`);
    }

    // Persist to database in background
    try {
      await mutateLock({ eventId: eventId, userId: user.id, action });
    } catch (err) {
      console.error('Lock mutation error:', err);
    }
  };
  
  const SignInModalComponent = onRequireSignIn
    ? null
    : () =>
        createElement(SignInModal, {
          isOpen: showSignInModal,
          onClose: () => setShowSignInModal(false),
          action: 'lock',
          returnUrl: pathname,
        });

  return {
    isLocked,
    isLockMutating,
    handleLock,
    SignInModalComponent,
    lockCount: currentLockCount,
  };
}
