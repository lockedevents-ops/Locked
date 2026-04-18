"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Search, X, AlertCircle } from 'lucide-react';

interface LocationPickerProps {
  onLocationSelect: (latitude: number, longitude: number) => void;
  onCityUpdate?: (city: string) => void;
  initialLatitude?: number;
  initialLongitude?: number;
  address?: string;
  city?: string;
  country?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
  };
}

/**
 * LocationPicker Component
 * ============================================================================
 * Allows users to select event location using OpenStreetMap with Nominatim
 * geocoding. Provides interactive map and address-based search.
 * 
 * Features:
 * - Free geocoding via Nominatim (OpenStreetMap)
 * - Address-based auto-complete with city context
 * - Interactive map with draggable marker
 * - Manual lat/lng input
 * - Saves coordinates to database
 * 
 * No API key needed - completely free!
 * ============================================================================
 */
export function LocationPicker({
  onLocationSelect,
  onCityUpdate,
  initialLatitude = 5.6037, // Default Accra
  initialLongitude = -0.1870,
  address,
  city,
  country,
}: LocationPickerProps) {
  const [latitude, setLatitude] = useState(initialLatitude);
  const [longitude, setLongitude] = useState(initialLongitude);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState(
    address ? `${address}${city ? ', ' + city : ''}${country ? ', ' + country : ''}` : ''
  );
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const mapFrameRef = useRef<HTMLIFrameElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Sync internal state when parent provides new coordinates (e.g., when editing existing events)
  useEffect(() => {
    if (typeof initialLatitude === 'number' && !Number.isNaN(initialLatitude)) {
      setLatitude(initialLatitude);
    }
  }, [initialLatitude]);

  useEffect(() => {
    if (typeof initialLongitude === 'number' && !Number.isNaN(initialLongitude)) {
      setLongitude(initialLongitude);
    }
  }, [initialLongitude]);

  // Keep the displayed selected location in sync with incoming address data
  useEffect(() => {
    if (address || city || country) {
      setSelectedLocation(
        `${address ?? ''}${city ? `${address ? ', ' : ''}${city}` : ''}${country ? `${address || city ? ', ' : ''}${country}` : ''}`
      );
    }
  }, [address, city, country]);

  // Initialize map with OpenStreetMap iframe URL
  const getMapEmbedUrl = () => {
    return `https://www.openstreetmap.org/export/embed.html?bbox=${(longitude - 0.05).toFixed(4)},${(latitude - 0.05).toFixed(4)},${(longitude + 0.05).toFixed(4)},${(latitude + 0.05).toFixed(4)}&layer=mapnik&marker=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  };

  // Nominatim search with debounce
  const searchLocations = useCallback((query: string) => {
    if (!query.trim() || query.length < 3) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    // Build search query with city context for better results
    let searchQuery = query;
    if (city) {
      searchQuery = `${query}, ${city}`;
    }
    if (country) {
      searchQuery = `${searchQuery}, ${country}`;
    }

    // Use Nominatim API (free, no key needed)
    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        searchQuery
      )}&format=json&limit=5`
    )
      .then((res) => res.json())
      .then((data: NominatimResult[]) => {
        setSearchResults(data);
        setShowResults(true);
        if (data.length === 0) {
          setError('No locations found. Try a different search.');
        }
      })
      .catch(() => {
        setError('Failed to search locations. Please try again.');
      })
      .finally(() => {
        setIsSearching(false);
      });
  }, [city, country]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchInput(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchLocations(value);
    }, 500);
  };

  // Handle location selection from search results
  const handleSelectLocation = (result: NominatimResult, callback?: (city: string) => void) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    setLatitude(lat);
    setLongitude(lon);
    setSelectedLocation(result.display_name);
    setSearchInput('');
    setSearchResults([]);
    setShowResults(false);
    onLocationSelect(lat, lon);

    // Extract and auto-update city from search result
    const extractedCity = result.address?.city || result.address?.town || result.address?.village;
    if (extractedCity) {
      if (onCityUpdate) {
        onCityUpdate(extractedCity);
      }
      if (callback) {
        callback(extractedCity);
      }
    }

    // Update map
    if (mapRef.current) {
      mapRef.current.setView([lat, lon], 13);
      markerRef.current?.setLatLng([lat, lon]);
    }
  };

  // Handle manual coordinate input
  const handleLatitudeChange = (value: string) => {
    const lat = parseFloat(value);
    if (!isNaN(lat) && lat >= -90 && lat <= 90) {
      setLatitude(lat);
      onLocationSelect(lat, longitude);
    }
  };

  const handleLongitudeChange = (value: string) => {
    const lon = parseFloat(value);
    if (!isNaN(lon) && lon >= -180 && lon <= 180) {
      setLongitude(lon);
      onLocationSelect(latitude, lon);
    }
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <MapPin className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-semibold mb-1">How to set location:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Search for venue/address (e.g., "Bula, Accra") - city auto-updates</li>
              <li>Can't find exact location? No problem - adjust coordinates manually below</li>
              <li>Fine-tune latitude/longitude for exact positioning</li>
              <li>View updates in real-time on the map preview</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Location
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Enter venue, address, or place name..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && (searchResults.length > 0 || isSearching || error) && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
            {isSearching && (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                Searching...
              </div>
            )}

            {error && (
              <div className="px-4 py-3 text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {searchResults.map((result, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectLocation(result)}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {result.display_name.split(',')[0]}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {result.display_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Click to select • You can adjust coordinates after</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Location Display */}
      {selectedLocation && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-700">
            <span className="font-semibold flex items-center gap-1">
              <MapPin className="w-4 h-4 text-red-500" />
              Selected:
            </span>
            {selectedLocation}
          </p>
        </div>
      )}

      {/* Map Container */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <label className="block text-sm font-medium text-gray-700 mb-2 px-4 pt-4">
          Map Location Preview
        </label>
        <iframe
          ref={mapFrameRef}
          src={getMapEmbedUrl()}
          className="w-full h-[250px] md:h-[400px]"
          style={{ border: 'none' }}
          allowFullScreen={true}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Location Map"
        />
        <p className="text-xs text-gray-500 px-4 py-2">
          Map shows your selected location. Use the coordinate fields below to adjust the exact position if needed.
        </p>
      </div>

      {/* Manual Coordinate Input */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Latitude
          </label>
          <input
            type="number"
            value={latitude}
            onChange={(e) => handleLatitudeChange(e.target.value)}
            min="-90"
            max="90"
            step="0.00001"
            placeholder="e.g., 5.6037"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          />
          <p className="text-xs text-gray-500 mt-1">Range: -90 to 90</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Longitude
          </label>
          <input
            type="number"
            value={longitude}
            onChange={(e) => handleLongitudeChange(e.target.value)}
            min="-180"
            max="180"
            step="0.00001"
            placeholder="e.g., -0.1870"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          />
          <p className="text-xs text-gray-500 mt-1">Range: -180 to 180</p>
        </div>
      </div>

      {/* Current Coordinates Display */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-sm font-medium text-gray-700 mb-2">Current Coordinates:</p>
        <p className="text-sm text-gray-600 font-mono">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      </div>
    </div>
  );
}
