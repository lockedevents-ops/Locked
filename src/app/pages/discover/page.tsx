"use client";

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { EventCard } from '@/components/events/EventCard';
import { EventFilters, type EventFiltersRef } from '@/components/events/EventFilters';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useDiscoverEvents, type DiscoverFilters } from '@/hooks/useDiscoverEvents';
import { PageLoader } from '@/components/loaders/PageLoader';
import { DiscoverHero } from '@/components/discover/DiscoverHero';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import { formatCategoryForDisplay } from '@/utils/eventUtils';



// Helper to generate filter heading for results count
// Helper to capitalize each word (title case)
const toTitleCase = (str: string): string => {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

// Check if "All Events" is selected (no special filters active)
const isAllEventsFilter = (filters: Partial<DiscoverFilters>): boolean => {
  return !filters.category && 
         !filters.location && 
         !filters.freeOnly && 
         !filters.hasMerch && 
         !filters.isFeatured && 
         !filters.hasVoting && 
         !filters.isAdult &&
         (!filters.eventType || filters.eventType === 'all');
};

const getFilterHeading = (filters: Partial<DiscoverFilters>, isTrending?: boolean): string => {
  const parts: string[] = [];
  
  // Add category if set
  if (filters.category) {
    parts.push(formatCategoryForDisplay(filters.category));
  }
  
  // Add Trending modifier if active
  if (isTrending) {
    parts.push('Trending');
  }
  
  // Add event type modifier
  if (filters.eventType === 'online') {
    parts.push('online');
  } else if (filters.eventType === 'in-person') {
    parts.push('in-person');
  }
  
  // Add special filter modifiers
  if (filters.freeOnly) {
    parts.push('free');
  }
  if (filters.isFeatured) {
    parts.push('featured');
  }
  if (filters.hasVoting) {
    parts.push('voting');
  }
  if (filters.isAdult && filters.category !== '18+') {
    parts.push('18+');
  }
  
  // Build the base text
  let text = parts.length > 0 ? `${parts.join(' ')} events` : 'events';
  
  // Add "with merchandise" after "events" for proper grammar
  if (filters.hasMerch) {
    text += ' with merchandise';
  }
  
  // Add location suffix with proper capitalization
  if (filters.location) {
    text += ` in ${toTitleCase(filters.location)}`;
  }
  
  return text;
};

// ✅ PHASE 1 OPTIMIZATION: Memoized EventGrid to prevent re-renders
const EventGrid = React.memo(({ events, currentPage, eventsPerPage }: { 
  events: any[]; 
  currentPage: number; 
  eventsPerPage: number; 
}) => {
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = events.slice(indexOfFirstEvent, indexOfLastEvent);
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {currentEvents.map(event => (
        <EventCard 
          key={event.id} 
          id={event.id}
          slug={event.slug}
          title={event.title}
          description={event.description}
          startDate={event.startDate}
          endDate={event.endDate}
          date={event.date || 'TBA'}
          time={event.time || 'TBA'}
          location={event.location || 'Location TBA'}
          imageUrl={event.imageUrl || ''}
          price={event.price || 'Free'}
          category={event.category || 'Event'}
          isFeatured={event.isFeatured}
          hasVoting={event.hasVoting}
          hasMerch={event.hasMerch || event.has_merch}
          lockCount={event.lockCount || 0}
          remainingTickets={event.remainingTickets}
          tickets={event.tickets}
          organizer={event.organizer}
        />
      ))}
    </div>
  );
});

