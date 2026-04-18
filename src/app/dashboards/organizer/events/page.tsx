"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
    CalendarIcon,
    MoreHorizontal,
    MapPinIcon,
    UsersIcon,
    Search,
    PlusCircle,
    Trash2,
    Edit,
    EyeIcon,
    BanIcon,
    PlayIcon,
    Star,
    ChevronLeft,
    ChevronRight,
    ShoppingBag,
    Tag,
    BarChart3,
} from "lucide-react";
import { MdHowToVote } from "react-icons/md";
import { useToast } from '@/hooks/useToast';
import { ViewToggle } from "@/components/ui/ViewToggle";
import { eventDatabaseService } from "@/services/eventDatabaseService";
import { eventRegistrationService, EventRegistrationStats } from "@/services/eventRegistrationService";
import { createClient } from '@/lib/supabase/client/client';
import { useAuth } from '@/contexts/AuthContext';
import { getFormattedImagePath } from '@/utils/imageHelpers';
import { useOrganizerEvents } from '@/hooks/useOrganizerEvents';
import { PageLoader } from '@/components/loaders/PageLoader';
import { emitNavigationTelemetry } from '@/lib/navigationTelemetry';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const supabase = createClient();
const ORGANIZER_LOOKUP_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, message: string): Promise<T> {
    return Promise.race<T>([
        Promise.resolve(promise),
        new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(message)), timeoutMs);
        }),
    ]);
}

