-- ============================================================================
-- CONSOLIDATED DATABASE MIGRATION
-- ============================================================================
-- This file contains ALL migrations in the correct dependency order.
-- Run this single file to set up the entire database schema.
--
-- EXCLUDES: seed_20_events.sql (test data)
--
-- DEPENDENCY ORDER:
-- 1. Cleanup (drop existing triggers/functions)
-- 2. Core tables (no custom table dependencies)
-- 3. User management (profiles, user_roles)
-- 4. Business entities (organizers, venues)
-- 5. Events and registration
-- 6. Features (keys, merch, cart, orders)
-- 7. Communication (notifications, chatbot)
-- 8. Security and verification
-- 9. Transactions and payouts
-- 10. Realtime and utilities
--
-- GENERATED: 2025-12-25
-- ============================================================================

-- ============================================================================
-- SECTION 0: CLEANUP EXISTING TRIGGERS (SAFE FOR FRESH DB)
-- ============================================================================
-- Source: 0_cleanup_triggers.sql
-- Note: These are wrapped to handle cases where tables don't exist yet

DO $$
BEGIN
  -- Drop triggers (may fail if table doesn't exist, which is fine)
  DROP TRIGGER IF EXISTS user_roles_sync_profiles_trigger ON user_roles;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS user_roles_auto_create_organizer_trigger ON user_roles;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS role_requests_updated_at_trigger ON role_requests;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS role_requests_auto_grant_trigger ON role_requests;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS organizers_updated_at_trigger ON organizers;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS event_registrations_updated_at_trigger ON event_registrations;
  DROP TRIGGER IF EXISTS event_registrations_generate_qr_trigger ON event_registrations;
  DROP TRIGGER IF EXISTS event_registrations_update_count_trigger ON event_registrations;
  DROP TRIGGER IF EXISTS event_registrations_update_organizer_stats_trigger ON event_registrations;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS events_updated_at_trigger ON events;
  DROP TRIGGER IF EXISTS events_generate_slug_trigger ON events;
  DROP TRIGGER IF EXISTS events_update_organizer_stats_create_trigger ON events;
  DROP TRIGGER IF EXISTS events_update_organizer_stats_status_trigger ON events;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS profiles_updated_at_trigger ON profiles;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_email_verified ON auth.users;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Drop functions (these are safe even if they don't exist)
DROP FUNCTION IF EXISTS sync_profile_role_flags();
DROP FUNCTION IF EXISTS auto_create_organizer_profile();
DROP FUNCTION IF EXISTS update_role_requests_updated_at();
DROP FUNCTION IF EXISTS auto_grant_role_on_approval();
DROP FUNCTION IF EXISTS update_organizers_updated_at();
DROP FUNCTION IF EXISTS update_event_registrations_updated_at();
DROP FUNCTION IF EXISTS generate_qr_code_token();
DROP FUNCTION IF EXISTS update_event_registration_count();
DROP FUNCTION IF EXISTS update_organizer_stats_on_registration();
DROP FUNCTION IF EXISTS update_events_updated_at();
DROP FUNCTION IF EXISTS generate_event_slug();
DROP FUNCTION IF EXISTS update_organizer_stats_on_event_create();
DROP FUNCTION IF EXISTS update_organizer_stats_on_status_change();
DROP FUNCTION IF EXISTS update_profiles_updated_at();
DROP FUNCTION IF EXISTS create_profile_on_email_verification();

-- ============================================================================
-- NOTE: Storage buckets are defined in SECTION 26 (at the end of this file)
-- They are placed at the end because storage policies reference user_roles table
-- ============================================================================

-- ============================================================================
-- SECTION 2: PROFILES TABLE
-- ============================================================================
-- Source: profiles.sql

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Information
  email VARCHAR(255),
  full_name VARCHAR(255),
  phone_number VARCHAR(20),
  date_of_birth DATE,
  gender VARCHAR(20) CHECK (gender IS NULL OR gender IN ('male', 'female', 'non-binary', 'prefer-not-to-say', 'other')),
  nationality VARCHAR(100),
  marital_status VARCHAR(20) CHECK (marital_status IS NULL OR marital_status IN ('single', 'married', 'divorced', 'widowed', 'separated', 'prefer-not-to-say')),
  
  -- Birth Information
  birth_city VARCHAR(100),
  birth_country VARCHAR(100),
  
  -- Address Information
  address_line_1 VARCHAR(255),
  address_line_2 VARCHAR(255),
  city VARCHAR(100),
  region VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Ghana',
  
  -- Emergency Contact
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relationship VARCHAR(50),
  
  -- Profile Details
  avatar_url TEXT,
  bio TEXT,
  occupation VARCHAR(100),
  company VARCHAR(255),
  website VARCHAR(500),
  
  -- Arrays
  interests TEXT[],
  languages VARCHAR(100)[],
  social_links JSONB DEFAULT '{}',
  
  -- Privacy Settings
  profile_visibility VARCHAR(20) DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private', 'friends')),
  show_email BOOLEAN DEFAULT FALSE,
  show_phone BOOLEAN DEFAULT FALSE,
  show_location BOOLEAN DEFAULT TRUE,
  
  -- Role Flags (synced from user_roles)
  is_organizer BOOLEAN DEFAULT FALSE,
  is_venue_owner BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  
  -- Profile Completion Tracking
  profile_completion_percentage INTEGER DEFAULT 0,
  is_profile_complete BOOLEAN DEFAULT FALSE,
  last_profile_update TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  -- Account Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'deleted')),
  
  -- Soft Delete Fields
  deleted_at TIMESTAMP WITH TIME ZONE,
  deletion_reason TEXT,
  deletion_flagged BOOLEAN DEFAULT FALSE,
  deletion_flagged_by UUID REFERENCES auth.users(id),
  deletion_flag_reason TEXT,
  scheduled_purge_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit Trail
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_region ON public.profiles(region);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_organizer ON public.profiles(is_organizer) WHERE is_organizer = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_is_venue_owner ON public.profiles(is_venue_owner) WHERE is_venue_owner = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_deletion_flagged ON public.profiles(deletion_flagged) WHERE deletion_flagged = TRUE;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles (CONSOLIDATED for performance)
-- Consolidated SELECT policy: combines public visibility + own profile access
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT
  USING (
    -- Own profile (always accessible)
    id = (SELECT auth.uid())
    -- OR public profiles that are active
    OR (profile_visibility = 'public' AND status = 'active' AND deleted_at IS NULL)
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER profiles_updated_at_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_profiles_updated_at();

-- ============================================================================
-- SECTION 3: USER ROLES TABLE
-- ============================================================================
-- Source: user_roles.sql

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'organizer', 'venue_owner', 'admin', 'super_admin')),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revocation_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Indexes for user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON public.user_roles(user_id, role) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_granted_by ON public.user_roles(granted_by);
CREATE INDEX IF NOT EXISTS idx_user_roles_revoked_by ON public.user_roles(revoked_by);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles (FULLY CONSOLIDATED - one policy per action)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_all_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_insert_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_update_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_delete_policy" ON public.user_roles;

-- Helper function to check admin status without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
    AND revoked_at IS NULL
  );
$$;

CREATE POLICY "user_roles_select_policy" ON public.user_roles
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "user_roles_insert_policy" ON public.user_roles
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "user_roles_update_policy" ON public.user_roles
  FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "user_roles_delete_policy" ON public.user_roles
  FOR DELETE
  USING (public.is_admin());

-- Function to sync role flags to profiles
CREATE OR REPLACE FUNCTION sync_profile_role_flags()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    is_organizer = EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND role = 'organizer'
      AND revoked_at IS NULL
    ),
    is_venue_owner = EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND role = 'venue_owner'
      AND revoked_at IS NULL
    ),
    is_admin = EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND role IN ('admin', 'super_admin')
      AND revoked_at IS NULL
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER user_roles_sync_profiles_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION sync_profile_role_flags();

-- ============================================================================
-- SECTION 4: ROLE REQUESTS TABLE
-- ============================================================================
-- Source: role_requests.sql

CREATE TABLE IF NOT EXISTS public.role_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('organizer', 'venue_owner')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'revoked')),
  
  -- Company/Business Information
  company_name VARCHAR(255),
  business_email VARCHAR(255),
  business_phone VARCHAR(20),
  additional_contact VARCHAR(255),
  business_category VARCHAR(100),
  organization_description TEXT,
  
  -- Identity Verification
  id_type VARCHAR(50),
  id_number VARCHAR(100),
  id_image_url TEXT,
  selfie_with_id_url TEXT,
  
  -- Admin Review
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  rejection_reason TEXT,
  
  -- Audit Trail
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, request_type, status)
);

-- Indexes for role_requests
CREATE INDEX IF NOT EXISTS idx_role_requests_user_id ON public.role_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_role_requests_status ON public.role_requests(status);
CREATE INDEX IF NOT EXISTS idx_role_requests_type ON public.role_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_role_requests_pending ON public.role_requests(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_role_requests_reviewed_by ON public.role_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_role_requests_submitted_at ON public.role_requests(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_role_requests_pending_old ON public.role_requests(submitted_at) WHERE status = 'pending' AND reviewed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_role_requests_revoked ON public.role_requests(status) WHERE status = 'revoked';

-- Enable RLS
ALTER TABLE public.role_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for role_requests (CONSOLIDATED for performance)
DROP POLICY IF EXISTS "Users can view own requests" ON public.role_requests;
DROP POLICY IF EXISTS "Users can create own requests" ON public.role_requests;
DROP POLICY IF EXISTS "Users can cancel own pending requests" ON public.role_requests;
DROP POLICY IF EXISTS "Admins can manage all requests" ON public.role_requests;
DROP POLICY IF EXISTS "role_requests_select_policy" ON public.role_requests;
DROP POLICY IF EXISTS "role_requests_insert_policy" ON public.role_requests;
DROP POLICY IF EXISTS "role_requests_update_policy" ON public.role_requests;
DROP POLICY IF EXISTS "role_requests_admin_all_policy" ON public.role_requests;

-- Consolidated SELECT: own requests OR admin
-- Consolidated SELECT: own requests OR admin
CREATE POLICY "role_requests_select_policy" ON public.role_requests
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin()
  );

-- Consolidated INSERT: own requests OR admin
CREATE POLICY "role_requests_insert_policy" ON public.role_requests
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_admin()
  );

-- Consolidated UPDATE: own pending requests OR admin
CREATE POLICY "role_requests_update_policy" ON public.role_requests
  FOR UPDATE
  USING (
    (user_id = (SELECT auth.uid()) AND status = 'pending')
    OR public.is_admin()
  );

-- Admin-only DELETE
CREATE POLICY "role_requests_delete_policy" ON public.role_requests
  FOR DELETE
  USING (public.is_admin());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_role_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER role_requests_updated_at_trigger
BEFORE UPDATE ON public.role_requests
FOR EACH ROW
EXECUTE FUNCTION update_role_requests_updated_at();

-- ============================================================================
-- SECTION 5: ORGANIZERS TABLE
-- ============================================================================
-- Source: organizers.sql

