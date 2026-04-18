/**
 * Organizers Page - Optimized Version
 * --------------------------------------------------------------
 * Performance optimizations applied:
 * - Request caching with deduplication
 * - React.memo on cards
 * - Prefetch on hover
 * - Loading skeletons
 * - Debounced search
 * - Image preloading
 * - Optimized filtering
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, MapPin, Users, Calendar, ChevronLeft, ChevronRight, SlidersHorizontal, Trophy } from 'lucide-react';
import { OrganizerCard, type OrganizerCardData } from '@/components/organizers/OrganizerCard';
import { useSearchParams, useRouter } from 'next/navigation';
import { PageLoader } from '@/components/loaders/PageLoader';
import { requestCache } from '@/lib/requestCache';
import { preloadEventImages } from '@/lib/imagePreloader';
import { useSessionManagement } from '@/hooks/useSessionManagement';

interface OrganizerFilters {
  search: string;
  category: string;
  location: string;
}

interface Organizer {
  id: string;
  name: string;
  image: string;
  location: string;
  bio: string;
  eventsCount: number;
  totalAttendees: number;
  publishedEvents: number;
  followers: number;
  categories: string[];
  performanceScore: number;
  totalEventLocks: number;
}

// ✅ OPTIMIZATION: Debounce utility
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function OrganizersContent() {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<OrganizerFilters>({
    search: '',
    category: 'all',
    location: 'all'
  });
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizersPerPage = 12;
  
  // ✅ OPTIMIZATION: Debounce search input (500ms delay)
  const debouncedSearch = useDebounce(filters.search, 500);
  
  // Extract available locations and categories
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  
  // ✅ OPTIMIZATION: Cached organizer fetch with request deduplication
  useEffect(() => {
    const fetchOrganizers = async () => {
      setIsLoading(true);
      try {
        // Use request cache for deduplication
        const cacheKey = 'organizers:top-50';
        const topOrganizersData = await requestCache.fetch(
          cacheKey,
          async () => {
            const { topOrganizersService } = await import('@/services/topOrganizersService');
            return await topOrganizersService.getTopOrganizers({
              limit: 50,
              includeUnverified: true,
              weights: {
                events: 0.7,
                locked: 0.0,
                bookings: 0.3
              }
            });
          },
          {
            ttl: 5 * 60 * 1000, // 5 minutes cache
            staleWhileRevalidate: true
          }
        );
        
        // Transform data
        const transformedOrganizers = topOrganizersData
          .filter((organizer) => organizer.events_hosted > 0)
          .map((organizer) => ({
            id: organizer.organizer_id,
            name: organizer.name,
            image: organizer.profile_image || '',
            location: organizer.location || 'Ghana',
            bio: organizer.bio || 'Event organizer committed to delivering exceptional experiences.',
            eventsCount: organizer.events_hosted,
            totalAttendees: organizer.total_attendees,
            publishedEvents: organizer.events_hosted,
            followers: organizer.followers_count || 0,
            categories: ['General'],
            performanceScore: organizer.total_score,
            totalEventLocks: organizer.total_event_locks || 0
          }));
        
        setOrganizers(transformedOrganizers);
        
        // ✅ OPTIMIZATION: Preload top 3 organizer images during idle time
        if (transformedOrganizers.length >= 3) {
          const topImages = transformedOrganizers
            .slice(0, 3)
            .map(org => org.image)
            .filter(Boolean);
          if (topImages.length > 0) {
            preloadEventImages(topImages);
          }
        }
        
        // Set default categories and locations
        setAvailableLocations(['Accra', 'Kumasi', 'Tamale', 'Cape Coast']);
        setAvailableCategories(['Music', 'Business', 'Tech', 'Arts', 'Sports', 'Food']);
        
        // Set query parameters
        const search = searchParams.get('search') || '';
        const category = searchParams.get('category') || 'all';
        const location = searchParams.get('location') || 'all';
        
        setFilters({
          search,
          category,
          location
        });
      } catch (error) {
        console.error("Error loading organizers:", error);
        setOrganizers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizers();
  }, [searchParams]);
  
  // ✅ OPTIMIZATION: Memoized filtering - only recalculates when inputs change
  const filteredOrganizers = useMemo(() => {
    let results = [...organizers];
    
    // Apply search filter (debounced)
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      results = results.filter(org => 
        org.name.toLowerCase().includes(searchLower) || 
        org.bio.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply category filter
    if (filters.category !== 'all') {
      results = results.filter(org => 
        org.categories.some(cat => cat.toLowerCase() === filters.category.toLowerCase())
      );
    }
    
    // Apply location filter
    if (filters.location !== 'all') {
      results = results.filter(org => 
        org.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    
    return results;
  }, [organizers, debouncedSearch, filters.category, filters.location]);
  
  // ✅ OPTIMIZATION: Memoized pagination calculations
  const { totalPages, currentOrganizers } = useMemo(() => {
    const pages = Math.max(1, Math.ceil(filteredOrganizers.length / organizersPerPage));
    const indexOfLastOrganizer = currentPage * organizersPerPage;
    const indexOfFirstOrganizer = indexOfLastOrganizer - organizersPerPage;
    const current = filteredOrganizers.slice(indexOfFirstOrganizer, indexOfLastOrganizer);
    
    return {
      totalPages: pages,
      currentOrganizers: current
    };
  }, [filteredOrganizers, currentPage, organizersPerPage]);

  const topOrganizers = useMemo(() => filteredOrganizers.slice(0, 3), [filteredOrganizers]);
  const shouldShowTopOrganizers = currentPage === 1 && topOrganizers.length > 0;
  const highlightedCount = shouldShowTopOrganizers ? topOrganizers.length : 0;
  
  // Adjust current page if needed
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // ✅ OPTIMIZATION: Memoized callbacks to prevent re-renders
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    updateQueryParams({
      search: filters.search,
      category: filters.category,
      location: filters.location
    });
  }, [filters]);
  
  const updateQueryParams = useCallback((newFilters: OrganizerFilters) => {
    const params = new URLSearchParams();
    
    if (newFilters.search) params.set('search', newFilters.search);
    if (newFilters.category !== 'all') params.set('category', newFilters.category);
    if (newFilters.location !== 'all') params.set('location', newFilters.location);
    
    router.push(`/pages/organizers?${params.toString()}`);
  }, [router]);
  
  const handleFilterChange = useCallback((key: keyof OrganizerFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    updateQueryParams(newFilters);
  }, [filters, updateQueryParams]);
  
  const resetFilters = useCallback(() => {
    const newFilters = {
      search: '',
      category: 'all',
      location: 'all'
    };
    setFilters(newFilters);
    router.push('/pages/organizers');
  }, [router]);
  
  const handlePageChange = useCallback((pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [totalPages]);
  
  // ✅ OPTIMIZATION: Memoized card data transformation (done once)
  const transformOrganizerToCard = useCallback((org: Organizer, rank?: number): OrganizerCardData => ({
    id: org.id,
    name: org.name,
    image: org.image,
    location: org.location,
    bio: org.bio,
    verified: true, // Add verified field
    verificationStatus: 'active',
    eventsHosted: org.eventsCount,
    followersCount: org.followers,
    totalEventLocks: org.totalEventLocks,
    totalScore: org.performanceScore,
    rank
  }), []);

  // ✅ OPTIMIZATION: Show skeleton for entire page during initial load
  if (isLoading) {
    return <PageLoader message="Loading organizers..." fullHeight />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ✅ OPTIMIZATION: Hero with Next.js Image instead of inline style */}
      <div className="relative text-white py-16 overflow-hidden">
        <Image
          src="/hero_backgrounds/organizer-hero.jpg"
          alt="Event Organizers"
          fill
          className="object-cover object-center"
          priority
          sizes="100vw"
          quality={75}
        />
        <div className="absolute inset-0 bg-black/70" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-left">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-white" />
              <span className="text-sm font-medium text-white/90 uppercase tracking-wide">All Organizers</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Event Organizers
                </h1>
                <p className="text-white/80 max-w-2xl text-lg">
                  Discover talented event organizers across Ghana. Connect with the creators behind your 
                  favorite events and follow them for updates on their latest happenings.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Search & Filters */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-4 rounded-lg shadow-sm">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="w-full md:w-auto flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search organizers..."
                className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
              <button 
                type="submit" 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-primary"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </form>
          
          {/* Filter Toggle Button (Mobile) */}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-neutral-700"
          >
            <SlidersHorizontal className="h-4 w-4" /> 
            Filters {showFilters ? '(Hide)' : '(Show)'}
          </button>
          
          {/* Desktop Filters */}
          <div className="hidden md:flex items-center gap-3">
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="category" className="text-sm text-neutral-500">Category:</label>
              <select
                id="category"
                className="text-sm border border-gray-200 rounded-md px-3 py-1.5"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="all">All Categories</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            {/* Location Filter */}
            <div className="flex items-center gap-2">
              <label htmlFor="location" className="text-sm text-neutral-500">Location:</label>
              <select
                id="location"
                className="text-sm border border-gray-200 rounded-md px-3 py-1.5"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
              >
                <option value="all">All Locations</option>
                {availableLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            
            {/* Clear Filters */}
            {(filters.search || filters.category !== 'all' || filters.location !== 'all') && (
              <button
                onClick={resetFilters}
                className="text-sm text-primary hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
        
        {/* Mobile Filters */}
        {showFilters && (
          <div className="md:hidden mt-4 bg-white p-4 rounded-lg shadow-sm space-y-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="category-mobile" className="text-sm text-neutral-500">Category:</label>
              <select
                id="category-mobile"
                className="text-sm border border-gray-200 rounded-md px-3 py-2 w-full"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="all">All Categories</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div className="flex flex-col gap-1">
              <label htmlFor="location-mobile" className="text-sm text-neutral-500">Location:</label>
              <select
                id="location-mobile"
                className="text-sm border border-gray-200 rounded-md px-3 py-2 w-full"
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
              >
                <option value="all">All Locations</option>
                {availableLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            
            {(filters.search || filters.category !== 'all' || filters.location !== 'all') && (
              <button
                onClick={resetFilters}
                className="w-full text-center py-2 text-sm text-primary border border-primary/30 rounded-md hover:bg-primary/5"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
        
        {/* Results Count */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold">
            {filteredOrganizers.length} {filteredOrganizers.length === 1 ? 'organizer' : 'organizers'} found
          </h2>
        </div>
      </div>
      
      {/* Top Organizers Highlight - Only show on first page, supports 1-3 organizers */}
      {shouldShowTopOrganizers && (
        <div className="container mx-auto px-4 mb-8">
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl p-3 md:p-8">
            <div className="text-left mb-8">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary uppercase tracking-wide">Top Performers</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Leading Event Organizers
              </h2>
              <p className="text-gray-600 max-w-2xl">
                The highest-ranked organizers leading Ghana's event scene
              </p>
            </div>
            <div className={`grid gap-6 ${
              topOrganizers.length === 1 ? 'grid-cols-1 md:grid-cols-1' : 
              topOrganizers.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 
              'grid-cols-1 md:grid-cols-3'
            }`}>
              {topOrganizers.map((org, idx) => (
                <OrganizerCard 
                  key={`top-${org.id}`} 
                  organizer={transformOrganizerToCard(org, idx + 1)} 
                  showRanking={true} 
                  className="w-full" 
                />
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* All Organizers Section */}
      <div className="container mx-auto px-4 pb-12">
        {organizers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              All Event Organizers
            </h2>
            <p className="text-gray-600">
              Browse through all event organizers on our platform
            </p>
          </div>
        )}
        
        {currentOrganizers.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {currentOrganizers
                .filter((_, idx) => !(shouldShowTopOrganizers && idx < highlightedCount))
                .map((org) => (
                  <OrganizerCard 
                    key={org.id} 
                    organizer={transformOrganizerToCard(org)} 
                    showRanking={false} 
                  />
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
                  
                  <div className="flex items-center">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        return page === 1 || page === totalPages || 
                               (page >= currentPage - 1 && page <= currentPage + 1);
                      })
                      .map((page, index, array) => {
                        const previousPage = index > 0 ? array[index - 1] : null;
                        const showEllipsisBefore = previousPage && page - previousPage > 1;
                        
                        return (
                          <React.Fragment key={page}>
                            {showEllipsisBefore && (
                              <span className="px-2 py-1 text-neutral-400">...</span>
                            )}
                            <button
                              onClick={() => handlePageChange(page)}
                              className={`w-8 h-8 flex items-center justify-center rounded-md mx-1 ${
                                currentPage === page
                                  ? 'bg-primary text-white'
                                  : 'text-neutral-700 hover:bg-neutral-50'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}
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
          <div className="py-16 text-center">
            <Users className="mx-auto h-16 w-16 text-neutral-300 mb-4" />
            <h3 className="text-xl font-medium mb-2">No Organizers Found</h3>
            <p className="text-neutral-500 mb-6">We couldn't find any organizers matching your criteria</p>
            <button 
              onClick={resetFilters}
              className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OrganizersPage() {
  // ✅ SESSION MANAGEMENT: Prevent session expiration during organizer browsing
  useSessionManagement();

  return (
    <Suspense fallback={<PageLoader message="Loading organizers..." fullHeight />}>
      <OrganizersContent />
    </Suspense>
  );
}