// Helper function to debounce search input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function EventsPage() {
    const [registrations, setRegistrations] = useState<{ [eventId: string]: EventRegistrationStats }>({});
    const toast = useToast();
    const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "live" | "past">("all");
    const [searchTerm, setSearchTerm] = useState("");
    const { user, loading: authLoading } = useAuth();
    const [organizerId, setOrganizerId] = useState<string | null>(null);
    const [organizerResolved, setOrganizerResolved] = useState(false);
    const isDesktop = useMediaQuery('(min-width: 768px)');
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const eventsPerPage = 10;

    // Debounce search term to avoid filtering on every keystroke
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // Add view mode state with localStorage persistence (optimized)
    const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
        if (typeof window !== "undefined") {
            return (localStorage.getItem("eventsViewMode") as "grid" | "list") || "grid";
        }
        return "grid";
    });

    // Save view preference (debounced to avoid excessive writes)
    useEffect(() => {
        const handler = setTimeout(() => {
            localStorage.setItem("eventsViewMode", viewMode);
        }, 500);
        return () => clearTimeout(handler);
    }, [viewMode]);

    // Force grid on mobile; keep toggle preference for desktop.
    const effectiveViewMode: "grid" | "list" = isDesktop ? viewMode : "grid";

    // Get organizer ID first - use maybeSingle() to avoid errors for new organizers
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
                    path: '/dashboards/organizer/events',
                });

                // ✅ FIX: Verify session is actually available in the browser client
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    console.warn("[EventsPage] No active session found during lookup, waiting for AuthContext...");
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
                    console.log("[EventsPage] Organizer not found initially, retrying in 1.5s...");
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
                    console.error("Error fetching organizer:", error);
                    void emitNavigationTelemetry({
                        event: 'ORGANIZER_LOOKUP_ERROR',
                        path: '/dashboards/organizer/events',
                        message: error.message,
                    });
                    toast.showError('Loading Failed', 'Failed to load organizer profile');
                    return;
                }

                // If no profile exists, create one automatically
                if (!data) {
                    console.log('No organizer profile found, creating one...');
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('name, email')
                        .eq('id', user.id)
                        .maybeSingle();

                    const { data: newOrganizer, error: createError } = await supabase
                        .from('organizers')
                        .insert({
                            user_id: user.id,
                            name: profile?.name || 'Organizer',
                            email: profile?.email || user.email,
                            verified: true,
                            created_at: new Date().toISOString()
                        })
                        .select('id')
                        .single();

                    if (createError) {
                        console.error('Error creating organizer profile:', createError);
                        void emitNavigationTelemetry({
                            event: 'ORGANIZER_LOOKUP_ERROR',
                            path: '/dashboards/organizer/events',
                            message: createError.message,
                        });
                        toast.showError('Profile Creation Failed', 'Could not create organizer profile. Please contact support.');
                        return;
                    }

                    if (!cancelled) {
                        setOrganizerId(newOrganizer.id);
                    }
                    void emitNavigationTelemetry({
                        event: 'ORGANIZER_LOOKUP_SUCCESS',
                        path: '/dashboards/organizer/events',
                        durationMs: Math.round(performance.now() - startedAt),
                    });
                    // Profile created silently - no need to reveal auto-creation logic
                    return;
                }

                if (!cancelled) {
                    setOrganizerId(data.id);
                }
                void emitNavigationTelemetry({
                    event: 'ORGANIZER_LOOKUP_SUCCESS',
                    path: '/dashboards/organizer/events',
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
                    path: '/dashboards/organizer/events',
                    message: errorMessage,
                });
                toast.showError('Loading Failed', 'Failed to load organizer profile');
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

    // ✅ USE CACHED HOOK - This replaces the manual database queries!
    const { events: cachedEvents, isLoading, refresh, clearCache } = useOrganizerEvents({
        organizerId: organizerId || '',
        status: statusFilter,
        searchTerm: debouncedSearchTerm
    });

    // Load registrations separately (not cached, as it's lightweight)
    useEffect(() => {
        const loadRegistrations = async () => {
            if (!user?.id) return;

            try {
                const stats = await eventRegistrationService.getOrganizerRegistrations(user.id);
                setRegistrations(stats);
            } catch (error) {
                console.error("Error loading registrations:", error);
            }
        };

        loadRegistrations();
    }, [user?.id]);

    // OPTIMIZATION: Memoize transformed events to avoid recalculation on every render
    const transformedEvents = useMemo(() => {
        return cachedEvents.map((event: any) => ({
            id: event.id,
            title: event.title,
            description: event.description,
            category: event.category,
            date: event.date,
            time: event.time,
            location: event.location,
            imageUrl: event.imageUrl,
            status: event.status,
            attendeeCount: event.attendeeCount,
            ticketsSold: event.ticketsSold,
            createdAt: event.createdAt,
            format: event.eventType || 'in-person',
            venue: event.venue || 'No Venue',
            startDate: event.startDate,
            endDate: event.endDate,
            hasVoting: event.hasVoting,
            hasMerch: event.hasMerch
        }));
    }, [cachedEvents]);

    // Calculate event counts for each filter
    const getEventStatus = (event: any): 'upcoming' | 'live' | 'past' => {
        const now = new Date();
        const eventDate = new Date(event.startDate || event.date);
        const endDate = event.endDate ? new Date(event.endDate) : eventDate;
        
        if (endDate < now) return 'past';
        if (eventDate <= now && endDate >= now) return 'live';
        return 'upcoming';
    };

    const upcomingCount = transformedEvents.filter(e => getEventStatus(e) === 'upcoming').length;
    const liveCount = transformedEvents.filter(e => getEventStatus(e) === 'live').length;
    const pastCount = transformedEvents.filter(e => getEventStatus(e) === 'past').length;

    // Apply client-side pagination
    const paginatedEvents = useMemo(() => {
        const startIndex = (currentPage - 1) * eventsPerPage;
        const endIndex = startIndex + eventsPerPage;
        return transformedEvents.slice(startIndex, endIndex);
    }, [transformedEvents, currentPage, eventsPerPage]);

    const totalPages = Math.ceil(transformedEvents.length / eventsPerPage);

    // Handle page change
    const handlePageChange = useCallback((page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, debouncedSearchTerm]);

    // OPTIMIZATION: Memoize handlers to prevent unnecessary re-renders
    // 🚫 RESTRICTION: Cannot unpublish live events
    const handleStatusChange = useCallback(async (
        id: string,
        newStatus: "published" | "draft"
    ) => {
        try {
            if (!user?.id) {
                toast.showError('Authentication Required', 'User not authenticated');
                return;
            }

            // ✅ Check if event is live before allowing unpublishing
            if (newStatus === 'draft') {
                const isLive = await eventDatabaseService.isEventLive(id);
                if (isLive) {
                    toast.showError(
                        'Cannot Unpublish',
                        'Events that have already started cannot be unpublished. You can still edit event details.'
                    );
                    return;
                }
            }

            await eventDatabaseService.updateEvent(id, { status: newStatus }, user.id);
            
            // ✅ Clear cache and refresh to get updated data
            await refresh();
            
            toast.showSuccess(
                'Status Updated',
                `Event ${newStatus === "published" ? "published" : "unpublished"}`
            );
        } catch (error) {
            console.error("Error updating event status:", error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update event status';
            toast.showError('Update Failed', errorMessage);
        }
    }, [user?.id, refresh]);

    // OPTIMIZATION: Memoize delete handler
    // 🚫 RESTRICTION: Cannot delete live events
    const handleDeleteEvent = useCallback(async (eventId: string) => {
        if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
            return;
        }

        try {
            if (!user?.id) {
                toast.showError('Authentication Required', 'User not authenticated');
                return;
            }

            await eventDatabaseService.deleteEvent(eventId, user.id);
            
            // ✅ Clear cache and refresh to get updated data
            await refresh();
            
            toast.showSuccess('Event Deleted', 'Event deleted successfully');
        } catch (error) {
            console.error("Error deleting event:", error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete event';
            toast.showError('Delete Failed', errorMessage);
        }
    }, [user?.id, refresh]);

    // ✅ Show skeleton only when loading - matches draft events pattern exactly
    if (authLoading || !organizerResolved || (isLoading && !!organizerId)) {
        return <PageLoader message="Loading events..." fullHeight />;
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
            {/* Header with title and create button */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h1 className="text-2xl font-bold">My Events</h1>
                <Link
                    href="/dashboards/organizer/create-event"
                    className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-1 cursor-pointer"
                >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create Event</span>
                </Link>
            </div>

            {/* Filters and search */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-100">
                <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative w-full sm:max-w-xs">
                        <input
                            type="text"
                            placeholder="Search events..."
                            className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-md"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                                onClick={() => setStatusFilter("upcoming")}
                                className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex-1 sm:flex-none text-center ${
                                    statusFilter === "upcoming"
                                        ? "bg-primary text-white"
                                        : "bg-white text-neutral-600 hover:bg-neutral-100"
                                }`}
                            >
                                Upcoming ({upcomingCount})
                           </button>
                            <button
                                onClick={() => setStatusFilter("live")}
                                className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex-1 sm:flex-none text-center ${
                                    statusFilter === "live"
                                        ? "bg-primary text-white"
                                        : "bg-white text-neutral-600 hover:bg-neutral-100"
                                }`}
                            >
                                Live ({liveCount})
                            </button>
                            <button
                                onClick={() => setStatusFilter("past")}
                                className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex-1 sm:flex-none text-center ${
                                    statusFilter === "past"
                                        ? "bg-primary text-white"
                                        : "bg-white text-neutral-600 hover:bg-neutral-100"
                                }`}
                            >
                                Past ({pastCount})
                            </button>
                            <button
                                onClick={() => setStatusFilter("all")}
                                className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors cursor-pointer whitespace-nowrap flex-1 sm:flex-none text-center ${
                                    statusFilter === "all"
                                        ? "bg-primary text-white"
                                        : "bg-white text-neutral-600 hover:bg-neutral-100"
                                }`}
                            >
                                All ({transformedEvents.length})
                            </button>
                        </div>

                        {/* View toggle is desktop-only; mobile is always grid. */}
                        {isDesktop && <ViewToggle currentView={viewMode} onChange={setViewMode} />}
                    </div>
                </div>
            </div>

            {/* Events Grid/List with Updated Card Styling */}
            {paginatedEvents.length > 0 ? (
                <div
                    className={effectiveViewMode === "list" ? "space-y-4" : "grid gap-4"}
                    style={
                        effectiveViewMode === "grid"
                            ? { gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }
                            : {}
                    }
                >
                    {paginatedEvents.map((event: any) => (
                        <div
                            key={event.id}
                            className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
                        >
                            {effectiveViewMode === "grid" ? (
                                // Grid View
                                <div className="flex flex-col h-full">
                                    {/* Event Image for Grid View */}
                                    <button
                                        onClick={() => window.location.href = `/dashboards/organizer/events/${event.id}`}
                                        className="relative w-full h-40 bg-neutral-100 cursor-pointer hover:opacity-90 transition-opacity"
                                        aria-label={`Open ${event.title} event management`}
                                    >
                                        {event.imageUrl ? (
                                            <Image
                                                src={event.imageUrl}
                                                alt={event.title}
                                                fill
                                                className="object-cover"
                                                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                loading="lazy"
                                                quality={75}
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center bg-neutral-200">
                                                <CalendarIcon className="w-10 h-10 text-neutral-400" />
                                            </div>
                                        )}
                                        {/* Status Badge - Top Right */}
                                        <div className="absolute top-2 right-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                event.status === "published"
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-neutral-100 text-neutral-800'
                                            }`}>
                                                {event.status === "published" ? "Published" : "Draft"}
                                            </span>
                                        </div>

                                        {/* Merch and Voting Badges - Bottom Right */}
                                        <div className="absolute bottom-2 right-2 flex gap-2">
                                            {event.hasMerch && (
                                                <div className="flex items-center gap-1.5 bg-purple-100 text-purple-600 px-2 py-1 rounded-full shadow-sm">
                                                    <ShoppingBag className="w-3 h-3" />
                                                    <span className="text-xs font-semibold">Merch</span>
                                                </div>
                                            )}
                                            {event.hasVoting && (
                                                <div className="flex items-center gap-1 bg-green-100 text-green-600 px-2 py-1 rounded-full shadow-sm">
                                                    <MdHowToVote className="w-3 h-3" />
                                                    <span className="text-xs font-semibold">Voting</span>
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                    
                                    {/* Event Info for Grid View */}
                                    <div className="p-4 flex-1 flex flex-col">
                                        <h2 className="text-lg font-bold mb-2">{event.title}</h2>
                                        
                                        <div className="space-y-2 text-sm text-neutral-600 mb-4 flex-1">
                                            <div className="flex items-center gap-1">
                                                <CalendarIcon className="w-4 h-4" />
                                                <span>{event.date}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <MapPinIcon className="w-4 h-4" />
                                                <span>{event.location}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">Category:</span> {event.category || "General"}
                                            </div>
                                            {/* Registration/Tickets stats for grid view */}
                                            <div className="flex justify-between text-xs mt-2 pt-2 border-t border-neutral-100">
                                                <span>
                                                    <strong>{event.attendeeCount || 0}</strong> Attendees
                                                </span>
                                                <span>
                                                    <strong>{registrations[event.id]?.total_registrations || event.ticketsSold || 0}</strong> {(registrations[event.id]?.total_registrations ?? 0) > 0 ? 'Registered' : 'Sold'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {/* Action Buttons for Grid View */}
                                        <div className="mt-auto space-y-2">
                                            <div className="grid grid-cols-2 gap-2">
                                                <Link
                                                    href={`/dashboards/organizer/events/${event.id}`}
                                                    className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors text-center cursor-pointer"
                                                >
                                                    Manage Event
                                                </Link>
                                                <Link
                                                    href={`/dashboards/organizer/events/${event.id}/edit`}
                                                    className="bg-white border border-neutral-300 text-neutral-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors text-center cursor-pointer"
                                                >
                                                    <Edit className="w-4 h-4 inline mr-1" />
                                                    Edit
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Premium Horizontal List View
                                <div className="flex flex-col lg:flex-row gap-6 p-5">
                                    {/* Event Image - Horizontal aspect */}
                                    <div className="flex-shrink-0 w-full lg:w-48 h-32 relative rounded-xl overflow-hidden shadow-sm border border-neutral-100">
                                        {event.imageUrl ? (
                                            <Image 
                                                src={getFormattedImagePath(event.imageUrl)} 
                                                alt={event.title} 
                                                fill 
                                                className="object-cover"
                                                loading="lazy"
                                                quality={75}
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
                                                <CalendarIcon className="w-10 h-10 text-neutral-400" />
                                            </div>
                                        )}
                                        {/* Status Badge Overlay */}
                                        <div className="absolute top-2 left-2 z-10">
                                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md shadow-sm border backdrop-blur-md ${
                                                event.status === "published"
                                                    ? 'bg-blue-500/90 text-white border-blue-400/30'
                                                    : 'bg-neutral-500/90 text-white border-neutral-400/30'
                                            }`}>
                                                {event.status === "published" ? "Published" : "Draft"}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Event Info - Main Section */}
                                    <div className="flex-grow min-w-0">
                                        <div className="flex flex-col h-full">
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <div className="min-w-0">
                                                    <h2 className="text-xl font-bold text-neutral-900 truncate mb-1">
                                                        {event.title}
                                                    </h2>
                                                    <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                                                        <div className="flex items-center gap-1.5">
                                                            <CalendarIcon className="w-4 h-4 text-primary" />
                                                            <span>{event.date}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <MapPinIcon className="w-4 h-4 text-primary" />
                                                            <span className="truncate max-w-[200px]">{event.location}</span>
                                                        </div>
                                                        <div className="hidden sm:flex items-center gap-1.5 font-medium text-neutral-700">
                                                            <Tag className="w-4 h-4 text-primary" />
                                                            <span>{event.category || "General"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* Action Buttons for List View */}
                                                <div className="hidden md:flex items-center gap-2">
                                                    <Link
                                                        href={`/dashboards/organizer/events/${event.id}`}
                                                        className="bg-primary text-white p-2 rounded-lg hover:bg-primary-dark transition-all shadow-sm hover:shadow-md"
                                                        title="Manage Event"
                                                    >
                                                        <BarChart3 className="w-5 h-5" />
                                                    </Link>
                                                    <Link
                                                        href={`/dashboards/organizer/events/${event.id}/edit`}
                                                        className="bg-white border border-neutral-200 text-neutral-700 p-2 rounded-lg hover:bg-neutral-50 transition-all shadow-sm hover:shadow-md"
                                                        title="Edit Event"
                                                    >
                                                        <Edit className="w-5 h-5" />
                                                    </Link>
                                                </div>
                                            </div>
                                            
                                            {/* Metrics Row */}
                                            <div className="mt-auto grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-t border-neutral-50">
                                                <div>
                                                    <p className="text-[10px] uppercase text-neutral-400 font-bold mb-1">Tickets Sold</p>
                                                    <div className="flex items-baseline gap-1">
                                                        <p className="text-base font-bold text-neutral-900">
                                                            {registrations[event.id]?.total_registrations || event.ticketsSold || 0}
                                                        </p>
                                                        <p className="text-xs text-neutral-400">/ {event.totalCapacity || 100}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-neutral-400 font-bold mb-1">Revenue</p>
                                                    <p className="text-base font-bold text-success">
                                                        ₵{(registrations[event.id]?.total_revenue || 0).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="hidden sm:block">
                                                    <p className="text-[10px] uppercase text-neutral-400 font-bold mb-1">Engagement</p>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1 text-xs text-neutral-600">
                                                            <EyeIcon className="w-3.5 h-3.5 text-blue-500" />
                                                            <span>{event.viewCount || 0}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-xs text-neutral-600">
                                                            <UsersIcon className="w-3.5 h-3.5 text-purple-500" />
                                                            <span>{event.attendeeCount || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="hidden sm:block">
                                                    <p className="text-[10px] uppercase text-neutral-400 font-bold mb-1">Features</p>
                                                    <div className="flex gap-1.5">
                                                        {event.hasVoting && (
                                                            <div title="Voting Enabled">
                                                                <MdHowToVote className="w-4 h-4 text-green-500" />
                                                            </div>
                                                        )}
                                                        {event.hasMerch && (
                                                            <div title="Merch Available">
                                                                <ShoppingBag className="w-4 h-4 text-purple-500" />
                                                            </div>
                                                        )}
                                                        {event.isFeatured && (
                                                            <div title="Featured">
                                                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Mobile-only Action Buttons */}
                                            <div className="mt-4 flex md:hidden items-center gap-2">
                                                <Link
                                                    href={`/dashboards/organizer/events/${event.id}`}
                                                    className="flex-1 bg-primary text-white py-2 rounded-lg text-center text-sm font-bold shadow-sm"
                                                >
                                                    Manage
                                                </Link>
                                                <Link
                                                    href={`/dashboards/organizer/events/${event.id}/edit`}
                                                    className="flex-1 bg-white border border-neutral-200 text-neutral-700 py-2 rounded-lg text-center text-sm font-bold shadow-sm"
                                                >
                                                    Edit
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 bg-white rounded-lg border border-neutral-200">
                    <CalendarIcon className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No events found</h3>
                    <p className="text-neutral-600 mt-2">
                        {searchTerm || statusFilter !== "all"
                            ? "No events match your search criteria"
                            : "You haven't created any events yet"}
                    </p>
                    <Link
                        href="/dashboards/organizer/create-event"
                        className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-md text-sm font-medium cursor-pointer"
                    >
                        Create Your First Event
                    </Link>
                </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="mt-8">
                    <div className="flex justify-center items-center gap-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-2 bg-white border border-neutral-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors cursor-pointer"
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        
                        <div className="flex gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Show first page, last page, current page, and pages around current
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                                            currentPage === pageNum
                                                ? 'bg-primary text-white'
                                                : 'bg-white border border-neutral-300 hover:bg-neutral-50'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>
                        
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-2 bg-white border border-neutral-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors cursor-pointer"
                            aria-label="Next page"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                    
                    {/* Page info text below pagination */}
                    <div className="text-center mt-3">
                        <span className="text-sm text-neutral-600">
                            Page {currentPage} of {totalPages} ({transformedEvents.length} total events)
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
