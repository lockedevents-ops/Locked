"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Search, 
  Filter,
  ChevronDown, 
  Building2,
  Users, 
  Star,
  MapPin,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCcw,
  Grid3X3,
  List as ListIcon,
  MoreHorizontal,
  PlusCircle,
  X,
  Eye
} from 'lucide-react';
import { RefreshButton } from '@/components/admin/RefreshButton';
import { format, parseISO, isValid } from 'date-fns';
import { useToast } from '@/hooks/useToast';
import { createClient } from '@/lib/supabase/client/client';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminVenuesDetailed, AdminVenue } from '@/hooks/adminQueries';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import { isVenuesEnabled } from '@/lib/network';
import { PageLoader } from '@/components/loaders/PageLoader';

// Local interface removed; using AdminVenue from hooks

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
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Handle click outside to cancel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancel]);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in duration-200"
      >
        <h3 className="text-lg font-bold mb-2 dark:text-gray-100">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg cursor-pointer ${confirmButtonClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// Venue Detail Modal Component
const VenueDetailModal = ({
  venue,
  onClose,
  onFeatureVenue,
  onActivateVenue,
  onDeactivateVenue,
  onDeleteVenue,
}: {
  venue: AdminVenue;
  onClose: () => void;
  onFeatureVenue: (venueId: string, feature: boolean) => void;
  onActivateVenue: (venueId: string, activate: boolean) => void;
  onDeactivateVenue: (venueId: string) => void;
  onDeleteVenue: (venueId: string) => void;
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'analytics' | 'gallery'>('details');
  const [showDeactivateConfirmation, setShowDeactivateConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showFeatureConfirmation, setShowFeatureConfirmation] = useState(false);
  const [showUnfeatureConfirmation, setShowUnfeatureConfirmation] = useState(false);
  const [showActivateConfirmation, setShowActivateConfirmation] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Format dates for better readability
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return dateString; // Fallback to the original string
      
      return format(date, 'PPP'); // e.g., April 29, 2023
    } catch (error) {
      return dateString;
    }
  };
  const formatCurrency = (value?: number) => {
    if (value === undefined) return 'N/A';
    return `₵${value.toLocaleString()}`;
  };

  // Determine venue status for display
  const getStatusInfo = () => {
    if (venue.status === 'active') {
      return {
        label: 'Active',
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="h-4 w-4 mr-1" />
      };
    } else if (venue.status === 'draft') {
      return {
        label: 'Draft',
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock className="h-4 w-4 mr-1" />
      };
    } else if (venue.status === 'inactive') {
      return {
        label: 'Inactive',
        color: 'bg-red-100 text-red-800',
        icon: <XCircle className="h-4 w-4 mr-1" />
      };
    }
    
    return {
      label: (venue.status && typeof venue.status === 'string') 
        ? (venue.status as string).charAt(0).toUpperCase() + (venue.status as string).slice(1) 
        : 'Unknown',
      color: 'bg-gray-100 text-gray-800',
      icon: <AlertCircle className="h-4 w-4 mr-1" />
    };
  };
  
  const statusInfo = getStatusInfo();
  
  // Check if venue can be activated/deactivated
  const canToggleActiveStatus = venue.status !== 'draft';
  
  // Determine venue stats for analytics
  const statsData = {
    bookingsCount: venue.bookingsCount || 0,
    avgRating: venue.avgRating || 0,
    viewCount: Math.floor(Math.random() * 1000) + 100, // Simulated view count
    inquiryCount: Math.floor(Math.random() * 50) + 5,  // Simulated inquiry count
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4" onClick={onClose}>
      <div 
        ref={modalRef}
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with venue image */}
        <div className="relative h-48 bg-gray-200">
          {venue.imageUrl || venue.featuredImage || venue.featuredImagePreview ? (
            <Image 
              src={(venue.imageUrl || venue.featuredImage || venue.featuredImagePreview || "/images/placeholder-black.png").startsWith("/") || (venue.imageUrl || venue.featuredImage || venue.featuredImagePreview || "/images/placeholder-black.png").startsWith("http") ? 
                  (venue.imageUrl || venue.featuredImage || venue.featuredImagePreview || "/images/placeholder-black.png") : 
                  `/${venue.imageUrl || venue.featuredImage || venue.featuredImagePreview || "images/placeholder-black.png"}`} 
              alt={venue.name} 
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-200">
              <Building2 className="h-16 w-16 text-gray-400" />
            </div>
          )}
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
          
          {/* Featured badge */}
          {venue.isFeatured && (
            <div className="absolute top-4 left-4 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-sm">
              Featured
            </div>
          )}
        </div>
        
        {/* Venue title section */}
        <div className="border-b border-gray-200 dark:border-neutral-800 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold mb-2 dark:text-gray-100">{venue.name}</h2>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="h-4 w-4 mr-1" />
                <span>{venue.location || 'Location not specified'}</span>
              </div>
            </div>
            
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
              {statusInfo.icon}
              {statusInfo.label}
            </span>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-neutral-800">
          <div className="px-6 flex space-x-6">
            <button 
              onClick={() => setActiveTab('details')}
              className={`py-3 px-1 cursor-pointer transition-colors ${activeTab === 'details' ? 
                'text-primary border-b-2 border-primary font-medium' : 
                'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Details
            </button>
            
            <button 
              onClick={() => setActiveTab('gallery')}
              className={`py-3 px-1 cursor-pointer transition-colors ${activeTab === 'gallery' ? 
                'text-primary border-b-2 border-primary font-medium' : 
                'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Gallery
            </button>
            
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`py-3 px-1 cursor-pointer transition-colors ${activeTab === 'analytics' ? 
                'text-primary border-b-2 border-primary font-medium' : 
                'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              Analytics
            </button>
          </div>
        </div>
        
        {/* Content based on active tab */}
        <div className="overflow-y-auto max-h-[calc(90vh-24rem)]">
          {activeTab === 'details' ? (
            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <h3 className="font-semibold mb-2 dark:text-gray-100">Description</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm whitespace-pre-line">{venue.description || 'No description available.'}</p>
              </div>
              
              {/* Details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Venue Type */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Venue Type</h4>
                  <p className="font-medium dark:text-gray-100">{venue.venueType || 'Not specified'}</p>
                </div>
                
                {/* Capacity */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Capacity</h4>
                  <p className="font-medium dark:text-gray-100">{venue.capacity || 'Not specified'}</p>
                </div>
                
                {/* Price */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Base Price</h4>
                  <p className="font-medium dark:text-gray-100">{formatCurrency(venue.pricing?.basePrice)}</p>
                </div>
                
                {/* Pricing Model */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Pricing Model</h4>
                  <p className="font-medium capitalize dark:text-gray-100">{venue.pricing?.pricingModel || 'Not specified'}</p>
                </div>
                
                {/* Address */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Address</h4>
                  <p className="font-medium dark:text-gray-100">{venue.address || venue.location || 'Not specified'}</p>
                </div>
                
                {/* Owner */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Owner</h4>
                  <p className="font-medium dark:text-gray-100">{venue.owner?.name || 'Not specified'}</p>
                </div>
              </div>
              
              {/* Amenities */}
              {venue.amenities && venue.amenities.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 dark:text-gray-100">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {venue.amenities.map((amenity, index) => (
                      <span key={index} className="bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Rules */}
              {venue.rules && venue.rules.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 dark:text-gray-100">Rules</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    {venue.rules.map((rule, index) => (
                      <li key={index}>{rule}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : activeTab === 'gallery' ? (
            <div className="p-6">
              <h3 className="font-semibold mb-4 dark:text-gray-100">Gallery Images</h3>
              {venue.galleryImages && venue.galleryImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {venue.galleryImages.map((image, index) => (
                    <div key={index} className="relative aspect-square bg-gray-100 dark:bg-neutral-800 rounded-lg overflow-hidden">
                      <Image
                        src={image.startsWith("/") || image.startsWith("http") ? image : `/pages/venues/${image}`}
                        alt={`${venue.name} - Image ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 33vw"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 dark:bg-neutral-800 rounded-lg border border-dashed border-gray-200 dark:border-neutral-800">
                  <p className="text-gray-500 dark:text-gray-400">No gallery images available</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
              <h3 className="font-semibold mb-4 dark:text-gray-100">Performance Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Bookings</div>
                  <div className="font-bold text-xl mt-1 dark:text-gray-100">{statsData.bookingsCount}</div>
                </div>
                
                <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Avg. Rating</div>
                  <div className="font-bold text-xl mt-1 flex items-center dark:text-gray-100">
                    {statsData.avgRating.toFixed(1)}
                    <Star className="h-4 w-4 text-yellow-400 ml-1" fill="currentColor" />
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Page Views</div>
                  <div className="font-bold text-xl mt-1 dark:text-gray-100">{statsData.viewCount}</div>
                </div>
                
                <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Inquiries</div>
                  <div className="font-bold text-xl mt-1 dark:text-gray-100">{statsData.inquiryCount}</div>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="font-semibold mb-2 dark:text-gray-100">Booking Conversion Rate</h4>
                <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded-lg">
                  <div className="w-full bg-gray-200 dark:bg-neutral-600 rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${Math.min(statsData.bookingsCount / Math.max(statsData.viewCount, 1) * 100 * 5, 100)}%` }}></div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>0%</span>
                    <span>Conversion: {((statsData.bookingsCount / Math.max(statsData.viewCount, 1)) * 100).toFixed(1)}%</span>
                    <span>20%+</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Actions Footer */}
        <div className="bg-gray-50 dark:bg-neutral-800 px-6 py-4 border-t border-gray-200 dark:border-neutral-800">
          <div className="flex flex-wrap justify-between gap-3">
            <div className="flex items-center">
              <button
                onClick={() => venue.isFeatured ? setShowUnfeatureConfirmation(true) : setShowFeatureConfirmation(true)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  venue.isFeatured 
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Star className={`h-4 w-4 ${venue.isFeatured ? 'fill-amber-500' : ''}`} />
                {venue.isFeatured ? 'Unfeature Venue' : 'Feature Venue'}
              </button>
            </div>
            
            <div className="flex gap-3">
              {canToggleActiveStatus && venue.status !== 'inactive' && (
                <button
                  onClick={() => setShowDeactivateConfirmation(true)}
                  className="flex items-center gap-1 px-3 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg cursor-pointer transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  Deactivate Venue
                </button>
              )}
              
              {canToggleActiveStatus && venue.status === 'inactive' && (
                <button
                  onClick={() => setShowActivateConfirmation(true)}
                  className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg cursor-pointer transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  Activate Venue
                </button>
              )}
              
              <button
                onClick={() => setShowDeleteConfirmation(true)}
                className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg cursor-pointer transition-colors"
              >
                <AlertCircle className="h-4 w-4" />
                Delete Venue
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Deactivate Confirmation Modal */}
      {showDeactivateConfirmation && (
        <ConfirmationModal
          title="Deactivate Venue"
          message="Are you sure you want to deactivate this venue? It will no longer be visible to users or available for bookings."
          confirmLabel="Deactivate Venue"
          confirmButtonClass="bg-orange-600 text-white hover:bg-orange-700"
          onConfirm={() => {
            onDeactivateVenue(venue.id);
            setShowDeactivateConfirmation(false);
          }}
          onCancel={() => setShowDeactivateConfirmation(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <ConfirmationModal
          title="Delete Venue"
          message="Are you sure you want to delete this venue? This action cannot be undone and all venue data will be permanently removed."
          confirmLabel="Delete"
          confirmButtonClass="bg-red-600 text-white hover:bg-red-700"
          onConfirm={() => {
            onDeleteVenue(venue.id);
            setShowDeleteConfirmation(false);
          }}
          onCancel={() => setShowDeleteConfirmation(false)}
        />
      )}

      {/* Feature Confirmation Modal */}
      {showFeatureConfirmation && (
        <ConfirmationModal
          title="Feature Venue"
          message="Are you sure you want to feature this venue? It will be shown in featured sections of the app."
          confirmLabel="Feature"
          confirmButtonClass="bg-amber-600 text-white hover:bg-amber-700"
          onConfirm={() => {
            onFeatureVenue(venue.id, true);
            setShowFeatureConfirmation(false);
          }}
          onCancel={() => setShowFeatureConfirmation(false)}
        />
      )}

      {/* Unfeature Confirmation Modal */}
      {showUnfeatureConfirmation && (
        <ConfirmationModal
          title="Unfeature Venue"
          message="Are you sure you want to remove this venue from featured? It will no longer be shown in featured sections."
          confirmLabel="Unfeature"
          confirmButtonClass="bg-amber-600 text-white hover:bg-amber-700"
          onConfirm={() => {
            onFeatureVenue(venue.id, false);
            setShowUnfeatureConfirmation(false);
          }}
          onCancel={() => setShowUnfeatureConfirmation(false)}
        />
      )}

      {/* Activate Confirmation Modal */}
      {showActivateConfirmation && (
        <ConfirmationModal
          title="Activate Venue"
          message="Are you sure you want to activate this venue? It will be visible to users."
          confirmLabel="Activate"
          confirmButtonClass="bg-green-600 text-white hover:bg-green-700"
          onConfirm={() => {
            onActivateVenue(venue.id, true);
            setShowActivateConfirmation(false);
          }}
          onCancel={() => setShowActivateConfirmation(false)}
        />
      )}
    </div>
  );
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  let color, icon, label;
  
  switch(status) {
    case 'active':
      color = 'bg-green-100 text-green-800';
      icon = <CheckCircle className="w-3 h-3 mr-1" />;
      label = 'Active';
      break;
    case 'draft':
      color = 'bg-yellow-100 text-yellow-800';
      icon = <Clock className="w-3 h-3 mr-1" />;
      label = 'Draft';
      break;
    case 'inactive':
      color = 'bg-red-100 text-red-800';
      icon = <XCircle className="w-3 h-3 mr-1" />;
      label = 'Inactive';
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

// Type badge component
const TypeBadge = ({ venueType }: { venueType: string }) => {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      {venueType}
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
      <Building2 className="w-8 h-8 text-gray-400 dark:text-gray-500" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No venues found</h3>
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
        No venues have been added yet.
      </p>
    )}
  </div>
);

export default function VenuesPage() {
  // ✅ SESSION MANAGEMENT: Prevent session expiration on venues page
  useSessionManagement();
  const venuesEnabled = isVenuesEnabled();
  
  const { data: venues = [], isLoading, refetch, isFetching } = useAdminVenuesDetailed({ staleTime: 600000 });
  // Derived filtering now handled via useMemo instead of state/effect (was causing runtime ReferenceError)
  // Removed setFilteredVenues – compute on demand for simpler logic & no stale state.
  // NOTE: If future pagination or server-side filtering added, replace with query params to React Query.
  // (Original bug: ReferenceError: setFilteredVenues not defined – likely due to stale compiled chunk after manual edits.)
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [capacityFilter, setCapacityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVenue, setSelectedVenue] = useState<AdminVenue | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      // Check if on mobile screen first
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        return "grid"; // Always use grid on mobile
      }
      return (localStorage.getItem("adminVenuesViewMode") as "grid" | "list") || "list";
    }
    return "list";
  });
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<string | null>(null);
  const [showDeactivateConfirmation, setShowDeactivateConfirmation] = useState<string | null>(null);
  const [showFeatureConfirmation, setShowFeatureConfirmation] = useState<string | null>(null);
  const [showUnfeatureConfirmation, setShowUnfeatureConfirmation] = useState<string | null>(null);
  const [showActivateConfirmation, setShowActivateConfirmation] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();
  
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
      localStorage.setItem("adminVenuesViewMode", viewMode);
    }
  }, [viewMode]);
  
  // Sync filters from URL params (run when params change)
  useEffect(() => {
    const sp = searchParams.toString();
    const typeParam = searchParams.get('type');
    const statusParam = searchParams.get('status');
    const capacityParam = searchParams.get('capacity');
    const searchParam = searchParams.get('search');
    if (typeParam) setTypeFilter(typeParam); else setTypeFilter(prev => prev);
    if (statusParam && ['active','inactive','draft','all'].includes(statusParam)) setStatusFilter(statusParam);
    if (capacityParam) setCapacityFilter(capacityParam);
    if (searchParam) setSearchTerm(searchParam);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  
  // Derived filtered list (replaces previous state + effect)
  const filteredVenues = useMemo(() => {
    let result = [...venues];
    if (typeFilter !== 'all') {
      result = result.filter(v => v.venueType?.toLowerCase() === typeFilter.toLowerCase());
    }
    if (statusFilter !== 'all') {
      result = result.filter(v => v.status === statusFilter);
    }
    if (capacityFilter !== 'all') {
      switch (capacityFilter) {
        case 'small':
          result = result.filter(v => (v.capacity || 0) < 100);
          break;
        case 'medium':
          result = result.filter(v => (v.capacity || 0) >= 100 && (v.capacity || 0) < 300);
          break;
        case 'large':
          result = result.filter(v => (v.capacity || 0) >= 300);
          break;
      }
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(v =>
        v.name.toLowerCase().includes(lower) ||
        v.description?.toLowerCase().includes(lower) ||
        v.location?.toLowerCase().includes(lower) ||
        v.owner?.name?.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [venues, typeFilter, statusFilter, capacityFilter, searchTerm]);
  
  const adminToast = useToast();

  // Toggle featured status
  const handleFeatureVenue = async (venueId: string, feature: boolean) => {
    if (!venuesEnabled) {
      adminToast.showInfo('Temporarily Unavailable', 'Venue management is currently disabled.');
      return;
    }

    try {
      const supabase = createClient();
      // optimistic update
      queryClient.setQueryData<AdminVenue[]>(['admin','venues','detailed'], old => (old||[]).map(v => v.id === venueId ? { ...v, isFeatured: feature } : v));
      setSelectedVenue(prev => prev && prev.id === venueId ? { ...prev, isFeatured: feature } : prev);
      const { error } = await supabase.from('venues').update({ is_featured: feature, updated_at: new Date().toISOString() }).eq('id', venueId);
      if (error) throw error;
  adminToast.showSuccess(feature ? 'Venue featured successfully' : 'Venue unfeatured successfully');
    } catch (error) {
      console.error('Error updating venue feature status', error);
  adminToast.showError('Failed to update feature status');
      queryClient.invalidateQueries({ queryKey: ['admin','venues','detailed'] });
    }
  };
  
  // Toggle active status
  const handleActivateVenue = async (venueId: string, activate: boolean) => {
    if (!venuesEnabled) {
      adminToast.showInfo('Temporarily Unavailable', 'Venue management is currently disabled.');
      return;
    }

    try {
      const supabase = createClient();
      const newStatus = activate ? 'active' : 'inactive';
      queryClient.setQueryData<AdminVenue[]>(['admin','venues','detailed'], old => (old||[]).map(v => v.id === venueId ? { ...v, status: newStatus } : v));
      setSelectedVenue(prev => prev && prev.id === venueId ? { ...prev, status: newStatus } : prev);
      const { error } = await supabase.from('venues').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', venueId);
      if (error) throw error;
  adminToast.showSuccess(activate ? 'Venue activated successfully' : 'Venue deactivated successfully');
    } catch (error) {
      console.error('Error updating venue status', error);
  adminToast.showError('Failed to update venue');
      queryClient.invalidateQueries({ queryKey: ['admin','venues','detailed'] });
    }
  };
  
  // Deactivate venue
  const handleDeactivateVenue = async (venueId: string) => {
    if (!venuesEnabled) {
      adminToast.showInfo('Temporarily Unavailable', 'Venue management is currently disabled.');
      return;
    }

    await handleActivateVenue(venueId, false);
    setSelectedVenue(null);
  };
  
  // Delete venue
  const handleDeleteVenue = async (venueId: string) => {
    if (!venuesEnabled) {
      adminToast.showInfo('Temporarily Unavailable', 'Venue management is currently disabled.');
      return;
    }

    try {
      const supabase = createClient();
      queryClient.setQueryData<AdminVenue[]>(['admin','venues','detailed'], old => (old||[]).filter(v => v.id !== venueId));
      setSelectedVenue(null);
      const { error } = await supabase.from('venues').delete().eq('id', venueId);
      if (error) throw error;
  adminToast.showSuccess('Venue deleted successfully');
      setShowDeleteConfirmation(null);
    } catch (error) {
      console.error('Error deleting venue', error);
  adminToast.showError('Failed to delete venue');
      queryClient.invalidateQueries({ queryKey: ['admin','venues','detailed'] });
    }
  };
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Update URL with search params for shareable links
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (capacityFilter !== 'all') params.set('capacity', capacityFilter);
    
    const url = `/admin/venues${params.toString() ? `?${params.toString()}` : ''}`;
    router.replace(url);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setTypeFilter('all');
    setStatusFilter('all');
    setCapacityFilter('all');
    setSearchTerm('');
    router.replace('/admin/venues');
  };
  
  // Toggle dropdown
  const toggleDropdown = (venueId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (dropdownOpen === venueId) {
      setDropdownOpen(null);
    } else {
      setDropdownOpen(venueId);
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
  const activeCount = useMemo(() => venues.filter(v => v.status === 'active').length, [venues]);
  const draftCount = useMemo(() => venues.filter(v => v.status === 'draft').length, [venues]);
  const inactiveCount = useMemo(() => venues.filter(v => v.status === 'inactive').length, [venues]);
  const featuredCount = useMemo(() => venues.filter(v => v.isFeatured).length, [venues]);
  
  // Get unique venue types for filter
  const uniqueTypes = Array.from(
    new Set(venues.filter(v => v.venueType).map(v => v.venueType))
  );
  
  // Check if any filters are applied
  const hasFilters = typeFilter !== 'all' || statusFilter !== 'all' || capacityFilter !== 'all' || searchTerm !== '';
  
  // Format currency helper function
  const formatCurrency = (value?: number) => {
    if (value === undefined) return 'N/A';
    return `₵${value.toLocaleString()}`;
  };
  
  // Loading state
  if (isLoading || isFetching) {
    return <PageLoader message="Loading venues..." fullHeight />;
  }

  return (
    <div className="space-y-6">
      {!venuesEnabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Venue management is temporarily disabled while the platform is focused on event-only workflows.
        </div>
      )}

      {/* Page header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-gray-100 flex items-center gap-2">
          <span>Venues Management</span>
          <span
            className="inline-flex items-center rounded-full bg-gray-200/80 dark:bg-neutral-800/80 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:text-gray-200 ring-1 ring-inset ring-white/60 dark:ring-black/40 shadow-sm"
            aria-label={`Total venues: ${venues.length}`}
          >
            {venues.length}
          </span>
        </h1>
        <div className="flex gap-2">
          {venuesEnabled && (
            <Link
              href="/admin/venues/add-venue"
              className="flex items-center gap-1 bg-black dark:bg-black text-white px-3 py-2 rounded-md hover:bg-gray-800 dark:hover:bg-gray-800 cursor-pointer transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Venue</span>
            </Link>
          )}
          <RefreshButton 
            queryKeys={[['admin', 'venues', 'detailed']]}
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
            {/* Venue type filter */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="block w-full appearance-none bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-800 rounded-lg py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-primary focus:border-primary cursor-pointer dark:text-gray-100"
              >
                <option value="all">All Types</option>
                {uniqueTypes.map((type, index) => (
                  <option key={index} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
            
            {/* Status filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full appearance-none bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-800 rounded-lg py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-primary focus:border-primary cursor-pointer dark:text-gray-100"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
            
            {/* Capacity filter */}
            <div className="relative">
              <select
                value={capacityFilter}
                onChange={(e) => setCapacityFilter(e.target.value)}
                className="block w-full appearance-none bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-800 rounded-lg py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-primary focus:border-primary cursor-pointer dark:text-gray-100"
              >
                <option value="all">All Capacities</option>
                <option value="small">Small (&lt; 100)</option>
                <option value="medium">Medium (100-300)</option>
                <option value="large">Large (300+)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
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
                placeholder="Search by name, location, or owner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            {hasFilters && (
                          <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer"
            >
              Clear
            </button>
            )}
            <button
              type="submit"
              className="px-3 py-2 bg-black dark:bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-black focus:ring-offset-2 cursor-pointer"
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
            <div className="p-3 bg-primary/10 rounded-full">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Venues</div>
              <div className="text-xl font-bold mt-0.5 dark:text-gray-100">{venues.length}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Active</div>
              <div className="text-xl font-bold mt-0.5 dark:text-gray-100">{activeCount}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Draft</div>
              <div className="text-xl font-bold mt-0.5 dark:text-gray-100">{draftCount}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <Star className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Featured</div>
              <div className="text-xl font-bold mt-0.5 dark:text-gray-100">{featuredCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle - Hidden on Mobile */}
      <div className="hidden md:flex justify-end">
        <div className="inline-flex bg-gray-100 dark:bg-neutral-800 rounded-md p-1">
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded ${
              viewMode === "list" ? "bg-white dark:bg-neutral-600 shadow-sm text-gray-800 dark:text-gray-200" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            } cursor-pointer`}
            title="List View"
          >
            <ListIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded ${
              viewMode === "grid" ? "bg-white dark:bg-neutral-600 shadow-sm text-gray-800 dark:text-gray-200" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            } cursor-pointer`}
            title="Grid View"
          >
            <Grid3X3 className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Section heading */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Venue Listings</h2>
      </div>
      
      {/* Venues Display */}
      {viewMode === "list" ? (
        <div className="bg-white dark:bg-neutral-900 shadow rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden">
          <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
            {filteredVenues.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
        <thead className="bg-gray-50 dark:bg-neutral-700">
                  <tr>
          <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Venue
                    </th>
          <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
          <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Capacity
                    </th>
          <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
          <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
          <th scope="col" className="px-6 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-700">
                  {filteredVenues.map((venue) => (
          <tr key={venue.id} className="hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer" onClick={() => setSelectedVenue(venue)}>
            <td className="px-6 py-2 whitespace-nowrap">
                        <div className="flex items-center">
              <div className="flex-shrink-0 h-8 w-8 bg-gray-200 dark:bg-neutral-600 rounded-md overflow-hidden">
                            {venue.imageUrl || venue.featuredImage || venue.featuredImagePreview ? (
                              <Image
                                src={(venue.imageUrl || venue.featuredImage || venue.featuredImagePreview || "/images/placeholder-black.png").startsWith("/") || (venue.imageUrl || venue.featuredImage || venue.featuredImagePreview || "/images/placeholder-black.png").startsWith("http") ? 
                                  (venue.imageUrl || venue.featuredImage || venue.featuredImagePreview || "/images/placeholder-black.png") : 
                                  `/${venue.imageUrl || venue.featuredImage || venue.featuredImagePreview || "images/placeholder-black.png"}`}
                alt={venue.name}
                width={32}
                height={32}
                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                              </div>
                            )}
                          </div>
              <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{venue.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                              <MapPin className="h-3.5 w-3.5 mr-1" />
                              {venue.location || "No location specified"}
                            </div>
                          </div>
                        </div>
                      </td>
            <td className="px-6 py-2 whitespace-nowrap">
                        {venue.venueType ? (
                          <TypeBadge venueType={venue.venueType} />
                        ) : (
                          <span className="text-sm text-gray-500">Not specified</span>
                        )}
                      </td>
            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1 text-gray-400" />
                          <span>{venue.capacity || 'N/A'}</span>
                        </div>
                      </td>
            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                        {venue.pricing && venue.pricing.basePrice ? (
                          <span className="font-medium">₵{venue.pricing.basePrice.toLocaleString()}</span>
                        ) : (
                          <span>Not set</span>
                        )}
                      </td>
            <td className="px-6 py-2 whitespace-nowrap">
                        <StatusBadge status={venue.status} />
                      </td>
            <td className="px-6 py-2 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVenue(venue);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white cursor-pointer"
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
          
          {/* Pagination placeholder */}
          {filteredVenues.length > 0 && (
            <div className="bg-white dark:bg-neutral-900 px-4 py-3 border-t border-gray-200 dark:border-neutral-800 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{filteredVenues.length}</span> of{" "}
                  <span className="font-medium">{venues.length}</span> venues
                </div>
                
                {filteredVenues.length < venues.length && hasFilters && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Use filters to narrow your results
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Grid View */
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {filteredVenues.length > 0 ? (
            filteredVenues.map((venue) => (
              <div 
                key={venue.id} 
                className="bg-white dark:bg-neutral-900 rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-neutral-800 flex flex-col cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setSelectedVenue(venue)}
              >
                <div className="relative h-40">
                  {venue.imageUrl || venue.featuredImage || venue.featuredImagePreview ? (
                    <Image
                      src={(venue.imageUrl || venue.featuredImage || venue.featuredImagePreview || "/images/placeholder-black.png").startsWith("/") || (venue.imageUrl || venue.featuredImage || venue.featuredImagePreview || "/images/placeholder-black.png").startsWith("http") ? 
                          (venue.imageUrl || venue.featuredImage || venue.featuredImagePreview || "/images/placeholder-black.png") : 
                          `/${venue.imageUrl || venue.featuredImage || venue.featuredImagePreview || "images/placeholder-black.png"}`}
                      alt={venue.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-200 dark:bg-neutral-700">
                      <Building2 className="h-16 w-16 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}
                  
                  {/* Featured badge */}
                  {venue.isFeatured && (
                    <div className="absolute top-3 left-3 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-sm">
                      Featured
                    </div>
                  )}
                </div>
                
                <div className="p-4 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{venue.name}</h3>
                  
                  <div className="mt-2 flex flex-wrap gap-2">
                    {/* Venue type badge */}
                    {venue.venueType && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {venue.venueType}
                      </span>
                    )}
                    
                    {/* Status badge */}
                    <StatusBadge status={venue.status} />
                  </div>
                  
                  <div className="mt-4 flex flex-col gap-1">
                    {/* Location */}
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{venue.location || 'Location not specified'}</span>
                    </div>
                    
                    {/* Capacity and pricing */}
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Users className="h-4 w-4 mr-1" />
                      <span>{venue.capacity || 'N/A'} {venue.capacity && venue.pricing?.basePrice ? '|' : ''} </span>
                      
                      {venue.capacity && venue.pricing?.basePrice && (
                        <span className="whitespace-nowrap">
                          {formatCurrency(venue.pricing.basePrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Actions footer */}
                <div className="bg-gray-50 dark:bg-neutral-800 px-4 py-3 border-t border-gray-200 dark:border-neutral-800">
                  <div className="flex items-center w-full">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVenue(venue);
                      }}
                      className="bg-black dark:bg-black text-white rounded-md px-3 py-2 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-800 transition-colors flex items-center justify-center w-full cursor-pointer"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <EmptyState onClearFilters={clearFilters} hasFilters={hasFilters} />
            </div>
          )}
        </div>
      )}

      {/* Confirmation dialogs */}
      {showDeleteConfirmation && (
        <ConfirmationModal
          title="Delete Venue"
          message="Are you sure you want to delete this venue? This action cannot be undone."
          confirmLabel="Delete"
          confirmButtonClass="bg-red-600 text-white hover:bg-red-700"
          onConfirm={() => handleDeleteVenue(showDeleteConfirmation)}
          onCancel={() => setShowDeleteConfirmation(null)}
        />
      )}
      
      {showDeactivateConfirmation && (
        <ConfirmationModal
          title="Deactivate Venue"
          message="Are you sure you want to deactivate this venue? It will no longer be visible to users."
          confirmLabel="Deactivate"
          confirmButtonClass="bg-orange-600 text-white hover:bg-orange-700"
          onConfirm={() => handleActivateVenue(showDeactivateConfirmation, false)}
          onCancel={() => setShowDeactivateConfirmation(null)}
        />
      )}

      {showFeatureConfirmation && (
        <ConfirmationModal
          title="Feature Venue"
          message="Are you sure you want to feature this venue? It will be shown in featured sections of the app."
          confirmLabel="Feature"
          confirmButtonClass="bg-amber-600 text-white hover:bg-amber-700"
          onConfirm={() => handleFeatureVenue(showFeatureConfirmation, true)}
          onCancel={() => setShowFeatureConfirmation(null)}
        />
      )}
      
      {showUnfeatureConfirmation && (
        <ConfirmationModal
          title="Unfeature Venue"
          message="Are you sure you want to remove this venue from featured? It will no longer be shown in featured sections."
          confirmLabel="Unfeature"
          confirmButtonClass="bg-amber-600 text-white hover:bg-amber-700"
          onConfirm={() => handleFeatureVenue(showUnfeatureConfirmation, false)}
          onCancel={() => setShowUnfeatureConfirmation(null)}
        />
      )}
      
      {showActivateConfirmation && (
        <ConfirmationModal
          title="Activate Venue"
          message="Are you sure you want to activate this venue? It will be visible to users."
          confirmLabel="Activate"
          confirmButtonClass="bg-green-600 text-white hover:bg-green-700"
          onConfirm={() => handleActivateVenue(showActivateConfirmation, true)}
          onCancel={() => setShowActivateConfirmation(null)}
        />
      )}

      {/* Venue Detail Modal */}
      {selectedVenue && (
        <VenueDetailModal
          venue={selectedVenue}
          onClose={() => setSelectedVenue(null)}
          onFeatureVenue={handleFeatureVenue}
          onActivateVenue={handleActivateVenue}
          onDeactivateVenue={(venueId) => handleActivateVenue(venueId, false)}
          onDeleteVenue={handleDeleteVenue}
        />
      )}
    </div>
  );
}