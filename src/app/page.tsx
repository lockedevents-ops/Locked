
"use client";

import { useEffect, useState } from "react";
import { HeroSection } from "@/components/layouts/HeroSection";
import { CategoryStrip } from "@/components/events/CategoryStrip";
import { PreferencesButton } from '@/components/home/PreferencesButton';
import { RecommendedEvents } from '@/components/events/RecommendedEvents';
import { LiveEvents } from '@/components/events/LiveEvents';
import { UpcomingEvents } from '@/components/events/UpcomingEvents';
import { OptimizedEventSection } from '@/components/events/EventSection';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { TrustSection } from '@/components/home/TrustSection';
import { TrustedByCarousel } from '@/components/home/TrustedByCarousel';
import { VenueSection } from '@/components/home/VenueSection';
import { TopOrganizersSection } from '@/components/home/TopOrganizersSection';
import { useHomepageEvents } from '@/hooks/useHomepageEvents';
import { PageLoader } from '@/components/loaders/PageLoader';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import { isVenuesEnabled } from '@/lib/network';

// ✅ PHASE 3: Dynamic imports for below-fold components
import { 
  DynamicStatisticsShowcase,
  DynamicCTASection 
} from '@/lib/dynamicComponents';

// ✅ PHASE 1 OPTIMIZATION: Homepage Events component with loading states
function HomepageEvents({ onReady }: { onReady?: () => void }) {
  const { eventData, isLoading, error } = useHomepageEvents();

  useEffect(() => {
    if (!isLoading) {
      onReady?.();
    }
  }, [isLoading, onReady]);
  
  // Show skeleton while loading
  if (isLoading) {
    return null;
  }
  
  // Show error state if fetch failed AND no cached data
  if (error && eventData.featuredEvents.length === 0 && eventData.upcomingEvents.length === 0) {
    return (
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="text-center py-12 bg-red-50 rounded-lg border border-red-200">
            {/* Broken WiFi Icon */}
            <svg className="mx-auto h-16 w-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Events</h3>
            <p className="text-gray-700 mb-2">We're having trouble connecting to our servers.</p>
            <p className="text-sm text-gray-600 mb-6">Please check your internet connection and try again.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Page
            </button>
          </div>
        </div>
      </section>
    );
  }
  
  return (
    <>
      {/* Featured Events - combines trending and promoted events */}
      <OptimizedEventSection
        title="Featured Events"
        eyebrow="Most Popular"
        description="Events gaining the most interest and interaction this week."
        viewAllLink="/pages/discover"
        viewAllText="View All Featured"
        events={eventData.featuredEvents}
        componentType="featured"
        horizontalOnMobile
        isLoading={isLoading}
      />
      {/* Live Events - currently happening */}
      {/* Commented out - using Live filter in Upcoming Events section instead */}
      {/* <LiveEvents 
        events={eventData.liveEvents}
        isLoading={isLoading}
      /> */}
      
      {/* Category Strip with SectionHeading above */}
      <section className="pt-12 md:pt-16">
        <div className="container mx-auto px-4">
          <SectionHeading
            title="Browse by Category"
            eyebrow="Explore"
            description="Dive into event categories to quickly find what matches your interests."
            actionHref="/pages/discover"
            actionLabel="Browse All"
          />
          <CategoryStrip 
            events={[
              ...eventData.featuredEvents,
              ...eventData.trendingEvents,
              ...eventData.liveEvents,
              ...eventData.upcomingEvents,
              ...eventData.recommendedEvents
            ].filter((event, index, self) => 
              // Remove duplicates by id
              index === self.findIndex((e) => e.id === event.id)
            )}
          />
        </div>
      </section>

      {/* Upcoming (with filters) */}
      <UpcomingEvents
        initialEvents={eventData.upcomingEvents}
        isLoading={isLoading}
      />

      {/* Personalized (only if authenticated) - horizontal scroll on mobile */}
      <RecommendedEvents 
        events={eventData.recommendedEvents}
        isLoading={isLoading}
      />
    </>
  );
}

