"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Trophy, Users } from "lucide-react";
import { OrganizerCard } from '@/components/organizers/OrganizerCard';
import { PageLoader } from '@/components/loaders/PageLoader';

export function TopOrganizersSection({ onReady }: { onReady?: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadHookAndData = async () => {
      try {
        // Import both the service and hook
        const [{ topOrganizersService }] = await Promise.all([
          import('@/services/topOrganizersService')
        ]);
        
        // Fetch top organizers using the service directly
        const topOrganizersData = await topOrganizersService.getTopOrganizers({
          limit: 3, // Show only top 3 on homepage
          includeUnverified: true, // Include unverified organizers to show more results
          weights: {
            events: 0.7,   // 70% weight for events hosted
            locked: 0.0,   // 0% weight for locked events (not used)
            bookings: 0.3  // 30% weight for followers/engagement
          }
        });
        
        // Transform data for the existing UI component
        const transformedOrganizers = topOrganizersData.map((organizer, index) => ({
          id: organizer.organizer_id,
          name: organizer.name,
          image: organizer.profile_image || '',
          location: organizer.location || 'Ghana',
          bio: organizer.bio,
          verified: organizer.verification_status === 'active', // Add verified field
          verificationStatus: organizer.verification_status,
          // Include performance metrics
          eventsHosted: organizer.events_hosted,
          followersCount: organizer.followers_count || 0,
          totalEventLocks: organizer.total_event_locks || 0, // Add total event locks
          totalScore: Math.round(organizer.total_score),
          rank: index + 1
        }));
        
        setOrganizers(transformedOrganizers);
      } catch (e) {
        console.error('Error fetching top organizers:', e);
        setOrganizers([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadHookAndData();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      onReady?.();
    }
  }, [isLoading, onReady]);

  // Dot indicator logic for horizontal scroll
  useEffect(() => {
    if (!scrollRef.current || organizers.length === 0) return;
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
  }, [organizers.length]);

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        {/* Section header with left alignment */}
        <div className="text-left mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary uppercase tracking-wide">Top Performers</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Leading Event Organizers
              </h2>
              <p className="text-gray-600 max-w-2xl">
                Discover the most successful event organizers in Ghana, ranked by events hosted and community engagement.
              </p>
            </div>
            <Link 
              href="/pages/organizers"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors whitespace-nowrap"
            >
              View All
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
        {isLoading ? (
          <PageLoader />
        ) : organizers.length === 0 ? (
          <div className="text-center py-12 rounded-lg shadow-sm">
            <Users className="mx-auto h-16 w-16 text-neutral-300 mb-4" />
            <h3 className="text-xl font-medium mb-2">No Organizers Available</h3>
            <p className="text-neutral-600">Check back later for top organizers.</p>
          </div>
        ) : (
          <div>
            <div
              ref={scrollRef}
              className="relative flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-4 px-4 overscroll-x-contain md:grid md:grid-cols-3 md:gap-8 md:overflow-visible md:px-0 md:mx-0 hide-scrollbar"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {organizers.map((organizer) => (
                <OrganizerCard 
                  key={organizer.id}
                  organizer={organizer}
                  showRanking={true}
                  className={organizers.length === 1 ? "w-full snap-center md:w-full" : "min-w-[85vw] max-w-xs snap-center md:min-w-0 md:max-w-none md:w-full"}
                />
              ))}
            </div>
            {/* Dot indicator for horizontal scroll on mobile */}
            {organizers.length > 1 && (
              <div className="flex justify-center mt-3 md:hidden">
                {organizers.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-2 w-2 rounded-full mx-1 transition-all duration-200 ${activeIndex === idx ? 'bg-primary scale-125' : 'bg-neutral-300'}`}
                    style={{ display: 'inline-block' }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
