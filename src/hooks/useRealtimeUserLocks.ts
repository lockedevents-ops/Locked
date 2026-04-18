import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLockStore } from '@/store/lockStore';
import { sharedEventService } from '@/services/sharedEventService';

export function useRealtimeUserLocks() {
  const { user } = useAuth();
  const setLockState = useLockStore(state => state.setLockState);
  const isItemLocked = useLockStore(state => state.isItemLocked);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`user_locks:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and DELETE
          schema: 'public',
          table: 'user_event_locks',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload: any) => {
          console.log('Realtime user lock update:', payload);

          if (payload.eventType === 'INSERT') {
            const eventId = payload.new.event_id;
            
            // Check if we already have it (to avoid refetching if local action triggered it)
            if (isItemLocked(eventId, 'event')) return;

            // Fetch event details to populate store data
            try {
              const eventDetails = await sharedEventService.getEventDetails(eventId);
              
              if (eventDetails) {
                 // Construct minimal data needed for lock store
                 // Note: We might need to map or ensure format matches what SavedEventsPage expects
                 const lockData = {
                    id: eventDetails.id,
                    title: eventDetails.title,
                    date: eventDetails.date || eventDetails.start_date, // Handle different formats
                    imageUrl: eventDetails.image_url || eventDetails.image,
                    location: eventDetails.venue,
                    price: eventDetails.tickets && eventDetails.tickets.length > 0 ? `From ${eventDetails.tickets[0].price}` : 'Free', // Approximate
                    category: eventDetails.category,
                    organizer: { name: eventDetails.organizer?.business_name || 'Organizer' }
                 };

                 setLockState(eventId, 'event', true, lockData);
              }
            } catch (error) {
              console.error('Error fetching event details for realtime lock:', error);
            }

          } else if (payload.eventType === 'DELETE') {
            const eventId = payload.old.event_id; // DELETE payloads contain 'old' record with ID
            
            // For DELETE, we might only get the ID if RLS or identity is set up a certain way, 
            // but usually 'old' has the PK. user_event_locks PK is typically id or composite. 
            // If composite PK (user_id, event_id), we need to ensure REPLICA IDENTITY FULL is probably not on, 
            // so we rely on what supabase sends. Supabase sends old record for DELETE.
            
            if (eventId) {
                setLockState(eventId, 'event', false);
            } else {
                 // Fallback if event_id is missing in payload (can happen if table doesn't have REPLICA IDENTITY FULL)
                 // But wait, user_locks usually has an ID. Let's hope event_id is there.
                 // If not, we might need to refresh all locks.
                 console.warn('Received DELETE event but no event_id in payload. Payload:', payload);
            }
          }
        }
      )
      .subscribe((status: any) => {
          if (status === 'SUBSCRIBED') {
            // Optional: Sync all locks on connect to ensure consistency?
            // For now, rely on initial fetch or hydration.
          }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, setLockState, isItemLocked]);
}
