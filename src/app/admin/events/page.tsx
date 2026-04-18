"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client/client';
import { useAdminEventsDetailed, AdminEvent } from '@/hooks/adminQueries';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Calendar,
  Search, 
  Filter,
  ChevronDown, 
  MoreHorizontal,
  MapPin,
  Users,
  Tag,
  Star,
  CheckCircle,
  PlusCircle,
  XCircle,
  Clock,
  AlertCircle,
  Trash2,
  Edit,
  RefreshCcw,
  Eye,
  X,
  CalendarX,
  BarChart3,
  PanelTopClose,
  Download,
} from 'lucide-react';
import { RefreshButton } from '@/components/admin/RefreshButton';
import { useToast } from '@/hooks/useToast';
import { format, parseISO, isValid, isFuture, isPast } from 'date-fns';
import { getFormattedImagePath } from '@/utils/imageHelpers';
import { engagementService } from '@/services/engagementService';
import { eventRegistrationService, EventRegistrationStats } from '@/services/eventRegistrationService';
import { formatPrice } from '@/utils/priceUtils';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import { useDebounce } from '@/hooks/useDebounce';
import { PageLoader } from '@/components/loaders/PageLoader';

// Define event type
type Event = AdminEvent;

// Confirmation Modal Component
const ConfirmationModal = ({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmButtonClass = "bg-primary text-white hover:bg-primary-dark",
  onConfirm,
  onCancel
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmButtonClass?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle escape key to cancel
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [onCancel, isLoading]);
  
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); if (!isLoading) onCancel(); }}>
      <div 
        ref={modalRef}
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in duration-200"
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
      >
        <h3 className="text-xl font-bold mb-3 text-neutral-800 dark:text-neutral-100">{title}</h3>
        <p className="text-neutral-600 dark:text-neutral-300 mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className={`px-4 py-2 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer font-medium transition-colors shadow-sm ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg cursor-pointer font-medium shadow-sm flex items-center gap-2 ${
              isLoading ? 'opacity-75 cursor-not-allowed' : ''
            } ${confirmButtonClass}`}
          >
            {isLoading && (
              <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
            )}
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// Event Detail Modal Component
const EventDetailModal = ({
  event,
  onClose,
  onFeatureEvent,
  onPublishEvent,
  onCancelEvent,
  onDeleteEvent,
}: {
  event: Event;
  onClose: () => void;
  onFeatureEvent: (eventId: string, feature: boolean, durationDays?: number) => void;
  onPublishEvent: (eventId: string, publish: boolean) => void;
  onCancelEvent: (eventId: string) => void;
  onDeleteEvent: (eventId: string) => void;
}) => {
  const adminToast = useToast();
  const [activeTab, setActiveTab] = useState<'details' | 'analytics'>('details');
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [showPublishConfirmation, setShowPublishConfirmation] = useState(false);
  const [isProcessingFeature, setIsProcessingFeature] = useState(false);
  const [isProcessingPublish, setIsProcessingPublish] = useState(false);
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  const [registrationStats, setRegistrationStats] = useState<EventRegistrationStats | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Load registration stats when modal opens
  useEffect(() => {
    const loadRegistrationStats = async () => {
      try {
        const stats = await eventRegistrationService.getEventRegistrationStats(event.id);
        setRegistrationStats(stats);
      } catch (error) {
        console.error('Error loading registration stats:', error);
      }
    };
    
    loadRegistrationStats();
  }, [event.id]);
  
  // Handle click outside to close - but only if no sub-modals are open
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if any sub-modals are open
      if (showFeatureModal || showCancelConfirmation || showDeleteConfirmation || showPublishConfirmation) {
        return;
      }
      
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFeatureModal, showCancelConfirmation, showDeleteConfirmation, showPublishConfirmation]); // Remove onClose to prevent infinite loop
  
  // Format dates for better readability
  const formatEventDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return dateString; // Fallback to the original string
      
      return format(date, 'PPP'); // e.g., April 29, 2023
    } catch (error) {
      return dateString;
    }
  };
  
  const formatEventTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return '';
      
      return format(date, 'p'); // e.g., 12:00 PM
    } catch (error) {
      return '';
    }
  };

  const isEventFuture = (dateString?: string) => {
    if (!dateString) return false;
    
    try {
      const date = parseISO(dateString);
      return isValid(date) && isFuture(date);
    } catch {
      return false;
    }
  };

  const isEventPast = (dateString?: string) => {
    if (!dateString) return false;
    
    try {
      const date = parseISO(dateString);
      return isValid(date) && isPast(date);
    } catch {
      return false;
    }
  };
  
  // Determine event status for display
  const getStatusInfo = () => {
    if (event.status === 'published') {
      if (isEventPast(event.endDate || event.startDate)) {
        return {
          label: 'Completed',
          color: 'bg-gray-100 text-gray-800',
          icon: <CheckCircle className="h-4 w-4 mr-1" />
        };
      } else if (isEventFuture(event.startDate)) {
        return {
          label: 'Upcoming',
          color: 'bg-green-100 text-green-800',
          icon: <Clock className="h-4 w-4 mr-1" />
        };
      } else {
        return {
          label: 'Live',
          color: 'bg-blue-100 text-blue-800',
          icon: <CheckCircle className="h-4 w-4 mr-1" />
        };
      }
    } else if (event.status === 'draft') {
      return {
        label: 'Draft',
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="h-4 w-4 mr-1" />
      };
    } else if (event.status === 'cancelled') {
      return {
        label: 'Cancelled',
        color: 'bg-red-100 text-red-800',
        icon: <XCircle className="h-4 w-4 mr-1" />
      };
    }
    
    return {
      label: event.status.charAt(0).toUpperCase() + event.status.slice(1),
      color: 'bg-gray-100 text-gray-800',
      icon: <AlertCircle className="h-4 w-4 mr-1" />
    };
  };
  
  const statusInfo = getStatusInfo();
  
  // Check if event can be published/unpublished
  const canTogglePublishStatus = event.status !== 'cancelled';
  
  // Check if event can be cancelled
  const canCancel = event.status === 'published' && !isEventPast(event.endDate || event.startDate);
  
  // Determine event stats for analytics
  const statsData = {
    ticketsSold: event.ticketsSold || 0,
    attendeeCount: event.attendeeCount || 0,
    viewCount: Math.floor(Math.random() * 1000) + 100, // Simulated view count
    conversionRate: Math.floor(Math.random() * 10) + 1, // Simulated conversion rate
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto p-4" onClick={(e) => { 
      // Don't close if any sub-modals are open
      if (showFeatureModal || showCancelConfirmation || showDeleteConfirmation || showPublishConfirmation) {
        return;
      }
      onClose();
    }}>
      <div 
        ref={modalRef}
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-800 max-w-4xl w-full flex flex-col max-h-[90vh] animate-in fade-in duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with event image */}
        <div className="relative h-64 bg-neutral-100 dark:bg-neutral-800 flex-shrink-0">
          {event.imageUrl ? (
            <>
              <Image 
                src={getFormattedImagePath(event.imageUrl)}
                alt={event.title} 
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <Calendar className="h-20 w-20 text-neutral-400 dark:text-neutral-500" />
            </div>
          )}
          
          {/* Close button */}
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              // Close all sub-modals first
              setShowFeatureModal(false);
              setShowCancelConfirmation(false);
              setShowDeleteConfirmation(false);
              setShowPublishConfirmation(false);
              // Then close main modal
              onClose(); 
            }}
            className="absolute top-4 right-4 bg-white/90 hover:bg-white text-neutral-700 p-2 rounded-full transition-colors cursor-pointer shadow-lg"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
          
          {/* Featured badge */}
          {event.isFeatured && (
            <div className="absolute top-4 left-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 px-3 py-1.5 rounded-full text-xs font-medium border border-yellow-300 dark:border-yellow-700 flex items-center">
              <Star className="w-3.5 h-3.5 mr-1.5 fill-current" />
              Featured
            </div>
          )}
          
          {/* Event title and info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-white">{event.title}</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-white/90">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{formatEventDate(event.startDate || event.date)}</span>
                {event.startDate && event.endDate && event.startDate !== event.endDate && (
                  <span> - {formatEventDate(event.endDate)}</span>
                )}
              </div>
              
              {event.location && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Status and category badges */}
        <div className="px-6 py-4 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 flex-shrink-0">
          <div className="flex flex-wrap gap-2 items-center">
            <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${
              statusInfo.color.includes('green') 
                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-300 dark:border-green-700'
                : statusInfo.color.includes('yellow')
                ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700'
                : statusInfo.color.includes('red')
                ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-red-300 dark:border-red-700'
                : statusInfo.color.includes('blue')
                ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 border-blue-300 dark:border-blue-700'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-600'
            }`}>
              {statusInfo.icon}
              {statusInfo.label}
            </div>
            
            {event.category && (
              <div className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                <Tag className="h-4 w-4 mr-1" />
                {event.category}
              </div>
            )}
            
            {event.hasVoting && (
              <div className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                <Users className="h-4 w-4 mr-1" />
                Voting Enabled
              </div>
            )}
            
            <div className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
              <Tag className="h-4 w-4 mr-1" />
              {formatPrice(event.price)}
            </div>
            
            <div className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              <Users className="h-4 w-4 mr-1" />
              {event.attendeeCount || 0} attendees
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 flex-shrink-0">
          <div className="px-6 py-2 flex space-x-1">
            <button 
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === 'details' 
                  ? 'bg-neutral-700 dark:bg-neutral-800 text-white' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Details
              </span>
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                activeTab === 'analytics' 
                  ? 'bg-neutral-700 dark:bg-neutral-800 text-white' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </span>
            </button>
          </div>
        </div>
        
        {/* Content based on active tab - Scrollable area */}
        <div className="overflow-y-auto bg-white dark:bg-neutral-900" style={{ height: '400px' }}>
          {activeTab === 'details' ? (
            <div className="p-6 space-y-6 min-h-full">
              {/* Description */}
              <div>
                <h3 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-3">Description</h3>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  {event.description || 'No description provided.'}
                </p>
              </div>
              
              {/* Event details grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-3">Event Details</h3>
                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-5 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500 dark:text-neutral-400">Event Type:</span>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">{event.eventType || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500 dark:text-neutral-400">Category:</span>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">{event.category || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-neutral-500 dark:text-neutral-400">Price:</span>
                      <span className="font-medium text-neutral-800 dark:text-neutral-200">{formatPrice(event.price)}</span>
                    </div>
                    {event.venue && (
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-500 dark:text-neutral-400">Venue:</span>
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{event.venue}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-3">Organizer</h3>
                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-5 shadow-sm">
                    {event.organizer ? (
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded-full bg-neutral-200 dark:bg-neutral-600 flex items-center justify-center mr-4 overflow-hidden">
                          {event.organizer.image ? (
                            <Image
                              src={event.organizer.image}
                              alt={event.organizer.name}
                              width={48}
                              height={48}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <span className="font-medium text-neutral-500 dark:text-neutral-400 text-lg">
                              {event.organizer.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-neutral-800 dark:text-neutral-200">{event.organizer.name}</p>
                          <Link 
                            href={`/admin/users?search=${encodeURIComponent(event.organizer.id)}`}
                            className="text-primary text-sm hover:underline mt-1 inline-block"
                          >
                            View Profile
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <p className="text-neutral-500 dark:text-neutral-400">No organizer information available</p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Timestamps */}
              <div>
                <h3 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-3">System Information</h3>
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-5 space-y-4 text-sm shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 dark:text-neutral-400">Created:</span>
                    <span className="font-mono text-neutral-700 dark:text-neutral-300">{new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 dark:text-neutral-400">Last Modified:</span>
                    <span className="font-mono text-neutral-700 dark:text-neutral-300">{new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 dark:text-neutral-400">Event ID:</span>
                    <span className="font-mono bg-neutral-100 dark:bg-neutral-600 px-2 py-1 rounded text-neutral-700 dark:text-neutral-300">{event.id}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6 min-h-full">
              {/* Analytics stats cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-5 text-center shadow-sm">
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                    {(registrationStats?.total_registrations ?? 0) > 0 ? 'Registrations' : 'Tickets Sold'}
                  </p>
                  <p className="text-2xl font-bold mt-1 text-neutral-800 dark:text-neutral-200">
                    {registrationStats?.total_registrations ?? statsData.ticketsSold}
                  </p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-5 text-center shadow-sm">
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm">Attendees</p>
                  <p className="text-2xl font-bold mt-1 text-neutral-800 dark:text-neutral-200">{event.attendeeCount || statsData.attendeeCount}</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-5 text-center shadow-sm">
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm">Page Views</p>
                  <p className="text-2xl font-bold mt-1 text-neutral-800 dark:text-neutral-200">{statsData.viewCount}</p>
                </div>
                <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-5 text-center shadow-sm">
                  <p className="text-neutral-500 dark:text-neutral-400 text-sm">Conversion Rate</p>
                  <p className="text-2xl font-bold mt-1 text-neutral-800 dark:text-neutral-200">{statsData.conversionRate}%</p>
                </div>
              </div>
              
              {/* Registration details for free events */}
              {registrationStats && registrationStats.total_registrations > 0 && (
                <div>
                  <h3 className="font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Registration Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-5 shadow-sm">
                      <h4 className="font-medium text-neutral-800 dark:text-neutral-200 mb-3">Registration Summary</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-neutral-500 dark:text-neutral-400">Total Registrations:</span>
                          <span className="font-medium text-neutral-800 dark:text-neutral-200">{registrationStats.total_registrations}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500 dark:text-neutral-400">Confirmed:</span>
                          <span className="font-medium text-green-600">{registrationStats.confirmed_registrations}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500 dark:text-neutral-400">Cancelled:</span>
                          <span className="font-medium text-red-600">{registrationStats.cancelled_registrations}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-5 shadow-sm">
                      <h4 className="font-medium text-neutral-800 dark:text-neutral-200 mb-3">By Ticket Type</h4>
                      <div className="space-y-3">
                        {Object.entries(registrationStats.registrations_by_ticket_type).map(([ticketType, count]) => (
                          <div key={ticketType} className="flex justify-between">
                            <span className="text-neutral-500 dark:text-neutral-400">{ticketType}:</span>
                            <span className="font-medium text-neutral-800 dark:text-neutral-200">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Recent registrations */}
                  {registrationStats.recent_registrations.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-neutral-800 dark:text-neutral-200 mb-3">Recent Registrations</h4>
                      <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-5 shadow-sm">
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                          {registrationStats.recent_registrations.map((registration, index) => (
                            <div key={registration.id} className="flex justify-between items-center py-2 border-b border-neutral-200 dark:border-neutral-600 last:border-0">
                              <div>
                                <p className="font-medium text-neutral-800 dark:text-neutral-200">{registration.attendee_name}</p>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">{registration.attendee_email}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{registration.ticket_type}</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                  {new Date(registration.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              
              <div className="text-center">
                <button
                  onClick={() => {
                    adminToast.showSuccess('Analytics data exported');
                  }}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 mx-auto cursor-pointer shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  Export Analytics Data
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Actions Footer - Always visible */}
        <div className="bg-white dark:bg-neutral-900 px-6 py-4 border-t border-gray-200 dark:border-neutral-700 flex-shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-wrap gap-2">
              <Link 
                href={`/event/${event.id}`} 
                target="_blank"
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer"
              >
                <Eye className="h-4 w-4" />
                View Live
              </Link>
              
              <button
                onClick={() => setShowFeatureModal(true)}
                disabled={isProcessingFeature}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border cursor-pointer ${
                  isProcessingFeature
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 cursor-not-allowed border-gray-300 dark:border-gray-600'
                    : event.isFeatured 
                      ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700'
                      : 'bg-neutral-700 text-white hover:bg-neutral-800 dark:bg-neutral-700 dark:hover:bg-neutral-600 border-neutral-700 dark:border-neutral-700'
                }`}
              >
                {isProcessingFeature ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Star className={`h-4 w-4 ${event.isFeatured ? 'fill-current' : ''}`} />
                    {event.isFeatured ? 'Unfeature' : 'Feature'}
                  </>
                )}
              </button>
              
              {canTogglePublishStatus && (
                <button
                  onClick={() => setShowPublishConfirmation(true)}
                  disabled={isProcessingPublish}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border cursor-pointer ${
                    isProcessingPublish
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 cursor-not-allowed border-gray-300 dark:border-gray-600'
                      : event.status === 'published'
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 border-indigo-600 dark:border-indigo-500'
                        : 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 border-green-600 dark:border-green-500'
                  }`}
                >
                  {isProcessingPublish ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                      Processing...
                    </>
                  ) : event.status === 'published' ? (
                    <>
                      <PanelTopClose className="h-4 w-4" />
                      Unpublish
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Publish
                    </>
                  )}
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
              {canCancel && (
                <button
                  onClick={() => setShowCancelConfirmation(true)}
                  disabled={isProcessingCancel}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border cursor-pointer ${
                    isProcessingCancel
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 cursor-not-allowed border-gray-300 dark:border-gray-600'
                      : 'bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-500 dark:hover:bg-orange-600 border-orange-500 dark:border-orange-500'
                  }`}
                >
                  {isProcessingCancel ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CalendarX className="h-4 w-4" />
                      Cancel Event
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={() => setShowDeleteConfirmation(true)}
                disabled={isProcessingDelete}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border cursor-pointer ${
                  isProcessingDelete
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 cursor-not-allowed border-gray-300 dark:border-gray-600'
                    : 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-600 border-red-500 dark:border-red-500'
                }`}
              >
                {isProcessingDelete ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirmation && (
        <ConfirmationModal
          title="Cancel Event"
          message="Are you sure you want to cancel this event? This will notify all attendees and the event will be marked as cancelled."
          confirmLabel="Cancel Event"
          confirmButtonClass="bg-orange-500 text-white hover:bg-orange-600"
          onConfirm={async () => {
            setIsProcessingCancel(true);
            try {
              await onCancelEvent(event.id);
            } catch (error) {
              console.error('Cancel event error:', error);
            } finally {
              setIsProcessingCancel(false);
              setShowCancelConfirmation(false);
            }
          }}
          onCancel={() => setShowCancelConfirmation(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <ConfirmationModal
          title="Delete Event"
          message="Are you sure you want to delete this event? This action cannot be undone and all event data will be permanently removed."
          confirmLabel="Delete"
          confirmButtonClass="bg-red-500 text-white hover:bg-red-600"
          onConfirm={async () => {
            setIsProcessingDelete(true);
            try {
              await onDeleteEvent(event.id);
              // Close the main modal after successful deletion
              onClose();
            } catch (error) {
              console.error('Delete event error:', error);
            } finally {
              setIsProcessingDelete(false);
              setShowDeleteConfirmation(false);
            }
          }}
          onCancel={() => setShowDeleteConfirmation(false)}
        />
      )}

      {/* Feature/Unfeature Confirmation Modal */}
      {showFeatureModal && (
        <ConfirmationModal
          title={event.isFeatured ? "Unfeature Event" : "Feature Event"}
          message={event.isFeatured 
            ? `Are you sure you want to remove "${event.title}" from the featured events? It will no longer appear prominently on the homepage.`
            : `Are you sure you want to feature "${event.title}"? It will appear prominently on the homepage and attract more attention.`}
          confirmLabel={event.isFeatured ? "Unfeature" : "Feature Event"}
          confirmButtonClass={event.isFeatured
            ? "bg-yellow-600 text-white hover:bg-yellow-700"
            : "bg-neutral-700 text-white hover:bg-neutral-800"}
          onConfirm={async () => {
            setIsProcessingFeature(true);
            try {
              await onFeatureEvent(event.id, !event.isFeatured);
            } catch (error) {
              console.error('Feature event error:', error);
            } finally {
              setIsProcessingFeature(false);
              setShowFeatureModal(false);
            }
          }}
          onCancel={() => setShowFeatureModal(false)}
        />
      )}

      {/* Publish Confirmation Modal */}
      {showPublishConfirmation && (
        <ConfirmationModal
          title={event.status === 'published' ? "Unpublish Event" : "Publish Event"}
          message={event.status === 'published'
            ? "Are you sure you want to unpublish this event? It will no longer be visible to users until published again."
            : "Are you sure you want to publish this event? It will become visible to all users on the platform."}
          confirmLabel={event.status === 'published' ? "Unpublish" : "Publish"}
          confirmButtonClass={event.status === 'published'
            ? "bg-indigo-600 text-white hover:bg-indigo-700"
            : "bg-green-600 text-white hover:bg-green-700"}
          onConfirm={async () => {
            setIsProcessingPublish(true);
            try {
              await onPublishEvent(event.id, event.status !== 'published');
            } catch (error) {
              console.error('Publish event error:', error);
            } finally {
              setIsProcessingPublish(false);
              setShowPublishConfirmation(false);
            }
          }}
          onCancel={() => setShowPublishConfirmation(false)}
        />
      )}
    </div>
  );
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  let color, icon, label;
  
  switch(status) {
    case 'published':
      color = 'bg-green-100 text-green-800';
      icon = <CheckCircle className="w-3 h-3 mr-1" />;
      label = 'Published';
      break;
    case 'draft':
      color = 'bg-yellow-100 text-yellow-800';
      icon = <Clock className="w-3 h-3 mr-1" />;
      label = 'Draft';
      break;
    case 'cancelled':
      color = 'bg-red-100 text-red-800';
      icon = <XCircle className="w-3 h-3 mr-1" />;
      label = 'Cancelled';
      break;
    default:
      color = 'bg-gray-100 text-gray-800';
      icon = <AlertCircle className="w-3 h-3 mr-1" />;
      label = status;
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {icon}
      {label}
    </span>
  );
};

// Category badge component
const CategoryBadge = ({ category }: { category: string }) => {
  // Darkened + lower saturation variant to reduce eye strain (especially in large tables)
  // Light mode: slightly deeper blue with translucency; Dark mode: subtle tinted background
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-200/60 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300/50 dark:border-blue-800/60 tracking-wide">
      {category}
    </span>
  );
};

// Empty state component
const EmptyState = ({
  onClearFilters,
  hasFilters
}: {
  onClearFilters: () => void;
  hasFilters: boolean;
}) => (
  <div className="text-center py-12">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-neutral-800 mb-4">
      <Calendar className="w-8 h-8 text-gray-400 dark:text-gray-500" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No events found</h3>
    {hasFilters ? (
      <>
        <p className="text-gray-500 mb-4">Try adjusting your search or filter parameters</p>
        <button 
          onClick={onClearFilters}
          className="text-primary hover:text-primary-dark font-medium cursor-pointer"
        >
          Clear all filters
        </button>
      </>
    ) : (
      <p className="text-gray-500">
        No events have been created yet.
      </p>
    )}
  </div>
);

// Unified compact action icon button for admin tables
const ActionIconButton = ({
  onClick,
  label,
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  label: string;
  children: React.ReactNode;
}) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(e); }}
    aria-label={label}
    className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer"
  >
    {children}
  </button>
);

export default function EventsPage() {
  // ✅ SESSION MANAGEMENT: Prevent session expiration on events page
  useSessionManagement();
  
  const queryClient = useQueryClient();
  const adminToast = useToast();
  const { 
    data: eventsData, 
    isLoading: queryLoading, 
    isFetching,
    error: queryError,
    refetch
  } = useAdminEventsDetailed({
    // Add timeout and error handling to prevent infinite loading
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Force error after 30 seconds
    meta: {
      errorBoundary: true
    }
  });
  // Memoize events to prevent infinite loops in useEffect
  const events = useMemo(() => eventsData || [], [eventsData]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // ✅ PHASE 2 OPTIMIZATION: Debounce search term to reduce unnecessary filtering
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  // Derive loading directly from query (avoid local state loops)
  const isLoading = queryLoading;
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const eventsPerPage = 20;

  // Timeout protection for infinite loading
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        if (isLoading) {
          console.warn('[AdminEvents] Query loading timeout after 15 seconds');
          setLoadingTimeout(true);
        }
      }, 15000); // 15 second timeout
      
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading]);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      // Check if on mobile screen first
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        return "grid"; // Always use grid on mobile
      }
      return (localStorage.getItem("adminEventsViewMode") as "grid" | "list") || "list";
    }
    return "list";
  });
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<string | null>(null);
  const [showCancelConfirmation, setShowCancelConfirmation] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Update view mode based on window size
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
          setViewMode("grid");
        }
      };
      
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);
  
  // Save view preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("adminEventsViewMode", viewMode);
    }
  }, [viewMode]);
  
  // Helper to normalize image paths (public folder requires leading slash for next/image)
  const normalizeImagePath = (src: string | null | undefined): string | undefined => {
    if (!src) return undefined;
    // If already absolute URL (http/https) or starts with data: just return
    if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:')) return src;
    // If it already starts with a slash, keep it
    if (src.startsWith('/')) return src;
    // Common mistake: stored just the filename e.g. "tech-conference.webp" or
    // subfolder without leading slash e.g. "events/tech-conference.webp"
    return `/${src}`;
  };

  // Sync URL params to filters once on mount & when searchParams string changes (avoid identity churn)
  const searchParamsKey = searchParams.toString();
  const appliedParamsRef = useRef<string | null>(null);
  useEffect(() => {
    if (appliedParamsRef.current === searchParamsKey) return; // no changes
    appliedParamsRef.current = searchParamsKey;
    const categoryParam = searchParams.get('category');
    const statusParam = searchParams.get('status');
    const timeParam = searchParams.get('time');
    const searchParam = searchParams.get('search');
    if (categoryParam && categoryParam !== categoryFilter) setCategoryFilter(categoryParam);
    if (statusParam && statusParam !== statusFilter) setStatusFilter(statusParam);
    if (timeParam && timeParam !== timeFilter) setTimeFilter(timeParam);
    if (searchParam && searchParam !== searchTerm) setSearchTerm(searchParam);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParamsKey]);
  
  // Handle filter changes
  useEffect(() => {
    let result = [...events];
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(event => event.category?.toLowerCase() === categoryFilter.toLowerCase());
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(event => event.status === statusFilter);
    }
    
    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      
      if (timeFilter === 'upcoming') {
        result = result.filter(event => {
          try {
            const eventDate = event.startDate || event.date;
            if (!eventDate) return false;
            
            const eventDateObj = new Date(eventDate);
            return eventDateObj > now;
          } catch (error) {
            return false;
          }
        });
      } else if (timeFilter === 'past') {
        result = result.filter(event => {
          try {
            const eventDate = event.endDate || event.startDate || event.date;
            if (!eventDate) return false;
            
            const eventDateObj = new Date(eventDate);
            return eventDateObj < now;
          } catch (error) {
            return false;
          }
        });
      } else if (timeFilter === 'today') {
        result = result.filter(event => {
          try {
            const eventDate = event.startDate || event.date;
            if (!eventDate) return false;
            
            const eventDateObj = new Date(eventDate);
            return (
              eventDateObj.getDate() === now.getDate() &&
              eventDateObj.getMonth() === now.getMonth() &&
              eventDateObj.getFullYear() === now.getFullYear()
            );
          } catch (error) {
            return false;
          }
        });
      }
    }
    
    // Apply search
    if (debouncedSearchTerm) {
      const lowerSearch = debouncedSearchTerm.toLowerCase();
      result = result.filter(event =>
        event.title.toLowerCase().includes(lowerSearch) ||
        event.description?.toLowerCase().includes(lowerSearch) ||
        event.location?.toLowerCase().includes(lowerSearch) ||
        event.organizer?.name?.toLowerCase().includes(lowerSearch)
      );
    }
    
    setFilteredEvents(result);
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [categoryFilter, statusFilter, timeFilter, debouncedSearchTerm, events]);
  
  // Calculate pagination
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = filteredEvents.slice(indexOfFirstEvent, indexOfLastEvent);
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);
  
  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Toggle featured status (manual featuring for admin promotions)
  const handleFeatureEvent = async (eventId: string, feature: boolean, durationDays?: number) => {
    try {
      if (feature) {
        // Manually feature the event (indefinitely by default)
        const success = await engagementService.manuallyFeatureEvent(eventId, undefined, 'Promoted');
        if (success) {
          adminToast.showSuccess('Event featured successfully');
        } else {
          throw new Error('Failed to feature event');
        }
      } else {
        // Unfeature the event
        const success = await engagementService.unfeatureEvent(eventId);
        if (success) {
          adminToast.showSuccess('Event unfeatured successfully');
        } else {
          throw new Error('Failed to unfeature event');
        }
      }
      
      // Refresh the events list
      queryClient.invalidateQueries({ queryKey: ['admin','events','detailed'] });
      
      // Immediately update the selectedEvent to reflect the new feature status
      if (selectedEvent && selectedEvent.id === eventId) {
        setSelectedEvent(prev => prev ? {
          ...prev,
          isFeatured: feature,
          featuredType: feature ? 'manual' : undefined
        } : null);
      }
      
      // Then refresh the full data from the server
      setTimeout(() => {
        const current = queryClient.getQueryData<AdminEvent[]>(['admin','events','detailed']) || [];
        const updatedEvent = current.find(e => e.id === eventId);
        if (updatedEvent && selectedEvent && selectedEvent.id === eventId) {
          setSelectedEvent(updatedEvent);
        }
      }, 100);
      
    } catch (error) {
      console.error('Error updating featured status:', error);
      adminToast.showError('Failed to update featured status');
      queryClient.invalidateQueries({ queryKey: ['admin','events','detailed'] });
    }
  };
  
  // Toggle publish status
  const handlePublishEvent = async (eventId: string, publish: boolean) => {
    try {
      const supabase = createClient();
      queryClient.setQueryData<AdminEvent[]>(['admin','events','detailed'], old => (old||[]).map(e => e.id === eventId ? { ...e, status: publish ? 'published' : 'draft' } : e));
      setSelectedEvent(prev => prev && prev.id === eventId ? { ...prev, status: publish ? 'published' : 'draft' } : prev);
      const { error } = await supabase.from('events').update({ status: publish ? 'published' : 'draft', updated_at: new Date().toISOString() }).eq('id', eventId);
      if (error) throw error;
  adminToast.showSuccess(publish ? 'Event published successfully' : 'Event unpublished successfully');
    } catch (error) {
      console.error("Error updating event:", error);
  adminToast.showError('Failed to update event');
      queryClient.invalidateQueries({ queryKey: ['admin','events','detailed'] });
    }
  };
  
  // Cancel event
  const handleCancelEvent = async (eventId: string) => {
    try {
      const supabase = createClient();
      queryClient.setQueryData<AdminEvent[]>(['admin','events','detailed'], old => (old||[]).map(e => e.id === eventId ? { ...e, status: 'cancelled' } : e));
      setSelectedEvent(prev => prev && prev.id === eventId ? { ...prev, status: 'cancelled' } : prev);
      const { error } = await supabase.from('events').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', eventId);
      if (error) throw error;
  adminToast.showSuccess('Event cancelled successfully');
    } catch (error) {
      console.error("Error cancelling event:", error);
  adminToast.showError('Failed to cancel event');
      queryClient.invalidateQueries({ queryKey: ['admin','events','detailed'] });
    }
  };
  
  // Delete event
  const handleDeleteEvent = async (eventId: string) => {
    try {
      const supabase = createClient();
      const previous = queryClient.getQueryData<AdminEvent[]>(['admin','events','detailed']);
      queryClient.setQueryData<AdminEvent[]>(['admin','events','detailed'], old => (old||[]).filter(e => e.id !== eventId));
      setSelectedEvent(null);
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
  adminToast.showSuccess('Event deleted successfully');
      setShowDeleteConfirmation(null);
    } catch (error) {
      console.error("Error deleting event:", error);
  adminToast.showError('Failed to delete event');
      queryClient.invalidateQueries({ queryKey: ['admin','events','detailed'] });
    }
  };
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Update URL with search params for shareable links
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (timeFilter !== 'all') params.set('time', timeFilter);
    
    const queryString = params.toString();
    const url = queryString ? `/admin/events?${queryString}` : '/admin/events';
    router.replace(url);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setCategoryFilter('all');
    setStatusFilter('all');
    setTimeFilter('all');
    setSearchTerm('');
    router.replace('/admin/events');
  };
  
  // Toggle dropdown
  const toggleDropdown = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (dropdownOpen === eventId) {
      setDropdownOpen(null);
    } else {
      setDropdownOpen(eventId);
    }
  };
  
  // Close all dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);
  
  // Calculate stats
  const publishedCount = useMemo(() => events.filter(e => e.status === 'published').length, [events]);
  const draftCount = useMemo(() => events.filter(e => e.status === 'draft').length, [events]);
  const cancelledCount = useMemo(() => events.filter(e => e.status === 'cancelled').length, [events]);
  const featuredCount = useMemo(() => events.filter(e => e.isFeatured).length, [events]);
  
  // Get unique categories for filter
  const uniqueCategories = useMemo(() => Array.from(new Set(events.filter(e => e.category).map(e => e.category!))), [events]);
  
  // Check if any filters are applied
  const hasFilters = categoryFilter !== 'all' || statusFilter !== 'all' || timeFilter !== 'all' || searchTerm !== '';
  
  // Format date helper function
  const formatEventDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return dateString;
      
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };
  
  // Error state
  if (queryError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Events Management
          </h1>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-red-200 dark:border-red-800">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Failed to Load Events
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {queryError instanceof Error ? queryError.message : 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
            >
              <RefreshCcw className="h-4 w-4" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Loading timeout state
  if (loadingTimeout) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Events Management
          </h1>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-yellow-200 dark:border-yellow-800">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-4">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Loading Taking Longer Than Expected
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              The events are taking longer to load than usual. This might be due to a slow connection or server issue.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  setLoadingTimeout(false);
                  refetch();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
              >
                <RefreshCcw className="h-4 w-4" />
                Retry
              </button>
              <button
                onClick={() => setLoadingTimeout(false)}
                className="px-4 py-2 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Continue Waiting
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Loading state (with timeout protection)
  if (isLoading || isFetching) {
    return <PageLoader message="Loading events..." fullHeight />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Events Management
        </h1>
        <div className="flex gap-2">
          <Link
            href="/admin/events/add-event"
            className="flex items-center gap-1 bg-black dark:bg-black text-white px-3 py-2 rounded-md hover:bg-gray-800 dark:hover:bg-gray-800 cursor-pointer transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Event</span>
          </Link>
          <RefreshButton 
            queryKeys={[['admin', 'events', 'detailed']]}
            isLoading={isFetching}
          />
        </div>
      </div>
      
      {/* Filters and search */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-2 lg:mr-4">
            <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Filter by:</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-grow gap-3">
            {/* Category filter */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="block w-full appearance-none bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-800 rounded-lg py-2 pl-3 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary focus:border-primary cursor-pointer"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 dark:text-gray-500">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
            
            {/* Status filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full appearance-none bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-800 rounded-lg py-2 pl-3 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary focus:border-primary cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 dark:text-gray-500">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
            
            {/* Time filter */}
            <div className="relative">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="block w-full appearance-none bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-800 rounded-lg py-2 pl-3 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary focus:border-primary cursor-pointer"
              >
                <option value="all">All Times</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
                <option value="today">Today</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 dark:text-gray-500">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
            
            {/* Search input */}
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search by title, location, or organizer"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-lg text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-600 cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="px-3 py-2 bg-black dark:bg-black text-white rounded-lg text-sm font-medium hover:bg-nuetral-800 dark:hover:bg-nuetral-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-black focus:ring-offset-2 cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Events</div>
              <div className="text-xl font-bold mt-0.5 text-gray-900 dark:text-gray-100">{events.length}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Published</div>
              <div className="text-xl font-bold mt-0.5 text-gray-900 dark:text-gray-100">{publishedCount}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-full">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Drafts</div>
              <div className="text-xl font-bold mt-0.5 text-gray-900 dark:text-gray-100">{draftCount}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Cancelled</div>
              <div className="text-xl font-bold mt-0.5 text-gray-900 dark:text-gray-100">{cancelledCount}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Event Listings Header with View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Event Listings
        </h2>
        <div className="hidden md:flex items-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`h-7 w-7 inline-flex items-center justify-center rounded-sm transition-colors cursor-pointer ${viewMode==='grid' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
            title="Grid View"
            aria-label="Grid view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`h-7 w-7 inline-flex items-center justify-center rounded-sm transition-colors cursor-pointer ${viewMode==='list' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
            title="List View"
            aria-label="List view"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      
  {/* (Repositioned heading with toggle above) */}

      {/* Events Display */}
      {viewMode === "list" ? (
        <div className="bg-white dark:bg-neutral-900 shadow rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
            {currentEvents.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
        <thead className="bg-gray-50 dark:bg-neutral-800">
                  <tr>
          <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Event
                    </th>
          <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
          <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Location
                    </th>
          <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
          <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
          <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Organizer
                    </th>
          <th scope="col" className="px-6 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-800">
                  {currentEvents.map((event) => (
          <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer" onClick={() => setSelectedEvent(event)}>
            <td className="px-6 py-2 whitespace-nowrap">
                        <div className="flex items-center">
              {/* Compact size adjustment (40px -> 32px) */}
              <div className="flex-shrink-0 h-8 w-8 bg-gray-200 dark:bg-neutral-600 rounded-md overflow-hidden">
                            {event.imageUrl ? (
                              <Image
                                src={event.imageUrl}
                                alt={event.title}
                width={32}
                height={32}
                className="h-8 w-8 object-cover"
                                onError={(e:any) => { e.currentTarget.src = '/events/default-event.webp'; }}
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full w-full">
                                <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                              </div>
                            )}
                          </div>
              <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center">
                              {event.title}
                              {event.isFeatured && (
                                <Star className="h-3.5 w-3.5 text-amber-500 ml-1.5" />
                              )}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                              {event.category && (
                                <CategoryBadge category={event.category} />
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatEventDate(event.startDate || event.date)}
                      </td>
            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {event.locationType === 'physical' ? (event.location || 'Physical Location') : 
                         event.locationType === 'hybrid' ? 'Hybrid Event' : 
                         'Online Event'}
                      </td>
            <td className="px-6 py-2 whitespace-nowrap">
                        <StatusBadge status={event.status} />
                      </td>
            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatPrice(event.price)}
                      </td>
            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {event.organizer?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-2 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white"
                            aria-label="View event details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>View</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6">
                <EmptyState onClearFilters={clearFilters} hasFilters={hasFilters} />
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {filteredEvents.length > 0 && (
            <div className="bg-white dark:bg-neutral-900 px-4 py-3 border-t border-gray-200 dark:border-neutral-800 sm:px-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{indexOfFirstEvent + 1}</span> to{" "}
                  <span className="font-medium">{Math.min(indexOfLastEvent, filteredEvents.length)}</span> of{" "}
                  <span className="font-medium">{filteredEvents.length}</span> events
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        currentPage === 1
                          ? 'bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer'
                      }`}
                    >
                      Previous
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // Show first page, last page, current page, and pages around current
                          return page === 1 || 
                                 page === totalPages || 
                                 (page >= currentPage - 1 && page <= currentPage + 1);
                        })
                        .map((page, index, array) => (
                          <div key={page} className="flex items-center">
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-2 text-gray-400 dark:text-gray-600">...</span>
                            )}
                            <button
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                                currentPage === page
                                  ? 'bg-primary text-white'
                                  : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700'
                              }`}
                            >
                              {page}
                            </button>
                          </div>
                        ))}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        currentPage === totalPages
                          ? 'bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Grid View */
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {currentEvents.length > 0 ? (
            currentEvents.map((event) => (
              <div 
                key={event.id} 
                className="bg-white dark:bg-neutral-900 rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-neutral-800 flex flex-col cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setSelectedEvent(event)}
              >
                <div className="relative h-40">
                  {event.imageUrl ? (
                    <Image
                      src={event.imageUrl}
                      alt={event.title}
                      fill
                      className="object-cover"
                      onError={(e:any) => { e.currentTarget.src = '/events/default-event.webp'; }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-neutral-600 flex items-center justify-center">
                      <Calendar className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                  {event.isFeatured && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center">
                        <Star className="h-3 w-3 mr-1" />
                        Featured
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-grow">
                  <h3 className="font-semibold mb-1 text-lg line-clamp-2 text-gray-900 dark:text-gray-100">{event.title}</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span>{formatEventDate(event.startDate || event.date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <span className="truncate">
                        {event.locationType === 'physical' ? (event.location || 'Physical Location') : 
                         event.locationType === 'hybrid' ? 'Hybrid Event' : 
                         'Online Event'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <StatusBadge status={event.status} />
                    {event.category && (
                      <CategoryBadge category={event.category} />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatPrice(event.price)}
                    </span>
                    {event.attendeeCount && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {event.attendeeCount} attending
                      </span>
                    )}
                  </div>
                </div>
                <div className="border-t border-gray-100 dark:border-neutral-800 p-3 flex justify-between items-center bg-gray-50 dark:bg-neutral-900">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {event.organizer?.name || 'Unknown organizer'}
                  </span>
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                      className="bg-black dark:bg-black text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-nuetral-800 dark:hover:bg-nuetral-800 cursor-pointer flex items-center"
                    >
                      <Eye className="h-3 w-3.5 mr-1" />
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full">
              <EmptyState onClearFilters={clearFilters} hasFilters={hasFilters} />
            </div>
          )}
          
          {/* Pagination for Grid View */}
          {filteredEvents.length > eventsPerPage && (
            <div className="col-span-full bg-white dark:bg-neutral-900 px-4 py-3 rounded-lg border border-gray-200 dark:border-neutral-800">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{indexOfFirstEvent + 1}</span> to{" "}
                  <span className="font-medium">{Math.min(indexOfLastEvent, filteredEvents.length)}</span> of{" "}
                  <span className="font-medium">{filteredEvents.length}</span> events
                </div>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        currentPage === 1
                          ? 'bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer'
                      }`}
                    >
                      Previous
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          return page === 1 || 
                                 page === totalPages || 
                                 (page >= currentPage - 1 && page <= currentPage + 1);
                        })
                        .map((page, index, array) => (
                          <div key={page} className="flex items-center">
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-2 text-gray-400 dark:text-gray-600">...</span>
                            )}
                            <button
                              onClick={() => handlePageChange(page)}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                                currentPage === page
                                  ? 'bg-primary text-white'
                                  : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700'
                              }`}
                            >
                              {page}
                            </button>
                          </div>
                        ))}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        currentPage === totalPages
                          ? 'bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onFeatureEvent={handleFeatureEvent}
          onPublishEvent={handlePublishEvent}
          onCancelEvent={handleCancelEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <ConfirmationModal
          title="Delete Event"
          message="Are you sure you want to delete this event? This action cannot be undone and all event data will be permanently removed."
          confirmLabel="Delete"
          confirmButtonClass="bg-red-600 text-white hover:bg-red-700"
          onConfirm={() => handleDeleteEvent(showDeleteConfirmation)}
          onCancel={() => setShowDeleteConfirmation(null)}
        />
      )}
      
      {/* Cancel Confirmation Modal */}
      {showCancelConfirmation && (
        <ConfirmationModal
          title="Cancel Event"
          message="Are you sure you want to cancel this event? This will notify all attendees and the event will be marked as cancelled."
          confirmLabel="Cancel Event"
          confirmButtonClass="bg-orange-600 text-white hover:bg-orange-700"
          onConfirm={() => {
            handleCancelEvent(showCancelConfirmation);
            setShowCancelConfirmation(null);
          }}
          onCancel={() => setShowCancelConfirmation(null)}
        />
      )}
    </div>
  );
}