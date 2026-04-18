/**
 * Event Utility Functions
 * --------------------------------------------------------------
 * Common utilities for event-related operations
 */

/**
 * Check if an event is free based on its price string
 */
export function isEventFree(price: string): boolean {
  const normalizedPrice = price.toLowerCase().trim();
  
  // Check for various free price formats
  const freeFormats = [
    'free',
    '₵ 0',
    '₵0',
    'gh₵ 0',
    'gh₵0',
    'ghc 0',
    'ghc0',
    '0',
    '0.00',
    '$0',
    '$0.00'
  ];
  
  return freeFormats.some(format => normalizedPrice === format);
}

/**
 * Get appropriate button text based on event type and context
 */
export function getEventButtonText(price: string, isFeatured: boolean = false): string {
  if (isEventFree(price)) {
    return 'Register';
  }
  
  if (isFeatured) {
    return 'Get Tickets';
  }
  
  return 'View Details';
}

/**
 * Format price display with proper handling for free events
 */
export function formatEventPrice(price: string | number): string {
  if (typeof price === 'number') {
    return price === 0 ? 'Free' : `₵${price.toFixed(2)}`;
  }
  
  if (isEventFree(price)) {
    return 'Free';
  }
  
  return price;
}

/**
 * Format category name for display (capitalize, remove underscores, apply mappings)
 */
export function formatCategoryForDisplay(category: string): string {
  if (!category) return '';
  
  const categoryMap: Record<string, string> = {
    'Music Festival': 'Music',
    'music': 'Music',
    'arts_culture': 'Arts & Culture',
    'Arts & Culture': 'Arts & Culture',
    'theatre': 'Theatre',
    'dance': 'Dance',
    'film': 'Film',
    'traditional': 'Traditional',
    'Tech': 'Tech',
    'technology': 'Technology',
    'Food & Drink': 'Food & Drink',
    'food_drink': 'Food & Drink',
    'Business': 'Business',
    'business': 'Business',
    'corporate': 'Corporate',
    'networking': 'Networking',
    'career': 'Career',
    'fashion': 'Fashion',
    'beauty': 'Beauty',
    'health_wellness': 'Health & Wellness',
    'Wellness': 'Health & Wellness',
    'sports_fitness': 'Sports & Fitness',
    'Sports': 'Sports & Fitness',
    'gaming': 'Gaming',
    'outdoor': 'Outdoor',
    'adventure': 'Adventure',
    'Education': 'Education',
    'education': 'Education',
    'academic': 'Academic',
    'workshop': 'Workshop',
    'Workshops': 'Workshops',
    'community': 'Community',
    'charity': 'Charity',
    'religious': 'Religious',
    'political': 'Political',
    'Entertainment': 'Entertainment',
    'Family': 'Family & Kids',
    'Literature': 'Literature',
    'Science': 'Science',
    'Travel': 'Travel',
  };
  
  return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
}
