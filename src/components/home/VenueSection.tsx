"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { VenueCard, VenueCardProps } from "@/components/venues/VenueCard";
import { SectionHeading } from '@/components/ui/SectionHeading';
import { createClient } from '@/lib/supabase/client/client';
import { isVenuesEnabled } from '@/lib/network';

export function VenueSection({ onReady }: { onReady?: () => void }) {
  const [venues, setVenues] = useState<VenueCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const venuesEnabled = isVenuesEnabled();
  
  const hydrateVenues = useCallback(async () => {
    if (!venuesEnabled) {
      setVenues([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createClient();
      
      // Fetch venues from database
      const { data: venuesData, error } = await supabase
        .from('venues')
        .select('*')
        .eq('status', 'active')
        .limit(4);
        
      if (error) {
        console.error('Supabase error fetching venues:', error);
        setVenues([]);
      } else {
        const active = venuesData.map((venue: any) => ({
          id: venue.id.toString(),
          name: venue.name || 'Unnamed Venue',
          image: venue.featured_image_url || '/placeholder-venue.jpg',
          location: venue.location || 'Location not specified',
          capacity: venue.capacity || 0,
          rating: venue.avg_rating || 4.0,
          priceRange: venue.base_price ? determineVenuePriceRange(venue.base_price) : '₵₵'
        }));
        setVenues(active);
      }
    } catch (e) {
      console.error('Error fetching venues:', e);
      setVenues([]);
    } finally {
      setIsLoading(false);
    }
  }, [venuesEnabled]);

  useEffect(() => { 
    hydrateVenues(); 
  }, [hydrateVenues]);

  useEffect(() => {
    if (!isLoading) {
      onReady?.();
    }
  }, [isLoading, onReady]);
  
  // Helper function to determine price range
  const determineVenuePriceRange = (price: number) => {
    if (price <= 200) return "₵";
    if (price <= 500) return "₵₵";
    if (price <= 1000) return "₵₵₵";
    return "₵₵₵₵";
  };
  
  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <SectionHeading 
          title="Popular Venues" 
          eyebrow="Top Spaces"
          description="Discover the most sought-after venues for events, parties, and gatherings across Ghana."
          actionHref={venues.length > 0 ? '/venues' : undefined}
          actionLabel="View More Venues"
        />
        
        {venues.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-auto gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {venues.map((venue) => (
              <VenueCard key={venue.id} {...venue} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-lg shadow-sm">
            <Building2 className="mx-auto h-16 w-16 text-neutral-300 mb-4" />
            <h3 className="text-xl font-medium mb-2">No Venues Available</h3>
            <p className="text-neutral-600">Check back later for venue listings.</p>
          </div>
        )}
        
        {/* View All Venues Button (only if venues exist) */}
        {venues.length > 0 && (
          <div className="flex justify-center mt-10">
            <Link href="/venues" className="bg-primary hover:bg-primary-dark text-white px-6 md:px-8 py-3 rounded-md font-medium transition-colors cursor-pointer shadow-lg">
              View More Venues
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
