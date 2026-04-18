-- =============================================================================
-- UNIFIED MULTI-ROLE SETTINGS DATABASE SCHEMA
-- =============================================================================
-- 
-- This schema supports a unified settings system where users can have multiple
-- roles (user, organizer, venue_owner) with both shared and role-specific settings.
-- 
-- Design Principles:
-- 1. Shared settings (profile, security, privacy) are stored once per user
-- 2. Role-specific settings are stored with role context
-- 3. Dangerous actions (account deletion) affect all roles
-- 4. Settings inheritance: role settings can inherit from base user settings
-- 5. Audit trail for all settings changes across roles
--
-- =============================================================================

-- User Profiles Table (Shared across all roles)
-- This replaces the need for separate profile tables per role
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Personal Information (shared across roles)
    full_name TEXT,
    display_name TEXT,
    email TEXT,
    phone_number TEXT,
    bio TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    website_url TEXT,
    
    -- Location
    country TEXT DEFAULT 'Ghana',
    city TEXT,
    address TEXT,
    
    -- Social Links (JSON array)
    social_links JSONB DEFAULT '[]'::jsonb,
    
    -- Preferences
    timezone TEXT DEFAULT 'GMT',
    language TEXT DEFAULT 'en',
    date_format TEXT DEFAULT 'DD/MM/YYYY',
    time_format TEXT DEFAULT '24h',
    currency TEXT DEFAULT 'GHS',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT user_profiles_user_id_unique UNIQUE(user_id)
);

-- Organization Profiles (For business roles: organizer, venue_owner)
CREATE TABLE IF NOT EXISTS public.organization_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Organization Details
    organization_name TEXT NOT NULL,
    organization_type TEXT, -- 'event_organizer', 'venue_operator', 'both'
    business_registration_number TEXT,
    tax_id TEXT,
    
    -- Contact Information
    business_email TEXT,
    business_phone TEXT,
    business_address TEXT,
    business_website TEXT,
    
    -- Description
    description TEXT,
    services_offered TEXT[],
    specialties TEXT[],
    
    -- Social Media
    social_links JSONB DEFAULT '[]'::jsonb,
    
    -- Verification Status
    is_verified BOOLEAN DEFAULT FALSE,
    verification_documents JSONB DEFAULT '{}'::jsonb,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    
    -- Applicable Roles (which business roles this org profile serves)
    applicable_roles TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT org_profiles_user_id_unique UNIQUE(user_id)
);

-- User Settings (Unified settings across all roles)
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Security Settings
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_method TEXT, -- 'sms', 'email', 'authenticator'
    two_factor_phone TEXT,
    login_notifications BOOLEAN DEFAULT TRUE,
    password_last_changed TIMESTAMPTZ DEFAULT NOW(),
    
    -- Notification Settings (role-aware)
    email_notifications JSONB DEFAULT '{
        "security_alerts": true,
        "account_updates": true,
        "marketing_emails": false,
        "event_updates": true,
        "ticket_sales": true,
        "payout_notifications": true,
        "team_activity": true,
        "venue_bookings": true,
        "booking_reminders": true
    }'::jsonb,
    
    push_notifications JSONB DEFAULT '{
        "urgent_alerts": true,
        "event_reminders": true,
        "ticket_sales": true,
        "team_notifications": true,
        "booking_notifications": true
    }'::jsonb,
    
    sms_notifications JSONB DEFAULT '{
        "enabled": false,
        "phone_number": null,
        "security_alerts": false,
        "urgent_only": true
    }'::jsonb,
    
    -- Privacy Settings
    profile_visibility TEXT DEFAULT 'public', -- 'public', 'limited', 'private'
    show_email BOOLEAN DEFAULT FALSE,
    show_phone BOOLEAN DEFAULT FALSE,
    allow_direct_messages BOOLEAN DEFAULT TRUE,
    data_sharing_consent BOOLEAN DEFAULT FALSE,
    analytics_opt_out BOOLEAN DEFAULT FALSE,
    marketing_opt_out BOOLEAN DEFAULT FALSE,
    
    -- Preferences
    theme TEXT DEFAULT 'system', -- 'light', 'dark', 'system'
    email_digest_frequency TEXT DEFAULT 'weekly', -- 'daily', 'weekly', 'monthly', 'never'
    auto_save_drafts BOOLEAN DEFAULT TRUE,
    default_event_visibility TEXT DEFAULT 'public',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT user_settings_user_id_unique UNIQUE(user_id)
);

