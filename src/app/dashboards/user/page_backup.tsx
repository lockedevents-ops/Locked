"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Users, Clock, Lock, Grid, List, AlertTriangle, X } from 'lucide-react';
import { useLockStore } from '@/store/lockStore';
import { parseISO, isFuture } from 'date-fns';
// import { initializeUserRole } from '@/contexts/AuthContext';

export default function DashboardPage() {
  // Get locked items from our global store
  const { getLockedItems } = useLockStore();
  const searchParams = useSearchParams();
  const [showRevocationBanner, setShowRevocationBanner] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [recentlyViewedEvents, setRecentlyViewedEvents] = useState<any[]>([]);
  
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

  // Get the count of locked events
  const lockedEvents = getLockedItems('event');
  const lockedEventsCount = lockedEvents.length;

  // Save view mode preferences to localStorage
  useEffect(() => {
    localStorage.setItem('upcomingViewMode', upcomingViewMode);
  }, [upcomingViewMode]);
  
  useEffect(() => {
    localStorage.setItem('recentViewMode', recentViewMode);
  }, [recentViewMode]);

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
    
    // Fetch recently viewed events
    async function fetchRecentlyViewed() {
      try {
        // Get recently viewed events from localStorage
        const recentlyViewedString = localStorage.getItem('recently-viewed-events');
        
        if (recentlyViewedString) {
          const recentlyViewed = JSON.parse(recentlyViewedString);
          setRecentlyViewedEvents(recentlyViewed);
        } else {
          // No recently viewed events, set empty array
          setRecentlyViewedEvents([]);
        }
      } catch (error) {
        console.error("Error fetching recently viewed:", error);
        setRecentlyViewedEvents([]);
      }
    }
    
    fetchUserTickets();
    fetchFollowing();
    fetchRecentlyViewed();
  }, []);

  // Toggle button component for view modes
  const ViewToggle = ({ 
    currentView, 
    onChange 
  }: { 
    currentView: 'grid' | 'landscape', 
    onChange: (mode: 'grid' | 'landscape') => void 
  }) => (
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
  
  return (
    <div className="space-y-8">
      
      {/* Role Revocation Banner */}
      {showRevocationBanner && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md relative">
          <button
            onClick={() => setShowRevocationBanner(false)}
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
        <h1 className="text-2xl font-bold">User Dashboard</h1>
      </div>
      
      {/* Stats Cards - Now Dynamic */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium">Upcoming Events</p>
              <p className="text-2xl font-bold">{upcomingEvents.length}</p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-full">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium">Locked Events</p>
              <p className="text-2xl font-bold">{lockedEventsCount}</p>
            </div>
            <div className="p-3 bg-green-100 text-green-700 rounded-full">
              <Lock className="h-6 w-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium">Hosts Following</p>
              <p className="text-2xl font-bold">{followingCount}</p>
            </div>
            <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Upcoming Events Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Upcoming Events</h2>
          <ViewToggle currentView={upcomingViewMode} onChange={setUpcomingViewMode} />
        </div>

        {upcomingViewMode === 'grid' ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {upcomingEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-100 flex flex-col">
                <div className="relative h-48">
                  {event.eventImage ? (
                    <Image
                      src={event.eventImage}
                      alt={event.eventTitle}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600" />
                  )}
                </div>
                <div className="p-4 md:p-6 flex-1">
                  <h3 className="font-bold text-lg mb-1">{event.eventTitle}</h3>
                  <div className="text-neutral-500 text-sm space-y-1 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(event.eventDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long', 
                        day: 'numeric',
                        year: 'numeric'
                      })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{new Date(event.eventDate).toLocaleTimeString('en-US', {
                        hour: '2-digit', 
                        minute: '2-digit'
                      })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{event.venue}</span>
                    </div>
                  </div>
                  <Link 
                    href={`/event/${event.eventId}`}
                    className="inline-block bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-100 flex">
                <div className="relative w-32 sm:w-48">
                  {event.eventImage ? (
                    <Image
                      src={event.eventImage}
                      alt={event.eventTitle}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600" />
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{event.eventTitle}</h3>
                    <div className="text-neutral-500 text-sm space-y-1 mt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(event.eventDate).toLocaleDateString('en-US', {
                          month: 'long', 
                          day: 'numeric',
                          year: 'numeric'
                        })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{event.venue}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link 
                      href={`/event/${event.eventId}`}
                      className="inline-block bg-primary text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {upcomingEvents.length === 0 && (
          <div className="bg-white p-8 rounded-lg border border-neutral-100 text-center">
            <p className="text-neutral-500">No upcoming events. Start exploring!</p>
            <Link href="/pages/discover" className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-md">
              Discover Events
            </Link>
          </div>
        )}
      </section>

      {/* Recently Viewed */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Recently Viewed</h2>
          <ViewToggle currentView={recentViewMode} onChange={setRecentViewMode} />
        </div>

        {recentViewMode === 'grid' ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {recentlyViewedEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-100 flex flex-col">
                <div className="relative h-48">
                  {event.imageUrl ? (
                    <Image
                      src={event.imageUrl}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600" />
                  )}
                </div>
                <div className="p-4 md:p-6 flex-1">
                  <h3 className="font-bold text-lg mb-1">{event.title}</h3>
                  <div className="text-neutral-500 text-sm space-y-1 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{event.location}</span>
                    </div>
                  </div>
                  <Link 
                    href={`/event/${event.id}`}
                    className="inline-block bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recentlyViewedEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-100 flex">
                <div className="relative w-32 sm:w-48">
                  {event.imageUrl ? (
                    <Image
                      src={event.imageUrl}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600" />
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-lg">{event.title}</h3>
                    <div className="text-neutral-500 text-sm space-y-1 mt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{event.date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{event.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link 
                      href={`/event/${event.id}`}
                      className="inline-block bg-primary text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {recentlyViewedEvents.length === 0 && (
          <div className="bg-white p-8 rounded-lg border border-neutral-100 text-center">
            <p className="text-neutral-500">No recently viewed events.</p>
            <Link href="/pages/discover" className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-md">
              Discover Events
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
