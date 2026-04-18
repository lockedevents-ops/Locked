"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Search, 
  PlusCircle, 
  MapPin, 
  Edit, 
  FileText,
  PlayIcon,
  Trash2  // Add Trash2 icon
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { ViewToggle } from "@/components/ui/ViewToggle";
import Image from 'next/image';

export default function DraftVenuesPage() {
  const toast = useToast();
  const [venues, setVenues] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null); // Add confirmation state
  
  // Add view mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('draftVenuesViewMode') as 'grid' | 'list' || 'list';
    }
    return 'list';
  });
  
  // Save view preference
  useEffect(() => {
    localStorage.setItem('draftVenuesViewMode', viewMode);
  }, [viewMode]);
  
  // Load venues from localStorage when component mounts
  useEffect(() => {
    const storedVenues = localStorage.getItem('venues');
    if (storedVenues) {
      try {
        const parsedVenues = JSON.parse(storedVenues);
        // Only show venues with 'draft' status
        const draftVenues = parsedVenues.filter((venue: any) => venue.status === 'draft');
        setVenues(draftVenues);
      } catch (error) {
        console.error("Error loading draft venues:", error);
      }
    }
  }, []);
  
  // Filter venues based on search term
  const filteredVenues = venues.filter(venue => {
    return venue.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           venue.location?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Handle activating a draft venue
  const handleActivate = (id: number) => {
    const storedVenues = localStorage.getItem('venues');
    if (storedVenues) {
      const allVenues = JSON.parse(storedVenues);
      const updatedVenues = allVenues.map((venue: any) => 
        venue.id === id ? {...venue, status: 'active'} : venue
      );
      
      localStorage.setItem('venues', JSON.stringify(updatedVenues));
      
      // Update the UI
      const updatedDraftVenues = venues.filter(venue => venue.id !== id);
      setVenues(updatedDraftVenues);
      
      toast.showSuccess('Venue Activated', 'Venue activated successfully');
    }
  };

  // Handle delete confirmation
  const confirmDelete = (id: number) => {
    setConfirmDeleteId(id);
  };
  
  // Handle delete venue
  const handleDelete = () => {
    if (confirmDeleteId) {
      const storedVenues = localStorage.getItem('venues');
      if (storedVenues) {
        const allVenues = JSON.parse(storedVenues);
        const updatedVenues = allVenues.filter((venue: any) => venue.id !== confirmDeleteId);
        
        localStorage.setItem('venues', JSON.stringify(updatedVenues));
        
        // Update the UI
        const updatedDraftVenues = venues.filter(venue => venue.id !== confirmDeleteId);
        setVenues(updatedDraftVenues);
        
        toast.showSuccess('Draft Deleted', 'Draft venue deleted successfully');
        setConfirmDeleteId(null);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with title and create button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Draft Venues</h1>
        <Link
          href="/venue-owner/pages/venues/add"
          className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-1 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Venue</span>
        </Link>
      </div>

      {/* Search and View Toggle */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-100">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              placeholder="Search draft venues..."
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
          </div>
          
          {/* View Toggle */}
          <div className="flex items-center">
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
                        alt={venue.name || "Venue image"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-neutral-200">
                        <Building2 className="w-10 h-10 text-neutral-400" />
                      </div>
                    )}
                    <span className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                      Draft
                    </span>
                  </div>
                  
                  {/* Venue Info for Grid View */}
                  <div className="p-4 flex-1 flex flex-col">
                    <h2 className="text-lg font-bold mb-2">{venue.name}</h2>
                    
                    <div className="space-y-2 text-sm text-neutral-600 mb-4 flex-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{venue.location || "Location not set"}</span>
                      </div>
                      <div>
                        <span className="font-medium">Capacity:</span> {venue.capacity || "Not specified"}
                      </div>
                    </div>
                    
                    {/* Action Buttons for Grid View */}
                    <div className="mt-auto space-y-2">
                      <Link
                        href={`/venue-owner/pages/venues/${venue.id}/edit`}
                        className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors text-center block w-full cursor-pointer"
                      >
                        <Edit className="w-4 h-4 inline mr-1" />
                        Edit Draft
                      </Link>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleActivate(venue.id)}
                          className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors text-center flex-1 cursor-pointer"
                        >
                          <PlayIcon className="w-4 h-4 inline mr-1" />
                          Activate
                        </button>
                        <button
                          onClick={() => confirmDelete(venue.id)}
                          className="bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors text-center cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
                      <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-neutral-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Venue Info */}
                  <div className="flex-grow">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                          {venue.name}
                          <span className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-800">
                            Draft
                          </span>
                        </h2>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mt-1 text-sm text-neutral-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{venue.location || "Location not set"}</span>
                          </div>
                          <div>
                            <span className="font-medium">Capacity:</span> {venue.capacity || "Not specified"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Venue Actions */}
                  <div className="flex-shrink-0 w-full md:w-auto">
                    <div className="flex flex-col md:flex-row gap-3">
                      <Link
                        href={`/venue-owner/pages/venues/${venue.id}/edit`}
                        className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors text-center cursor-pointer"
                      >
                        <Edit className="w-4 h-4 inline mr-1" />
                        Edit Draft
                      </Link>
                      <button
                        onClick={() => handleActivate(venue.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors text-center cursor-pointer"
                      >
                        <PlayIcon className="w-4 h-4 inline mr-1" />
                        Activate
                      </button>
                      <button
                        onClick={() => confirmDelete(venue.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors text-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 inline mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-neutral-200">
            <FileText className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium">No draft venues found</h3>
            <p className="text-neutral-600 mt-2">
              {searchTerm
                ? "No drafts match your search criteria" 
                : "You haven't saved any draft venues yet"}
            </p>
            <Link 
              href="/venue-owner/pages/venues/add"
              className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-md text-sm font-medium cursor-pointer"
            >
              Add New Venue
            </Link>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Delete Draft Venue</h3>
            <p className="text-neutral-600 mb-6">
              Are you sure you want to delete this draft venue? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}