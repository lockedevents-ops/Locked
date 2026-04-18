/**
 * DiscoverHero Component
 * --------------------------------------------------------------
 * Dynamic hero section for discover page that changes based on context.
 * Optimized with useMemo to prevent unnecessary re-renders.
 */

import React, { useMemo } from 'react';
import { formatCategoryForDisplay } from '@/utils/eventUtils';

interface DiscoverHeroProps {
  isVotingMode?: boolean;
  isAdultMode?: boolean;
  category?: string;
  location?: string;
  freeOnly?: boolean;
  hasMerch?: boolean;
  isFeatured?: boolean;
  eventType?: 'all' | 'online' | 'in-person';
  isTrending?: boolean;
}



// ✅ Performance: Memoize hero config to prevent recalculation
const useHeroConfig = (
  isVotingMode: boolean, 
  isAdultMode: boolean,
  category?: string,
  location?: string,
  freeOnly?: boolean,
  hasMerch?: boolean,
  isFeatured?: boolean,
  eventType?: 'all' | 'online' | 'in-person',
  isTrending?: boolean
) => {
  return useMemo(() => {
    // Build dynamic title based on active filters
    const buildDynamicTitle = (): string => {
      const parts: string[] = [];
      
      // Add category if set
      if (category) {
        parts.push(formatCategoryForDisplay(category));
      }
      
      // Add event type modifier
      if (eventType === 'online') {
        parts.push('Online');
      } else if (eventType === 'in-person') {
        parts.push('In-Person');
      }
      
      // Add special filter modifiers (mutually exclusive usually)
      if (freeOnly) {
        parts.push('Free');
      }
      if (isFeatured) {
        parts.push('Featured');
      }
      
      // Add trending modifier
      if (isTrending) {
        parts.push('Trending');
      }
      
      // Build the title
      let title = parts.length > 0 ? `${parts.join(' ')} Events` : 'All Events';
      
      // Add "with Merchandise" after "Events" for proper grammar
      if (hasMerch) {
        title = title === 'All Events' ? 'Events with Merchandise' : `${title} with Merchandise`;
      }
      
      // Add location suffix
      if (location) {
        title += ` in ${location}`;
      }
      
      return title;
    };
    
    // Trending mode
    if (isTrending && !category && !location) {
      return {
        title: "Trending Events",
        description: "Discover the most popular and highly anticipated events that everyone is locking right now. Don't miss out on what's buzzing!",
        backgroundImage: "/hero_backgrounds/discover-hero.jpg", // TBD: Maybe a dedicated trending image
        gradientOverlay: "bg-gradient-to-r from-orange-900/80 via-amber-900/70 to-yellow-900/60",
        accentColor: "text-amber-200"
      };
    }

    // 18+ mode takes precedence
    if (isAdultMode) {
      let title = "18+ Events";
      if (location) title += ` in ${location}`;
      if (category && category !== '18+') title = `${formatCategoryForDisplay(category)} ${title}`;
      
      return {
        title,
        description: "Discover exclusive adult-oriented events including nightlife, mature entertainment, and sophisticated gatherings. These events are restricted to attendees 18 years and older.",
        backgroundImage: "/hero_backgrounds/adults-hero.jpg",
        gradientOverlay: "bg-gradient-to-r from-red-900/80 via-pink-900/70 to-purple-900/80",
        accentColor: "text-red-200"
      };
    }
    
    // Voting mode
    if (isVotingMode) {
      let title = "Events with Voting";
      if (location) title += ` in ${location}`;
      if (category) title = `${formatCategoryForDisplay(category)} ${title}`;
      
      return {
        title,
        description: "Make your voice heard! Discover events with live voting and help decide the winners. Cast your votes for contestants in music competitions, talent shows, and community events across Ghana.",
        backgroundImage: "/hero_backgrounds/discover-hero-vote.jpg",
        gradientOverlay: "bg-gradient-to-r from-purple-900/80 via-indigo-900/70 to-blue-900/80",
        accentColor: "text-purple-300"
      };
    }
    
    // Default with dynamic title
    const dynamicTitle = buildDynamicTitle();
    
    // Build dynamic description
    let description = "Discover exciting events happening in Ghana and across Africa.";
    if (category) {
      description = `Explore ${formatCategoryForDisplay(category).toLowerCase()} events, festivals, and gatherings.`;
    }
    if (location) {
      description += ` Find the best happenings in ${location}.`;
    } else {
      description += " Explore music festivals, cultural gatherings, tech summits, and networking opportunities tailored for every interest.";
    }
    
    return {
      title: dynamicTitle,
      description,
      backgroundImage: "/hero_backgrounds/discover-hero.jpg",
      gradientOverlay: "bg-black/70",
      accentColor: "text-white/80"
    };
  }, [isVotingMode, isAdultMode, category, location, freeOnly, hasMerch, isFeatured, eventType, isTrending]);
};

