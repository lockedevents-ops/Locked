/**
 * OrganizerSkeleton Component
 * ✅ PHASE 1 OPTIMIZATION: Loading skeleton for top organizers section
 */

export function OrganizerSkeleton() {
  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="container mx-auto px-4">
        {/* Section Heading Skeleton */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-5 bg-neutral-200 rounded animate-pulse"></div>
            <div className="h-4 w-32 bg-neutral-200 rounded animate-pulse"></div>
          </div>
          <div className="h-8 w-64 bg-neutral-200 rounded mb-2 animate-pulse"></div>
          <div className="h-4 w-96 bg-neutral-200 rounded animate-pulse"></div>
        </div>

        {/* Organizers Grid Skeleton */}
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-4 px-4 md:grid md:grid-cols-3 md:gap-8 md:overflow-visible md:px-0 md:mx-0">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm min-w-[85vw] max-w-xs snap-center md:min-w-0 md:max-w-none"
            >
              {/* Banner skeleton */}
              <div className="h-32 bg-gradient-to-br from-neutral-200 to-neutral-300 animate-pulse"></div>
              
              {/* Avatar skeleton */}
              <div className="px-6 -mt-12 relative z-10">
                <div className="w-24 h-24 rounded-full bg-neutral-200 border-4 border-white animate-pulse"></div>
              </div>
              
              {/* Content skeleton */}
              <div className="p-6 pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 bg-neutral-200 rounded w-32 animate-pulse"></div>
                  <div className="h-5 w-5 bg-neutral-200 rounded-full animate-pulse"></div>
                </div>
                <div className="h-4 bg-neutral-200 rounded w-24 animate-pulse"></div>
                <div className="h-3 bg-neutral-200 rounded w-full animate-pulse"></div>
                <div className="h-3 bg-neutral-200 rounded w-3/4 animate-pulse"></div>
                
                {/* Stats skeleton */}
                <div className="flex gap-4 pt-4 border-t border-neutral-200">
                  <div className="flex-1 space-y-1">
                    <div className="h-6 bg-neutral-200 rounded w-8 animate-pulse mx-auto"></div>
                    <div className="h-3 bg-neutral-200 rounded w-16 animate-pulse mx-auto"></div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="h-6 bg-neutral-200 rounded w-8 animate-pulse mx-auto"></div>
                    <div className="h-3 bg-neutral-200 rounded w-16 animate-pulse mx-auto"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