export default function Home() {
  // ✅ SESSION MANAGEMENT: Prevent session expiration on homepage
  useSessionManagement();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const search = window.location.search;
    if (!search) return;

    const params = new URLSearchParams(search);
    const hasAuthCode = params.has('code') || params.has('access_token');
    if (!hasAuthCode) return;

    const next = params.get('next');
    const callbackTarget = next
      ? `/auth/callback${search}`
      : `/auth/callback${search}${search.includes('?') ? '&' : '?'}next=/`;

    window.location.replace(callbackTarget);
  }, []);

  const venuesEnabled = isVenuesEnabled();
  const [eventsReady, setEventsReady] = useState(false);
  const [organizersReady, setOrganizersReady] = useState(false);
  const [venuesReady, setVenuesReady] = useState(!venuesEnabled);
  const [forceShowContent, setForceShowContent] = useState(false);

  const isHomepageReady = eventsReady && organizersReady && venuesReady;
  const shouldShowContent = isHomepageReady || forceShowContent;

  useEffect(() => {
    if (isHomepageReady) {
      return;
    }

    const timer = window.setTimeout(() => {
      setForceShowContent(true);
    }, 4000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isHomepageReady]);

  return (
    <div className="min-h-screen">
      {/* Hero with integrated trust section */}
      <HeroSection />

      {!shouldShowContent && <PageLoader fullHeight />}

      <div className={shouldShowContent ? '' : 'opacity-0 pointer-events-none h-0 overflow-hidden'} aria-hidden={!shouldShowContent}>
        <HomepageEvents onReady={() => setEventsReady(true)} />

        {/* Trusted Brands Carousel */}
        <TrustedByCarousel />

        <TopOrganizersSection onReady={() => setOrganizersReady(true)} />

        {/* Venue surface intentionally frozen behind feature flag. */}
        {venuesEnabled && <VenueSection onReady={() => setVenuesReady(true)} />}
      </div>
      
      {/* Personalization Benefits */}
      {/* <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <SectionHeading
            title="Your Events, Your Way"
            eyebrow="Personalization"
            description="Tools that adapt the platform to your preferences."
          />
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-gray-50 rounded-xl hover:shadow-md transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Smart Recommendations</h3>
              <p className="text-neutral-600 text-sm">Get suggestions aligned with your behavior and saved interests.</p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-xl hover:shadow-md transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Interest Categories</h3>
              <p className="text-neutral-600 text-sm">Follow what matters and never miss new additions.</p>
            </div>
            <div className="text-center p-6 bg-gray-50 rounded-xl hover:shadow-md transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Price Alerts</h3>
              <p className="text-neutral-600 text-sm">Enable alerts for early bird tickets & limited offers.</p>
            </div>
          </div>
          <div className="mt-10 text-center"><PreferencesButton /></div>
        </div>
      </section> */}

      {/* Trust, Safety & Differentiators */}
      {/* <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <SectionHeading
            title="Why Use Locked"
            eyebrow="Trust • Value • Innovation"
            description="A modern Ghana events platform blending security, transparency, social proof and community voting."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 text-sm md:text-base">
            {[
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                ),
                title: 'Secure Access',
                text: 'Role-based permissions, protected auth flows & integrity around critical actions.'
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                ),
                title: 'Verified Organizers',
                text: 'Approval & KYC style checks elevate quality and reduce spam or low‑effort listings.'
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M3 4h18" />
                    <path d="M3 10h18" />
                    <path d="M3 16h18" />
                    <path d="M8 4v16" />
                  </svg>
                ),
                title: 'Transparent Listings',
                text: 'Clear statuses (featured, trending, upcoming), pricing signals & consistent UX components.'
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M12 20l9-5-9-5-9 5 9 5z" />
                    <path d="M12 10l9-5-9-5-9 5 9 5z" />
                  </svg>
                ),
                title: 'Event Voting',
                text: 'Native voting mechanics to crowd‑surface the most anticipated & community‑backed events.'
              },
              {
                icon: (
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M20 6l-11 11-5-5" />
                    <path d="M4 21h16" />
                  </svg>
                ),
                title: 'Community Feedback',
                text: 'Engagement metrics (locks, views, ratings) guide discovery & elevate trustworthy hosts.'
              },
            ].map((item, i) => (
              <div
                key={i}
                className="group relative bg-white rounded-2xl p-5 border border-neutral-100 hover:border-primary/30 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
                <div className="flex items-start gap-3 mb-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary flex items-center justify-center group-hover:from-primary/25 group-hover:to-primary/10 transition-colors">
                    {item.icon}
                  </div>
                  <h3 className="font-semibold text-base md:text-lg leading-tight pr-4">{item.title}</h3>
                </div>
                <p className="text-xs md:text-sm text-neutral-600 leading-relaxed">
                  {item.text}
                </p>
                <div className="mt-4 flex items-center gap-1 text-[11px] font-medium text-primary/70 group-hover:text-primary transition-colors">
                  <span>Learn more</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
                </div>
                <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-primary/5 group-hover:bg-primary/10 blur-xl transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Platform Stats */}
      {/* ✅ PHASE 3: Dynamically loaded - reduces initial bundle */}
      <DynamicStatisticsShowcase />

      {/* Final CTA */}
      {/* ✅ PHASE 3: Dynamically loaded - reduces initial bundle */}
      <DynamicCTASection />
    </div>
  );
}
