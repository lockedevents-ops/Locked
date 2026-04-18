-- ============================================================================
-- WIPE DATABASE CLEAN (RESET SCRIPT)
-- ============================================================================
-- ⚠️ WARNING: THIS SCRIPT DESTROYS ALL DATA AND SCHEMA definition created by
-- the consolidated migration. Use with extreme caution.
--
-- PURPOSE: Wipes the database clean to allow a fresh run of 
-- '000_consolidated_migration.sql'.
-- ============================================================================

-- ============================================================================
-- 1. DROP TABLES AND VIEWS (CASCADE will handle dependencies)
-- ============================================================================
-- NOTE: Dropping tables automatically removes them from publications.


-- Security & Policy System
DROP TABLE IF EXISTS public.security_settings CASCADE;
DROP TABLE IF EXISTS public.content_similarity CASCADE;
DROP TABLE IF EXISTS public.user_offense_history CASCADE;
DROP TABLE IF EXISTS public.user_offenses CASCADE;
DROP TABLE IF EXISTS public.flagged_items CASCADE;
DROP TABLE IF EXISTS public.policy_rules CASCADE;

-- Commerce
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.merch_products CASCADE;
DROP TABLE IF EXISTS public.payout_requests CASCADE;
DROP TABLE IF EXISTS public.payment_methods CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;

-- Admin & Logs
DROP VIEW IF EXISTS public.deleted_accounts_view CASCADE;
DROP VIEW IF EXISTS public.admin_activity_logs_with_user_info CASCADE;
DROP TABLE IF EXISTS public.deleted_accounts_log CASCADE;
DROP TABLE IF EXISTS public.admin_audit_logs CASCADE;
DROP TABLE IF EXISTS public.admin_login_attempts CASCADE;
DROP TABLE IF EXISTS public.email_reminders CASCADE;

-- Communication & Verification
DROP TABLE IF EXISTS public.verification_codes CASCADE;
DROP TABLE IF EXISTS public.chatbot_messages CASCADE;
DROP TABLE IF EXISTS public.chatbot_conversations CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Keys/Rewards System
DROP TABLE IF EXISTS public.user_keys_ledger CASCADE;
DROP TABLE IF EXISTS public.organization_keys_ledger CASCADE;
DROP TABLE IF EXISTS public.keys_redemptions CASCADE;
DROP TABLE IF EXISTS public.keys_coupons CASCADE;
DROP VIEW IF EXISTS public.user_keys_balance CASCADE;
DROP VIEW IF EXISTS public.organization_keys_balance CASCADE;

-- User Interaction
DROP TABLE IF EXISTS public.user_organizer_follows CASCADE;
DROP TABLE IF EXISTS public.user_event_locks CASCADE;

-- Events & Registration
DROP TABLE IF EXISTS public.event_registrations CASCADE;
DROP TABLE IF EXISTS public.event_drafts CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.venues CASCADE;

-- Core Entities
DROP TABLE IF EXISTS public.organizers CASCADE;
DROP TABLE IF EXISTS public.role_requests CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================================
-- 2. DROP CUSTOM TYPES
-- ============================================================================
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;

-- ============================================================================
-- 3. DROP FUNCTIONS
-- ============================================================================
-- Triggers on auth.users need to be dropped explicitly
DROP TRIGGER IF EXISTS on_auth_user_email_verified ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_create_security_settings ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Helper functions
DROP FUNCTION IF EXISTS sync_profile_role_flags() CASCADE;
DROP FUNCTION IF EXISTS auto_create_organizer_profile() CASCADE;
DROP FUNCTION IF EXISTS update_role_requests_updated_at() CASCADE;
DROP FUNCTION IF EXISTS auto_grant_role_on_approval() CASCADE;
DROP FUNCTION IF EXISTS update_organizers_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_event_registrations_updated_at() CASCADE;
DROP FUNCTION IF EXISTS generate_qr_code_token() CASCADE;
DROP FUNCTION IF EXISTS update_event_registration_count() CASCADE;
DROP FUNCTION IF EXISTS update_organizer_stats_on_registration() CASCADE;
DROP FUNCTION IF EXISTS update_events_updated_at() CASCADE;
DROP FUNCTION IF EXISTS generate_event_slug() CASCADE;
DROP FUNCTION IF EXISTS update_organizer_stats_on_event_create() CASCADE;
DROP FUNCTION IF EXISTS update_organizer_stats_on_status_change() CASCADE;
DROP FUNCTION IF EXISTS update_profiles_updated_at() CASCADE;
DROP FUNCTION IF EXISTS create_profile_on_email_verification() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- Realtime/Lock functions
DROP FUNCTION IF EXISTS increment_event_lock_count() CASCADE;
DROP FUNCTION IF EXISTS decrement_event_lock_count() CASCADE;

