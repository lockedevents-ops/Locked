"use client";

import { useState, useEffect, useCallback } from 'react';
import { sharedEventService, isEventLive, isEventUpcoming, isPastEvent } from '@/services/sharedEventService';
import { getFormattedImagePath } from '@/utils/imageHelpers';

export interface Ticket {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  eventEndDate?: string;
  eventEndTime?: string;
  eventImage: string;
  eventLocation?: string;
  venue: string;
  ticketType: string;
  price: number;
  purchaseDate: string;
  status: 'valid' | 'used' | 'expired';
  ticketNumber: string;
  qrCode?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  organizerName?: string;
  organizerEmail?: string;
  organizerPhone?: string;
  quantityRegistered?: number;
  locationType?: 'physical' | 'online' | 'hybrid';
  onlineUrl?: string;
  onlinePlatform?: string;
  meetingCode?: string;
  meetingPassword?: string;
}

export type FilterStatus = 'all' | 'upcoming' | 'live' | 'past';

interface UseUserTicketsOptions {
  userEmail: string;
  userId: string;
  filterStatus?: FilterStatus;
}

export function useUserTickets({ userEmail, userId, filterStatus = 'all' }: UseUserTicketsOptions) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // DEBUG LOGGING
  useEffect(() => {
    console.log('[useUserTickets] Hook mounted/updated', { userEmail, userId, filterStatus });
  }, [userEmail, userId, filterStatus]);

  // Fetch and transform tickets
  const loadTickets = useCallback(async () => {
    // Normalize email to lowercase
    const normalizedEmail = userEmail?.toLowerCase() || '';
    
    console.log('[useUserTickets] loadTickets called', { normalizedEmail });

    if (!normalizedEmail) {
      console.log('[useUserTickets] No email provided, skipping fetch');
      setTickets([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[useUserTickets] Fetching tickets from sharedEventService...');
      // Use cached service method
      const registrations = await sharedEventService.getUserTickets(normalizedEmail);
      
      console.log('[useUserTickets] Raw registrations fetched:', registrations?.length || 0);
      
      if (!registrations || registrations.length === 0) {
        console.log('[useUserTickets] No registrations found');
        setTickets([]);
        return;
      }
      
      // Transform registrations to ticket format
      const transformedTickets: Ticket[] = registrations
        .map((reg: any): Ticket | null => {
          const event = reg.events;
          
          // If event doesn't exist, create fallback event data
          const eventData = event || {
            title: `Event (${reg.event_id?.substring(0, 8) || 'Unknown'})`,
            start_date: new Date().toISOString().split('T')[0],
            start_time: '00:00',
            end_date: null,
            end_time: null,
            image_url: null,
            venue: 'TBD',
            city: null,
            location_type: null,
            status: 'cancelled'
          };
          
          // Normalize for shared status helpers
          const statusCheckEvent = {
            startDate: eventData.start_date,
            time: eventData.start_time,
            endDate: eventData.end_date,
            end_time: eventData.end_time
          };

          // Determine status using shared helpers for consistency
          const isCancelled = reg.status === 'cancelled' || eventData?.status === 'cancelled';
          const status: 'valid' | 'used' | 'expired' = isCancelled || isPastEvent(statusCheckEvent)
            ? 'expired'
            : 'valid';
          
          return {
            id: reg.id,
            eventId: reg.event_id,
            eventTitle: eventData.title,
            eventDate: eventData.start_date || new Date().toISOString().split('T')[0],
            eventTime: eventData.start_time || undefined,
            eventEndDate: eventData.end_date || undefined,
            eventEndTime: eventData.end_time || undefined,
            eventImage: getFormattedImagePath(eventData.image_url),
            eventLocation: eventData.location_city || eventData.venue || 'TBD',
            venue: eventData.venue || eventData.city || 'TBD',
            ticketType: reg.ticket_type,
            price: reg.total_amount,
            purchaseDate: reg.created_at,
            status,
            ticketNumber: reg.ticket_id || `T${reg.id.substring(0, 6).toUpperCase()}`,
            qrCode: reg.qr_code || undefined,
            userId,
            userName: reg.attendee_name || undefined,
            userEmail: reg.attendee_email || undefined,
            userPhone: reg.attendee_phone || undefined,
            organizerName: eventData.organizers?.business_name || undefined,
            organizerEmail: eventData.organizers?.contact_email || undefined,
            quantityRegistered: reg.quantity_registered || 1,
            organizerPhone: eventData.organizers?.contact_phone || eventData.organizers?.business_phone || undefined,
            locationType: eventData.location_type,
            onlineUrl: eventData.online_url,
            onlinePlatform: eventData.online_platform,
            meetingCode: eventData.meeting_code,
            meetingPassword: eventData.meeting_password
          };
        })
        .filter((ticket): ticket is Ticket => ticket !== null);
      
      console.log('[useUserTickets] Transformed tickets count:', transformedTickets.length);
      console.log('[useUserTickets] First transformed ticket (sample):', transformedTickets[0]);
      
      setTickets(transformedTickets);
    } catch (err) {
      console.error('Error loading tickets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
      setTickets([]);
    } finally {
      setIsLoading(false);
    }
  }, [userEmail, userId]);

  // Load tickets on mount and when userEmail changes
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Filter tickets based on status
  const filteredTickets = tickets.filter(ticket => {
    // console.log(`[useUserTickets] Filtering ticket: ${ticket.eventTitle}, Status: ${filterStatus}`);
    // Map properites to match what the shared helpers expect
    const eventForStatusCheck = {
      startDate: ticket.eventDate,
      time: ticket.eventTime,
      endDate: ticket.eventEndDate,
      end_time: ticket.eventEndTime
    };

    const isUpcoming = isEventUpcoming(eventForStatusCheck);
    const isLive = isEventLive(eventForStatusCheck);
    const isPast = isPastEvent(eventForStatusCheck);
    
    // Debug logging for filtering logic
    console.log(`[useUserTickets] Filtering "${ticket.eventTitle}":`, {
      eventDate: ticket.eventDate,
      isUpcoming,
      isLive,
      isPast,
      filterStatus,
      willShow: filterStatus === 'all' || 
                (filterStatus === 'upcoming' && isUpcoming) ||
                (filterStatus === 'live' && isLive) ||
                (filterStatus === 'past' && isPast)
    });
    
    if (filterStatus === 'upcoming') {
      return isUpcoming;
    }
    if (filterStatus === 'live') {
      return isLive;
    }
    if (filterStatus === 'past') {
      return isPast;
    }
    return true; // 'all'
  });

  // Manual refresh function
  const refresh = useCallback(async () => {
    await loadTickets();
  }, [loadTickets]);

  // Clear cache function (call after booking/cancelling)
  const clearCache = useCallback(() => {
    sharedEventService.clearUserTicketsCache(userEmail?.toLowerCase());
  }, [userEmail]);

  return {
    tickets: filteredTickets,
    allTickets: tickets,
    isLoading,
    error,
    refresh,
    clearCache
  };
}
