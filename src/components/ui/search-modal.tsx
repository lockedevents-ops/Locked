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
  SlidersHorizontal,
  ChevronDown,
  Vote
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

// Ghana regions (matching EventFilters and event creation forms)
const GHANA_REGIONS = [
  { value: '', label: 'All Regions' },
  { value: 'Greater Accra', label: 'Greater Accra' },
  { value: 'Ashanti', label: 'Ashanti' },
  { value: 'Western', label: 'Western' },
  { value: 'Western North', label: 'Western North' },
  { value: 'Eastern', label: 'Eastern' },
  { value: 'Central', label: 'Central' },
  { value: 'Volta', label: 'Volta' },
  { value: 'Oti', label: 'Oti' },
  { value: 'Northern', label: 'Northern' },
  { value: 'Savannah', label: 'Savannah' },
  { value: 'North East', label: 'North East' },
  { value: 'Upper East', label: 'Upper East' },
  { value: 'Upper West', label: 'Upper West' },
  { value: 'Bono', label: 'Bono' },
  { value: 'Bono East', label: 'Bono East' },
  { value: 'Ahafo', label: 'Ahafo' },
];

// Price ranges
const PRICE_RANGES = [
  { value: '', label: 'Any Price' },
  { value: 'free', label: 'Free' },
  { value: '0-50', label: '₵0 - ₵50' },
  { value: '50-100', label: '₵50 - ₵100' },
  { value: '100-200', label: '₵100 - ₵200' },
  { value: '200-500', label: '₵200 - ₵500' },
  { value: '500+', label: '₵500+' }
];

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasVoting, setHasVoting] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const keywordInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (isOpen && keywordInputRef.current) {
      setTimeout(() => keywordInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Build search URL
  const buildSearchUrl = () => {
    const params = new URLSearchParams();
    
    if (keyword.trim()) params.set('search', keyword.trim());
    if (category) params.set('category', category);
    if (location) params.set('location', location);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (hasVoting) params.set('hasVoting', 'true');
    
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
    const url = buildSearchUrl();
    router.push(url);
    onClose();
  };

  // Handle Enter key in keyword input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(e as any);
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setKeyword('');
    setCategory('');
    setLocation('');
    setPriceRange('');
    setStartDate('');
    setEndDate('');
    setHasVoting(false);
  };

  // Check if any filters are active
  const hasActiveFilters = category || location || priceRange || startDate || endDate || hasVoting;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9998]"
            onClick={onClose}
          />
          
          {/* Modal Container */}
          <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 p-4 overflow-y-auto">
            <motion.div
              ref={modalRef}
              initial={{ opacity: 0, scale: 0.96, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl my-8 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Search Bar */}
              <div className="bg-gradient-to-r from-neutral-50 to-neutral-100 px-6 py-6 border-b border-neutral-200">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
                      <Search className="w-6 h-6 text-neutral-700" />
                      Find Your Perfect Event
                    </h2>
                    <p className="text-sm text-neutral-600 mt-1">Search by keyword, category, location, and more</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-neutral-200 rounded-full transition-colors cursor-pointer"
                    aria-label="Close search"
                  >
                    <X className="w-5 h-5 text-neutral-700" />
                  </button>
                </div>

                {/* Main Search Input */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                  <input
                    ref={keywordInputRef}
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search for events, concerts, workshops..."
                    className="w-full pl-12 pr-4 py-4 bg-white border-2 border-neutral-200 rounded-xl text-base focus:border-neutral-900 focus:outline-none transition-colors placeholder:text-neutral-400"
                  />
                </div>
              </div>

              {/* Filters Section */}
              <div className="p-6">
                <form onSubmit={handleSearch} className="space-y-6">
                  {/* Quick Filters Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Category Filter */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                        <Tag className="w-4 h-4" />
                        Category
                      </label>
                      <div className="relative">
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:border-neutral-900 focus:outline-none focus:bg-white transition-all appearance-none cursor-pointer pr-10"
                        >
                          {EVENT_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Location Filter */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                        <MapPin className="w-4 h-4" />
                        Region
                      </label>
                      <div className="relative">
                        <select
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:border-neutral-900 focus:outline-none focus:bg-white transition-all appearance-none cursor-pointer pr-10"
                        >
                          {GHANA_REGIONS.map((region) => (
                            <option key={region.value} value={region.value}>
                              {region.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Advanced Filters Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
                    <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Advanced Filters */}
                  <AnimatePresence>
                    {showAdvancedFilters && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 space-y-4 border-t border-neutral-200">
                          {/* Price and Date in Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Price Range */}
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                                <DollarSign className="w-4 h-4" />
                                Price Range
                              </label>
                              <div className="relative">
                                <select
                                  value={priceRange}
                                  onChange={(e) => setPriceRange(e.target.value)}
                                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:border-neutral-900 focus:outline-none focus:bg-white transition-all appearance-none cursor-pointer pr-10"
                                >
                                  {PRICE_RANGES.map((range) => (
                                    <option key={range.value} value={range.value}>
                                      {range.label}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
                              </div>
                            </div>

                            {/* Date From */}
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                                <Calendar className="w-4 h-4" />
                                Date From
                              </label>
                              <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:border-neutral-900 focus:outline-none focus:bg-white transition-all cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* Date To */}
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                              <Calendar className="w-4 h-4" />
                              Date To
                            </label>
                            <input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              min={startDate}
                              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:border-neutral-900 focus:outline-none focus:bg-white transition-all cursor-pointer"
                            />
                          </div>

                          {/* Voting Filter Checkbox */}
                          <div className="space-y-2">
                            <label className="flex items-center gap-3 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-100 transition-colors">
                              <input
                                type="checkbox"
                                checked={hasVoting}
                                onChange={(e) => setHasVoting(e.target.checked)}
                                className="w-4 h-4 text-neutral-900 border-neutral-300 rounded focus:ring-2 focus:ring-neutral-900 cursor-pointer"
                              />
                              <div className="flex items-center gap-2">
                                <Vote className="w-4 h-4 text-neutral-700" />
                                <span className="text-sm font-semibold text-neutral-700">Events with Voting</span>
                              </div>
                            </label>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Active Filters Summary */}
                  {hasActiveFilters && (
                    <div className="flex items-center gap-2 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                      <span className="text-sm font-medium text-neutral-700">Active filters:</span>
                      <div className="flex flex-wrap gap-2">
                        {category && (
                          <span className="px-3 py-1 bg-white border border-neutral-300 rounded-full text-xs font-medium text-neutral-700">
                            {EVENT_CATEGORIES.find(c => c.value === category)?.label}
                          </span>
                        )}
                        {location && (
                          <span className="px-3 py-1 bg-white border border-neutral-300 rounded-full text-xs font-medium text-neutral-700">
                            {location}
                          </span>
                        )}
                        {priceRange && (
                          <span className="px-3 py-1 bg-white border border-neutral-300 rounded-full text-xs font-medium text-neutral-700">
                            {PRICE_RANGES.find(p => p.value === priceRange)?.label}
                          </span>
                        )}
                        {startDate && (
                          <span className="px-3 py-1 bg-white border border-neutral-300 rounded-full text-xs font-medium text-neutral-700">
                            From {new Date(startDate).toLocaleDateString()}
                          </span>
                        )}
                        {endDate && (
                          <span className="px-3 py-1 bg-white border border-neutral-300 rounded-full text-xs font-medium text-neutral-700">
                            To {new Date(endDate).toLocaleDateString()}
                          </span>
                        )}
                        {hasVoting && (
                          <span className="px-3 py-1 bg-white border border-neutral-300 rounded-full text-xs font-medium text-neutral-700 flex items-center gap-1">
                            <Vote className="w-3 h-3" />
                            Has Voting
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="ml-auto text-xs font-medium text-neutral-600 hover:text-neutral-900 underline cursor-pointer"
                      >
                        Clear all
                      </button>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-6 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