CREATE TABLE IF NOT EXISTS public.organizers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Business Information
  business_name VARCHAR(255) NOT NULL,
  business_category VARCHAR(100) DEFAULT 'Events',
  business_description TEXT,
  business_email VARCHAR(255),
  contact_email VARCHAR(255),
  business_phone VARCHAR(20),
  business_website TEXT,
  
  -- Branding
  logo_url TEXT,
  banner_url TEXT,
  
  -- Social Links
  social_facebook TEXT,
  social_twitter TEXT,
  social_instagram TEXT,
  social_linkedin TEXT,
  social_youtube TEXT,
  social_tiktok TEXT,
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  
  -- Stats (denormalized for performance)
  total_events_created INTEGER DEFAULT 0,
  total_events_published INTEGER DEFAULT 0,
  total_attendees INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  
  -- Audit Trail
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for organizers
CREATE INDEX IF NOT EXISTS idx_organizers_user_id ON public.organizers(user_id);
CREATE INDEX IF NOT EXISTS idx_organizers_status ON public.organizers(status);
CREATE INDEX IF NOT EXISTS idx_organizers_business_name ON public.organizers(business_name);
CREATE INDEX IF NOT EXISTS idx_organizers_rating ON public.organizers(average_rating DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_organizers_active ON public.organizers(status, created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_organizers_category ON public.organizers(business_category) WHERE status = 'active';

-- Enable RLS
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizers (CONSOLIDATED for performance)
-- Consolidated SELECT: public active profiles OR own profile OR admin
DROP POLICY IF EXISTS "Anyone can view public organizer profiles" ON public.organizers;
DROP POLICY IF EXISTS "Organizers can view own profile" ON public.organizers;
DROP POLICY IF EXISTS "Organizers can update own profile" ON public.organizers;
DROP POLICY IF EXISTS "Admins can manage all organizers" ON public.organizers;
DROP POLICY IF EXISTS "organizers_select_policy" ON public.organizers;
DROP POLICY IF EXISTS "organizers_update_policy" ON public.organizers;
DROP POLICY IF EXISTS "organizers_admin_all_policy" ON public.organizers;

CREATE POLICY "organizers_select_policy" ON public.organizers
  FOR SELECT
  USING (
    -- Public active organizers
    status = 'active'
    -- OR own profile
    OR user_id = (SELECT auth.uid())
    -- OR admin
    OR public.is_admin()
  );

-- Consolidated UPDATE: own profile OR admin
CREATE POLICY "organizers_update_policy" ON public.organizers
  FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin()
  );

-- Admin-only INSERT
CREATE POLICY "organizers_insert_policy" ON public.organizers
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Admin-only DELETE
CREATE POLICY "organizers_delete_policy" ON public.organizers
  FOR DELETE
  USING (public.is_admin());

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_organizers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER organizers_updated_at_trigger
BEFORE UPDATE ON public.organizers
FOR EACH ROW
EXECUTE FUNCTION update_organizers_updated_at();

-- Function to auto-create organizer profile when role is granted
CREATE OR REPLACE FUNCTION auto_create_organizer_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_company_name TEXT;
BEGIN
  IF NEW.role = 'organizer' AND NEW.revoked_at IS NULL THEN
    -- Get user profile info
    SELECT full_name, email INTO v_profile
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    -- Get company name from role request
    SELECT company_name INTO v_company_name
    FROM public.role_requests
    WHERE user_id = NEW.user_id
    AND request_type = 'organizer'
    AND status = 'approved'
    ORDER BY reviewed_at DESC
    LIMIT 1;
    
    -- Create organizer profile if doesn't exist
    INSERT INTO public.organizers (user_id, business_name, business_email)
    VALUES (
      NEW.user_id,
      COALESCE(v_company_name, v_profile.full_name, 'New Organizer'),
      COALESCE(v_profile.email, '')
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_roles_auto_create_organizer_trigger
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION auto_create_organizer_profile();

-- Function to auto-grant role on request approval
CREATE OR REPLACE FUNCTION auto_grant_role_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    INSERT INTO public.user_roles (user_id, role, granted_by, notes)
    VALUES (
      NEW.user_id,
      NEW.request_type,
      NEW.reviewed_by,
      'Auto-granted on request approval'
    )
    ON CONFLICT (user_id, role) DO UPDATE
    SET revoked_at = NULL, granted_at = NOW(), granted_by = NEW.reviewed_by;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER role_requests_auto_grant_trigger
AFTER UPDATE ON public.role_requests
FOR EACH ROW
EXECUTE FUNCTION auto_grant_role_on_approval();

-- ============================================================================
-- SECTION 6: VENUES TABLE
-- ============================================================================
-- Source: venues.sql

CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Basic Information
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  short_description VARCHAR(500),
  
  -- Location
  address VARCHAR(500) NOT NULL,
  city VARCHAR(100) NOT NULL,
  region VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Ghana',
  postal_code VARCHAR(20),
  latitude DECIMAL(9, 6),
  longitude DECIMAL(9, 6),
  
  -- Capacity & Facilities
  capacity INTEGER,
  standing_capacity INTEGER,
  seated_capacity INTEGER,
  facilities TEXT[],
  amenities TEXT[],
  
  -- Media
  cover_image_url TEXT,
  gallery_urls TEXT[],
  
  -- Contact
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  website TEXT,
  
  -- Pricing
  hourly_rate DECIMAL(10, 2),
  daily_rate DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'GHS',
  
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
  is_featured BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  
  -- Audit Trail
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for venues
CREATE INDEX IF NOT EXISTS idx_venues_owner_id ON public.venues(owner_id);
CREATE INDEX IF NOT EXISTS idx_venues_city ON public.venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_status ON public.venues(status);
CREATE INDEX IF NOT EXISTS idx_venues_slug ON public.venues(slug);
CREATE INDEX IF NOT EXISTS idx_venues_featured ON public.venues(is_featured) WHERE is_featured = TRUE;

-- Enable RLS
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

-- RLS Policies for venues (FULLY CONSOLIDATED - one policy per action)
DROP POLICY IF EXISTS "Anyone can view active venues" ON public.venues;
DROP POLICY IF EXISTS "Owners can manage own venues" ON public.venues;
DROP POLICY IF EXISTS "Admins can manage all venues" ON public.venues;
DROP POLICY IF EXISTS "venues_select_policy" ON public.venues;
DROP POLICY IF EXISTS "venues_owner_all_policy" ON public.venues;
DROP POLICY IF EXISTS "venues_admin_all_policy" ON public.venues;
DROP POLICY IF EXISTS "venues_modify_policy" ON public.venues;
DROP POLICY IF EXISTS "venues_insert_policy" ON public.venues;
DROP POLICY IF EXISTS "venues_update_policy" ON public.venues;
DROP POLICY IF EXISTS "venues_delete_policy" ON public.venues;

-- Consolidated SELECT: active venues OR own venues OR admin
CREATE POLICY "venues_select_policy" ON public.venues
  FOR SELECT
  USING (
    status = 'active'
    OR owner_id = (SELECT auth.uid())
    OR public.is_admin()
  );

-- INSERT: owners OR admin
CREATE POLICY "venues_insert_policy" ON public.venues
  FOR INSERT
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    OR public.is_admin()
  );

-- UPDATE: owners OR admin
CREATE POLICY "venues_update_policy" ON public.venues
  FOR UPDATE
  USING (
    owner_id = (SELECT auth.uid())
    OR public.is_admin()
  );

-- DELETE: owners OR admin
CREATE POLICY "venues_delete_policy" ON public.venues
  FOR DELETE
  USING (
    owner_id = (SELECT auth.uid())
    OR public.is_admin()
  );

-- ============================================================================
-- SECTION 7: EVENTS TABLE
-- ============================================================================
-- Source: events.sql

DROP TABLE IF EXISTS events CASCADE;

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL,
  
  -- Event Identity
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  short_description VARCHAR(500),
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  
  -- Event Dates & Times
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  start_time VARCHAR(10) NOT NULL,
  end_time VARCHAR(10),
  time_zone VARCHAR(100) DEFAULT 'Africa/Accra',
  registration_deadline TIMESTAMP WITH TIME ZONE,
  registration_start_date TIMESTAMP WITH TIME ZONE,
  registration_end_date TIMESTAMP WITH TIME ZONE,
  
  -- Location
  location_type VARCHAR(20) NOT NULL CHECK (location_type IN ('physical', 'online', 'hybrid')),
  venue VARCHAR(255),
  venue_id UUID,
  location_address VARCHAR(500),
  location_city VARCHAR(100),
  location_country VARCHAR(100) DEFAULT 'Ghana',
  location_region VARCHAR(100),
  location_latitude DECIMAL(9, 6),
  location_longitude DECIMAL(9, 6),
  
  -- Online Details
  online_url TEXT,
  online_platform VARCHAR(50),
  meeting_code TEXT,
  meeting_password TEXT,
  
  -- Registration
  current_registrations INTEGER DEFAULT 0,
  registration_required BOOLEAN DEFAULT TRUE,
  require_approval BOOLEAN DEFAULT FALSE,
  attendee_count INTEGER DEFAULT 0,
  tickets_sold INTEGER DEFAULT 0,
  
  -- Pricing & Tickets
  is_free BOOLEAN NOT NULL DEFAULT FALSE,
  price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  tickets JSONB DEFAULT '[]',
  
  -- Event Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'ongoing', 'completed', 'cancelled', 'postponed')),
  published_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  
  -- Visibility & Access
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  featured_type VARCHAR(20) DEFAULT NULL CHECK (featured_type IN ('auto', 'manual', NULL)),
  featured_at TIMESTAMP WITH TIME ZONE,
  featured_until TIMESTAMP WITH TIME ZONE,
  featured_score DECIMAL(10, 2) DEFAULT 0,
  featured_reason VARCHAR(255) DEFAULT NULL,
  
  -- Media
  cover_image_url TEXT,
  image_url TEXT,
  thumbnail_url TEXT,
  gallery_urls TEXT[],
  gallery_images TEXT[],
  
  -- Event Details
  tags TEXT[],
  event_tags TEXT[],
  organizer_notes TEXT,
  languages_offered VARCHAR(100)[],
  age_restriction INTEGER,
  content_warning TEXT,
  
  -- Engagement & Stats
  total_views INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  lock_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  
  -- SEO & Metadata
  meta_title VARCHAR(255),
  meta_description VARCHAR(500),
  meta_keywords TEXT,
  
  -- Compliance & Moderation
  is_verified BOOLEAN DEFAULT FALSE,
  flagged_count INTEGER DEFAULT 0,
  is_flagged BOOLEAN DEFAULT FALSE,
  
  -- Settings & Preferences
  auto_approve_registrations BOOLEAN DEFAULT TRUE,
  send_reminder_notifications BOOLEAN DEFAULT TRUE,
  require_attendee_approval BOOLEAN DEFAULT FALSE,
  is_private BOOLEAN DEFAULT FALSE,
  
  -- Voting & Competition Features
  has_voting BOOLEAN DEFAULT FALSE,
  vote_cost NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (vote_cost >= 0.1),
  voting_info JSONB DEFAULT NULL,
  contestants JSONB DEFAULT NULL,
  
  -- Event Details & Schedule
  duration VARCHAR(100) DEFAULT NULL,
  features TEXT[] DEFAULT '{}',
  schedule JSONB DEFAULT NULL,
  
  -- Merchandise
  has_merch BOOLEAN DEFAULT FALSE,
  merch_products JSONB DEFAULT NULL,
  
  -- Audit Trail
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Constraints
  CONSTRAINT end_date_after_start CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT registration_dates_logical CHECK (
    registration_start_date IS NULL 
    OR registration_end_date IS NULL 
    OR registration_end_date > registration_start_date
  ),
  CONSTRAINT price_positive CHECK (price IS NULL OR price >= 0),
  CONSTRAINT free_event_no_price CHECK (
    (is_free = TRUE AND price IS NULL) 
    OR (is_free = FALSE)
  )
);