EventGrid.displayName = 'EventGrid';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Discover page error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            {/* Broken WiFi Icon */}
            <svg className="mx-auto h-16 w-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Page</h2>
            <p className="text-gray-600 mb-2">We encountered an error while loading the discover page.</p>
            <p className="text-sm text-gray-500 mb-6">Please check your internet connection and try again.</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reload Page
            </button>
            {this.state.error && (
              <details className="mt-4">
                <summary className="text-sm text-gray-500 cursor-pointer">Error details</summary>
                <pre className="text-xs text-gray-400 mt-2 p-2 bg-gray-100 rounded overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function DiscoverContent() {
  const searchParams = useSearchParams();
  const filterRef = useRef<EventFiltersRef>(null);
  
  // Check if we should sort by locks (from Top Locked category)
  const sortByLocks = searchParams.get('sortByLocks') === 'true';
  
  // Initialize filters with URL parameters if available - memoized to prevent infinite loops
  const initialFilters: Partial<DiscoverFilters> = React.useMemo(() => ({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    location: searchParams.get('location') || '',
    date: undefined,
    price: null, // Don't apply price filter by default
    freeOnly: searchParams.get('freeOnly') === 'true',
    hasVoting: searchParams.get('hasVoting') === 'true',
    hasMerch: searchParams.get('hasMerch') === 'true',
    isFeatured: searchParams.get('isFeatured') === 'true',
    isAdult: searchParams.get('category')?.toLowerCase() === '18+' || searchParams.get('isAdult') === 'true',
    priceRange: searchParams.get('priceRange') || undefined,
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined
  }), [searchParams]);
  
  // Track current active filters for dynamic hero title
  const [activeFilters, setActiveFilters] = useState<Partial<DiscoverFilters>>(initialFilters);
  
  const { 
    allEvents, 
    filteredEvents, 
    isLoading, 
    error, 
    applyFilters, 
    sortEvents 
  } = useDiscoverEvents(initialFilters);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [currentSort, setCurrentSort] = useState(sortByLocks ? 'locks-desc' : 'date-asc');
  const eventsPerPage = 16;
  const hasAppliedInitialSort = useRef(false);
  
  // Handle filter changes and update active filters for hero - memoized to prevent loops
  const handleFilterChange = React.useCallback((filters: DiscoverFilters) => {
    setActiveFilters(filters);
    applyFilters(filters);
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [applyFilters]);
  
  // Apply lock sorting on mount if sortByLocks is true
  useEffect(() => {
    if (sortByLocks && !hasAppliedInitialSort.current) {
      sortEvents('locks', 'desc');
      hasAppliedInitialSort.current = true;
    }
  }, [sortByLocks]);
  
  // Handle sort change
  const handleSortChange = (sortValue: string) => {
    setCurrentSort(sortValue);
    setCurrentPage(1);
    
    switch (sortValue) {
      case 'date-asc':
        sortEvents('date', 'asc');
        break;
      case 'date-desc':
        sortEvents('date', 'desc');
        break;
      case 'price-asc':
        sortEvents('price', 'asc');
        break;
      case 'price-desc':
        sortEvents('price', 'desc');
        break;
      case 'popularity':
        sortEvents('popularity', 'desc');
        break;
      case 'locks-desc':
        sortEvents('locks', 'desc');
        break;
      default:
        sortEvents('date', 'asc');
    }
  };
  
  // Calculate pagination
  // If sorting by locks (Trending/Most Locked), limit to top 10
  const displayEvents = sortByLocks ? filteredEvents.slice(0, 10) : filteredEvents;
  
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = displayEvents.slice(indexOfFirstEvent, indexOfLastEvent);
  const totalPages = Math.ceil(displayEvents.length / eventsPerPage);
  
  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen">
      {/* ✅ Dynamic Hero Section - Changes based on active filters */}
      <DiscoverHero 
        isVotingMode={activeFilters.hasVoting} 
        isAdultMode={activeFilters.isAdult}
        category={activeFilters.category}
        location={activeFilters.location}
        freeOnly={activeFilters.freeOnly}
        hasMerch={activeFilters.hasMerch}
        isFeatured={activeFilters.isFeatured}
        eventType={activeFilters.eventType}
        isTrending={sortByLocks}
      />
      
      {/* Filters Section */}
      <div className="container mx-auto px-4 py-6">
        <EventFilters 
          ref={filterRef}
          initialFilters={initialFilters}
          onFilterChange={handleFilterChange} 
        />
      </div>
      
      {/* Event Results */}
      <div className="container mx-auto px-4 pb-12">
        {/* Results Count with Dynamic Heading */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 md:gap-0 mb-6">
          <h2 className="text-lg font-semibold">
            {isAllEventsFilter(activeFilters) && !sortByLocks
              ? 'All Events' 
              : sortByLocks
                ? `Top ${displayEvents.length} Popular Events`
                : <>
                    <span className={filteredEvents.length === 0 ? 'text-red-600' : ''}>
                      {filteredEvents.length}
                    </span>
                    {' '}{getFilterHeading(activeFilters, sortByLocks)} found
                  </>
            }
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600">Sort by:</span>
            <select 
              className="select-styled border rounded-md py-1 px-2 text-sm bg-white cursor-pointer"
              value={currentSort}
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <option value="date-asc">Date: Upcoming</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="popularity">Popularity</option>
              <option value="locks-desc">Most Locked</option>
            </select>
          </div>
        </div>
        
        {/* Loading State - Use proper skeleton component */}
        {isLoading ? (
          <PageLoader message="Loading discover events..." fullHeight />
        ) : error ? (
          <div className="py-12 text-center">
            <div className="bg-white rounded-xl shadow-sm p-8 max-w-lg mx-auto border border-neutral-200">
              {/* Broken WiFi Icon */}
              <svg className="mx-auto h-16 w-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
              </svg>
              <h3 className="text-xl font-bold mb-2 text-gray-900">Unable to Load Events</h3>
              <p className="text-gray-700 mb-2">We're having trouble connecting to our servers.</p>
              <p className="text-sm text-gray-600 mb-6">{error}</p>
              <button 
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer font-medium"
                onClick={() => window.location.reload()}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            </div>
          </div>
        ) : filteredEvents.length > 0 ? (
          <>
            {/* ✅ PHASE 1 OPTIMIZATION: Use memoized EventGrid */}
            <EventGrid 
              events={filteredEvents}
              currentPage={currentPage}
              eventsPerPage={eventsPerPage}
            />
            
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
                        : 'text-neutral-700 border-neutral-300 hover:bg-neutral-50 cursor-pointer'
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
                            className={`px-3 py-1 rounded-md mx-1 cursor-pointer ${
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
                        : 'text-neutral-700 border-neutral-300 hover:bg-neutral-50 cursor-pointer'
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
            <svg 
              className="mx-auto h-16 w-16 text-neutral-300 mb-4" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={1.5} 
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            <h3 className="text-xl font-medium mb-2">No Events Found</h3>
            <p className="text-neutral-600 mb-4">
              No events match your current search criteria. Try adjusting your filters or check back later.
            </p>
            <button 
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors cursor-pointer font-medium"
              onClick={() => filterRef.current?.clearFilters()}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  // ✅ SESSION MANAGEMENT: Prevent session expiration on discover page
  useSessionManagement();

  return (
    <ErrorBoundary>
      {/* ✅ PHASE 1 OPTIMIZATION: Add Suspense boundary for instant skeleton display */}
      <Suspense fallback={<PageLoader message="Loading discover events..." fullHeight />}>
        <DiscoverContent />
      </Suspense>
    </ErrorBoundary>
  );
}
