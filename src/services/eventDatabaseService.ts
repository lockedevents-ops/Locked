/**
 * Event Database Service
 * --------------------------------------------------------------
 * Provides database-backed event management functionality using Supabase.
 * Replaces localStorage-based event storage with persistent database storage.
 * Includes organizer profile management and event CRUD operations.
 * 
 * @version 2.0.0 - Added draft cleanup and cache invalidation on mutations
 */

import { createClient } from '@/lib/supabase/client/client';
import { checkEventPolicy } from '@/utils/policyIntegration';
import { cleanupEventCreatorDraft, cleanupEventDraft } from '@/utils/draftCleanup';
import { invalidateForOperation } from '@/services/cacheInvalidation';

const EVENT_CREATION_DEBUG = process.env.NEXT_PUBLIC_DEBUG_EVENT_CREATION === 'true';

const debugEventCreation = (...args: unknown[]) => {
  if (EVENT_CREATION_DEBUG) {
    console.log(...args);
  }
};

export type EventStatus = "published" | "draft" | "cancelled" | undefined;

export interface EventData {
  id?: string;
  title: string;
  description: string;
  category: string;
  
  // Date and time
  startDate: string;
  endDate?: string;
  startTime: string;
  endTime?: string;
  timeZone?: string;
  registrationDeadline?: string;
  
  // Location
  locationType: 'physical' | 'online' | 'hybrid';
  venue?: string;
  venueId?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number; // Geocoded latitude coordinate
  longitude?: number; // Geocoded longitude coordinate
  onlineUrl?: string;
  onlinePlatform?: string;
  meetingCode?: string;
  meetingPassword?: string;
  
  // Tickets
  tickets: Array<{
    id: number;
    name: string;
    price: number;
    quantity: number;
    description?: string;
    startDate?: string;
    endDate?: string;
  }>;
  
  // Media
  imageUrl?: string;
  imageFile?: File; // Added for file upload
  imageMetadata?: {
    name?: string;
    size?: number;
    type?: string;
  };
  galleryImages?: string[];
  galleryMetadata?: Array<{
    name?: string;
    size?: number;
    type?: string;
  }>;
  
  // Settings
  isPrivate?: boolean;
  isFeatured?: boolean;
  isLocked?: boolean;
  requireApproval?: boolean;
  eventTags?: string[];
  organizerNotes?: string;
  status: EventStatus;
  
  // Voting
  hasVoting?: boolean;
  votingInfo?: {
    startDate?: string;
    endDate?: string;
    currentPhase?: string;
    voteCost?: number;
  };
  contestants?: Array<{
    id: string;
    name: string;
    image?: string;
    description?: string;
  }>;
  
  // Additional fields
  duration?: string;
  features?: string[];
  schedule?: Array<{
    time: string;
    title: string;
    description?: string;
  }>;

  // Merchandise
  hasMerch?: boolean;
  merchProducts?: Array<{
    id: string;
    name: string;
    price: number;
    image?: string;
    description?: string;
  }>;

  // 18+ Events
  ageRestriction?: number;
}

export interface DatabaseEvent {
  id: string;
  organizer_id: string;
  venue_id?: string;
  venue?: string; // Venue name
  title: string;
  description: string;
  category: string;
  start_date: string;
  end_date?: string;
  start_time: string;
  end_time?: string;
  time_zone?: string;  // Changed from timezone to time_zone
  registration_deadline?: string;
  location_type: 'physical' | 'online' | 'hybrid';
  city?: string;
  country?: string;
  online_url?: string;
  online_platform?: string;
  meeting_code?: string;
  meeting_password?: string;
  image_url?: string;  // Already correct
  gallery_images?: string[];  // Already correct
  tickets: any;
  is_private: boolean;
  is_featured: boolean;
  require_approval: boolean;
  event_tags?: string[];
  organizer_notes?: string;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  attendee_count: number;
  tickets_sold: number;
  has_voting: boolean;
  vote_cost?: number;
  voting_info?: any;
  contestants?: any;
  duration?: string;
  features?: string[];
  schedule?: any;
  
  // New fields
  has_merch: boolean;
  merch_products?: any;
  age_restriction?: number;

  created_at: string;
  updated_at: string;
  published_at?: string;
}