-- Foreign key to organizers
ALTER TABLE events
ADD CONSTRAINT events_organizer_id_fkey
FOREIGN KEY (organizer_id)
REFERENCES organizers(id)
ON DELETE CASCADE;

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_published ON events(status, start_date DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_events_upcoming ON events(start_date) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_events_featured ON events(is_featured, start_date DESC) WHERE is_featured = TRUE AND status = 'published';
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_events_location ON events(location_latitude, location_longitude) WHERE location_type IN ('physical', 'hybrid') AND status = 'published';
CREATE INDEX IF NOT EXISTS idx_events_flagged ON events(is_flagged) WHERE is_flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_published_by ON events(published_by);
CREATE INDEX IF NOT EXISTS idx_events_has_voting ON events(has_voting) WHERE has_voting = TRUE AND status = 'published';

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events (CONSOLIDATED for performance)
DROP POLICY IF EXISTS "Anyone can view public published events" ON events;
DROP POLICY IF EXISTS "Organizers can view own events" ON events;
DROP POLICY IF EXISTS "Organizers can create events" ON events;
DROP POLICY IF EXISTS "Organizers can update own events" ON events;
DROP POLICY IF EXISTS "Admins can manage all events" ON events;
DROP POLICY IF EXISTS "events_select_policy" ON events;
DROP POLICY IF EXISTS "events_insert_policy" ON events;
DROP POLICY IF EXISTS "events_update_policy" ON events;
DROP POLICY IF EXISTS "events_admin_delete_policy" ON events;

-- Consolidated SELECT: public published OR organizer's own OR admin
CREATE POLICY "events_select_policy" ON events
  FOR SELECT
  USING (
    -- Public published events
    (status = 'published' AND is_public = TRUE)
    -- OR organizer's own events
    OR EXISTS (
      SELECT 1 FROM organizers o
      WHERE o.id = events.organizer_id
      AND o.user_id = (SELECT auth.uid())
    )
    -- OR admin
    OR public.is_admin()
  );

-- Consolidated INSERT: organizer role OR admin
CREATE POLICY "events_insert_policy" ON events
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = (SELECT auth.uid())
      AND ur.role = 'organizer'
      AND ur.revoked_at IS NULL
    )
  );

-- Consolidated UPDATE: organizer's own events OR admin
CREATE POLICY "events_update_policy" ON events
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organizers o
      WHERE o.id = events.organizer_id
      AND o.user_id = (SELECT auth.uid())
    )
    OR public.is_admin()
  );

-- Admin-only DELETE
CREATE POLICY "events_delete_policy" ON events
  FOR DELETE
  USING (public.is_admin());

-- Triggers for events
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER events_updated_at_trigger
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_events_updated_at();

CREATE OR REPLACE FUNCTION generate_event_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := LOWER(REGEXP_REPLACE(
      REGEXP_REPLACE(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )) || '-' || SUBSTR(NEW.id::TEXT, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER events_generate_slug_trigger
BEFORE INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION generate_event_slug();

CREATE OR REPLACE FUNCTION update_organizer_stats_on_event_create()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE organizers SET
    total_events_created = total_events_created + 1,
    total_events_published = CASE WHEN NEW.status = 'published' THEN total_events_published + 1 ELSE total_events_published END
  WHERE id = NEW.organizer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER events_update_organizer_stats_create_trigger
AFTER INSERT ON events
FOR EACH ROW
EXECUTE FUNCTION update_organizer_stats_on_event_create();

CREATE OR REPLACE FUNCTION update_organizer_stats_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    UPDATE organizers SET
      total_events_published = total_events_published + CASE 
        WHEN NEW.status = 'published' AND OLD.status != 'published' THEN 1
        WHEN NEW.status != 'published' AND OLD.status = 'published' THEN -1
        ELSE 0
      END
    WHERE id = NEW.organizer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER events_update_organizer_stats_status_trigger
AFTER UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION update_organizer_stats_on_status_change();

-- Featured events view
DROP VIEW IF EXISTS featured_events_view CASCADE;

CREATE OR REPLACE VIEW featured_events_view
WITH (security_invoker = true) AS
SELECT e.*
FROM events e
WHERE 
  e.status = 'published'
  AND e.is_featured = true
  AND (e.featured_until IS NULL OR e.featured_until > NOW())
ORDER BY e.created_at DESC;

GRANT SELECT ON featured_events_view TO authenticated;
GRANT SELECT ON featured_events_view TO anon;

-- ============================================================================
-- SECTION 8: EVENT DRAFTS TABLE
-- ============================================================================
-- Source: event_drafts.sql

CREATE TABLE IF NOT EXISTS public.event_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  title VARCHAR(255),
  draft_data JSONB NOT NULL DEFAULT '{}',
  last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_drafts_organizer_id ON public.event_drafts(organizer_id);

ALTER TABLE public.event_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organizers can manage own drafts" ON public.event_drafts;
CREATE POLICY "Organizers can manage own drafts" ON public.event_drafts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organizers o
      WHERE o.id = event_drafts.organizer_id
      AND o.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- SECTION 9: EVENT REGISTRATIONS TABLE
-- ============================================================================
-- Source: event_registration.sql

CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'pending_approval', 'cancelled', 'checked_in', 'no_show', 'refunded')),
  ticket_type VARCHAR(100),
  quantity_registered INTEGER NOT NULL DEFAULT 1 CHECK (quantity_registered > 0),
  price_at_registration DECIMAL(10, 2),
  total_amount DECIMAL(10, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  transaction_id VARCHAR(255),
  payment_method VARCHAR(50),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  registration_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  cancelled_date TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_in_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attendee_name VARCHAR(255) NOT NULL,
  attendee_email VARCHAR(255) NOT NULL,
  attendee_phone VARCHAR(20),
  custom_form_responses JSONB,
  dietary_preferences VARCHAR(255),
  accessibility_needs TEXT,
  qr_code_token VARCHAR(255) UNIQUE,
  qr_code_scanned BOOLEAN DEFAULT FALSE,
  qr_code_scanned_at TIMESTAMP WITH TIME ZONE,
  qr_code_scanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  post_event_survey_sent BOOLEAN DEFAULT FALSE,
  post_event_survey_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT,
  UNIQUE(user_id, event_id, ticket_type),
  CONSTRAINT fk_event_exists CHECK (event_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_status ON event_registrations(event_id, status) WHERE status IN ('registered', 'checked_in');
CREATE INDEX IF NOT EXISTS idx_event_registrations_qr_token ON event_registrations(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_event_registrations_date ON event_registrations(registration_date DESC);
CREATE INDEX IF NOT EXISTS idx_event_registrations_pending ON event_registrations(event_id) WHERE status = 'pending_approval';
CREATE INDEX IF NOT EXISTS idx_event_registrations_payment_status ON event_registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_payment ON event_registrations(event_id, payment_status);

ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_registrations (CONSOLIDATED for performance)
DROP POLICY IF EXISTS "Users can view own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Organizers can view registrations for their events" ON event_registrations;
DROP POLICY IF EXISTS "Users can register for events" ON event_registrations;
DROP POLICY IF EXISTS "Users can cancel own registrations" ON event_registrations;
DROP POLICY IF EXISTS "Organizers can manage registrations for their events" ON event_registrations;
DROP POLICY IF EXISTS "Admins can manage all registrations" ON event_registrations;
DROP POLICY IF EXISTS "event_registrations_select_policy" ON event_registrations;
DROP POLICY IF EXISTS "event_registrations_insert_policy" ON event_registrations;
DROP POLICY IF EXISTS "event_registrations_update_policy" ON event_registrations;
DROP POLICY IF EXISTS "event_registrations_delete_policy" ON event_registrations;

-- Consolidated SELECT: own registrations OR organizer of event OR admin
CREATE POLICY "event_registrations_select_policy" ON event_registrations
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM events e
      JOIN organizers o ON e.organizer_id = o.id
      WHERE e.id = event_registrations.event_id
      AND o.user_id = (SELECT auth.uid())
    )
    OR public.is_admin()
  );

-- Consolidated INSERT: own registration for public events OR admin
CREATE POLICY "event_registrations_insert_policy" ON event_registrations
  FOR INSERT
  WITH CHECK (
    (
      user_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM events e
        WHERE e.id = event_id
        AND e.status IN ('published', 'ongoing')
        AND e.is_public = TRUE
      )
    )
    OR public.is_admin()
  );

-- Consolidated UPDATE: own registration OR event organizer OR admin
CREATE POLICY "event_registrations_update_policy" ON event_registrations
  FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM events e
      JOIN organizers o ON e.organizer_id = o.id
      WHERE e.id = event_registrations.event_id
      AND o.user_id = (SELECT auth.uid())
    )
    OR public.is_admin()
  );

-- Consolidated DELETE: event organizer OR admin
CREATE POLICY "event_registrations_delete_policy" ON event_registrations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN organizers o ON e.organizer_id = o.id
      WHERE e.id = event_registrations.event_id
      AND o.user_id = (SELECT auth.uid())
    )
    OR public.is_admin()
  );

-- Registration triggers
CREATE OR REPLACE FUNCTION update_event_registrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER event_registrations_updated_at_trigger
BEFORE UPDATE ON event_registrations
FOR EACH ROW
EXECUTE FUNCTION update_event_registrations_updated_at();

CREATE OR REPLACE FUNCTION generate_qr_code_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.qr_code_token IS NULL THEN
    NEW.qr_code_token := REPLACE(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER event_registrations_generate_qr_trigger
BEFORE INSERT ON event_registrations
FOR EACH ROW
EXECUTE FUNCTION generate_qr_code_token();

CREATE OR REPLACE FUNCTION update_event_registration_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'registered' AND (OLD.status IS NULL OR OLD.status != 'registered') THEN
    UPDATE events SET current_registrations = current_registrations + 1
    WHERE id = NEW.event_id;
  ELSIF NEW.status != 'registered' AND OLD.status = 'registered' THEN
    UPDATE events SET current_registrations = GREATEST(current_registrations - 1, 0)
    WHERE id = NEW.event_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER event_registrations_update_count_trigger
AFTER INSERT OR UPDATE ON event_registrations
FOR EACH ROW
EXECUTE FUNCTION update_event_registration_count();

CREATE OR REPLACE FUNCTION update_organizer_stats_on_registration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'registered' AND (OLD.status IS NULL OR OLD.status != 'registered') THEN
    UPDATE organizers SET total_attendees = total_attendees + NEW.quantity_registered
    WHERE id = (SELECT organizer_id FROM events WHERE id = NEW.event_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER event_registrations_update_organizer_stats_trigger
AFTER INSERT OR UPDATE ON event_registrations
FOR EACH ROW
EXECUTE FUNCTION update_organizer_stats_on_registration();

-- ============================================================================
-- SECTION 10: USER EVENT LOCKS TABLE
-- ============================================================================
-- Source: user_event_locks.sql

CREATE TABLE IF NOT EXISTS user_event_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_user_event_locks_user_id ON user_event_locks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_locks_event_id ON user_event_locks(event_id);

ALTER TABLE user_event_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own locks" ON user_event_locks;
CREATE POLICY "Users can view their own locks" ON user_event_locks
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own locks" ON user_event_locks;
CREATE POLICY "Users can insert their own locks" ON user_event_locks
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own locks" ON user_event_locks;
CREATE POLICY "Users can delete their own locks" ON user_event_locks
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Lock count trigger functions
DROP FUNCTION IF EXISTS increment_event_lock_count() CASCADE;
CREATE FUNCTION increment_event_lock_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE events SET lock_count = COALESCE(lock_count, 0) + 1, updated_at = NOW() WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS decrement_event_lock_count() CASCADE;
CREATE FUNCTION decrement_event_lock_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE events SET lock_count = GREATEST(COALESCE(lock_count, 0) - 1, 0), updated_at = NOW() WHERE id = OLD.event_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER increment_lock_count_trigger AFTER INSERT ON user_event_locks FOR EACH ROW EXECUTE FUNCTION increment_event_lock_count();
CREATE TRIGGER decrement_lock_count_trigger AFTER DELETE ON user_event_locks FOR EACH ROW EXECUTE FUNCTION decrement_event_lock_count();

GRANT EXECUTE ON FUNCTION increment_event_lock_count() TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_event_lock_count() TO authenticated;

-- ============================================================================
-- SECTION 11: USER ORGANIZER FOLLOWS TABLE
-- ============================================================================
-- Source: user_organizer_follows.sql

CREATE TABLE IF NOT EXISTS public.user_organizer_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES organizers(id) ON DELETE CASCADE,
  followed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organizer_id)
);