-- Role-Specific Settings (For specialized role configurations)
CREATE TABLE IF NOT EXISTS public.role_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL, -- 'organizer', 'venue_owner'
    
    -- Role-specific configuration
    settings_data JSONB DEFAULT '{}'::jsonb,
    
    -- Examples of role-specific settings:
    -- For organizers: default_ticket_settings, event_templates, team_permissions
    -- For venue_owners: default_booking_rules, availability_settings, pricing_templates
    
    -- Permissions within role
    permissions JSONB DEFAULT '{}'::jsonb,
    
    -- Default preferences for this role
    defaults JSONB DEFAULT '{}'::jsonb,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT role_settings_user_role_unique UNIQUE(user_id, role_type)
);

-- Team Members (For business roles)
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organization_profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL if invitation not accepted
    
    -- Invitation Details
    invited_email TEXT NOT NULL,
    invited_name TEXT,
    invitation_token TEXT UNIQUE,
    invitation_expires_at TIMESTAMPTZ,
    
    -- Role and Permissions
    role_type TEXT NOT NULL, -- 'admin', 'editor', 'viewer', 'custom'
    permissions JSONB DEFAULT '{}'::jsonb,
    applicable_business_roles TEXT[], -- which business roles this member can access
    
    -- Status
    status TEXT DEFAULT 'invited', -- 'invited', 'active', 'suspended', 'removed'
    
    -- Activity Tracking
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment Methods (Unified for all business activities)
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Payment Method Details
    method_type TEXT NOT NULL, -- 'mobile_money', 'bank_account', 'card'
    provider TEXT, -- 'mtn', 'telecel', 'airteltigo', 'gcb', 'ecobank', etc.
    
    -- Account Details (encrypted)
    account_number TEXT,
    account_name TEXT,
    bank_name TEXT,
    
    -- Usage Context
    is_default BOOLEAN DEFAULT FALSE,
    usage_types TEXT[], -- 'payouts', 'payments', 'both'
    applicable_roles TEXT[], -- which roles can use this payment method
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status TEXT DEFAULT 'pending',
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings Change Log (Audit trail for all settings changes)
CREATE TABLE IF NOT EXISTS public.settings_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Change Details
    table_name TEXT NOT NULL,
    record_id UUID,
    action_type TEXT NOT NULL, -- 'create', 'update', 'delete'
    
    -- Role Context
    changed_by_role TEXT, -- which role context the change was made in
    affected_roles TEXT[], -- which roles are affected by this change
    
    -- Change Data
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trusted Devices (For enhanced security)
CREATE TABLE IF NOT EXISTS public.trusted_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Device Information
    device_name TEXT NOT NULL,
    device_type TEXT, -- 'mobile', 'desktop', 'tablet'
    device_fingerprint TEXT UNIQUE NOT NULL,
    
    -- Trust Details
    trusted_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Location
    location_city TEXT,
    location_country TEXT,
    ip_address INET,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- User Profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Organization Profiles
CREATE INDEX IF NOT EXISTS idx_org_profiles_user_id ON public.organization_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_org_profiles_verified ON public.organization_profiles(is_verified);
CREATE INDEX IF NOT EXISTS idx_org_profiles_roles ON public.organization_profiles USING GIN(applicable_roles);

-- User Settings
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Role Settings
CREATE INDEX IF NOT EXISTS idx_role_settings_user_role ON public.role_settings(user_id, role_type);
CREATE INDEX IF NOT EXISTS idx_role_settings_active ON public.role_settings(is_active);

-- Team Members
CREATE INDEX IF NOT EXISTS idx_team_members_org_id ON public.team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON public.team_members(invited_email);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON public.team_members(status);

-- Payment Methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON public.payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON public.payment_methods(is_default);
CREATE INDEX IF NOT EXISTS idx_payment_methods_roles ON public.payment_methods USING GIN(applicable_roles);

-- Audit Log
CREATE INDEX IF NOT EXISTS idx_settings_audit_user_id ON public.settings_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_audit_table ON public.settings_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_settings_audit_created ON public.settings_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_settings_audit_roles ON public.settings_audit_log USING GIN(affected_roles);

-- Trusted Devices
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON public.trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_fingerprint ON public.trusted_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_active ON public.trusted_devices(is_active);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view and edit their own profile" ON public.user_profiles
    FOR ALL USING (user_id = auth.uid());

-- Organization Profiles Policies  
CREATE POLICY "Users can manage their own organization" ON public.organization_profiles
    FOR ALL USING (user_id = auth.uid());

-- User Settings Policies
CREATE POLICY "Users can manage their own settings" ON public.user_settings
    FOR ALL USING (user_id = auth.uid());

