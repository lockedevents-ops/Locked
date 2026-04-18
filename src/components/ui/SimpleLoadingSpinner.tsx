import React from 'react';

interface SimpleLoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Simple, performant loading spinner for dashboard pages
 * Lightweight alternative to skeleton loaders - single DOM element, minimal repaints
 * @param message - Optional loading message to display below spinner
 * @param size - Size variant: 'sm' (8), 'md' (12), 'lg' (16)
 * @param className - Optional additional CSS classes for container
 */
export function SimpleLoadingSpinner({ 
  message = "Loading...", 
  size = 'md',
  className = '' 
}: SimpleLoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div className={`flex flex-col items-center justify-center h-[50vh] gap-4 ${className}`}>
      <div 
        className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]}`}
        role="status"
        aria-label="Loading"
      />
      {message && (
        <p className="text-neutral-600 text-sm font-medium">
          {message}
        </p>
      )}
    </div>
  );
}
