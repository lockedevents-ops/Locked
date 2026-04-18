"use client";

import React from 'react';
import Image from '@/components/ui/AppImage';
import Link from 'next/link';
import { BiLockOpen, BiLockAlt } from 'react-icons/bi';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion'; 
import { Star } from 'lucide-react';
import { getFormattedImagePath } from '@/utils/imageHelpers';
import { engagementService } from '@/services/engagementService';
import { getEventButtonText, formatCategoryForDisplay } from '@/utils/eventUtils';
import { sharedEventService } from '@/services/sharedEventService';
import { useEventLock } from '@/hooks/useEventLock';

// Helper icon components
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
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
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
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
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
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

interface VotingInfo {
  startDate: string;
  endDate: string;
  currentPhase: string;
}

interface FeaturedCardProps {
  id: string;
  slug?: string; // URL-friendly slug for links
  title: string;
  date: string;
  startDate?: string;
  endDate?: string;
  endTime?: string;
  time: string;
  location: string;
  locationLabel?: string;  // Clean location label for display
  imageUrl?: string;
  price: string;
  category: string;
  description?: string;
  hasVoting?: boolean;
  votingInfo?: VotingInfo;
  isFeatured?: boolean;   // Featured by admin
  lockCount?: number;     // Number of users who locked this event
  // Add organizer prop
  organizer?: {
    id: string;
    name: string;
    premiumTier?: 'platinum' | 'elite' | null;
    rank?: number; // Add rank for gradient display
  };
}