-- Role Settings Policies
CREATE POLICY "Users can manage their role settings" ON public.role_settings
    FOR ALL USING (user_id = auth.uid());

-- Team Members Policies (more complex - need to check organization ownership)
CREATE POLICY "Organization owners can manage team members" ON public.team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.organization_profiles 
            WHERE id = organization_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can view their own record" ON public.team_members
    FOR SELECT USING (user_id = auth.uid());

-- Payment Methods Policies
CREATE POLICY "Users can manage their payment methods" ON public.payment_methods
    FOR ALL USING (user_id = auth.uid());

-- Settings Audit Log Policies
CREATE POLICY "Users can view their own audit logs" ON public.settings_audit_log
    FOR SELECT USING (user_id = auth.uid());

-- Trusted Devices Policies
CREATE POLICY "Users can manage their trusted devices" ON public.trusted_devices
    FOR ALL USING (user_id = auth.uid());

-- =============================================================================
-- FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_org_profiles_updated_at 
    BEFORE UPDATE ON public.organization_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_role_settings_updated_at 
    BEFORE UPDATE ON public.role_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at 
    BEFORE UPDATE ON public.team_members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at 
    BEFORE UPDATE ON public.payment_methods
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trusted_devices_updated_at 
    BEFORE UPDATE ON public.trusted_devices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to log settings changes
CREATE OR REPLACE FUNCTION public.log_settings_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.settings_audit_log (
        user_id,
        table_name,
        record_id,
        action_type,
        old_values,
        new_values,
        changed_fields
    ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
        CASE WHEN TG_OP = 'UPDATE' THEN 
            ARRAY(SELECT key FROM jsonb_each(to_jsonb(NEW)) WHERE to_jsonb(NEW) -> key != to_jsonb(OLD) -> key)
        ELSE NULL END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to settings tables
CREATE TRIGGER audit_user_profiles_changes 
    AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.log_settings_change();

CREATE TRIGGER audit_user_settings_changes 
    AFTER INSERT OR UPDATE OR DELETE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.log_settings_change();

CREATE TRIGGER audit_role_settings_changes 
    AFTER INSERT OR UPDATE OR DELETE ON public.role_settings
    FOR EACH ROW EXECUTE FUNCTION public.log_settings_change();

-- =============================================================================
-- EXAMPLE QUERIES FOR MULTI-ROLE SETTINGS
-- =============================================================================

/*
-- Get complete user profile with all roles and settings
SELECT 
    up.*,
    us.*,
    op.*,
    array_agg(DISTINCT ur.role) as user_roles,
    array_agg(DISTINCT rs.role_type) as configured_roles
FROM public.user_profiles up
LEFT JOIN public.user_settings us ON up.user_id = us.user_id  
LEFT JOIN public.organization_profiles op ON up.user_id = op.user_id
LEFT JOIN public.user_roles ur ON up.user_id = ur.user_id
LEFT JOIN public.role_settings rs ON up.user_id = rs.user_id
WHERE up.user_id = $1
GROUP BY up.id, us.id, op.id;

-- Get role-specific notification settings
SELECT 
    u.email,
    us.email_notifications,
    CASE 
        WHEN 'organizer' = ANY(array_agg(ur.role)) THEN 
            us.email_notifications || '{"organizer_specific": true}'::jsonb
        ELSE us.email_notifications
    END as effective_notifications
FROM auth.users u
JOIN public.user_settings us ON u.id = us.user_id
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.id = $1
GROUP BY u.id, u.email, us.email_notifications;

-- Account deletion impact analysis
SELECT 
    up.full_name,
    up.email,
    array_agg(DISTINCT ur.role) as roles_affected,
    COUNT(DISTINCT e.id) as events_count,
    COUNT(DISTINCT v.id) as venues_count,
    COUNT(DISTINCT tm.id) as team_members_count
FROM public.user_profiles up
JOIN public.user_roles ur ON up.user_id = ur.user_id
LEFT JOIN public.events e ON up.user_id = e.organizer_id
LEFT JOIN public.venues v ON up.user_id = v.owner_id
LEFT JOIN public.team_members tm ON up.user_id = tm.user_id
WHERE up.user_id = $1
GROUP BY up.id, up.full_name, up.email;
*/

-- =============================================================================
-- SCHEMA COMPLETE
-- =============================================================================

-- Insert default settings for existing users (migration helper)
/*
INSERT INTO public.user_profiles (user_id, full_name, email)
SELECT id, raw_user_meta_data->>'full_name', email
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.user_profiles);

INSERT INTO public.user_settings (user_id)
SELECT id FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.user_settings);
*/

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
