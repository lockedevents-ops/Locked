"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useCallback, Suspense, memo } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Users, Clock, Lock, Grid, List, AlertTriangle, X, History, Package, Bookmark, ArrowRight } from 'lucide-react';
import { useLockStore } from '@/store/lockStore';
import { parseISO, isFuture } from 'date-fns';
import { PageLoader } from '@/components/loaders/PageLoader';
import { preloadEventImages } from '@/lib/imagePreloader';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import { useUserTickets } from '@/hooks/useUserTickets';
import { useAuth } from '@/contexts/AuthContext';
import { orderService, type Order } from '@/services/orderService';
import { getRecentlyViewedEvents } from '@/utils/recentlyViewed';
// import { initializeUserRole } from '@/contexts/AuthContext';

// ✅ OPTIMIZATION: Extract ViewToggle to separate memoized component
const ViewToggle = memo(function ViewToggle({ 
  currentView, 
  onChange 
}: { 
  currentView: 'grid' | 'landscape', 
  onChange: (mode: 'grid' | 'landscape') => void 
}) {
  return (
    <div className="flex items-center bg-gray-100 p-0.5 rounded-md">
      <button
        onClick={() => onChange('grid')}
        className={`p-1.5 rounded ${
          currentView === 'grid' 
            ? 'bg-white text-primary shadow-sm' 
            : 'text-gray-500 hover:text-gray-800'
        }`}
        title="Grid view"
      >
        <Grid className="w-4 h-4" />
      </button>
      <button
        onClick={() => onChange('landscape')}
        className={`p-1.5 rounded ${
          currentView === 'landscape' 
            ? 'bg-white text-primary shadow-sm' 
            : 'text-gray-500 hover:text-gray-800'
        }`}
        title="List view"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
});

// Helper to build location string consistent with SharedEventService
const buildEventLocation = (event: any): string => {
  if (!event) return 'TBA';
  
  const locationType = event.location_type || event.locationType;
  const onlinePlatform = event.online_platform || event.onlinePlatform;

  if (locationType === 'online') {
    return onlinePlatform ? `${onlinePlatform} (Online)` : 'Online Event';
  }

  const label = event.location_label || event.locationLabel;
  const address = label
    || event.location_address
    || event.address
    || event.venue
    || event.venue_name
    || '';
  const city = event.location_city || event.city || '';
  const region = event.location_region || event.region || '';
  const country = event.location_country || event.country || '';

  if (locationType === 'hybrid') {
    const hybridParts = [address, city].filter(Boolean);
    return hybridParts.length > 0 ? hybridParts.join(', ') : 'Hybrid Event';
  }

  const parts = [address, city, region, country]
    .map(part => (typeof part === 'string' ? part.trim() : part))
    .filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'TBA';
};

function DashboardContent() {
  // Get locked items from our global store
  const { getLockedItems } = useLockStore();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [showRevocationBanner, setShowRevocationBanner] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [attendedCount, setAttendedCount] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [recentlyViewedEvents, setRecentlyViewedEvents] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  
  // ✅ USE useUserTickets HOOK to fetch tickets
  const { 
    tickets: allTickets, 
    isLoading: ticketsLoading 
  } = useUserTickets({
    userEmail: (user?.email || '').toLowerCase(),
    userId: user?.id || '',
    filterStatus: 'upcoming'
  });
  
  // Calculate upcoming tickets count from hook data
  const upcomingTicketsCount = allTickets.length;
  
  // Get locked events from store
  const lockedEventItems = useMemo(() => getLockedItems('event').slice(0, 3), [getLockedItems]);
  
  // Check if user was redirected due to role revocation
  useEffect(() => {
    if (searchParams?.get('revoked') === 'true') {
      setShowRevocationBanner(true);
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => setShowRevocationBanner(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);
  
  // Add view mode states with localStorage persistence
  const [upcomingViewMode, setUpcomingViewMode] = useState<'grid' | 'landscape'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('upcomingViewMode') as 'grid' | 'landscape' || 'grid';
    }
    return 'grid';
  });
  
  const [recentViewMode, setRecentViewMode] = useState<'grid' | 'landscape'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('recentViewMode') as 'grid' | 'landscape' || 'grid';
    }
    return 'grid';
  });

  // ✅ OPTIMIZATION: Memoize locked events count
  const lockedEventsCount = useMemo(() => {
    return getLockedItems('event').length;
  }, [getLockedItems]);

  // ✅ OPTIMIZATION: Save view mode preferences to localStorage with useCallback
  const handleUpcomingViewChange = useCallback((mode: 'grid' | 'landscape') => {
    setUpcomingViewMode(mode);
    localStorage.setItem('upcomingViewMode', mode);
  }, []);
  
  const handleRecentViewChange = useCallback((mode: 'grid' | 'landscape') => {
    setRecentViewMode(mode);
    localStorage.setItem('recentViewMode', mode);
  }, []);

  // ✅ OPTIMIZATION: Memoized close banner handler
  const handleCloseBanner = useCallback(() => {
    setShowRevocationBanner(false);
  }, []);

  useEffect(() => {
  // ...existing code...
    
    // Fetch user tickets to determine upcoming events
    async function fetchUserTickets() {
      try {
        // Get tickets from localStorage
        const storedTickets = localStorage.getItem('user-tickets');
        let userTickets = [];
        
        if (storedTickets) {
          // Parse tickets from localStorage
          userTickets = JSON.parse(storedTickets);
        } else {
          // If no tickets in localStorage, check published events and create demo ticket
          // This simulates user having tickets to upcoming events
          try {
            const eventsData = localStorage.getItem('events');
            if (eventsData) {
              const allEvents = JSON.parse(eventsData);
              // Filter for published events with future dates
              const upcomingPublishedEvents = allEvents.filter((event: any) => {
                return event.status === 'published' && 
                       event.eventDate && 
                       isFuture(parseISO(event.eventDate));
              }).slice(0, 2); // Limit to 2 events
              
              if (upcomingPublishedEvents.length > 0) {
                userTickets = upcomingPublishedEvents.map((event: any, index: number) => ({
                  id: `ticket-${index + 1}`,
                  eventId: event.id,
                  eventTitle: event.title,
                  eventDate: event.eventDate,
                  eventImage: event.imageUrl,
                  venue: event.location || "TBD"
                }));
                
                // Save to localStorage for future visits
                localStorage.setItem('user-tickets', JSON.stringify(userTickets));
              }
            }
          } catch (err) {
            console.error("Error generating sample tickets:", err);
          }
        }
        
        // Filter for upcoming events
        const upcoming = userTickets.filter((ticket: any) => 
          ticket.eventDate && isFuture(parseISO(ticket.eventDate))
        );

        setUpcomingEvents(upcoming);
      } catch (error) {
        console.error("Error fetching tickets:", error);
        setUpcomingEvents([]);
      }
    }
    
    // Fetch attended events count
    async function fetchAttendedCount() {
      try {
        let userTickets: any[] = [];
        const storedTickets = localStorage.getItem("user-tickets");

        if (storedTickets) {
          userTickets = JSON.parse(storedTickets);
        } else {
             // Fallback logic similar to page logic if needed, but fetchUserTickets handles generation
             const eventsData = localStorage.getItem("events");
             if (eventsData) {
               // Logic to simulate attended events if none exist
               // This part duplicates the logic from attended-events page to ensure sync
                const allEvents = JSON.parse(eventsData);
                const publishedPastEvents = allEvents.filter((event: any) => {
                  if (!event.eventDate || event.status !== "published") return false;
                  try {
                    return !isFuture(parseISO(event.eventDate));
                  } catch (error) {
                    return false;
                  }
                }).slice(0, 3);
                
                if (publishedPastEvents.length > 0) {
                  // If we generated new past tickets here, we'd need to merge and save, 
                  // but ideally fetchUserTickets handles the main ticket store. 
                  // We'll read directly from what's currently available in memory/storage
                   const tempTickets = publishedPastEvents.map((event: any, index: number) => ({
                    id: `attended-${index + 1}`,
                    eventId: event.id,
                    eventTitle: event.title,
                    eventDate: event.eventDate,
                    eventImage: event.imageUrl,
                    venue: event.location || "TBD",
                  }));
                   // Merge with existing logic? For now, let's just use what's in local storage primarily.
                   // userTickets = tempTickets; 
                }
             }
        }

        const attended = userTickets.filter((ticket) => {
          if (!ticket.eventDate) return false;
          try {
            return !isFuture(parseISO(ticket.eventDate));
          } catch (error) {
            return false;
          }
        });

        setAttendedCount(attended.length);
      } catch (error) {
        console.error("Error fetching attended count:", error);
        setAttendedCount(0);
      }
    }

    // Fetch organizers the user is following
    async function fetchFollowing() {
      try {
        // Get following data from localStorage
        const followingData = localStorage.getItem('user-following');
        if (followingData) {
          const following = JSON.parse(followingData);
          setFollowingCount(following.length);
        } else {
          // Default to 0 following if none found
          setFollowingCount(0);
        }
      } catch (error) {
        console.error("Error fetching following count:", error);
        setFollowingCount(0);
      }
    }
    
    // Fetch recently viewed events (with TTL support)
    async function fetchRecentlyViewed() {
      try {
        // ✅ PHASE 2: Use the TTL-based recently viewed utility
        const recentlyViewed = getRecentlyViewedEvents({ maxItems: 5 });
        setRecentlyViewedEvents(recentlyViewed);
      } catch (error) {
        console.error("Error fetching recently viewed:", error);
        setRecentlyViewedEvents([]);
      }
    }
    
    // Fetch recent orders for widget
    async function fetchOrders() {
      try {
        setOrdersLoading(true);
        const orders = await orderService.getUserOrders();
        setRecentOrders(orders.slice(0, 3)); // Get last 3 orders
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setOrdersLoading(false);
      }
    }
    
    fetchOrders();
    fetchAttendedCount();
    fetchFollowing();
    fetchRecentlyViewed();
  }, []);

  return (
    <div className="space-y-8">
      
      {/* Role Revocation Banner */}
      {showRevocationBanner && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md relative">
          <button
            onClick={handleCloseBanner}
            className="absolute top-4 right-4 text-red-700 hover:text-red-900"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
            <div>
              <h3 className="text-red-800 font-semibold">Role Access Revoked</h3>
              <p className="text-red-700 text-sm mt-1">
                Your organizer or venue owner role has been revoked by an administrator. 
                You no longer have access to that dashboard. If you believe this is an error, 
                please contact support.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-neutral-900">User Dashboard</h1>
      </div>
      
      {/* Stats Cards - Now Dynamic */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboards/user/tickets" className="group">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100 group-hover:border-primary/30 group-hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-500 font-medium group-hover:text-primary transition-colors">Upcoming Tickets</p>
                <p className="text-2xl font-bold">{upcomingTicketsCount}</p>
              </div>
              <div className="p-3 bg-primary/10 text-primary rounded-full group-hover:bg-primary group-hover:text-white transition-colors">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </div>
        </Link>
        
        <Link href="/dashboards/user/locked-events" className="group">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100 group-hover:border-green-500/30 group-hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-500 font-medium group-hover:text-green-600 transition-colors">Locked Events</p>
                <p className="text-2xl font-bold">{lockedEventsCount}</p>
              </div>
              <div className="p-3 bg-green-100 text-green-700 rounded-full group-hover:bg-green-600 group-hover:text-white transition-colors">
                <Lock className="h-6 w-6" />
              </div>
            </div>
          </div>
        </Link>
        
        <Link href="/dashboards/user/following" className="group">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100 group-hover:border-blue-500/30 group-hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-500 font-medium group-hover:text-blue-600 transition-colors">Hosts Following</p>
                <p className="text-2xl font-bold">{followingCount}</p>
              </div>
              <div className="p-3 bg-blue-100 text-blue-700 rounded-full group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </div>
        </Link>

        {/* New Attended Events Card */}
        <Link href="/dashboards/user/attended-events" className="group">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100 group-hover:border-purple-500/30 group-hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-500 font-medium group-hover:text-purple-600 transition-colors">Attended Events</p>
                <p className="text-2xl font-bold">{attendedCount}</p>
              </div>
              <div className="p-3 bg-purple-100 text-purple-700 rounded-full group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <History className="h-6 w-6" />
              </div>
            </div>
          </div>
        </Link>
      </div>
      
      {/* Dashboard Widgets Grid - Modern Design */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column */}
        <div className="space-y-8">
          
          {/* Upcoming Tickets Widget - Purple/Primary Theme */}
          <section className="bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-purple-900/10 dark:via-neutral-900 dark:to-blue-900/10 rounded-xl shadow-md border border-purple-100/50 dark:border-purple-900/20 overflow-hidden transition-all hover:shadow-lg">
            <div className="p-6 border-b border-purple-100/50 dark:border-purple-900/20 bg-gradient-to-r from-purple-500/5 to-blue-500/5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  Upcoming Tickets
                </h2>
                <Link href="/dashboards/user/tickets" className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            
            {ticketsLoading ? (
              <PageLoader message="Loading tickets..." />
            ) : allTickets.length > 0 ? (
              <div className="p-4 space-y-3">
                {allTickets.slice(0, 3).map((ticket) => (
                  <Link key={ticket.id} href={`/event/${ticket.eventId}`}>
                    <div className="group flex gap-4 p-4 rounded-xl bg-white dark:bg-neutral-800/50 border border-purple-100/50 dark:border-purple-900/20 hover:border-primary/40 hover:shadow-md transition-all duration-300 cursor-pointer">
                      <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden shadow-sm">
                        {ticket.eventImage ? (
                          <Image src={ticket.eventImage} alt={ticket.eventTitle} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-600 via-primary to-cyan-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base mb-2 truncate text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors">{ticket.eventTitle}</h3>
                        <div className="space-y-1">
                          <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                            <div className="p-1 rounded bg-purple-100 dark:bg-purple-900/30">
                              <Calendar className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="font-medium">{new Date(ticket.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate pl-5">{ticket.venue}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center">
                <div className="p-4 rounded-full bg-purple-100/50 dark:bg-purple-900/20 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Calendar className="w-10 h-10 text-purple-400 dark:text-purple-500" />
                </div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-4">No upcoming tickets</p>
                <Link href="/pages/discover" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-purple-600 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200">
                  Discover Events <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </section>

          {/* Recently Viewed Widget - Blue/Cyan Theme */}
          <section className="bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-blue-900/10 dark:via-neutral-900 dark:to-cyan-900/10 rounded-xl shadow-md border border-blue-100/50 dark:border-blue-900/20 overflow-hidden transition-all hover:shadow-lg">
            <div className="p-6 border-b border-blue-100/50 dark:border-blue-900/20 bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Recently Viewed
                </h2>
              </div>
           </div>
            
            {recentlyViewedEvents.length > 0 ? (
              <div className="p-4 space-y-3">
                {recentlyViewedEvents.slice(0, 3).map((event) => (
                  <Link key={event.id} href={`/event/${event.id}`}>
                    <div className="group flex gap-4 p-4 rounded-xl bg-white dark:bg-neutral-800/50 border border-blue-100/50 dark:border-blue-900/20 hover:border-blue-300 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 hover:shadow-md transition-all duration-300 cursor-pointer">
                      <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden shadow-sm">
                        {event.imageUrl ? (
                          <Image src={event.imageUrl} alt={event.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-cyan-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-1 truncate text-gray-900 dark:text-gray-100 group-hover:text-blue-600 transition-colors">{event.title}</h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{event.location}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center">
                <div className="p-4 rounded-full bg-blue-100/50 dark:bg-blue-900/20 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Clock className="w-10 h-10 text-blue-400 dark:text-blue-500" />
                </div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">No recently viewed events</p>
              </div>
            )}
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          
          {/* Recent Orders Widget - Green/Emerald Theme */}
          <section className="bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-emerald-900/10 dark:via-neutral-900 dark:to-green-900/10 rounded-xl shadow-md border border-emerald-100/50 dark:border-emerald-900/20 overflow-hidden transition-all hover:shadow-lg">
            <div className="p-6 border-b border-emerald-100/50 dark:border-emerald-900/20 bg-gradient-to-r from-emerald-500/5 to-green-500/5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Package className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  Recent Orders
                </h2>
                <Link href="/dashboards/user/orders" className="text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 flex items-center gap-1 transition-colors">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            
            {ordersLoading ? (
              <PageLoader message="Loading recent orders..." />
            ) : recentOrders.length > 0 ? (
              <div className="p-4 space-y-3">
                {recentOrders.map((order) => (
                  <div key={order.id} className="p-4 rounded-xl bg-white dark:bg-neutral-800/50 border border-emerald-100/50 dark:border-emerald-900/20 hover:border-green-300 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-sm text-gray-900 dark:text-gray-100">#{order.order_number}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                        order.status === 'completed' ? 'bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' :
                        order.status === 'pending' ? 'bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/40 dark:to-amber-900/40 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800' :
                        'bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                      }`}>
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                      {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-base font-bold text-gray-900 dark:text-gray-100">₵{order.total_amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center">
                <div className="p-4 rounded-full bg-emerald-100/50 dark:bg-emerald-900/20 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Package className="w-10 h-10 text-emerald-400 dark:text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-4">No orders yet</p>
                <Link href="/pages/discover" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200">
                  Start Shopping <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </section>

          {/* Locked Events Widget - Amber/Orange Theme */}
          <section className="bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-900/10 dark:via-neutral-900 dark:to-orange-900/10 rounded-xl shadow-md border border-amber-100/50 dark:border-amber-900/20 overflow-hidden transition-all hover:shadow-lg">
            <div className="p-6 border-b border-amber-100/50 dark:border-amber-900/20 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Bookmark className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  Locked Events
                </h2>
                <Link href="/dashboards/user/locked-events" className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1 transition-colors">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            
            {lockedEventItems.length > 0 ? (
              <div className="p-4 space-y-3">
                {lockedEventItems.map((item: any) => (
                  <Link key={item.id} href={`/event/${item.id}`}>
                    <div className="group flex gap-4 p-4 rounded-xl bg-white dark:bg-neutral-800/50 border border-amber-100/50 dark:border-amber-900/20 hover:border-amber-300 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 hover:shadow-md transition-all duration-300 cursor-pointer">
                      <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden shadow-sm">
                        {(item.data?.imageUrl || item.data?.image_url) ? (
                          <Image 
                            src={item.data.imageUrl || item.data.image_url} 
                            alt={item.data.title || item.data.eventTitle || 'Event'} 
                            fill 
                            className="object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-600 to-orange-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-2 truncate text-gray-900 dark:text-gray-100 group-hover:text-amber-600 transition-colors">
                          {item.data?.title || item.data?.eventTitle || 'Untitled Event'}
                        </h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mb-2">
                          {buildEventLocation(item.data)}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 rounded bg-amber-100 dark:bg-amber-900/30">
                            <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          </div>
                          <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Locked</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center">
                <div className="p-4 rounded-full bg-amber-100/50 dark:bg-amber-900/20 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <Bookmark className="w-10 h-10 text-amber-400 dark:text-amber-500" />
                </div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-4">No locked events</p>
                <Link href="/pages/discover" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200">
                  Discover Events <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ✅ OPTIMIZATION: Wrap in Suspense boundary for useSearchParams
export default function DashboardPage() {
  // ✅ SESSION MANAGEMENT: Prevent session expiration on user dashboard
  useSessionManagement();

  return (
    <Suspense fallback={<PageLoader message="Loading dashboard..." fullHeight />}>
      <DashboardContent />
    </Suspense>
  );
}
