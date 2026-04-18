/**
 * Organizer Profile Service
 * --------------------------------------------------------------
 * Service for fetching organizer profile data from Supabase for public profile pages
 * Includes organizer details, role requests (company names), and associated events
 */

import { createClient } from '@/lib/supabase/client/client';
import { getFormattedImagePath } from '@/utils/imageHelpers';
import {
  sharedEventService,
  isPastEvent,
  isEventLive,
  isEventUpcoming,
} from './sharedEventService';

export interface OrganizerProfile {
  id: string;
  name: string; // Company name from role_requests if available, fallback to organizer name
  bio: string;
  image: string;
  coverImage?: string;
  contactEmail: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  location?: string;
  website?: string;
  socials?: Array<{
    platform: string;
    username: string;
  }>;
  verificationStatus: string;
  premiumTier?: 'platinum' | 'elite' | null;
  followers: number; // This would need to be implemented based on your follow system
  joinedDate?: string;
  featuredEvent?: any;
}

export interface OrganizerProfileData {
  organizer: OrganizerProfile | null;
  upcomingEvents: any[];
  todayEvents: any[];
  pastEvents: any[];
}

class OrganizerProfileService {
  
  /**
   * Get comprehensive organizer profile data
   */
  async getOrganizerProfile(organizerId: string): Promise<OrganizerProfileData> {
    const supabase = createClient();
    
    try {
      // ✅ OPTIMIZATION: Fetch organizer and events in parallel
      const [
        { data: organizerData, error: organizerError },
        { data: eventsData, error: eventsError }
      ] = await Promise.all([
        supabase
          .from('organizers')
          .select(`
            id,
            business_name,
            contact_email,
            logo_url,
            banner_url,
            business_description,
            business_website,
            business_phone,
            user_id,
            status,
            created_at
          `)
          .eq('id', organizerId)
          .eq('status', 'active')
          .maybeSingle(),
        supabase
          .from('events')
          .select(`
            *,
            organizer:organizers(
              id,
              business_name,
              logo_url
            )
          `)
          .eq('organizer_id', organizerId)
          .eq('status', 'published')
          .order('start_date', { ascending: true })
      ]);

      // Fetch social links from profiles table if user_id exists
      let socialLinks: Array<{ platform: string; username: string }> = [];
      if (organizerData?.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('social_links')
          .eq('id', organizerData.user_id)
          .maybeSingle();
        
        if (!profileError && profileData?.social_links) {
          // social_links is a JSONB object like { facebook: 'username', twitter: 'handle', ... }
          // Convert it to array format
          const socialObj = profileData.social_links;
          socialLinks = Object.entries(socialObj)
            .filter(([platform, username]) => username && typeof username === 'string' && username.trim() !== '')
            .map(([platform, username]) => ({
              platform: platform,
              username: (username as string).trim()
            }));
        }
      }
        
      if (organizerError || !organizerData) {
        console.error('OrganizerProfileService: Error fetching organizer:', organizerError);
        return { organizer: null, upcomingEvents: [], todayEvents: [], pastEvents: [] };
      }
      
      if (eventsError) {
        console.error('OrganizerProfileService: Error fetching events:', eventsError);
      }

      if (eventsData?.length) {
        eventsData.forEach((event: any) => {
          sharedEventService.primeEventDetailsCache(event);
        });
      }
      
      // Get organizer name - prioritize organizers table (source of truth for current name)
      // Only use role_requests.company_name as fallback if organizer.business_name is empty
      let organizerName = organizerData.business_name || 'Unknown Organizer';
      
      // Only check role_requests if organizer name is not set or is default
      if ((!organizerData.business_name || organizerData.business_name === 'Unknown Organizer') && organizerData.user_id) {
        const { data: roleRequestData, error: roleError } = await supabase
          .from('role_requests')
          .select('company_name, status')
          .eq('user_id', organizerData.user_id)
          .eq('request_type', 'organizer')
          .not('company_name', 'is', null)
          .in('status', ['approved', 'pending'])
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (!roleError && roleRequestData?.company_name) {
          organizerName = roleRequestData.company_name.trim();
        }
      }
      
      // Fetch organizer tier information for gradient display
      let organizerTier: 'elite' | 'platinum' | null = null;
      let organizerRank: number | undefined = undefined;
      try {
        const { topOrganizersService } = await import('@/services/topOrganizersService');
        const topOrganizers = await topOrganizersService.getTopOrganizers({
          limit: 3,
          includeUnverified: true,
          weights: { events: 0.7, locked: 0.0, bookings: 0.3 }
        });
        
        const tierIndex = topOrganizers.findIndex(org => org.organizer_id === organizerId);
        if (tierIndex !== -1) {
          organizerRank = tierIndex + 1;
          if (tierIndex === 0) organizerTier = 'elite';
          else if (tierIndex === 1) organizerTier = 'platinum';
        }
      } catch (tierError) {
        console.warn('OrganizerProfileService: Could not fetch tier information:', tierError);
      }

      // Transform events data
      const events = (eventsData || []).map((event: any) => {
        const eventTime = event.start_time || '00:00';
        
        // Build location string
        let locationString = '';
        if (event.location_type === 'online') {
          locationString = event.online_platform ? `${event.online_platform} (Online)` : 'Online Event';
        } else if (event.location_type === 'hybrid') {
          locationString = event.address || event.city ? 
            `${event.address || ''} ${event.city || 'Hybrid Event'}`.trim() : 'Hybrid Event';
        } else {
          const parts = [event.address, event.city, event.country].filter(Boolean);
          locationString = parts.length > 0 ? parts.join(', ') : 'Location TBD';
        }
        
        // Extract price from tickets array
        let priceString = 'Free';
        if (event.tickets && Array.isArray(event.tickets) && event.tickets.length > 0) {
          const prices = event.tickets.map((ticket: any) => parseFloat(ticket.price || 0)).filter((p: number) => p > 0);
          if (prices.length > 0) {
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            if (minPrice === maxPrice) {
              priceString = `₵${minPrice.toFixed(0)}`;
            } else {
              priceString = `₵${minPrice.toFixed(0)} - ₵${maxPrice.toFixed(0)}`;
            }
          }
        }
        
        // Format date - handle multi-day events
        let formattedDate = 'Date TBD';
        if (event.start_date) {
          const startDate = new Date(event.start_date);
          const endDate = event.end_date ? new Date(event.end_date) : null;
          
          // Check if it's a multi-day event
          if (endDate && startDate.toDateString() !== endDate.toDateString()) {
            // Multi-day event
            const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
            const startDay = startDate.getDate();
            const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
            const endDay = endDate.getDate();
            const year = startDate.getFullYear();
            
            if (startMonth === endMonth) {
              // Same month: "Nov 4 - 7, 2025"
              formattedDate = `${startMonth} ${startDay} - ${endDay}, ${year}`;
            } else {
              // Different months: "Nov 30 - Dec 2, 2025"
              formattedDate = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
            }
          } else {
            // Single-day event: "Nov 4, 2025"
            formattedDate = startDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric'
            });
          }
        }
        
        // Calculate total remaining tickets from tickets array
        let remainingTickets: number | undefined = undefined;
        if (event.tickets && Array.isArray(event.tickets) && event.tickets.length > 0) {
          remainingTickets = event.tickets.reduce((total: number, ticket: any) => {
            const quantity = ticket.quantity || 0;
            const sold = ticket.sold || 0;
            return total + (quantity - sold);
          }, 0);
        }
        
        return {
          id: event.id,
          slug: event.slug || event.id,
          title: event.title || 'Untitled Event',
          description: event.description || '',
          imageUrl: getFormattedImagePath(event.image_url),
          category: event.category || 'General',
          startDate: event.start_date,
          endDate: event.end_date,
          endTime: event.end_time, // ✅ Added: needed for proper past event detection
          date: formattedDate,
          time: eventTime,
          location: locationString,
          venue: event.venue,
          price: priceString,
          status: event.status,
          isFeatured: !!event.is_featured,
          attendeeCount: event.attendee_count || 0,
          ticketsSold: event.tickets_sold || 0,
          lockCount: event.lock_count || 0,
          viewCount: event.view_count || 0,
          likes: event.likes || 0,
          organizer: {
            id: organizerData.id,
            name: organizerName,
            email: organizerData.contact_email,
            image: organizerData.logo_url,
            premiumTier: organizerTier,
            rank: organizerRank
          },
          hasVoting: !!event.has_voting,
          createdAt: event.created_at,
          remainingTickets,
        };
      });
      
