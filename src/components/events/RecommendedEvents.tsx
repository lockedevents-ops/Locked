"use client";

import { useState, useEffect, useRef } from 'react';
import "./event-section-scrollbar.css";
import { useAuth } from '@/contexts/AuthContext';
import { EventCard } from './EventCard';
import { SectionHeading } from '@/components/ui/SectionHeading';
import type { EventData } from '@/services/sharedEventService';

interface RecommendedEventsProps {
  events: EventData[];
  isLoading?: boolean;
}

export function RecommendedEvents({
  events,
  isLoading = false
}: RecommendedEventsProps) {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  // For dot indicator
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track active card for dot indicator (only on mobile/horizontal scroll)
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

  if (!isAuthenticated) {
    return null; // Don't show section if user is not authenticated
  }

  if (isLoading) {
    return (
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <SectionHeading 
            title="You Might Like"
            eyebrow="Personalized Picks" 
            description="Events tailored to your interests, activity, and recent views." 
            spaced 
          />
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-4 px-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 md:gap-4 md:overflow-visible md:px-0 md:mx-0">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm h-72 min-w-[85vw] max-w-xs snap-center animate-pulse md:min-w-0 md:max-w-none">
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

  if (events.length === 0) {
    // Hide the section completely if user has no personalized recommendations
    return null;
  }

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <SectionHeading 
          title="You Might Like"
          eyebrow="Personalized Picks" 
          description="Events tailored to your interests, activity, and recent views." 
          actionHref="/pages/discover" 
          actionLabel="See More" 
        />
        <div>
          <div
            ref={scrollRef}
            className="relative flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-4 px-4 overscroll-x-contain md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 md:gap-4 md:overflow-visible md:px-0 md:mx-0 hide-scrollbar"
          >
            {events.map((event) => (
              <div key={event.id} className="relative min-w-[85vw] max-w-xs snap-center md:min-w-0 md:max-w-none">
                <EventCard {...event} />
                {event.recommendationReason && (
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs py-1 px-2 rounded-full">
                    {event.recommendationReason}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Dot indicator for horizontal scroll on mobile */}
          {events.length > 1 && (
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
