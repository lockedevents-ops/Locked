/**
 * Chatbot Event Service
 * ---------------------
 * Provides event search capabilities for the help chatbot.
 * Integrates with sharedEventService for data fetching.
 */

import { sharedEventService, EventData, isEventLive, isEventUpcoming } from './sharedEventService';

// ============================================
// TYPES
// ============================================

export interface EventSearchParams {
  query: string;
  category?: string;
  location?: string;
  dateRange?: 'today' | 'tomorrow' | 'this_week' | 'this_weekend' | 'this_month' | 'any';
  priceRange?: 'free' | 'paid' | 'any';
  status?: 'live' | 'upcoming' | 'all';
  hasVoting?: boolean;
  limit?: number;
}

export interface EventSearchResult {
  events: EventData[];
  totalFound: number;
  searchDescription: string;
  suggestions?: string[];
}

export interface ParsedIntent {
  isEventSearch: boolean;
  searchParams: EventSearchParams;
  confidence: number;
}

// ============================================
// INTENT DETECTION
// ============================================

// Keywords that indicate event search intent
const EVENT_SEARCH_TRIGGERS = [
  'find event', 'search event', 'show event', 'look for event',
  'find me', 'show me', 'looking for', 'what event', 'any event',
  'events happening', 'events near', 'events in', 'events this',
  'events today', 'events tomorrow', 'events weekend', 'events week',
  'live event', 'upcoming event', 'free event', 'concert', 'party',
  'festival', 'workshop', 'conference', 'sports', 'music',
  'whats happening', "what's happening", 'whats on', "what's on",
  'things to do', 'activities', 'entertainment'
];

// Category mappings from natural language
const CATEGORY_MAPPINGS: Record<string, string> = {
  'music': 'Music & Concerts',
  'concert': 'Music & Concerts',
  'concerts': 'Music & Concerts',
  'live music': 'Music & Concerts',
  'party': 'Nightlife & Parties',
  'parties': 'Nightlife & Parties',
  'club': 'Nightlife & Parties',
  'nightlife': 'Nightlife & Parties',
  'sport': 'Sports & Fitness',
  'sports': 'Sports & Fitness',
  'fitness': 'Sports & Fitness',
  'gym': 'Sports & Fitness',
  'art': 'Arts & Culture',
  'arts': 'Arts & Culture',
  'culture': 'Arts & Culture',
  'exhibition': 'Arts & Culture',
  'museum': 'Arts & Culture',
  'food': 'Food & Drink',
  'restaurant': 'Food & Drink',
  'dining': 'Food & Drink',
  'drink': 'Food & Drink',
  'drinks': 'Food & Drink',
  'business': 'Business & Networking',
  'networking': 'Business & Networking',
  'conference': 'Business & Networking',
  'seminar': 'Business & Networking',
  'tech': 'Technology',
  'technology': 'Technology',
  'workshop': 'Workshops & Classes',
  'class': 'Workshops & Classes',
  'training': 'Workshops & Classes',
  'learn': 'Workshops & Classes',
  'education': 'Education',
  'school': 'Education',
  'kids': 'Family & Kids',
  'family': 'Family & Kids',
  'children': 'Family & Kids',
  'comedy': 'Comedy',
  'standup': 'Comedy',
  'stand-up': 'Comedy',
  'fashion': 'Fashion & Beauty',
  'beauty': 'Fashion & Beauty',
  'gaming': 'Gaming & Esports',
  'esports': 'Gaming & Esports',
  'games': 'Gaming & Esports',
  'festival': 'Festivals',
  'festivals': 'Festivals',
  'religious': 'Religious & Spiritual',
  'church': 'Religious & Spiritual',
  'spiritual': 'Religious & Spiritual',
  'community': 'Community & Culture',
  'charity': 'Charity & Causes',
  'fundraiser': 'Charity & Causes',
  'voting': 'Voting Events',
  'pageant': 'Voting Events',
  'competition': 'Voting Events'
};

// Location keywords for Ghana
const LOCATION_KEYWORDS = [
  'accra', 'kumasi', 'takoradi', 'tamale', 'cape coast', 'tema',
  'koforidua', 'sunyani', 'ho', 'wa', 'bolgatanga', 'east legon',
  'osu', 'labone', 'cantonments', 'airport', 'spintex', 'madina',
  'ghana', 'greater accra', 'ashanti', 'western', 'eastern', 'central',
  'near me', 'nearby', 'around me', 'close to me'
];

/**
 * Parse natural language query to extract search intent
 */
