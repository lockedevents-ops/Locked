"use client";

import React, { useState, useEffect } from 'react';
import { VenueCard, VenueCardProps } from '@/components/venues/VenueCard';
import { VenueFilters } from '@/components/venues/VenueFilters';
import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { isVenuesEnabled } from '@/lib/network';
import { PageLoader } from '@/components/loaders/PageLoader';

interface VenueFilters {
  search: string;
  location: string;
  capacity: [number, number] | null;
  priceRange: string;
}

export default function VenuesPage() {
  const venuesEnabled = isVenuesEnabled();
  // State for venues loaded from localStorage
  const [venues, setVenues] = useState<VenueCardProps[]>([]);
  const [filters, setFilters] = useState<VenueFilters>({
    search: '',
    location: '',
    capacity: null,
    priceRange: '',
  });
  
  const [filteredVenues, setFilteredVenues] = useState<VenueCardProps[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const venuesPerPage = 9;
  
  // Helper function to determine price range based on venue data
  const determinePriceRange = (venue: any) => {
    if (!venue.pricing || typeof venue.pricing.basePrice !== 'number') {
      return "₵₵"; // Default price range
    }
    
    const price = venue.pricing.basePrice;
    
    if (price <= 200) return "₵";
    if (price <= 500) return "₵₵";
    if (price <= 1000) return "₵₵₵";
    return "₵₵₵₵";
  };
  
  // Load venues from localStorage when component mounts
  useEffect(() => {
    if (!venuesEnabled) {
      setVenues([]);
      setFilteredVenues([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    try {
      const storedVenues = localStorage.getItem('venues');
      if (storedVenues) {
        const parsedVenues = JSON.parse(storedVenues);
        
        // Only show active venues and map them to the expected format
        const activeVenues = parsedVenues
          .filter((venue: any) => venue.status === 'active')
          .map((venue: any) => ({
            id: venue.id.toString(),
            name: venue.name || "Unnamed Venue",
            image: venue.featuredImagePreview || "/placeholder-venue.jpg",
            location: venue.location || "Location not specified",
            capacity: venue.capacity || 0,
            rating: venue.avgRating || 4.0, // Default rating if not specified
            priceRange: determinePriceRange(venue), // Helper function to determine price range
          }));
        
        setVenues(activeVenues);
        setFilteredVenues(activeVenues);
      } else {
        // No venues in localStorage, set empty array
        setVenues([]);
        setFilteredVenues([]);
      }
    } catch (error) {
      console.error("Error loading venues:", error);
      setVenues([]);
      setFilteredVenues([]);
    } finally {
      setIsLoading(false);
    }
  }, [venuesEnabled]);
  
  // Apply filters
  useEffect(() => {
    let result = [...venues];
    
    // Filter by search term
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(venue => 
        venue.name.toLowerCase().includes(searchLower) ||
        venue.location.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by location
    if (filters.location) {
      result = result.filter(venue => 
        venue.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    
    // Filter by capacity
    if (filters.capacity) {
      const [min, max] = filters.capacity;
      result = result.filter(venue => 
        venue.capacity >= min && venue.capacity <= max
      );
    }
    
    // Filter by price range
    if (filters.priceRange) {
      result = result.filter(venue =>
        venue.priceRange && venue.priceRange.length >= filters.priceRange.length
      );
    }
    
    setFilteredVenues(result);
    setCurrentPage(1);
  }, [filters, venues]);
  
  // Calculate pagination
  const indexOfLastVenue = currentPage * venuesPerPage;
  const indexOfFirstVenue = indexOfLastVenue - venuesPerPage;
  const currentVenues = filteredVenues.slice(indexOfFirstVenue, indexOfLastVenue);
  const totalPages = Math.ceil(filteredVenues.length / venuesPerPage);
  
  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Handle filter changes
  const handleFilterChange = (filterName: keyof VenueFilters, value: string | number | [number, number] | string[] | null) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };
  
  // Reset filters
  const resetFilters = () => {
    setFilters({
      search: '',
      location: '',
      capacity: null,
      priceRange: '',
    });
  };

  if (!venuesEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-xl w-full text-center bg-white border border-neutral-200 rounded-xl p-8 shadow-sm">
          <Building2 className="mx-auto h-14 w-14 text-neutral-300 mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Venues Are Temporarily Unavailable</h1>
          <p className="text-neutral-600">Venue discovery is currently paused while the platform focuses on event experiences.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Background Image */}
      <div
        className="relative text-white py-16"
        style={{
          backgroundImage: "url(/hero_backgrounds/venue-hero.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        {/* Darker overlay for better text contrast */}
        <div className="absolute inset-0 bg-black/70" />
        <div className="container mx-auto px-4 relative z-10">
          <h1 className="text-3xl font-bold mb-2 mt-24">Find Perfect Venues</h1>
            <p className="text-white/80 max-w-2xl">
            Explore and reserve top venues for every event in Ghana and across Africa. Whether you need a cozy spot or a spacious hall, find the ideal location to make your occasion memorable.
            </p>
        </div>
      </div>
      
      {/* Filters Section */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="space-y-2">
              <label htmlFor="venue-search" className="text-sm font-medium">Search</label>
              <input
                id="venue-search"
                type="text"
                placeholder="Venue name or keyword"
                className="w-full p-2 border border-neutral-200 rounded-md"
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
              />
            </div>
            
            {/* Location Filter */}
            <div className="space-y-2">
              <label htmlFor="location-filter" className="text-sm font-medium">Location</label>
              <select
                id="location-filter"
                className="w-full p-2 border border-neutral-200 rounded-md"
                value={filters.location}
                onChange={e => handleFilterChange('location', e.target.value)}
              >
                <option value="">All Locations</option>
                <option value="accra">Accra</option>
                <option value="kumasi">Kumasi</option>
                <option value="takoradi">Takoradi</option>
                <option value="tamale">Tamale</option>
              </select>
            </div>
            
            {/* Capacity Filter */}
            <div className="space-y-2">
              <label htmlFor="capacity-filter" className="text-sm font-medium">Capacity</label>
              <select
                id="capacity-filter"
                className="w-full p-2 border border-neutral-200 rounded-md"
                value={filters.capacity ? 'custom' : ''}
                onChange={e => {
                  const value = e.target.value;
                  if (value === 'small') {
                    handleFilterChange('capacity', [0, 500]);
                  } else if (value === 'medium') {
                    handleFilterChange('capacity', [501, 1500]);
                  } else if (value === 'large') {
                    handleFilterChange('capacity', [1501, 5000]);
                  } else if (value === 'xlarge') {
                    handleFilterChange('capacity', [5001, 100000]);
                  } else {
                    handleFilterChange('capacity', null);
                  }
                }}
              >
                <option value="">Any Capacity</option>
                <option value="small">Small (up to 500)</option>
                <option value="medium">Medium (501-1500)</option>
                <option value="large">Large (1501-5000)</option>
                <option value="xlarge">Extra Large (5000+)</option>
              </select>
            </div>
            
            {/* Price Range Filter */}
            <div className="space-y-2">
              <label htmlFor="price-filter" className="text-sm font-medium">Price Range</label>
              <select
                id="price-filter"
                className="w-full p-2 border border-neutral-200 rounded-md"
                value={filters.priceRange}
                onChange={e => handleFilterChange('priceRange', e.target.value)}
              >
                <option value="">Any Price</option>
                <option value="₵">₵ (Budget)</option>
                <option value="₵₵">₵₵ (Affordable)</option>
                <option value="₵₵₵">₵₵₵ (Premium)</option>
                <option value="₵₵₵₵">₵₵₵₵ (Luxury)</option>
              </select>
            </div>
          </div>
          
          {/* Reset Filters Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFilters}
              className="text-primary hover:text-primary-dark text-sm font-medium"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>
      
      {/* Venues Grid */}
      <div className="container mx-auto px-4 pb-12">
        {/* Results Count */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">
            {filteredVenues.length} {filteredVenues.length === 1 ? 'venue' : 'venues'} found
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600">Sort by:</span>
            <select className="border rounded-md py-1 px-2 text-sm bg-white">
              <option>Rating: High to Low</option>
              <option>Capacity: High to Low</option>
              <option>Capacity: Low to High</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
          </div>
        </div>
        
        {/* Venues Grid or Empty State */}
        {isLoading ? (
          <PageLoader message="Loading venues..." fullHeight />
        ) : filteredVenues.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-auto gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
              {currentVenues.map(venue => (
                <VenueCard key={venue.id} {...venue} />
              ))}
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex justify-center">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-md border ${
                      currentPage === 1 
                        ? 'text-neutral-300 border-neutral-200 cursor-not-allowed' 
                        : 'text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex items-center">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first page, last page, current page and siblings
                        return page === 1 || 
                               page === totalPages || 
                               Math.abs(page - currentPage) <= 1;
                      })
                      .map((page, index, array) => (
                        <React.Fragment key={page}>
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="px-3 py-2 text-neutral-500">...</span>
                          )}
                          <button
                            onClick={() => handlePageChange(page)}
                            className={`px-3 py-1 rounded-md mx-1 ${
                              currentPage === page 
                                ? 'bg-primary text-white' 
                                : 'text-neutral-700 hover:bg-neutral-100'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      ))}
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded-md border ${
                      currentPage === totalPages 
                        ? 'text-neutral-300 border-neutral-200 cursor-not-allowed' 
                        : 'text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Building2 className="mx-auto h-16 w-16 text-neutral-300 mb-4" />
            <h3 className="text-xl font-medium mb-2">No Venues Found</h3>
            <p className="text-neutral-600 mb-4">
              {venues.length === 0 ?
                "There are no active venues available. Venues will appear here once they're added." :
                "No venues match your current search criteria. Try adjusting your filters or check back later."
              }
            </p>
            {venues.length > 0 && (
              <button 
                className="text-primary font-medium hover:underline"
                onClick={resetFilters}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}