/**
 * ✅ PHASE 3: Dynamic Import Configurations
 * 
 * Lazy-load below-fold components to reduce initial bundle size
 * These components are not visible on first render, so we can defer loading them
 */

import dynamic from 'next/dynamic';

// Statistics section - appears below fold
export const DynamicStatisticsShowcase = dynamic(
  () => import('@/components/home/StatisticsShowcase').then(mod => ({ default: mod.StatisticsShowcase })),
  {
    loading: () => (
      <div className="py-16 bg-gray-50 animate-pulse">
        <div className="container mx-auto px-4">
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    ),
    ssr: true, // Still render on server for SEO
  }
);

// CTA section - appears at bottom
export const DynamicCTASection = dynamic(
  () => import('@/components/home/CTASection').then(mod => ({ default: mod.CTASection })),
  {
    loading: () => (
      <div className="py-16 bg-primary/5 animate-pulse">
        <div className="container mx-auto px-4">
          <div className="h-48 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    ),
    ssr: true,
  }
);

// Recommended Events - only loads for authenticated users
export const DynamicRecommendedEvents = dynamic(
  () => import('@/components/events/RecommendedEvents').then(mod => ({ default: mod.RecommendedEvents })),
  {
    loading: () => (
      <div className="py-12 bg-white animate-pulse">
        <div className="container mx-auto px-4">
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    ),
    ssr: false, // No SSR for personalized content
  }
);
