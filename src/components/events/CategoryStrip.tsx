"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FaPalette, FaBriefcase, FaUtensils, FaDumbbell, FaBook, FaUsers, FaEllipsisH, FaGlassCheers } from 'react-icons/fa';
import { HiViewGrid } from 'react-icons/hi';
import { Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client/client';
interface EventData {
  id: string;
  category: string;
  lockCount: number;
  [key: string]: any;
}

// Event category groups - Main categories that group related event types
const EVENT_CATEGORIES = [
  // Special category
  { 
    name: "All", 
    icon: HiViewGrid,
    subcategories: [],
    isSpecial: false,
    colors: {
      bg: "bg-slate-50",
      border: "border-slate-100",
      hoverBorder: "hover:border-slate-300",
      iconBg: "bg-white",
      iconColor: "text-slate-500"
    }
  },
  
  // Top Locked - Special sorting category
  { 
    name: "Trending", 
    icon: Lock,
    subcategories: [],
    isSpecial: true,
    sortBy: 'locks', // Indicator for special handling
    colors: {
      bg: "bg-rose-50",
      border: "border-rose-100",
      hoverBorder: "hover:border-rose-300",
      iconBg: "bg-white",
      iconColor: "text-rose-500"
    }
  },
  
  // Arts & Culture
  { 
    name: "Arts", 
    icon: FaPalette,
    subcategories: ["music", "arts_culture", "theatre", "dance", "film", "traditional"],
    isSpecial: false,
    colors: {
      bg: "bg-fuchsia-50",
      border: "border-fuchsia-100",
      hoverBorder: "hover:border-fuchsia-300",
      iconBg: "bg-white",
      iconColor: "text-fuchsia-500"
    }
  },
  
  // Business & Professional
  { 
    name: "Business", 
    icon: FaBriefcase,
    subcategories: ["business", "corporate", "networking", "career"],
    isSpecial: false,
    colors: {
      bg: "bg-blue-50",
      border: "border-blue-100",
      hoverBorder: "hover:border-blue-300",
      iconBg: "bg-white",
      iconColor: "text-blue-500"
    }
  },
  
  // Lifestyle
  { 
    name: "Lifestyle", 
    icon: FaUtensils,
    subcategories: ["food_drink", "fashion", "beauty", "health_wellness"],
    isSpecial: false,
    colors: {
      bg: "bg-emerald-50",
      border: "border-emerald-100",
      hoverBorder: "hover:border-emerald-300",
      iconBg: "bg-white",
      iconColor: "text-emerald-500"
    }
  },
  
  // Sports & Activities
  { 
    name: "Sports", 
    icon: FaDumbbell,
    subcategories: ["sports_fitness", "gaming", "outdoor", "adventure"],
    isSpecial: false,
    colors: {
      bg: "bg-orange-50",
      border: "border-orange-100",
      hoverBorder: "hover:border-orange-300",
      iconBg: "bg-white",
      iconColor: "text-orange-500"
    }
  },
  
  // Knowledge & Learning
  { 
    name: "Learning", 
    icon: FaBook,
    subcategories: ["technology", "education", "academic", "workshop"],
    isSpecial: false,
    colors: {
      bg: "bg-violet-50",
      border: "border-violet-100",
      hoverBorder: "hover:border-violet-300",
      iconBg: "bg-white",
      iconColor: "text-violet-500"
    }
  },
  
  // Community & Causes
  { 
    name: "Community", 
    icon: FaUsers,
    subcategories: ["community", "charity", "religious", "political"],
    isSpecial: false,
    colors: {
      bg: "bg-cyan-50",
      border: "border-cyan-100",
      hoverBorder: "hover:border-cyan-300",
      iconBg: "bg-white",
      iconColor: "text-cyan-500"
    }
  },
  
  // 18+
  { 
    name: "18+", 
    icon: FaGlassCheers,
    subcategories: ["nightlife", "party", "clubbing", "18+", "adult"],
    isSpecial: true,
    sortBy: 'adult',
    colors: {
      bg: "bg-red-50",
      border: "border-red-100",
      hoverBorder: "hover:border-red-300",
      iconBg: "bg-white",
      iconColor: "text-red-500"
    }
  },
  
  // Other
  { 
    name: "Other", 
    icon: FaEllipsisH,
    subcategories: ["entertainment", "family_kids", "holiday", "other"],
    isSpecial: false,
    colors: {
      bg: "bg-gray-50",
      border: "border-gray-100",
      hoverBorder: "hover:border-gray-300",
      iconBg: "bg-white",
      iconColor: "text-gray-500"
    }
  }
];

interface CategoryStripProps {
  events?: EventData[];
  allEventsCount?: number;
}

export function CategoryStrip({ events = [], allEventsCount }: CategoryStripProps) {
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Calculate category counts from passed events (from sharedEventService)
    const calculateCategoryCounts = () => {
      try {
        // Count events by category group
        const counts: Record<string, number> = {};
        const totalCount = events.length;
        
        // Count events with locks for "Trending" category
        const eventsWithLocks = events.filter((event) => (event.lockCount || 0) > 0);
        counts['Trending'] = eventsWithLocks.length;
        
        events.forEach((event) => {
          const eventCategory = event.category?.toLowerCase() || '';
          
          // Check against each category group
          EVENT_CATEGORIES.forEach((cat) => {
            if (cat.name === 'All' || cat.name === 'Trending') return; 
            
            if (cat.name === '18+') {
              if ((event.ageRestriction && event.ageRestriction >= 18) || (event.isAdult)) {
                counts[cat.name] = (counts[cat.name] || 0) + 1;
              }
              return;
            }

            // Check if event category matches any subcategory in this group
            const matchesGroup = cat.subcategories.some((subcat: string) => {
              const subcatLower = subcat.toLowerCase();
              // Bidirectional matching: event includes subcat OR subcat includes event OR exact match
              return eventCategory.includes(subcatLower) || 
                     subcatLower.includes(eventCategory) ||
                     eventCategory === subcatLower;
            });
            
            if (matchesGroup) {
              counts[cat.name] = (counts[cat.name] || 0) + 1;
            }
          });
        });
        
        // Set "All" count to total
        counts['All'] = totalCount;
        
        setCategoryCounts(counts);
        setIsLoading(false);
      } catch (error) {
        console.error('Error in calculateCategoryCounts:', error);
        setIsLoading(false);
      }
    };
    
    // Only calculate when events are available
    if (events.length > 0) {
      calculateCategoryCounts();
    } else {
      // Set loading to false even if no events
      setIsLoading(false);
    }
  }, [events]);
  
  // ✅ REALTIME: Subscribe to lock count updates to recalculate trending count
  useEffect(() => {
    if (!events.length) return;
    
    const eventIds = events.map((e: EventData) => e.id);
    const supabase = createClient();
    
    const channel = supabase
      .channel('category-lock-counts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=in.(${eventIds.join(',')})`,
        },
        (payload: any) => {
          // Recalculate category counts when any event's lock count changes
          console.log('[CategoryStrip] Realtime lock count update, recalculating counts');
          
          // Update the event in our local state
          const { id, lock_count } = payload.new as { id: string; lock_count: number };
          
          // Trigger recalculation by updating trending count
          const eventsWithLocks = events.filter((event: EventData) => 
            event.id === id ? (lock_count || 0) > 0 : (event.lockCount || 0) > 0
          );
          
          setCategoryCounts(prev => ({
            ...prev,
            'Trending': eventsWithLocks.length
          }));
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [events.length]);
  
  // Check scroll position and update button states
  const updateScrollButtons = () => {
    if (!containerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };
  
  // Check if scrolling is needed (tablet size)
  useEffect(() => {
    const checkScrollNeeded = () => {
      if (!containerRef.current) return;
      
      const { scrollWidth, clientWidth } = containerRef.current;
      const isScrollable = scrollWidth > clientWidth;
      
      // Show buttons only on tablet sizes (md to lg breakpoint)
      const isTabletSize = window.innerWidth >= 768 && window.innerWidth < 1024;
      setShowScrollButtons(isScrollable && isTabletSize);
      
      if (isScrollable && isTabletSize) {
        updateScrollButtons();
      }
    };
    
    checkScrollNeeded();
    window.addEventListener('resize', checkScrollNeeded);
    
    return () => window.removeEventListener('resize', checkScrollNeeded);
  }, [categoryCounts]);
  
  // Handle scroll
  const handleScroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    
    const scrollAmount = 280; // Approximate width of 2-3 cards
    const newScrollLeft = direction === 'left' 
      ? containerRef.current.scrollLeft - scrollAmount
      : containerRef.current.scrollLeft + scrollAmount;
    
    containerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
    
    // Update button states after scroll
    setTimeout(updateScrollButtons, 300);
  };
  
  // Get count for a specific category
  const getCategoryCount = (categoryName: string): number => {
    return categoryCounts[categoryName] || 0;
  };

  return (
    <div className="py-4">
      <div className="relative">
        {/* Left scroll button - visible only on tablet */}
        {showScrollButtons && canScrollLeft && (
          <button
            onClick={() => handleScroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 hover:bg-white shadow-lg rounded-full p-2 transition-all duration-200 hover:scale-110 cursor-pointer"
            aria-label="Scroll left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-neutral-700">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}
        
        {/* Right scroll button - visible only on tablet */}
        {showScrollButtons && canScrollRight && (
          <button
            onClick={() => handleScroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/95 hover:bg-white shadow-lg rounded-full p-2 transition-all duration-200 hover:scale-110 cursor-pointer"
            aria-label="Scroll right"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-neutral-700">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )}
        
        {/* Desktop: Flex with proper spacing to fit all items in one row, Mobile/Tablet: Horizontal scroll */}
        <div
          ref={containerRef}
          onScroll={updateScrollButtons}
          className="
            flex gap-3 py-2
            lg:gap-3
            overflow-x-auto lg:overflow-x-visible
            scroll-smooth no-scrollbar
            -mx-2 px-2 lg:mx-0 lg:px-0
          "
          style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {EVENT_CATEGORIES.map((category) => {
            const IconComponent = category.icon;
            const eventCount = isLoading ? '...' : getCategoryCount(category.name);
            
            // Link to discover page with appropriate filter
            let href = '/pages/discover';
            if (category.name === 'All') {
              href = '/pages/discover';
            } else if (category.name === 'Trending') {
              // Sort by lock count (highest to lowest)
              href = '/pages/discover?sortByLocks=true';
            } else {
              // Category filter
              href = `/pages/discover?category=${encodeURIComponent(category.name)}`;
            }
            
            // Custom display text for Trending
            const displayText = category.name === 'Trending' 
              ? 'Most Locked' 
              : isLoading 
                ? '...' 
                : `${eventCount} ${eventCount === 1 ? 'Event' : 'Events'}`;
              
            return (
              <Link
                key={category.name}
                href={href}
                className={`
                  flex-shrink-0 w-28 lg:flex-1 lg:min-w-0
                  p-3 rounded-2xl shadow-sm border
                  hover:-translate-y-1.5 hover:shadow-md
                  transition-all duration-300 ease-out group
                  ${category.colors.bg}
                  ${category.colors.border}
                  ${category.colors.hoverBorder}
                `}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors duration-300 ${category.colors.iconBg}`}>
                    <IconComponent className={`w-5 h-5 group-hover:scale-110 transition-transform duration-300 ${category.colors.iconColor}`} />
                  </div>
                  <span className="font-medium text-sm text-neutral-900 group-hover:text-neutral-900 transition-colors duration-300 leading-tight line-clamp-2">
                    {category.name}
                  </span>
                  <span className="text-xs text-neutral-500 group-hover:text-neutral-600 transition-colors duration-300">
                    {displayText}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
