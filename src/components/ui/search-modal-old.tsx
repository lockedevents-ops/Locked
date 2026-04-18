"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Calendar, 
  MapPin, 
  Tag, 
  DollarSign,
  Filter,
  ChevronDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Event categories matching your CategoryStrip component
const EVENT_CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'music', label: 'Music' },
  { value: 'arts_culture', label: 'Arts & Culture' },
  { value: 'theatre', label: 'Theatre' },
  { value: 'dance', label: 'Dance' },
  { value: 'film', label: 'Film' },
  { value: 'traditional', label: 'Traditional' },
  { value: 'business', label: 'Business' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'networking', label: 'Networking' },
  { value: 'career', label: 'Career' },
  { value: 'food_drink', label: 'Food & Drink' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'health_wellness', label: 'Health & Wellness' },
  { value: 'sports_fitness', label: 'Sports & Fitness' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'technology', label: 'Technology' },
  { value: 'education', label: 'Education' },
  { value: 'academic', label: 'Academic' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'community', label: 'Community' },
  { value: 'charity', label: 'Charity' },
  { value: 'religious', label: 'Religious' },
  { value: 'political', label: 'Political' },
];

// Popular Ghanaian cities
const GHANA_CITIES = [
  { value: '', label: 'All Locations' },
  { value: 'Accra', label: 'Accra' },
  { value: 'Kumasi', label: 'Kumasi' },
  { value: 'Tamale', label: 'Tamale' },
  { value: 'Takoradi', label: 'Takoradi' },
  { value: 'Cape Coast', label: 'Cape Coast' },
  { value: 'Tema', label: 'Tema' },
  { value: 'Ho', label: 'Ho' },
  { value: 'Sunyani', label: 'Sunyani' },
  { value: 'Koforidua', label: 'Koforidua' },
  { value: 'Wa', label: 'Wa' },
  { value: 'Bolgatanga', label: 'Bolgatanga' },
];

// Price ranges
const PRICE_RANGES = [
  { value: '', label: 'Any Price' },
  { value: 'free', label: 'Free Events' },
  { value: '0-50', label: 'Under GH₵ 50' },
  { value: '50-100', label: 'GH₵ 50 - 100' },
  { value: '100-200', label: 'GH₵ 100 - 200' },
  { value: '200-500', label: 'GH₵ 200 - 500' },
  { value: '500+', label: 'GH₵ 500+' },
];

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Search filters state
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle escape key and outside clicks
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node) && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Build search URL with all filters
  const buildSearchUrl = () => {
    const params = new URLSearchParams();
    
    if (keyword.trim()) params.set('search', keyword.trim());
    if (category) params.set('category', category);
    if (location) params.set('location', location);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    
    // Handle price range
    if (priceRange === 'free') {
      params.set('freeOnly', 'true');
    } else if (priceRange && priceRange !== '') {
      params.set('priceRange', priceRange);
    }
    
    return `/pages/discover${params.toString() ? `?${params.toString()}` : ''}`;
  };

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const searchUrl = buildSearchUrl();
    router.push(searchUrl);
    onClose();
  };

  // Clear all filters
  const handleClearFilters = () => {
    setKeyword('');
    setCategory('');
    setLocation('');
    setPriceRange('');
    setStartDate('');
    setEndDate('');
    setShowAdvancedFilters(false);
  };

  // Check if any filters are active
  const hasActiveFilters = category || location || priceRange || startDate || endDate;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />
          
          {/* Modal - Centered */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl bg-white rounded-lg shadow-2xl my-8 max-h-[calc(100vh-4rem)] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div className="sticky top-0 bg-black text-white px-6 py-4 border-b border-neutral-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Search className="w-5 h-5" />
                  <div>
                    <h2 className="text-lg font-semibold">Search Events</h2>
                    <p className="text-sm text-neutral-400">Filter by category, location, price, and date</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                  aria-label="Close search"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={handleSearch} className="space-y-6">
                {/* Keyword Search */}
                <div>
                  <label className="block text-sm font-medium text-neutral-900 mb-2">
                    Search Keywords
                  </label>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="Event name, description, organizer..."
                      className="w-full pl-11 pr-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  </div>
                </div>

                {/* Quick Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 mb-2 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all appearance-none bg-white cursor-pointer"
                    >
                      {EVENT_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location
                    </label>
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all appearance-none bg-white cursor-pointer"
                    >
                      {GHANA_CITIES.map((city) => (
                        <option key={city.value} value={city.value}>
                          {city.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Advanced Filters Toggle */}
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center gap-2 text-neutral-900 hover:text-neutral-700 font-medium transition-colors cursor-pointer"
                >
                  <Filter className="w-4 h-4" />
                  {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
                  <ChevronDown 
                    className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} 
                  />
                </button>

                {/* Advanced Filters */}
                <AnimatePresence>
                  {showAdvancedFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4 border-t border-neutral-200 pt-5"
                    >
                      {/* Price Range */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-900 mb-2 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Price Range
                        </label>
                        <select
                          value={priceRange}
                          onChange={(e) => setPriceRange(e.target.value)}
                          className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all appearance-none bg-white cursor-pointer"
                        >
                          {PRICE_RANGES.map((range) => (
                            <option key={range.value} value={range.value}>
                              {range.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Date Range */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-900 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-neutral-900 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            End Date
                          </label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate || new Date().toISOString().split('T')[0]}
                            className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent transition-all cursor-pointer"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Active Filters Summary */}
                {hasActiveFilters && (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-neutral-900 mb-2 flex items-center gap-2">
                          <Filter className="w-4 h-4" />
                          Active Filters
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {category && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-neutral-300 rounded-full text-sm text-neutral-700">
                              <Tag className="w-3 h-3" />
                              {EVENT_CATEGORIES.find(c => c.value === category)?.label}
                            </span>
                          )}
                          {location && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-neutral-300 rounded-full text-sm text-neutral-700">
                              <MapPin className="w-3 h-3" />
                              {location}
                            </span>
                          )}
                          {priceRange && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-neutral-300 rounded-full text-sm text-neutral-700">
                              <DollarSign className="w-3 h-3" />
                              {PRICE_RANGES.find(p => p.value === priceRange)?.label}
                            </span>
                          )}
                          {startDate && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-neutral-300 rounded-full text-sm text-neutral-700">
                              <Calendar className="w-3 h-3" />
                              From {new Date(startDate).toLocaleDateString()}
                            </span>
                          )}
                          {endDate && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-neutral-300 rounded-full text-sm text-neutral-700">
                              <Calendar className="w-3 h-3" />
                              To {new Date(endDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="text-sm text-neutral-900 hover:text-neutral-700 font-medium whitespace-nowrap cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-3 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-black text-white rounded-lg hover:bg-neutral-800 font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Search className="w-5 h-5" />
                    Search Events
                  </button>
                </div>
              </form>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
