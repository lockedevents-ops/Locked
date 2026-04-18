"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin } from 'lucide-react';
import { LiveBadge } from '@/components/events/LiveBadge';
import { BiLockAlt, BiLockOpen } from 'react-icons/bi';
import { useLockStore } from '@/store/lockStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { engagementService } from '@/services/engagementService';
import { isEventLive, isEventUpcoming, isPastEvent } from '@/services/sharedEventService';

type LockedEvent = {
  id: string;
  slug?: string;
  title: string;
  date: string;
  image?: string;
  venue: string;
  price: string;
  category: string;
  organizer: string;
  startDate?: string;
  startTime?: string;
  time?: string;
  endDate?: string;
  endTime?: string;
  rawData?: any;
};

export default function SavedEventsPage() {
  const { getLockedItems, toggleLock } = useLockStore();
  // Access auth once at component level to satisfy Rules of Hooks
  const { user } = useAuth();
  // Track which event's lock button is showing feedback text
  const [feedbackEventId, setFeedbackEventId] = useState<string | null>(null);
  // Tab filter state
  const [filterTab, setFilterTab] = useState<'all' | 'live' | 'upcoming' | 'past'>('all');
  
  // Get locked events from our store
  const lockedEvents: LockedEvent[] = getLockedItems('event').map(item => ({
    id: item.id,
    slug: item.data?.slug,
    title: item.data?.title || 'Event',
    date: item.data?.date || 'Unknown date',
    image: item.data?.imageUrl || item.data?.image_url,
    venue: item.data?.location || item.data?.venue || 'Unknown venue',
    price: item.data?.price || 'Free',
    category: item.data?.category || 'Event',
    organizer: item.data?.organizer?.name || 'Unknown organizer',
    // New fields for robust date filtering - check camelCase then snake_case
    startDate: item.data?.startDate || item.data?.start_date,
    startTime: item.data?.startTime || item.data?.start_time || item.data?.time,
    time: item.data?.time,
    endDate: item.data?.endDate || item.data?.end_date,
    endTime: item.data?.endTime || item.data?.end_time,
    rawData: item.data
  }));

  const getEventStatus = (event: LockedEvent): 'live' | 'upcoming' | 'past' => {
    const statusEvent = {
      // Preserve all original fields in case helpers need more than date/time
      ...event.rawData,
      startDate: event.startDate || event.rawData?.startDate || event.rawData?.start_date,
      start_date: event.startDate || event.rawData?.start_date,
      time: event.startTime || event.time || event.rawData?.time || event.rawData?.start_time,
      start_time: event.startTime || event.time || event.rawData?.start_time,
      endDate: event.endDate || event.rawData?.endDate || event.rawData?.end_date,
      end_date: event.endDate || event.rawData?.end_date,
      endTime: event.endTime || event.rawData?.endTime || event.rawData?.end_time,
      end_time: event.endTime || event.rawData?.end_time,
    };

    if (isEventLive(statusEvent)) return 'live';
    if (isPastEvent(statusEvent)) return 'past';
    return 'upcoming';
  };

  const liveEventsCount = lockedEvents.filter(event => getEventStatus(event) === 'live').length;
  const pastEventsCount = lockedEvents.filter(event => getEventStatus(event) === 'past').length;
  const upcomingEventsCount = lockedEvents.filter(event => getEventStatus(event) === 'upcoming').length;

  const filteredEvents = lockedEvents.filter(event => {
    if (filterTab === 'all') return true;
    return getEventStatus(event) === filterTab;
  });

  const removeFromSaved = (event: LockedEvent) => {
    if (getEventStatus(event) === 'past') {
      const confirmed = window.confirm(
        'This event already happened. Unlocking will remove it from Locked Events and cannot be undone. Continue?'
      );
      if (!confirmed) return;
    }

    // Show feedback briefly
    setFeedbackEventId(event.id);
    
    // Hide feedback after 2.5 seconds
    setTimeout(() => {
      setFeedbackEventId(null);
    }, 2500);
    
    // Toggle the lock (removes it locally since it's currently locked)
    toggleLock(event.id, 'event');

    // Sync with database if user is logged in
    if (user) {
      engagementService.trackLock(event.id, user.id, 'unlock').then(result => {
        if (!result.success) {
          console.error('Failed to sync unlock with database:', result.error);
        }
      });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Locked Events</h1>
        <p className="text-neutral-600 mt-2">Events you've bookmarked for later. Unlocking past events will remove them from this list.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6 sm:mb-8">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            filterTab === 'all'
              ? 'bg-primary text-white'
              : 'bg-white text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          All ({lockedEvents.length})
        </button>
        <button
          onClick={() => setFilterTab('live')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            filterTab === 'live'
              ? 'bg-primary text-white'
              : 'bg-white text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          Live ({liveEventsCount})
        </button>
        <button
          onClick={() => setFilterTab('upcoming')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            filterTab === 'upcoming'
              ? 'bg-primary text-white'
              : 'bg-white text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          Upcoming ({upcomingEventsCount})
        </button>
        <button
          onClick={() => setFilterTab('past')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            filterTab === 'past'
              ? 'bg-primary text-white'
              : 'bg-white text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          Past ({pastEventsCount})
        </button>
      </div>

      {/* Events Grid */}
      {/* Events Grid */}
      <div className="grid auto-rows-auto gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {filteredEvents.map(event => (
          <div 
            key={event.id}
            className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow group"
          >
            {/* Image Container */}
            <div className="relative h-48">
              <Link href={`/event/${event.id}`} className="block w-full h-full">
                {event.image ? (
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600" />
                )}
              </Link>
              <div className="absolute top-4 left-4 flex gap-2">
                 {getEventStatus(event) === 'live' && (
                  <LiveBadge />
                 )}
              </div>
              <motion.div
                className="absolute top-4 right-4 p-2 rounded-full cursor-pointer backdrop-blur-sm bg-success text-white hover:bg-success/90 shadow-lg"
                whileTap={{ scale: 0.85 }}
                whileHover={{ scale: 1.1 }}
                onClick={() => removeFromSaved(event)}
                aria-label="Remove from saved"
              >
                <div className="flex items-center">
                  {/* Feedback Text */}
                  <AnimatePresence>
                    {feedbackEventId === event.id && (
                      <motion.div
                        initial={{ opacity: 0, width: 0, x: -10 }}
                        animate={{ opacity: 1, width: 'auto', x: 0 }}
                        exit={{ opacity: 0, width: 0, x: -10 }}
                        transition={{ 
                          duration: 0.4,
                          ease: [0.25, 0.1, 0.25, 1],
                          width: { duration: 0.3 }  
                        }}
                        className="overflow-hidden mr-2 whitespace-nowrap text-xs font-medium"
                      >
                        Unlocking...
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Lock Icon */}
                  <div className="relative w-5 h-5">
                    <BiLockAlt className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Content */}
            <div className="p-6">
              <Link href={`/event/${event.id}`}>
                <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                  {event.title}
                </h3>
              </Link>

              <div className="space-y-2 text-sm text-neutral-600 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{event.date}</span>
                </div>
                {getEventStatus(event) === 'past' && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-700 px-3 py-1 text-xs font-medium">
                    <BiLockOpen className="w-4 h-4" />
                    Past event
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{event.venue}</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">{event.price}</span>
                <Link 
                  href={`/event/${event.id}`}
                  className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  View Event
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-200">
          <div className="mb-4">
            <BiLockAlt className="w-12 h-12 text-neutral-300 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900">
            {filterTab === 'all' && 'No Locked events'}
            {filterTab === 'live' && 'No live events'}
            {filterTab === 'upcoming' && 'No upcoming events'}
            {filterTab === 'past' && 'No past events'}
          </h3>
          <p className="mt-2 text-neutral-600">
            {filterTab === 'all' && "You haven't locked any events yet. Browse events and click the lock icon to save them for later."}
            {filterTab === 'live' && "None of your locked events are currently live."}
            {filterTab === 'upcoming' && "You don't have any locked events that are happening in the future."}
            {filterTab === 'past' && "You don't have any locked events that have already happened."}
          </p>
          <Link 
            href="/pages/discover"
            className="mt-6 inline-block bg-primary text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Explore Events
          </Link>
        </div>
      )}
    </div>
  );
}
