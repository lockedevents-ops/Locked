"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BiLockOpen, BiLockAlt } from 'react-icons/bi';
import { useAuth } from '@/contexts/AuthContext';
import { SignInModal } from '../ui/SignInModal';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLockStore } from '@/store/lockStore';
import { useToast } from '@/hooks/useToast';

export interface VenueCardProps {
  id: string;
  name: string;
  image: string;
  location: string;
  capacity: number;
  rating?: number;
  priceRange?: string;
}

export function VenueCard({
  id,
  name,
  image,
  location,
  capacity,
  rating,
  priceRange,
}: VenueCardProps) {
  // Replace the local state with our global state
  const { isItemLocked, toggleLock } = useLockStore();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [lockTextVisible, setLockTextVisible] = useState(false);
  
  // Check if this specific event is locked
  const isLocked = isItemLocked(id, 'venue');
  
  const { user } = useAuth();
  const isAuthenticated = !!user;

  const pathname = usePathname();
  const toast = useToast();

  const handleLock = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }
    
    const action = isLocked ? 'unlock' : 'lock';
    const venueName = name || 'Venue';
    
    // Toggle the lock in our persistent store
    toggleLock(id, 'venue', { id, name, image, location, capacity, rating, priceRange }); // Pass event data to store
    
    // Show toast notification for lock/unlock
    if (action === 'lock') {
      toast.showSuccess('Venue Locked', `"${venueName}" has been added to your locked venues`);
    } else {
      toast.showSuccess('Venue Unlocked', `"${venueName}" has been removed from your locked venues`);
    }
    
    setLockTextVisible(true);
    setTimeout(() => setLockTextVisible(false), 2500);
  };

  return (
    <>
      <div className={cn(
        "bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col"
      )}>
        <div className="relative w-full h-48">
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
            priority={false}
          />
          
          {/* Lock Button */}
          <motion.div 
            className={`absolute top-4 right-4 p-2 rounded-full cursor-pointer backdrop-blur-sm ${
              isLocked 
                ? 'bg-success text-white hover:bg-success/90 shadow-lg' 
                : 'bg-white/90 text-gray-600 hover:bg-white shadow-md'
            }`} 
            onClick={handleLock}
            whileTap={{ scale: 0.85 }}
            whileHover={{ scale: 1.1 }}
          >
            <div className="flex items-center">
              {/* Feedback Text*/}
              <AnimatePresence>
                {lockTextVisible && (
                  <motion.div
                    initial={{ opacity: 0, width: 0, x: -10 }}
                    animate={{ opacity: 1, width: 'auto', x: 0 }}
                    exit={{ opacity: 0, width: 0, x: -10 }}
                    transition={{ 
                      duration: 0.2,
                      ease: [0.25, 0.1, 0.25, 1],
                      width: { duration: 0.2 }  
                    }}
                    className="overflow-hidden mr-2 whitespace-nowrap text-xs font-medium"
                  >
                    {isLocked ? 'Locked' : 'Unlocked'}
                  </motion.div>
                )}
              </AnimatePresence>
              
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
                    {isLocked ? <BiLockAlt className="w-5 h-5" /> : <BiLockOpen className="w-5 h-5" />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
        
        <div className="p-5 flex flex-col gap-2 flex-1">
          <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{name}</h3>
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <LocationIcon className="w-4 h-4 text-primary" />
            <span className="truncate">{location}</span>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">Capacity: {capacity}</span>
            {priceRange && (
              <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full font-medium">{priceRange}</span>
            )}
          </div>
          {rating !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <StarIcon className="w-4 h-4 text-yellow-400" />
              <span className="text-xs font-medium text-gray-700">{rating.toFixed(1)}</span>
            </div>
          )}
          <Link 
            href={`/venue/${id}`}
            className="mt-auto w-full bg-primary text-white text-center py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            View Venue
          </Link>
        </div>
      </div>
      
      <SignInModal 
        isOpen={showSignInModal} 
        onClose={() => setShowSignInModal(false)} 
        action="lock"
        returnUrl={pathname}
      />
    </>
  );
}

function LocationIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function StarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
    </svg>
  );
}
