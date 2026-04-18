'use client';

import Image, { ImageProps } from 'next/image';
import { useState, useCallback } from 'react';

/**
 * AppImage - Unified image component for the application
 * 
 * Features:
 * - Automatically uses `unoptimized` for Supabase storage URLs (bypasses Vercel Image Optimization quota)
 * - Built-in error handling with optional fallback
 * - Consistent loading behavior
 * - TypeScript support with all next/image props
 * 
 * Usage:
 * ```tsx
 * <AppImage 
 *   src={imageUrl} 
 *   alt="Description" 
 *   width={300} 
 *   height={200} 
 *   fallbackSrc="/placeholder.svg"
 * />
 * ```
 */

interface AppImageProps extends Omit<ImageProps, 'onError'> {
  /** Fallback image URL when the primary src fails to load */
  fallbackSrc?: string;
  /** Custom error handler */
  onImageError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  /** Force optimization on/off (overrides Supabase detection) */
  forceOptimize?: boolean;
}

// Supabase storage URL patterns to detect
const SUPABASE_PATTERNS = [
  '.supabase.co/storage/',
  'supabase.co/storage/v1/object/',
];

// Default fallback if none provided
const DEFAULT_FALLBACK = '/placeholder.svg';

/**
 * Check if a URL is from Supabase storage
 */
function isSupabaseUrl(src: string | undefined): boolean {
  if (!src || typeof src !== 'string') return false;
  return SUPABASE_PATTERNS.some(pattern => src.includes(pattern));
}

/**
 * Check if a URL is from Google user content (avatars)
 */
function isGoogleUserContent(src: string | undefined): boolean {
  if (!src || typeof src !== 'string') return false;
  return src.includes('googleusercontent.com');
}

export function AppImage({
  src,
  alt,
  fallbackSrc,
  onImageError,
  forceOptimize,
  className,
  ...props
}: AppImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  // Reset state when src changes
  if (src !== imgSrc && !hasError) {
    setImgSrc(src);
  }

  // Determine if we should skip Next.js optimization
  // - Supabase images: serve directly from Supabase CDN
  // - Google user content: external provider with their own CDN
  // - forceOptimize overrides this behavior
  const shouldSkipOptimization = forceOptimize !== true && (
    forceOptimize === false || 
    isSupabaseUrl(typeof src === 'string' ? src : undefined) ||
    isGoogleUserContent(typeof src === 'string' ? src : undefined)
  );

  const handleError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    // Prevent infinite loop - only try fallback once
    if (hasError) return;
    
    setHasError(true);
    
    const fallback = fallbackSrc || DEFAULT_FALLBACK;
    if (fallback && imgSrc !== fallback) {
      setImgSrc(fallback);
    }

    // Call custom error handler if provided
    onImageError?.(e);
  }, [hasError, fallbackSrc, imgSrc, onImageError]);

  // Handle empty or invalid src
  if (!imgSrc) {
    return (
      <Image
        src={fallbackSrc || DEFAULT_FALLBACK}
        alt={alt}
        className={className}
        unoptimized
        {...props}
      />
    );
  }

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      className={className}
      unoptimized={shouldSkipOptimization}
      onError={handleError}
    />
  );
}

/**
 * Avatar-specific variant with circular styling defaults
 */
interface AppAvatarProps extends Omit<AppImageProps, 'width' | 'height'> {
  size?: number;
}

export function AppAvatar({
  size = 40,
  className = '',
  fallbackSrc = '/default-avatar.png',
  ...props
}: AppAvatarProps) {
  return (
    <AppImage
      {...props}
      width={size}
      height={size}
      fallbackSrc={fallbackSrc}
      className={`rounded-full object-cover ${className}`}
    />
  );
}

/**
 * Event image variant with aspect ratio defaults
 */
interface AppEventImageProps extends Omit<AppImageProps, 'width' | 'height'> {
  aspectRatio?: 'video' | 'square' | 'portrait';
}

export function AppEventImage({
  aspectRatio = 'video',
  className = '',
  fallbackSrc = '/placeholder-event.svg',
  ...props
}: AppEventImageProps) {
  const aspectClasses = {
    video: 'aspect-video',
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
  };

  return (
    <div className={`relative overflow-hidden ${aspectClasses[aspectRatio]} ${className}`}>
      <AppImage
        {...props}
        fill
        fallbackSrc={fallbackSrc}
        className="object-cover"
      />
    </div>
  );
}

export default AppImage;
