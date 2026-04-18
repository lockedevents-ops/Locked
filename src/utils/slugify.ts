/**
 * Slug Generation Utility
 * --------------------------------------------------------------
 * Converts event titles into URL-friendly slugs for SEO-optimized URLs
 */

import { createClient } from '@/lib/supabase/client/client';

/**
 * Convert a string to a URL-safe slug
 * @param text - The text to convert to slug
 * @returns URL-safe slug string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Replace spaces and special characters with hyphens
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a unique slug for an event
 * Checks database for existing slugs and appends counter if needed
 * @param title - Event title to convert to slug
 * @param eventId - Optional event ID (for updates, to exclude current event from uniqueness check)
 * @returns Promise<string> - Unique slug
 */
export async function generateUniqueSlug(
  title: string,
  eventId?: string
): Promise<string> {
  const supabase = createClient();
  const baseSlug = slugify(title);
  
  if (!baseSlug) {
    // Fallback if title generates empty slug
    return `event-${Date.now()}`;
  }
  
  let slug = baseSlug;
  let counter = 1;
  let isUnique = false;
  
  while (!isUnique) {
    // Check if slug exists in database
    let query = supabase
      .from('events')
      .select('id')
      .eq('slug', slug);
    
    // Exclude current event if updating
    if (eventId) {
      query = query.neq('id', eventId);
    }
    
    const { data, error } = await query.maybeSingle();
    
    if (error) {
      // Error occurred, log and return fallback slug
      console.error('Error checking slug uniqueness:', error);
      return `${baseSlug}-${Date.now()}`;
    }
    
    if (!data) {
      // No rows returned - slug is unique
      isUnique = true;
    } else {
      // Slug exists, try with counter
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  }
  
  return slug;
}

/**
 * Validate that a slug is URL-safe
 * @param slug - Slug to validate
 * @returns boolean - True if valid
 */
export function isValidSlug(slug: string): boolean {
  // Only lowercase letters, numbers, and hyphens
  // No leading/trailing hyphens
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug);
}

/**
 * Check if a string is a UUID
 * Used for backward compatibility with old UUID-based URLs
 * @param str - String to check
 * @returns boolean - True if string is a valid UUID
 */
export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Extract slug from a full URL or path
 * @param urlOrPath - Full URL or path containing slug
 * @returns Extracted slug
 */
export function extractSlug(urlOrPath: string): string {
  // Remove query params and hash
  const cleanPath = urlOrPath.split('?')[0].split('#')[0];
  
  // Get last segment of path
  const segments = cleanPath.split('/').filter(Boolean);
  return segments[segments.length - 1] || '';
}
