"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { BiLockAlt } from 'react-icons/bi';
import { useLockStore } from '@/store/lockStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function SavedVenuesPage() {
  const { getLockedItems, toggleLock } = useLockStore();
  // Track which venue's lock button is showing feedback text
  const [feedbackVenueId, setFeedbackVenueId] = useState<string | null>(null);
  
  // Get locked venues from our store
  const lockedVenues = getLockedItems('venue').map(item => ({
    id: item.id,
    name: item.data?.name || 'Venue',
    image: item.data?.image || '/placeholder-venue.jpg',
    location: item.data?.location || 'Unknown location',
    capacity: item.data?.capacity || 'N/A',
    priceRange: item.data?.priceRange || 'Contact for pricing',
  }));

  const removeFromSaved = (venueId: string) => {
    // Show feedback briefly
    setFeedbackVenueId(venueId);
    
    // Hide feedback after 2.5 seconds
    setTimeout(() => {
      setFeedbackVenueId(null);
    }, 2500);
    
    // Toggle the lock (removes it since it's currently locked)
    toggleLock(venueId, 'venue');
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Locked Venues</h1>
        <p className="text-neutral-600 mt-2">Venues you've bookmarked for later</p>
      </div>

      {/* Venues Grid */}
      <div className="grid auto-rows-auto gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
        {lockedVenues.map(venue => (
          <div 
            key={venue.id}
            className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow group"
          >
            {/* Image */}
            <div className="relative">
              <Image
                src={venue.image}
                alt={venue.name}
                width={400}
                height={200}
                className="w-full h-48 object-cover"
              />
              <motion.div
                className="absolute top-4 right-4 p-2 rounded-full cursor-pointer backdrop-blur-sm bg-success text-white hover:bg-success/90 shadow-lg"
                whileTap={{ scale: 0.85 }}
                whileHover={{ scale: 1.1 }}
                onClick={() => removeFromSaved(venue.id)}
                aria-label="Remove from saved"
              >
                <div className="flex items-center">
                  {/* Feedback Text */}
                  <AnimatePresence>
                    {feedbackVenueId === venue.id && (
                      <motion.div
                        initial={{ opacity: 0, width: 0, x: -10 }}
                        animate={{ opacity: 1, width: 'auto', x: 0 }}
                        exit={{ opacity: 0, width: 0, x: -10 }}
                        transition={{ 
                          duration: 0.2,
                          ease: [0.25, 0.1, 0.25, 1],
                          width: { duration: 0.2 }  
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
              <Link href={`/venue/${venue.id}`}>
                <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
                  {venue.name}
                </h3>
              </Link>

              <div className="space-y-2 text-sm text-neutral-600 mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{venue.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906zM12 19v-3a3 3 0 00-6 0v3h6z" />
                  </svg>
                  <span>{venue.capacity} capacity</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-medium text-primary">{venue.priceRange}</span>
                <Link 
                  href={`/venue/${venue.id}`}
                  className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  View Venue
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {lockedVenues.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-200">
          <div className="mb-4">
            <BiLockAlt className="w-12 h-12 text-neutral-300 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900">No Locked Venues</h3>
          <p className="mt-2 text-neutral-600">
            You haven't locked any venues yet. Browse venues and click the lock icon to save them for later.
          </p>
          <Link 
            href="/pages/venues"
            className="mt-6 inline-block bg-primary text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Explore Venues
          </Link>
        </div>
      )}
    </div>
  );
}