CREATE INDEX IF NOT EXISTS idx_user_organizer_follows_user_id ON public.user_organizer_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizer_follows_organizer_id ON public.user_organizer_follows(organizer_id);

ALTER TABLE public.user_organizer_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own follows" ON public.user_organizer_follows;
CREATE POLICY "Users can view their own follows" ON public.user_organizer_follows
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can follow organizers" ON public.user_organizer_follows;
CREATE POLICY "Users can follow organizers" ON public.user_organizer_follows
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can unfollow organizers" ON public.user_organizer_follows;
CREATE POLICY "Users can unfollow organizers" ON public.user_organizer_follows
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- SECTION 12: KEYS SYSTEM (REWARDS)
-- ============================================================================
-- Source: keys_system.sql

CREATE TABLE IF NOT EXISTS public.user_keys_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keys_ledger_user ON public.user_keys_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_keys_ledger_type ON public.user_keys_ledger(activity_type);
CREATE INDEX IF NOT EXISTS idx_keys_ledger_unread ON public.user_keys_ledger(user_id, is_read) WHERE is_read = FALSE;

CREATE OR REPLACE VIEW public.user_keys_balance WITH (security_invoker = true) AS
SELECT user_id, COALESCE(SUM(amount), 0) as current_balance FROM public.user_keys_ledger GROUP BY user_id;

ALTER TABLE public.user_keys_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own keys history" ON public.user_keys_ledger;
CREATE POLICY "Users can view own keys history" ON public.user_keys_ledger FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can mark own keys as read" ON public.user_keys_ledger;
CREATE POLICY "Users can mark own keys as read" ON public.user_keys_ledger
  FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

-- Organization Keys
CREATE TABLE IF NOT EXISTS public.organization_keys_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  payment_ref TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE VIEW public.organization_keys_balance WITH (security_invoker = true) AS
SELECT organization_id, COALESCE(SUM(amount), 0) as current_balance FROM public.organization_keys_ledger GROUP BY organization_id;

CREATE TABLE IF NOT EXISTS public.keys_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  max_uses INTEGER NOT NULL DEFAULT 1,
  uses_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  organizer_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.organizers(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.keys_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.keys_coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(coupon_id, user_id)
);

ALTER TABLE public.organization_keys_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keys_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keys_redemptions ENABLE ROW LEVEL SECURITY;

-- Keys system functions
CREATE OR REPLACE FUNCTION public.award_keys(target_user_id UUID, key_amount INTEGER, act_type TEXT, desc_text TEXT, meta_data JSONB DEFAULT '{}'::jsonb)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_keys_ledger (user_id, amount, activity_type, description, metadata) VALUES (target_user_id, key_amount, act_type, desc_text, meta_data);
END;
$$;

CREATE OR REPLACE FUNCTION public.purchase_org_keys(p_org_id UUID, p_amount INTEGER, p_payment_ref TEXT, p_desc TEXT DEFAULT 'Keys Pack Purchase')
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.organization_keys_ledger (organization_id, amount, activity_type, description, payment_ref) VALUES (p_org_id, p_amount, 'purchase', p_desc, p_payment_ref);
  RETURN jsonb_build_object('success', true, 'message', 'Keys added successfully');
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_coupon(p_code TEXT, p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_coupon RECORD;
BEGIN
  SELECT * INTO v_coupon FROM public.keys_coupons WHERE code = p_code AND is_active = TRUE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Invalid code'); END IF;
  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < NOW() THEN RETURN jsonb_build_object('success', false, 'message', 'Code expired'); END IF;
  IF v_coupon.uses_count >= v_coupon.max_uses THEN RETURN jsonb_build_object('success', false, 'message', 'Code fully redeemed'); END IF;
  IF EXISTS (SELECT 1 FROM public.keys_redemptions WHERE coupon_id = v_coupon.id AND user_id = p_user_id) THEN RETURN jsonb_build_object('success', false, 'message', 'You already used this code'); END IF;
  UPDATE public.keys_coupons SET uses_count = uses_count + 1 WHERE id = v_coupon.id;
  INSERT INTO public.keys_redemptions (coupon_id, user_id) VALUES (v_coupon.id, p_user_id);
  INSERT INTO public.user_keys_ledger (user_id, amount, activity_type, description, metadata) VALUES (p_user_id, v_coupon.amount, 'coupon_redemption', 'Redeemed code: ' || p_code, jsonb_build_object('coupon_id', v_coupon.id));
  RETURN jsonb_build_object('success', true, 'amount', v_coupon.amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_award_signup_bonus()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_keys_ledger WHERE user_id = NEW.id AND activity_type = 'signup_bonus') THEN
    PERFORM public.award_keys(NEW.id, 50, 'signup_bonus', 'Welcome Bonus');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_award_keys ON public.profiles;
CREATE TRIGGER on_profile_created_award_keys AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.trigger_award_signup_bonus();

CREATE OR REPLACE FUNCTION public.trigger_award_profile_completion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_complete BOOLEAN := FALSE;
BEGIN
  IF (NEW.full_name IS NOT NULL AND NEW.full_name != '') AND (NEW.phone_number IS NOT NULL AND NEW.phone_number != '') AND (NEW.city IS NOT NULL) THEN is_complete := TRUE; END IF;
  IF is_complete THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_keys_ledger WHERE user_id = NEW.id AND activity_type = 'profile_completion') THEN
      PERFORM public.award_keys(NEW.id, 10, 'profile_completion', 'Profile Completion Reward');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_updated_award_keys ON public.profiles;
CREATE TRIGGER on_profile_updated_award_keys AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.trigger_award_profile_completion();

CREATE OR REPLACE FUNCTION public.spend_user_keys(p_user_id UUID, p_amount INTEGER, p_desc TEXT, p_metadata JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_balance INTEGER;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_balance FROM public.user_keys_ledger WHERE user_id = p_user_id;
  IF v_balance < p_amount THEN RETURN jsonb_build_object('success', false, 'message', 'Insufficient keys. Available: ' || v_balance); END IF;
  INSERT INTO public.user_keys_ledger (user_id, amount, activity_type, description, metadata) VALUES (p_user_id, -p_amount, 'spend_ticket_purchase', p_desc, p_metadata);
  RETURN jsonb_build_object('success', true, 'message', 'Keys spent successfully');
END;
$$;

GRANT SELECT ON public.user_keys_ledger TO authenticated;
GRANT UPDATE (is_read) ON public.user_keys_ledger TO authenticated;
GRANT SELECT ON public.user_keys_balance TO authenticated;
GRANT SELECT ON public.organization_keys_ledger TO authenticated;
GRANT SELECT ON public.keys_coupons TO authenticated;

-- ============================================================================
-- SECTION 13: NOTIFICATIONS TABLE & RPC FUNCTIONS
-- ============================================================================
-- Source: notifications.sql (Updated)

DROP TABLE IF EXISTS public.notifications CASCADE;

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin_notification BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_is_admin ON public.notifications(is_admin_notification) WHERE is_admin_notification = TRUE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_notifications_updated_at()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON public.notifications;
CREATE TRIGGER trigger_update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notifications_updated_at();

-- RLS POLICIES
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (
    (SELECT auth.uid()) = user_id
  );

DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
CREATE POLICY "Admins can view all notifications"
  ON public.notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'super_admin', 'support_agent')
      AND revoked_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- RPC FUNCTIONS
CREATE OR REPLACE FUNCTION public.notify_user(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type VARCHAR DEFAULT 'general',
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_priority VARCHAR DEFAULT 'normal',
  p_created_by UUID DEFAULT NULL,
  p_is_admin_notification BOOLEAN DEFAULT FALSE
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id, type, title, message, link, priority, metadata, is_admin_notification, created_by, is_read
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_link, p_priority, p_metadata, p_is_admin_notification, p_created_by, FALSE
  )
  RETURNING id INTO v_notification_id;
  RETURN v_notification_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_user TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_admins(
  p_title TEXT,
  p_message TEXT,
  p_type VARCHAR DEFAULT 'admin_message',
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_priority VARCHAR DEFAULT 'normal',
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (notification_id UUID, admin_user_id UUID)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_admin_record RECORD;
  v_notification_id UUID;
BEGIN
  FOR v_admin_record IN
    SELECT DISTINCT user_id
    FROM public.user_roles
    WHERE role IN ('admin', 'super_admin', 'support_agent')
    AND revoked_at IS NULL
  LOOP
    INSERT INTO public.notifications (
      user_id, type, title, message, link, priority, metadata, is_admin_notification, created_by, is_read
    ) VALUES (
      v_admin_record.user_id, p_type, p_title, p_message, p_link, p_priority, p_metadata, TRUE, p_created_by, FALSE
    )
    RETURNING id INTO v_notification_id;
    notification_id := v_notification_id;
    admin_user_id := v_admin_record.user_id;
    RETURN NEXT;
  END LOOP;
  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notify_admins TO authenticated;

-- ============================================================================
-- SECTION 14: CHATBOT MESSAGES TABLE
-- ============================================================================
-- Source: chatbot_messages.sql

CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_id ON public.chatbot_conversations(user_id);

ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own conversations" ON public.chatbot_conversations;
CREATE POLICY "Users can view their own conversations" ON public.chatbot_conversations FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.chatbot_conversations;
CREATE POLICY "Users can insert their own conversations" ON public.chatbot_conversations FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.chatbot_conversations;
CREATE POLICY "Users can update their own conversations" ON public.chatbot_conversations FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.chatbot_conversations;
CREATE POLICY "Users can delete their own conversations" ON public.chatbot_conversations FOR DELETE USING ((SELECT auth.uid()) = user_id);

CREATE TABLE IF NOT EXISTS public.chatbot_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'support')),
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conversation_id ON public.chatbot_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_user_id ON public.chatbot_messages(user_id);

ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own chat messages" ON public.chatbot_messages;
CREATE POLICY "Users can view their own chat messages" ON public.chatbot_messages FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can insert their own chat messages" ON public.chatbot_messages;
CREATE POLICY "Users can insert their own chat messages" ON public.chatbot_messages FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON public.chatbot_messages;
CREATE POLICY "Users can delete their own chat messages" ON public.chatbot_messages FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Chatbot functions
CREATE OR REPLACE FUNCTION get_chatbot_conversations(p_user_id UUID)
RETURNS TABLE (id UUID, title TEXT, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, message_count BIGINT, last_message TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT auth.uid()) != p_user_id THEN RAISE EXCEPTION 'Unauthorized access to conversations'; END IF;
  RETURN QUERY SELECT c.id, c.title, c.created_at, c.updated_at, COUNT(m.id) as message_count, (SELECT cm.message_text FROM public.chatbot_messages cm WHERE cm.conversation_id = c.id ORDER BY cm.created_at DESC LIMIT 1) as last_message FROM public.chatbot_conversations c LEFT JOIN public.chatbot_messages m ON m.conversation_id = c.id WHERE c.user_id = p_user_id GROUP BY c.id ORDER BY c.updated_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION get_conversation_messages(p_user_id UUID, p_conversation_id UUID, p_limit INT DEFAULT 100)
