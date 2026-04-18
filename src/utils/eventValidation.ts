/**
 * Event Form Validation Utilities
 * ================================================================
 * Provides reusable validation functions for event forms including:
 * - Duplicate title checking
 * - City name validation
 * - Online URL validation by platform
 * - Image file size validation
 */

import { createClient } from '@/lib/supabase/client/client';

const DUPLICATE_CHECK_TIMEOUT_MS = 8000;
const EVENT_VALIDATION_DEBUG = process.env.NEXT_PUBLIC_DEBUG_EVENT_CREATION === 'true';

const debugValidation = (...args: unknown[]) => {
  if (EVENT_VALIDATION_DEBUG) {
    console.log(...args);
  }
};

// Maximum file size for images (5MB in bytes)
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_IMAGE_SIZE_MB = 5; // For display purposes


/**
 * Check if an event title already exists in the database
 */
export async function checkDuplicateEventTitle(title: string, excludeId?: string): Promise<boolean> {
  try {
    const supabase = createClient();
    
    let query = supabase
      .from('events')
      .select('id, title')
      .ilike('title', title.trim());

    // If editing an event, exclude the current event from the check
    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const queryPromise = query;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Duplicate title check timed out after ${DUPLICATE_CHECK_TIMEOUT_MS}ms`)), DUPLICATE_CHECK_TIMEOUT_MS);
    });

    const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

    if (error) {
      debugValidation('[EventValidation] duplicate title check failed, allowing submit', error);
      return false; // If there's an error, allow the operation to continue
    }

    // Return true if a duplicate is found
    return data && data.length > 0;
  } catch (error) {
    debugValidation('[EventValidation] duplicate title check failed, allowing submit', error);
    return false; // If there's an error, allow the operation to continue
  }
}

/**
 * Check if a venue name already exists in the database
 */
export async function checkDuplicateVenueName(name: string, excludeId?: string): Promise<boolean> {
  try {
    const supabase = createClient();
    
    let query = supabase
      .from('venues')
      .select('id, name')
      .ilike('name', name.trim());

    // If editing a venue, exclude the current venue from the check
    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      debugValidation('[EventValidation] venue conflict check failed, allowing submit', error);
      return false; // If there's an error, allow the operation to continue
    }

    // Return true if a duplicate is found
    return data && data.length > 0;
  } catch (error) {
    debugValidation('[EventValidation] venue conflict check failed, allowing submit', error);
    return false; // If there's an error, allow the operation to continue
  }
}

/**
 * Validate city name - should not contain numbers or digits
 */
export function validateCityName(city: string): boolean {
  if (!city || city.trim().length === 0) return false;
  
  // Check if city contains any digits
  const hasNumbers = /\d/.test(city);
  return !hasNumbers;
}

/**
 * Get the city validation error message
 */
export function getCityValidationError(city: string): string | null {
  if (!city || city.trim().length === 0) {
    return "City is required";
  }
  
  if (/\d/.test(city)) {
    return "City name cannot contain numbers or digits";
  }
  
  return null;
}

/**
 * Validate online URL based on the selected platform
 */
export function validateOnlineUrl(url: string, platform: string): boolean {
  if (!url || url.trim().length === 0) return false;
  
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    switch (platform.toLowerCase()) {
      case 'zoom':
        return hostname.includes('zoom.us') || hostname.includes('zoom.com');
      
      case 'microsoft teams':
      case 'teams':
        return hostname.includes('teams.microsoft.com') || hostname.includes('teams.live.com');
      
      case 'google meet':
      case 'meet':
        return hostname.includes('meet.google.com');
      
      case 'webex':
        return hostname.includes('webex.com');
      
      case 'skype':
        return hostname.includes('skype.com') || hostname.includes('join.skype.com');
      
      case 'discord':
        return hostname.includes('discord.gg') || hostname.includes('discord.com');
      
      case 'youtube':
        return hostname.includes('youtube.com') || hostname.includes('youtu.be');
      
      case 'twitch':
        return hostname.includes('twitch.tv');
      
      case 'facebook':
      case 'facebook live':
        return hostname.includes('facebook.com') || hostname.includes('fb.com');
      
      case 'instagram':
      case 'instagram live':
        return hostname.includes('instagram.com');
      
      case 'linkedin':
      case 'linkedin live':
        return hostname.includes('linkedin.com');
      
      case 'custom':
      case 'other':
      default:
        // For custom platforms, just validate it's a proper URL
        return true;
    }
  } catch {
    return false;
  }
}

/**
 * Get the online URL validation error message
 */
export function getOnlineUrlValidationError(url: string, platform: string): string | null {
  if (!url || url.trim().length === 0) {
    return "Online URL is required for online or hybrid events";
  }
  
  try {
    new URL(url); // This will throw if URL is invalid
  } catch {
    return "Please enter a valid URL";
  }
  
  if (!validateOnlineUrl(url, platform)) {
    return `URL must be a valid ${platform} link`;
  }
  
  return null;
}

/**
 * Validate image file size (max 1MB)
 */
export function validateImageSize(file: File): boolean {
  return file.size <= MAX_IMAGE_SIZE;
}

/**
 * Get image size validation error message
 */
export function getImageSizeError(file: File): string | null {
  if (file.size > MAX_IMAGE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return `Image size (${sizeMB}MB) exceeds the maximum limit of ${MAX_IMAGE_SIZE_MB}MB`;
  }
  return null;
}


/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate multiple image files
 */
export function validateMultipleImages(files: FileList | File[]): { 
  valid: boolean; 
  errors: string[]; 
  validFiles: File[] 
} {
  const errors: string[] = [];
  const validFiles: File[] = [];
  const fileArray = Array.from(files);
  
  fileArray.forEach((file, index) => {
    const error = getImageSizeError(file);
    if (error) {
      errors.push(`File ${index + 1} (${file.name}): ${error}`);
    } else {
      validFiles.push(file);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    validFiles
  };
}

/**
 * Platform options for online events
 */
export const ONLINE_PLATFORMS = [
  'Zoom',
  'Microsoft Teams',
  'Google Meet',
  'WebEx',
  'Skype',
  'Discord',
  'YouTube',
  'Twitch',
  'Facebook Live',
  'Instagram Live',
  'LinkedIn Live',
  'Custom',
  'Other'
];

/**
 * Check if a platform requires specific URL validation
 */
export function requiresSpecificUrl(platform: string): boolean {
  return !['custom', 'other'].includes(platform.toLowerCase());
}
