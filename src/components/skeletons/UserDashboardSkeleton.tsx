/**
 * UserDashboardSkeleton Component
 * Loading skeleton for user dashboard page
 */

import React from 'react';

export function UserDashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 bg-neutral-200 rounded w-48" />
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
            <div className="flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-neutral-200 rounded w-32" />
                <div className="h-8 bg-neutral-200 rounded w-16" />
              </div>
              <div className="w-12 h-12 bg-neutral-200 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Upcoming Events Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <div className="h-7 bg-neutral-200 rounded w-40" />
          <div className="h-9 bg-neutral-200 rounded w-20" />
        </div>
        
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-100">
              <div className="h-48 bg-neutral-200" />
              <div className="p-4 md:p-6 space-y-3">
                <div className="h-6 bg-neutral-200 rounded w-3/4" />
                <div className="space-y-2">
                  <div className="h-4 bg-neutral-200 rounded w-full" />
                  <div className="h-4 bg-neutral-200 rounded w-5/6" />
                  <div className="h-4 bg-neutral-200 rounded w-4/6" />
                </div>
                <div className="h-10 bg-neutral-200 rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      </section>
      
      {/* Recently Viewed Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <div className="h-7 bg-neutral-200 rounded w-40" />
          <div className="h-9 bg-neutral-200 rounded w-20" />
        </div>
        
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-100">
              <div className="h-48 bg-neutral-200" />
              <div className="p-4 md:p-6 space-y-3">
                <div className="h-6 bg-neutral-200 rounded w-3/4" />
                <div className="space-y-2">
                  <div className="h-4 bg-neutral-200 rounded w-full" />
                  <div className="h-4 bg-neutral-200 rounded w-5/6" />
                </div>
                <div className="h-10 bg-neutral-200 rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
