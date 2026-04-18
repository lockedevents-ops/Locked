"use client";

import React, { useState, useEffect } from 'react';
import { BiLockOpen, BiLockAlt } from 'react-icons/bi';
import Image from '@/components/ui/AppImage';
import Link from 'next/link';
import { Voting } from './Voting';
import { 
  X, Copy, Check as CheckIcon, 
  Share2, Calendar, MapPin, Laptop, User, Clock as ClockIcon, ChevronRight, Car,
  ShoppingBag, Plus, Minus, Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GalleryModal } from './GalleryModal';
import { LazyEventMap } from './LazyEventMap';
import { useCartStore } from '@/store/cartStore';
import { toast } from 'sonner';
import { OrganizerCard } from '@/components/organizers/OrganizerCard';
import { useEventLock } from '@/hooks/useEventLock';
import { formatCategoryForDisplay } from '@/utils/eventUtils';
import { useAuth } from '@/contexts/AuthContext';
import { SignInModal } from '@/components/ui/SignInModal';
import { usePathname } from 'next/navigation';
import { addRecentlyViewedEvent } from '@/utils/recentlyViewed';

interface EventDetailsProps {
  event: {
    id: string;
    title: string;
    description: string;
    features: string[];
    category?: string;
    time?: string;
    date?: string; // Add date property
    startDate?: string; // Database start_date field
    endDate?: string; // Database end_date field
    startTime?: string; // Database start_time field
    endTime?: string; // Database end_time field
    isFeatured?: boolean;
    schedule: Array<{
      time: string;
      title: string;
      description: string;
    }>;
    duration: string;
    organizer: {
      id: string;
      name: string;
      image: string;
      role: string;
      rank?: number;
      eventsHosted?: number;
      followersCount?: number;
      totalEventLocks?: number;
      totalScore?: number;
      location?: string;
      bio?: string;
      verified?: boolean;
      verificationStatus?: string;
    };
    address: string;
    location_address?: string; // Database field for location address
    venue?: string; // Database field for venue name
    locationType?: 'physical' | 'online' | 'hybrid'; // Add location type
    coordinates: {
      lat: number;
      lng: number;
    };
    lockCount?: number;
    hasVoting?: boolean;
    voteCost?: number;
    vote_cost?: number;
    votingInfo?: any;
    voting_info?: any;
    contestants?: Array<{
      id: string;
      name: string;
      image: string;
    }>;
    galleryImages?: (string | { url: string })[]; // Allow both string and object with url
    image?: string; // Add image property
    image_url?: string; // Database image_url variant
    hasMerch?: boolean;
    has_merch?: boolean; // Support snake_case from DB
    merchProducts?: Array<{
      id?: string;
      name: string;
      price: number;
      description?: string;
      image?: string;
    }>;
    merch_products?: Array<{ // Support snake_case from DB
      id?: string;
      name: string;
      price: number;
      description?: string;
      image?: string;
    }>;
    ageRestriction?: number;
    isAdult?: boolean;
  };
  ticketCard?: React.ReactNode; // Optional ticket card for mobile display
  showBannerPreview?: boolean;
  setShowBannerPreview?: (show: boolean) => void;
  selectedBannerImageIndex?: number;
  setSelectedBannerImageIndex?: (index: number) => void;
}

// Add interface for similar events
interface SimilarEvent {
  id: string;
  slug?: string;
  title: string;
  date: string;
  location: string;
  category: string;
  imageUrl: string;
}

import { isPastEvent } from '@/services/sharedEventService';

// ... existing imports ...