RETURNS TABLE (id UUID, message_text TEXT, sender TEXT, metadata JSONB, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT auth.uid()) != p_user_id THEN RAISE EXCEPTION 'Unauthorized access to conversation messages'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.chatbot_conversations c WHERE c.id = p_conversation_id AND c.user_id = p_user_id) THEN RAISE EXCEPTION 'Conversation not found'; END IF;
  RETURN QUERY SELECT msg.id, msg.message_text, msg.sender, msg.metadata, msg.created_at FROM public.chatbot_messages msg WHERE msg.conversation_id = p_conversation_id ORDER BY msg.created_at ASC LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION save_chatbot_message(p_user_id UUID, p_conversation_id UUID, p_message_text TEXT, p_sender TEXT, p_metadata JSONB DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_message_id UUID;
BEGIN
  IF (SELECT auth.uid()) != p_user_id THEN RAISE EXCEPTION 'Unauthorized: Cannot save message for another user'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.chatbot_conversations WHERE id = p_conversation_id AND user_id = p_user_id) THEN RAISE EXCEPTION 'Conversation not found'; END IF;
  IF p_sender NOT IN ('user', 'support') THEN RAISE EXCEPTION 'Invalid sender type'; END IF;
  INSERT INTO public.chatbot_messages (conversation_id, user_id, message_text, sender, metadata) VALUES (p_conversation_id, p_user_id, p_message_text, p_sender, p_metadata) RETURNING id INTO v_message_id;
  UPDATE public.chatbot_conversations SET updated_at = NOW() WHERE id = p_conversation_id;
  IF p_sender = 'user' THEN UPDATE public.chatbot_conversations SET title = LEFT(p_message_text, 50) WHERE id = p_conversation_id AND title = 'New Chat' AND NOT EXISTS (SELECT 1 FROM public.chatbot_messages WHERE conversation_id = p_conversation_id AND sender = 'user' AND id != v_message_id); END IF;
  RETURN v_message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_chatbot_conversations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_messages(UUID, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION save_chatbot_message(UUID, UUID, TEXT, TEXT, JSONB) TO authenticated;

-- ============================================================================
-- SECTION 15: VERIFICATION CODES TABLE
-- ============================================================================
-- Source: verification_codes.sql

CREATE TABLE IF NOT EXISTS public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'email_2fa',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON public.verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON public.verification_codes(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_unused_code ON public.verification_codes(code, user_id) WHERE used_at IS NULL;

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own verification codes" ON public.verification_codes;
CREATE POLICY "Users can view own verification codes" ON public.verification_codes FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Service can insert verification codes" ON public.verification_codes;
CREATE POLICY "Service can insert verification codes" ON public.verification_codes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Users can update own verification codes" ON public.verification_codes;
CREATE POLICY "Users can update own verification codes" ON public.verification_codes FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN DELETE FROM public.verification_codes WHERE expires_at < now() OR used_at IS NOT NULL; END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_verification_codes() TO authenticated;

-- ============================================================================
-- SECTION 16: ADMIN AUDIT LOGS TABLE
-- ============================================================================
-- Source: admin_audit_logs.sql

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id UUID,
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id ON public.admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON public.admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs
  FOR INSERT WITH CHECK (public.is_admin());

-- ============================================================================
-- SECTION 17: ACCOUNT SOFT DELETE SYSTEM
-- ============================================================================
-- Source: account_soft_delete.sql

CREATE TABLE IF NOT EXISTS public.deleted_accounts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT,
  user_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('soft_delete', 'restore', 'permanent_delete', 'flag', 'unflag', 'auto_purge')),
  action_by UUID REFERENCES auth.users(id),
  action_by_role TEXT,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deleted_accounts_log_user_id ON public.deleted_accounts_log(user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_log_action ON public.deleted_accounts_log(action);

ALTER TABLE public.deleted_accounts_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view deleted accounts log" ON public.deleted_accounts_log;
CREATE POLICY "Admins can view deleted accounts log" ON public.deleted_accounts_log
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert deleted accounts log" ON public.deleted_accounts_log;
CREATE POLICY "Admins can insert deleted accounts log" ON public.deleted_accounts_log
  FOR INSERT WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.is_account_deleted(user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id AND deleted_at IS NOT NULL); END;
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_account(target_user_id UUID, reason TEXT DEFAULT NULL, retention_days INTEGER DEFAULT 30)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT; v_name TEXT;
BEGIN
  SELECT email, full_name INTO v_email, v_name FROM public.profiles WHERE id = target_user_id;
  UPDATE public.profiles SET deleted_at = NOW(), deletion_reason = reason, scheduled_purge_at = NOW() + (retention_days || ' days')::INTERVAL, status = 'deleted' WHERE id = target_user_id AND deleted_at IS NULL;
  INSERT INTO public.deleted_accounts_log (user_id, user_email, user_name, action, action_by, reason) VALUES (target_user_id, v_email, v_name, 'soft_delete', target_user_id, reason);
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE VIEW public.deleted_accounts_view WITH (security_invoker = true) AS
SELECT p.id, p.email, p.full_name, p.avatar_url, p.deleted_at, p.deletion_reason, p.deletion_flagged, p.deletion_flagged_by, p.deletion_flag_reason, p.scheduled_purge_at, p.created_at as account_created_at,
  CASE WHEN p.deletion_flagged THEN NULL ELSE EXTRACT(DAY FROM (p.scheduled_purge_at - NOW()))::INTEGER END as days_until_purge,
  flagger.full_name as flagged_by_name, flagger.email as flagged_by_email
FROM public.profiles p LEFT JOIN public.profiles flagger ON flagger.id = p.deletion_flagged_by WHERE p.deleted_at IS NOT NULL;

GRANT SELECT ON public.deleted_accounts_view TO authenticated;

-- ============================================================================
-- SECTION 18: TRANSACTIONS TABLE
-- ============================================================================
-- Source: 20251225000000_create_transactions_table.sql

DO $$ BEGIN CREATE TYPE transaction_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE transaction_type AS ENUM ('TICKET', 'MERCH', 'VOTE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  event_id uuid,
  organizer_id uuid,
  type transaction_type not null,
  amount numeric not null,
  currency text default 'GHS',
  status transaction_status default 'PENDING',
  hubtel_checkout_id text,
  client_reference text unique not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- SECTION 19: PAYOUT TABLES
-- ============================================================================
-- Source: 20251225000001_create_payout_tables.sql

CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references organizers(id) on delete cascade,
  method_type text not null check (method_type in ('bank_account', 'mobile_money')),
  provider text,
  account_number text not null,
  account_name text not null,
  bank_name text,
  is_default boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS payout_requests (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references organizers(id) on delete cascade,
  payment_method_id uuid references payment_methods(id),
  amount numeric not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  requested_at timestamp with time zone default now(),
  processed_at timestamp with time zone,
  hubtel_reference text,
  failure_reason text,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Organizers can manage own payment methods" ON payment_methods;
CREATE POLICY "Organizers can manage own payment methods" ON payment_methods FOR ALL USING (organizer_id in (select id from organizers where user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "Organizers can view own payout requests" ON payout_requests;
CREATE POLICY "Organizers can view own payout requests" ON payout_requests FOR SELECT USING (organizer_id in (select id from organizers where user_id = (SELECT auth.uid())));
DROP POLICY IF EXISTS "Organizers can create payout requests" ON payout_requests;
CREATE POLICY "Organizers can create payout requests" ON payout_requests FOR INSERT WITH CHECK (organizer_id in (select id from organizers where user_id = (SELECT auth.uid())));

CREATE INDEX IF NOT EXISTS idx_payment_methods_organizer ON payment_methods(organizer_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_organizer ON payout_requests(organizer_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_transactions_organizer ON transactions(organizer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- ============================================================================
-- SECTION 20: PLATFORM MERCH STORE
-- ============================================================================
-- Source: platform_merch_store.sql

CREATE TABLE IF NOT EXISTS public.merch_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_merch_categories_active ON public.merch_categories(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_merch_categories_slug ON public.merch_categories(slug);

ALTER TABLE public.merch_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active categories" ON public.merch_categories;
CREATE POLICY "Anyone can view active categories" ON public.merch_categories
  FOR SELECT
  USING (active = TRUE);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.merch_categories;
CREATE POLICY "Admins can manage categories" ON public.merch_categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (SELECT auth.uid())
      AND role IN ('admin', 'super_admin')
      AND revoked_at IS NULL
    )
  );

CREATE TABLE IF NOT EXISTS public.merch_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  organizer_id UUID REFERENCES organizers(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  currency VARCHAR(3) DEFAULT 'GHS',
  stock_quantity INTEGER DEFAULT 0,
  category VARCHAR(100),
  images TEXT[],
  variants JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.merch_products
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.merch_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_merch_products_event_id ON public.merch_products(event_id);
CREATE INDEX IF NOT EXISTS idx_merch_products_organizer_id ON public.merch_products(organizer_id);
CREATE INDEX IF NOT EXISTS idx_merch_products_active ON public.merch_products(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_merch_products_category ON public.merch_products(category_id);

ALTER TABLE public.merch_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for merch_products (FULLY CONSOLIDATED)
DROP POLICY IF EXISTS "Anyone can view active merch" ON public.merch_products;
DROP POLICY IF EXISTS "Organizers can manage own merch" ON public.merch_products;
DROP POLICY IF EXISTS "merch_products_select_policy" ON public.merch_products;
DROP POLICY IF EXISTS "merch_products_insert_policy" ON public.merch_products;
DROP POLICY IF EXISTS "merch_products_update_policy" ON public.merch_products;
DROP POLICY IF EXISTS "merch_products_delete_policy" ON public.merch_products;

-- Consolidated SELECT: active merch OR organizer's own merch
CREATE POLICY "merch_products_select_policy" ON public.merch_products
  FOR SELECT
  USING (
    is_active = TRUE
    OR organizer_id IN (SELECT id FROM organizers WHERE user_id = (SELECT auth.uid()))
  );

-- INSERT: organizers own
CREATE POLICY "merch_products_insert_policy" ON public.merch_products
  FOR INSERT
  WITH CHECK (
    organizer_id IN (SELECT id FROM organizers WHERE user_id = (SELECT auth.uid()))
  );

-- UPDATE: organizers own
CREATE POLICY "merch_products_update_policy" ON public.merch_products
  FOR UPDATE
  USING (
    organizer_id IN (SELECT id FROM organizers WHERE user_id = (SELECT auth.uid()))
  );

-- DELETE: organizers own
CREATE POLICY "merch_products_delete_policy" ON public.merch_products
  FOR DELETE
  USING (
    organizer_id IN (SELECT id FROM organizers WHERE user_id = (SELECT auth.uid()))
  );

-- ============================================================================
-- SECTION 21: CART ITEMS TABLE
-- ============================================================================
-- Source: cart_items.sql (Merged with E-commerce cart)

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT,
  product_price DECIMAL(10, 2),
  product_image TEXT,
  product_quantity INTEGER,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  variant_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, event_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_event_id ON public.cart_items(event_id);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own cart" ON public.cart_items;
CREATE POLICY "Users can manage own cart" ON public.cart_items FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- SECTION 22: ORDERS TABLE
-- ============================================================================
-- Source: create_orders.sql

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organizer_id UUID REFERENCES organizers(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GHS',
  items JSONB NOT NULL DEFAULT '[]',
  shipping_address JSONB,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_organizer_id ON public.orders(organizer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders (FULLY CONSOLIDATED)
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Organizers can view orders for their events" ON public.orders;
DROP POLICY IF EXISTS "orders_select_policy" ON public.orders;
DROP POLICY IF EXISTS "orders_insert_policy" ON public.orders;

-- Consolidated SELECT: own orders OR organizer's event orders
CREATE POLICY "orders_select_policy" ON public.orders
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR organizer_id IN (SELECT id FROM organizers WHERE user_id = (SELECT auth.uid()))
  );

-- INSERT: users own
CREATE POLICY "orders_insert_policy" ON public.orders
  FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10, 2) NOT NULL,
  product_image TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;
CREATE POLICY "Users can insert own order items" ON public.order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- SECTION 23: POLICY SYSTEM (CONTENT MODERATION)
-- ============================================================================
-- Source: policy_system.sql

DROP TABLE IF EXISTS content_similarity CASCADE;
DROP TABLE IF EXISTS user_offense_history CASCADE;
DROP TABLE IF EXISTS user_offenses CASCADE;
DROP TABLE IF EXISTS flagged_items CASCADE;
DROP TABLE IF EXISTS policy_rules CASCADE;
DROP FUNCTION IF EXISTS check_content_policy(TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE TABLE policy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('content', 'spam', 'inappropriate', 'fraud', 'safety')),
  keywords TEXT[] NOT NULL DEFAULT '{}',
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  auto_action VARCHAR(20) NOT NULL DEFAULT 'flag' CHECK (auto_action IN ('flag', 'hide', 'remove')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_policy_rules_active ON policy_rules(is_active);
CREATE INDEX idx_policy_rules_type ON policy_rules(rule_type);

INSERT INTO policy_rules (name, description, rule_type, keywords, severity, auto_action, is_active) VALUES 
  ('Inappropriate Content', 'Content contains inappropriate language, profanity, or explicit material.', 'inappropriate',
   ARRAY['fuck', 'shit', 'damn', 'sexual', 'nude', 'porn', 'xxx', 'bitch', 'asshole', 'slut', 'whore', 'cunt', 'dick', 'nsfw', 'hardcore', 'erotic', 'explicit'], 'high', 'flag', true),
  ('Spam Detection', 'Content appears to be spam or unsolicited promotion.', 'spam',
   ARRAY['buy now', 'click here', 'limited time', 'act fast', 'guaranteed', 'free money', 'subscribe', 'discount code', 'earn cash', 'win big'], 'medium', 'flag', true),
  ('Potential Fraud', 'Content may contain fraudulent or deceptive claims.', 'fraud',
   ARRAY['get rich quick', 'make money fast', 'guaranteed returns', 'no risk', 'secret method', 'double your money', 'investment scheme'], 'critical', 'flag', true),
  ('Safety Concerns', 'Content may pose safety risks or encourage harmful behavior.', 'safety',
   ARRAY['dangerous', 'unsafe', 'no safety measures', 'risk of injury', 'hazardous', 'toxic', 'flammable', 'explosive'], 'high', 'flag', true)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE flagged_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('event', 'venue')),
  item_id UUID NOT NULL,
  policy_violation VARCHAR(500) NOT NULL,
  violation_details TEXT,
  flagged_at TIMESTAMPTZ DEFAULT NOW(),
  flagged_by VARCHAR(50) NOT NULL,
  reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (resolution IN ('pending', 'unflagged', 'removed', 'warning_issued')),
  admin_notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  auto_generated BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_flagged_items_type ON flagged_items(item_type);
CREATE INDEX idx_flagged_items_item_id ON flagged_items(item_id);
CREATE INDEX idx_flagged_items_reviewed ON flagged_items(reviewed);
CREATE INDEX idx_flagged_items_resolution ON flagged_items(resolution);

CREATE TABLE user_offenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offense_type VARCHAR(50) NOT NULL CHECK (offense_type IN ('inappropriate', 'spam', 'fraud', 'safety', 'content')),
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('event', 'venue')),
  content_id UUID NOT NULL,
  content_hash TEXT,
  original_content TEXT,
  violation_details TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  flagged_item_id UUID REFERENCES flagged_items(id) ON DELETE SET NULL,
  first_offense_date TIMESTAMPTZ DEFAULT NOW(),
  latest_offense_date TIMESTAMPTZ DEFAULT NOW(),
  offense_count INTEGER DEFAULT 1 CHECK (offense_count >= 1),
  escalation_level INTEGER DEFAULT 1 CHECK (escalation_level >= 1 AND escalation_level <= 4),
  current_restriction_type VARCHAR(50) CHECK (current_restriction_type IN ('content_creation', 'platform_access', 'publishing', NULL)),
  restriction_start_date TIMESTAMPTZ,
  restriction_end_date TIMESTAMPTZ,
  is_restricted BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_offenses_user_id ON user_offenses(user_id);
CREATE INDEX idx_user_offenses_severity ON user_offenses(severity);

CREATE TABLE user_offense_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_offense_id UUID NOT NULL REFERENCES user_offenses(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('warning_issued', 'content_flagged', 'restriction_applied', 'restriction_lifted', 'escalation', 'admin_review')),
  action_description TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE content_similarity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_offense_id UUID NOT NULL REFERENCES user_offenses(id) ON DELETE CASCADE,
  new_content_hash TEXT NOT NULL,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('event', 'venue')),
  new_content_id UUID,
  similarity_score NUMERIC(5,2) CHECK (similarity_score >= 0 AND similarity_score <= 100),
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  is_blocked BOOLEAN DEFAULT FALSE
);

ALTER TABLE policy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE flagged_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_offenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_offense_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_similarity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for policy_rules (FULLY CONSOLIDATED)
DROP POLICY IF EXISTS "Admins can manage policy rules" ON policy_rules;
DROP POLICY IF EXISTS "Anyone can view active policy rules" ON policy_rules;
DROP POLICY IF EXISTS "policy_rules_select_policy" ON policy_rules;
DROP POLICY IF EXISTS "policy_rules_insert_policy" ON policy_rules;
DROP POLICY IF EXISTS "policy_rules_update_policy" ON policy_rules;
DROP POLICY IF EXISTS "policy_rules_delete_policy" ON policy_rules;

-- Consolidated SELECT: active rules OR admin
CREATE POLICY "policy_rules_select_policy" ON policy_rules
  FOR SELECT
  USING (
    is_active = TRUE
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin') AND revoked_at IS NULL)
  );

CREATE POLICY "policy_rules_insert_policy" ON policy_rules
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin') AND revoked_at IS NULL));

CREATE POLICY "policy_rules_update_policy" ON policy_rules
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin') AND revoked_at IS NULL));

CREATE POLICY "policy_rules_delete_policy" ON policy_rules
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin') AND revoked_at IS NULL));

-- RLS Policies for flagged_items (admin only)
DROP POLICY IF EXISTS "Admins can manage flagged items" ON flagged_items;
DROP POLICY IF EXISTS "flagged_items_all_policy" ON flagged_items;
CREATE POLICY "flagged_items_all_policy" ON flagged_items FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin', 'support_agent') AND revoked_at IS NULL));

-- RLS Policies for user_offenses (FULLY CONSOLIDATED)
DROP POLICY IF EXISTS "Admins can manage user offenses" ON user_offenses;
DROP POLICY IF EXISTS "Users can view own offenses" ON user_offenses;
DROP POLICY IF EXISTS "user_offenses_select_policy" ON user_offenses;
DROP POLICY IF EXISTS "user_offenses_insert_policy" ON user_offenses;
DROP POLICY IF EXISTS "user_offenses_update_policy" ON user_offenses;
DROP POLICY IF EXISTS "user_offenses_delete_policy" ON user_offenses;

-- Consolidated SELECT: own offenses OR admin
CREATE POLICY "user_offenses_select_policy" ON user_offenses
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin', 'support_agent') AND revoked_at IS NULL)
  );

CREATE POLICY "user_offenses_insert_policy" ON user_offenses
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin', 'support_agent') AND revoked_at IS NULL));

CREATE POLICY "user_offenses_update_policy" ON user_offenses
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin', 'support_agent') AND revoked_at IS NULL));

CREATE POLICY "user_offenses_delete_policy" ON user_offenses
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin', 'support_agent') AND revoked_at IS NULL));

-- RLS Policies for user_offense_history (FULLY CONSOLIDATED)
DROP POLICY IF EXISTS "Admins can manage offense history" ON user_offense_history;
DROP POLICY IF EXISTS "Users can view own offense history" ON user_offense_history;
DROP POLICY IF EXISTS "user_offense_history_select_policy" ON user_offense_history;
DROP POLICY IF EXISTS "user_offense_history_insert_policy" ON user_offense_history;
DROP POLICY IF EXISTS "user_offense_history_update_policy" ON user_offense_history;
DROP POLICY IF EXISTS "user_offense_history_delete_policy" ON user_offense_history;

-- Consolidated SELECT: own history OR admin
CREATE POLICY "user_offense_history_select_policy" ON user_offense_history
  FOR SELECT
  USING (
    user_offense_id IN (SELECT id FROM user_offenses WHERE user_id = (SELECT auth.uid()))
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin', 'support_agent') AND revoked_at IS NULL)
  );

CREATE POLICY "user_offense_history_insert_policy" ON user_offense_history
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin', 'support_agent') AND revoked_at IS NULL));

CREATE POLICY "user_offense_history_update_policy" ON user_offense_history
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin', 'support_agent') AND revoked_at IS NULL));

CREATE POLICY "user_offense_history_delete_policy" ON user_offense_history
  FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin', 'support_agent') AND revoked_at IS NULL));

-- RLS Policies for content_similarity (admin only)
DROP POLICY IF EXISTS "Admins can manage content similarity" ON content_similarity;
DROP POLICY IF EXISTS "content_similarity_all_policy" ON content_similarity;
CREATE POLICY "content_similarity_all_policy" ON content_similarity FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin', 'support_agent') AND revoked_at IS NULL));

-- ============================================================================
-- SECTION 24: SECURITY SETTINGS
-- ============================================================================
-- Source: security_settings.sql

CREATE TABLE IF NOT EXISTS public.security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  two_factor_enabled boolean DEFAULT false NOT NULL,
  two_factor_method text CHECK (two_factor_method IN ('sms', 'email', 'authenticator', 'totp', NULL)),
  two_factor_methods text[] DEFAULT ARRAY[]::text[],
  two_factor_phone text,
  two_factor_backup_codes text[],
  login_notifications boolean DEFAULT true NOT NULL,
  password_last_changed timestamptz DEFAULT NOW() NOT NULL,
  trusted_devices jsonb DEFAULT '[]'::jsonb NOT NULL,
  active_sessions jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_at timestamptz DEFAULT NOW() NOT NULL,
  updated_at timestamptz DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_user_security_settings UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_security_settings_user_id ON public.security_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_security_settings_2fa_enabled ON public.security_settings(two_factor_enabled) WHERE two_factor_enabled = true;
CREATE INDEX IF NOT EXISTS idx_security_settings_2fa_methods ON public.security_settings USING GIN (two_factor_methods);

ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_settings (FULLY CONSOLIDATED)
DROP POLICY IF EXISTS "Users can view their own security settings" ON public.security_settings;
DROP POLICY IF EXISTS "Users can insert their own security settings" ON public.security_settings;
DROP POLICY IF EXISTS "Users can update their own security settings" ON public.security_settings;
DROP POLICY IF EXISTS "Admins can view all security settings" ON public.security_settings;
DROP POLICY IF EXISTS "security_settings_select_policy" ON public.security_settings;
DROP POLICY IF EXISTS "security_settings_insert_policy" ON public.security_settings;
DROP POLICY IF EXISTS "security_settings_update_policy" ON public.security_settings;

-- Consolidated SELECT: own settings OR admin
CREATE POLICY "security_settings_select_policy" ON public.security_settings
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_admin()
  );

-- INSERT: own settings only
CREATE POLICY "security_settings_insert_policy" ON public.security_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- UPDATE: own settings only
CREATE POLICY "security_settings_update_policy" ON public.security_settings
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.update_security_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS security_settings_updated_at_trigger ON public.security_settings;
CREATE TRIGGER security_settings_updated_at_trigger BEFORE UPDATE ON public.security_settings FOR EACH ROW EXECUTE FUNCTION public.update_security_settings_updated_at();

CREATE OR REPLACE FUNCTION public.create_security_settings_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    INSERT INTO public.security_settings (user_id, two_factor_enabled, two_factor_method, login_notifications, password_last_changed) VALUES (NEW.id, false, NULL, true, NOW()) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Error creating security settings for user %: %', NEW.id, SQLERRM; RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_create_security_settings ON auth.users;
CREATE TRIGGER on_auth_user_create_security_settings AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_security_settings_on_signup();

-- Migrate existing users
INSERT INTO public.security_settings (user_id, two_factor_enabled, login_notifications, password_last_changed)
SELECT id, false, true, created_at FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.security_settings) AND email_confirmed_at IS NOT NULL ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_or_create_security_settings(p_user_id uuid)
RETURNS TABLE (id uuid, user_id uuid, two_factor_enabled boolean, two_factor_method text, two_factor_phone text, login_notifications boolean, password_last_changed timestamptz, trusted_devices jsonb, active_sessions jsonb, created_at timestamptz, updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY SELECT ss.id, ss.user_id, ss.two_factor_enabled, ss.two_factor_method, ss.two_factor_phone, ss.login_notifications, ss.password_last_changed, ss.trusted_devices, ss.active_sessions, ss.created_at, ss.updated_at FROM public.security_settings ss WHERE ss.user_id = p_user_id;
  IF NOT FOUND THEN INSERT INTO public.security_settings (user_id, two_factor_enabled, login_notifications, password_last_changed) VALUES (p_user_id, false, true, NOW()) RETURNING *; END IF;
END;
$$;

COMMENT ON TABLE public.security_settings IS 'Stores user security settings including 2FA, login notifications, and session management';

-- ============================================================================
-- SECTION 25: UNIFIED SETTINGS CORE TABLES
-- ============================================================================
-- Source: unified_settings_schema.sql (canonicalized subset)

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  display_name TEXT,
  email TEXT,
  phone_number TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  website_url TEXT,
  country TEXT DEFAULT 'Ghana',
  city TEXT,
  address TEXT,
  social_links JSONB DEFAULT '[]'::jsonb,
  timezone TEXT DEFAULT 'GMT',
  language TEXT DEFAULT 'en',
  date_format TEXT DEFAULT 'DD/MM/YYYY',
  time_format TEXT DEFAULT '24h',
  currency TEXT DEFAULT 'GHS',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_profiles_user_id_unique UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.organization_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  organization_type TEXT,
  business_registration_number TEXT,
  tax_id TEXT,
  business_email TEXT,
  business_phone TEXT,
  business_address TEXT,
  business_website TEXT,
  description TEXT,
  services_offered TEXT[],
  specialties TEXT[],
  social_links JSONB DEFAULT '[]'::jsonb,
  is_verified BOOLEAN DEFAULT FALSE,
  verification_documents JSONB DEFAULT '{}'::jsonb,
  verified_at TIMESTAMPTZ,
  verified_by UUID,
  applicable_roles TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT org_profiles_user_id_unique UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_method TEXT,
  two_factor_phone TEXT,
  login_notifications BOOLEAN DEFAULT TRUE,
  password_last_changed TIMESTAMPTZ DEFAULT NOW(),
  email_notifications JSONB DEFAULT '{}'::jsonb,
  push_notifications JSONB DEFAULT '{}'::jsonb,
  sms_notifications JSONB DEFAULT '{}'::jsonb,
  profile_visibility TEXT DEFAULT 'public',
  show_email BOOLEAN DEFAULT FALSE,
  show_phone BOOLEAN DEFAULT FALSE,
  allow_direct_messages BOOLEAN DEFAULT TRUE,
  data_sharing_consent BOOLEAN DEFAULT FALSE,
  analytics_opt_out BOOLEAN DEFAULT FALSE,
  marketing_opt_out BOOLEAN DEFAULT FALSE,
  theme TEXT DEFAULT 'system',
  email_digest_frequency TEXT DEFAULT 'weekly',
  auto_save_drafts BOOLEAN DEFAULT TRUE,
  default_event_visibility TEXT DEFAULT 'public',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_settings_user_id_unique UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.role_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL,
  settings_data JSONB DEFAULT '{}'::jsonb,
  permissions JSONB DEFAULT '{}'::jsonb,
  defaults JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT role_settings_user_role_unique UNIQUE(user_id, role_type)
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organization_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_email TEXT NOT NULL,
  invited_name TEXT,
  invitation_token TEXT UNIQUE,
  invitation_expires_at TIMESTAMPTZ,
  role_type TEXT NOT NULL,
  permissions JSONB DEFAULT '{}'::jsonb,
  applicable_business_roles TEXT[],
  status TEXT DEFAULT 'invited',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.settings_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID,
  action_type TEXT NOT NULL,
  changed_by_role TEXT,
  affected_roles TEXT[],
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  device_type TEXT,
  device_fingerprint TEXT UNIQUE NOT NULL,
  trusted_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  location_city TEXT,
  location_country TEXT,
  ip_address INET,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_org_profiles_user_id ON public.organization_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_role_settings_user_role ON public.role_settings(user_id, role_type);
CREATE INDEX IF NOT EXISTS idx_team_members_org_id ON public.team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_settings_audit_created ON public.settings_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON public.trusted_devices(user_id);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own profile" ON public.user_profiles;
CREATE POLICY "Users can manage their own profile" ON public.user_profiles FOR ALL USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can manage their own organization" ON public.organization_profiles;
CREATE POLICY "Users can manage their own organization" ON public.organization_profiles FOR ALL USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
CREATE POLICY "Users can manage their own settings" ON public.user_settings FOR ALL USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can manage their role settings" ON public.role_settings;
CREATE POLICY "Users can manage their role settings" ON public.role_settings FOR ALL USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.settings_audit_log;
CREATE POLICY "Users can view their own audit logs" ON public.settings_audit_log FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can manage their trusted devices" ON public.trusted_devices;
CREATE POLICY "Users can manage their trusted devices" ON public.trusted_devices FOR ALL USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- SECTION 26: GRANTS AND PERMISSIONS
-- ============================================================================

GRANT SELECT ON events TO authenticated;
GRANT SELECT ON events TO anon;

-- ============================================================================
-- SECTION 27: STORAGE BUCKETS
-- ============================================================================
-- Source: storage_buckets.sql
-- All buckets support the same common image formats for consistency.

-- Standardized mime types for all buckets
-- Supports: JPEG, PNG, WebP, AVIF, GIF, SVG, HEIC, HEIF, BMP, TIFF

-- Create role-requests bucket (for ID documents and selfies)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('role-requests', 'role-requests', false, 5242880, 
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880, 
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff'];

-- Create user-avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-avatars', 'user-avatars', true, 5242880, 
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880, 
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff'];

-- Create admin-avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('admin-avatars', 'admin-avatars', false, 5242880, 
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880, 
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff'];

-- Create events bucket (same limit as all other buckets)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('events', 'events', true, 5242880, 
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880, 
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff'];

-- Create organizer-media bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('organizer-media', 'organizer-media', true, 5242880, 
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880, 
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff'];

-- Create merch bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('merch', 'merch', true, 5242880, 
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880, 
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff'];

-- Create venues bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('venues', 'venues', true, 5242880, 
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880, 
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/svg+xml', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff'];

-- Storage Policies: role-requests bucket
DROP POLICY IF EXISTS "Users can upload role request documents" ON storage.objects;
CREATE POLICY "Users can upload role request documents" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'role-requests' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1]);

DROP POLICY IF EXISTS "Users can view their own role request documents" ON storage.objects;
CREATE POLICY "Users can view their own role request documents" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'role-requests' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1]);

DROP POLICY IF EXISTS "Admins can view all role request documents" ON storage.objects;
CREATE POLICY "Admins can view all role request documents" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'role-requests' AND (
  public.is_admin() 
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'support_agent' AND revoked_at IS NULL)
));

DROP POLICY IF EXISTS "Users can delete their own role request documents" ON storage.objects;
CREATE POLICY "Users can delete their own role request documents" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'role-requests' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1]);

-- Storage Policies: user-avatars bucket
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'user-avatars' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1]);

