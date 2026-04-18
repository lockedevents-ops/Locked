"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  CalendarIcon, 
  MapPinIcon, 
  UsersIcon, 
  Edit, 
  Clock, 
  ArrowLeft, 
  DollarSign,
  FileText,
  ImageIcon,
  Settings,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Ticket,
  MessageSquare,
  Share2,
  PlusCircle,
  Lock,
  Unlock,
  Copy,
  ExternalLink,
  Heart,
  BarChart3,
  TrendingUp,
  Star,
  CheckCircle2,
  Search,
  MoreVertical
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { eventDatabaseService } from '@/services/eventDatabaseService';
import { eventRegistrationService } from '@/services/eventRegistrationService';
import { attendeeService, Attendee } from '@/services/attendeeService';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client/client';
import { requestCache } from '@/lib/requestCache';
import { getFormattedImagePath } from '@/utils/imageHelpers';
import { PageLoader } from '@/components/loaders/PageLoader';

// Tab type
type TabType = 'overview' | 'attendees' | 'tickets' | 'gallery' | 'settings';

const ORGANIZER_EVENT_CACHE_TTL = 3 * 60 * 1000; // 3 minutes
const ORGANIZER_EVENT_REGISTRATION_TTL = 2 * 60 * 1000; // 2 minutes

const getEventCacheKey = (eventId: string) => `organizer-dashboard:event:${eventId}`;
const getRegistrationCacheKey = (eventId: string) => `organizer-dashboard:registrations:${eventId}`;

