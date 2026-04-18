/**
 * Organizers Page Skeleton
 * --------------------------------------------------------------
 * Comprehensive loading skeleton for the organizers page
 * Shows hero, filters, top 3 highlight, and grid skeleton
 */

import React from 'react';
import { Trophy } from 'lucide-react';

export function OrganizersPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Hero Skeleton */}
      <div className="relative bg-gradient-to-r from-gray-300 to-gray-400 py-16">
        <div className="absolute inset-0 bg-black/70" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-left">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-white/50" />
              <div className="h-4 w-32 bg-white/20 rounded"></div>
            </div>
            <div className="h-10 w-64 bg-white/30 rounded mb-2"></div>
            <div className="h-6 w-full max-w-2xl bg-white/20 rounded"></div>
          </div>
        </div>
      </div>

      {/* Search & Filters Skeleton */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-4 rounded-lg shadow-sm">
          {/* Search Bar Skeleton */}
          <div className="w-full md:flex-1">
            <div className="h-10 bg-gray-200 rounded-lg"></div>
          </div>

          {/* Filters Skeleton */}
          <div className="hidden md:flex items-center gap-3">
            <div className="h-8 w-32 bg-gray-200 rounded-md"></div>
            <div className="h-8 w-32 bg-gray-200 rounded-md"></div>
          </div>
        </div>

        {/* Results Count Skeleton */}
        <div className="mt-6">
          <div className="h-6 w-48 bg-gray-200 rounded"></div>
        </div>
      </div>

      {/* Top 3 Organizers Highlight Skeleton */}
      <div className="container mx-auto px-4 mb-8">
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-8">
          {/* Header Skeleton */}
          <div className="text-left mb-8">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-gray-400" />
              <div className="h-4 w-32 bg-gray-300 rounded"></div>
            </div>
            <div className="h-8 w-64 bg-gray-300 rounded mb-2"></div>
            <div className="h-5 w-96 bg-gray-300 rounded"></div>
          </div>

          {/* Top 3 Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                {/* Badge Skeleton */}
                <div className="h-8 w-24 bg-gray-200 rounded-full mb-4 ml-auto"></div>

                {/* Header with image */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200"></div>
                  <div className="flex-1">
                    <div className="h-5 w-32 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  </div>
                </div>

                {/* Metrics Skeleton */}
                <div className="bg-gray-100 rounded-lg p-3 mb-3">
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((j) => (
                      <div key={j} className="flex flex-col items-center">
                        <div className="h-6 w-12 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 w-16 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bio Skeleton */}
                <div className="space-y-2">
                  <div className="h-3 w-full bg-gray-200 rounded"></div>
                  <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* All Organizers Section Skeleton */}
      <div className="container mx-auto px-4 pb-12">
        {/* Section Heading Skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-gray-200 rounded mb-2"></div>
          <div className="h-5 w-96 bg-gray-200 rounded"></div>
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              {/* Header with image */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-gray-200"></div>
                <div className="flex-1">
                  <div className="h-5 w-32 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                </div>
              </div>

              {/* Metrics Skeleton */}
              <div className="bg-gray-100 rounded-lg p-3 mb-3">
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="flex flex-col items-center">
                      <div className="h-6 w-12 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 w-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bio Skeleton */}
              <div className="space-y-2">
                <div className="h-3 w-full bg-gray-200 rounded"></div>
                <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Skeleton */}
        <div className="mt-10 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-gray-200 rounded-md"></div>
            <div className="h-10 w-10 bg-gray-200 rounded-md"></div>
            <div className="h-10 w-10 bg-gray-200 rounded-md"></div>
            <div className="h-10 w-10 bg-gray-200 rounded-md"></div>
            <div className="h-10 w-10 bg-gray-200 rounded-md"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact skeleton for quick loading states
 */
export function OrganizersGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gray-200"></div>
            <div className="flex-1">
              <div className="h-5 w-32 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
            </div>
          </div>
          <div className="bg-gray-100 rounded-lg p-3 mb-3">
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex flex-col items-center">
                  <div className="h-6 w-12 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-gray-200 rounded"></div>
            <div className="h-3 w-3/4 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default OrganizersPageSkeleton;