// ✅ Performance: Memoize entire component
export const DiscoverHero = React.memo(({ 
  isVotingMode = false, 
  isAdultMode = false,
  category,
  location,
  freeOnly,
  hasMerch,
  isFeatured,
  eventType,
  isTrending
}: DiscoverHeroProps) => {
  const config = useHeroConfig(isVotingMode, isAdultMode, category, location, freeOnly, hasMerch, isFeatured, eventType, isTrending);
  
  return (
    <div
      className="relative text-white py-16 rounded-b-[2rem] md:rounded-b-none overflow-hidden"
      style={{
        backgroundImage: `url(${config.backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      {/* Overlay with dynamic gradient */}
      <div className={`absolute inset-0 ${config.gradientOverlay}`} />
      
      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <h1 className="text-3xl font-bold mb-2 mt-24">
          {config.title}
        </h1>
        <p className={`${config.accentColor} max-w-2xl`}>
          {config.description}
        </p>
        
        {/* Optional: Add voting badge when in voting mode */}
        {isVotingMode && (
          <div className="mt-4 inline-flex items-center gap-2 bg-purple-600/30 backdrop-blur-sm px-4 py-2 rounded-full border border-purple-400/50">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className="w-5 h-5 text-purple-300"
            >
              <path d="M7.493 18.75c-.425 0-.82-.236-.975-.632A7.48 7.48 0 016 15.375c0-1.75.599-3.358 1.602-4.634.151-.192.373-.309.6-.397.473-.183.89-.514 1.212-.924a9.042 9.042 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23h-.777zM2.331 10.977a11.969 11.969 0 00-.831 4.398 12 12 0 00.52 3.507c.26.85 1.084 1.368 1.973 1.368H4.9c.445 0 .72-.498.523-.898a8.963 8.963 0 01-.924-3.977c0-1.708.476-3.305 1.302-4.666.245-.403-.028-.959-.5-.959H4.25c-.832 0-1.612.453-1.918 1.227z" />
            </svg>
            <span className="text-sm font-medium text-purple-200">
              Voting Events Only
            </span>
          </div>
        )}
        
        {/* Optional: Add 18+ badge when in adult mode */}
        {isAdultMode && (
          <div className="mt-4 inline-flex items-center gap-2 bg-red-600/30 backdrop-blur-sm px-4 py-2 rounded-full border border-red-400/50">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className="w-5 h-5 text-red-300"
            >
              <path fillRule="evenodd" d="M12 1.5a.75.75 0 01.75.75V4.5a.75.75 0 01-1.5 0V2.25A.75.75 0 0112 1.5z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M5.636 4.136a.75.75 0 011.06 0l1.595 1.595a.75.75 0 01-1.06 1.06L5.636 5.197a.75.75 0 010-1.06z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M1.5 12a.75.75 0 01.75-.75h2.25a.75.75 0 010 1.5H2.25A.75.75 0 011.5 12z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M4.136 18.364a.75.75 0 011.06 0l1.595-1.596a.75.75 0 011.061 1.061l-1.596 1.595a.75.75 0 01-1.06-1.06z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M12 16.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9zm0-1.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M19.5 12a.75.75 0 01.75-.75h2.25a.75.75 0 010 1.5H20.25A.75.75 0 0119.5 12z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M18.364 4.136a.75.75 0 010 1.06l-1.596 1.596a.75.75 0 01-1.06-1.061l1.595-1.595a.75.75 0 011.061 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-red-200">
              18+ Events Only
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

DiscoverHero.displayName = 'DiscoverHero';
