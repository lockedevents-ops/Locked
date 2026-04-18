/**
 * EventDetailsPageSkeleton Component
 * --------------------------------------------------------------
 * Loading skeleton for event details page.
 * Matches the full layout: hero, gallery, details panel, ticket card
 * 
 * ✅ PHASE 2 OPTIMIZATION: Eliminates blank screens during event data load
 */

export function EventDetailsPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      {/* Hero Section Skeleton */}
      <div className="relative h-[300px] md:h-[400px] lg:h-[500px] bg-gradient-to-br from-gray-200 via-gray-300 to-gray-200 overflow-hidden">
        {/* Shimmer effect */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        
        {/* Hero Content Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        
        {/* Hero Text Skeleton */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 space-y-4">
          <div className="h-8 md:h-12 bg-gray-400/30 rounded-lg w-3/4 max-w-2xl" />
          <div className="h-4 md:h-6 bg-gray-400/30 rounded-lg w-1/2 max-w-md" />
          <div className="flex gap-3 mt-4">
            <div className="h-6 w-20 bg-gray-400/30 rounded-full" />
            <div className="h-6 w-24 bg-gray-400/30 rounded-full" />
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Event Details (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Gallery Carousel Skeleton */}
            <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
              <div className="h-6 bg-gray-200 rounded w-32" /> {/* "Event Gallery" title */}
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-video bg-gray-200 rounded-lg" />
                ))}
              </div>
            </div>

            {/* Event Details Card Skeleton */}
            <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm space-y-8">
              {/* Action Buttons */}
              <div className="flex justify-center sm:justify-start gap-4 sm:gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-2 p-4 min-w-[80px] rounded-xl border border-gray-200 bg-gray-50">
                    <div className="w-5 h-5 bg-gray-300 rounded-full" />
                    <div className="h-3 w-12 bg-gray-300 rounded" />
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div className="flex justify-center sm:justify-start">
                <div className="bg-gray-100 rounded-2xl p-1.5 inline-flex gap-1">
                  <div className="h-10 w-32 bg-white rounded-xl shadow-sm" />
                  <div className="h-10 w-24 bg-gray-200 rounded-xl" />
                </div>
              </div>

              {/* About This Event Section */}
              <div className="space-y-6">
                <div className="h-7 bg-gray-200 rounded w-48" /> {/* Section title */}
                
                {/* Description paragraphs */}
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-4/5" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                </div>

                {/* Features/Highlights */}
                <div className="space-y-3 pt-4">
                  <div className="h-6 bg-gray-200 rounded w-40" /> {/* "What to Expect" */}
                  <div className="grid gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-gray-300 rounded-full flex-shrink-0 mt-0.5" />
                        <div className="h-4 bg-gray-200 rounded flex-1" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Event Schedule Section */}
              <div className="space-y-6 pt-8 border-t border-gray-200">
                <div className="h-7 bg-gray-200 rounded w-40" /> {/* "Event Schedule" */}
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-16 flex-shrink-0">
                        <div className="h-4 bg-gray-300 rounded w-full" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-300 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 rounded w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location Section */}
              <div className="space-y-6 pt-8 border-t border-gray-200">
                <div className="h-7 bg-gray-200 rounded w-32" /> {/* "Location" */}
                <div className="space-y-4">
                  {/* Address */}
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-gray-300 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                  
                  {/* Map placeholder */}
                  <div className="aspect-video bg-gray-200 rounded-lg" />
                  
                  {/* Directions button */}
                  <div className="h-11 bg-gray-200 rounded-lg w-full" />
                </div>
              </div>

              {/* Organizer Section */}
              <div className="space-y-6 pt-8 border-t border-gray-200">
                <div className="h-7 bg-gray-200 rounded w-48" /> {/* "About the Organizer" */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gray-300 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-40" />
                    <div className="h-3 bg-gray-200 rounded w-24" />
                  </div>
                  <div className="h-10 w-28 bg-gray-200 rounded-lg" />
                </div>
              </div>
            </div>

            {/* Similar Events Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
              <div className="h-6 bg-gray-200 rounded w-40" /> {/* "Similar Events" */}
              <div className="grid md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-3">
                    <div className="aspect-video bg-gray-200 rounded-lg" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Ticket Card (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 space-y-6">
                {/* Price Section */}
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-20" /> {/* "From" text */}
                  <div className="h-10 bg-gray-300 rounded w-32" /> {/* Price */}
                  <div className="h-3 bg-gray-200 rounded w-full" /> {/* Sale ends */}
                </div>

                {/* Ticket Types */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="h-5 bg-gray-200 rounded w-32" /> {/* "Ticket Options" */}
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 border border-gray-200 rounded-lg space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-300 rounded w-24" />
                          <div className="h-3 bg-gray-200 rounded w-32" />
                        </div>
                        <div className="h-4 bg-gray-300 rounded w-16" />
                      </div>
                      <div className="h-3 bg-gray-200 rounded w-20" /> {/* Remaining tickets */}
                    </div>
                  ))}
                </div>

                {/* Quantity Selector */}
                <div className="space-y-2 pt-4">
                  <div className="h-4 bg-gray-200 rounded w-20" /> {/* "Quantity" */}
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gray-200 rounded" />
                    <div className="h-10 flex-1 bg-gray-200 rounded" />
                    <div className="h-10 w-10 bg-gray-200 rounded" />
                  </div>
                </div>

                {/* CTA Button */}
                <div className="h-12 bg-gray-300 rounded-lg w-full" />

                {/* Event Info */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-gray-300 rounded flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3 bg-gray-200 rounded w-16" />
                        <div className="h-4 bg-gray-300 rounded w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shimmer animation keyframes (add to globals.css if not present) */}
      <style jsx>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}
