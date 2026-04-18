"use client";

import { useState, useEffect, useRef } from 'react';
import { EventCard } from '@/components/events/EventCard';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { Calendar, ChevronDown } from 'lucide-react';
import { sharedEventService, EventData, isEventLive } from '@/services/sharedEventService';
import Link from 'next/link';

interface UpcomingEventsProps {
  initialEvents: EventData[];
  excludedEventIds?: Set<string>;
  isLoading?: boolean;
}

type TimeFilter = 'all' | 'live' | 'today' | 'tomorrow' | 'this-week' | 'next-week';

const filterOptions: { value: TimeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this-week', label: 'This Week' },
  { value: 'next-week', label: 'Next Week' },
];



export function UpcomingEvents({
  initialEvents,
  excludedEventIds,
  isLoading: initialLoading = false
}: UpcomingEventsProps) {
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('all');
  const [events, setEvents] = useState<EventData[]>(initialEvents);
  const [displayedEvents, setDisplayedEvents] = useState<EventData[]>(initialEvents);
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [hasLoadedMore, setHasLoadedMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch events based on filter
  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true);
      setHasLoadedMore(false); // Reset load more state when filter changes
      try {
        // For "All" filter, we need to fetch both live and upcoming events
        if (activeFilter === 'all') {
          const [liveEvents, upcomingEvents] = await Promise.all([
            sharedEventService.getLiveEvents(4, excludedEventIds),
            sharedEventService.getUpcomingEvents(20, excludedEventIds, 'all') // Fetch 20 (15 + 5 for load more)
          ]);
          // Combine and sort by start date
          const combinedEvents = [...liveEvents, ...upcomingEvents]
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .slice(0, 20); // Keep up to 20 events
          setEvents(combinedEvents);
          setDisplayedEvents(combinedEvents.slice(0, 15)); // Show first 15
        } else {
          const filteredEvents = await sharedEventService.getUpcomingEvents(
            20, // Fetch 20 (15 + 5 for load more)
            excludedEventIds,
            activeFilter
          );
          setEvents(filteredEvents);
          setDisplayedEvents(filteredEvents.slice(0, 15)); // Show first 15
        }
      } catch (error) {
        console.error('Error loading upcoming events:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [activeFilter, excludedEventIds]);

  // Track active card for dot indicator
  useEffect(() => {
    if (!scrollRef.current || displayedEvents.length === 0) return;
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
  }, [displayedEvents.length]);

  // Handle load more button click
  const handleLoadMore = () => {
    setDisplayedEvents(events.slice(0, 20)); // Show all 20 events (15 + 5)
    setHasLoadedMore(true);
  };

  // Check if there are more events to load
  const hasMoreEvents = events.length > displayedEvents.length;

  if (isLoading) {
    return (
      <section className="py-12 md:py-16" id="upcoming-events">
        <div className="container mx-auto px-4">
          <SectionHeading 
            title="Upcoming Events"
            eyebrow="Don't Miss" 
            description="Fresh events happening soon across Ghana." 
          />
          
          {/* Filter Tabs Skeleton */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 hide-scrollbar">
            {filterOptions.map((_, i) => (
              <div key={i} className="px-4 py-2 rounded-full bg-neutral-200 animate-pulse h-10 min-w-[80px]" />
            ))}
          </div>

          {/* Events Grid Skeleton */}
          {/* Events Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm h-72 animate-pulse">
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

  if (displayedEvents.length === 0) {
    return (
      <section className="py-12 md:py-16" id="upcoming-events">
        <div className="container mx-auto px-4">
          <SectionHeading 
            title="Upcoming Events"
            eyebrow="Don't Miss" 
            description="Fresh events happening soon across Ghana." 
          />
          
          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 hide-scrollbar">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setActiveFilter(option.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeFilter === option.value
                    ? 'bg-primary text-white shadow-md'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="text-center py-12 rounded-lg shadow-sm">
            <Calendar className="mx-auto h-16 w-16 text-neutral-300 mb-4" />
            <p className="text-neutral-500">
              {activeFilter === 'live' 
                ? 'No events happening right now' 
                : activeFilter === 'all' 
                  ? 'No upcoming events available' 
                  : `No events ${activeFilter === 'today' ? 'happening today' : activeFilter === 'tomorrow' ? 'scheduled for tomorrow' : activeFilter === 'this-week' ? 'this week' : 'next week'}`
              }
            </p>
            <p className="text-sm text-neutral-400 mt-2">Check back soon for new events!</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16" id="upcoming-events">
      <div className="container mx-auto px-4">
        <SectionHeading 
          title="Upcoming Events"
          eyebrow="Don't Miss" 
          description="Explore what's happening now and coming soon across Ghana." 
        />
        
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 hide-scrollbar">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setActiveFilter(option.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === option.value
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Events Grid */}
        {/* Events Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {displayedEvents.map((event) => {
            const isLive = isEventLive(event);
            return (
              <div key={event.id} className="relative">
                {isLive && (
                  <>
                    {/* Colored background gradient for live events */}
                    <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg -z-10" />
                  </>
                )}
                <EventCard {...event} />
              </div>
            );
          })}
        </div>

        {/* Load More / View More Button */}
        {hasMoreEvents && !hasLoadedMore && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleLoadMore}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors shadow-md hover:shadow-lg cursor-pointer"
            >
              <ChevronDown className="h-5 w-5" />
              Load More Events
            </button>
          </div>
        )}
        
        {hasLoadedMore && (
          <div className="mt-8 flex justify-center">
            <Link 
              href="/pages/discover"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors shadow-md hover:shadow-lg"
            >
              View More Events
              <ChevronDown className="h-5 w-5 rotate-[-90deg]" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