export function EventDetails({ event, ticketCard, showBannerPreview, setShowBannerPreview, selectedBannerImageIndex, setSelectedBannerImageIndex }: EventDetailsProps) {
  // Helper to parse merch products (may be JSON string or already parsed array)
  const getMerchProducts = () => {
    const merchData = event.merch_products || event.merchProducts;
    if (!merchData) return [];
    
    // If it's already an array, return it
    if (Array.isArray(merchData)) return merchData;
    
    // If it's a string, try to parse it
    if (typeof merchData === 'string') {
      try {
        const parsed = JSON.parse(merchData);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('[EventDetails] Failed to parse merch_products:', e);
        return [];
      }
    }
    
    return [];
  };

  const merchProducts = getMerchProducts();
  const hasMerch = (event.has_merch || event.hasMerch) && merchProducts.length > 0;
  const voteCost = event.voteCost ?? event.vote_cost ?? event.voting_info?.voteCost ?? 1;

  // Cart functionality
  const { items, addToCart, updateQuantity, removeItem } = useCartStore();
  const { isAuthenticated } = useAuth();
  const [showMerchSignIn, setShowMerchSignIn] = useState(false);
  const pathname = usePathname();

  // Determine if event has ended using shared logic
  const isEventEnded = isPastEvent(event);

  // Helper to check if product is in cart
  const getCartItem = (productId: string) => {
    return items.find(item => item.product_id === productId);
  };

  const handleAddToCart = async (product: any) => {
    if (!isAuthenticated) {
      setShowMerchSignIn(true);
      return;
    }

    const result = await addToCart({
      eventId: event.id,
      productId: product.id,
      productName: product.name,
      productPrice: parseFloat(product.price) || 0,
      productImage: product.image,
      productQuantity: product.quantity,
      quantity: 1
    });

    if (result.success) {
      toast.success('Added to cart!');
    } else {
      toast.error(result.error || 'Failed to add to cart');
    }
  };

  // Tab state
  const [activeTab, setActiveTab] = useState<'about' | 'voting' | 'merch'>('about');
  const [showShareModal, setShowShareModal] = useState(false);
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [merchGalleryOpen, setMerchGalleryOpen] = useState(false);
  const [selectedMerchImage, setSelectedMerchImage] = useState<string | null>(null);
  const [isAddToCalendarModalOpen, setIsAddToCalendarModalOpen] = useState(false);
  const [isCopyLinkModalOpen, setIsCopyLinkModalOpen] = useState(false);

  // Create combined images array: banner image + gallery images
  const { getFormattedImagePath } = require('@/utils/imageHelpers');
  const bannerImage = event.image_url || event.image ? getFormattedImagePath(event.image_url || event.image) : null;
  const galleryImages = (event.galleryImages || []).map((img: any) => {
    const imagePath = typeof img === 'string' ? img : img.url;
    return getFormattedImagePath(imagePath);
  });
  const allImages = bannerImage ? [bannerImage, ...galleryImages] : galleryImages;

  const lockMetadata = {
    id: event.id,
    title: event.title,
    date: event.date || new Date().toLocaleDateString(),
    time: event.time || event.startTime || 'TBD',
    startDate: event.startDate, // Add ISO start date
    startTime: event.startTime || event.time, // Add start time
    endDate: event.endDate, // Add ISO end date
    endTime: event.endTime, // Add end time
    location_address: event.location_address || event.venue, // Use correct database field
    venue: event.venue, // Also save venue separately
    imageUrl: event.image || event.organizer.image, // Use event image, fallback to organizer if missing
    image_url: event.image_url || event.image, // Add image_url variant
    price: 'Check event details',
    category: event.category || 'Event',
    description: event.description,
    isFeatured: event.isFeatured,
    hasVoting: event.hasVoting,
  };

  const {
    isLocked,
    handleLock: triggerLock,
    SignInModalComponent,
  } = useEventLock({
    eventId: event.id,
    organizerId: event.organizer.id,
    eventTitle: event.title,
    initialLockCount: event.lockCount ?? 0,
    lockMetadata,
  });

  // ✅ PHASE 2 OPTIMIZATION: Use recentlyViewed utility with TTL
  useEffect(() => {
    const saveToRecentlyViewed = () => {
      try {
        // Use the new TTL-based recently viewed utility
        addRecentlyViewedEvent({
          id: event.id,
          title: event.title || 'Event',
          date: new Date().toLocaleDateString(),
          location: event.address,
          imageUrl: (event as any).image || null,
        });
      } catch (error) {
        console.error("Error saving recently viewed event:", error);
      }
    };
    
    // Defer to browser idle time to avoid blocking render
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleCallback = requestIdleCallback(saveToRecentlyViewed, { timeout: 2000 });
      return () => cancelIdleCallback(idleCallback);
    } else {
      // Fallback for browsers without requestIdleCallback (Safari)
      const timeout = setTimeout(saveToRecentlyViewed, 100);
      return () => clearTimeout(timeout);
    }
  }, [event.id]); 

  // Share handler
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: document.title,
        url: window.location.href,
      });
    } else {
      // Show our custom modal instead of using the clipboard API directly
      setShowShareModal(true);
    }
  };

  const handleLockClick = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerLock();
  };

  const handleMerchImageClick = (imageUrl: string) => {
    setSelectedMerchImage(imageUrl);
    setMerchGalleryOpen(true);
  };

  // Handle add to calendar functionality
  const handleAddToCalendar = () => {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours duration
    
    const eventDetails = {
      title: event.title,
      description: event.description,
      location: event.address,
      startDate: startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
      endDate: endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    };
    
    // Create Google Calendar URL
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventDetails.title)}&dates=${eventDetails.startDate}/${eventDetails.endDate}&details=${encodeURIComponent(eventDetails.description)}&location=${encodeURIComponent(eventDetails.location)}`;
    
    // Open in new window
    window.open(googleCalendarUrl, '_blank');
  };

  // Add this function to handle copying within the modal
  const handleCopyLink = () => {
    // Try to use the clipboard API
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
        });
    } else {
      // For browsers without clipboard support, we'll provide a selectable input
      const inputElement = document.getElementById('share-url-input');
      if (inputElement) {
        (inputElement as HTMLInputElement).select();
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    }
  };

  // Get similar events based on category from the localStorage
  const getSimilarEvents = () => {
    try {
      const storedEvents = localStorage.getItem('events');
      if (!storedEvents) return [];
      
      const allEvents = JSON.parse(storedEvents);
      
      // Filter events: same category, not the current event, only published events
      return allEvents
        .filter((evt: any) => 
          evt.status === 'published' && 
          String(evt.id) !== event.id && 
          (evt.category?.toLowerCase() === event.category?.toLowerCase() || 
           evt.eventType?.toLowerCase() === event.category?.toLowerCase())
        )
        .slice(0, 3)
        .map((evt: any) => ({
          id: evt.id,
          slug: evt.slug || evt.id,
          title: evt.title,
          date: evt.date || new Date(evt.startDate).toLocaleDateString(),
          location: evt.location || evt.venue,
          category: evt.category || evt.eventType || "Event",
          imageUrl: evt.imageUrl || evt.image
        }));
    } catch (error) {
      console.error("Error fetching similar events:", error);
      return [];
    }
  };

  const similarEvents = getSimilarEvents();
  const isOnlineEvent = event.locationType === 'online';
  const hasValidCoordinates = Boolean(
    event.coordinates &&
    typeof event.coordinates.lat === 'number' &&
    typeof event.coordinates.lng === 'number'
  );
  const shouldShowMap = hasValidCoordinates && !isOnlineEvent;
  const locationDescription = event.address?.trim()
    ? event.address
    : isOnlineEvent
      ? 'Streaming link will be shared after registration.'
      : 'Venue details will be announced soon.';
  const LocationIcon = isOnlineEvent ? Laptop : MapPin;

  return (
      <div className="space-y-12 bg-white rounded-xl p-6 md:p-8 shadow-sm transition-all">
      {/* Event Status Badges - Show only featured status */}


      {/* Action Buttons - Mobile: Using grid for better distribution and avoiding overflow */}
      <div className="grid grid-cols-3 gap-3 mb-8 md:hidden">
        <button
          type="button"
          onClick={handleShare}
          className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl border border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 transition-all duration-200 cursor-pointer group shadow-sm"
          title="Share Event"
        >
          <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold">Share</span>
        </button>

        <motion.button
          type="button"
          className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border transition-all duration-200 cursor-pointer group shadow-sm ${
            isLocked
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-emerald-50/50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
          }`}
          onClick={handleLockClick}
          whileTap={{ scale: 0.95 }}
          title={isLocked ? 'Event Locked' : 'Lock Event'}
        >
          <div className="relative w-5 h-5">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={isLocked ? 'locked' : 'unlocked'}
                initial={{ rotate: isLocked ? -45 : 45, scale: 0.5 }}
                animate={{ rotate: 0, scale: 1 }}
                exit={{ rotate: isLocked ? 45 : -45, scale: 0.5, opacity: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 15 
                }}
                className="w-full h-full flex items-center justify-center"
              >
                {isLocked ? <BiLockAlt className="w-5 h-5" /> : <BiLockOpen className="w-5 h-5" />}
              </motion.div>
            </AnimatePresence>
          </div>
          <span className="text-xs font-semibold">{isLocked ? 'Locked' : 'Lock'}</span>
        </motion.button>
        
        <button
          type="button"
          onClick={handleAddToCalendar}
          className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl border border-purple-200 bg-purple-50/50 text-purple-700 hover:bg-purple-100 transition-all duration-200 cursor-pointer group shadow-sm"
          title="Add to Calendar"
        >
          <Calendar className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold">Calendar</span>
        </button>
      </div>

      
      {/* Tabs - Modern pill-style tabs with enhanced design */}
      {(event.hasVoting || hasMerch) && (
        <div className="flex justify-center sm:justify-start mb-8 w-full sm:w-auto">
          <div className="bg-neutral-100 rounded-2xl p-1.5 flex gap-1 w-full sm:w-auto overflow-x-auto custom-scrollbar no-scrollbar">
            <button
              className={`flex-1 sm:flex-none relative px-4 sm:px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer whitespace-nowrap ${
                activeTab === 'about'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
              }`}
              onClick={() => setActiveTab('about')}
            >
              <span className="relative z-10">About Event</span>
            </button>
            
            {/* Only show voting tab if event has voting */}
            {event.hasVoting && (
              <button
                className={`flex-1 sm:flex-none relative px-4 sm:px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer whitespace-nowrap ${
                  activeTab === 'voting'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
                }`}
                onClick={() => setActiveTab('voting')}
                title="Vote for your favorite contestant"
              >
                <span className="relative z-10">Vote Here</span>
              </button>
            )}
            
            {hasMerch && (
              <button
                className={`flex-1 sm:flex-none relative px-4 sm:px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer whitespace-nowrap ${
                  activeTab === 'merch'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/50'
                }`}
                onClick={() => setActiveTab('merch')}
                title="Browse event merchandise"
              >
                <span className="relative z-10">Merch</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab Content with Animation */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-12"
        >
          {activeTab === 'about' ? (
            <>
              {/* About This Event Section - Enhanced with better typography and badges */}
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h2 className="text-2xl font-bold">About This Event</h2>
                  <div className="flex flex-wrap gap-2">

                    <span className="px-3 py-1.5 text-sm font-medium bg-neutral-100 text-neutral-700 rounded-full flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {event.locationType === 'online' ? 'Online' : event.locationType === 'hybrid' ? 'Hybrid' : 'In Person'}
                    </span>
                  </div>
                </div>
                
                {/* Event highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg border border-neutral-200">
                    <div className="text-neutral-600 text-sm mb-1">Date & Time</div>
                    <div className="font-medium text-neutral-900">
                      {event.date}
                    </div>
                    <div className="text-neutral-700">
                      {event.startTime && event.endTime 
                        ? `${event.startTime} - ${event.endTime}`
                        : event.time}
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border border-neutral-200">
                    <div className="text-neutral-600 text-sm mb-1">Event Type</div>
                    <div className="font-medium text-neutral-900">{formatCategoryForDisplay(event.category || '')}</div>
                    <div className="text-neutral-700">Live event</div>
                  </div>
                </div>
                
                <p className="text-neutral-700 whitespace-pre-line leading-relaxed text-base">
                  {event.description}
                </p>
              </div>

              {/* What to Expect Section */}
              {event.features && event.features.length > 0 && (
                <div className="bg-white p-6 rounded-xl border border-neutral-200">
                  <h3 className="text-xl font-semibold mb-5 text-neutral-900">What to expect</h3>
                  <ul className="space-y-4">
                    {event.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-4 text-neutral-700">
                        <div className="bg-neutral-100 p-2 rounded-full border border-neutral-200">
                          <CheckIcon className="w-5 h-5 text-neutral-700" />
                        </div>
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Event Schedule Section - Merged from Schedule tab */}
              {event.schedule && event.schedule.length > 0 && (
                <div className="space-y-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-xl font-semibold text-neutral-900">Event Outline</h3>
                    <div className="flex items-center gap-2 bg-neutral-100 text-neutral-700 px-4 py-2 rounded-lg border border-neutral-200">
                      <ClockIcon className="w-5 h-5" />
                      <span className="font-medium">{event.duration}</span>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-8">
                    {event.schedule.map((item, index) => (
                      <div key={index} className="flex gap-5">
                        {/* Timeline Dot and Line */}
                        <div className="relative flex flex-col items-center">
                          <div className="w-4 h-4 bg-neutral-800 rounded-full shadow-md" />
                          {index !== event.schedule.length - 1 && (
                            <div className="w-0.5 h-full bg-neutral-300 absolute top-4 bottom-0 left-1/2 transform -translate-x-1/2" />
                          )}
                        </div>
                        
                        {/* Content */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 flex-1 hover:shadow-md transition-shadow">
                          <div className="text-sm font-medium text-neutral-700 mb-1">
                            {item.time}
                          </div>
                          <h3 className="text-lg font-semibold mb-2 text-neutral-900">{item.title}</h3>
                          <p className="text-neutral-600 leading-relaxed">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : activeTab === 'voting' ? (
            event.hasVoting && event.contestants && event.contestants.length > 0 && (
              <Voting 
                contestants={event.contestants} 
                onVote={(id, votes) => console.log('Vote:', id, votes)}
                featuredCount={4}
                voteCost={event.voteCost || event.vote_cost || 1}
                isEventEnded={isEventEnded}
              />
            )
          ) : (
            // Merch Tab
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-neutral-900">Event Merchandise</h2>
              </div>
              
              {/* Event Ended Notice for Merch */}
              {isEventEnded && (
                <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-6 text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-200 rounded-full mb-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-neutral-600">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-800 mb-2">Event Has Ended</h3>
                  <p className="text-sm text-neutral-600">This event has concluded. Merchandise purchases are no longer available.</p>
                </div>
              )}
              
              {/* Check if merch is enabled and has products */}
              {!hasMerch ? (
                // Only show "No Merchandise" for active events, past events already show "Event Has Ended" notice above
                !isEventEnded && (
                  <div className="bg-neutral-50 rounded-xl p-12 text-center border border-neutral-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <ShoppingBag className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h3 className="text-lg font-medium text-neutral-900 mb-1">No Merchandise Available</h3>
                    <p className="text-neutral-500">This event does not have any merchandise listed yet.</p>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {merchProducts.map((product: any, idx: number) => (
                    <div key={idx} className="bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-md transition-all group">
                      {/* Fixed height image container */}
                      <div 
                        className="relative h-40 bg-neutral-100 overflow-hidden cursor-pointer"
                        onClick={() => product.image && handleMerchImageClick(product.image)}
                      >
                        {product.image ? (
                          <div 
                            className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                            style={{ backgroundImage: `url(${product.image})` }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-neutral-400">
                            <ShoppingBag className="w-12 h-12 opacity-20" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-bold shadow-sm">
                          ₵{product.price}
                        </div>
                        {/* Delivery Badge */}
                        <div className={`absolute bottom-2 left-2 px-2 py-1 rounded-full text-[10px] font-bold shadow-sm flex items-center gap-1 ${
                          product.deliveryOption === 'nationwide' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {product.deliveryOption === 'nationwide' ? (
                            <>
                              <Truck className="w-3 h-3" />
                              <span>Nationwide Delivery</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3 h-3" />
                              <span>On-site Pickup</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-sm text-neutral-900 mb-1 line-clamp-1">{product.name}</h3>
                        <p className="text-neutral-500 text-xs line-clamp-2 mb-3 min-h-[2.5rem]">{product.description}</p>
                        
                        {(() => {
                          const cartItem = getCartItem(product.id);
                          
                          if (cartItem) {
                            // Show quantity controls
                            return (
                              <div className="flex items-center justify-between bg-neutral-100 rounded-lg p-1.5">
                                <button
                                  onClick={() => {
                                    if (cartItem.quantity <= 1) {
                                      removeItem(cartItem.id);
                                    } else {
                                      updateQuantity(cartItem.id, cartItem.quantity - 1);
                                    }
                                  }}
                                  className="p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                
                                <span className="font-semibold text-sm px-3">
                                  {cartItem.quantity}
                                </span>
                                
                                <button
                                  onClick={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
                                  className="p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          }
                          
                          // Show Add to Cart button
                          if (isEventEnded) {
                            return (
                              <button 
                                disabled
                                className="w-full py-2 bg-neutral-200 text-neutral-500 rounded-lg font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                              >
                                Event Ended
                              </button>
                            );
                          }

                          return (
                            <button 
                              onClick={() => handleAddToCart(product)}
                              className="w-full py-2 bg-neutral-900 text-white rounded-lg font-medium text-sm hover:bg-black transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              Add to Cart
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Venue Section - Enhanced with more info and better styling */}
      <div className="border-t border-neutral-200 pt-12">
            <h2 className="text-2xl font-bold mb-6 text-neutral-900">Location</h2>
            <div className={`grid gap-8 md:items-stretch ${shouldShowMap ? 'md:grid-cols-2' : ''}`}>
              <div className="space-y-4 flex flex-col">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200 hover:shadow-md transition-all md:h-full flex flex-col justify-between">
                  <div className="flex items-start gap-4">
                    <div className="bg-neutral-100 p-3 rounded-full flex-shrink-0">
                      <LocationIcon className="w-6 h-6 text-neutral-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">
                        {isOnlineEvent ? 'Join Online' : 'Event Venue'}
                      </h3>
                      <p className="text-neutral-600 mb-3">{locationDescription}</p>
                    </div>
                  </div>
                      
                  {/* Add null check before accessing lat/lng */}
                  {shouldShowMap && event.coordinates && (
                    isEventEnded ? (
                      <div className="inline-flex items-center justify-center w-full gap-3 px-6 py-4 mt-auto bg-neutral-200 text-neutral-500 rounded-lg cursor-not-allowed font-semibold">
                        <Car className="w-5 h-5" />
                        <span>Get Directions</span>
                      </div>
                    ) : (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${event.coordinates.lat},${event.coordinates.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-full gap-3 px-6 py-4 mt-auto bg-neutral-900 hover:bg-black text-white rounded-lg transition-all duration-200 font-semibold hover:shadow-lg group"
                      >
                        <Car className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span>Get Directions</span>
                      </a>
                    )
                  )}
                </div>
              </div>
              {/* ✅ PHASE 2 OPTIMIZATION: Lazy-loaded map component */}
              {shouldShowMap && event.coordinates ? (
                <LazyEventMap coordinates={event.coordinates} />
              ) : null}
            </div>
          </div>

          {/* Mobile Ticket Card - Shows after location, before organizer on mobile */}
          {ticketCard && (
            <div className="lg:hidden border-t border-neutral-200 pt-12">
              <div id="ticket-section-mobile" className="mb-8">
                {ticketCard}
              </div>
            </div>
          )}

          {/* Organized By Section */}
          <div className="border-t border-neutral-200 pt-12">
            <h2 className="text-2xl font-bold mb-6 text-neutral-900">Organized By</h2>
            <div className="bg-white p-3 rounded-xl border border-neutral-200 shadow-sm mb-4">
              <OrganizerCard
                organizer={{
                  id: event.organizer.id,
                  name: event.organizer.name,
                  image: event.organizer.image,
                  location: event.organizer.location || '',
                  bio: event.organizer.bio || '',
                  verified: event.organizer.verified || false,
                  verificationStatus: event.organizer.verificationStatus || '',
                  eventsHosted: event.organizer.eventsHosted || 0,
                  followersCount: event.organizer.followersCount || 0,
                  totalEventLocks: event.organizer.totalEventLocks,
                  totalScore: event.organizer.totalScore,
                  rank: event.organizer.rank
                }}
                showViewProfile={false}
                size="default"
                showRanking={true}
                className="block w-full"
              />
            </div>
            <Link
              href={`/profiles/${event.organizer.id}`}
              className="block w-full text-center py-3 rounded-lg transition-all font-medium bg-neutral-900 hover:bg-black text-white border border-neutral-900 hover:border-black"
            >
              View Profile
            </Link>
          </div>

      {/* Similar Events Section - Modern card design with enhanced styling */}
      <div className="border-t border-neutral-200 pt-12">
            <h2 className="text-2xl font-bold mb-8 text-neutral-900">Similar Events You Might Like</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {similarEvents.map((similarEvent: SimilarEvent) => (
                <div 
                  key={similarEvent.id}
                  className="bg-white rounded-xl overflow-hidden shadow-sm border border-neutral-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
                >
                  <div className="relative h-36 md:h-40 overflow-hidden">
                    {/* ✅ PHASE 2 OPTIMIZATION: Use Next.js Image for better performance */}
                    <Image
                      src={similarEvent.imageUrl}
                      alt={similarEvent.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-60 group-hover:opacity-70 transition-opacity" />
                    <div className="absolute bottom-4 left-4">
                      <span className="bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium">
                        {similarEvent.category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <h3 className="font-bold text-lg mb-3 line-clamp-1 text-neutral-900 group-hover:text-neutral-700 transition-colors">
                      {similarEvent.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-neutral-600 mb-2">
                      <Calendar className="w-4 h-4 text-neutral-500" />
                      <span>{similarEvent.date}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-neutral-600 mb-4">
                      <MapPin className="w-4 h-4 text-neutral-500" />
                      <span className="line-clamp-1">{similarEvent.location}</span>
                    </div>
                    
                    <Link 
                      href={`/event/${similarEvent.slug || similarEvent.id}`}
                      className="block w-full text-center py-2.5 rounded-lg transition-all font-medium mt-2 bg-neutral-800 hover:bg-black text-white border border-neutral-800 hover:border-black"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

      {/* Share Modal - Redesigned with better styling */}
      {showShareModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" 
          onClick={() => setShowShareModal(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl animate-scaleIn" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Share This Event</h3>
              <button 
                className="text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full p-1 transition-colors"
                onClick={() => setShowShareModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-neutral-600 mb-6">
              Help spread the word about this event. Share it with your friends and family.
            </p>
            
            <button 
              onClick={handleCopyLink}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all duration-300 ${
                copySuccess 
                  ? 'bg-neutral-700 text-white' 
                  : 'bg-neutral-800 text-white hover:bg-black'
              }`}
            >
              {copySuccess ? (
                <>
                  <CheckIcon className="w-5 h-5" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
            
            <input
              id="share-url-input"
              type="text"
              readOnly
              value={window.location.href}
              className="sr-only"
              aria-hidden="true"
            />
            
            <div className="mt-8 mb-2">
              <p className="text-sm text-center text-neutral-600 mb-4">
                Or share directly on social media:
              </p>
              <div className="flex justify-center gap-4">
                {/* Social Media Icons with Improved Animation */}
                <a 
                  href={`https://wa.me/?text=${encodeURIComponent(`Check out this event: ${window.location.href}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-[#25D366] text-white hover:opacity-90 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
                  aria-label="Share on WhatsApp"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.091 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345z"/>
                  </svg>
                </a>
                
                <a 
                  href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('Check out this event!')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-[#0088cc] text-white hover:opacity-90 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
                  aria-label="Share on Telegram"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M19.2,4.4L2.9,10.7c-1.1,0.4-1.1,1.1-0.2,1.3l4.1,1.3l1.6,4.8c0.2,0.5,0.1,0.7,0.6,0.7c0.4,0,0.6-0.2,0.8-0.4 c0.1-0.1,1-1,2-2l4.2,3.1c0.8,0.4,1.3,0.2,1.5-0.7l2.8-13.1C20.6,4.6,19.9,4,19.2,4.4z"/>
                  </svg>
                </a>
                
                <a 
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this event: ${window.location.href}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-[#000000] text-white hover:opacity-90 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
                  aria-label="Share on Twitter/X"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                
                <a 
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-[#1877F2] text-white hover:opacity-90 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
                  aria-label="Share on Facebook"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {SignInModalComponent ? <SignInModalComponent /> : null}
      
      <SignInModal 
        isOpen={showMerchSignIn}
        onClose={() => setShowMerchSignIn(false)}
        action="merch"
        returnUrl={pathname}
      />

      {/* Merch Gallery Modal */}
      <GalleryModal
        isOpen={merchGalleryOpen}
        images={selectedMerchImage ? [selectedMerchImage] : []}
        selectedIndex={0}
        onClose={() => {
          setMerchGalleryOpen(false);
          setSelectedMerchImage(null);
        }}
      />

      {/* Banner & Gallery Preview Modal */}
      {(showBannerPreview !== undefined && setShowBannerPreview !== undefined) && (
        <GalleryModal
          isOpen={showBannerPreview}
          images={allImages}
          selectedIndex={selectedBannerImageIndex || 0}
          onClose={() => setShowBannerPreview(false)}
        />
      )}
    </div>
  );
}


function MapIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  );
}

function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 2v4m4 0V2M4 2v4m0 0H2m2 0h16M4 6v12c0 1.104.896 2 2 2h12c1.104 0 2-.896 2-2V6H4z"
      />
    </svg>
  );
}

function LocationIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10c0-4.418 3.582-8 8-8s8 3.582 8 8c0 4.418-3.582 8-8 8S3 14.418 3 10z"
      />
    </svg>
  );
}
