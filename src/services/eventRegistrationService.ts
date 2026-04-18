/**
 * Event Registration Service
 * --------------------------------------------------------------
 * Handles event registrations for free events using the event_registrations table.
 * Provides CRUD operations and analytics for event organizers and admins.
 */

import { createClient } from '@/lib/supabase/client/client';
import QRCode from 'qrcode';
import { sharedEventService } from './sharedEventService';
import { getFormattedImagePath } from '@/utils/imageHelpers';

export interface EventRegistration {
  id: string;
  event_id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  ticket_type: string;
  quantity_registered: number;
  total_amount: number;
  status: 'confirmed' | 'cancelled' | 'pending';
  payment_status: 'pending' | 'paid' | 'refunded';
  ticket_id?: string; // Add unique ticket ID for check-in
  qr_code?: string; // Add QR code field
  created_at: string;
  updated_at: string;
}

export interface EventRegistrationFormData {
  attendee_name: string;
  attendee_email: string;
  attendee_phone?: string;
  ticket_type: string;
  quantity?: number;
}

export interface EventRegistrationStats {
  total_registrations: number;
  confirmed_registrations: number;
  cancelled_registrations: number;
  registrations_by_ticket_type: { [key: string]: number };
  recent_registrations: EventRegistration[];
}

class EventRegistrationService {
  
  /**
   * Generate a unique 5-digit alphanumeric ticket ID
   */
  private generateTicketId(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters (0, O, 1, I)
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  
  /**
   * Ensure ticket ID is unique by checking database
   */
  private async generateUniqueTicketId(): Promise<string> {
    const supabase = createClient();
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const ticketId = this.generateTicketId();
      
      // Check if this ticket ID already exists
      const { data, error } = await supabase
        .from('event_registrations')
        .select('id')
        .eq('ticket_id', ticketId)
        .single();
        
      // If no record found, this ID is available
      if (error && error.code === 'PGRST116') {
        return ticketId;
      }
      
      attempts++;
    }
    
    // Fallback with timestamp if all attempts fail
    return this.generateTicketId() + Date.now().toString().slice(-2);
  }
  
  /**
   * Generate a unique QR code for a registration
   */
  private async generateQRCode(registrationId: string, eventId: string, attendeeEmail: string): Promise<string | null> {
    try {
      // Create a unique identifier for check-in
      const qrData = {
        registrationId,
        eventId,
        attendeeEmail,
        timestamp: new Date().toISOString(),
        // Add a random component for uniqueness
        checksum: Math.random().toString(36).substring(2, 15)
      };
      
      // Generate QR code as data URL
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return null;
    }
  }
  
