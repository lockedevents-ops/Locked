/**
 * useRealtimeLockCounts Hook
 * --------------------------------------------------------------
 * Subscribes to real-time lock count updates from Supabase
 * Updates the global lock store when events' lock counts change
 */

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client/client';
import { useLockStore } from '@/store/lockStore';

interface UseRealtimeLockCountsOptions {
  eventIds: string[];
  enabled?: boolean;
}

/**
 * Subscribe to real-time lock count updates for specific events
 * @param eventIds - Array of event IDs to subscribe to
 * @param enabled - Whether the subscription is active (default: true)
 */
export function useRealtimeLockCounts({ eventIds, enabled = true }: UseRealtimeLockCountsOptions) {
  const setLockCount = useLockStore(state => state.setLockCount);
  
  useEffect(() => {
    // Don't subscribe if disabled or no event IDs
    if (!enabled || !eventIds.length) return;
    
    let unsubscribed = false;
    const supabase = createClient();
    
    // Supabase Realtime has a limit on filter size, so batch if needed
    const MAX_IDS_PER_SUBSCRIPTION = 100;
    const channels: any[] = [];
    
    // Split event IDs into batches
    for (let i = 0; i < eventIds.length; i += MAX_IDS_PER_SUBSCRIPTION) {
      const batch = eventIds.slice(i, i + MAX_IDS_PER_SUBSCRIPTION);
      
      const channel = supabase
        .channel(`lock-counts-${i}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'events',
            filter: `id=in.(${batch.join(',')})`,
          },
          (payload: any) => {
            // Ignore updates if component is unmounting
            if (unsubscribed) return;
            
            try {
              // Update the lock count in the global store
              const { id, lock_count } = payload.new as { id: string; lock_count: number };
              console.log(`[Realtime] Lock count updated for event ${id}: ${lock_count}`);
              setLockCount(id, lock_count || 0);
            } catch (err) {
              console.error('[Realtime] Error handling lock count update:', err);
            }
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            console.log(`[Realtime] Subscribed to lock counts for ${batch.length} events`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('[Realtime] Channel error for lock counts subscription');
          }
        });
      
      channels.push(channel);
    }
    
    // Cleanup: unsubscribe from all channels
    return () => {
      unsubscribed = true;
      console.log(`[Realtime] Unsubscribing from ${channels.length} lock count channels`);
      channels.forEach(channel => {
        try {
          supabase.removeChannel(channel).catch(() => {
            // Ignore unsubscribe errors
          });
        } catch (err) {
          console.error('[Realtime] Error unsubscribing from channel:', err);
        }
      });
    };
  }, [eventIds.join(','), enabled, setLockCount]);
}

/**
 * Subscribe to real-time lock count updates for a single event
 * Convenience wrapper for single event subscriptions
 */
export function useRealtimeLockCount(eventId: string, enabled = true) {
  return useRealtimeLockCounts({ eventIds: [eventId], enabled });
}