export function parseEventSearchIntent(query: string): ParsedIntent {
  const queryLower = query.toLowerCase().trim();
  
  // Check if this is an event search query
  let isEventSearch = false;
  let confidence = 0;
  
  for (const trigger of EVENT_SEARCH_TRIGGERS) {
    if (queryLower.includes(trigger)) {
      isEventSearch = true;
      confidence += 0.3;
      break;
    }
  }
  
  // Extract search parameters
  const searchParams: EventSearchParams = {
    query: query,
    limit: 5
  };
  
  // Detect category
  for (const [keyword, category] of Object.entries(CATEGORY_MAPPINGS)) {
    if (queryLower.includes(keyword)) {
      searchParams.category = category;
      confidence += 0.2;
      isEventSearch = true;
      break;
    }
  }
  
  // Detect date range
  if (queryLower.includes('today') || queryLower.includes('tonight')) {
    searchParams.dateRange = 'today';
    confidence += 0.15;
    isEventSearch = true;
  } else if (queryLower.includes('tomorrow')) {
    searchParams.dateRange = 'tomorrow';
    confidence += 0.15;
    isEventSearch = true;
  } else if (queryLower.includes('this weekend') || queryLower.includes('weekend')) {
    searchParams.dateRange = 'this_weekend';
    confidence += 0.15;
    isEventSearch = true;
  } else if (queryLower.includes('this week') || queryLower.includes('week')) {
    searchParams.dateRange = 'this_week';
    confidence += 0.15;
    isEventSearch = true;
  } else if (queryLower.includes('this month') || queryLower.includes('month')) {
    searchParams.dateRange = 'this_month';
    confidence += 0.1;
    isEventSearch = true;
  }
  
  // Detect price preference
  if (queryLower.includes('free')) {
    searchParams.priceRange = 'free';
    confidence += 0.1;
    isEventSearch = true;
  } else if (queryLower.includes('paid') || queryLower.includes('premium')) {
    searchParams.priceRange = 'paid';
    confidence += 0.1;
  }
  
  // Detect status
  if (queryLower.includes('live') || queryLower.includes('happening now') || queryLower.includes('right now')) {
    searchParams.status = 'live';
    confidence += 0.15;
    isEventSearch = true;
  } else if (queryLower.includes('upcoming') || queryLower.includes('coming up') || queryLower.includes('soon')) {
    searchParams.status = 'upcoming';
    confidence += 0.1;
    isEventSearch = true;
  }
  
  // Detect voting preference
  if (queryLower.includes('voting') || queryLower.includes('vote') || queryLower.includes('pageant') || queryLower.includes('competition')) {
    searchParams.hasVoting = true;
    confidence += 0.15;
    isEventSearch = true;
  }
  
  // Detect location
  for (const location of LOCATION_KEYWORDS) {
    if (queryLower.includes(location)) {
      searchParams.location = location;
      confidence += 0.1;
      isEventSearch = true;
      break;
    }
  }
  
  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0);
  
  return {
    isEventSearch: isEventSearch && confidence >= 0.2,
    searchParams,
    confidence
  };
}

// ============================================
// EVENT SEARCH
// ============================================

/**
 * Search for events based on parsed parameters
 */
