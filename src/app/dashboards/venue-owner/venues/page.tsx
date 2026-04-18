"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Building2, 
  Search, 
  PlusCircle, 
  MapPin, 
  Star, 
  Trash2, 
  Edit, 
  MoreHorizontal 
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { ViewToggle } from "@/components/ui/ViewToggle";

export default function MyVenuesPage() {
  const toast = useToast();
  // Initialize with empty array instead of hardcoded venues
  const [venues, setVenues] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Add view mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('venuesViewMode') as 'grid' | 'list' || 'list';
    }
    return 'list';
  });
  
  // Save view preference
  useEffect(() => {
    localStorage.setItem('venuesViewMode', viewMode);
  }, [viewMode]);
  
  // Load venues from localStorage when component mounts
  useEffect(() => {
    const storedVenues = localStorage.getItem('venues');
    if (storedVenues) {
      try {
        const parsedVenues = JSON.parse(storedVenues);
        // Filter out venues with 'draft' status
        const activeVenues = parsedVenues.filter((venue: any) => venue.status !== 'draft');
        setVenues(activeVenues);
      } catch (error) {
        console.error("Error loading venues:", error);
      }
    }
  }, []);
  
  // Update localStorage when venues change (for deletes and status changes)
  const handleStatusChange = (id: number, newStatus: 'active' | 'inactive') => {
    const updatedVenues = venues.map(venue => 
      venue.id === id ? {...venue, status: newStatus} : venue
    );
    setVenues(updatedVenues);
    localStorage.setItem('venues', JSON.stringify(updatedVenues));
    toast.showSuccess('Status Updated', `Venue status updated to ${newStatus}`);
  };
  
  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         venue.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || venue.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Add a new state to track which dropdown is open
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  // Add this useEffect to close the dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">My Venues</h1>
        <Link
          href="/venue-owner/pages/venues/add"
          className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-1 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Venue</span>
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-100">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              placeholder="Search venues..."
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 text-sm rounded-md ${
                  statusFilter === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                All Published
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1 text-sm rounded-md ${
                  statusFilter === 'active'
                    ? 'bg-green-600 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-3 py-1 text-sm rounded-md ${
                  statusFilter === 'inactive'
                    ? 'bg-neutral-600 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                }`}
              >
                Inactive
              </button>
            </div>
            
            {/* Add View Toggle */}
            <ViewToggle currentView={viewMode} onChange={setViewMode} />
          </div>
        </div>
      </div>

      {/* Venues List */}
      <div className={viewMode === 'list' ? "space-y-4" : "grid gap-4"}
           style={viewMode === 'grid' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' } : {}}>
        {filteredVenues.length > 0 ? (
          filteredVenues.map((venue) => (
            <div 
              key={venue.id}
              className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              {viewMode === 'grid' ? (
                // Grid View
                <div className="flex flex-col h-full">
                  {/* Venue Image for Grid View */}
                  <div className="relative w-full h-40 bg-neutral-100">
                    {venue.featuredImagePreview ? (
                      <Image
                        src={venue.featuredImagePreview}
                        alt={venue.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
                        <Building2 className="w-10 h-10 text-primary" />
                      </div>
                    )}
                    <span className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                      venue.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-neutral-100 text-neutral-800'
                    }`}>
                      {venue.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  {/* Venue Info for Grid View */}
                  <div className="p-4 flex-1 flex flex-col">
                    <h2 className="text-lg font-bold mb-2">{venue.name}</h2>
                    
                    <div className="space-y-2 text-sm text-neutral-600 mb-4 flex-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{venue.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>{venue.avgRating || "0"} rating</span>
                      </div>
                      <div>
                        <span className="font-medium">Capacity:</span> {venue.capacity || "N/A"}
                      </div>
                    </div>
                    
                    {/* Action Buttons for Grid View */}
                    <div className="mt-auto space-y-2">
                      {/* Only keep the first row with Manage and Edit buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={`/venue-owner/pages/venues/${venue.id}`}
                          className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors text-center cursor-pointer"
                        >
                          Manage Venue
                        </Link>
                        <Link
                          href={`/venue-owner/pages/venues/${venue.id}/edit`}
                          className="bg-white border border-neutral-300 text-neutral-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors text-center cursor-pointer"
                        >
                          <Edit className="w-4 h-4 inline mr-1" />
                          Edit
                        </Link>
                      </div>
                      {/* Remove the Second row - View Bookings button */}
                    </div>
                  </div>
                </div>
              ) : (
                // List View
                <div className="p-6 flex flex-col md:flex-row gap-6">
                  {/* Venue Icon */}
                  <div className="flex-shrink-0">
                    {venue.featuredImagePreview ? (
                      <div className="w-16 h-16 relative rounded-full overflow-hidden">
                        <Image 
                          src={venue.featuredImagePreview} 
                          alt={venue.name} 
                          fill 
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-primary" />
                      </div>
                    )}
                  </div>
                  
                  {/* Venue Info */}
                  <div className="flex-grow">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                          {venue.name}
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            venue.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-neutral-100 text-neutral-800'
                          }`}>
                            {venue.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </h2>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mt-1 text-sm text-neutral-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{venue.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span>{venue.avgRating || "0"} rating</span>
                          </div>
                          <div>
                            <span className="font-medium">Capacity:</span> {venue.capacity}
                          </div>
                        </div>
                      </div>
                      
                      {/* Remove Action Menu for list view */}
                    </div>
                  </div>
                  
                  {/* Venue Stats - Update actions included here */}
                  <div className="flex-shrink-0 w-full md:w-auto">
                    <div className="flex flex-col md:flex-row gap-3">
                      <Link
                        href={`/venue-owner/pages/venues/${venue.id}`}
                        className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors text-center cursor-pointer"
                      >
                        Manage Venue
                      </Link>
                      <Link
                        href={`/venue-owner/pages/venues/${venue.id}/edit`}
                        className="bg-white border border-neutral-300 text-neutral-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors text-center cursor-pointer"
                      >
                        <Edit className="w-4 h-4 inline mr-1" />
                        Edit
                      </Link>
                      {/* Remove the View Bookings button */}
                      {/* Add status toggle buttons... */}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Only show bottom stats bar in list view */}
              {viewMode === 'list' && (
                <div className="bg-neutral-50 p-3 border-t border-neutral-200 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-neutral-500">Bookings (this month)</p>
                    <p className="font-medium">{venue.bookingsThisMonth || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Revenue (this month)</p>
                    <p className="font-medium">₵{((venue.bookingsThisMonth || 0) * 1500).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Last Updated</p>
                    <p className="font-medium">{venue.lastUpdated || "3 days ago"}</p>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-neutral-200">
            <Building2 className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No venues found</h3>
            <p className="text-neutral-600 mt-2">
              {searchTerm || statusFilter !== 'all' 
                ? "No venues match your search criteria" 
                : "You haven't added any venues yet"}
            </p>
            <Link 
              href="/venue-owner/pages/venues/add"
              className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-md text-sm font-medium cursor-pointer"
            >
              Add Your First Venue
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}