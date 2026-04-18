/**
 * Event Detail Service
 * --------------------------------------------------------------
 * Enhanced service for fetching individual event details with proper organizer information.
 * Fetches company names from role_requests and provides fallback profile icons.
 */

import { createClient } from '@/lib/supabase/client/client';
import { getFormattedImagePath } from '@/utils/imageHelpers';

export interface EnhancedEventDetail {
  id: string;
  title: string;
  description: string;
  features: string[];
  category?: string;
  time?: string;
  isFeatured?: boolean;
  schedule: Array<{
    time: string;
    title: string;
    description: string;
  }>;
  duration: string;
  organizer: {
    id: string;
    name: string; // This will be the company name from role_requests if available
    image: string;
    role: string;
  };
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  hasVoting?: boolean;
  contestants?: Array<{
    id: string;
    name: string;
    image: string;
  }>;
  galleryImages?: (string | { url: string })[];
}

export interface SimilarEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  category: string;
  imageUrl: string;
}

class EventDetailService {
  
  /**
   * Get enhanced event details with proper organizer information
   */
  async getEventDetails(eventId: string): Promise<EnhancedEventDetail | null> {
    const supabase = createClient();
    
    try {
      // Fetch event with organizer and venue information
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          organizer:organizers(
            id,
            business_name,
            contact_email,
            user_id,
            logo_url
          )
        `)
        .eq('id', eventId)
        .eq('status', 'published')
        .single();
        
      if (eventError || !eventData) {
        console.error('EventDetailService: Error fetching event:', eventError);
        return null;
      }
      
      // Check if organizer data exists
      if (!eventData.organizer) {
        console.warn('EventDetailService: No organizer data found for event:', eventId, '- using fallback');
        
        // Try to create a fallback organizer object
        const fallbackOrganizer = {
          id: eventData.organizer_id || 'unknown',
          name: 'Event Organizer',
          image: '/avatars/default-organizer-icon.png',
          role: 'Event Organizer'
        };
        
        // Continue with fallback instead of returning null
        const enhancedEvent: EnhancedEventDetail = {
          id: eventData.id,
          title: eventData.title || 'Untitled Event',
          description: eventData.description || 'No description available.',
          features: eventData.features || [],
          category: eventData.category,
          time: eventData.start_time || '00:00',
          isFeatured: !!eventData.is_featured,
          schedule: Array.isArray(eventData.schedule) ? eventData.schedule.map((item: any) => ({
            time: item.time || '00:00',
            title: item.title || 'Schedule Item',
            description: item.description || ''
          })) : [],
          duration: eventData.duration || '2 hours',
          organizer: fallbackOrganizer,
          address: this.buildAddress(eventData),
          coordinates: this.buildCoordinates(eventData),
          hasVoting: !!eventData.has_voting,
          contestants: this.buildContestants(eventData.contestants),
          galleryImages: this.buildGalleryImages(eventData.gallery_images)
        };
        
        return enhancedEvent;
      }
      
      // Get organizer name - prioritize organizers table (source of truth for current name)
      // Only use role_requests.company_name as fallback if organizer.name is empty
      let organizerName = eventData.organizer.name || 'Unknown Organizer';
      let organizerRole = 'Event Organizer';
      
      // Only check role_requests if organizer name is not set or is default
      if ((!eventData.organizer.name || eventData.organizer.name === 'Unknown Organizer') && eventData.organizer.user_id) {
        const { data: roleRequestData, error: roleError } = await supabase
          .from('role_requests')
          .select('company_name, status, request_type')
          .eq('user_id', eventData.organizer.user_id)
          .eq('request_type', 'organizer')
          .not('company_name', 'is', null)
          .in('status', ['approved', 'pending'])
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (!roleError && roleRequestData?.company_name) {
          organizerName = roleRequestData.company_name.trim();
          organizerRole = roleRequestData.status === 'approved' 
            ? 'Verified Organizer'
            : 'Event Organizer';
        }
      }
      
      // Build enhanced event details
      const enhancedEvent: EnhancedEventDetail = {
        id: eventData.id,
        title: eventData.title || 'Untitled Event',
        description: eventData.description || 'No description available.',
        features: eventData.features || [],
        category: eventData.category,
        time: eventData.start_time || '00:00',
        isFeatured: !!eventData.is_featured,
        schedule: Array.isArray(eventData.schedule) ? eventData.schedule.map((item: any) => ({
          time: item.time || '00:00',
          title: item.title || 'Schedule Item',
          description: item.description || ''
        })) : [],
        duration: eventData.duration || '2 hours',
        organizer: {
          id: eventData.organizer.id, // We already verified organizer exists above
          name: organizerName,
          image: this.getOrganizerImage(eventData.organizer.profile_image),
          role: organizerRole
        },
        address: this.buildAddress(eventData),
        coordinates: this.buildCoordinates(eventData),
        hasVoting: !!eventData.has_voting,
        contestants: this.buildContestants(eventData.contestants),
        galleryImages: this.buildGalleryImages(eventData.gallery_images)
      };
      
      return enhancedEvent;
      
    } catch (error) {
      console.error('EventDetailService: Error in getEventDetails:', error);
      return null;
    }
  }
  
  /**
   * Get similar events based on category
   */
  async getSimilarEvents(currentEventId: string, category?: string, limit: number = 3): Promise<SimilarEvent[]> {
    const supabase = createClient();
    
    try {
      let query = supabase
        .from('events')
        .select(`
          id,
          title,
          start_date,
          address,
          city,
          category,
          image_url
        `)
        .eq('status', 'published')
        .neq('id', currentEventId)
        .gte('start_date', new Date().toISOString().split('T')[0]); // Only future events
        
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query
        .order('start_date', { ascending: true })
        .limit(limit);
        
      if (error) {
        console.error('EventDetailService: Error fetching similar events:', error);
        return [];
      }
      
      return (data || []).map((event: any) => ({
        id: event.id,
        title: event.title || 'Untitled Event',
        date: event.start_date ? 
          new Date(event.start_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }) : 'Date TBD',
        location: this.buildLocationString(event.address, event.city),
        category: event.category || 'General',
        imageUrl: getFormattedImagePath(event.image_url)
      }));
      
    } catch (error) {
      console.error('EventDetailService: Error in getSimilarEvents:', error);
      return [];
    }
  }
  
  /**
   * Get organizer image with proper fallback
   */
  private getOrganizerImage(profileImage?: string): string {
    if (profileImage) {
      return getFormattedImagePath(profileImage);
    }
    
    // Return default profile icon
    return '/avatars/default-organizer-icon.png';
  }
  
  /**
   * Build address string from event data
   */
  private buildAddress(eventData: any): string {
    const parts = [eventData.address, eventData.city, eventData.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Location TBD';
  }
  
  /**
   * Build coordinates from event data
   */
  private buildCoordinates(eventData: any): { lat: number; lng: number } {
    // Default coordinates for Ghana (Accra) if not available
    return {
      lat: eventData.coordinates?.lat || 5.6037,
      lng: eventData.coordinates?.lng || -0.1870
    };
  }
  
  /**
   * Build contestants array
   */
  private buildContestants(contestants: any): Array<{ id: string; name: string; image: string }> | undefined {
    if (!Array.isArray(contestants)) return undefined;
    
    return contestants.map((contestant: any) => ({
      id: contestant.id || `contestant-${Math.random().toString(36).substr(2, 9)}`,
      name: contestant.name || 'Unknown Contestant',
      image: getFormattedImagePath(contestant.image) || '/avatars/default-contestant.png'
    }));
  }
  
  /**
   * Build gallery images array
   */
  private buildGalleryImages(galleryImages: any): (string | { url: string })[] | undefined {
    if (!Array.isArray(galleryImages)) return undefined;
    
    return galleryImages
      .filter(Boolean)
      .map((image: any) => {
        if (typeof image === 'string') {
          return getFormattedImagePath(image);
        }
        if (image && image.url) {
          return { url: getFormattedImagePath(image.url) };
        }
        return null;
      })
      .filter(Boolean) as (string | { url: string })[];
  }
  
  /**
   * Build location string from address parts
   */
  private buildLocationString(address?: string, city?: string): string {
    const parts = [address, city].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Location TBD';
  }
}

// Export singleton instance
export const eventDetailService = new EventDetailService();
