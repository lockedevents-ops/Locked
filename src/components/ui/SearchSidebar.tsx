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
  Vote,
  ShoppingBag
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SearchSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Event categories
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

// Ghana regions
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

export function SearchSidebar({ isOpen, onClose }: SearchSidebarProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hasVoting, setHasVoting] = useState(false);
  const [hasMerch, setHasMerch] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const keywordInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input when sidebar opens
  useEffect(() => {
    if (isOpen && keywordInputRef.current) {
      setTimeout(() => keywordInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Build search URL
  const buildSearchUrl = () => {
    const params = new URLSearchParams();
    
    if (keyword.trim()) params.set('search', keyword.trim());
    if (category) params.set('category', category);
    if (location) params.set('location', location);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (hasVoting) params.set('hasVoting', 'true');
    if (hasMerch) params.set('hasMerch', 'true');
    if (isAdult) params.set('isAdult', 'true');
    
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
    // Reset form after search
    setTimeout(handleClearFilters, 300);
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
    setEndDate('');
    setHasVoting(false);
    setHasMerch(false);
    setIsAdult(false);
  };

  // Check if any filters are active
  const hasActiveFilters = category || location || priceRange || startDate || endDate || hasVoting;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
          />

          {/* Sidebar Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-[101] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-100 bg-white z-10">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-neutral-900" />
                <h2 className="text-xl font-bold text-neutral-900">Search Space</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                aria-label="Close search"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-5">
                {/* Search Keyword */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                    <Search className="w-4 h-4 text-neutral-500" />
                    Keywords
                  </label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      ref={keywordInputRef}
                      type="text"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Event name, artist, venue..."
                      className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:border-neutral-900 focus:outline-none focus:bg-white transition-all placeholder:text-neutral-400"
                    />
                  </div>
                </div>

                {/* Primary Filters */}
                <div className="space-y-4">
                  {/* Category Filter */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                      <Tag className="w-4 h-4 text-neutral-500" />
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
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Location Filter */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                      <MapPin className="w-4 h-4 text-neutral-500" />
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
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Advanced Filters Toggle */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors w-full py-2 border-t border-b border-neutral-100 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Advanced Filters</span>
                    <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showAdvancedFilters && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 space-y-4">
                            {/* Price Range */}
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                                <DollarSign className="w-4 h-4 text-neutral-500" />
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
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                              </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                                  <Calendar className="w-4 h-4 text-neutral-500" />
                                  From
                                </label>
                                <input
                                  type="date"
                                  value={startDate}
                                  onChange={(e) => setStartDate(e.target.value)}
                                  className="w-full px-3 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:border-neutral-900 focus:outline-none focus:bg-white transition-all cursor-pointer"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
                                  <Calendar className="w-4 h-4 text-neutral-500" />
                                  To
                                </label>
                                <input
                                  type="date"
                                  value={endDate}
                                  onChange={(e) => setEndDate(e.target.value)}
                                  min={startDate}
                                  className="w-full px-3 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:border-neutral-900 focus:outline-none focus:bg-white transition-all cursor-pointer"
                                />
                              </div>
                            </div>

                            {/* Voting Filter */}
                            <label className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-100 transition-colors">
                              <input
                                type="checkbox"
                                checked={hasVoting}
                                onChange={(e) => setHasVoting(e.target.checked)}
                                className="w-4 h-4 text-neutral-900 border-neutral-300 rounded focus:ring-2 focus:ring-neutral-900 cursor-pointer"
                              />
                              <div className="flex items-center gap-2">
                                <Vote className="w-4 h-4 text-neutral-700" />
                                <span className="text-sm font-medium text-neutral-900">Has Voting</span>
                              </div>
                            </label>

                            {/* Merchandise Filter */}
                            <label className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-100 transition-colors">
                              <input
                                type="checkbox"
                                checked={hasMerch}
                                onChange={(e) => setHasMerch(e.target.checked)}
                                className="w-4 h-4 text-neutral-900 border-neutral-300 rounded focus:ring-2 focus:ring-neutral-900 cursor-pointer"
                              />
                              <div className="flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4 text-neutral-700" />
                                <span className="text-sm font-medium text-neutral-900">Has Merchandise</span>
                              </div>
                            </label>

                            {/* 18+ Filter */}
                            <label className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-200 rounded-lg cursor-pointer hover:bg-neutral-100 transition-colors">
                              <input
                                type="checkbox"
                                checked={isAdult}
                                onChange={(e) => setIsAdult(e.target.checked)}
                                className="w-4 h-4 text-neutral-900 border-neutral-300 rounded focus:ring-2 focus:ring-neutral-900 cursor-pointer"
                              />
                              <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-4 h-4 bg-red-100 text-red-600 font-bold text-[10px] rounded-full">18</span>
                                <span className="text-sm font-medium text-neutral-900">18+ Event</span>
                              </div>
                            </label>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Footer with Actions */}
            <div className="p-6 border-t border-neutral-100 bg-white">
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {category && (
                      <span className="px-2 py-1 bg-neutral-100 rounded text-xs text-neutral-600">
                        {EVENT_CATEGORIES.find(c => c.value === category)?.label}
                      </span>
                    )}
                    {location && (
                      <span className="px-2 py-1 bg-neutral-100 rounded text-xs text-neutral-600">
                        {location}
                      </span>
                    )}
                    <button 
                      onClick={handleClearFilters}
                      className="text-xs text-red-500 hover:text-red-700 font-medium ml-auto"
                    >
                      Clear Filters
                    </button>
                </div>
              )}
              
              <button
                onClick={handleSearch}
                className="w-full py-4 bg-neutral-900 hover:bg-black text-white rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-neutral-900/10 hover:shadow-neutral-900/20 active:scale-[0.98] cursor-pointer"
              >
                <Search className="w-5 h-5" />
                Show Results
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