-- Keys functions
DROP FUNCTION IF EXISTS award_keys(UUID, INTEGER, TEXT, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS purchase_org_keys(UUID, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS redeem_coupon(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS trigger_award_signup_bonus() CASCADE;
DROP FUNCTION IF EXISTS trigger_award_profile_completion() CASCADE;
DROP FUNCTION IF EXISTS spend_user_keys(UUID, INTEGER, TEXT, JSONB) CASCADE;

-- Chatbot functions
DROP FUNCTION IF EXISTS get_chatbot_conversations(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_conversation_messages(UUID, UUID, INT) CASCADE;
DROP FUNCTION IF EXISTS save_chatbot_message(UUID, UUID, TEXT, TEXT, JSONB) CASCADE;

-- Verification functions
DROP FUNCTION IF EXISTS cleanup_expired_verification_codes() CASCADE;

-- Account deletion functions
DROP FUNCTION IF EXISTS is_account_deleted(UUID) CASCADE;
DROP FUNCTION IF EXISTS soft_delete_account(UUID, TEXT, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Policy functions
DROP FUNCTION IF EXISTS check_content_policy(TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- Security Settings functions
DROP FUNCTION IF EXISTS update_security_settings_updated_at() CASCADE;
DROP FUNCTION IF EXISTS create_security_settings_on_signup() CASCADE;
DROP FUNCTION IF EXISTS get_or_create_security_settings(UUID) CASCADE;

-- Notifications/Admin utility functions
DROP FUNCTION IF EXISTS public.update_notifications_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.notify_user(UUID, TEXT, TEXT, VARCHAR, TEXT, JSONB, VARCHAR, UUID, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.notify_admins(TEXT, TEXT, VARCHAR, TEXT, JSONB, VARCHAR, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.log_admin_activity(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, JSONB, TEXT, TEXT, INTEGER, JSONB) CASCADE;
DROP FUNCTION IF EXISTS cleanup_login_attempts() CASCADE;

-- ============================================================================
-- 4. CLEAN UP STORAGE BUCKETS
-- ============================================================================
-- This removes the bucket definitions and their contents.
-- ⚠️ WARNING: This deletes actual files in storage!

-- Helper block to clean up buckets
DO $$
DECLARE
  bucket_name text;
BEGIN
  FOR bucket_name IN 
    SELECT unnest(ARRAY[
      'role-requests', 
      'user-avatars', 
      'admin-avatars', 
      'events', 
      'organizer-media', 
      'merch', 
      'venues'
    ])
  LOOP
    BEGIN
      -- Supabase blocks direct DELETE on storage.objects; use storage API functions.
      IF to_regprocedure('storage.empty_bucket(text)') IS NOT NULL THEN
        PERFORM storage.empty_bucket(bucket_name);
      END IF;

      IF to_regprocedure('storage.delete_bucket(text)') IS NOT NULL THEN
        PERFORM storage.delete_bucket(bucket_name);
      ELSE
        -- Fallback for environments without storage.delete_bucket.
        DELETE FROM storage.buckets WHERE id = bucket_name;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Storage cleanup skipped for bucket %: %', bucket_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- FINISHED
-- ============================================================================
