"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { EventDetails } from '@/components/events/EventDetails';
import { TicketCard } from '@/components/events/TicketCard';
import { EventHero } from '@/components/events/EventHero';
import { GalleryCarousel } from '@/components/events/GalleryCarousel';
import { isUUID } from '@/utils/slugify';
import { PageLoader } from '@/components/loaders/PageLoader';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import { WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { UnifiedCheckoutModal } from '@/components/events/UnifiedCheckoutModal';
import { sharedEventService } from '@/services/sharedEventService';
import { requestCache } from '@/lib/requestCache';
import { useLockStore } from '@/store/lockStore';

// Default event data as fallback
const defaultEventData = {
  id: "default",
  title: "Event Not Found",
  category: "Event",
  date: "No date specified",
  time: "No time specified",
  venue: "No venue specified",
  address: "No address specified",
  image: "/events/default-event.jpg",
  description: "Event details could not be found. This event may have been removed or is not available.",
  features: [],
  schedule: [],
  duration: "N/A",
  organizer: {
    id: "default",
    name: "Unknown Organizer",
    image: "/pages/organizers/default-organizer.jpg",
    role: "Event Organizer"
  },
  tickets: [],
  saleEndsAt: "Event day",
  remainingTickets: 0,
  coordinates: {
    lat: 5.6037,
    lng: -0.1870
  }
};

const EVENT_DETAILS_VIEW_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const getEventViewCacheKey = (identifier: string) => `event-details:view:${identifier.toLowerCase()}`;
const primeEventViewCache = (eventData: any, identifiers: Array<string | undefined>) => {
  const keys = Array.from(
    new Set(
      identifiers
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
        .map(value => getEventViewCacheKey(value))
    )
  );

  keys.forEach(key => requestCache.prime(key, eventData));
};

interface OrganizerMetrics {
  eventsHosted: number;
  followersCount: number;
  totalEventLocks: number;
  totalScore: number;
  rank?: number;
}

const defaultOrganizerMetrics: OrganizerMetrics = {
  eventsHosted: 0,
  followersCount: 0,
  totalEventLocks: 0,
  totalScore: 0
};

const formatPlatformName = (platform: string | null | undefined): string => {
  if (!platform) return 'Online Event';
  const platformMap: Record<string, string> = {
    zoom: 'Zoom',
    googlemeet: 'Google Meet',
    'google-meet': 'Google Meet',
    microsoftteams: 'Microsoft Teams',
    'microsoft-teams': 'Microsoft Teams',
    webex: 'Webex',
    skype: 'Skype',
    discord: 'Discord'
  };
  const key = platform.toLowerCase().replace(/\s+/g, '');
  return platformMap[key] || platform;
};

const isEventPast = (endDate: string | null, endTime: string | null): boolean => {
  if (!endDate) return false;
  try {
    const now = new Date();
    const eventEndDate = new Date(endDate);
    if (endTime) {
      const [hours, minutes] = endTime.split(':').map(Number);
      eventEndDate.setHours(hours, minutes, 0, 0);
    } else {
      eventEndDate.setHours(23, 59, 59, 999);
    }
    return now > eventEndDate;
  } catch {
    return false;
  }
};

const buildLocationPayload = (event: any) => {
  let displayAddress = 'TBD';
  let displayVenue = event.venue || 'TBD';
  let locationType: 'physical' | 'online' | 'hybrid' = 'physical';

  if (event.location_type === 'online') {
    const platform = formatPlatformName(event.online_platform);
    displayAddress = platform;
    displayVenue = platform;
    locationType = 'online';
  } else if (event.location_type === 'hybrid') {
    const venue = event.venue || 'Physical Location';
    const parts = [event.location_address, event.location_city, event.location_country].filter(Boolean);
    const physical = parts.length > 0 ? parts.join(', ') : venue;
    const platform = formatPlatformName(event.online_platform);
    displayAddress = `${physical} & ${platform}`;
    displayVenue = venue;
    locationType = 'hybrid';
  } else {
    const parts = [event.venue, event.location_address, event.location_city, event.location_country].filter(Boolean);
    displayAddress = parts.length > 0 ? parts.join(', ') : 'TBD';
    displayVenue = event.venue || 'TBD';
  }

  return { displayAddress, displayVenue, locationType };
};

const formatEventDateRange = (startDate?: string | null, endDate?: string | null): string => {
  if (!startDate) {
    return 'TBD';
  }

  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;

  if (end && start.toDateString() !== end.toDateString()) {
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${start.getFullYear()}`;
  }

  return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const calculateRemainingTickets = (tickets: any): number => {
  if (!Array.isArray(tickets)) {
    return 0;
  }

  return tickets.reduce((total: number, ticket: any) => {
    const quantity = Number(ticket.quantity) || 0;
    const sold = Number(ticket.sold) || 0;
    return total + Math.max(0, quantity - sold);
  }, 0);
};

const formatEventForView = (supabaseEvent: any, metrics: OrganizerMetrics = defaultOrganizerMetrics) => {
  if (!supabaseEvent) {
    return null;
  }

  const { displayAddress, displayVenue, locationType } = buildLocationPayload(supabaseEvent);
  const formattedDate = formatEventDateRange(supabaseEvent.start_date, supabaseEvent.end_date);

  return {
    id: supabaseEvent.id,
    title: supabaseEvent.title || 'Untitled Event',
    category: supabaseEvent.category || 'Event',
    date: formattedDate,
    time: supabaseEvent.start_time || 'TBD',
    startDate: supabaseEvent.start_date,
    endDate: supabaseEvent.end_date,
    startTime: supabaseEvent.start_time,
    endTime: supabaseEvent.end_time,
    venue: displayVenue,
    address: displayAddress,
    locationType,
    image: supabaseEvent.image_url,
    isFeatured: !!supabaseEvent.is_featured,
    isPastEvent: isEventPast(supabaseEvent.end_date, supabaseEvent.end_time),
    description: supabaseEvent.description || 'No description available.',
    features: supabaseEvent.features || [],
    schedule: Array.isArray(supabaseEvent.schedule) ? supabaseEvent.schedule : [],
    duration: supabaseEvent.duration || '2 hours',
    tickets: Array.isArray(supabaseEvent.tickets) ? supabaseEvent.tickets : [],
    saleEndsAt: supabaseEvent.end_date || 'Event day',
    remainingTickets: calculateRemainingTickets(supabaseEvent.tickets),
    organizer: {
      id: supabaseEvent.organizer?.id || 'default',
      name: supabaseEvent.organizer?.business_name || 'Event Organizer',
      image:
        supabaseEvent.organizer?.logo_url ||
        supabaseEvent.organizer?.avatar_url ||
        supabaseEvent.organizer?.profile?.avatar_url ||
        null,
      role: 'Event Organizer',
      location: 'Ghana',
      bio: supabaseEvent.organizer?.business_description || 'Event organizer committed to delivering exceptional experiences.',
      verified: supabaseEvent.organizer?.status === 'active',
      verificationStatus: supabaseEvent.organizer?.status || 'pending',
      eventsHosted: metrics.eventsHosted,
      followersCount: metrics.followersCount,
      totalEventLocks: metrics.totalEventLocks,
      totalScore: metrics.totalScore,
      rank: metrics.rank
    },
    coordinates: {
      lat: supabaseEvent.location_latitude || 5.6037,
      lng: supabaseEvent.location_longitude || -0.1870
    },
    hasVoting: !!supabaseEvent.has_voting,
    voteCost: supabaseEvent.vote_cost ?? supabaseEvent.voting_info?.voteCost ?? 1,
    lockCount: supabaseEvent.lock_count || 0,
    contestants: Array.isArray(supabaseEvent.contestants) ? supabaseEvent.contestants : [],
    voting_info: supabaseEvent.voting_info,
    galleryImages: Array.isArray(supabaseEvent.gallery_images) ? supabaseEvent.gallery_images : [],
    // Merchandise fields - support both snake_case (from DB) and camelCase
    has_merch: supabaseEvent.has_merch,
    hasMerch: supabaseEvent.has_merch,
    merch_products: supabaseEvent.merch_products,
    merchProducts: supabaseEvent.merch_products
  };
};

const fetchOrganizerMetrics = async (supabase: any, organizerId?: string | null): Promise<OrganizerMetrics> => {
  if (!organizerId) {
    return { ...defaultOrganizerMetrics };
  }

  const metrics: OrganizerMetrics = { ...defaultOrganizerMetrics };

  try {
    const { data: organizerEvents } = await supabase
      .from('events')
      .select('id, lock_count')
      .eq('organizer_id', organizerId)
      .eq('status', 'published');

    metrics.eventsHosted = organizerEvents?.length || 0;
    metrics.totalEventLocks = organizerEvents?.reduce((sum: number, event: any) => sum + (event.lock_count || 0), 0) || 0;
  } catch (metricsError) {
    console.error('Error fetching organizer events metrics:', metricsError);
  }

  try {
    const { data: followers } = await supabase
      .from('user_organizer_follows')
      .select('id')
      .eq('organizer_id', organizerId);

    metrics.followersCount = followers?.length || 0;
  } catch (followersError) {
    console.error('Error fetching organizer followers:', followersError);
  }

  try {
    const { topOrganizersService } = await import('@/services/topOrganizersService');
    const topOrganizers = await topOrganizersService.getTopOrganizers({
      limit: 50,
      includeUnverified: true,
      weights: { events: 0.7, locked: 0.0, bookings: 0.3 }
    });

    const organizerRank = topOrganizers.findIndex(org => org.organizer_id === organizerId);
    if (organizerRank !== -1) {
      metrics.rank = organizerRank + 1;
      metrics.totalScore = topOrganizers[organizerRank].total_score;
    }
  } catch (rankError) {
    console.error('Error fetching organizer rank:', rankError);
  }

  return metrics;
};

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSlug = typeof params.slug === 'string'
    ? params.slug
    : Array.isArray(params.slug)
      ? params.slug[0]
      : '';

  const cachedEventOnRender = currentSlug
    ? requestCache.getCachedValue<any>(
        getEventViewCacheKey(currentSlug),
        EVENT_DETAILS_VIEW_CACHE_TTL
      )
    : null;
  const primedEventOnRender = !cachedEventOnRender && currentSlug
    ? formatEventForView(sharedEventService.getCachedEventDetails(currentSlug))
    : null;
  const initialEvent = cachedEventOnRender ?? primedEventOnRender ?? null;

  const [event, setEvent] = useState<any>(initialEvent);
  const [loading, setLoading] = useState(!initialEvent);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Subscribe to the global lock store using selectors for reactivity
  const lockCounts = useLockStore(state => state.lockCounts);
  const initializeCounts = useLockStore(state => state.initializeCounts);

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState<{
    tickets: Array<{ ticket: any; quantity: number; subtotal: number }>;
    total: number;
  } | null>(null);
  const [showBannerPreview, setShowBannerPreview] = useState(false);
  const [selectedBannerImageIndex, setSelectedBannerImageIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    if (!currentSlug) {
      setLoading(false);
      setEvent(defaultEventData);
      return () => {
        isMounted = false;
      };
    }

    const cachedView = requestCache.getCachedValue<any>(
      getEventViewCacheKey(currentSlug),
      EVENT_DETAILS_VIEW_CACHE_TTL
    );

    let hydratedFromCache = false;

    if (cachedView) {
      setEvent(cachedView);
      setLoading(false);
      hydratedFromCache = true;
    }

    if (!hydratedFromCache) {
      const primedEvent = sharedEventService.getCachedEventDetails(currentSlug);
      const hydratedEvent = formatEventForView(primedEvent);
      if (hydratedEvent) {
        setEvent((prev: any) => prev ?? hydratedEvent);
        setLoading(false);
        hydratedFromCache = true;
      }
    }

    if (!hydratedFromCache) {
      setLoading(true);
    }
    
    const loadEventData = async () => {
      let isRedirecting = false; // Flag to keep loading state during redirect

      try {
        const param = currentSlug;
        
        // Check if param is UUID (old URL format) or slug (new format)
        const isUUIDParam = isUUID(param);
        
        // Load from Supabase only
        const { createClient } = await import('@/lib/supabase/client/client');
        const supabase = createClient();
        
        // Setup timeout guard for cached fetch
        const timeoutPromise = new Promise<null>((_, reject) => {
          const id = setTimeout(() => {
            clearTimeout(id);
            reject(new Error('Request timed out'));
          }, 5000);
        });

        const cachedEventPromise = sharedEventService.getEventDetails(param);
        const supabaseEvent: any = await Promise.race([cachedEventPromise, timeoutPromise]);
        
        if (!isMounted) return;

        if (!supabaseEvent) {
          console.log('No event found with param:', param);
          setEvent(defaultEventData);
          return;
        }
        
        // If accessed by UUID, redirect to slug URL
        if (isUUIDParam && supabaseEvent.slug) {
          router.replace(`/event/${supabaseEvent.slug}`);
          isRedirecting = true;
          return;
        }
        
        const organizerMetrics = await fetchOrganizerMetrics(supabase, supabaseEvent.organizer?.id);
        const hydratedEvent = formatEventForView(supabaseEvent, organizerMetrics);

        if (hydratedEvent) {
          setEvent(hydratedEvent);
          // Initialize the global store with the fetched lock count
          initializeCounts({ [hydratedEvent.id]: hydratedEvent.lockCount });
          primeEventViewCache(hydratedEvent, [param, supabaseEvent.slug, supabaseEvent.id]);
        }

      } catch (error: any) {
        if (!isMounted) return;

        // Handle opaque/empty errors often caused by network issues or JSON serialization failures
        const errorMessage = error?.message || (JSON.stringify(error) === '{}' ? 'Network Error' : 'Unknown Error');
        console.error("Error loading event:", errorMessage, error);
        
        // Timeout / Network Error Logic
        // If it's an empty object or has 'network'/'timeout', treat as connection issue
        const isTimeout = 
          errorMessage.includes('timed out') || 
          errorMessage.includes('network') ||
          errorMessage.includes('Network') ||
          JSON.stringify(error) === '{}';
        
        setEvent({
          ...defaultEventData,
          id: "database-error",
          title: isTimeout ? "Connection Timeout" : "System Error",
          description: isTimeout 
            ? "The server is unreachable. Please check your internet connection." 
            : "Unable to load event details. Please try again."
        });

        if (typeof window !== 'undefined') {
          toast.error(isTimeout ? 'Connection Timeout' : 'Unable to load event', {
            description: isTimeout 
              ? 'Please check your internet connection and try again.'
              : 'We ran into a problem loading this event. Please try again.',
            duration: 4000,
          });
        }
      } finally {
        // Only stop loading if we are NOT retrying AND NOT redirecting
        if (isMounted && !isRedirecting) {
          setLoading(false);
        }
      }
    };
    
    loadEventData();

    return () => {
      isMounted = false;
    };
  }, [currentSlug, refreshTrigger]);

  // Auto-scroll to tickets section if focus=tickets parameter is present
  useEffect(() => {
    if (!loading && event && searchParams.get('focus') === 'tickets') {
      // Small delay to ensure the page is fully rendered
      const scrollToTickets = () => {
        const ticketSection = document.getElementById('ticket-section');
        if (ticketSection) {
          // Scroll to the ticket section
          ticketSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' // Center the ticket section in viewport
          });
          
          // Add a subtle highlight effect with animation
          (ticketSection as HTMLElement).style.transition = 'background-color 0.3s ease';
          (ticketSection as HTMLElement).style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
          
          // Add a subtle border pulse effect
          const ticketCard = ticketSection.querySelector('[class*="bg-white"]');
          if (ticketCard) {
            (ticketCard as HTMLElement).style.transition = 'box-shadow 0.3s ease';
            (ticketCard as HTMLElement).style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.3)';
            
            setTimeout(() => {
              (ticketCard as HTMLElement).style.boxShadow = '';
            }, 2500);
          }
          
          // Remove background highlight after 3 seconds
          setTimeout(() => {
            (ticketSection as HTMLElement).style.backgroundColor = '';
          }, 3000);
          
          console.log('Successfully scrolled to ticket section');
        } else {
          console.warn('Ticket section not found, retrying...');
          // Retry once if element not found
          setTimeout(scrollToTickets, 200);
        }
      };
      
      // Initial delay then attempt scroll
      setTimeout(scrollToTickets, 600);
    }
  }, [loading, event, searchParams]);

  // ✅ PHASE 2 OPTIMIZATION: Use comprehensive skeleton component
  if (loading) {
    return <PageLoader message="Loading event details..." fullHeight />;
  }
  
  // ✅ PHASE 4 OPTIMIZATION: Modern Error & Empty States
  if (!event || event.id === "default") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
        <div className="mb-6 text-neutral-300">
          <WifiOff size={64} strokeWidth={1.5} />
        </div>
        
        <h2 className="text-xl font-bold text-neutral-900 mb-2 tracking-tight">Event Not Found</h2>
        <p className="text-neutral-500 max-w-sm text-base mb-8 leading-relaxed">
          The event you're looking for might have been removed or the link is incorrect.
        </p>
        
        <button 
          onClick={() => router.push('/pages/discover')}
          className="cursor-pointer px-8 py-3 bg-neutral-900 text-white rounded-full font-medium text-sm hover:bg-neutral-800 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-neutral-200"
        >
          Explore Events
        </button>
      </div>
    );
  }

  if (event.id === "database-error") {
    // Check if it looks like a timeout or network issue
    const isTimeout = event.description?.toLowerCase().includes('time') || event.description?.toLowerCase().includes('connection');
    
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
        <div className="mb-6 text-neutral-300">
          <WifiOff size={64} strokeWidth={1.5} />
        </div>

        <h2 className="text-xl font-bold text-neutral-900 mb-2 tracking-tight">
          {isTimeout ? "Connection Timeout" : "Something went wrong"}
        </h2>
        
        <p className="text-neutral-500 max-w-sm text-base mb-8 leading-relaxed">
          {isTimeout 
            ? "The server is taking too long to respond. Please check your connection and try again." 
            : "We encountered a temporary issue while loading this event."}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md justify-center">
          <button 
            onClick={() => window.location.reload()}
            className="cursor-pointer px-8 py-3 bg-neutral-900 text-white rounded-full font-medium text-sm hover:bg-neutral-800 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-neutral-200"
          >
            Try Again
          </button>
          <button 
            onClick={() => router.push('/pages/discover')}
            className="cursor-pointer px-8 py-3 bg-white text-neutral-900 border border-neutral-200 rounded-full font-medium text-sm hover:bg-neutral-50 transition-all hover:border-neutral-300"
          >
            Browse Others
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Event Banner */}
      <EventHero 
        event={event} 
        onBannerClick={() => {
          setShowBannerPreview(true);
          setSelectedBannerImageIndex(0);
        }}
      />
      
      {/* Gallery Carousel - Right below hero section */}
      {event.galleryImages && Array.isArray(event.galleryImages) && event.galleryImages.length > 0 && (
        <div className="bg-white border-b border-neutral-200">
          <div className="container mx-auto px-4 py-8">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-neutral-900">Event Gallery</h2>
              <GalleryCarousel 
                images={(event.galleryImages || []).map((img: any) => {
                  const imagePath = typeof img === 'string' ? img : img.url;
                  // Import and use the helper function
                  const { getFormattedImagePath } = require('@/utils/imageHelpers');
                  return getFormattedImagePath(imagePath);
                })}
                onImageClick={(index) => {
                  // Gallery images start at index 1 (index 0 is banner)
                  setShowBannerPreview(true);
                  setSelectedBannerImageIndex(index + 1);
                }}
              />
            </div>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main content area - takes up 8 columns on large screens */}
          <div className="lg:col-span-8">
            <EventDetails 
              event={event} 
              ticketCard={
                <TicketCard 
                  event={event} 
                  onPurchase={(tickets, total) => {
                    setPurchaseDetails({ tickets, total });
                    setShowCheckoutModal(true);
                  }}
                />
              }
              showBannerPreview={showBannerPreview}
              setShowBannerPreview={setShowBannerPreview}
              selectedBannerImageIndex={selectedBannerImageIndex}
              setSelectedBannerImageIndex={setSelectedBannerImageIndex}
            />
          </div>
          
          {/* Sidebar - takes up 4 columns on large screens, hidden on mobile */}
          <div className="hidden lg:block lg:col-span-4 space-y-6">
            <div id="ticket-section" className="sticky top-24">
              <TicketCard 
                event={event} 
                onPurchase={(tickets, total) => {
                  setPurchaseDetails({ tickets, total });
                  setShowCheckoutModal(true);
                }}
              />
            </div>
          </div>
        </div>
      </div>

       {/* Unified Checkout Modal */}
       <UnifiedCheckoutModal 
        isOpen={showCheckoutModal}
        onClose={() => {
          setShowCheckoutModal(false);
          // Trigger event data refresh to update remaining tickets
          setRefreshTrigger(prev => prev + 1);
        }}
        event={event}
        purchaseDetails={purchaseDetails}
        isFree={purchaseDetails?.total === 0}
      />
    </div>
  );
}