export function FeaturedCard({
  id,
  slug,
  title,
  date,
  startDate,
  endDate,
  endTime,
  time,
  location,
  locationLabel,
  imageUrl,
  price,
  category,
  description = "Join us for an amazing experience at this upcoming event. Get your tickets now!",
  hasVoting = false,
  votingInfo,
  isFeatured = false,
  lockCount: initialLockCount = 0,
  organizer  
}: FeaturedCardProps) {
  const router = useRouter();

  const handlePrefetch = () => {
    const target = `/event/${slug || id}`;
    router.prefetch(target);
    sharedEventService.prefetchEventDetails(slug || id);
  };
  
  // Generate clean location label
  const getLocationLabel = () => {
    if (locationLabel) return locationLabel; // Use provided label if available
    
    // Check if it's a URL (online event)
    if (location && (location.startsWith('http') || location.startsWith('www.'))) {
      return 'Online';
    }
    
    // Check for common hybrid/in-person indicators
    const lowerLocation = location?.toLowerCase() || '';
    if (lowerLocation.includes('hybrid')) {
      return 'Hybrid';
    }
    if (lowerLocation.includes('online') || lowerLocation.includes('virtual') || lowerLocation.includes('zoom') || lowerLocation.includes('teams')) {
      return 'Online';
    }
    
    // For in-person events, just show "In Person" to avoid long venue names
    return 'In Person';
  };
  
  // Format time to 12-hour AM/PM format
  const formatTime = (timeString: string) => {
    try {
      // Handle various time formats
      if (timeString.includes('AM') || timeString.includes('PM')) {
        return timeString; // Already in 12-hour format
      }
      
      // Parse 24-hour format (e.g., "14:30" or "14:30:00")
      const timeParts = timeString.split(':');
      if (timeParts.length >= 2) {
        let hours = parseInt(timeParts[0]);
        const minutes = timeParts[1];
        
        if (hours === 0) {
          return `12:${minutes} AM`;
        } else if (hours < 12) {
          return `${hours}:${minutes} AM`;
        } else if (hours === 12) {
          return `12:${minutes} PM`;
        } else {
          return `${hours - 12}:${minutes} PM`;
        }
      }
      
      return timeString; // Return original if can't parse
    } catch (error) {
      return timeString; // Return original on error
    }
  };
  const lockMetadata = {
    id,
    title,
    date,
    time,
    // Include structured time fields to keep locked events status accurate
    startDate,
    start_date: startDate,
    startTime: time,
    start_time: time,
    endDate,
    end_date: endDate,
    endTime,
    end_time: endTime,
    location,
    imageUrl,
    price,
    category,
    description,
    hasVoting,
    votingInfo,
    isFeatured,
  };

  const {
    isLocked,
    handleLock: triggerLock,
    SignInModalComponent,
    lockCount: resolvedLockCount,
  } = useEventLock({
    eventId: id,
    eventSlug: slug,
    organizerId: organizer?.id,
    eventTitle: title,
    initialLockCount,
    lockMetadata,
  });

  const handleLock = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerLock();
  };

  const currentLockCount = resolvedLockCount;

  // Helper to format date label
  const getDateLabel = () => {
    if (!startDate) return date;
    
    const eventDate = new Date(startDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isSameDay = (d1: Date, d2: Date) => 
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
      
    if (isSameDay(eventDate, today)) return 'Today';
    if (isSameDay(eventDate, tomorrow)) return 'Tomorrow';
    
    return date;
  };

  return (
    <>
      <div 
        className="relative group rounded-xl bg-transparent overflow-hidden h-auto min-w-[220px] shadow-sm transition-all duration-300 ease-out"
        style={{
          boxShadow: 'var(--card-shadow, 0 1px 2px 0 rgba(0, 0, 0, 0.05))'
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.setProperty('--card-shadow', '0 12px 24px -6px rgba(59, 130, 246, 0.25), 0 8px 16px -4px rgba(249, 115, 22, 0.15)');
          handlePrefetch();
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.setProperty('--card-shadow', '0 1px 2px 0 rgba(0, 0, 0, 0.05)');
        }}
        onPointerDown={handlePrefetch}
        onTouchStart={handlePrefetch}
      >
        
        {/* Main Card Content */}
        <div className="relative h-full flex flex-col bg-white rounded-[10px] m-[1px] p-2.5 text-left">
          <Link 
            href={`/event/${slug || id}`}
            onClick={() => engagementService.trackEventClick(id)}
            onFocus={handlePrefetch}
            onPointerDown={handlePrefetch}
            onTouchStart={handlePrefetch}
            className="relative h-48 bg-neutral-100 overflow-hidden block cursor-pointer md:cursor-pointer rounded-lg shadow-xl"
          >
            {/* Image with hover zoom effect */}
            <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-500 origin-center">
            {/* Image */}
            {imageUrl ? (
              <Image
                src={getFormattedImagePath(imageUrl)}
                alt={title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                className="object-cover"
                priority={false}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600" />
            )}
            </div>
          
          {/* Featured Badge */}
          {isFeatured && (
            <div className="absolute top-4 left-4 z-10">
              <div 
                className="bg-gradient-to-br from-yellow-400 via-orange-500 to-amber-600 text-white p-1.5 rounded-full shadow-[0_2px_10px_rgba(245,158,11,0.4)] border border-white/20 backdrop-blur-sm" 
                title="Featured Event"
              >
                <Star className="w-3.5 h-3.5 fill-current drop-shadow-sm" />
              </div>
            </div>
          )}
          
          {/* Category Tag & Lock Button */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex gap-2 items-end justify-between">
            <span className="relative inline-block p-[1px] rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white bg-black/70 backdrop-blur-sm">
                {formatCategoryForDisplay(category)}
              </span>
            </span>
            
            {/* Lock Button - Updated with Framer Motion */}
            <motion.div 
              className={`p-2 rounded-full cursor-pointer flex-shrink-0 backdrop-blur-md ${
                isLocked 
                  ? 'bg-black/70 text-white hover:bg-black/80 shadow-lg' 
                  : 'bg-black/70 text-white hover:bg-black/80 shadow-lg'
              }`} 
              onClick={handleLock}
              whileTap={{ scale: 0.85 }}
              whileHover={{ scale: 1.1 }}
            >
              {/* Lock Icon */}
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
                    {isLocked ? <BiLockAlt className="w-5 h-5 text-emerald-400" /> : <BiLockOpen className="w-5 h-5" />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </Link>
        
        {/* Content */}
        <div className="px-2.5 pt-2.5 pb-2">
          {/* Title and Date */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-semibold text-lg text-gray-900 line-clamp-2 flex-1 leading-6">{title}</h3>
            <div className="flex-shrink-0 mt-0.5">
              <span className={`inline-flex items-center px-2.5 py-0.5 text-[13px] font-semibold rounded-full whitespace-nowrap ${
                price.toLowerCase().includes('free') 
                  ? 'bg-emerald-50 text-emerald-600' 
                  : 'bg-indigo-50 text-indigo-600'
              }`}>
                {price}
              </span>
            </div>
          </div>
          
          {/* Organizer name and lock count inline */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {organizer && (
              <Link 
                href={`/profiles/${organizer.id}`}
                className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-all duration-200 group border bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border-neutral-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-gray-500 group-hover:text-primary transition-colors">
                  <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">By {organizer.name}</span>
              </Link>
            )}
            {currentLockCount > 0 && (
              <div className="inline-flex items-center gap-1.5 text-xs text-gray-600 bg-green-50 px-2 py-1 rounded-full">
                <BiLockAlt className="w-3 h-3 text-success" />
                <span className="font-medium">{currentLockCount} {currentLockCount === 1 ? 'lock' : 'locks'}</span>
              </div>
            )}
          </div>
          
          {/* Inline Date, Time, Location */}
          {/* Date, Time, Location Row */}
          <div className="flex flex-nowrap items-center gap-2 text-xs md:text-[10px] text-gray-700 mb-3 overflow-x-hidden">
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-bold whitespace-nowrap text-orange-600">{getDateLabel()}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <ClockIcon className="w-3.5 h-3.5 text-blue-500" />
              <span className="font-semibold whitespace-nowrap">{formatTime(time)}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 min-w-0">
              <LocationIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
              <span className="font-semibold truncate">{getLocationLabel()}</span>
            </div>
          </div>

          {/* USSD Code and Voting Badge Row */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-sm md:text-[10.5px] text-gray-600">
              <span className="font-mono bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-200">*713*767#</span>
            </div>
            
            {/* Voting Badge */}
            {hasVoting && (
              <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-green-600">
                  <path d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" />
                </svg>
                <span className="text-xs font-semibold text-green-600">Voting</span>
              </div>
            )}
          </div>
          

        </div>
        </div>
      </div>
      
      {/* Sign In Modal */}
      {SignInModalComponent ? <SignInModalComponent /> : null}
    </>
  );
}