      // Separate events into categories using shared filtering logic
      const pastEvents = events.filter((event: any) => isPastEvent(event));
      const todayEvents = events.filter((event: any) => isEventLive(event));
      const upcomingEvents = events.filter((event: any) => isEventUpcoming(event));
      
      // Location would need to be derived from address field or separate location table
      // For now, we'll leave it undefined as city/country columns don't exist
      const location = undefined;
      
      // Fetch user avatar if organizer doesn't have a logo
      let organizerImage = getFormattedImagePath(organizerData.logo_url);
      if (!organizerImage && organizerData.user_id) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', organizerData.user_id)
          .maybeSingle();
        organizerImage = getFormattedImagePath(userData?.avatar_url);
      }
      
      // Create organizer profile
      const organizerProfile: OrganizerProfile = {
        id: organizerData.id,
        name: organizerName,
        bio: organizerData.business_description || 'A verified organizer on the Locked platform.',
        image: organizerImage,
        coverImage: getFormattedImagePath(organizerData.banner_url) || undefined,
        contactEmail: organizerData.contact_email || 'contact@example.com',
        phoneNumber: organizerData.business_phone,
        address: undefined, // address column doesn't exist in organizers table
        city: undefined, // Column doesn't exist in organizers table
        country: undefined, // Column doesn't exist in organizers table
        location: undefined, // Will be derived from address if needed
        website: organizerData.business_website,
        socials: socialLinks, // ✅ Now populated from profiles table
        verificationStatus: organizerData.status || 'pending',
        premiumTier: null, // premium_tier column doesn't exist in organizers table
        followers: 0, // This would need to be implemented based on your follow system
        joinedDate: organizerData.created_at,
        featuredEvent: events.find((event: any) => event.isFeatured) || null
      };
      
      return {
        organizer: organizerProfile,
        upcomingEvents,
        todayEvents,
        pastEvents
      };
      
    } catch (error) {
      console.error('OrganizerProfileService: Error in getOrganizerProfile:', error);
      return { organizer: null, upcomingEvents: [], todayEvents: [], pastEvents: [] };
    }
  }
}

// Export singleton instance
export const organizerProfileService = new OrganizerProfileService();
