/**
 * Formats image paths for Next.js Image component
 * Handles both full URLs and storage paths
 */
export function getFormattedImagePath(path?: string | null): string {
  if (!path) return ''; // No fallback - return empty string if no image
  
  // If it's already a complete URL (absolute)
  if (path.startsWith('http')) {
    return path;
  }
  
  // If it's a public path starting with /
  if (path.startsWith('/')) {
    return path;
  }
  
  // Handle Supabase storage URLs (already complete)
  if (path.includes('storage/v1/object/public/')) {
    return path;
  }
  
  // Handle storage paths that need to be converted to URLs
  // Pattern: event-images/{userId}/{filename} or events/{userId}/{filename}
  if (path.includes('event-images/') || path.startsWith('event-images/')) {
    // Get Supabase URL from environment or use default
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    return `${supabaseUrl}/storage/v1/object/public/events/${path}`;
  }
  
  // Handle venue images
  if (path.includes('venue-images/') || path.startsWith('venue-images/')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    return `${supabaseUrl}/storage/v1/object/public/venues/${path}`;
  }
  
  // Handle profile avatars
  if (path.includes('avatars/') || path.startsWith('avatars/')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    return `${supabaseUrl}/storage/v1/object/public/profiles/${path}`;
  }
  
  // For old format paths (events/, venues/, etc.) that were in public folder
  if (path.startsWith('events/') || path.startsWith('venues/')) {
    return `/${path}`;
  }
  
  // Otherwise, add the leading slash for public folder paths
  return `/${path}`;
}