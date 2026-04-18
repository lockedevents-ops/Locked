/**
 * Venue Types & Interfaces
 * 
 * Complete type definitions for venue management system
 */

// ============================================================================
// ENUMS
// ============================================================================

export type VenueType = 
  | 'conference_center'
  | 'hotel'
  | 'banquet_hall'
  | 'outdoor_space'
  | 'restaurant'
  | 'club'
  | 'theater'
  | 'sports_facility'
  | 'exhibition_center'
  | 'community_center'
  | 'private_estate'
  | 'rooftop'
  | 'warehouse'
  | 'other';

export type VenueCategory =
  | 'corporate'
  | 'wedding'
  | 'social'
  | 'entertainment'
  | 'sports'
  | 'education'
  | 'religious'
  | 'exhibition'
  | 'mixed_use';

export type VenueStatus =
  | 'pending'
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'rejected'
  | 'under_review';

export type VerificationStatus =
  | 'unverified'
  | 'pending'
  | 'verified'
  | 'rejected';

// ============================================================================
// AMENITIES & EQUIPMENT
// ============================================================================

export type VenueAmenity =
  | 'wifi'
  | 'parking'
  | 'catering'
  | 'audio_visual'
  | 'air_conditioning'
  | 'security'
  | 'wheelchair_accessible'
  | 'elevators'
  | 'restrooms'
  | 'green_room'
  | 'coat_check'
  | 'bar'
  | 'kitchen'
  | 'outdoor_area'
  | 'dance_floor'
  | 'pool'
  | 'gym';

export type VenueEquipment =
  | 'projector'
  | 'microphone'
  | 'sound_system'
  | 'stage'
  | 'lighting'
  | 'tables'
  | 'chairs'
  | 'podium'
  | 'whiteboard'
  | 'screen'
  | 'video_conferencing'
  | 'recording_equipment'
  | 'backdrop';

export type VenueService =
  | 'event_planning'
  | 'decoration'
  | 'photography'
  | 'videography'
  | 'security_services'
  | 'valet_parking'
  | 'shuttle_service'
  | 'cleaning_service'
  | 'technical_support'
  | 'catering_service';

// ============================================================================
// OPERATING HOURS
// ============================================================================

export interface DayOperatingHours {
  open: string; // "08:00"
  close: string; // "22:00"
  closed?: boolean;
}

export interface OperatingHours {
  monday?: DayOperatingHours;
  tuesday?: DayOperatingHours;
  wednesday?: DayOperatingHours;
  thursday?: DayOperatingHours;
  friday?: DayOperatingHours;
  saturday?: DayOperatingHours;
  sunday?: DayOperatingHours;
}

// ============================================================================
// BLACKOUT DATES
// ============================================================================

export interface BlackoutDate {
  start: string; // ISO date "2024-12-24"
  end: string; // ISO date "2024-12-26"
  reason: string;
}

// ============================================================================
// MAIN VENUE INTERFACE
// ============================================================================

export interface Venue {
  // Primary Key
  id: string;

  // Foreign Keys
  user_id: string;

  // Venue Identity
  name: string;
  slug: string | null;
  description: string | null;
  tagline: string | null;

  // Venue Type & Category
  venue_type: VenueType;
  category: VenueCategory;

  // Business Information
  business_name: string | null;
  business_registration_number: string | null;
  business_tax_id: string | null;
  business_phone: string | null;
  business_email: string | null;
  business_website: string | null;

  // Location Details
  address_line1: string;
  address_line2: string | null;
  city: string;
  region: string;
  country: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;

  // Capacity & Specifications
  max_capacity: number;
  min_capacity: number;
  total_space_sqm: number | null;
  indoor_space_sqm: number | null;
  outdoor_space_sqm: number | null;
  number_of_rooms: number;
  number_of_halls: number;

  // Amenities & Features
  amenities: VenueAmenity[];
  equipment: VenueEquipment[];
  services: VenueService[];

  // Pricing Information
  base_price_per_hour: number | null;
  base_price_per_day: number | null;
  base_price_per_event: number | null;
  currency: string;
  pricing_notes: string | null;

  // Availability
  operating_hours: OperatingHours;
  blackout_dates: BlackoutDate[];
  advance_booking_days: number;
  min_booking_hours: number;

  // Media
  featured_image_url: string | null;
  gallery_images: string[];
  video_url: string | null;
  virtual_tour_url: string | null;

  // Verification & Status
  status: VenueStatus;
  verification_status: VerificationStatus;
  verified: boolean;
  verified_at: string | null;
  verified_by: string | null;

  // Ratings & Reviews
  average_rating: number;
  total_ratings: number;
  total_reviews: number;

  // Statistics
  total_bookings: number;
  total_events_hosted: number;
  total_revenue: number;
  views_count: number;

  // Contact Information
  contact_person_name: string | null;
  contact_person_phone: string | null;
  contact_person_email: string | null;

