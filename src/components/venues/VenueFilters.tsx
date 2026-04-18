"use client";

import React, { useState } from 'react';
import { Search, SlidersHorizontal, X, MapPin } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

interface VenueFiltersProps {
  onFilterChange: (filters: {
    search: string;
    location: string;
    capacity: [number, number] | null;
    priceRange: '' | '₵' | '₵₵' | '₵₵₵' | '₵₵₵₵';
    amenities: string[];
  }) => void;
}

export function VenueFilters({ onFilterChange }: VenueFiltersProps) {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState<[number, number] | null>([0, 5000]);
  const [priceRange, setPriceRange] = useState<'' | '₵' | '₵₵' | '₵₵₵' | '₵₵₵₵'>('');
  const [amenities, setAmenities] = useState<string[]>([]);
  
  const handleSearch = () => {
    onFilterChange({ search, location, capacity, priceRange, amenities });
  };

  const availableAmenities = [
    "Wi-Fi",
    "Projector & Screen",
    "Sound System",
    "Catering",
    "Parking",
    "Air Conditioning",
    "Outdoor Space",
    "Stage",
    "Security",
    "Backup Power"
  ];

  const toggleAmenity = (amenity: string) => {
    setAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="flex flex-col md:flex-row">
        {/* Search Bar */}
        <div className="flex-1 border-b md:border-b-0 md:border-r border-neutral-200">
          <div className="flex items-center px-4 h-14">
            <Search className="w-4 h-4 text-neutral-500 mr-2" />
            <input
              type="text"
              placeholder="Search venues..."
              className="flex-1 outline-none bg-transparent"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>
        
        {/* Location */}
        <div className="flex-1 border-b md:border-b-0 md:border-r border-neutral-200">
          <div className="flex items-center px-4 h-14">
            <MapPin className="w-4 h-4 text-neutral-500 mr-2" />
            <input
              type="text"
              placeholder="Location..."
              className="flex-1 outline-none bg-transparent"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="relative flex items-center px-4 h-14">
          <button
            className={`flex items-center gap-2 ${showFilters ? 'text-primary' : 'text-neutral-700'}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="font-medium text-sm">Filters</span>
          </button>
        </div>

        {/* Search Button */}
        <div className="p-2">
          <button
            className="bg-primary text-white px-6 h-10 rounded-lg hover:bg-primary/90 transition-colors"
            onClick={handleSearch}
          >
            Search
          </button>
        </div>
      </div>
      
      {/* Advanced Filters Dropdown */}
      {showFilters && (
        <div className="border-t border-neutral-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Advanced Filters</h3>
            <button
              className="text-neutral-500 hover:text-neutral-800"
              onClick={() => setShowFilters(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Capacity */}
            <div>
              <label className="block text-sm font-medium mb-1">Capacity</label>
              <select 
                className="w-full border border-neutral-200 rounded-md p-2"
                value={capacity ? `${capacity[0]}-${capacity[1]}` : ''}
                onChange={(e) => {
                  const [min, max] = e.target.value.split('-').map(Number);
                  setCapacity([min, max]);
                }}
              >
                <option value="0-5000">Any capacity</option>
                <option value="0-100">Up to 100 people</option>
                <option value="100-500">100-500 people</option>
                <option value="500-1000">500-1000 people</option>
                <option value="1000-5000">1000+ people</option>
              </select>
            </div>
            
            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium mb-1">Price Range</label>
              <select 
                className="w-full border border-neutral-200 rounded-md p-2"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as any)}
              >
                <option value="">Any price range</option>
                <option value="₵">₵ (Budget)</option>
                <option value="₵₵">₵₵ (Economy)</option>
                <option value="₵₵₵">₵₵₵ (Premium)</option>
                <option value="₵₵₵₵">₵₵₵₵ (Luxury)</option>
              </select>
            </div>
            
            {/* Amenities */}
            <div>
              <label className="block text-sm font-medium mb-1">Amenities</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {availableAmenities.map((amenity) => (
                  <div key={amenity} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`amenity-${amenity}`}
                      checked={amenities.includes(amenity)}
                      onChange={() => toggleAmenity(amenity)}
                      className="mr-2"
                    />
                    <label htmlFor={`amenity-${amenity}`} className="text-sm">
                      {amenity}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <button
              className="px-4 py-2 text-neutral-600 hover:text-neutral-800 text-sm font-medium"
              onClick={() => {
                setSearch('');
                setLocation('');
                setCapacity([0, 5000]);
                setPriceRange('');
                setAmenities([]);
              }}
            >
              Clear All
            </button>
            <button
              className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              onClick={() => {
                handleSearch();
                setShowFilters(false);
              }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}