export const eventDatabaseService = {
  /**
   * Check if user is admin or super admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    const supabase = createClient();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return false;
      
      // Check user metadata for admin role
      const userRole = user.user_metadata?.role;
      const userEmail = user.email;
      
      // Check if user is admin/super_admin by role or email
      return (
        userRole === 'admin' ||
        userRole === 'super_admin' ||
        userEmail === 'admin@locked.com' ||
        userEmail === 'admin@locked.gh'
      );
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  },

  /**
   * Get organizer profile for the current user
   * Note: Organizer profile should already exist from role approval.
   * If it doesn't exist, this indicates a data integrity issue.
   */
  async getOrganizerProfile(userId: string): Promise<string> {
    const supabase = createClient();
    
    try {
      // First try to get existing organizer profile
      const { data: existingOrganizer, error: fetchError } = await supabase
        .from('organizers')
        .select('id,business_name')
        .eq('user_id', userId)
        .single();

      // Always attempt to source a better display name from role_requests (company_name)
      const getLatestCompanyName = async (): Promise<string | null> => {
        try {
          const { data: rr, error: rrErr } = await supabase
            .from('role_requests')
            .select('company_name,status')
            .eq('user_id', userId)
            .eq('request_type', 'organizer')
            .not('company_name', 'is', null)
            .in('status', ['approved', 'pending']) // Include both approved and pending requests
            .order('submitted_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (rrErr) {
              debugEventCreation('[EventDatabase] failed to fetch latest company name from role_requests', rrErr);
            return null;
          }
          const c = rr?.company_name?.trim();
          return c ? c : null;
        } catch (error) {
            debugEventCreation('[EventDatabase] exception while fetching latest company name', error);
          return null;
        }
      };

      if (!fetchError && existingOrganizer) {
        // Always check for a better name from role requests
        const companyName = await getLatestCompanyName();
        if (companyName && companyName !== existingOrganizer.business_name) {
          debugEventCreation('[EventDatabase] updating organizer business name from role_requests');
          await supabase.from('organizers').update({ 
            business_name: companyName,
            updated_at: new Date().toISOString()
          }).eq('id', existingOrganizer.id);
        }
        return existingOrganizer.id;
      }

      // If we reach here, organizer profile doesn't exist - this is a data integrity issue
      console.error(`❌ Organizer profile not found for user ${userId}. This should have been created during role approval.`);
      throw new Error('Organizer profile not found. Please contact support if you have an approved organizer role.');
    } catch (error) {
      console.error('Error in getOrganizerProfile:', error);
      throw error;
    }
  },

  /**
   * Create a new event
   */
  async createEvent(eventData: EventData, userId: string): Promise<DatabaseEvent> {
    const supabase = createClient();
    
    // Get organizer profile (should already exist from role approval)
    const organizerId = await this.getOrganizerProfile(userId);
    
    // If there's an image file, upload it to Supabase storage first
    let imageUrl = eventData.imageUrl;
    if (eventData.imageFile) {
      const file = eventData.imageFile;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
      // Include user ID in path to match RLS policy expectations
      const filePath = `event-images/${userId}/${fileName}`;
      
      const { error: uploadError } = await supabase
        .storage
        .from('events')
        .upload(filePath, file);
        
      if (uploadError) {
        console.error('Error uploading file:', uploadError);
      } else {
        // Get the public URL for the uploaded file
        const { data: { publicUrl } } = supabase
          .storage
          .from('events')
          .getPublicUrl(filePath);
          
        imageUrl = publicUrl; // Use the full public URL
      }
    }
    
    // Calculate main price from tickets for easier querying
    let mainPrice: number | null = null;
    let isFree = true; // Assume free until we find a paid ticket
    if (eventData.tickets && eventData.tickets.length > 0) {
      const prices = eventData.tickets.map(ticket => ticket.price || 0).filter(p => p > 0);
      if (prices.length > 0) {
        mainPrice = Math.min(...prices); // Use minimum price as main price
        isFree = false; // Event has at least one paid ticket
      }
    }
    
    // ✅ GENERATE UNIQUE SLUG
    let slug = '';
    try {
      const { generateUniqueSlug } = await import('@/utils/slugify');
      slug = await generateUniqueSlug(eventData.title);
    } catch (slugError) {
      console.error('[EventDatabase] failed to generate slug', slugError);
      slug = `event-${Date.now()}`; // Fallback if utility fails
    }

    // Transform event data to database format
    const dbEventData = {
      organizer_id: organizerId,
      slug, // ✅ Added missing slug field
      venue: eventData.venue || null,
      venue_id: eventData.venueId || null,
      location_address: eventData.venue || null, // Also store venue as location_address
      title: eventData.title,
      description: eventData.description,
      category: eventData.category,
      start_date: eventData.startDate,
      end_date: eventData.endDate || null,
      start_time: eventData.startTime,
      end_time: eventData.endTime || null,
      // Change from timezone to time_zone (match actual DB schema)
      time_zone: eventData.timeZone || 'Africa/Accra',
      registration_deadline: eventData.registrationDeadline || null,
      location_type: eventData.locationType,
      location_city: eventData.city || null,
      location_country: eventData.country || 'Ghana',
      location_region: eventData.region || null,
      location_latitude: eventData.latitude || null,
      location_longitude: eventData.longitude || null,
      online_url: eventData.onlineUrl || null,
      online_platform: eventData.onlinePlatform || null,
      meeting_code: eventData.meetingCode || null,
      meeting_password: eventData.meetingPassword || null,
      image_url: imageUrl, // Use the uploaded image URL
      gallery_images: eventData.galleryImages || [],
      tickets: eventData.tickets || [],
      is_free: isFree, // Derived from tickets
      price: mainPrice, // Store calculated main price
      is_private: eventData.isPrivate || false,
      is_featured: eventData.isFeatured || false,
      require_approval: eventData.requireApproval || false,
      event_tags: eventData.eventTags || [],
      organizer_notes: eventData.organizerNotes || null,
      status: eventData.status,
      has_voting: eventData.hasVoting || false,
      vote_cost: eventData.votingInfo?.voteCost ?? 1,
      voting_info: eventData.votingInfo || null,
      contestants: eventData.contestants || null,
      duration: eventData.duration || null,
      features: eventData.features || [],
      schedule: eventData.schedule || null,
      
      // Merchandise
      has_merch: eventData.hasMerch || false,
      merch_products: eventData.merchProducts || null,
      
      // 18+ Events
      age_restriction: eventData.ageRestriction || null,

      published_at: eventData.status === 'published' ? new Date().toISOString() : null
    };

    debugEventCreation('[EventDatabase] creating event', {
      title: dbEventData.title,
      status: dbEventData.status,
      organizer_id: dbEventData.organizer_id,
    });

    try {
      const { data, error } = await supabase
        .from('events')
        .insert(dbEventData)
        .select('*')
        .single();

      if (error) {
        console.error('Error creating event:', error);
        throw error;
      }

      // After successful creation, check for policy violations
      try {
        await checkEventPolicy(data.id, eventData, userId);
        debugEventCreation('[EventDatabase] policy check completed', { eventId: data.id });
      } catch (policyError) {
        debugEventCreation('[EventDatabase] policy check failed (non-blocking)', policyError);
        // Don't throw - policy checking shouldn't break event creation
      }

      // ✅ PHASE 2: Clean up localStorage drafts after successful creation
      try {
        cleanupEventCreatorDraft();
        debugEventCreation('[EventDatabase] event creator draft cleanup completed');
      } catch (cleanupError) {
        debugEventCreation('[EventDatabase] event creator draft cleanup failed (non-blocking)', cleanupError);
      }

      // ✅ PHASE 2: Invalidate relevant caches
      invalidateForOperation('event:create');

      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  },

  /**
   * Check if an event has started (is live or past)
   */
  async isEventLive(eventId: string): Promise<boolean> {
    const supabase = createClient();
    
    try {
      const { data: event, error } = await supabase
        .from('events')
        .select('start_date, start_time')
        .eq('id', eventId)
        .single();
      
      if (error || !event) return false;
      
      // Combine date and time to create a full datetime
      const eventStartDateTime = new Date(`${event.start_date}T${event.start_time}`);
      const now = new Date();
      
      // Event is live if current time has passed the start time
      return now >= eventStartDateTime;
    } catch (error) {
      console.error('Error checking if event is live:', error);
      return false;
    }
  },

  /**
   * Update an existing event
   * Note: Always updates the updated_at timestamp automatically
   */
  async updateEvent(eventId: string, eventData: Partial<EventData>, userId: string): Promise<DatabaseEvent> {
    const supabase = createClient();
    
    // Check if user is admin
    const isUserAdmin = await this.isAdmin(userId);
    
    // Get organizer profile for regular users
    let organizerId: string | null = null;
    if (!isUserAdmin) {
      organizerId = await this.getOrganizerProfile(userId);
    }
    
    // Transform event data to database format (only include provided fields)
    const dbEventData: any = {};
    
    // ✅ ALWAYS update the updated_at timestamp on any edit
    dbEventData.updated_at = new Date().toISOString();
    
    if (eventData.title) {
      dbEventData.title = eventData.title;
      
      // ✅ If title is updated, regenerate the slug to match the new title
      try {
        const { generateUniqueSlug } = await import('@/utils/slugify');
        dbEventData.slug = await generateUniqueSlug(eventData.title, eventId);
      } catch (error) {
        console.error('Error generating slug for updated event:', error);
        // Continue without updating slug if generation fails
      }
    }
    if (eventData.description) dbEventData.description = eventData.description;
    if (eventData.category) dbEventData.category = eventData.category;
    if (eventData.startDate) dbEventData.start_date = eventData.startDate;
    if (eventData.endDate) dbEventData.end_date = eventData.endDate;
    if (eventData.startTime) dbEventData.start_time = eventData.startTime;
    if (eventData.endTime) dbEventData.end_time = eventData.endTime;
    // Change this line to use time_zone instead of timezone
    if (eventData.timeZone) dbEventData.time_zone = eventData.timeZone;
    if (eventData.registrationDeadline) dbEventData.registration_deadline = eventData.registrationDeadline;
    if (eventData.locationType) dbEventData.location_type = eventData.locationType;
    if (eventData.venue !== undefined) dbEventData.venue = eventData.venue || null;
    if (eventData.venueId) dbEventData.venue_id = eventData.venueId;
    if (eventData.venue !== undefined) dbEventData.location_address = eventData.venue || null; // Also update location_address
    // ✅ FIX: Use correct database column names
    if (eventData.city) dbEventData.location_city = eventData.city;
    if (eventData.country) dbEventData.location_country = eventData.country;
    if (eventData.region) dbEventData.location_region = eventData.region;
    if (eventData.latitude !== undefined) dbEventData.location_latitude = eventData.latitude;
    if (eventData.longitude !== undefined) dbEventData.location_longitude = eventData.longitude;
    if (eventData.onlineUrl) dbEventData.online_url = eventData.onlineUrl;
    if (eventData.onlinePlatform) dbEventData.online_platform = eventData.onlinePlatform;
    if (eventData.meetingCode !== undefined) dbEventData.meeting_code = eventData.meetingCode || null;
    if (eventData.meetingPassword !== undefined) dbEventData.meeting_password = eventData.meetingPassword || null;
    // Update field name here too
    if (eventData.imageUrl) dbEventData.image_url = eventData.imageUrl;
    // And here
    if (eventData.galleryImages) dbEventData.gallery_images = eventData.galleryImages;
    if (eventData.tickets) {
      dbEventData.tickets = eventData.tickets;
      // Recalculate main price from updated tickets
      let mainPrice: number | null = null;
      const prices = eventData.tickets.map(ticket => ticket.price || 0).filter(p => p > 0);
      if (prices.length > 0) {
        mainPrice = Math.min(...prices);
      }
      dbEventData.price = mainPrice;
    }
    if (eventData.isPrivate !== undefined) dbEventData.is_private = eventData.isPrivate;
    if (eventData.isFeatured !== undefined) dbEventData.is_featured = eventData.isFeatured;
    if (eventData.isLocked !== undefined) dbEventData.is_locked = eventData.isLocked;
    if (eventData.requireApproval !== undefined) dbEventData.require_approval = eventData.requireApproval;
    if (eventData.eventTags) dbEventData.event_tags = eventData.eventTags;
    if (eventData.organizerNotes) dbEventData.organizer_notes = eventData.organizerNotes;
    if (eventData.status) {
      dbEventData.status = eventData.status;
      // If you've added the published_at column, uncomment these lines:
      if (eventData.status === 'published') {
        dbEventData.published_at = new Date().toISOString();
      }
    }
    if (eventData.hasVoting !== undefined) dbEventData.has_voting = eventData.hasVoting;
    if (eventData.votingInfo) {
      dbEventData.voting_info = eventData.votingInfo;
      if (eventData.votingInfo.voteCost !== undefined) {
        dbEventData.vote_cost = eventData.votingInfo.voteCost;
      }
    }
    if (eventData.votingInfo === undefined && eventData.hasVoting !== undefined && eventData.hasVoting === false) {
      dbEventData.vote_cost = 1;
    }
    if (eventData.contestants) dbEventData.contestants = eventData.contestants;
    if (eventData.duration) dbEventData.duration = eventData.duration;
    if (eventData.features) dbEventData.features = eventData.features;
    if (eventData.schedule) dbEventData.schedule = eventData.schedule;
    if (eventData.hasMerch !== undefined) dbEventData.has_merch = eventData.hasMerch;
    if (eventData.merchProducts) dbEventData.merch_products = eventData.merchProducts;
    if (eventData.ageRestriction !== undefined) dbEventData.age_restriction = eventData.ageRestriction;

    console.log('📝 Update data being sent:', JSON.stringify(dbEventData, null, 2));

    // Build update query - admins can update any event
    let query = supabase
      .from('events')
      .update(dbEventData)
      .eq('id', eventId);

    // Only restrict to organizer if not admin
    if (!isUserAdmin && organizerId) {
      console.log('🔍 Update query - Event ID:', eventId, 'Organizer ID:', organizerId, 'User ID:', userId);
      query = query.eq('organizer_id', organizerId);
    } else if (isUserAdmin) {
      console.log('👑 Admin update - Event ID:', eventId, 'User ID:', userId);
    }

    const { data, error } = await query
      .select('*')
      .maybeSingle();

    console.log('📊 Update result - Data:', data ? 'Found' : 'Not found', 'Error:', error);

    if (error) {
      console.error('Error updating event:', error);
      throw error;
    }

    if (!data) {
      // Let's check if the event exists at all
      const { data: eventCheck } = await supabase
        .from('events')
        .select('id, organizer_id')
        .eq('id', eventId)
        .single();
      
      console.error('❌ Event check:', eventCheck);
      console.error('Expected organizer_id:', organizerId);
      console.error('Actual organizer_id:', eventCheck?.organizer_id);
      
      throw new Error('Event not found or you do not have permission to edit this event');
    }

    // After successful update, check for policy violations if content fields were changed
    if (eventData.title || eventData.description) {
      try {
        await checkEventPolicy(eventId, { ...eventData, title: data.title, description: data.description }, userId);
        console.log(`[PolicyCheck] Event ${eventId} checked for policy violations after update`);
      } catch (policyError) {
        console.warn('Policy check failed (non-blocking):', policyError);
        // Don't throw - policy checking shouldn't break event updates
      }
    }

    // ✅ PHASE 2: Clean up localStorage drafts after successful update
    try {
      cleanupEventDraft(eventId);
      console.log(`[DraftCleanup] Event editor draft cleared for event ${eventId}`);
    } catch (cleanupError) {
      console.warn('Draft cleanup failed (non-blocking):', cleanupError);
    }

    // ✅ PHASE 2: Invalidate relevant caches
    invalidateForOperation('event:update');

    return data;
  },

  /**
   * Save event as draft
   */
  async saveEventDraft(eventData: Partial<EventData>, userId: string, draftName?: string): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('event_drafts')
      .insert({
        user_id: userId,
        draft_name: draftName || `Draft - ${new Date().toLocaleString()}`,
        draft_data: eventData
      });

    if (error) {
      console.error('Error saving event draft:', error);
      throw error;
    }
  },

  /**
   * Get all events for an organizer
   * Admins can see all events, regular users see only their own
   */
  async getOrganizerEvents(userId: string): Promise<DatabaseEvent[]> {
    const supabase = createClient();
    
    // Check if user is admin
    const isUserAdmin = await this.isAdmin(userId);
    
    let query = supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    // Only restrict to user's events if not admin
    if (!isUserAdmin) {
      query = supabase
        .from('events')
        .select(`
          *,
          organizers!inner(user_id)
        `)
        .eq('organizers.user_id', userId)
        .order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching organizer events:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get published events (public)
   */
  async getPublishedEvents(filters?: {
    city?: string;
    category?: string;
    limit?: number;
  }): Promise<DatabaseEvent[]> {
    const supabase = createClient();
    
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    let query = supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .gte('end_date', today); // Only show events that haven't ended yet

    if (filters?.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    query = query.order('start_date', { ascending: true });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching published events:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get a single event by ID
   */
  async getEvent(eventId: string): Promise<DatabaseEvent | null> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      console.error('Error fetching event:', error);
      return null;
    }

    return data;
  },

  /**
   * Delete an event
   * Admins can delete any event, regular users can only delete their own
   * 🚫 RESTRICTION: Cannot delete live events (events that have already started)
   */
  async deleteEvent(eventId: string, userId: string): Promise<void> {
    const supabase = createClient();
    
    // ✅ Check if event is live before allowing deletion
    const isLive = await this.isEventLive(eventId);
    if (isLive) {
      throw new Error('Cannot delete a live event. Events that have already started cannot be deleted.');
    }
    
    // Check if user is admin
    const isUserAdmin = await this.isAdmin(userId);
    
    // Build delete query - admins can delete any event
    let query = supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    // Only restrict to organizer if not admin
    if (!isUserAdmin) {
      const organizerId = await this.getOrganizerProfile(userId);
      query = query.eq('organizer_id', organizerId);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  },

  /**
   * Get event drafts for a user
   */
  async getEventDrafts(userId: string): Promise<Array<{
    id: string;
    draft_name: string | null;
    draft_data: Partial<EventData>;
    created_at: string;
    updated_at: string;
  }>> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('event_drafts')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching event drafts:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Load event draft
   */
  async loadEventDraft(draftId: string, userId: string): Promise<{
    id: string;
    draft_name: string | null;
    draft_data: Partial<EventData>;
  } | null> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('event_drafts')
      .select('*')
      .eq('id', draftId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error loading event draft:', error);
      return null;
    }

    return data;
  },

  /**
   * Delete event draft
   */
  async deleteEventDraft(draftId: string, userId: string): Promise<void> {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('event_drafts')
      .delete()
      .eq('id', draftId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting event draft:', error);
      throw error;
    }
  },

  /**
   * Upload an image to Supabase storage and return the public URL
   */
  async uploadEventImage(file: File, userId?: string): Promise<string> {
    const supabase = createClient();
    
    // Get current user if userId not provided
    let uploadUserId = userId;
    if (!uploadUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      uploadUserId = user.id;
    }
    
    // Create unique filename to avoid collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    // Include user ID in path to match RLS policy expectations
    const filePath = `event-images/${uploadUserId}/${fileName}`;
    
    // Upload the file
    const { data, error } = await supabase
      .storage
      .from('events')  // The bucket name
      .upload(filePath, file);
      
    if (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
    
    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase
      .storage
      .from('events')
      .getPublicUrl(filePath);
      
    return publicUrl; // Return the full URL, not just the filename
  },

  /**
   * Upload multiple gallery images to Supabase storage and return their storage paths
   * Returns array of storage paths (not full URLs) for database storage
   */
  async uploadGalleryImages(files: File[], userId?: string): Promise<string[]> {
    const supabase = createClient();
    
    // Get current user if userId not provided
    let uploadUserId = userId;
    if (!uploadUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      uploadUserId = user.id;
    }
    
    const uploadedPaths: string[] = [];
    
    // Upload each file
    for (const file of files) {
      try {
        // Create unique filename to avoid collisions
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        // Include user ID in path to match RLS policy expectations
        const filePath = `event-images/${uploadUserId}/${fileName}`;
        
        // Upload the file
        const { data, error } = await supabase
          .storage
          .from('events')  // The bucket name
          .upload(filePath, file);
          
        if (error) {
          console.error('Error uploading gallery image:', error);
          throw error;
        }
        
        // Store the storage path (not the full URL)
        uploadedPaths.push(filePath);
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error);
        // Continue with other files even if one fails
      }
    }
    
    return uploadedPaths;
  },

  /**
   * Get public URL for a storage path
   * Converts storage path to full public URL for display
   */
  getPublicUrl(storagePath: string): string {
    const supabase = createClient();
    const { data: { publicUrl } } = supabase
      .storage
      .from('events')
      .getPublicUrl(storagePath);
      
    return publicUrl;
  },

  /**
   * Upload merchandise image to Supabase storage and return the public URL
   */
  async uploadMerchImage(file: File, userId?: string): Promise<string> {
    const supabase = createClient();
    
    // Get current user if userId not provided
    let uploadUserId = userId;
    if (!uploadUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('User not authenticated');
      }
      uploadUserId = user.id;
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    // Include user ID in path to match RLS policy expectations
    const filePath = `${uploadUserId}/${fileName}`;
    
    // Upload the file to the 'merch' bucket
    const { error } = await supabase
      .storage
      .from('merch')
      .upload(filePath, file);
      
    if (error) {
      console.error('Error uploading merch image:', error);
      throw error;
    }
    
    // Get the public URL for the uploaded file
    const { data: { publicUrl } } = supabase
      .storage
      .from('merch')
      .getPublicUrl(filePath);
      
    return publicUrl;
  }
};
