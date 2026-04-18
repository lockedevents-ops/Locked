/**
 * ProfilePageSkeleton Component
 * Loading skeleton for organizer profile page
 */

import React from 'react';

export function ProfilePageSkeleton() {
  return (
    <div className="min-h-screen bg-neutral-50 animate-pulse">
      {/* Cover Image Skeleton */}
      <div className="relative h-64 sm:h-80 md:h-96 bg-neutral-200" />
      
      {/* Profile Content */}
      <div className="container mx-auto px-4">
        {/* Profile Header Skeleton */}
        <div className="relative bg-white rounded-xl shadow-sm -mt-20 mb-8 p-6">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
            {/* Profile Image Skeleton */}
            <div className="relative -mt-16 md:mt-0">
              <div className="w-28 h-28 rounded-full bg-neutral-200 border-4 border-white" />
            </div>
            
            {/* Profile Details Skeleton */}
            <div className="flex-1 space-y-4 w-full">
              {/* Name and Location */}
              <div className="space-y-2">
                <div className="h-8 bg-neutral-200 rounded w-48 mx-auto md:mx-0" />
                <div className="h-4 bg-neutral-200 rounded w-32 mx-auto md:mx-0" />
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 justify-center md:justify-start">
                <div className="h-10 bg-neutral-200 rounded-full w-32" />
                <div className="h-10 bg-neutral-200 rounded-full w-32" />
                <div className="h-10 bg-neutral-200 rounded-full w-32" />
              </div>
              
              {/* Stats */}
              <div className="flex gap-6 justify-center md:justify-start">
                <div className="h-4 bg-neutral-200 rounded w-24" />
                <div className="h-4 bg-neutral-200 rounded w-32" />
                <div className="h-4 bg-neutral-200 rounded w-28" />
              </div>
              
              {/* Social Links */}
              <div className="flex gap-3 justify-center md:justify-start">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-10 h-10 bg-neutral-200 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs Skeleton */}
        <div className="border-b border-neutral-200 mb-8">
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-neutral-200 rounded-t w-32" />
            ))}
          </div>
        </div>
        
        {/* Event Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm">
              {/* Event Image */}
              <div className="h-48 bg-neutral-200" />
              
              {/* Event Details */}
              <div className="p-4 space-y-3">
                <div className="h-6 bg-neutral-200 rounded w-3/4" />
                <div className="h-4 bg-neutral-200 rounded w-full" />
                <div className="h-4 bg-neutral-200 rounded w-5/6" />
                
                {/* Stats */}
                <div className="flex gap-4 pt-2">
                  <div className="h-4 bg-neutral-200 rounded w-16" />
                  <div className="h-4 bg-neutral-200 rounded w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