DROP POLICY IF EXISTS "Users can view their own avatar" ON storage.objects;
CREATE POLICY "Users can view their own avatar" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'user-avatars' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1]);

DROP POLICY IF EXISTS "Anyone can view user avatars" ON storage.objects;
CREATE POLICY "Anyone can view user avatars" ON storage.objects FOR SELECT TO public USING (bucket_id = 'user-avatars');

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'user-avatars' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1])
WITH CHECK (bucket_id = 'user-avatars' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1]);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'user-avatars' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1]);

-- Storage Policies: admin-avatars bucket
DROP POLICY IF EXISTS "Admins can upload their avatar" ON storage.objects;
CREATE POLICY "Admins can upload their avatar" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'admin-avatars' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1] AND (
  public.is_admin() 
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'support_agent' AND revoked_at IS NULL)
));

DROP POLICY IF EXISTS "Admins can view their avatar" ON storage.objects;
CREATE POLICY "Admins can view their avatar" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'admin-avatars' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1] AND (
  public.is_admin() 
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'support_agent' AND revoked_at IS NULL)
));

DROP POLICY IF EXISTS "Super admins can view all admin avatars" ON storage.objects;
CREATE POLICY "Super admins can view all admin avatars" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'admin-avatars' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update their avatar" ON storage.objects;
CREATE POLICY "Admins can update their avatar" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'admin-avatars' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1] AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin', 'support_agent') AND revoked_at IS NULL))
WITH CHECK (bucket_id = 'admin-avatars' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1] AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin', 'support_agent') AND revoked_at IS NULL));