async function fetchOrganizerEventRecord(eventId: string) {
  return requestCache.fetch(
    getEventCacheKey(eventId),
    async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          organizer:organizers(
            id,
            business_name,
            contact_email,
            logo_url,
            user_id
          )
        `)
        .eq('id', eventId)
        .single();

      if (error || !data) {
        throw error || new Error('Event not found');
      }

      return data;
    },
    {
      ttl: ORGANIZER_EVENT_CACHE_TTL,
      staleWhileRevalidate: true,
    }
  );
}

async function fetchOrganizerRegistrationStats(eventId: string) {
  return requestCache.fetch(
    getRegistrationCacheKey(eventId),
    async () => eventRegistrationService.getEventRegistrationStats(eventId),
    {
      ttl: ORGANIZER_EVENT_REGISTRATION_TTL,
      staleWhileRevalidate: true,
    }
  );
}

function invalidateOrganizerEventCaches(eventId: string) {
  requestCache.invalidate(getEventCacheKey(eventId));
  requestCache.invalidate(getRegistrationCacheKey(eventId));
}

type RegistrationStats = {
  total_registrations?: number;
  confirmed_registrations?: number;
};

function transformOrganizerEventRecord(eventData: any, registrationStats?: RegistrationStats) {
  const transformedEvent = {
    id: eventData.id,
    title: eventData.title,
    description: eventData.description,
    imageUrl: eventData.image_url,
    category: eventData.category,
    status: eventData.status,
    startDate: eventData.start_date,
    endDate: eventData.end_date,
    startTime: eventData.start_time,
    endTime: eventData.end_time,
    location: eventData.address || eventData.location,
    locationType: eventData.location_type,
    venue: eventData.venue,
    attendeeCount: eventData.attendee_count || 0,
    ticketsSold: eventData.tickets_sold || 0,
    tickets: Array.isArray(eventData.tickets) ? eventData.tickets : [],
    galleryImages: Array.isArray(eventData.gallery_images) ? eventData.gallery_images : [],
    createdAt: eventData.created_at,
    updatedAt: eventData.updated_at,
    isLocked: eventData.is_locked || false,
    date: eventData.start_date ? new Date(eventData.start_date).toLocaleDateString() : 'TBD',
    time: eventData.start_time || 'TBD',
    organizer: eventData.organizer
  };

  if (registrationStats) {
    transformedEvent.attendeeCount = registrationStats.total_registrations || transformedEvent.attendeeCount;
    transformedEvent.ticketsSold = registrationStats.confirmed_registrations || transformedEvent.ticketsSold;
  }

  const isEventLive = Boolean(
    eventData.start_date &&
    eventData.start_time &&
    new Date() >= new Date(`${eventData.start_date}T${eventData.start_time}`)
  );

  return { transformedEvent, isEventLive };
}

export default function ManageEventPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const { user: authUser, loading: authLoading, rolesLoading, hasAnyRole } = useAuth();
  const isAdminUser = hasAnyRole(['admin', 'super_admin']);
  const [event, setEvent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmStatusChange, setConfirmStatusChange] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'published' | 'draft' | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [cancelConfirmText, setCancelConfirmText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [registrationStats, setRegistrationStats] = useState<any>(null);
  const [confirmDeletePhoto, setConfirmDeletePhoto] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<{ path: string; index: number } | null>(null);
  const [isEventLive, setIsEventLive] = useState(false); // ✅ Track if event has started
  
  // Attendee management state
  const [allAttendees, setAllAttendees] = useState<Attendee[]>([]);
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');
  const [attendeeStatusFilter, setAttendeeStatusFilter] = useState<'all' | 'checked_in' | 'registered' | 'cancelled'>('all');
  const [isCheckingIn, setIsCheckingIn] = useState<string | null>(null);

  // Fetch event data from database with proper transformation
  useEffect(() => {
    let isMounted = true;

    if (authLoading || rolesLoading) {
      setIsLoading(true);
      return () => {
        isMounted = false;
      };
    }

    const enforceOwnership = (currentUser: any, eventRecord: any) => {
      if (!isAdminUser && eventRecord.organizer?.user_id !== currentUser.id) {
        toast.showError('Access Denied', "You don't have permission to access this event");
        router.push('/dashboards/organizer/events');
        return false;
      }
      return true;
    };

    const applyEventData = (eventRecord: any, regStats?: RegistrationStats) => {
      if (!isMounted) return;
      const { transformedEvent, isEventLive: liveStatus } = transformOrganizerEventRecord(eventRecord, regStats);
      setEvent(transformedEvent);
      setIsLocked(transformedEvent.isLocked);
      setIsEventLive(liveStatus);
      if (regStats) {
        setRegistrationStats(regStats);
      }
    };

    const fetchEvent = async () => {
      const eventId = String(params.id);
      if (!eventId) return;

      try {
        if (!authUser) {
          toast.showError('Authentication Required', 'Authentication required');
          router.push('/auth/login');
          return;
        }

        const cachedEvent = requestCache.getCachedValue<any>(getEventCacheKey(eventId), ORGANIZER_EVENT_CACHE_TTL);
        const cachedStats = requestCache.getCachedValue<RegistrationStats>(getRegistrationCacheKey(eventId), ORGANIZER_EVENT_REGISTRATION_TTL);

        let authorized = true;
        if (cachedEvent) {
          authorized = enforceOwnership(authUser, cachedEvent);
          if (authorized) {
            applyEventData(cachedEvent, cachedStats);
          } else {
            return;
          }
        }

        setIsLoading(!cachedEvent);

        // Fetch event with detailed data including organizer and ticket sales (cached via requestCache)
        const eventData = await fetchOrganizerEventRecord(eventId);

        if (!enforceOwnership(authUser, eventData)) {
          return;
        }

        applyEventData(eventData);

        try {
          const regStats = await fetchOrganizerRegistrationStats(eventId);
          applyEventData(eventData, regStats);
        } catch (regError) {
          console.error('Error loading registration stats:', regError);
        }

        if (typeof window !== 'undefined') {
          const searchParams = new URLSearchParams(window.location.search);
          const tabParam = searchParams.get('tab');
          if (tabParam && ['overview', 'attendees', 'tickets', 'gallery', 'settings'].includes(tabParam as TabType)) {
            setActiveTab(tabParam as TabType);
          }
        }
      } catch (error) {
        console.error('Error fetching event:', error);
        toast.showError('Loading Error', 'Error loading event details');
        router.push('/dashboards/organizer/events');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchEvent();

    return () => {
      isMounted = false;
    };
  }, [params.id, router, toast, authUser, authLoading, rolesLoading, isAdminUser]);

  // Load attendees when attendees tab is selected
  useEffect(() => {
    const loadAttendees = async () => {
      if (activeTab !== 'attendees' || !event?.id) return;
      
      try {
        const attendees = await attendeeService.getEventAttendees(event.id);
        setAllAttendees(attendees);
      } catch (error) {
        console.error('Error loading attendees:', error);
        toast.showError('Loading Error', 'Failed to load attendee list');
      }
    };

    loadAttendees();
  }, [activeTab, event?.id, toast]);

  // Handle attendee check-in
  const handleCheckIn = async (attendeeId: string, currentStatus: boolean) => {
    if (!event?.id) return;
    
    setIsCheckingIn(attendeeId);
    try {
      const success = await attendeeService.updateAttendeeCheckIn(
        attendeeId,
        !currentStatus
      );
      
      if (success) {
        // Update local state
        setAllAttendees(prev => 
          prev.map(a => 
            a.id === attendeeId 
              ? { ...a, status: !currentStatus ? 'checked_in' : 'registered', checkedInAt: !currentStatus ? new Date().toISOString() : null }
              : a
          )
        );
        toast.showSuccess(
          'Check-in Updated',
          !currentStatus ? 'Attendee checked in successfully' : 'Check-in status removed'
        );
      }
    } catch (error) {
      console.error('Error updating check-in:', error);
      toast.showError('Check-in Failed', 'Failed to update check-in status');
    } finally {
      setIsCheckingIn(null);
    }
  };

  // Filter attendees based on search and status
  const filteredAttendees = useMemo(() => {
    return allAttendees.filter(attendee => {
      const matchesSearch = attendeeSearchQuery === '' || 
        attendee.name.toLowerCase().includes(attendeeSearchQuery.toLowerCase()) ||
        attendee.email.toLowerCase().includes(attendeeSearchQuery.toLowerCase());
      
      const matchesStatus = attendeeStatusFilter === 'all' || attendee.status === attendeeStatusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [allAttendees, attendeeSearchQuery, attendeeStatusFilter]);

  // Handle status change using database
  // 🚫 RESTRICTION: Cannot unpublish live events
  const handleStatusChange = async (newStatus: 'published' | 'draft') => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !event) {
        toast.showError('Authentication Required', 'Authentication error');
        return;
      }

      // ✅ Prevent unpublishing live events
      if (newStatus === 'draft' && isEventLive) {
        toast.showError(
          'Cannot Unpublish',
          'Events that have already started cannot be unpublished. You can still edit event details.'
        );
        return;
      }

      await eventDatabaseService.updateEvent(event.id, { status: newStatus }, user.id);
      invalidateOrganizerEventCaches(event.id);
      setEvent({...event, status: newStatus});
      
      toast.showSuccess(
        'Status Updated',
        `Event ${newStatus === 'published' ? 'published' : 'unpublished'}`
      );
    } catch (error) {
      console.error("Error updating event status:", error);
      toast.showError('Update Failed', 'Failed to update event status');
    }
  };

  // Handle event deletion using database
  // 🚫 RESTRICTION: Cannot delete live events
  const handleDeleteEvent = async () => {
    if (deleteConfirmText !== event.title) {
      toast.showError('Validation Error', "Event name doesn't match");
      return;
    }
    
    // ✅ Prevent deleting live events
    if (isEventLive) {
      toast.showError(
        'Cannot Delete',
        'Events that have already started cannot be deleted. You can cancel the event instead.'
      );
      return;
    }
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !event) {
        toast.showError('Authentication Required', 'Authentication error');
        return;
      }

      await eventDatabaseService.deleteEvent(event.id, user.id);
      invalidateOrganizerEventCaches(event.id);
      toast.showSuccess('Event Deleted', 'Event deleted successfully');
      router.push('/dashboards/organizer/events');
    } catch (error) {
      console.error("Error deleting event:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete event';
      toast.showError('Delete Failed', errorMessage);
    }
  };

  // Handle event cancellation
  const handleCancelEvent = async () => {
    if (cancelConfirmText !== event.title) {
      toast.showError('Validation Error', "Event name doesn't match");
      return;
    }
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !event) {
        toast.showError('Authentication Required', 'Authentication error');
        return;
      }

      await eventDatabaseService.updateEvent(event.id, { status: 'cancelled' }, user.id);
      invalidateOrganizerEventCaches(event.id);
      setEvent({...event, status: 'cancelled'});
      setConfirmCancel(false);
      setCancelConfirmText('');
      toast.showSuccess('Event Cancelled', 'Event cancelled successfully');
    } catch (error) {
      console.error("Error cancelling event:", error);
      toast.showError('Cancel Failed', 'Failed to cancel event');
    }
  };

  // Handle event lock/unlock
  const handleLockToggle = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !event) {
        toast.showError('Authentication Required', 'Authentication error');
        return;
      }

      const newLockedState = !isLocked;
      await eventDatabaseService.updateEvent(event.id, { isLocked: newLockedState }, user.id);
      invalidateOrganizerEventCaches(event.id);
      setIsLocked(newLockedState);
      setEvent({...event, isLocked: newLockedState});
      
      toast.showSuccess(
        'Lock Status Updated',
        `Event ${newLockedState ? 'locked' : 'unlocked'}`
      );
    } catch (error) {
      console.error("Error toggling event lock:", error);
      toast.showError('Update Failed', 'Failed to update event lock status');
    }
  };

  // Handle share functionality
  const handleShare = async (method: 'copy' | 'whatsapp' | 'twitter' | 'facebook') => {
    const eventUrl = `${window.location.origin}/event/${event.id}`;
    const shareText = `Check out this event: ${event.title}`;
    
    try {
      switch (method) {
        case 'copy':
          await navigator.clipboard.writeText(eventUrl);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
          toast.showSuccess('Link Copied', 'Event link copied to clipboard!');
          break;
          
        case 'whatsapp':
          window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${eventUrl}`)}`, '_blank');
          break;
          
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(eventUrl)}`, '_blank');
          break;
          
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`, '_blank');
          break;
      }
    } catch (error) {
      toast.showError('Share Failed', 'Failed to share event');
    }
  };

  // Handle photo upload
  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.showError('Authentication Required', 'Authentication required');
        return;
      }

      // Use the eventDatabaseService to upload gallery images properly
      const uploadedPaths = await eventDatabaseService.uploadGalleryImages(
        Array.from(files),
        user.id
      );
      
      // Update event gallery in database
      const currentGallery = event.galleryImages || [];
      const newGallery = [...currentGallery, ...uploadedPaths];

      await eventDatabaseService.updateEvent(event.id, { galleryImages: newGallery }, user.id);
      invalidateOrganizerEventCaches(event.id);
      setEvent({...event, galleryImages: newGallery});

      toast.showSuccess(
        'Photos Uploaded',
        `${uploadedPaths.length} photo(s) uploaded successfully`
      );
    } catch (error) {
      console.error("Error uploading photos:", error);
      toast.showError('Upload Failed', 'Failed to upload photos');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle photo deletion
  const handleDeletePhoto = async (imagePath: string, index: number) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.showError('Authentication Required', 'Authentication required');
        return;
      }

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('events')
        .remove([imagePath]);
      
      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }
      
      // Update event gallery in database
      const updatedGallery = event.galleryImages.filter((_: string, i: number) => i !== index);
      
      await eventDatabaseService.updateEvent(event.id, { galleryImages: updatedGallery }, user.id);
      invalidateOrganizerEventCaches(event.id);
      setEvent({...event, galleryImages: updatedGallery});
      
      toast.showSuccess('Photo Deleted', 'Photo deleted successfully');
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.showError('Delete Failed', 'Failed to delete photo');
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading event details..." fullHeight />;
  }

  if (!event) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Event Not Found</h1>
        <p className="text-neutral-600 mb-6">The event you're looking for doesn't exist or has been removed</p>
        <Link 
          href="/dashboards/organizer/events" 
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Events
        </Link>
      </div>
    );
  }

  // Calculate actual revenue from event data
  const calculateRevenue = () => {
    if (!event.tickets || !Array.isArray(event.tickets)) return 0;
    return event.tickets.reduce((total: number, ticket: any) => {
      const sold = ticket.sold || 0;
      const price = ticket.price || 0;
      return total + (sold * price);
    }, 0);
  };
  
  // Calculate days until event
  const calculateDaysLeft = () => {
    if (!event.startDate) return 'N/A';
    const eventDate = new Date(event.startDate);
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 'Event passed';
  };
  
  // Get recent attendees from registration stats
  const recentAttendees = registrationStats?.recent_registrations?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Header Section - Mobile Optimized */}
      <div className="space-y-4">
        {/* Back Button */}
        <Link
          href="/dashboards/organizer/events"
          className="text-neutral-500 hover:text-neutral-700 inline-flex items-center text-sm w-fit"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to All Events
        </Link>
        
        {/* Event Title & Status */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 break-words">{event.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                event.status === 'published' 
                  ? 'bg-green-100 text-green-800' 
                  : event.status === 'cancelled'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-neutral-100 text-neutral-800'
              }`}>
                {event.status === 'published' ? '🟢 Published' : event.status === 'cancelled' ? '🔴 Cancelled' : '⚪ Draft'}
              </span>
              
              {isLocked && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  <Lock className="w-3 h-3 mr-1" />
                  Locked
                </span>
              )}
              
              <span className="text-xs text-gray-500">
                {event.category}
              </span>
            </div>
          </div>
          
          {/* Action Buttons - Responsive */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Link
              href={`/dashboards/organizer/events/${event.id}/edit`}
              className="flex-1 sm:flex-none bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Event</span>
            </Link>
          </div>
        </div>
        
        {/* Quick Action Bar - Mobile First */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => setShareModalOpen(true)}
            className="flex-1 sm:flex-none bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Event</span>
          </button>
          
          <button
            onClick={handleLockToggle}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              isLocked 
                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            <span>{isLocked ? 'Unlock' : 'Lock'} Event</span>
          </button>
          
          <Link
            href={`/event/${event.id}`}
            target="_blank"
            className="flex-1 sm:flex-none bg-green-50 text-green-600 border border-green-200 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View Live</span>
          </Link>
        </div>
      </div>

      {/* Event Hero Section - Enhanced */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className="relative h-48 sm:h-56 md:h-64 bg-gradient-to-br from-primary/10 to-blue-50">
          {event.imageUrl ? (
            <>
              <Image
                src={getFormattedImagePath(event.imageUrl)}
                alt={event.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 1200px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <CalendarIcon className="w-16 h-16 text-primary mx-auto mb-2" />
                <p className="text-primary font-medium">No Image</p>
              </div>
            </div>
          )}
          
          {/* Event Status Overlay */}
          <div className="absolute top-4 right-4">
            <div className="flex gap-2">
              {event.status !== 'published' && (
                <button 
                  onClick={() => {
                    setPendingStatus('published');
                    setConfirmStatusChange(true);
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-full text-xs font-medium transition-colors shadow-lg flex items-center gap-1"
                >
                  <CheckCircle className="w-3 h-3" />
                  Publish
                </button>
              )}
              
              {event.status === 'published' && (
                <button 
                  onClick={() => {
                    setPendingStatus('draft');
                    setConfirmStatusChange(true);
                  }}
                  disabled={isEventLive}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors shadow-lg flex items-center gap-1 ${
                    isEventLive
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
                  }`}
                  title={isEventLive ? 'Cannot unpublish live events' : 'Unpublish event'}
                >
                  <XCircle className="w-3 h-3" />
                  Unpublish
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Event Info Card */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-full">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date & Time</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{event.date}</p>
                <p className="text-xs text-gray-600">{event.time || "TBD"}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-green-100 rounded-full">
                <MapPinIcon className="w-4 h-4 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Location</p>
                <p className="text-sm font-semibold text-gray-900 truncate">{event.locationType === 'physical' ? 'In-Person' : 'Online'}</p>
                <p className="text-xs text-gray-600 truncate">{event.location || "Location TBD"}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-purple-100 rounded-full">
                <UsersIcon className="w-4 h-4 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Attendees</p>
                <p className="text-sm font-semibold text-gray-900">{registrationStats?.total_registrations || event.attendeeCount || 0} registered</p>
                <p className="text-xs text-gray-600">{registrationStats?.confirmed_registrations || event.ticketsSold || 0} confirmed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 font-medium text-xs sm:text-sm">Total Attendees</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-900">{registrationStats?.total_registrations || event.attendeeCount || 0}</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-blue-600">Total registered</span>
              </div>
            </div>
            <div className="p-2 bg-blue-200 text-blue-700 rounded-lg">
              <UsersIcon className="h-5 w-5" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 font-medium text-xs sm:text-sm">Tickets Sold</p>
              <p className="text-lg sm:text-2xl font-bold text-green-900">{registrationStats?.confirmed_registrations || event.ticketsSold || 0}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600">Tickets purchased</span>
              </div>
            </div>
            <div className="p-2 bg-green-200 text-green-700 rounded-lg">
              <Ticket className="h-5 w-5" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 font-medium text-xs sm:text-sm">Revenue</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-900">₵{calculateRevenue().toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-1">
                <BarChart3 className="h-3 w-3 text-purple-500" />
                <span className="text-xs text-purple-600">Total earned</span>
              </div>
            </div>
            <div className="p-2 bg-purple-200 text-purple-700 rounded-lg">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-600 font-medium text-xs sm:text-sm">Days Left</p>
              <p className="text-lg sm:text-2xl font-bold text-amber-900">{calculateDaysLeft()}</p>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-amber-600">until event</span>
              </div>
            </div>
            <div className="p-2 bg-amber-200 text-amber-700 rounded-lg">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs Navigation - Mobile Optimized */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        <nav className="flex overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'overview' 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Overview</span>
            {activeTab === 'overview' && <div className="w-1.5 h-1.5 bg-primary rounded-full ml-1" />}
          </button>
          <button
            onClick={() => setActiveTab('attendees')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'attendees' 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50'
            }`}
          >
            <UsersIcon className="w-4 h-4" />
            <span>Attendees</span>
            <span className="bg-neutral-200 text-neutral-600 text-xs px-1.5 py-0.5 rounded-full ml-1">
              {registrationStats?.total_registrations || event.attendeeCount || 0}
            </span>
            {activeTab === 'attendees' && <div className="w-1.5 h-1.5 bg-primary rounded-full ml-1" />}
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'tickets' 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50'
            }`}
          >
            <Ticket className="w-4 h-4" />
            <span>Tickets</span>
            <span className="bg-neutral-200 text-neutral-600 text-xs px-1.5 py-0.5 rounded-full ml-1">
              {event.tickets?.length || 0}
            </span>
            {activeTab === 'tickets' && <div className="w-1.5 h-1.5 bg-primary rounded-full ml-1" />}
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'gallery' 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Gallery</span>
            <span className="bg-neutral-200 text-neutral-600 text-xs px-1.5 py-0.5 rounded-full ml-1">
              {event.galleryImages?.length || 0}
            </span>
            {activeTab === 'gallery' && <div className="w-1.5 h-1.5 bg-primary rounded-full ml-1" />}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'settings' 
                ? 'border-primary text-primary bg-primary/5' 
                : 'border-transparent text-neutral-600 hover:text-neutral-800 hover:bg-neutral-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
            {activeTab === 'settings' && <div className="w-1.5 h-1.5 bg-primary rounded-full ml-1" />}
          </button>
        </nav>
      </div>

      {/* Tab Content - Enhanced */}
      <div className="mt-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-500" />
                Event Description
              </h2>
              
              {event.description ? (
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{event.description}</p>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-base font-medium text-gray-900 mb-1">No Description Added</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Add a compelling description to help attendees understand what makes your event special.
                  </p>
                  <Link
                    href={`/dashboards/organizer/events/${event.id}/edit`}
                    className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Add Description</span>
                  </Link>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-neutral-200 p-6">
                <h2 className="text-lg font-medium mb-4">Event Details</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Category</p>
                    <p>{event.category || "General"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Location Type</p>
                    <p>{event.locationType === "physical" ? "In-person" : "Online"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Created On</p>
                    <p>{new Date(event.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-neutral-200 p-6">
                <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  Quick Actions
                </h2>
                <div className="grid grid-cols-1 gap-3">
                  <Link
                    href={`/dashboards/organizer/events/${event.id}/edit`}
                    className="flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                        <Edit className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Edit Event</span>
                        <p className="text-xs text-gray-500">Update details and settings</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </Link>
                  
                  <Link
                    href={`/event/${event.id}`}
                    target="_blank"
                    className="flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                        <Eye className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">View Live Page</span>
                        <p className="text-xs text-gray-500">See how attendees view your event</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </Link>
                  
                  <button
                    onClick={() => setShareModalOpen(true)}
                    className="flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group w-full text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                        <Share2 className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">Share Event</span>
                        <p className="text-xs text-gray-500">Promote on social media</p>
                      </div>
                    </div>
                    <Share2 className="w-4 h-4 text-gray-400" />
                  </button>
                  
                  <button
                    onClick={handleLockToggle}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors group w-full text-left ${
                      isLocked 
                        ? 'bg-amber-50 hover:bg-amber-100'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${
                        isLocked 
                          ? 'bg-amber-100 group-hover:bg-amber-200'
                          : 'bg-gray-100 group-hover:bg-gray-200'
                      }`}>
                        {isLocked ? (
                          <Lock className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Unlock className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">
                          {isLocked ? 'Unlock Event' : 'Lock Event'}
                        </span>
                        <p className="text-xs text-gray-500">
                          {isLocked ? 'Allow changes and registrations' : 'Prevent changes and new registrations'}
                        </p>
                      </div>
                    </div>
                    {isLocked ? <Lock className="w-4 h-4 text-gray-400" /> : <Unlock className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Recent Attendees</h2>
                <Link 
                  href={`/organizer/events/${event.id}/attendees`} 
                  className="text-primary hover:text-primary-dark text-sm font-medium"
                >
                  View All
                </Link>
              </div>
              
              {/* Recent Attendees Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead>
                    <tr className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Attendee</th>
                      <th className="px-4 py-3">Ticket Type</th>
                      <th className="px-4 py-3">Purchase Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                  {recentAttendees.map((registration: any) => (
                    <tr key={registration.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-neutral-900">
                            {registration.attendee_name || 'N/A'}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {registration.attendee_email}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">
                        {registration.ticket_type || 'General'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">
                        {new Date(registration.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          registration.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800' 
                            : registration.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {registration.status === 'confirmed' ? 'Confirmed' : registration.status === 'cancelled' ? 'Cancelled' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900 text-right">
                        ₵{(registration.amount || 0).toLocaleString()}
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {recentAttendees.length === 0 && (
                <div className="text-center py-8">
                  <UsersIcon className="mx-auto h-10 w-10 text-neutral-300 mb-2" />
                  <h3 className="text-base font-medium text-neutral-900">No Attendees Yet</h3>
                  <p className="text-sm text-neutral-500 mt-1">
                    This event doesn't have any attendees yet
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attendees Tab */}
        {activeTab === 'attendees' && (
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-lg font-medium">All Attendees</h2>
                <p className="text-sm text-neutral-500 mt-1">
                  {allAttendees.filter(a => a.status === 'checked_in').length} of {allAttendees.length} checked in
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search attendees..."
                    value={attendeeSearchQuery}
                    onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-neutral-300 rounded-md text-sm w-full sm:w-64 focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
                {/* Status Filter */}
                <select 
                  value={attendeeStatusFilter}
                  onChange={(e) => setAttendeeStatusFilter(e.target.value as any)}
                  className="border border-neutral-300 rounded-md text-sm p-2"
                >
                  <option value="all">All Statuses</option>
                  <option value="checked_in">Checked In</option>
                  <option value="registered">Registered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            
            {/* Attendees Table with Check-in */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead>
                  <tr className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Attendee</th>
                    <th className="px-4 py-3">Ticket Type</th>
                    <th className="px-4 py-3">Registered</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Check-in</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {filteredAttendees.length > 0 ? (
                    filteredAttendees.map((attendee) => (
                      <tr key={attendee.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-neutral-900">
                              {attendee.name || 'N/A'}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {attendee.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">
                          {attendee.ticketType || 'General'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">
                          {new Date(attendee.registeredAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            attendee.status === 'checked_in' 
                              ? 'bg-green-100 text-green-800' 
                              : attendee.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {attendee.status === 'checked_in' ? 'Checked In' : attendee.status === 'cancelled' ? 'Cancelled' : 'Registered'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {attendee.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCheckIn(attendee.id, attendee.status === 'checked_in')}
                              disabled={isCheckingIn === attendee.id}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                attendee.status === 'checked_in'
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-primary text-white hover:bg-primary-dark'
                              } ${isCheckingIn === attendee.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              {isCheckingIn === attendee.id ? (
                                <span className="animate-spin">⏳</span>
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                              {attendee.status === 'checked_in' ? 'Checked In' : 'Check In'}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                          <button className="text-neutral-600 hover:text-neutral-900 p-1">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : allAttendees.length > 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <Search className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                        <p className="text-sm text-neutral-500">No attendees match your search</p>
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <UsersIcon className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                        <p className="text-sm text-neutral-500">No attendees registered yet</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Attendee Stats Summary */}
            {allAttendees.length > 0 && (
              <div className="mt-6 pt-4 border-t border-neutral-200 flex flex-wrap gap-4 text-sm text-neutral-600">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  Checked In: {allAttendees.filter(a => a.status === 'checked_in').length}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  Registered: {allAttendees.filter(a => a.status === 'registered').length}
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                  Cancelled: {allAttendees.filter(a => a.status === 'cancelled').length}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h2 className="text-lg font-medium mb-4">Ticket Management</h2>
            
            <div className="mb-6">
              <p className="text-neutral-600 mb-4">
                Manage your event tickets, adjust pricing, and control availability
              </p>
              
              <div className="space-y-4">
                {/* Real ticket data from event */}
                {event.tickets && Array.isArray(event.tickets) && event.tickets.length > 0 ? (
                  event.tickets.map((ticket: any, index: number) => (
                    <div key={index} className="border border-neutral-200 rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-medium">{ticket.name || `Ticket ${index + 1}`}</h3>
                          <div className="mt-1 space-y-1">
                            <p className="text-sm text-neutral-600">Price: <span className="font-medium">₵{ticket.price || 0}</span></p>
                            <div className="flex items-center gap-4">
                              <p className="text-sm text-neutral-600">Available: <span className="font-medium">{(ticket.quantity || 0) - (ticket.sold || 0)}/{ticket.quantity || 0}</span></p>
                              <p className="text-sm text-neutral-600">Sold: <span className="font-medium">{ticket.sold || 0}</span></p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary-dark transition-colors">Edit</button>
                          <button className="bg-red-50 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-100 transition-colors">Disable</button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Ticket className="mx-auto h-10 w-10 text-neutral-300 mb-2" />
                    <h3 className="text-base font-medium text-neutral-900">No Tickets Created</h3>
                    <p className="text-sm text-neutral-500 mt-1">
                      Create ticket types for your event to start selling
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex justify-center">
                <button className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-1">
                  <PlusCircle className="w-4 h-4" />
                  <span>Add New Ticket Type</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gallery Tab */}
        {activeTab === 'gallery' && (
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">Event Gallery</h2>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
                <button 
                  disabled={isUploading}
                  className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{isUploading ? 'Uploading...' : 'Add Photos'}</span>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Real gallery images */}
              {event.galleryImages && Array.isArray(event.galleryImages) && event.galleryImages.length > 0 ? (
                event.galleryImages.map((imagePath: string, index: number) => (
                  <div key={index} className="aspect-square bg-neutral-100 rounded-lg overflow-hidden relative group">
                    <Image
                      src={getFormattedImagePath(imagePath)}
                      alt={`Gallery image ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                    {/* Delete button on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => {
                          setPhotoToDelete({ path: imagePath, index });
                          setConfirmDeletePhoto(true);
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors cursor-pointer"
                        aria-label="Delete photo"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                // Placeholder when no images
                <div className="col-span-2 md:col-span-4 text-center py-8">
                  <ImageIcon className="mx-auto h-12 w-12 text-neutral-300 mb-4" />
                  <h3 className="text-base font-medium text-neutral-900">No Photos Yet</h3>
                  <p className="text-sm text-neutral-500 mt-1">
                    Add high-quality photos to showcase your event
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <h2 className="text-lg font-medium mb-4">General Settings</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div>
                    <h3 className="font-medium">Registration Settings</h3>
                    <p className="text-sm text-neutral-600">Configure how attendees can register for your event</p>
                  </div>
                  <Link
                    href={`/organizer/events/${event.id}/registration-settings`}
                    className="bg-white border border-neutral-300 text-neutral-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors"
                  >
                    Configure
                  </Link>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div>
                    <h3 className="font-medium">Notifications</h3>
                    <p className="text-sm text-neutral-600">Manage email and push notifications for this event</p>
                  </div>
                  <Link
                    href={`/organizer/events/${event.id}/notifications`}
                    className="bg-white border border-neutral-300 text-neutral-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors"
                  >
                    Manage
                  </Link>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div>
                    <h3 className="font-medium">Social Sharing</h3>
                    <p className="text-sm text-neutral-600">Customize social sharing options for your event</p>
                  </div>
                  <Link
                    href={`/organizer/events/${event.id}/social-sharing`}
                    className="bg-white border border-neutral-300 text-neutral-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors"
                  >
                    Configure
                  </Link>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div>
                    <h3 className="font-medium">Comments</h3>
                    <p className="text-sm text-neutral-600">Manage comments and discussions for this event</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-600 font-medium">Enabled</span>
                    <button className="bg-white border border-neutral-300 text-neutral-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors">
                      Configure
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Danger Zone */}
            <div className="bg-white rounded-lg border border-red-200 p-6">
              <h2 className="text-lg font-medium mb-4 text-red-600">Danger Zone</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <h3 className="font-medium">Cancel Event</h3>
                    <p className="text-sm text-neutral-600">Cancel this event and notify all registered attendees</p>
                  </div>
                  <button
                    onClick={() => setConfirmCancel(true)}
                    className="bg-white border border-red-300 text-red-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    Cancel Event
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <h3 className="font-medium">Delete Event</h3>
                    <p className="text-sm text-neutral-600">
                      {isEventLive 
                        ? '⚠️ Cannot delete live events. Cancel the event instead.' 
                        : 'Permanently remove this event from the platform'}
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={isEventLive}
                    className={`bg-white border px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isEventLive
                        ? 'border-neutral-300 text-neutral-400 cursor-not-allowed'
                        : 'border-red-300 text-red-600 hover:bg-red-50 cursor-pointer'
                    }`}
                  >
                    Delete Event
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-red-600">Delete Event</h3>
            <p className="text-neutral-600 mb-4">
              Are you sure you want to delete this event? This action cannot be undone, and all associated data will be permanently removed.
            </p>
            <p className="text-sm text-neutral-500 mb-4">
              Type <span className="font-semibold text-neutral-900">{event.title}</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Enter event name"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md mb-6 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setConfirmDelete(false);
                  setDeleteConfirmText('');
                }}
                className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEvent}
                disabled={deleteConfirmText !== event.title}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Event Confirmation Modal */}
      {confirmCancel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-red-600">Cancel Event</h3>
            <p className="text-neutral-600 mb-4">
              Are you sure you want to cancel this event? All registered attendees will be notified of the cancellation.
            </p>
            <p className="text-sm text-neutral-500 mb-4">
              Type <span className="font-semibold text-neutral-900">{event.title}</span> to confirm:
            </p>
            <input
              type="text"
              value={cancelConfirmText}
              onChange={(e) => setCancelConfirmText(e.target.value)}
              placeholder="Enter event name"
              className="w-full px-3 py-2 border border-neutral-300 rounded-md mb-6 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setConfirmCancel(false);
                  setCancelConfirmText('');
                }}
                className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCancelEvent}
                disabled={cancelConfirmText !== event.title}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {confirmStatusChange && pendingStatus && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4">
              {pendingStatus === 'published' ? 'Publish Event' : 'Unpublish Event'}
            </h3>
            <p className="text-neutral-600 mb-6">
              {pendingStatus === 'published' 
                ? 'Are you sure you want to publish this event? It will be visible to all users and they can start registering.'
                : 'Are you sure you want to unpublish this event? It will no longer be visible to users and they cannot register for it.'
              }
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setConfirmStatusChange(false);
                  setPendingStatus(null);
                }}
                className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleStatusChange(pendingStatus);
                  setConfirmStatusChange(false);
                  setPendingStatus(null);
                }}
                className={`px-4 py-2 text-white rounded-md transition-colors cursor-pointer ${
                  pendingStatus === 'published' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {pendingStatus === 'published' ? 'Publish' : 'Unpublish'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Share Event Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-600" />
                Share Event
              </h3>
              <button
                onClick={() => setShareModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Event Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-1">{event.title}</h4>
                <p className="text-sm text-gray-600">{event.date} • {event.location || 'Online Event'}</p>
              </div>
              
              {/* Copy Link */}
              <button
                onClick={() => handleShare('copy')}
                className={`w-full flex items-center justify-between p-3 border rounded-lg transition-all ${
                  copySuccess 
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    copySuccess ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    {copySuccess ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <span className="font-medium">
                    {copySuccess ? 'Link Copied!' : 'Copy Event Link'}
                  </span>
                </div>
              </button>
              
              {/* Social Media Options */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleShare('whatsapp')}
                  className="flex items-center justify-center gap-2 p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">W</span>
                  </div>
                  <span className="font-medium">WhatsApp</span>
                </button>
                
                <button
                  onClick={() => handleShare('twitter')}
                  className="flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">T</span>
                  </div>
                  <span className="font-medium">Twitter</span>
                </button>
                
                <button
                  onClick={() => handleShare('facebook')}
                  className="flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors col-span-2"
                >
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">f</span>
                  </div>
                  <span className="font-medium">Share on Facebook</span>
                </button>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    <span className="font-semibold">💡 Tip:</span> Share early and often to maximize attendance!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Photo Confirmation Modal */}
      {confirmDeletePhoto && photoToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                Delete Photo
              </h3>
              <button
                onClick={() => {
                  setConfirmDeletePhoto(false);
                  setPhotoToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Warning Message */}
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <p className="text-sm text-red-800">
                  Are you sure you want to delete this photo? This action cannot be undone.
                </p>
              </div>
              
              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    setConfirmDeletePhoto(false);
                    setPhotoToDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await handleDeletePhoto(photoToDelete.path, photoToDelete.index);
                    setConfirmDeletePhoto(false);
                    setPhotoToDelete(null);
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  Delete Photo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