  /**
   * Check if an event is free (has at least one free ticket)
   */
  async isEventFree(eventId: string): Promise<boolean> {
    const supabase = createClient();
    
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('tickets')
        .eq('id', eventId)
        .single();
        
      if (error || !event) {
        console.error('Error checking if event is free:', error);
        return false;
      }
      
      // Check if any ticket has price 0
      const tickets = Array.isArray(event.tickets) ? event.tickets : [];
      return tickets.some((ticket: any) => ticket.price === 0);
    } catch (error) {
      console.error('Error in isEventFree:', error);
      return false;
    }
  }

  /**
   * Register a user for a free event
   */
  async registerForEvent(
    eventId: string, 
    registrationData: EventRegistrationFormData
  ): Promise<{ success: boolean; registration?: EventRegistration; error?: string }> {
    const supabase = createClient();
    
    try {
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'You must be logged in to register for events' };
      }

      // Normalize email to lowercase for consistency
      const normalizedEmail = registrationData.attendee_email?.toLowerCase() || '';
      
      // First check if event is free
      const isFree = await this.isEventFree(eventId);
      if (!isFree) {
        return { success: false, error: 'This event requires payment' };
      }

      // Check if user is already registered (using case-insensitive comparison)
      const { data: existingRegistration } = await supabase
        .from('event_registrations')
        .select('id, quantity_registered')
        .eq('event_id', eventId)
        .ilike('attendee_email', normalizedEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (existingRegistration) {
        // Handle update for free events
        const newTotalQuantity = (existingRegistration.quantity_registered || 0) + (registrationData.quantity || 1);
        
        // Enforce limit of 5
        if (newTotalQuantity > 5) {
          return { 
            success: false, 
            error: `You can only reserve a maximum of 5 spots. You already have ${existingRegistration.quantity_registered}.` 
          };
        }

        // Update existing registration
        const { data: updatedRegistration, error: updateError } = await supabase
          .from('event_registrations')
          .update({
            quantity_registered: newTotalQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRegistration.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating registration:', updateError);
          return { success: false, error: 'Failed to update registration' };
        }

        // Update attendee count in events table
        await this.updateEventAttendeeCount(eventId);

        // Send confirmation email for the update via API
        try {
          const eventDetails = await sharedEventService.getEventDetails(eventId);
          if (eventDetails) {
            await fetch('/api/email/confirm-registration', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: normalizedEmail,
                customerName: registrationData.attendee_name,
                eventDetails: {
                  title: eventDetails.title,
                  date: new Date(eventDetails.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                  time: eventDetails.start_time || 'TBD',
                  venue: eventDetails.venue || eventDetails.location_address || 'TBD',
                  imageUrl: eventDetails.image_url ? getFormattedImagePath(eventDetails.image_url) : undefined,
                },
                ticketDetails: `${registrationData.quantity || 1} new spot(s) added (Total: ${newTotalQuantity})`,
              }),
            });
          }
        } catch (emailErr) {
          console.error('[EventRegistrationService] Failed to trigger update email API:', emailErr);
        }

        return { success: true, registration: updatedRegistration };
      }

      // Create the registration with normalized email and user_id
      const registrationPayload = {
        user_id: user.id, // Add the authenticated user's ID
        event_id: eventId,
        attendee_name: registrationData.attendee_name,
        attendee_email: normalizedEmail, // Store normalized email
        attendee_phone: registrationData.attendee_phone || null,
        ticket_type: registrationData.ticket_type,
        quantity_registered: registrationData.quantity || 1,
        total_amount: 0, // Free event
        status: 'registered', // Must use 'registered' per CHECK constraint
        payment_status: 'paid' // For free events, consider as 'paid' since no payment is required
      };

      const { data: registration, error } = await supabase
        .from('event_registrations')
        .insert(registrationPayload)
        .select('*')
        .single();
        
      if (error) {
        console.error('Error creating registration:', error);
        return { success: false, error: 'Failed to register for event' };
      }

      // Generate QR code for the registration
      const qrCode = await this.generateQRCode(
        registration.id,
        eventId,
        normalizedEmail
      );
      
      // Update registration with QR code if generated
      if (qrCode) {
        const { error: updateError } = await supabase
          .from('event_registrations')
          .update({ qr_code: qrCode })
          .eq('id', registration.id);
          
        if (!updateError) {
          registration.qr_code = qrCode;
        }
      }

      // Update attendee count in events table
      await this.updateEventAttendeeCount(eventId);

      // Send confirmation email for new registration via API
      try {
        const eventDetails = await sharedEventService.getEventDetails(eventId);
        if (eventDetails) {
          await fetch('/api/email/confirm-registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: normalizedEmail,
              customerName: registrationData.attendee_name,
              eventDetails: {
                title: eventDetails.title,
                date: new Date(eventDetails.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                time: eventDetails.start_time || 'TBD',
                venue: eventDetails.venue || eventDetails.location_address || 'TBD',
                imageUrl: eventDetails.image_url ? getFormattedImagePath(eventDetails.image_url) : undefined,
              },
              ticketDetails: `${registrationData.quantity || 1} x ${registrationData.ticket_type}`,
            }),
          });
        }
      } catch (emailErr) {
        console.error('[EventRegistrationService] Failed to trigger confirmation email API:', emailErr);
      }

      return { success: true, registration };
    } catch (error) {
      console.error('Error in registerForEvent:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Cancel a registration
   */
  async cancelRegistration(registrationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    
    try {
      // Update the registration status
      const { data: registration, error } = await supabase
        .from('event_registrations')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', registrationId)
        .select('event_id')
        .single();
        
      if (error) {
        console.error('Error cancelling registration:', error);
        return { success: false, error: 'Failed to cancel registration' };
      }
      
      // Update attendee count
      if (registration?.event_id) {
        await this.updateEventAttendeeCount(registration.event_id);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in cancelRegistration:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get specific registration for a user and event
   */
  async getUserRegistration(eventId: string, userEmail: string): Promise<EventRegistration | null> {
    const supabase = createClient();
    const normalizedEmail = userEmail.toLowerCase();
    
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .ilike('attendee_email', normalizedEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (error) return null;
      return data;
    } catch (error) {
      console.error('Error fetching user registration:', error);
      return null;
    }
  }

  /**
   * Get registrations for an event (for organizers and admins)
   */
  async getEventRegistrations(eventId: string): Promise<EventRegistration[]> {
    const supabase = createClient();
    
    try {
      const { data: registrations, error } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching event registrations:', error);
        return [];
      }
      
      return registrations || [];
    } catch (error) {
      console.error('Error in getEventRegistrations:', error);
      return [];
    }
  }

  /**
   * Get registration statistics for an event
   */
  async getEventRegistrationStats(eventId: string): Promise<EventRegistrationStats> {
    try {
      // Use the server-side API to get accurate global stats (bypasses RLS)
      const response = await fetch(`/api/events/registration-stats?eventId=${eventId}`);
      if (!response.ok) throw new Error('Failed to fetch stats from API');
      
      const data = await response.json();
      
      return {
        total_registrations: data.total_registrations || 0,
        confirmed_registrations: data.total_registrations || 0, // Simplified for this view
        cancelled_registrations: 0,
        registrations_by_ticket_type: data.registrations_by_ticket_type || {},
        recent_registrations: []
      };
    } catch (error) {
      console.error('Error in getEventRegistrationStats (API fallback):', error);
      
      // Fallback to client-side Supabase as a last resort (will be subject to RLS)
      const supabase = createClient();
      const { data: registrations, error: sbError } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId);
        
      if (sbError) return {
        total_registrations: 0,
        confirmed_registrations: 0,
        cancelled_registrations: 0,
        registrations_by_ticket_type: {},
        recent_registrations: []
      };
      
      const regs = registrations || [];
      const byTicketType = regs.reduce((acc: { [key: string]: number }, reg: any) => {
        acc[reg.ticket_type] = (acc[reg.ticket_type] || 0) + reg.quantity_registered;
        return acc;
      }, {} as { [key: string]: number });
      
      return {
        total_registrations: regs.length,
        confirmed_registrations: regs.length,
        cancelled_registrations: 0,
        registrations_by_ticket_type: byTicketType,
        recent_registrations: []
      };
    }
  }

  /**
   * Get all registrations for an organizer's events
   */
  async getOrganizerRegistrations(userId: string): Promise<{ [eventId: string]: EventRegistrationStats }> {
    const supabase = createClient();
    
    try {
      // First get the organizer ID - use maybeSingle() to avoid 406 errors
      const { data: organizer, error: orgError } = await supabase
        .from('organizers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle missing profiles gracefully
        
      if (orgError) {
        console.error('Error finding organizer:', orgError);
        return {};
      }

      // If no organizer profile exists, return empty registrations
      if (!organizer) {
        console.log('No organizer profile found for user:', userId);
        return {};
      }
      
      // Get all events for this organizer
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id')
        .eq('organizer_id', organizer.id);
        
      if (eventsError || !events) {
        console.error('Error fetching organizer events:', eventsError);
        return {};
      }
      
      // Get registration stats for each event
      const registrationsByEvent: { [eventId: string]: EventRegistrationStats } = {};
      
      for (const event of events) {
        registrationsByEvent[event.id] = await this.getEventRegistrationStats(event.id);
      }
      
      return registrationsByEvent;
    } catch (error) {
      console.error('Error in getOrganizerRegistrations:', error);
      return {};
    }
  }

  /**
   * Check if a user is already registered for an event
   */
  async isUserRegistered(eventId: string, email: string): Promise<boolean> {
    const supabase = createClient();
    
    try {
      // Get the authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return false;
      }

      // Check by user_id instead of email to avoid RLS policy issues
      const { data: registration, error } = await supabase
        .from('event_registrations')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .in('status', ['registered', 'checked_in']) // Only check active registrations
        .maybeSingle();
        
      if (error) {
        console.error('Error checking registration:', error);
        return false;
      }
      
      return Boolean(registration);
    } catch (error) {
      console.error('Error in isUserRegistered:', error);
      return false;
    }
  }



  /**
   * Update attendee count in events table
   */
  private async updateEventAttendeeCount(eventId: string): Promise<void> {
    const supabase = createClient();
    
    try {
      // Sum all quantity_registered for registered attendees (not cancelled)
      const { data: registrations, error: countError } = await supabase
        .from('event_registrations')
        .select('quantity_registered')
        .eq('event_id', eventId)
        .in('status', ['registered', 'checked_in']); // Include both registered and checked in
        
      if (countError) {
        console.error('Error counting registrations:', countError);
        return;
      }
      
      // Calculate total registered spots
      const totalRegistered = registrations?.reduce((sum: number, reg: any) => sum + (reg.quantity_registered || 0), 0) || 0;
      
      // Update the events table
      const { error: updateError } = await supabase
        .from('events')
        .update({ 
          attendee_count: totalRegistered,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);
        
      if (updateError) {
        console.error('Error updating attendee count:', updateError);
      }
    } catch (error) {
      console.error('Error in updateEventAttendeeCount:', error);
    }
  }

  /**
   * Get all registrations for a user (to show as tickets)
   */
  async getUserRegistrations(userEmail: string): Promise<EventRegistration[]> {
    const supabase = createClient();
    
    try {
      // ✅ SECURITY: Removed sensitive user email logging
      
      // Use JOIN to fetch registrations with their event details in one query
      // This will automatically filter out registrations with non-existent events
      const { data: registrations, error } = await supabase
        .from('event_registrations')
        .select(`
          id,
          event_id,
          attendee_name,
          attendee_email,
          ticket_type,
          quantity_registered: quantity,
          total_amount,
          status,
          payment_status,
          created_at,
          updated_at,
          ticket_id,
          qr_code,
          events (
            id,
            title,
            start_date,
            start_time,
            end_date,
            end_time,
            image_url,
            venue,
            address,
            city,
            location_type,
            status
          )
        `)
        .eq('attendee_email', userEmail)
        .not('events', 'is', null) // Only include registrations where the event exists
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching user registrations:', error);
        return [];
      }
      
      console.log('Found registrations with valid events:', registrations?.length || 0);
      
      return registrations || [];
    } catch (error) {
      console.error('Error in getUserRegistrations:', error);
      return [];
    }
  }
  
  /**
   * Get free tickets for an event
   */
  async getFreeTickets(eventId: string): Promise<Array<{ id: number; name: string; description?: string; quantity: number }>> {
    const supabase = createClient();
    
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('tickets')
        .eq('id', eventId)
        .single();
        
      if (error || !event) {
        console.error('Error fetching event tickets:', error);
        return [];
      }
      
      // Filter for free tickets (price = 0)
      const tickets = Array.isArray(event.tickets) ? event.tickets : [];
      return tickets.filter((ticket: any) => ticket.price === 0);
    } catch (error) {
      console.error('Error in getFreeTickets:', error);
      return [];
    }
  }
}

// Export singleton instance
export const eventRegistrationService = new EventRegistrationService();
