"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
// Removed unused import - reusing events page skeleton structure inline
import Image from 'next/image';
import { 
  CalendarIcon, 
  MapPinIcon,  
  Search, 
  PlusCircle, 
  Edit,
  PlayIcon,
  FileText,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { ViewToggle } from "@/components/ui/ViewToggle";
import { eventDatabaseService } from '@/services/eventDatabaseService';
import { createClient } from '@/lib/supabase/client/client';
import { PageLoader } from '@/components/loaders/PageLoader';
import { emitNavigationTelemetry } from '@/lib/navigationTelemetry';

const ORGANIZER_LOOKUP_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, message: string): Promise<T> {
  return Promise.race<T>([
    Promise.resolve(promise),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

export default function DraftEventsPage() {
  const { user, loading: authLoading } = useAuth();
  const [organizerId, setOrganizerId] = useState<string | null>(null);
  const [organizerResolved, setOrganizerResolved] = useState(false);
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Use the same view mode state structure as the events page
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("draftEventsViewMode") as "grid" | "list") || "grid";
    }
    return "grid";
  });
  
  // Save view preference - same as events page
  useEffect(() => {
    localStorage.setItem('draftEventsViewMode', viewMode);
  }, [viewMode]);
  
  // Get organizer ID first
  useEffect(() => {
    let cancelled = false;
    const organizerLookupController = new AbortController();

    const getOrganizerId = async () => {
      if (authLoading) return;

      if (!user?.id) {
        if (!cancelled) {
          setOrganizerId(null);
          setOrganizerResolved(true);
        }
        return;
      }

      try {
        const startedAt = performance.now();
        void emitNavigationTelemetry({
          event: 'ORGANIZER_LOOKUP_START',
          path: '/dashboards/organizer/draft-events',
        });

        // ✅ FIX: Verify session is actually available in the browser client
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.warn("[DraftEventsPage] No active session found during lookup, waiting for AuthContext...");
          return;
        }

        let organizerLookupResult = await withTimeout<any>(
          supabase
            .from('organizers')
            .select('id')
            .eq('user_id', user.id)
            .abortSignal(organizerLookupController.signal)
            .maybeSingle(),
          ORGANIZER_LOOKUP_TIMEOUT_MS,
          `Organizer lookup timed out after ${ORGANIZER_LOOKUP_TIMEOUT_MS}ms`
        );

        // ✅ RETRY LOGIC: If nothing found, wait 1.5s and try once more
        // This handles race conditions where the record exists but isn't visible yet due to session propagation delays
        if (!organizerLookupResult.data && !organizerLookupResult.error && !cancelled) {
          console.log("[DraftEventsPage] Organizer not found initially, retrying in 1.5s...");
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          if (cancelled) return;
          
          organizerLookupResult = await withTimeout<any>(
            supabase
              .from('organizers')
              .select('id')
              .eq('user_id', user.id)
              .abortSignal(organizerLookupController.signal)
              .maybeSingle(),
            ORGANIZER_LOOKUP_TIMEOUT_MS,
            `Organizer lookup retry timed out`
          );
        }

        const { data, error } = organizerLookupResult;

        if (error) {
          throw error;
        }

        if (!cancelled) {
          setOrganizerId(data?.id ?? null);
        }
        void emitNavigationTelemetry({
          event: 'ORGANIZER_LOOKUP_SUCCESS',
          path: '/dashboards/organizer/draft-events',
          durationMs: Math.round(performance.now() - startedAt),
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const isAbortError = error instanceof Error && error.name === 'AbortError';
        if (isAbortError) {
          return;
        }

        console.error("Error fetching organizer:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown organizer lookup error';
        const timeoutEvent = errorMessage.includes('timed out')
          ? 'ORGANIZER_LOOKUP_TIMEOUT'
          : 'ORGANIZER_LOOKUP_ERROR';
        void emitNavigationTelemetry({
          event: timeoutEvent,
          path: '/dashboards/organizer/draft-events',
          message: errorMessage,
        });
        if (!cancelled) {
          setOrganizerId(null);
        }
      } finally {
        if (!cancelled) {
          setOrganizerResolved(true);
        }
      }
    };

    getOrganizerId();
    return () => {
      cancelled = true;
      organizerLookupController.abort();
    };
  }, [user?.id, authLoading]);

  // ✅ Fetch draft events from event_drafts table
  const [cachedEvents, setCachedEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchDraftEvents = async () => {
    if (!organizerId) return;
    
    try {
      setIsLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('event_drafts')
        .select('*')
        .eq('organizer_id', organizerId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setCachedEvents(data || []);
    } catch (error) {
      console.error('Error fetching draft events:', error);
      toast.showError('Error', 'Failed to load draft events');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchDraftEvents();
  }, [organizerId]);
  
  // Manual refresh function
  const handleRefresh = async () => {
    if (!organizerId) {
      toast.showError('Unavailable', 'Organizer profile is not available yet');
      return;
    }
    await fetchDraftEvents();
    toast.showSuccess('Refreshed', 'Draft events refreshed successfully');
  };
  
  // ✅ OPTIMIZATION: Memoize filtered events to avoid recalculation on every render
  const filteredEvents = useMemo(() => {
    // Transform draft data to display format
    const transformedEvents = cachedEvents.map((draft: any) => {
      // Parse draft_data if it's a string
      let draftData = draft.draft_data;
      if (typeof draftData === 'string') {
        try {
          draftData = JSON.parse(draftData);
        } catch (e) {
          console.error('Failed to parse draft_data:', e);
          draftData = {};
        }
      }
      
      // Extract fields with proper mapping (handle both camelCase and snake_case)
      return {
        id: draft.id,
        title: draftData.title || '',
        description: draftData.description || '',
        category: draftData.category || '',
        // Build location string from parts
        location: (() => {
          const parts = [
            draftData.venue,
            draftData.address || draftData.location_address,
            draftData.city || draftData.location_city,
            draftData.country || draftData.location_country
          ].filter(Boolean);
          return parts.length > 0 ? parts.join(', ') : 'Location not set';
        })(),
        date: draftData.startDate || draftData.start_date || 'Date not set',
        imageUrl: draftData.imageUrl || draftData.image_url || '',
        createdAt: draft.created_at || draft.updated_at
      };
    });
    
    if (!searchTerm) return transformedEvents;
    
    const searchLower = searchTerm.toLowerCase();
    return transformedEvents.filter((event: any) =>
      event.title?.toLowerCase().includes(searchLower) ||
      event.description?.toLowerCase().includes(searchLower) ||
      event.category?.toLowerCase().includes(searchLower) ||
      event.location?.toLowerCase().includes(searchLower)
    );
  }, [cachedEvents, searchTerm]);

  // Handle publishing a draft event
  const handlePublish = async (id: string) => {
    try {
      // Get current user
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Authentication required');
      }
      
      // Simply update the status to 'published'
      const { error: updateError } = await supabase
        .from('events')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (updateError) {
        throw updateError;
      }
      
      toast.showSuccess('Event Published', 'Your event has been published successfully');
      
      // Refresh draft events to remove the published event
      await fetchDraftEvents();
    } catch (error) {
      console.error('Error publishing event:', error);
      toast.showError('Publish Failed', error instanceof Error ? error.message : 'Failed to publish event');
    }
  };
  
  // Handle delete confirmation
  const confirmDelete = (id: string) => {
    setConfirmDeleteId(id);
  };
  
  // Handle delete event
  const handleDelete = async () => {
    if (confirmDeleteId) {
      try {
        // Get current user
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw new Error('Authentication required');
        }
        
        // Delete from events table (draft events)
        const { error: deleteError } = await supabase
          .from('events')
          .delete()
          .eq('id', confirmDeleteId)
          .eq('status', 'draft'); // Security: only delete draft events
        
        if (deleteError) {
          throw deleteError;
        }
        
        toast.showSuccess('Draft Deleted', 'Draft event deleted successfully');
        setConfirmDeleteId(null);
        
        // Refresh to fetch latest data
        await fetchDraftEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
        toast.showError('Delete Failed', 'Failed to delete event');
        setConfirmDeleteId(null);
      }
    }
  };

  if (authLoading || !organizerResolved || (isLoading && !!organizerId)) {
    return <PageLoader message="Loading draft events..." fullHeight />;
  }

  if (!organizerId) {
    return (
      <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center">
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">Organizer Profile Not Available</h2>
        <p className="text-neutral-600 mb-5">
          We could not load your organizer profile right now. Please refresh and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors cursor-pointer"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with title and create button - same as events page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Draft Events</h1>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="bg-white border border-neutral-300 text-neutral-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            href="/dashboards/organizer/create-event"
            className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-1 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Event</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      {/* Search and View Toggle - same as events page */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-100">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative w-full sm:max-w-xs">
                <input
                  type="text"
                  placeholder="Search draft events..."
                  className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-md"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              </div>
              
              {/* View Toggle - same as events page */}
              <ViewToggle currentView={viewMode} onChange={setViewMode} />
            </div>
      </div>

      {/* Events Grid/List - updated to match my events page styling */}
      {filteredEvents.length > 0 ? (
        <div
          className={viewMode === "list" ? "space-y-4" : "grid gap-4"}
          style={
            viewMode === "grid"
              ? { gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }
              : {}
          }
        >
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              {viewMode === "grid" ? (
                // Grid View - matched to my events page
                <div className="flex flex-col h-full">
                  {/* Event Image for Grid View */}
                  <div className="relative w-full h-40 bg-neutral-100">
                    {event.imageUrl ? (
                      <Image
                        src={event.imageUrl}
                        alt={event.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-neutral-200">
                        <CalendarIcon className="w-10 h-10 text-neutral-400" />
                      </div>
                    )}
                    <span className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                      Draft
                    </span>
                  </div>
                  
                  {/* Event Info for Grid View - matched to my events page */}
                  <div className="p-4 flex-1 flex flex-col">
                    <h2 className="text-lg font-bold mb-2">{event.title}</h2>
                    
                    <div className="space-y-2 text-sm text-neutral-600 mb-4 flex-1">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        <span>{event.date || "Date not set"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="w-4 h-4" />
                        <span>{event.location || "Location not set"}</span>
                      </div>
                      <div>
                        <span className="font-medium">Category:</span> {event.category || "General"}
                      </div>
                    </div>
                    
                    {/* Action Buttons for Grid View - matched to my events page */}
                    <div className="mt-auto space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={`/dashboards/organizer/events/${event.id}/edit`}
                          className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors text-center cursor-pointer"
                        >
                          <Edit className="w-4 h-4 inline mr-1" />
                          Edit Draft
                        </Link>
                        <button
                          onClick={() => handlePublish(event.id)}
                          className="bg-white border border-neutral-300 text-neutral-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors text-center cursor-pointer"
                        >
                          <PlayIcon className="w-4 h-4 inline mr-1" />
                          Publish
                        </button>
                      </div>
                      <button
                        onClick={() => confirmDelete(event.id)}
                        className="w-full bg-red-50 text-red-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-100 transition-colors text-center cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 inline mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Premium Horizontal List View for Drafts
                <div className="flex flex-col lg:flex-row gap-6 p-5">
                  {/* Event Image - Horizontal aspect */}
                  <div className="flex-shrink-0 w-full lg:w-48 h-32 relative rounded-xl overflow-hidden shadow-sm border border-neutral-100 bg-neutral-50">
                    {event.imageUrl ? (
                      <Image 
                        src={event.imageUrl} 
                        alt={event.title} 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <CalendarIcon className="w-10 h-10 text-neutral-300" />
                      </div>
                    )}
                    {/* Status Badge Overlay */}
                    <div className="absolute top-2 left-2 z-10">
                      <span className="bg-neutral-800/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm border border-white/10 uppercase tracking-wider">
                         Draft
                      </span>
                    </div>
                  </div>
                  
                  {/* Event Info - Main Section */}
                  <div className="flex-grow min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="min-w-0">
                        <h2 className="text-xl font-bold text-neutral-900 truncate mb-1">
                          {event.title || "Untitled Draft"}
                        </h2>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500">
                          <div className="flex items-center gap-1.5">
                            <CalendarIcon className="w-4 h-4 text-primary/70" />
                            <span>{event.date || "Date TBD"}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPinIcon className="w-4 h-4 text-primary/70" />
                            <span className="truncate max-w-[200px]">{event.location || "Location TBD"}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Desktop Action Buttons */}
                      <div className="hidden md:flex items-center gap-2">
                        <Link
                          href={`/dashboards/organizer/events/${event.id}/edit`}
                          className="bg-white border border-neutral-200 text-neutral-700 p-2 rounded-lg hover:bg-neutral-50 transition-all shadow-sm hover:shadow-md"
                          title="Edit Draft"
                        >
                          <Edit className="w-5 h-5" />
                        </Link>
                        <button
                          onClick={() => handlePublish(event.id)}
                          className="bg-primary text-white p-2 rounded-lg hover:bg-primary-dark transition-all shadow-sm hover:shadow-md"
                          title="Publish Event"
                        >
                          <PlayIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => confirmDelete(event.id)}
                          className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition-all shadow-sm hover:shadow-md"
                          title="Delete Draft"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Metrics/Status Row */}
                    <div className="mt-auto grid grid-cols-2 sm:grid-cols-3 gap-4 py-3 border-t border-neutral-50">
                      <div>
                        <p className="text-[10px] uppercase text-neutral-400 font-bold mb-1">Category</p>
                        <p className="text-sm font-semibold text-neutral-700">{event.category || "General"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-neutral-400 font-bold mb-1">Last Updated</p>
                        <p className="text-sm font-semibold text-neutral-700">
                          {new Date(event.createdAt || Date.now()).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-[10px] uppercase text-neutral-400 font-bold mb-1">Completeness</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-grow h-1.5 bg-neutral-100 rounded-full overflow-hidden max-w-[100px]">
                             <div className="h-full bg-amber-400 w-2/3 rounded-full"></div>
                          </div>
                          <span className="text-[10px] font-bold text-amber-600">Draft Status</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Mobile-only Action Buttons */}
                    <div className="mt-4 flex md:hidden items-center gap-2">
                      <Link
                        href={`/dashboards/organizer/events/${event.id}/edit`}
                        className="flex-1 bg-white border border-neutral-200 text-neutral-700 py-2 rounded-lg text-center text-sm font-bold shadow-sm"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handlePublish(event.id)}
                        className="flex-1 bg-primary text-white py-2 rounded-lg text-center text-sm font-bold shadow-sm"
                      >
                        Publish
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border border-neutral-200">
          <FileText className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium">No draft events found</h3>
          <p className="text-neutral-600 mt-2">
            {searchTerm
              ? "No drafts match your search criteria" 
              : "You haven't saved any draft events yet"}
          </p>
          <Link 
            href="/dashboards/organizer/create-event"
            className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-md text-sm font-medium cursor-pointer"
          >
            Create New Event
          </Link>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Delete Draft Event</h3>
            <p className="text-neutral-600 mb-6">
              Are you sure you want to delete this draft event? This action cannot be undone.
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