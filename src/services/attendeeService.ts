/**
 * Attendee Service
 * ================
 * 
 * Provides attendee management functions for organizer dashboards.
 * This service extends eventRegistrationService with additional features
 * focused on attendee management: check-in, search, and statistics.
 * 
 * For registration-related operations (register, cancel registration),
 * use eventRegistrationService directly.
 * 
 * @module attendeeService
 * @version 2.1.0 - Integrated with eventRegistrationService
 */

import { createClient } from '@/lib/supabase/client/client';
import { eventRegistrationService, EventRegistration } from './eventRegistrationService';

export interface Attendee {
  id: string;
  name: string;
  email: string;
  phone: string;
  ticketType: string;
  purchaseDate: string;
  registeredAt: string; // Alias for purchaseDate for UI consistency
  eventId: string;
  checkedIn: boolean;
  checkInTime: string | null;
  checkedInAt: string | null; // Alias for checkInTime for UI consistency
  amount: string;
  status: string;
  qrCode?: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
}

export interface AttendeeData {
  events: Event[];
  attendees: Attendee[];
  loading: boolean;
  error?: string;
}

/**
 * Transform database registration to Attendee format
 */
function transformRegistrationToAttendee(registration: any): Attendee {
  const purchaseDate = registration.registration_date 
    ? new Date(registration.registration_date).toISOString()
    : new Date(registration.created_at).toISOString();
    
  return {
    id: registration.id,
    name: registration.attendee_name || 'Unknown',
    email: registration.attendee_email || '',
    phone: registration.attendee_phone || '',
    ticketType: registration.ticket_type || 'General Admission',
    purchaseDate: purchaseDate.split('T')[0],
    registeredAt: purchaseDate,
    eventId: registration.event_id,
    checkedIn: registration.status === 'checked_in' || !!registration.checked_in_at,
    checkInTime: registration.checked_in_at || null,
    checkedInAt: registration.checked_in_at || null,
    amount: registration.total_amount 
      ? `₵${Number(registration.total_amount).toFixed(2)}`
      : '₵0.00',
    status: registration.status,
    qrCode: registration.qr_code,
  };
}

/**
 * Attendee Service
 */