DROP POLICY IF EXISTS "Admins can delete their avatar" ON storage.objects;
CREATE POLICY "Admins can delete their avatar" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'admin-avatars' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1] AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role IN ('admin', 'super_admin', 'support_agent') AND revoked_at IS NULL));

-- Storage Policies: events bucket
DROP POLICY IF EXISTS "Organizers can upload event images" ON storage.objects;
CREATE POLICY "Organizers can upload event images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'events' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[2] AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'organizer' AND revoked_at IS NULL));

DROP POLICY IF EXISTS "Anyone can view event images" ON storage.objects;
CREATE POLICY "Anyone can view event images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'events');

DROP POLICY IF EXISTS "Organizers can update own event images" ON storage.objects;
CREATE POLICY "Organizers can update own event images" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'events' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[2] AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'organizer' AND revoked_at IS NULL))
WITH CHECK (bucket_id = 'events' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[2]);

DROP POLICY IF EXISTS "Organizers can delete own event images" ON storage.objects;
CREATE POLICY "Organizers can delete own event images" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'events' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[2] AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'organizer' AND revoked_at IS NULL));

DROP POLICY IF EXISTS "Admins have full access to event images" ON storage.objects;
CREATE POLICY "Admins have full access to event images" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'events' AND (
  public.is_admin() 
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'support_agent' AND revoked_at IS NULL)
));