export async function searchEvents(params: EventSearchParams): Promise<EventSearchResult> {
  try {
    // Get all events from shared service using the public API
    const homepageData = await sharedEventService.getHomepageEvents();
    
    if (!homepageData) {
      return {
        events: [],
        totalFound: 0,
        searchDescription: "Unable to fetch events at the moment.",
        suggestions: ["Try again later", "Browse events on the homepage"]
      };
    }
    
    // Combine all event arrays
    let allEvents: EventData[] = [
      ...homepageData.liveEvents,
      ...homepageData.upcomingEvents,
      ...homepageData.featuredEvents,
      ...homepageData.trendingEvents
    ];
    
    // Remove duplicates by ID
    const seenIds = new Set<string>();
    allEvents = allEvents.filter(event => {
      if (seenIds.has(event.id)) return false;
      seenIds.add(event.id);
      return true;
    });
    
    let filteredEvents = [...allEvents];
    const descriptionParts: string[] = [];
    
    // Filter by status
    if (params.status === 'live') {
      filteredEvents = filteredEvents.filter(e => isEventLive(e));
      descriptionParts.push('live');
    } else if (params.status === 'upcoming') {
      filteredEvents = filteredEvents.filter(e => isEventUpcoming(e));
      descriptionParts.push('upcoming');
    }
    
    // Filter by category
    if (params.category) {
      filteredEvents = filteredEvents.filter(e => 
        e.category?.toLowerCase().includes(params.category!.toLowerCase())
      );
      descriptionParts.push(params.category.toLowerCase());
    }
    
    // Filter by price
    if (params.priceRange === 'free') {
      filteredEvents = filteredEvents.filter(e => 
        e.price === 'Free' || e.price === '0' || e.price === 'GHS 0' || !e.price
      );
      descriptionParts.push('free');
    } else if (params.priceRange === 'paid') {
      filteredEvents = filteredEvents.filter(e => 
        e.price && e.price !== 'Free' && e.price !== '0' && e.price !== 'GHS 0'
      );
      descriptionParts.push('paid');
    }
    
    // Filter by voting
    if (params.hasVoting) {
      filteredEvents = filteredEvents.filter(e => e.hasVoting);
      descriptionParts.push('with voting');
    }
    
    // Filter by location
    if (params.location && params.location !== 'near me' && params.location !== 'nearby') {
      filteredEvents = filteredEvents.filter(e => 
        e.location?.toLowerCase().includes(params.location!.toLowerCase()) ||
        e.venue?.toLowerCase().includes(params.location!.toLowerCase())
      );
      descriptionParts.push(`in ${params.location}`);
    }
    
    // Filter by date range
    if (params.dateRange && params.dateRange !== 'any') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filteredEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.startDate || event.date);
        const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        
        switch (params.dateRange) {
          case 'today':
            return eventDateOnly.getTime() === today.getTime();
          case 'tomorrow':
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return eventDateOnly.getTime() === tomorrow.getTime();
          case 'this_weekend':
            const dayOfWeek = today.getDay();
            const saturday = new Date(today);
            saturday.setDate(today.getDate() + (6 - dayOfWeek));
            const sunday = new Date(saturday);
            sunday.setDate(saturday.getDate() + 1);
            return eventDateOnly >= saturday && eventDateOnly <= sunday;
          case 'this_week':
            const endOfWeek = new Date(today);
            endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
            return eventDateOnly >= today && eventDateOnly <= endOfWeek;
          case 'this_month':
            return eventDate.getMonth() === now.getMonth() && 
                   eventDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
      
      if (params.dateRange === 'today') descriptionParts.push('today');
      else if (params.dateRange === 'tomorrow') descriptionParts.push('tomorrow');
      else if (params.dateRange === 'this_weekend') descriptionParts.push('this weekend');
      else if (params.dateRange === 'this_week') descriptionParts.push('this week');
      else if (params.dateRange === 'this_month') descriptionParts.push('this month');
    }
    
    // Sort by relevance (featured first, then by date)
    filteredEvents.sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return new Date(a.startDate || a.date).getTime() - new Date(b.startDate || b.date).getTime();
    });
    
    // Limit results
    const limitedEvents = filteredEvents.slice(0, params.limit || 5);
    
    // Build search description
    let searchDescription = '';
    if (filteredEvents.length === 0) {
      searchDescription = descriptionParts.length > 0 
        ? `No ${descriptionParts.join(' ')} events found.`
        : "No events found matching your search.";
    } else {
      searchDescription = descriptionParts.length > 0
        ? `Found ${filteredEvents.length} ${descriptionParts.join(' ')} event${filteredEvents.length !== 1 ? 's' : ''}.`
        : `Found ${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''}.`;
    }
    
    // Generate suggestions based on what was searched
    const suggestions: string[] = [];
    if (filteredEvents.length === 0) {
      suggestions.push("Show all upcoming events");
      suggestions.push("Find free events");
      if (!params.status) suggestions.push("Show live events");
    } else {
      if (!params.priceRange) suggestions.push("Show only free events");
      if (!params.hasVoting) suggestions.push("Find events with voting");
      if (!params.dateRange) suggestions.push("Find events this weekend");
    }
    
    return {
      events: limitedEvents,
      totalFound: filteredEvents.length,
      searchDescription,
      suggestions: suggestions.slice(0, 3)
    };
    
  } catch (error) {
    console.error('Event search error:', error);
    return {
      events: [],
      totalFound: 0,
      searchDescription: "Sorry, I encountered an error searching for events.",
      suggestions: ["Try again", "Browse events on the homepage"]
    };
  }
}

/**
 * Format event for chat display
 */
export function formatEventForChat(event: EventData): string {
  const parts: string[] = [];
  
  parts.push(`**${event.title}**`);
  
  if (event.category) {
    parts.push(`📁 ${event.category}`);
  }
  
  if (event.date || event.startDate) {
    const dateStr = event.date || event.startDate;
    const date = new Date(dateStr);
    parts.push(`📅 ${date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`);
  }
  
  if (event.time) {
    parts.push(`🕐 ${event.time}`);
  }
  
  if (event.location || event.venue) {
    parts.push(`📍 ${event.venue || event.location}`);
  }
  
  if (event.price) {
    parts.push(`💰 ${event.price}`);
  }
  
  if (event.hasVoting) {
    parts.push(`🗳️ Voting enabled`);
  }
  
  return parts.join('\n');
}

// Export singleton-like helper
export const chatbotEventService = {
  parseIntent: parseEventSearchIntent,
  search: searchEvents,
  formatEvent: formatEventForChat
};
