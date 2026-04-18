/**
 * VenueSkeleton Component
 * ✅ PHASE 1 OPTIMIZATION: Loading skeleton for venue section
 */

export function VenueSkeleton() {
  return (
    <section className="py-12 md:py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Section Heading Skeleton */}
        <div className="mb-8">
          <div className="h-4 w-28 bg-neutral-200 rounded mb-3 animate-pulse"></div>
          <div className="h-8 w-48 bg-neutral-200 rounded mb-2 animate-pulse"></div>
          <div className="h-4 w-96 bg-neutral-200 rounded animate-pulse"></div>
        </div>

        {/* Venues Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-neutral-200 overflow-hidden shadow-sm">
              {/* Image skeleton */}
              <div className="h-48 bg-neutral-200 animate-pulse"></div>
              
              {/* Content skeleton */}
              <div className="p-4 space-y-3">
                <div className="h-6 bg-neutral-200 rounded w-3/4 animate-pulse"></div>
                <div className="h-4 bg-neutral-200 rounded w-1/2 animate-pulse"></div>
                <div className="flex gap-2 mt-3">
                  <div className="h-4 w-20 bg-neutral-200 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-neutral-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
