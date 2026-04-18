/**
 * VenueDetailsSkeleton Component
 * Loading skeleton for venue details page
 */

import React from 'react';

export function VenueDetailsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-8 bg-neutral-200 rounded w-64"></div>
          <div className="flex gap-2">
            <div className="h-10 bg-neutral-200 rounded w-24"></div>
            <div className="h-10 bg-neutral-200 rounded w-24"></div>
          </div>
        </div>
        <div className="h-4 bg-neutral-200 rounded w-48"></div>
      </div>

      {/* Image Gallery Skeleton */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-100 p-6">
        <div className="h-6 bg-neutral-200 rounded w-32 mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-neutral-200 rounded"></div>
          ))}
        </div>
      </div>

      {/* Details Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-neutral-100 p-6">
          <div className="h-6 bg-neutral-200 rounded w-40 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 bg-neutral-200 rounded w-32"></div>
                <div className="h-4 bg-neutral-200 rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-neutral-100 p-6">
          <div className="h-6 bg-neutral-200 rounded w-40 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 bg-neutral-200 rounded w-full"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