export const attendeeService = {
  /**
   * Get all attendees and events for an organizer
   */
  async getAttendeeData(userId: string): Promise<AttendeeData> {
    const supabase = createClient();
    
    try {
      // First, get the organizer ID for this user
      const { data: organizer, error: orgError } = await supabase
        .from('organizers')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (orgError && orgError.code !== 'PGRST116') {
        console.error('Error fetching organizer:', orgError);
      }
      
      // Get events for this organizer
      let eventsQuery = supabase
        .from('events')
        .select('id, title, start_date')
        .order('start_date', { ascending: false });
      
      // If user is an organizer, filter to their events
      if (organizer?.id) {
        eventsQuery = eventsQuery.eq('organizer_id', organizer.id);
      } else {
        // If not an organizer, check if they created events directly
        eventsQuery = eventsQuery.eq('created_by', userId);
      }
      
      const { data: eventsData, error: eventsError } = await eventsQuery;
      
      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        return {
          events: [],
          attendees: [],
          loading: false,
          error: 'Failed to load events'
        };
      }
      
      const events: Event[] = (eventsData || []).map((event: any) => ({
        id: event.id,
        title: event.title || 'Untitled Event',
        date: event.start_date 
          ? new Date(event.start_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      }));
      
      // If no events, return empty
      if (events.length === 0) {
        return {
          events: [],
          attendees: [],
          loading: false
        };
      }
      
      // Get registrations for all these events
      const eventIds = events.map(e => e.id);
      
      const { data: registrations, error: regError } = await supabase
        .from('event_registrations')
        .select(`
          id,
          event_id,
          attendee_name,
          attendee_email,
          attendee_phone,
          ticket_type,
          quantity_registered,
          total_amount,
          status,
          payment_status,
          registration_date,
          checked_in_at,
          qr_code,
          created_at
        `)
        .in('event_id', eventIds)
        .order('created_at', { ascending: false });
      
      if (regError) {
        console.error('Error fetching registrations:', regError);
        return {
          events,
          attendees: [],
          loading: false,
          error: 'Failed to load attendees'
        };
      }
      
      const attendees: Attendee[] = (registrations || []).map(transformRegistrationToAttendee);
      
      return {
        events,
        attendees,
        loading: false
      };

    } catch (error) {
      console.error('Error loading attendee data:', error);
      return {
        events: [],
        attendees: [],
        loading: false,
        error: 'Failed to load attendee data'
      };
    }
  },

  /**
   * Get attendees for a specific event
   * Leverages eventRegistrationService.getEventRegistrations() for consistency
   */
  async getEventAttendees(eventId: string): Promise<Attendee[]> {
    try {
      const registrations = await eventRegistrationService.getEventRegistrations(eventId);
      return registrations.map(transformRegistrationToAttendee);
    } catch (error) {
      console.error('Error in getEventAttendees:', error);
      return [];
    }
  },

  /**
   * Update attendee check-in status
   */
  async updateAttendeeCheckIn(attendeeId: string, checkedIn: boolean): Promise<boolean> {
    const supabase = createClient();
    
    try {
      const updateData: any = {
        checked_in_at: checkedIn ? new Date().toISOString() : null,
        status: checkedIn ? 'checked_in' : 'registered',
        updated_at: new Date().toISOString()
      };
      
      // If checking in, also record who checked them in
      if (checkedIn) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          updateData.checked_in_by = user.id;
        }
      }
      
      const { error } = await supabase
        .from('event_registrations')
        .update(updateData)
        .eq('id', attendeeId);

      if (error) {
        console.error('Error updating check-in status:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating check-in status:', error);
      return false;
    }
  },

  /**
   * Cancel a registration
   */
  async cancelRegistration(attendeeId: string, reason?: string): Promise<boolean> {
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('event_registrations')
        .update({
          status: 'cancelled',
          cancelled_date: new Date().toISOString(),
          cancellation_reason: reason || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', attendeeId);

      if (error) {
        console.error('Error cancelling registration:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error cancelling registration:', error);
      return false;
    }
  },

  /**
   * Get attendee by ID
   */
  async getAttendee(attendeeId: string): Promise<Attendee | null> {
    const supabase = createClient();
    
    try {
      const { data: registration, error } = await supabase
        .from('event_registrations')
        .select(`
          id,
          event_id,
          attendee_name,
          attendee_email,
          attendee_phone,
          ticket_type,
          quantity_registered,
          total_amount,
          status,
          payment_status,
          registration_date,
          checked_in_at,
          qr_code,
          created_at
        `)
        .eq('id', attendeeId)
        .single();
        
      if (error) {
        console.error('Error getting attendee:', error);
        return null;
      }
      
      return transformRegistrationToAttendee(registration);
    } catch (error) {
      console.error('Error getting attendee:', error);
      return null;
    }
  },

  /**
   * Search attendees by name or email
   */
  async searchAttendees(eventId: string, query: string): Promise<Attendee[]> {
    const supabase = createClient();
    
    try {
      const searchQuery = `%${query}%`;
      
      const { data: registrations, error } = await supabase
        .from('event_registrations')
        .select(`
          id,
          event_id,
          attendee_name,
          attendee_email,
          attendee_phone,
          ticket_type,
          quantity_registered,
          total_amount,
          status,
          payment_status,
          registration_date,
          checked_in_at,
          qr_code,
          created_at
        `)
        .eq('event_id', eventId)
        .or(`attendee_name.ilike.${searchQuery},attendee_email.ilike.${searchQuery}`)
        .order('attendee_name', { ascending: true });
      
      if (error) {
        console.error('Error searching attendees:', error);
        return [];
      }
      
      return (registrations || []).map(transformRegistrationToAttendee);
    } catch (error) {
      console.error('Error searching attendees:', error);
      return [];
    }
  },

  /**
   * Get attendee statistics for an event
   */
  async getAttendeeStats(eventId: string): Promise<{
    total: number;
    checkedIn: number;
    pending: number;
    cancelled: number;
  }> {
    const supabase = createClient();
    
    try {
      const { data: registrations, error } = await supabase
        .from('event_registrations')
        .select('status')
        .eq('event_id', eventId);
      
      if (error) {
        console.error('Error fetching attendee stats:', error);
        return { total: 0, checkedIn: 0, pending: 0, cancelled: 0 };
      }
      
      const regs = registrations || [];
      
      return {
        total: regs.length,
        checkedIn: regs.filter((r: { status: string }) => r.status === 'checked_in').length,
        pending: regs.filter((r: { status: string }) => r.status === 'registered' || r.status === 'pending_approval').length,
        cancelled: regs.filter((r: { status: string }) => r.status === 'cancelled' || r.status === 'refunded').length,
      };
    } catch (error) {
      console.error('Error getting attendee stats:', error);
      return { total: 0, checkedIn: 0, pending: 0, cancelled: 0 };
    }
  }
};
