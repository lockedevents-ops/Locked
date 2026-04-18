"use client";

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps extends Omit<ImageProps, 'alt'> {
  alt: string;
  fallbackSrc?: string;
  showBlur?: boolean;
}

/**
 * ✅ PHASE 3: Optimized Image component wrapper
 * 
 * Features:
 * - Automatic error handling with fallback
 * - Optional blur placeholder for lazy-loaded images
 * - Standard sizing and responsive behavior
 * - Consistent alt text and accessibility
 */
export function OptimizedImage({
  src,
  alt,
  fallbackSrc = '/images/placeholder.svg',
  showBlur = false,
  className = '',
  ...props
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  const displaySrc = hasError ? fallbackSrc : src;

  return (
    <>
      <Image
        src={displaySrc}
        alt={alt}
        className={`${className} ${isLoading && showBlur ? 'blur-sm' : 'blur-0'} transition-all duration-300`}
        onError={handleError}
        onLoadingComplete={handleLoadingComplete}
        quality={75}
        {...props}
      />
      {/* Fallback in case Image component doesn't render */}
      {hasError && (
        <div className={`${className} bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center`}>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Image unavailable</span>
        </div>
      )}
    </>
  );
}
