/**
 * Database-backed Activity Service
 * --------------------------------------------------------------
 * MIGRATED FROM: localStorage-based activity aggregation
 * 
 * NEW IMPLEMENTATION:
 *  - All activities are fetched directly from Supabase database
 *  - No localStorage dependency - everything is database-backed
 *  - Real-time activity logging and retrieval
 *  - Comprehensive user action tracking
 *  - Authentication event logging
 *  - Admin activity monitoring
 */

// Import the new database-backed activity service
import { 
  getRecentActivities as getRecentActivitiesFromDB,
  getAllActivities as getAllActivitiesFromDB,
  logMigrationEvent
} from './databaseActivityService';

// Log migration event once - use localStorage to persist across page reloads
let migrationLogged = typeof window !== 'undefined' && localStorage.getItem('activity_migration_logged') === 'true';

async function ensureMigrationLogged() {
  if (!migrationLogged) {
    try {
      await logMigrationEvent();
      migrationLogged = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('activity_migration_logged', 'true');
      }
      console.log('✅ Activity logging migration completed - now using database instead of localStorage');
    } catch (error) {
      console.warn('Could not log migration event:', error);
    }
  }
}

/**
 * Get recent activities from database (replaces localStorage aggregation)
 */
export async function getRecentActivities(limit?: number, daysBack: number = 7) {
  await ensureMigrationLogged();
  
  try {
    const activities = await getRecentActivitiesFromDB(limit || 5, daysBack);
    console.log(`✅ Loaded ${activities.length} recent activities from database`);
    return activities;
  } catch (error) {
    console.error('❌ Failed to load recent activities from database:', error);
    return [];
  }
}

/**
 * Get all activities from database (replaces localStorage aggregation)
 */
export async function getAllActivities(daysBack: number = 30) {
  await ensureMigrationLogged();
  
  try {
    const activities = await getAllActivitiesFromDB(daysBack, 100, 0);
    console.log(`✅ Loaded ${activities.length} activities from database`);
    return activities;
  } catch (error) {
    console.error('❌ Failed to load activities from database:', error);
    return [];
  }
}

// Legacy compatibility - these functions now return empty arrays since we're database-only
export function getRecentActivitiesSync(limit?: number, daysBack: number = 7) {
  console.warn('⚠️ getRecentActivitiesSync is deprecated. Use async getRecentActivities instead.');
  return [];
}

export function getAllActivitiesSync(daysBack: number = 30) {
  console.warn('⚠️ getAllActivitiesSync is deprecated. Use async getAllActivities instead.');
  return [];
}
