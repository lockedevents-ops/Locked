"use client";

import { useState, useEffect, useRef } from 'react';
import "./event-section-scrollbar.css";
import { EventCard } from './EventCard';
import { FeaturedCard } from './FeaturedCard';
import { Calendar } from 'lucide-react';
import { SectionHeading } from '@/components/ui/SectionHeading';
import type { EventData } from '@/services/sharedEventService';

interface OptimizedEventSectionProps {
  title: string;
  viewAllLink: string;
  viewAllText?: string;
  events: EventData[];
  componentType: 'card' | 'featured';
  sectionId?: string;
  eyebrow?: string;
  description?: string;
  horizontalOnMobile?: boolean;
  isLoading?: boolean;
  showRecommendationReasons?: boolean;
}

export function OptimizedEventSection({
  title,
  viewAllLink,
  viewAllText = "View All",
  events,
  componentType,
  sectionId,
  eyebrow,
  description,
  horizontalOnMobile = false,
  isLoading = false,
  showRecommendationReasons = false
}: OptimizedEventSectionProps) {
  // For dot indicator
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Track active card for dot indicator (only when horizontalOnMobile)
  useEffect(() => {
    if (!horizontalOnMobile || !scrollRef.current || events.length === 0) return;
    const container = scrollRef.current;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const children = Array.from(container.children);
          const containerRect = container.getBoundingClientRect();
          let minDiff = Infinity;
          let newIndex = 0;
          children.forEach((child, idx) => {
            const rect = (child as HTMLElement).getBoundingClientRect();
            // Center of card vs center of container
            const diff = Math.abs((rect.left + rect.right) / 2 - (containerRect.left + containerRect.right) / 2);
            if (diff < minDiff) {
              minDiff = diff;
              newIndex = idx;
            }
          });
          setActiveIndex(newIndex);
          ticking = false;
        });
        ticking = true;
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    // Initial set
    handleScroll();
    return () => container.removeEventListener('scroll', handleScroll);
  }, [horizontalOnMobile, events.length]);

  if (isLoading) {
    return (
      <section className="py-12 md:py-16" id={sectionId}>
        <div className="container mx-auto px-4">
          <SectionHeading title={title} eyebrow={eyebrow} description={description} spaced />
          <div
            className={horizontalOnMobile
              ? "flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-4 px-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 md:gap-4 md:overflow-visible md:px-0 md:mx-0"
              : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 auto-rows-auto gap-4"
            }
            style={horizontalOnMobile ? { WebkitOverflowScrolling: 'touch' } : {}}
          >
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={horizontalOnMobile
                  ? "bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm h-72 min-w-[85vw] max-w-xs snap-center animate-pulse md:min-w-0 md:max-w-none"
                  : "bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm h-72 animate-pulse"
                }
              >
                <div className="h-1/2 bg-neutral-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-neutral-200 rounded w-3/4"></div>
                  <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
                  <div className="h-4 bg-neutral-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Empty state
  if (events.length === 0) {
    // Hide Featured Events section completely when empty
    if (title === "Featured Events") {
      return null;
    }
    
    return (
      <section className="py-12 md:py-16" id={sectionId}>
        <div className="container mx-auto px-4">
          <SectionHeading 
            title={title} 
            eyebrow={eyebrow}
            description={description}
            actionHref={viewAllLink}
            actionLabel={viewAllText}
          />
          <div className="text-center py-12 rounded-lg shadow-sm">
            <Calendar className="mx-auto h-16 w-16 text-neutral-300 mb-4" />
            <h3 className="text-xl font-medium mb-2">No {title.toLowerCase()} available</h3>
            <p className="text-neutral-600">Check back later for event listings.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16" id={sectionId}>
      <div className="container mx-auto px-4">
        <SectionHeading 
          title={title} 
          eyebrow={eyebrow}
          description={description}
          actionHref={viewAllLink}
          actionLabel={viewAllText}
        />
        <div>
          <div
            ref={horizontalOnMobile ? scrollRef : undefined}
            className={horizontalOnMobile
              ? "relative flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-4 px-4 overscroll-x-contain md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 md:gap-4 md:overflow-visible md:px-0 md:mx-0 hide-scrollbar"
              : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
            }
            style={horizontalOnMobile ? { WebkitOverflowScrolling: 'touch' } : {}}
          >
            {events.map((event) => (
              componentType === 'featured' ? (
                <div
                  key={event.id}
                  className={horizontalOnMobile ? "relative min-w-[85vw] max-w-xs snap-center md:min-w-0 md:max-w-none" : "relative"}
                >
                  <FeaturedCard {...event} />
                  {showRecommendationReasons && event.recommendationReason && (
                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs py-1 px-2 rounded-full">
                      {event.recommendationReason}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  key={event.id}
                  className={horizontalOnMobile ? "relative min-w-[85vw] max-w-xs snap-center md:min-w-0 md:max-w-none" : "relative"}
                >
                  <EventCard {...event} />
                  {showRecommendationReasons && event.recommendationReason && (
                    <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs py-1 px-2 rounded-full">
                      {event.recommendationReason}
                    </div>
                  )}
                </div>
              )
            ))}
          </div>
          {/* Dot indicator for horizontal scroll on mobile */}
          {horizontalOnMobile && events.length > 1 && (
            <div className="flex justify-center mt-3 md:hidden">
              {events.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-2 w-2 rounded-full mx-1 transition-all duration-200 ${activeIndex === idx ? 'bg-primary scale-125' : 'bg-neutral-300'}`}
                  style={{ display: 'inline-block' }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
