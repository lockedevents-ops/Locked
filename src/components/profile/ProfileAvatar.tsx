"use client";

import { useState } from 'react';
import { User } from 'lucide-react';

interface ProfileAvatarProps {
  avatarUrl?: string | null;
  name?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  showFallbackIcon?: boolean;
}

export function ProfileAvatar({ 
  avatarUrl, 
  name, 
  size = 'medium',
  className = '',
  showFallbackIcon = true 
}: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Size configurations
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-10 h-10', 
    large: 'w-16 h-16'
  };

  const iconSizes = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-8 h-8'
  };

  const shouldShowImage = avatarUrl && !imageError;
  const shouldShowFallback = !shouldShowImage && showFallbackIcon;

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full overflow-hidden bg-neutral-100 flex items-center justify-center relative ${className}`}
      title={name ? `${name}'s profile` : 'Profile'}
    >
      {shouldShowImage && (
        <>
          <img
            src={avatarUrl}
            alt={name ? `${name}'s profile picture` : 'Profile picture'}
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
          {/* Loading placeholder while image loads */}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-neutral-200 animate-pulse flex items-center justify-center">
              <User className={`${iconSizes[size]} text-neutral-400`} />
            </div>
          )}
        </>
      )}
      
      {shouldShowFallback && (
        <User className={`${iconSizes[size]} text-neutral-600`} />
      )}
    </div>
  );
}
