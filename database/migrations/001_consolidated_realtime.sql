-- ============================================================================
-- CONSOLIDATED REALTIME MIGRATION
-- ============================================================================
-- This file enables Supabase Realtime features on specific tables.
-- Run this AFTER the main consolidated migration (000_consolidated_migration.sql).
--
-- IMPORTANT: Only run this once the base schema is established.
--
-- GENERATED: 2025-12-25
-- ============================================================================

-- ============================================================================
-- SECTION 1: ENABLE REALTIME FOR EVENTS TABLE
-- ============================================================================
-- Source: enable_realtime_lock_counts.sql

-- Step 1: Verify RLS policies allow SELECT for realtime
-- Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'events'
  AND cmd = 'SELECT';

-- Step 2: Ensure there's a policy that allows SELECT on published events
DO $$
BEGIN
  -- Check if the policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'events' 
    AND policyname = 'Events are viewable by everyone'
  ) THEN
    -- Create the policy if it doesn't exist
    CREATE POLICY "Events are viewable by everyone" ON public.events
      FOR SELECT
      USING (status = 'published');
    
    RAISE NOTICE 'Created SELECT policy for events table';
  ELSE
    RAISE NOTICE 'SELECT policy already exists for events table';
  END IF;
END $$;

-- Step 3: Enable Realtime for the events table
-- This allows clients to subscribe to changes
ALTER PUBLICATION supabase_realtime ADD TABLE events;

-- Step 4: Verify Realtime is enabled
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables
WHERE tablename = 'events';
-- Expected output: Should show 'events' table in 'supabase_realtime' publication

-- Step 5: Grant necessary permissions for Realtime
-- Ensure authenticated users can subscribe to changes
GRANT SELECT ON public.events TO authenticated;
GRANT SELECT ON public.events TO anon;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Realtime enabled for events table';
  RAISE NOTICE '✅ Clients can now subscribe to lock_count updates';
END $$;

-- ============================================================================
-- SECTION 2: ENABLE REALTIME FOR USER EVENT LOCKS TABLE
-- ============================================================================
-- Source: enable_realtime_user_locks.sql

-- Add user_event_locks to supabase_realtime publication
BEGIN;
  -- Check if publication exists (standard Supabase setup)
  -- Add table to publication
  ALTER PUBLICATION supabase_realtime ADD TABLE user_event_locks;
COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this query to verify which tables have realtime enabled:

SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Expected output should include:
-- public | events | supabase_realtime
-- public | user_event_locks | supabase_realtime

-- ============================================================================
-- END OF REALTIME MIGRATION
-- ============================================================================
