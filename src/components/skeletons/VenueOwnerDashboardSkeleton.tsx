/**
 * VenueOwnerDashboardSkeleton Component
 * Loading skeleton for venue owner dashboard page
 */

import React from 'react';

export function VenueOwnerDashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Summary Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-neutral-200 rounded w-24 mb-3"></div>
                <div className="h-8 bg-neutral-200 rounded w-16"></div>
              </div>
              <div className="w-12 h-12 bg-neutral-200 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100 animate-pulse">
        <div className="h-6 bg-neutral-200 rounded w-48 mb-4"></div>
        <div className="h-64 bg-neutral-100 rounded"></div>
      </section>

      {/* Venues List Skeleton */}
      <section>
        <div className="h-6 bg-neutral-200 rounded w-40 mb-4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-100 animate-pulse">
              <div className="h-48 bg-neutral-200"></div>
              <div className="p-6">
                <div className="h-6 bg-neutral-200 rounded w-3/4 mb-3"></div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-neutral-200 rounded w-32"></div>
                  <div className="h-4 bg-neutral-200 rounded w-40"></div>
                  <div className="h-4 bg-neutral-200 rounded w-36"></div>
                </div>
                <div className="flex justify-between">
                  <div className="h-6 bg-neutral-200 rounded w-20"></div>
                  <div className="h-8 bg-neutral-200 rounded w-24"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
