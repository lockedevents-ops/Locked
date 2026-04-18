/**
 * LazyEventMap Component
 * --------------------------------------------------------------
 * Lazy-loaded map component for event location display.
 * Only loads map iframe when user scrolls near it or clicks show map.
 * 
 * ✅ PHASE 2 OPTIMIZATION: Reduces initial page load by deferring map loading
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MapPin } from 'lucide-react';

interface LazyEventMapProps {
  coordinates: {
    lat: number;
    lng: number;
  } | null;
}

export function LazyEventMap({ coordinates }: LazyEventMapProps) {
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // ✅ Load map when user scrolls near it (Intersection Observer)
  useEffect(() => {
    if (!mapContainerRef.current || !coordinates?.lat || !coordinates?.lng) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoadMap(true);
            observer.disconnect(); // Stop observing once loaded
          }
        });
      },
      {
        rootMargin: '200px', // Load when 200px before entering viewport
      }
    );

    observer.observe(mapContainerRef.current);

    return () => observer.disconnect();
  }, [coordinates]);

  // If no coordinates, show fallback
  if (!coordinates?.lat || !coordinates?.lng) {
    return (
      <div 
        ref={mapContainerRef}
        className="bg-neutral-100 rounded-lg overflow-hidden shadow-md relative md:h-full h-64 w-full"
      >
        <div className="absolute inset-0 bg-neutral-200 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            <p className="text-neutral-500 text-sm">Location not set for this event</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapContainerRef}
      className="bg-neutral-100 rounded-lg overflow-hidden shadow-md relative md:h-full h-64 w-full"
    >
      {shouldLoadMap ? (
        /* ✅ Map iframe - only loaded when in viewport */
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${(coordinates.lng - 0.05).toFixed(4)},${(coordinates.lat - 0.05).toFixed(4)},${(coordinates.lng + 0.05).toFixed(4)},${(coordinates.lat + 0.05).toFixed(4)}&layer=mapnik&marker=${coordinates.lat},${coordinates.lng}`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen={true}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Event Location"
          className="absolute inset-0"
        />
      ) : (
        /* ✅ Placeholder before map loads */
        <div className="absolute inset-0 bg-neutral-200 flex items-center justify-center">
          <div className="text-center animate-pulse">
            <MapPin className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
            <p className="text-neutral-500 text-sm">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}