-- Storage Policies: organizer-media bucket
DROP POLICY IF EXISTS "Anyone can view organizer media" ON storage.objects;
CREATE POLICY "Anyone can view organizer media" ON storage.objects FOR SELECT TO public USING (bucket_id = 'organizer-media');

DROP POLICY IF EXISTS "Organizers can upload their media" ON storage.objects;
CREATE POLICY "Organizers can upload their media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'organizer-media' AND (name LIKE 'organizer-logos/%' OR name LIKE 'organizer-banners/%') AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'organizer' AND revoked_at IS NULL));

DROP POLICY IF EXISTS "Organizers can update their media" ON storage.objects;
CREATE POLICY "Organizers can update their media" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'organizer-media' AND (name LIKE 'organizer-logos/%' OR name LIKE 'organizer-banners/%') AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'organizer' AND revoked_at IS NULL))
WITH CHECK (bucket_id = 'organizer-media' AND (name LIKE 'organizer-logos/%' OR name LIKE 'organizer-banners/%'));

DROP POLICY IF EXISTS "Organizers can delete their media" ON storage.objects;
CREATE POLICY "Organizers can delete their media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'organizer-media' AND (name LIKE 'organizer-logos/%' OR name LIKE 'organizer-banners/%') AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'organizer' AND revoked_at IS NULL));

DROP POLICY IF EXISTS "Admins have full access to organizer media" ON storage.objects;
CREATE POLICY "Admins have full access to organizer media" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'organizer-media' AND (
  public.is_admin() 
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'support_agent' AND revoked_at IS NULL)
));

-- Storage Policies: merch bucket
DROP POLICY IF EXISTS "Anyone can view merch images" ON storage.objects;
CREATE POLICY "Anyone can view merch images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'merch');

DROP POLICY IF EXISTS "Organizers can upload merch images" ON storage.objects;
CREATE POLICY "Organizers can upload merch images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'merch' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'organizer' AND revoked_at IS NULL));

DROP POLICY IF EXISTS "Organizers can update merch images" ON storage.objects;
CREATE POLICY "Organizers can update merch images" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'merch' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'organizer' AND revoked_at IS NULL))
WITH CHECK (bucket_id = 'merch' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'organizer' AND revoked_at IS NULL));

DROP POLICY IF EXISTS "Organizers can delete merch images" ON storage.objects;
CREATE POLICY "Organizers can delete merch images" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'merch' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'organizer' AND revoked_at IS NULL));

DROP POLICY IF EXISTS "Admins have full access to merch images" ON storage.objects;
CREATE POLICY "Admins have full access to merch images" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'merch' AND (
  public.is_admin() 
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'support_agent' AND revoked_at IS NULL)
));

-- Storage Policies: venues bucket
DROP POLICY IF EXISTS "Venue owners can upload venue images" ON storage.objects;
CREATE POLICY "Venue owners can upload venue images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'venues' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1] AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'venue_owner' AND revoked_at IS NULL));

DROP POLICY IF EXISTS "Venue owners can view own venue images" ON storage.objects;
CREATE POLICY "Venue owners can view own venue images" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'venues' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1]);

DROP POLICY IF EXISTS "Public can view venue images" ON storage.objects;
CREATE POLICY "Public can view venue images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'venues');

DROP POLICY IF EXISTS "Venue owners can update own venue images" ON storage.objects;
CREATE POLICY "Venue owners can update own venue images" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'venues' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1])
WITH CHECK (bucket_id = 'venues' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1]);

DROP POLICY IF EXISTS "Venue owners can delete own venue images" ON storage.objects;
CREATE POLICY "Venue owners can delete own venue images" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'venues' AND (SELECT auth.uid())::text = (string_to_array(name, '/'))[1]);

DROP POLICY IF EXISTS "Admins have full access to venue images" ON storage.objects;
CREATE POLICY "Admins have full access to venue images" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'venues' AND (
  public.is_admin() 
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = (SELECT auth.uid()) AND role = 'support_agent' AND revoked_at IS NULL)
));

-- ============================================================================
-- SECTION 20: ADMIN AUDIT LOGS
-- ============================================================================
-- Source: admin_audit_logs.sql

-- Drop existing objects if they exist
DROP VIEW IF EXISTS admin_activity_logs_with_user_info CASCADE;
DROP TABLE IF EXISTS admin_audit_logs CASCADE;

-- Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Nullable for failed login attempts
  target_user UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_performed_by ON admin_audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user ON admin_audit_logs(target_user);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);

-- Create view with user information
-- Using SECURITY INVOKER to use querying user's permissions (more secure)
CREATE OR REPLACE VIEW admin_activity_logs_with_user_info
WITH (security_invoker = true)
AS
SELECT 
  aal.id,
  aal.action,
  aal.performed_by,
  aal.target_user,
  aal.details,
  aal.created_at,
  p_performer.full_name AS performer_name,
  p_performer.email AS performer_email,
  p_performer.avatar_url AS performer_avatar,
  p_target.full_name AS target_name,
  p_target.email AS target_email,
  p_target.avatar_url AS target_avatar
FROM admin_audit_logs aal
LEFT JOIN profiles p_performer ON aal.performed_by = p_performer.id
LEFT JOIN profiles p_target ON aal.target_user = p_target.id
ORDER BY aal.created_at DESC;

-- Enable Row Level Security
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can read audit logs
CREATE POLICY "Admins can view audit logs"
  ON admin_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role IN ('super_admin', 'admin', 'support_agent')
        AND user_roles.revoked_at IS NULL
    )
  );

-- Policy: Only admins can insert audit logs (via API/functions)
CREATE POLICY "Admins can insert audit logs"
  ON admin_audit_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = (SELECT auth.uid())
        AND user_roles.role IN ('super_admin', 'admin', 'support_agent')
        AND user_roles.revoked_at IS NULL
    )
  );

-- Policy: Allow anyone to log failed login attempts (security monitoring)
CREATE POLICY "Allow logging failed login attempts"
  ON admin_audit_logs
  FOR INSERT
  WITH CHECK (
    action = 'login_failed'
  );

-- Policy: Allow authenticated users to log their own auto-logout events
CREATE POLICY "Allow logging auto-logout"
  ON admin_audit_logs
  FOR INSERT
  WITH CHECK (
    action = 'auto_logout' AND performed_by = (SELECT auth.uid())
  );

-- Grant permissions
GRANT SELECT ON admin_audit_logs TO authenticated;
GRANT INSERT ON admin_audit_logs TO authenticated;
GRANT SELECT ON admin_activity_logs_with_user_info TO authenticated;

-- Add helpful comment
COMMENT ON TABLE admin_audit_logs IS 'Audit trail for admin actions performed in the system';
COMMENT ON VIEW admin_activity_logs_with_user_info IS 'View combining audit logs with user profile information for easy display';

-- =====================================================
-- LOG ADMIN ACTIVITY FUNCTION
-- =====================================================
-- Function for logging detailed admin activities with metadata
-- This is called by the frontend databaseActivityService.ts

DROP FUNCTION IF EXISTS public.log_admin_activity(
  p_admin_user_id UUID,
  p_admin_user_name TEXT,
  p_admin_user_email TEXT,
  p_admin_user_role TEXT,
  p_action_type TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_target_name TEXT,
  p_target_email TEXT,
  p_status TEXT,
  p_title TEXT,
  p_description TEXT,
  p_details JSONB,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_device_info JSONB,
  p_session_id TEXT,
  p_severity TEXT,
  p_priority INTEGER,
  p_metadata JSONB
) CASCADE;

CREATE OR REPLACE FUNCTION public.log_admin_activity(
  p_admin_user_id UUID DEFAULT NULL,
  p_admin_user_name TEXT DEFAULT NULL,
  p_admin_user_email TEXT DEFAULT NULL,
  p_admin_user_role TEXT DEFAULT NULL,
  p_action_type TEXT DEFAULT NULL,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_target_name TEXT DEFAULT NULL,
  p_target_email TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'success',
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}',
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_info JSONB DEFAULT '{}',
  p_session_id TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'info',
  p_priority INTEGER DEFAULT 0,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_combined_details JSONB;
BEGIN
  -- Combine all metadata into details field
  v_combined_details := jsonb_build_object(
    'admin_user_name', p_admin_user_name,
    'admin_user_email', p_admin_user_email,
    'admin_user_role', p_admin_user_role,
    'action_type', p_action_type,
    'target_type', p_target_type,
    'target_id', p_target_id,
    'target_name', p_target_name,
    'target_email', p_target_email,
    'status', p_status,
    'title', p_title,
    'description', p_description,
    'details', p_details,
    'ip_address', p_ip_address,
    'user_agent', p_user_agent,
    'device_info', p_device_info,
    'session_id', p_session_id,
    'severity', p_severity,
    'priority', p_priority,
    'metadata', p_metadata
  );

  -- Insert into admin_audit_logs
  INSERT INTO admin_audit_logs (
    action,
    performed_by,
    target_user,
    details,
    created_at
  ) VALUES (
    COALESCE(p_action_type, 'unknown_action'),
    p_admin_user_id,
    p_target_id,
    v_combined_details,
    NOW()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the calling operation
  RAISE WARNING 'Failed to log admin activity: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.log_admin_activity TO authenticated;

COMMENT ON FUNCTION public.log_admin_activity IS 'Logs detailed admin activities with full metadata for audit trail';

-- ============================================================================
-- SECTION 27: AUTH HOOKS
-- ============================================================================

-- Trigger function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- Extract metadata
  v_full_name := COALESCE(
    (NEW.raw_user_meta_data->>'full_name'), 
    (NEW.raw_user_meta_data->>'name'), 
    split_part(NEW.email, '@', 1)
  );
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';

  -- Create profile
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_avatar_url,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();

  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================================
-- SECTION 25: ADMIN LOGIN ATTEMPTS
-- ============================================================================
-- Source: admin_login_attempts.sql

CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
    ip_address TEXT PRIMARY KEY,
    attempt_count INTEGER DEFAULT 1,
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny public access" ON public.admin_login_attempts;
CREATE POLICY "Deny public access" ON public.admin_login_attempts
    FOR ALL
    USING (false);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_locked_until 
ON public.admin_login_attempts(locked_until);

CREATE OR REPLACE FUNCTION cleanup_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.admin_login_attempts
    WHERE locked_until IS NULL 
    AND last_attempt_at < NOW() - INTERVAL '1 day';
END;
$$;


-- ============================================================================
-- TABLE: email_reminders (Automation Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.email_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email TEXT NOT NULL,
    reminder_type TEXT NOT NULL, -- 'event_12h', 'event_3h', 'cart_24h'
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(recipient_email, reminder_type, event_id)
);

CREATE INDEX IF NOT EXISTS idx_email_reminders_event_id ON public.email_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_email_reminders_type ON public.email_reminders(reminder_type);

ALTER TABLE public.email_reminders ENABLE ROW LEVEL SECURITY;

-- Only admins should see this table (using is_admin helper function)
DO $$ BEGIN
    CREATE POLICY "Admins can view reminders" ON public.email_reminders 
    FOR SELECT USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- END OF CONSOLIDATED MIGRATION
-- ============================================================================
-- This migration is idempotent and safe to run multiple times.