  // Policies & Rules
  cancellation_policy: string | null;
  house_rules: string | null;
  terms_and_conditions: string | null;

  // SEO & Discoverability
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[] | null;

  // Feature Flags
  is_featured: boolean;
  is_published: boolean;
  is_bookable: boolean;
  allow_instant_booking: boolean;

  // Compliance
  terms_accepted: boolean;
  terms_accepted_at: string | null;

  // Audit Fields
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// ============================================================================
// PUBLIC VENUE (for listings)
// ============================================================================

export interface PublicVenue {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  tagline: string | null;
  venue_type: VenueType;
  category: VenueCategory;
  address_line1: string;
  city: string;
  region: string;
  country: string;
  max_capacity: number;
  min_capacity: number;
  amenities: VenueAmenity[];
  equipment: VenueEquipment[];
  base_price_per_hour: number | null;
  base_price_per_day: number | null;
  base_price_per_event: number | null;
  currency: string;
  featured_image_url: string | null;
  gallery_images: string[];
  average_rating: number;
  total_ratings: number;
  total_reviews: number;
  total_events_hosted: number;
  views_count: number;
  is_featured: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  owner_name: string | null;
  owner_avatar: string | null;
}

// ============================================================================
// VENUE CREATION/UPDATE PAYLOADS
// ============================================================================

export interface VenueCreatePayload {
  // Required fields
  name: string;
  venue_type: VenueType;
  category: VenueCategory;
  address_line1: string;
  city: string;
  region: string;
  country: string;
  max_capacity: number;

  // Optional identity
  description?: string;
  tagline?: string;
  slug?: string;

  // Optional business info
  business_name?: string;
  business_registration_number?: string;
  business_tax_id?: string;
  business_phone?: string;
  business_email?: string;
  business_website?: string;

  // Optional location
  address_line2?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;

  // Optional capacity
  min_capacity?: number;
  total_space_sqm?: number;
  indoor_space_sqm?: number;
  outdoor_space_sqm?: number;
  number_of_rooms?: number;
  number_of_halls?: number;

  // Optional features
  amenities?: VenueAmenity[];
  equipment?: VenueEquipment[];
  services?: VenueService[];

  // Optional pricing
  base_price_per_hour?: number;
  base_price_per_day?: number;
  base_price_per_event?: number;
  currency?: string;
  pricing_notes?: string;

  // Optional availability
  operating_hours?: OperatingHours;
  blackout_dates?: BlackoutDate[];
  advance_booking_days?: number;
  min_booking_hours?: number;

  // Optional media
  featured_image_url?: string;
  gallery_images?: string[];
  video_url?: string;
  virtual_tour_url?: string;

  // Optional contact
  contact_person_name?: string;
  contact_person_phone?: string;
  contact_person_email?: string;

  // Optional policies
  cancellation_policy?: string;
  house_rules?: string;
  terms_and_conditions?: string;

  // Optional SEO
  meta_title?: string;
  meta_description?: string;
  keywords?: string[];

  // Optional flags
  is_published?: boolean;
  is_bookable?: boolean;
  allow_instant_booking?: boolean;

  // Required compliance
  terms_accepted: boolean;
}

export interface VenueUpdatePayload extends Partial<VenueCreatePayload> {
  id: string;
}

// ============================================================================
// SEARCH & FILTER INTERFACES
// ============================================================================

export interface VenueSearchParams {
  // Location
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;

  // Type & Category
  venue_type?: VenueType | VenueType[];
  category?: VenueCategory | VenueCategory[];

  // Capacity
  min_capacity?: number;
  max_capacity?: number;

  // Price range
  min_price?: number;
  max_price?: number;
  price_type?: 'hourly' | 'daily' | 'event';

  // Features
  amenities?: VenueAmenity[];
  equipment?: VenueEquipment[];
  services?: VenueService[];

  // Availability
  date?: string;
  start_time?: string;
  end_time?: string;

  // Filters
  is_featured?: boolean;
  verified_only?: boolean;
  instant_booking_only?: boolean;

  // Rating
  min_rating?: number;

  // Search
  search_query?: string;

  // Pagination
  page?: number;
  per_page?: number;

  // Sorting
  sort_by?: 'relevance' | 'price_low' | 'price_high' | 'rating' | 'popularity' | 'newest';
}

export interface VenueSearchResult {
  venues: PublicVenue[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ============================================================================
// VENUE STATISTICS
// ============================================================================

export interface VenueStats {
  total_views: number;
  total_bookings: number;
  total_revenue: number;
  average_rating: number;
  total_reviews: number;
  conversion_rate: number;
  popular_dates: string[];
  revenue_by_month: { month: string; revenue: number }[];
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type VenueFormData = Omit<VenueCreatePayload, 'user_id'>;

export type VenueWithOwner = Venue & {
  owner: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
};
