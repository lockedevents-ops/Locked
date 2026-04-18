"use client";

import React, { useState } from 'react';
import Image from '@/components/ui/AppImage';
import { getFormattedImagePath } from '@/utils/imageHelpers';
import { useLockStore } from '@/store/lockStore';
import { Star, Share2, Calendar, MapPin, Clock as ClockIcon, Calendar as CalendarIcon } from 'lucide-react';
import { BiLockOpen, BiLockAlt } from 'react-icons/bi';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCategoryForDisplay } from '@/utils/eventUtils';
import { useEventLock } from '@/hooks/useEventLock';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface EventHeroProps {
  event: any;
  onBannerClick?: () => void;
}

export function EventHero({ event, onBannerClick }: EventHeroProps) {
  const { user } = useAuth();
  const lockCounts = useLockStore(state => state.lockCounts);
  const displayCount = lockCounts[event.id] ?? event.lockCount;
  
  const imageSrc = getFormattedImagePath(event.imageUrl || event.image);

  const lockMetadata = {
    id: event.id,
    title: event.title,
    date: event.date || new Date().toLocaleDateString(),
    time: event.time || event.startTime || 'TBD',
    startDate: event.startDate,
    startTime: event.startTime || event.time,
    endDate: event.endDate,
    endTime: event.endTime,
    location_address: event.location_address || event.venue,
    venue: event.venue,
    imageUrl: event.image || event.organizer?.image,
    image_url: event.image_url || event.image,
    price: event.price || 'Check event details',
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
    organizerId: event.organizer?.id || 'default',
    eventTitle: event.title,
    initialLockCount: event.lockCount ?? 0,
    lockMetadata,
  });

  const handleLockClick = (e: React.MouseEvent) => {
    e.preventDefault();
    triggerLock();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.title,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleAddToCalendar = () => {
    const start = event.startDate ? new Date(event.startDate) : new Date();
    const end = event.endDate ? new Date(event.endDate) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
    
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description || '');
    const location = encodeURIComponent(event.location_address || event.address || event.venue || '');
    
    const fmtDate = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${fmtDate(start)}/${fmtDate(end)}&details=${details}&location=${location}`;
    
    window.open(googleUrl, '_blank');
  };

  const getDateLabel = () => {
    if (!event.startDate) return event.date;
    
    const eventDate = new Date(event.startDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isSameDate = (d1: Date, d2: Date) => 
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
      
    if (isSameDate(eventDate, today)) return 'Today';
    if (isSameDate(eventDate, tomorrow)) return 'Tomorrow';
    
    return event.date;
  };

  const dateLabel = getDateLabel();
  const isSpecialDate = dateLabel === 'Today' || dateLabel === 'Tomorrow';

  return (
    <section className="relative overflow-hidden rounded-b-3xl md:rounded-b-none">
      {/* Layer 1: Blurred Background Fill */}
      <div className="absolute inset-0 -m-4 scale-110">
        <Image
          src={imageSrc}
          alt=""
          fill
          className="object-cover blur-2xl scale-125 brightness-75"
          priority={false}
          aria-hidden="true"
        />
      </div>
      
      {/* Darker overlay on blurred background */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content Container - aligned with page content */}
      <div className="container mx-auto px-4 py-6 md:py-10">
        <div className="relative flex flex-col md:flex-row md:items-end gap-6 md:gap-8">
          
          {/* Layer 2: Main Image Card - left aligned */}
          <div className="relative w-full md:w-[55%] lg:w-[50%] aspect-[16/10] md:aspect-[16/9] rounded-xl overflow-hidden shadow-2xl border border-white/10 cursor-pointer hover:shadow-3xl transition-shadow group" onClick={onBannerClick}>
            <Image
              src={imageSrc}
              alt={event.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              priority
              style={{
                objectPosition: event.imageMetadata?.focus?.x && event.imageMetadata?.focus?.y
                  ? `${event.imageMetadata.focus.x}% ${event.imageMetadata.focus.y}%`
                  : '50% 50%',
              }}
            />
            {/* Overlay icon to indicate image is clickable */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex items-center gap-2 text-white text-sm font-medium bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                  <span>View</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Event Info - right side on desktop, below on mobile */}
          <div className="flex-1 flex flex-col justify-end text-white pb-0 md:pb-2">
            {/* Category, Voting, and Featured badges */}
            <div className="flex flex-wrap gap-2 items-center mb-4">
              <span className="relative inline-block p-[1px] rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500">
                <span className="inline-block px-3 py-1 text-sm font-medium bg-primary/90 backdrop-blur-sm rounded-full">
                  {formatCategoryForDisplay(event.category)}
                </span>
              </span>
              
              {/* Voting badge */}
              {event.hasVoting && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full shadow-sm backdrop-blur-sm whitespace-nowrap">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                    <path d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v-.75a.75.75 0 011.5 0v.75a4.5 4.5 0 11-9 0v-.75a.75.75 0 011.5 0v.75z" />
                  </svg>
                  Voting Available
                </span>
              )}
              
              {/* Featured badge */}
              {event.isFeatured && (
                <div 
                  className="inline-flex items-center justify-center p-1.5 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-amber-600 text-white shadow-[0_2px_10px_rgba(245,158,11,0.4)] border border-white/20 backdrop-blur-sm"
                  title="Featured Event"
                >
                  <Star className="w-4 h-4 fill-current drop-shadow-sm" />
                </div>
              )}
            </div>
            
            {/* Event Title */}
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight">{event.title}</h1>
            
            {/* Event Meta Info */}
            <div className="flex flex-wrap gap-3 md:gap-6 text-xs md:text-base text-white/90">
              <div className="flex items-center gap-1.5 md:gap-2">
                <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-white/70" />
                <span className={`font-medium ${isSpecialDate ? 'text-orange-400 font-bold text-base md:text-lg' : ''}`}>{dateLabel}</span>
              </div>

              <div className="flex items-center gap-1.5 md:gap-2">
                <ClockIcon className="w-4 h-4 md:w-5 md:h-5 text-white/70" />
                <span>{event.time}</span>
              </div>

              <div className="flex items-center gap-1.5 md:gap-2">
                <MapPin className="w-4 h-4 md:w-5 md:h-5 text-white/70" />
                <span>{event.venue}</span>
              </div>

              {/* Lock count */}
              {typeof displayCount === 'number' && displayCount > 0 && (
                <div className="flex items-center gap-2">
                  <BiLockAlt className="w-4 h-4 md:w-5 md:h-5 text-white/70" />
                  <span>{displayCount.toLocaleString()} locked</span>
                </div>
              )}
            </div>

            {/* Action Buttons - Modern design with consistent sizing and distinct colors */}
            <div className="hidden md:flex flex-wrap gap-4 mt-8">
              {/* Share Button */}
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-blue-200 bg-blue-50/90 hover:bg-blue-100 text-blue-700 transition-all duration-200 group shadow-sm cursor-pointer backdrop-blur-sm"
                title="Share Event"
              >
                <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold">Share</span>
              </button>

              {/* Lock Button */}
              <motion.button
                type="button"
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer group shadow-sm backdrop-blur-sm ${
                  isLocked
                    ? 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20'
                    : 'bg-emerald-50/90 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                }`}
                onClick={handleLockClick}
                whileTap={{ scale: 0.95 }}
                title={isLocked ? 'Event Locked' : 'Lock Event'}
              >
                <div className="relative w-4 h-4">
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
                      {isLocked ? <BiLockAlt className="w-4 h-4" /> : <BiLockOpen className="w-4 h-4" />}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <span className="text-sm font-semibold">{isLocked ? 'Locked' : 'Lock'}</span>
              </motion.button>

              {/* Calendar Button */}
              <button
                type="button"
                onClick={handleAddToCalendar}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-purple-200 bg-purple-50/90 hover:bg-purple-100 text-purple-700 transition-all duration-200 group shadow-sm cursor-pointer backdrop-blur-sm"
                title="Add to Calendar"
              >
                <CalendarIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-semibold">Calendar</span>
              </button>
            </div>

            {/* SignIn Modal for Lock functionality */}
            {SignInModalComponent ? <SignInModalComponent /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
