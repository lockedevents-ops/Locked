"use client";

import { useState, useEffect, useRef } from 'react';
import { EventCard } from '@/components/events/EventCard';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { EventData } from '@/services/sharedEventService';

interface LiveEventsProps {
  events: EventData[];
  isLoading?: boolean;
}

export function LiveEvents({
  events,
  isLoading = false
}: LiveEventsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track active card for dot indicator
  useEffect(() => {
    if (!scrollRef.current || events.length === 0) return;
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
    handleScroll();
    return () => container.removeEventListener('scroll', handleScroll);
  }, [events.length]);

  if (isLoading) {
    return (
      <section className="py-12 md:py-16 bg-gradient-to-r from-red-50 to-orange-50">
        <div className="container mx-auto px-4">
          <SectionHeading 
            title="Live Events"
            eyebrow="🔴 Happening Now"
            description="Events that are currently ongoing right now." 
            actionHref="/pages/discover" 
            actionLabel="View All" 
            spaced 
          />
          
          {/* Horizontal scroll skeleton on mobile, grid on desktop */}
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-4 px-4 md:grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 md:gap-6 md:overflow-visible md:px-0 md:mx-0">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-red-200 overflow-hidden shadow-sm h-72 min-w-[85vw] max-w-xs snap-center animate-pulse md:min-w-0 md:max-w-none">
                <div className="h-1/2 bg-neutral-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
                  <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
                  <div className="h-3 bg-neutral-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Hide section if no live events
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="py-12 md:py-16 bg-gradient-to-r from-red-50 to-orange-50">
      <div className="container mx-auto px-4">
        <SectionHeading 
          title="Live Events"
          eyebrow="🔴 Happening Now"
          description="Events that are currently ongoing right now." 
          actionHref="/pages/discover" 
          actionLabel="View All" 
        />
        
        <div>
          {/* Horizontal scroll on mobile, grid on desktop */}
          <div
            ref={scrollRef}
            className="relative flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-4 px-4 overscroll-x-contain md:grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 md:gap-6 md:overflow-visible md:px-0 md:mx-0 hide-scrollbar"
          >
            {events.map((event) => (
              <div key={event.id} className="relative min-w-[85vw] max-w-xs snap-center md:min-w-0 md:max-w-none">
                <EventCard {...event} />
              </div>
            ))}
          </div>
          
          {/* Dot indicator for horizontal scroll on mobile */}
          {events.length > 1 && (
            <div className="flex justify-center mt-3 md:hidden">
              {events.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-2 w-2 rounded-full mx-1 transition-all duration-200 ${
                    activeIndex === idx ? 'bg-red-500 scale-125' : 'bg-neutral-300'
                  }`}
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
