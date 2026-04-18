/**
 * Policy Integration Utility
 * --------------------------------------------------------------
 * Provides hooks and utilities to integrate policy checking with existing
 * event and venue services. This ensures that new content is automatically
 * checked against policy rules.
 */

import { policyService } from '@/services/policyService';

/**
 * Hook to automatically check and flag event content after creation/update
 */
export const checkEventPolicy = async (eventId: string, eventData: any, userId?: string) => {
  try {
    // Check if policy checking is enabled (could be a feature flag later)
    const shouldCheck = process.env.NODE_ENV !== 'test'; // Skip in tests
    
    if (!shouldCheck) return;

    await policyService.checkAndFlagEvent(eventId, eventData, userId || 'system');
  } catch (error) {
    console.error('Error checking event policy:', error);
    // Don't throw - policy checking shouldn't break the main flow
  }
};

/**
 * Hook to automatically check and flag venue content after creation/update
 */
export const checkVenuePolicy = async (venueId: string, venueData: any, userId?: string) => {
  try {
    // Check if policy checking is enabled (could be a feature flag later)
    const shouldCheck = process.env.NODE_ENV !== 'test'; // Skip in tests
    
    if (!shouldCheck) return;

    await policyService.checkAndFlagVenue(venueId, venueData, userId || 'system');
  } catch (error) {
    console.error('Error checking venue policy:', error);
    // Don't throw - policy checking shouldn't break the main flow
  }
};

/**
 * Batch check existing events and venues for policy violations
 * This can be run as a background job or admin utility
 */
export const batchCheckPolicies = async () => {
  console.log('Starting batch policy check...');
  
  try {
    // This would need access to your event and venue services
    // For now, just log that this functionality exists
    console.log('Batch policy checking would scan all existing events and venues');
    console.log('This can be implemented as a background job or admin utility');
    
    // Example implementation:
    // const events = await eventDatabaseService.getAllEvents();
    // for (const event of events) {
    //   await checkEventPolicy(event.id, event, 'system');
    // }
    
    // const venues = await venueDatabaseService.getAllVenues();
    // for (const venue of venues) {
    //   await checkVenuePolicy(venue.id, venue, 'system');
    // }
    
  } catch (error) {
    console.error('Error in batch policy check:', error);
  }
};

/**
 * Initialize policy system (run once during app startup)
 */
export const initializePolicySystem = async () => {
  try {
    console.log('Initializing policy system...');
    await policyService.initializePolicyRules();
    console.log('Policy system initialized successfully');
  } catch (error) {
    console.error('Error initializing policy system:', error);
  }
};

/**
 * Utility to check if content is safe before displaying publicly
 * This can be used in frontend components to hide flagged content
 */
export const isContentFlagged = async (itemType: 'event' | 'venue', itemId: string): Promise<boolean> => {
  try {
    const flaggedItems = await policyService.getFlaggedItems({
      item_type: itemType,
      is_active: true,
    });
    
    return flaggedItems.some(item => item.item_id === itemId);
  } catch (error) {
    console.error('Error checking if content is flagged:', error);
    // Default to safe - don't hide content if check fails
    return false;
  }
};

/**
 * Utility to get flagged item details for a specific item
 */
export const getFlaggedItemDetails = async (itemType: 'event' | 'venue', itemId: string) => {
  try {
    const flaggedItems = await policyService.getFlaggedItems({
      item_type: itemType,
      is_active: true,
    });
    
    return flaggedItems.find(item => item.item_id === itemId);
  } catch (error) {
    console.error('Error getting flagged item details:', error);
    return null;
  }
};

/**
 * Admin utility to bulk unflag items by IDs
 */
export const bulkUnflagItems = async (flagIds: string[], adminId: string, notes?: string) => {
  const results = [];
  
  for (const flagId of flagIds) {
    try {
      await policyService.unflagItem(flagId, adminId, notes);
      results.push({ flagId, success: true });
    } catch (error) {
      console.error(`Error unflagging item ${flagId}:`, error);
      results.push({ flagId, success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  
  return results;
};

/**
 * Admin utility to bulk remove items by flag IDs
 */
export const bulkRemoveItems = async (flagIds: string[], adminId: string, notes?: string) => {
  const results = [];
  
  for (const flagId of flagIds) {
    try {
      await policyService.removeItem(flagId, adminId, notes);
      results.push({ flagId, success: true });
    } catch (error) {
      console.error(`Error removing item ${flagId}:`, error);
      results.push({ flagId, success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  
  return results;
};

/**
 * Content filter for public displays
 * This can be used to filter out flagged items from public listings
 */
export const filterFlaggedContent = async <T extends { id: string }>(
  items: T[], 
  itemType: 'event' | 'venue'
): Promise<T[]> => {
  try {
    const flaggedItems = await policyService.getFlaggedItems({
      item_type: itemType,
      is_active: true,
      resolution: 'pending', // Only filter out pending flags, not resolved ones
    });
    
    const flaggedIds = new Set(flaggedItems.map(item => item.item_id));
    
    return items.filter(item => !flaggedIds.has(item.id));
  } catch (error) {
    console.error('Error filtering flagged content:', error);
    // Return all items if filtering fails (fail-open approach)
    return items;
  }
};

export default {
  checkEventPolicy,
  checkVenuePolicy,
  batchCheckPolicies,
  initializePolicySystem,
  isContentFlagged,
  getFlaggedItemDetails,
  bulkUnflagItems,
  bulkRemoveItems,
  filterFlaggedContent,
};
