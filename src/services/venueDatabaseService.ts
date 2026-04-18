/**
 * Venue Database Service
 * --------------------------------------------------------------
 * Provides database-backed venue management functionality using Supabase.
 * Replaces localStorage-based venue storage with persistent database storage.
 * Includes venue creation, management and listing operations.
 */

import { createClient } from '@/lib/supabase/client/client';
import { checkVenuePolicy } from '@/utils/policyIntegration';
import { isVenuesEnabled } from '@/lib/network';

export interface VenueData {
  id?: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  capacity?: number;
  venue_type?: 'indoor' | 'outdoor' | 'hybrid';
  amenities?: string[];
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  image_urls?: string[];
  pricing?: {
    base_price?: number;
    currency?: string;
    pricing_model?: 'hourly' | 'daily' | 'event' | 'negotiable';
  };
  availability?: any; // calendar availability
  verified?: boolean;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface DatabaseVenue {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  country: string;
  coordinates?: any;
  capacity?: number;
  venue_type?: string;
  amenities?: string[];
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  image_urls?: string[];
  pricing?: any;
  availability?: any;
  verified: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export const venueDatabaseService = {
  ensureEnabled(): void {
    if (!isVenuesEnabled()) {
      throw new Error('Venue functionality is temporarily disabled');
    }
  },

  /**
   * Check if user is admin or super admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    this.ensureEnabled();
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
   * Create a new venue
   * Admins can create venues directly without special venue owner roles
   */
  async createVenue(venueData: VenueData, userId: string): Promise<DatabaseVenue> {
    this.ensureEnabled();
    const supabase = createClient();
    
    // Check if user is admin
    const isUserAdmin = await this.isAdmin(userId);
    
    // Transform venue data to database format
    const dbVenueData = {
      user_id: userId,
      name: venueData.name,
      description: venueData.description || null,
      address: venueData.address,
      city: venueData.city,
      country: venueData.country || 'Ghana',
      coordinates: venueData.coordinates || null,
      capacity: venueData.capacity || null,
      venue_type: venueData.venue_type || null,
      amenities: venueData.amenities || [],
      contact_email: venueData.contact_email || null,
      contact_phone: venueData.contact_phone || null,
      website: venueData.website || null,
      image_urls: venueData.image_urls || [],
      pricing: venueData.pricing || null,
      availability: venueData.availability || null,
      verified: isUserAdmin || venueData.verified || false, // Auto-verify admin venues
      status: venueData.status || 'active'
    };

    const { data, error } = await supabase
      .from('venues')
      .insert(dbVenueData)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating venue:', error);
      throw error;
    }

    // After successful creation, check for policy violations
    try {
      await checkVenuePolicy(data.id, venueData, userId);
      console.log(`[PolicyCheck] Venue ${data.id} checked for policy violations`);
    } catch (policyError) {
      console.warn('Policy check failed (non-blocking):', policyError);
      // Don't throw - policy checking shouldn't break venue creation
    }

    return data;
  },

  /**
   * Update an existing venue
   * Admins can update any venue, regular users can only update their own
   */
  async updateVenue(venueId: string, venueData: Partial<VenueData>, userId: string): Promise<DatabaseVenue> {
    this.ensureEnabled();
    const supabase = createClient();
    
    // Check if user is admin
    const isUserAdmin = await this.isAdmin(userId);
    
    // Transform venue data to database format (only include provided fields)
    const dbVenueData: any = {};
    
    if (venueData.name) dbVenueData.name = venueData.name;
    if (venueData.description !== undefined) dbVenueData.description = venueData.description;
    if (venueData.address) dbVenueData.address = venueData.address;
    if (venueData.city) dbVenueData.city = venueData.city;
    if (venueData.country) dbVenueData.country = venueData.country;
    if (venueData.coordinates) dbVenueData.coordinates = venueData.coordinates;
    if (venueData.capacity !== undefined) dbVenueData.capacity = venueData.capacity;
    if (venueData.venue_type) dbVenueData.venue_type = venueData.venue_type;
    if (venueData.amenities) dbVenueData.amenities = venueData.amenities;
    if (venueData.contact_email !== undefined) dbVenueData.contact_email = venueData.contact_email;
    if (venueData.contact_phone !== undefined) dbVenueData.contact_phone = venueData.contact_phone;
    if (venueData.website !== undefined) dbVenueData.website = venueData.website;
    if (venueData.image_urls) dbVenueData.image_urls = venueData.image_urls;
    if (venueData.pricing) dbVenueData.pricing = venueData.pricing;
    if (venueData.availability) dbVenueData.availability = venueData.availability;
    if (venueData.verified !== undefined) dbVenueData.verified = venueData.verified;
    if (venueData.status) dbVenueData.status = venueData.status;

    // Build update query - admins can update any venue
    let query = supabase
      .from('venues')
      .update(dbVenueData)
      .eq('id', venueId);

    // Only restrict to owner if not admin
    if (!isUserAdmin) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query
      .select('*')
      .single();

    if (error) {
      console.error('Error updating venue:', error);
      throw error;
    }

    // After successful update, check for policy violations if content fields were changed
    if (venueData.name || venueData.description) {
      try {
        await checkVenuePolicy(venueId, { ...venueData, name: data.name, description: data.description }, userId);
        console.log(`[PolicyCheck] Venue ${venueId} checked for policy violations after update`);
      } catch (policyError) {
        console.warn('Policy check failed (non-blocking):', policyError);
        // Don't throw - policy checking shouldn't break venue updates
      }
    }

    return data;
  },

  /**
   * Get all venues for a user (venue owner)
   * Admins can see all venues, regular users see only their own
   */
  async getUserVenues(userId: string): Promise<DatabaseVenue[]> {
    this.ensureEnabled();
    const supabase = createClient();
    
    // Check if user is admin
    const isUserAdmin = await this.isAdmin(userId);
    
    let query = supabase
      .from('venues')
      .select('*')
      .order('created_at', { ascending: false });

    // Only restrict to owned venues if not admin
    if (!isUserAdmin) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user venues:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get all active venues (public)
   */
  async getActiveVenues(filters?: {
    city?: string;
    venue_type?: string;
    capacity_min?: number;
    capacity_max?: number;
    verified_only?: boolean;
    limit?: number;
  }): Promise<DatabaseVenue[]> {
    this.ensureEnabled();
    const supabase = createClient();
    
    let query = supabase
      .from('venues')
      .select('*')
      .eq('status', 'active');

    if (filters?.city) {
      query = query.ilike('city', `%${filters.city}%`);
    }

    if (filters?.venue_type) {
      query = query.eq('venue_type', filters.venue_type);
    }

    if (filters?.capacity_min) {
      query = query.gte('capacity', filters.capacity_min);
    }

    if (filters?.capacity_max) {
      query = query.lte('capacity', filters.capacity_max);
    }

    if (filters?.verified_only) {
      query = query.eq('verified', true);
    }

    query = query.order('created_at', { ascending: false });

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching active venues:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get a single venue by ID
   */
  async getVenue(venueId: string): Promise<DatabaseVenue | null> {
    this.ensureEnabled();
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single();

    if (error) {
      console.error('Error fetching venue:', error);
      return null;
    }

    return data;
  },

  /**
   * Delete a venue
   * Admins can delete any venue, regular users can only delete their own
   */
  async deleteVenue(venueId: string, userId: string): Promise<void> {
    this.ensureEnabled();
    const supabase = createClient();
    
    // Check if user is admin
    const isUserAdmin = await this.isAdmin(userId);
    
    // Build delete query - admins can delete any venue
    let query = supabase
      .from('venues')
      .delete()
      .eq('id', venueId);

    // Only restrict to owner if not admin
    if (!isUserAdmin) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting venue:', error);
      throw error;
    }
  },

  /**
   * Search venues by name, city, or description
   */
  async searchVenues(searchTerm: string, limit = 20): Promise<DatabaseVenue[]> {
    this.ensureEnabled();
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('status', 'active')
      .or(`name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('verified', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error searching venues:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Get venues by city (for event location dropdowns)
   */
  async getVenuesByCity(city: string, limit = 50): Promise<DatabaseVenue[]> {
    this.ensureEnabled();
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('status', 'active')
      .ilike('city', `%${city}%`)
      .order('verified', { ascending: false })
      .order('name')
      .limit(limit);

    if (error) {
      console.error('Error fetching venues by city:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Update venue verification status (admin only)
   */
  async updateVerificationStatus(venueId: string, verified: boolean): Promise<void> {
    this.ensureEnabled();
    const supabase = createClient();
    
    const { error } = await supabase
      .from('venues')
      .update({ 
        verified,
        updated_at: new Date().toISOString()
      })
      .eq('id', venueId);

    if (error) {
      console.error('Error updating venue verification:', error);
      throw error;
    }
  },

  /**
   * Get venue statistics
   */
  async getVenueStats(userId?: string): Promise<{
    total_venues: number;
    active_venues: number;
    verified_venues: number;
    pending_verification: number;
  }> {
    this.ensureEnabled();
    const supabase = createClient();
    
    let query = supabase.from('venues').select('status, verified');
    
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching venue stats:', error);
      throw error;
    }

    const stats = {
      total_venues: data?.length || 0,
      active_venues: data?.filter((v: any) => v.status === 'active').length || 0,
      verified_venues: data?.filter((v: any) => v.verified).length || 0,
      pending_verification: data?.filter((v: any) => v.status === 'active' && !v.verified).length || 0,
    };

    return stats;
  }
};
