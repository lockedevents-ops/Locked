/**
 * DiscoverPageSkeleton Component
 * --------------------------------------------------------------
 * Comprehensive loading skeleton for the discover page.
 * Matches the actual page layout for seamless loading experience.
 */

export function DiscoverPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Hero Section Skeleton */}
      <div className="relative h-64 bg-gradient-to-b from-neutral-300 to-neutral-200">
        <div className="absolute inset-0 bg-black/10" />
        <div className="container mx-auto px-4 relative z-10 h-full flex flex-col justify-center">
          <div className="h-8 w-64 bg-white/30 rounded-lg mb-4 mt-24" />
          <div className="h-4 w-96 max-w-full bg-white/20 rounded-lg" />
        </div>
      </div>

      {/* Filters Section Skeleton */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200 space-y-6">
          {/* Search Bar */}
          <div className="h-12 bg-neutral-200 rounded-lg w-full" />
          
          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="h-12 bg-neutral-200 rounded-lg" />
            <div className="h-12 bg-neutral-200 rounded-lg" />
            <div className="h-12 bg-neutral-200 rounded-lg" />
            <div className="h-12 bg-neutral-200 rounded-lg" />
          </div>
          
          {/* Toggle Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="h-10 w-32 bg-neutral-200 rounded-lg" />
            <div className="h-10 w-36 bg-neutral-200 rounded-lg" />
            <div className="h-10 w-28 bg-neutral-200 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Results Header Skeleton */}
      <div className="container mx-auto px-4 pb-6">
        <div className="flex justify-between items-center">
          <div className="h-6 w-40 bg-neutral-200 rounded-lg" />
          <div className="h-10 w-48 bg-neutral-200 rounded-lg" />
        </div>
      </div>

      {/* Event Grid Skeleton */}
      <div className="container mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(16)].map((_, i) => (
            <div 
              key={i} 
              className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm"
            >
              {/* Image Skeleton */}
              <div className="h-48 bg-gradient-to-br from-neutral-200 to-neutral-300" />
              
              {/* Content Skeleton */}
              <div className="p-4 space-y-3">
                {/* Category Badge */}
                <div className="h-5 w-24 bg-neutral-200 rounded-full" />
                
                {/* Title */}
                <div className="space-y-2">
                  <div className="h-6 bg-neutral-200 rounded w-full" />
                  <div className="h-6 bg-neutral-200 rounded w-3/4" />
                </div>
                
                {/* Date & Location */}
                <div className="space-y-2">
                  <div className="h-4 bg-neutral-200 rounded w-2/3" />
                  <div className="h-4 bg-neutral-200 rounded w-1/2" />
                </div>
                
                {/* Price & Lock Button */}
                <div className="flex items-center justify-between pt-2">
                  <div className="h-6 w-20 bg-neutral-200 rounded" />
                  <div className="h-8 w-8 bg-neutral-200 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Skeleton */}
        <div className="mt-10 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-neutral-200 rounded-md" />
            <div className="h-10 w-10 bg-neutral-200 rounded-md" />
            <div className="h-10 w-10 bg-neutral-200 rounded-md" />
            <div className="h-10 w-10 bg-neutral-200 rounded-md" />
            <div className="h-10 w-10 bg-neutral-200 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * FilterSkeleton Component
 * --------------------------------------------------------------
 * Smaller skeleton for just the filters section (if needed separately)
 */
export function FilterSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200 space-y-6 animate-pulse">
      {/* Search Bar */}
      <div className="h-12 bg-neutral-200 rounded-lg w-full" />
      
      {/* Filter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-12 bg-neutral-200 rounded-lg" />
        <div className="h-12 bg-neutral-200 rounded-lg" />
        <div className="h-12 bg-neutral-200 rounded-lg" />
        <div className="h-12 bg-neutral-200 rounded-lg" />
      </div>
      
      {/* Toggle Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="h-10 w-32 bg-neutral-200 rounded-lg" />
        <div className="h-10 w-36 bg-neutral-200 rounded-lg" />
        <div className="h-10 w-28 bg-neutral-200 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * EventGridSkeleton Component
 * --------------------------------------------------------------
 * Skeleton for just the event grid (for filter changes)
 */
export function EventGridSkeleton({ count = 16 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
      {[...Array(count)].map((_, i) => (
        <div 
          key={i} 
          className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm"
        >
          {/* Image Skeleton */}
          <div className="h-48 bg-gradient-to-br from-neutral-200 to-neutral-300" />
          
          {/* Content Skeleton */}
          <div className="p-4 space-y-3">
            {/* Category Badge */}
            <div className="h-5 w-24 bg-neutral-200 rounded-full" />
            
            {/* Title */}
            <div className="space-y-2">
              <div className="h-6 bg-neutral-200 rounded w-full" />
              <div className="h-6 bg-neutral-200 rounded w-3/4" />
            </div>
            
            {/* Date & Location */}
            <div className="space-y-2">
              <div className="h-4 bg-neutral-200 rounded w-2/3" />
              <div className="h-4 bg-neutral-200 rounded w-1/2" />
            </div>
            
            {/* Price & Lock Button */}
            <div className="flex items-center justify-between pt-2">
              <div className="h-6 w-20 bg-neutral-200 rounded" />
              <div className="h-8 w-8 bg-neutral-200 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
