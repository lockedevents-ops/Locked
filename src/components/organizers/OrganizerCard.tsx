/**
 * OrganizerCard Component
 * --------------------------------------------------------------
 * Reusable component for displaying organizer information with ranking badges
 * Used on both homepage and organizers page for consistency
 */

import React from 'react';
import Image from '@/components/ui/AppImage';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Users, Trophy, Crown, Award, Star } from 'lucide-react';

export interface OrganizerCardData {
  id: string;
  name: string;
  image?: string;
  location: string;
  bio: string;
  verified: boolean;
  verificationStatus: string;
  eventsHosted: number;
  followersCount: number;
  totalEventLocks?: number; // Sum of lock_count across all events
  totalScore?: number;
  rank?: number;
}

interface OrganizerCardProps {
  organizer: OrganizerCardData;
  showRanking?: boolean;
  size?: 'default' | 'compact';
  className?: string;
  showViewProfile?: boolean; // Show "View Profile" button (for Event Details page)
}

// ✅ PHASE 3 OPTIMIZATION: Memoize to prevent unnecessary re-renders
export const OrganizerCard = React.memo(function OrganizerCard({ 
  organizer, 
  showRanking = false, 
  size = 'default',
  className = '',
  showViewProfile = false
}: OrganizerCardProps) {
  const router = useRouter();

  // ✅ PHASE 3 OPTIMIZATION: Prefetch profile page on hover
  const handlePrefetch = () => {
    router.prefetch(`/profiles/${organizer.id}`);
  };
  
  const getRankingBadgeConfig = (rank?: number) => {
    if (!showRanking) return null;

    const badgeConfigs = {
      1: {
        icon: Crown,
        bgGradient: 'from-indigo-500 via-purple-500 to-pink-500',
        ringColor: 'ring-indigo-400',
        label: 'Elite'
      },
      2: {
        icon: Trophy,
        bgGradient: 'from-cyan-300 via-blue-400 to-indigo-400',
        ringColor: 'ring-cyan-300',
        label: 'Platinum'
      },
      3: {
        icon: Award,
        bgGradient: 'from-amber-300 via-yellow-400 to-amber-200',
        ringColor: 'ring-amber-300',
        label: 'Gold'
      }
    };
    
    if (!rank) {
      return {
        icon: Star,
        bgGradient: 'from-neutral-200 via-neutral-100 to-white',
        ringColor: 'ring-neutral-200',
        label: 'Standard'
      };
    }
    
    return badgeConfigs[rank as keyof typeof badgeConfigs] || {
      icon: Star,
      bgGradient: 'from-neutral-200 via-neutral-100 to-white',
      ringColor: 'ring-neutral-200',
      label: 'Standard'
    };
  };

  // Get ranking badge icon configuration - renders as pill on profile circle
  const getRankingIconBadge = (rank?: number) => {
    const config = getRankingBadgeConfig(rank);
    if (!config) return null;

    const IconComponent = config.icon;
    
    // Circular badge with icon only on the profile image
    return (
      <div className="absolute -bottom-1 -right-1 z-10">
        <div className={`h-7 w-7 rounded-full bg-gradient-to-r ${config.bgGradient} shadow-lg ring-2 ring-white flex items-center justify-center`}>
          <IconComponent className="w-3.5 h-3.5 text-white drop-shadow-sm" />
        </div>
      </div>
    );
  };

  const getRankingCornerBadge = (rank?: number) => {
    const config = getRankingBadgeConfig(rank);
    if (!config) return null;

    const IconComponent = config.icon;

    return (
      <div className="absolute top-3 right-3 z-20">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${config.bgGradient} shadow-lg border border-white/70`}>
          <IconComponent className="w-3 h-3 text-white drop-shadow-sm" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-white">{config.label}</span>
        </div>
      </div>
    );
  };

  // Get card theme based on rank
  const getCardTheme = (rank?: number) => {
    if (!rank || !showRanking) {
      return {
        cardBg: 'bg-white',
        border: 'border border-neutral-100',
        hoverBorder: 'hover:border-primary/20',
        shadow: 'hover:shadow-lg',
        metricsBg: 'bg-neutral-50', // Regular gray for non-ranked
        metricsTextColor: 'text-neutral-900'
      };
    }
    
    const themes = {
      1: {
        cardBg: 'bg-gradient-to-br from-indigo-50 via-purple-50 to-white',
        border: 'border-2 border-indigo-300',
        hoverBorder: 'hover:border-indigo-400',
        shadow: 'hover:shadow-lg hover:shadow-indigo-300/25',
        metricsBg: 'bg-gradient-to-r from-indigo-100/80 to-purple-100/60', // Elite gradient
        metricsTextColor: 'text-indigo-900'
      },
      2: {
        cardBg: 'bg-gradient-to-br from-cyan-50 via-blue-50 to-white',
        border: 'border-2 border-cyan-200',
        hoverBorder: 'hover:border-cyan-300',
        shadow: 'hover:shadow-lg hover:shadow-cyan-300/25',
        metricsBg: 'bg-gradient-to-r from-cyan-100/80 to-blue-100/60', // Platinum cool tone
        metricsTextColor: 'text-cyan-900'
      },
      3: {
        cardBg: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-white',
        border: 'border-2 border-amber-200',
        hoverBorder: 'hover:border-amber-300',
        shadow: 'hover:shadow-lg hover:shadow-amber-300/25',
        metricsBg: 'bg-gradient-to-r from-amber-100/80 to-yellow-100/60', // Gold warmth
        metricsTextColor: 'text-amber-900'
      }
    };
    
    return themes[rank as keyof typeof themes] || themes[1];
  };

  const theme = getCardTheme(organizer.rank);
  
  const cardClasses = `
    ${theme.cardBg} rounded-xl ${theme.border} ${theme.shadow} ${theme.hoverBorder} 
    transition-all duration-300 relative z-0 overflow-hidden group
    ${className}
  `;

  const imageSize = size === 'compact' ? 'w-12 h-12' : 'w-16 h-16';
  const profileImageSize = size === 'compact' ? '48px' : '64px';

  return (
    <Link 
      href={`/profiles/${organizer.id}`} 
      className={cardClasses}
      onMouseEnter={handlePrefetch}
    >
      {getRankingCornerBadge(organizer.rank)}
      <div className="p-5">
        {/* Header with image and basic info */}
        <div className="flex items-center gap-4 mb-4">
          {/* Profile Image with Ranking Badge */}
          <div className="relative flex-shrink-0">
            {organizer.image ? (
              <div className={`${imageSize} rounded-full overflow-hidden relative ring-2 ring-primary/20 aspect-square`}>
                <Image 
                  src={organizer.image} 
                  alt={organizer.name} 
                  fill 
                  className="object-cover object-center w-full h-full"
                  sizes={profileImageSize}
                />
              </div>
            ) : (
              <div className={`${imageSize} rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-bold text-lg ring-2 ring-primary/20 aspect-square`}>
                {organizer.name.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Ranking Badge on Profile Circle */}
            {getRankingIconBadge(organizer.rank)}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{organizer.name}</p>
            <p className="text-xs text-neutral-500 truncate">{organizer.location}</p>
            {organizer.totalScore && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-2 h-2 text-primary fill-current" />
                <span className="text-xs font-medium text-primary">{Math.round(organizer.totalScore)}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Performance metrics - Events, Followers, and Event Locks */}
        <div className={`${theme.metricsBg} rounded-lg p-3 mb-3 shadow-sm`}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="w-4 h-4 text-primary" />
                <div className={`text-xl font-bold ${theme.metricsTextColor}`}>{organizer.eventsHosted}</div>
              </div>
              <div className={`text-xs font-medium ${theme.metricsTextColor} opacity-80`}>Events</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 mb-1">
                <Users className="w-4 h-4 text-pink-600" />
                <div className={`text-xl font-bold ${theme.metricsTextColor}`}>{organizer.followersCount}</div>
              </div>
              <div className={`text-xs font-medium ${theme.metricsTextColor} opacity-80`}>Followers</div>
            </div>
            {organizer.totalEventLocks !== undefined && (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 mb-1">
                  <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <div className={`text-xl font-bold ${theme.metricsTextColor}`}>{organizer.totalEventLocks}</div>
                </div>
                <div className={`text-xs font-medium ${theme.metricsTextColor} opacity-80`}>Locks</div>
              </div>
            )}
          </div>
        </div>
        
        {/* Bio */}
        <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2">
          {organizer.bio || 'Dedicated event organizer creating memorable experiences.'}
        </p>
        
        {/* View Profile Button - Only shown on Event Details page */}
        {showViewProfile && (
          <div className="mt-4 pt-4 border-t border-neutral-200">
            <div className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 rounded-lg transition-colors border border-neutral-200 font-medium text-sm">
              View Profile
            </div>
          </div>
        )}
        
        {/* Hover effect gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl" />
      </div>
    </Link>
  );
});

// Compact version for lists
export function OrganizerCardCompact({ organizer, showRanking = false, className = '', showViewProfile = false }: Omit<OrganizerCardProps, 'size'>) {
  return (
    <OrganizerCard 
      organizer={organizer} 
      showRanking={showRanking} 
      size="compact" 
      className={className}
      showViewProfile={showViewProfile}
    />
  );
}

export default OrganizerCard;
