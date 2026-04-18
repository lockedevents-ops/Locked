"use client";

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Calendar, MapPin, Tag, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { searchService, type SearchResponse } from '@/services/searchService';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchBoxProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchBox({ isOpen, onClose }: SearchBoxProps) {
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  // State for search results
  const [searchResults, setSearchResults] = useState<SearchResponse>({
    events: [],
    venues: [],
    organizers: [],
    venueOwners: [],
    total: 0,
  });
  const [isSearching, setIsSearching] = useState(false);
  
  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) onClose();
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node) && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscapeKey);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Database search logic
  useEffect(() => {
    async function performSearch() {
      if (!debouncedSearchQuery.trim()) {
        setSearchResults({
          events: [],
          venues: [],
          organizers: [],
          venueOwners: [],
          total: 0,
        });
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      
      try {
        const results = await searchService.searchAll(debouncedSearchQuery, {
          limit: 3,
          includeEvents: true,
          includeVenues: true,
          includeOrganizers: true,
          includeVenueOwners: true,
        });
        
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults({
          events: [],
          venues: [],
          organizers: [],
          venueOwners: [],
          total: 0,
        });
      } finally {
        setIsSearching(false);
      }
    }

    performSearch();
  }, [debouncedSearchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/pages/discover?search=${encodeURIComponent(searchQuery)}`);
      onClose();
    }
  };


  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={searchRef}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute left-0 right-0 bg-white border-b border-neutral-200 shadow-sm z-[9999]"
          onClick={e => e.stopPropagation()}
        >
          <div className="container mx-auto px-4 py-4">
            <form onSubmit={handleSearch} className="relative">
              <input
                ref={inputRef}
                id="site-search"
                name="search"
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search for events, venues, organizers, or venue owners..."
                className="w-full pl-10 pr-12 py-3 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                autoFocus
                aria-label="Search events and venues"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-5 h-5" />
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-5 h-5" />
              </button>
            </form>

            {searchQuery && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto"
              >
                {/* Loading indicator */}
                {isSearching && (
                  <div className="py-4 text-center">
                    <div className="inline-flex items-center text-neutral-500">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                      Searching...
                    </div>
                  </div>
                )}

                {/* Events Section */}
                {searchResults.events.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Events
                    </h3>
                    <div className="space-y-1">
                      {searchResults.events.map(event => (
                        <Link
                          key={event.id}
                          href={event.url}
                          onClick={onClose}
                          className="block p-3 hover:bg-neutral-50 rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            {/* Event Thumbnail */}
                            <div className="relative w-12 h-12 rounded-md overflow-hidden bg-neutral-100 flex-shrink-0">
                              {event.image ? (
                                <Image 
                                  src={event.image}
                                  alt={event.title}
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600" />
                              )}
                            </div>
                            <div className="flex-grow min-w-0">
                              <div className="font-medium text-neutral-800 truncate">{event.title}</div>
                              <div className="flex items-center text-xs text-neutral-500 gap-3">
                                <span className="truncate">{event.metadata?.category}</span>
                                {event.subtitle && <span className="truncate">{event.subtitle}</span>}
                              </div>
                              <div className="text-xs text-neutral-400 flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                {event.metadata?.location || "Location not specified"}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Venues Section */}
                {searchResults.venues.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Venues
                    </h3>
                    <div className="space-y-1">
                      {searchResults.venues.map(venue => (
                        <Link
                          key={venue.id}
                          href={venue.url}
                          onClick={onClose}
                          className="block p-3 hover:bg-neutral-50 rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            {/* Venue Thumbnail */}
                            <div className="relative w-12 h-12 rounded-md overflow-hidden bg-neutral-100 flex-shrink-0">
                              <Image 
                                src={venue.image || '/pages/venues/default-venue.jpg'}
                                alt={venue.title}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            </div>
                            <div className="flex-grow min-w-0">
                              <div className="font-medium text-neutral-800 truncate">{venue.title}</div>
                              <div className="text-xs text-neutral-500 truncate">
                                {venue.metadata?.location}
                              </div>
                              {venue.subtitle && (
                                <div className="text-xs text-neutral-400 truncate">
                                  {venue.subtitle}
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Organizers Section */}
                {searchResults.organizers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Organizers
                    </h3>
                    <div className="space-y-1">
                      {searchResults.organizers.map(org => (
                        <Link
                          key={org.id}
                          href={org.url}
                          onClick={onClose}
                          className="block p-3 hover:bg-neutral-50 rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            {/* Organizer Profile Image */}
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200 flex-shrink-0">
                              <Image 
                                src={org.image || '/avatars/avatar-1.png'}
                                alt={org.title}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            </div>
                            <div className="flex-grow min-w-0">
                              <div className="font-medium text-neutral-800 flex items-center gap-2">
                                {org.title}
                                {org.metadata?.category && org.metadata.category !== 'Standard' && (
                                  <span className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 rounded-sm">
                                    {org.metadata.category}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-neutral-500">
                                {org.subtitle}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Venue Owners Section */}
                {searchResults.venueOwners.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Venue Owners
                    </h3>
                    <div className="space-y-1">
                      {searchResults.venueOwners.map(owner => (
                        <Link
                          key={owner.id}
                          href={owner.url}
                          onClick={onClose}
                          className="block p-3 hover:bg-neutral-50 rounded-md"
                        >
                          <div className="flex items-center gap-3">
                            {/* Venue Owner Profile Image */}
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200 flex-shrink-0">
                              <Image 
                                src={owner.image || '/avatars/avatar-1.png'}
                                alt={owner.title}
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            </div>
                            <div className="flex-grow min-w-0">
                              <div className="font-medium text-neutral-800">{owner.title}</div>
                              <div className="text-xs text-neutral-500">
                                {owner.subtitle}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results State */}
                {searchQuery.length > 1 && 
                  !isSearching &&
                  searchResults.total === 0 && (
                    <div className="py-8 text-center">
                      <p className="text-neutral-500">No results found for "{searchQuery}"</p>
                      <button 
                        onClick={() => {
                          router.push(`/pages/discover?search=${encodeURIComponent(searchQuery)}`);
                          onClose();
                        }}
                        className="mt-2 text-primary hover:underline text-sm"
                      >
                        View all events
                      </button>
                    </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
