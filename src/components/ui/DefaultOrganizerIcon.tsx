/**
 * Default Organizer Icon Component
 * --------------------------------------------------------------
 * Displays a default profile icon when organizer hasn't uploaded a profile image
 */

import React from 'react';

interface DefaultOrganizerIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function DefaultOrganizerIcon({ className = '', size = 'md' }: DefaultOrganizerIconProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center border-2 border-primary/20`}>
      <svg 
        className={`${size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : size === 'lg' ? 'w-8 h-8' : 'w-10 h-10'} text-primary/70`}
        fill="currentColor" 
        viewBox="0 0 24 24"
      >
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    </div>
  );
}
