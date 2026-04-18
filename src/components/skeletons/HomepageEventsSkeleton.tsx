/**
 * HomepageEventsSkeleton Component
 * ✅ PHASE 1 OPTIMIZATION: Loading skeleton for homepage events
 * Shows immediate feedback to users while data loads
 */

export function HomepageEventsSkeleton() {
  return (
    <>
      {/* Featured Events Skeleton */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          {/* Section Heading Skeleton */}
          <div className="mb-8">
            <div className="h-4 w-32 bg-neutral-200 rounded mb-3 animate-pulse"></div>
            <div className="h-8 w-64 bg-neutral-200 rounded mb-2 animate-pulse"></div>
            <div className="h-4 w-96 bg-neutral-200 rounded animate-pulse"></div>
          </div>

          {/* Events Grid Skeleton */}
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-4 px-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-6 md:overflow-visible md:px-0 md:mx-0">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm min-w-[85vw] max-w-xs snap-center md:min-w-0 md:max-w-none"
              >
                {/* Image skeleton */}
                <div className="h-48 bg-neutral-200 animate-pulse"></div>
                
                {/* Content skeleton */}
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-neutral-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-neutral-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-4 bg-neutral-200 rounded w-2/3 animate-pulse"></div>
                  <div className="flex gap-2 mt-4">
                    <div className="h-4 w-16 bg-neutral-200 rounded animate-pulse"></div>
                    <div className="h-4 w-16 bg-neutral-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category Strip Skeleton */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <div className="h-4 w-24 bg-neutral-200 rounded mb-3 animate-pulse"></div>
            <div className="h-8 w-56 bg-neutral-200 rounded mb-2 animate-pulse"></div>
            <div className="h-4 w-80 bg-neutral-200 rounded animate-pulse"></div>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 w-32 bg-neutral-200 rounded-full animate-pulse"></div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Events Skeleton */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-4">
          {/* Section Heading Skeleton */}
          <div className="mb-8">
            <div className="h-4 w-28 bg-neutral-200 rounded mb-3 animate-pulse"></div>
            <div className="h-8 w-52 bg-neutral-200 rounded mb-2 animate-pulse"></div>
            <div className="h-4 w-72 bg-neutral-200 rounded animate-pulse"></div>
          </div>

          {/* Filter Tabs Skeleton */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 w-24 bg-neutral-200 rounded-full animate-pulse"></div>
            ))}
          </div>

          {/* Events Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm">
                <div className="h-48 bg-neutral-200 animate-pulse"></div>
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-neutral-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-neutral-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-4 bg-neutral-200 rounded w-2/3 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
