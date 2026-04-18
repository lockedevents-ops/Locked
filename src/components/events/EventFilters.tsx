"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef, useCallback, useRef } from 'react';
import { Search, CalendarRange, MapPin, Filter, SlidersHorizontal, ChevronDown } from 'lucide-react';

interface FiltersState {
  search: string;
  category: string;
  location: string;
  date: Date | undefined;
  price: [number, number] | null;
  freeOnly: boolean;
  hasVoting: boolean;
  hasMerch: boolean;
  isFeatured: boolean;
  isAdult: boolean; // 18+ events filter
  eventType?: 'all' | 'online' | 'in-person';
}

interface EventFiltersProps {
  onFilterChange: (filters: FiltersState) => void;
  initialFilters?: Partial<FiltersState>;
}

export interface EventFiltersRef {
  clearFilters: () => void;
}

export const EventFilters = forwardRef<EventFiltersRef, EventFiltersProps>(({ onFilterChange, initialFilters = {} }, ref) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [priceFilterActive, setPriceFilterActive] = useState(Boolean(initialFilters.price));
  const [filters, setFilters] = useState<FiltersState>({
    search: initialFilters.search || '',
    category: initialFilters.category || '',
    location: initialFilters.location || '',
    date: initialFilters.date,
    price: initialFilters.price || [0, 1000],
    freeOnly: initialFilters.freeOnly || false,
    hasVoting: initialFilters.hasVoting || false,
    hasMerch: initialFilters.hasMerch || false,
    isFeatured: initialFilters.isFeatured || false,
    isAdult: initialFilters.isAdult || false,
    eventType: initialFilters.eventType || 'all'
  });
  
  // Track previous initialFilters to detect URL-driven changes
  const prevInitialFiltersRef = useRef<string>('');
  
  // ✅ Sync filters with initialFilters when URL changes (e.g., from SearchSidebar)
  // This ensures the EventFilters component resets when navigating with new URL params
  useEffect(() => {
    // Create a stable string representation of the relevant initialFilters
    const currentFiltersKey = JSON.stringify({
      search: initialFilters.search || '',
      category: initialFilters.category || '',
      location: initialFilters.location || '',
      freeOnly: initialFilters.freeOnly || false,
      hasVoting: initialFilters.hasVoting || false,
      hasMerch: initialFilters.hasMerch || false,
      isFeatured: initialFilters.isFeatured || false,
      isAdult: initialFilters.isAdult || false,
      eventType: initialFilters.eventType || 'all'
    });
    
    // Only update if the initialFilters actually changed (URL navigation)
    if (prevInitialFiltersRef.current === currentFiltersKey) {
      return;
    }
    
    // Skip the very first render (initial state already set)
    if (prevInitialFiltersRef.current === '') {
      prevInitialFiltersRef.current = currentFiltersKey;
      return;
    }
    
    prevInitialFiltersRef.current = currentFiltersKey;
    
    // Reset filters to match new initialFilters from URL
    const newFilters: FiltersState = {
      search: initialFilters.search || '',
      category: initialFilters.category || '',
      location: initialFilters.location || '',
      date: initialFilters.date,
      price: initialFilters.price || [0, 1000],
      freeOnly: initialFilters.freeOnly || false,
      hasVoting: initialFilters.hasVoting || false,
      hasMerch: initialFilters.hasMerch || false,
      isFeatured: initialFilters.isFeatured || false,
      isAdult: initialFilters.isAdult || false,
      eventType: initialFilters.eventType || 'all'
    };
    
    setFilters(newFilters);
    setPriceFilterActive(Boolean(initialFilters.price) || initialFilters.freeOnly || false);
  }, [initialFilters]);

  // Use a ref for priceFilterActive to avoid recreating emitFilters callback
  const priceFilterActiveRef = useRef(priceFilterActive);
  useEffect(() => {
    priceFilterActiveRef.current = priceFilterActive;
  }, [priceFilterActive]);

  const emitFilters = useCallback((nextFilters: FiltersState) => {
    const normalizedFilters: FiltersState = {
      ...nextFilters,
      price: priceFilterActiveRef.current ? nextFilters.price : null,
    };
    onFilterChange(normalizedFilters);
  }, [onFilterChange]);

  // Track previous filters to avoid emitting on every render
  const prevFiltersRef = useRef<string>('');
  
  // Apply filters when they change
  useEffect(() => {
    const filtersKey = JSON.stringify(filters);
    if (prevFiltersRef.current !== filtersKey) {
      prevFiltersRef.current = filtersKey;
      emitFilters(filters);
    }
  }, [filters, emitFilters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, category: e.target.value }));
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, location: e.target.value }));
  };

  const handleFreeOnlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ 
      ...prev, 
      freeOnly: e.target.checked,
      // Reset price range when switching to free only
      price: e.target.checked ? [0, 0] : [0, 1000]
    }));
    if (e.target.checked) {
      setPriceFilterActive(false);
    }
  };

  const handleVotingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, hasVoting: e.target.checked }));
  };

  const handleFeaturedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, isFeatured: e.target.checked }));
  };

  const handleMerchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, hasMerch: e.target.checked }));
  };

  const handleEventTypeChange = (type: 'all' | 'online' | 'in-person') => {
    setFilters(prev => ({ ...prev, eventType: type }));
  };

  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const min = parseInt(e.target.value, 10) || 0;
    setFilters(prev => ({ 
      ...prev, 
      price: [min, prev.price ? Math.max(min, prev.price[1]) : 1000] 
    }));
    setPriceFilterActive(true);
  };

  const handleMaxPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const max = parseInt(e.target.value, 10) || 1000;
    setFilters(prev => ({ 
      ...prev, 
      price: [prev.price ? Math.min(prev.price[0], max) : 0, max] 
    }));
    setPriceFilterActive(true);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      location: '',
      date: undefined,
      price: [0, 1000],
      freeOnly: false,
      hasVoting: false,
      hasMerch: false,
      isFeatured: false,
      isAdult: false,
      eventType: 'all'
    });
    setPriceFilterActive(false);
  };

  // Expose clearFilters function to parent component
  useImperativeHandle(ref, () => ({
    clearFilters
  }));

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      {/* Simple Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            id="event-search"
            name="eventSearch"
            type="text"
            placeholder="Search events..."
            className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={filters.search}
            onChange={handleSearchChange}
          />
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 cursor-pointer"
        >
          <Filter size={18} />
          <span className="font-medium">Filters</span>
          <ChevronDown 
            size={18} 
            className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
          />
        </button>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={handleCategoryChange}
                className="select-styled w-full border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="">All Categories</option>
                <option value="Music Festival">Music</option>
                <option value="Tech">Tech</option>
                <option value="Food & Drink">Food & Drink</option>
                <option value="Arts & Culture">Arts & Culture</option>
                <option value="Business">Business</option>
                <option value="Travel">Travel</option>
                <option value="Sports">Sports</option>
                <option value="Education">Education</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Networking">Networking</option>
                <option value="Workshops">Workshops</option>
                <option value="Wellness">Health & Wellness</option>
                <option value="Literature">Literature</option>
                <option value="Family">Family & Kids</option>
                <option value="Science">Science</option>
                <option value="Charity">Charity</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <select
                value={filters.location}
                onChange={handleLocationChange}
                className="select-styled w-full border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
              >
                <option value="">All Locations</option>
                <option value="Greater Accra">Greater Accra</option>
                <option value="Ashanti">Ashanti</option>
                <option value="Western">Western</option>
                <option value="Western North">Western North</option>
                <option value="Eastern">Eastern</option>
                <option value="Central">Central</option>
                <option value="Volta">Volta</option>
                <option value="Oti">Oti</option>
                <option value="Northern">Northern</option>
                <option value="Savannah">Savannah</option>
                <option value="North East">North East</option>
                <option value="Upper East">Upper East</option>
                <option value="Upper West">Upper West</option>
                <option value="Bono">Bono</option>
                <option value="Bono East">Bono East</option>
                <option value="Ahafo">Ahafo</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
              <div className={`flex items-center gap-2 ${filters.freeOnly ? 'opacity-50' : ''}`}>
                {/* Min Price Input */}
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₵</span>
                  <input
                    id="min-price"
                    name="min-price"
                    type="number"
                    min="0"
                    placeholder="Min"
                    className="pl-8 pr-2 py-2 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={filters.price?.[0] || 0}
                    onChange={handleMinPriceChange}
                    disabled={filters.freeOnly}
                  />
                </div>
                <span className="text-gray-400">to</span>
                {/* Max Price Input */}
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₵</span>
                  <input
                    id="max-price"
                    name="max-price"
                    type="number"
                    min="0"
                    placeholder="Max"
                    className="pl-8 pr-2 py-2 border border-gray-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={filters.price?.[1] || 1000}
                    onChange={handleMaxPriceChange}
                    disabled={filters.freeOnly}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter Events</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="eventTypeFilter"
                    value="all"
                    checked={filters.eventType === 'all' && !filters.freeOnly && !filters.hasVoting && !filters.hasMerch && !filters.isFeatured}
                    onChange={() => {
                      // Clear ALL filters when "All Events" is selected
                      const clearedFilters: FiltersState = {
                        ...filters,
                        eventType: 'all',
                        freeOnly: false,
                        hasVoting: false,
                        hasMerch: false,
                        isFeatured: false
                      };
                      setFilters(clearedFilters);
                    }}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 cursor-pointer accent-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">All Events</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="eventTypeFilter"
                    value="online"
                    checked={filters.eventType === 'online'}
                    onChange={() => {
                      setFilters(prev => ({ 
                        ...prev, 
                        eventType: 'online',
                        freeOnly: false,
                        hasVoting: false,
                        hasMerch: false,
                        isFeatured: false
                      }));
                    }}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 cursor-pointer accent-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">Online Events</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="eventTypeFilter"
                    value="in-person"
                    checked={filters.eventType === 'in-person'}
                    onChange={() => {
                      setFilters(prev => ({ 
                        ...prev, 
                        eventType: 'in-person',
                        freeOnly: false,
                        hasVoting: false,
                        hasMerch: false,
                        isFeatured: false
                      }));
                    }}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 cursor-pointer accent-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">In-Person Events</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="eventTypeFilter"
                    value="free"
                    checked={filters.freeOnly === true}
                    onChange={() => {
                      setFilters(prev => ({ 
                        ...prev, 
                        eventType: 'all',
                        freeOnly: true,
                        hasVoting: false,
                        hasMerch: false,
                        isFeatured: false,
                        price: [0, 0]
                      }));
                      setPriceFilterActive(false);
                    }}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 cursor-pointer accent-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">Free Events Only</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="eventTypeFilter"
                    value="voting"
                    checked={filters.hasVoting === true}
                    onChange={() => {
                      setFilters(prev => ({ 
                        ...prev, 
                        eventType: 'all',
                        freeOnly: false,
                        hasVoting: true,
                        hasMerch: false,
                        isFeatured: false
                      }));
                    }}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 cursor-pointer accent-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">Events with Voting</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="eventTypeFilter"
                    value="merch"
                    checked={filters.hasMerch === true}
                    onChange={() => {
                      setFilters(prev => ({ 
                        ...prev, 
                        eventType: 'all',
                        freeOnly: false,
                        hasVoting: false,
                        hasMerch: true,
                        isFeatured: false
                      }));
                    }}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 cursor-pointer accent-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700">Has Merchandise</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="eventTypeFilter"
                    value="featured"
                    checked={filters.isFeatured === true}
                    onChange={() => {
                      setFilters(prev => ({ 
                        ...prev, 
                        eventType: 'all',
                        freeOnly: false,
                        hasVoting: false,
                        hasMerch: false,
                        isFeatured: true
                      }));
                    }}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 cursor-pointer accent-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700 flex items-center">
                    <span className="mr-1">Featured Events</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500">
                      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                    </svg>
                  </span>
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-center md:justify-end">
              <button
                onClick={clearFilters}
                className="w-full md:w-auto px-6 py-2.5 text-sm font-medium bg-black text-white hover:bg-gray-800 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Clear All Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

EventFilters.displayName = 'EventFilters';
