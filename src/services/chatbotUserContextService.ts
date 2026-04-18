/**
 * Chatbot User Context Service
 * ----------------------------
 * Provides user-specific context for personalized chatbot responses.
 * Fetches tickets, locked events, role information, and more.
 */

import { createClient } from '@/lib/supabase/client/client';

// ============================================
// TYPES
// ============================================

export interface UserTicket {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  eventVenue?: string;
  ticketType: string;
  quantity: number;
  status: 'valid' | 'used' | 'expired' | 'cancelled';
  purchaseDate: string;
  qrCode?: string;
}

export interface LockedEventSummary {
  id: string;
  title: string;
  date: string;
  status: 'live' | 'upcoming' | 'past';
}

export interface UserContextData {
  // User identity
  userId: string;
  userName?: string;
  userEmail?: string;
  
  // Roles
  isOrganizer: boolean;
  isAdmin: boolean;
  roles: string[];
  
  // Tickets
  ticketCount: number;
  upcomingTickets: UserTicket[];
  
  // Locked Events
  lockedEventCount: number;
  lockedEvents: LockedEventSummary[];
  
  // KEYS (if applicable)
  keysBalance?: number;
  
  // Organizer-specific (if organizer)
  organizerEventCount?: number;
  organizerDraftCount?: number;
  
  // Timestamps
  lastFetched: Date;
}

export interface ContextQueryResult {
  isContextQuery: boolean;
  queryType: 'tickets' | 'locked_events' | 'role' | 'keys' | 'organizer_stats' | 'account_info' | 'none';
  response: string;
  data?: any;
}

// ============================================
// CONTEXT QUERY DETECTION
// ============================================

const CONTEXT_QUERY_PATTERNS: Record<string, { type: ContextQueryResult['queryType']; patterns: string[] }> = {
  tickets: {
    type: 'tickets',
    patterns: [
      'my ticket', 'my tickets', 'where are my ticket', 'show my ticket',
      'find my ticket', 'purchased ticket', 'booked ticket', 'ticket history',
      'upcoming ticket', 'view ticket', 'see my ticket'
    ]
  },
  locked_events: {
    type: 'locked_events',
    patterns: [
      'locked event', 'saved event', 'bookmarked event', 'my saved',
      'what have i locked', 'events i locked', 'my locked', 'favorites'
    ]
  },
  role: {
    type: 'role',
    patterns: [
      'am i an organizer', 'am i organizer', 'my role', 'what is my role',
      'am i admin', 'organizer status', 'can i create event', 'become organizer'
    ]
  },
  keys: {
    type: 'keys',
    patterns: [
      'my keys', 'keys balance', 'how many keys', 'key balance',
      'show my keys', 'check keys', 'remaining keys'
    ]
  },
  organizer_stats: {
    type: 'organizer_stats',
    patterns: [
      'my event', 'events i created', 'my draft', 'organizer dashboard',
      'event analytics', 'how many events do i have', 'my published event'
    ]
  },
  account_info: {
    type: 'account_info',
    patterns: [
      'my account', 'account info', 'my profile', 'my email',
      'when did i join', 'my username', 'who am i'
    ]
  }
};

/**
 * Detect if a query is asking for user-specific context
 */
export function detectContextQuery(query: string): { isContextQuery: boolean; type: ContextQueryResult['queryType'] } {
  const queryLower = query.toLowerCase();
  
  for (const [, config] of Object.entries(CONTEXT_QUERY_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (queryLower.includes(pattern)) {
        return { isContextQuery: true, type: config.type };
      }
    }
  }
  
  return { isContextQuery: false, type: 'none' };
}

// ============================================
// DATA FETCHING
// ============================================

class ChatbotUserContextService {
  private supabase = createClient();
  private contextCache: Map<string, { data: UserContextData; expiry: number }> = new Map();
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes
  
  // ✅ Request deduplication
  private pendingContextRequests: Map<string, Promise<UserContextData | null>> = new Map();

  /**
   * Get user context, with caching and request deduplication
   */
  async getUserContext(userId: string): Promise<UserContextData | null> {
    // Check cache first
    const cached = this.contextCache.get(userId);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    // ✅ Request deduplication: return pending request if one exists
    const pendingRequest = this.pendingContextRequests.get(userId);
    if (pendingRequest) {
      return pendingRequest;
    }

    // Create and store the fetch promise
    const fetchPromise = this.fetchUserContext(userId);
    this.pendingContextRequests.set(userId, fetchPromise);

    try {
      const result = await fetchPromise;
      return result;
    } finally {
      // Always clean up pending request
      this.pendingContextRequests.delete(userId);
    }
  }

  /**
   * Internal context fetch (separated for deduplication)
   */
  private async fetchUserContext(userId: string): Promise<UserContextData | null> {
    try {
      // Fetch all context in parallel
      const [
        profileData,
        rolesData,
        ticketsData,
        lockedEventsData,
        organizerData
      ] = await Promise.all([
        this.fetchProfile(userId),
        this.fetchRoles(userId),
        this.fetchTickets(userId),
        this.fetchLockedEvents(userId),
        this.fetchOrganizerStats(userId)
      ]);

      const context: UserContextData = {
        userId,
        userName: profileData?.full_name || profileData?.username,
        userEmail: profileData?.email,
        
        isOrganizer: rolesData.includes('organizer'),
        isAdmin: rolesData.includes('admin'),
        roles: rolesData,
        
        ticketCount: ticketsData.length,
        upcomingTickets: ticketsData.slice(0, 5), // Latest 5
        
        lockedEventCount: lockedEventsData.length,
        lockedEvents: lockedEventsData.slice(0, 5), // Latest 5
        
        organizerEventCount: organizerData?.eventCount,
        organizerDraftCount: organizerData?.draftCount,
        
        lastFetched: new Date()
      };

      // Cache the result
      this.contextCache.set(userId, {
        data: context,
        expiry: Date.now() + this.CACHE_DURATION
      });

      return context;
    } catch (error) {
      console.error('Error fetching user context:', error);
      return null;
    }
  }

  /**
   * Fetch user profile
   */
  private async fetchProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('full_name, username, email')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  }

  /**
   * Fetch user roles
   */
  private async fetchRoles(userId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
    return data?.map((r: { role: string }) => r.role) || [];
  }

  /**
   * Fetch user tickets/registrations
   */
  private async fetchTickets(userId: string): Promise<UserTicket[]> {
    const { data, error } = await this.supabase
      .from('event_registrations')
      .select(`
        id,
        event_id,
        ticket_type,
        quantity,
        status,
        created_at,
        events (
          id,
          title,
          start_date,
          start_time,
          venue,
          city
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching tickets:', error);
      return [];
    }

    return (data || []).map((reg: any) => ({
      id: reg.id,
      eventId: reg.event_id,
      eventTitle: reg.events?.title || 'Unknown Event',
      eventDate: reg.events?.start_date || '',
      eventTime: reg.events?.start_time,
      eventVenue: reg.events?.venue || reg.events?.city,
      ticketType: reg.ticket_type || 'General',
      quantity: reg.quantity || 1,
      status: this.getTicketStatus(reg.events?.start_date),
      purchaseDate: reg.created_at
    }));
  }

  /**
   * Fetch locked events
   */
  private async fetchLockedEvents(userId: string): Promise<LockedEventSummary[]> {
    const { data, error } = await this.supabase
      .from('user_event_locks')
      .select(`
        event_id,
        created_at,
        events (
          id,
          title,
          start_date,
          end_date
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error fetching locked events:', error);
      return [];
    }

    return (data || []).map((lock: any) => ({
      id: lock.event_id,
      title: lock.events?.title || 'Unknown Event',
      date: lock.events?.start_date || '',
      status: this.getEventStatus(lock.events?.start_date, lock.events?.end_date)
    }));
  }

  /**
   * Fetch organizer stats
   */
  private async fetchOrganizerStats(userId: string): Promise<{ eventCount: number; draftCount: number } | null> {
    // First check if user has an organizer profile
    const { data: orgData, error: orgError } = await this.supabase
      .from('organizers')
      .select('id')
      .eq('user_id', userId)
      .single();
    
    if (orgError || !orgData) {
      return null;
    }

    // Count published events
    const { count: eventCount, error: eventError } = await this.supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('organizer_id', orgData.id)
      .eq('status', 'published');
    
    // Count draft events
    const { count: draftCount, error: draftError } = await this.supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('organizer_id', orgData.id)
      .eq('status', 'draft');

    return {
      eventCount: eventCount || 0,
      draftCount: draftCount || 0
    };
  }

  /**
   * Helper: Determine ticket status based on event date
   */
  private getTicketStatus(eventDate?: string): 'valid' | 'used' | 'expired' | 'cancelled' {
    if (!eventDate) return 'valid';
    const now = new Date();
    const event = new Date(eventDate);
    // If event was more than 24 hours ago, consider ticket expired
    if (now.getTime() - event.getTime() > 24 * 60 * 60 * 1000) {
      return 'expired';
    }
    return 'valid';
  }

  /**
   * Helper: Determine event status
   */
  private getEventStatus(startDate?: string, endDate?: string): 'live' | 'upcoming' | 'past' {
    if (!startDate) return 'upcoming';
    
    const now = new Date();
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 4 * 60 * 60 * 1000);
    
    if (now < start) return 'upcoming';
    if (now > end) return 'past';
    return 'live';
  }

  /**
   * Clear cache for a user (call after actions that change data)
   */
  clearCache(userId: string) {
    this.contextCache.delete(userId);
  }

  /**
   * Generate a contextual response based on query type and user data
   */
  generateContextResponse(queryType: ContextQueryResult['queryType'], context: UserContextData | null): ContextQueryResult {
    if (!context) {
      return {
        isContextQuery: true,
        queryType,
        response: "I couldn't fetch your account information. Please make sure you're logged in and try again."
      };
    }

    switch (queryType) {
      case 'tickets':
        return this.generateTicketsResponse(context);
      case 'locked_events':
        return this.generateLockedEventsResponse(context);
      case 'role':
        return this.generateRoleResponse(context);
      case 'keys':
        return this.generateKeysResponse(context);
      case 'organizer_stats':
        return this.generateOrganizerStatsResponse(context);
      case 'account_info':
        return this.generateAccountInfoResponse(context);
      default:
        return {
          isContextQuery: false,
          queryType: 'none',
          response: ''
        };
    }
  }

  private generateTicketsResponse(context: UserContextData): ContextQueryResult {
    if (context.ticketCount === 0) {
      return {
        isContextQuery: true,
        queryType: 'tickets',
        response: `You don't have any tickets yet. Browse events on our discover page to find something exciting!`,
        data: { tickets: [], count: 0 }
      };
    }

    const validTickets = context.upcomingTickets.filter(t => t.status === 'valid');
    let response = `You have **${context.ticketCount} ticket${context.ticketCount !== 1 ? 's' : ''}** in total.\n\n`;
    
    if (validTickets.length > 0) {
      response += `**Upcoming tickets:**\n`;
      validTickets.slice(0, 3).forEach(ticket => {
        const date = ticket.eventDate ? new Date(ticket.eventDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : 'TBD';
        response += `• ${ticket.eventTitle} — ${date}\n`;
      });
    }

    return {
      isContextQuery: true,
      queryType: 'tickets',
      response,
      data: { tickets: context.upcomingTickets, count: context.ticketCount }
    };
  }

  private generateLockedEventsResponse(context: UserContextData): ContextQueryResult {
    if (context.lockedEventCount === 0) {
      return {
        isContextQuery: true,
        queryType: 'locked_events',
        response: `You haven't locked any events yet. Click the lock icon on events you're interested in to save them for later!`,
        data: { events: [], count: 0 }
      };
    }

    const upcoming = context.lockedEvents.filter(e => e.status === 'upcoming');
    const live = context.lockedEvents.filter(e => e.status === 'live');
    
    let response = `You have **${context.lockedEventCount} locked event${context.lockedEventCount !== 1 ? 's' : ''}**.\n\n`;
    
    if (live.length > 0) {
      response += `🔴 **Live now:** ${live.map(e => e.title).join(', ')}\n\n`;
    }
    
    if (upcoming.length > 0) {
      response += `**Upcoming:**\n`;
      upcoming.slice(0, 3).forEach(event => {
        const date = event.date ? new Date(event.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : 'TBD';
        response += `• ${event.title} — ${date}\n`;
      });
    }

    return {
      isContextQuery: true,
      queryType: 'locked_events',
      response,
      data: { events: context.lockedEvents, count: context.lockedEventCount }
    };
  }

  private generateRoleResponse(context: UserContextData): ContextQueryResult {
    let response = '';
    
    if (context.isAdmin) {
      response = `You are an **Administrator** on Locked. You have full access to the admin dashboard and platform management tools.`;
    } else if (context.isOrganizer) {
      response = `Yes! You are a **verified organizer** on Locked. You can create and manage events from your organizer dashboard.`;
      if (context.organizerEventCount !== undefined) {
        response += `\n\nYou have **${context.organizerEventCount} published event${context.organizerEventCount !== 1 ? 's' : ''}**`;
        if (context.organizerDraftCount && context.organizerDraftCount > 0) {
          response += ` and **${context.organizerDraftCount} draft${context.organizerDraftCount !== 1 ? 's' : ''}**`;
        }
        response += `.`;
      }
    } else {
      response = `You're currently a **regular user**. Want to host your own events? You can apply to become an organizer from your dashboard settings.`;
    }

    return {
      isContextQuery: true,
      queryType: 'role',
      response,
      data: { roles: context.roles, isOrganizer: context.isOrganizer, isAdmin: context.isAdmin }
    };
  }

  private generateKeysResponse(context: UserContextData): ContextQueryResult {
    if (context.keysBalance === undefined || context.keysBalance === null) {
      return {
        isContextQuery: true,
        queryType: 'keys',
        response: `KEYS are used for voting in competitions. You can purchase KEYS when you find an event with voting enabled.`,
        data: { balance: 0 }
      };
    }

    return {
      isContextQuery: true,
      queryType: 'keys',
      response: `Your KEYS balance is **${context.keysBalance} KEY${context.keysBalance !== 1 ? 'S' : ''}**.\n\nKEYS are used for voting in competitions and can be purchased on events with voting enabled.`,
      data: { balance: context.keysBalance }
    };
  }

  private generateOrganizerStatsResponse(context: UserContextData): ContextQueryResult {
    if (!context.isOrganizer) {
      return {
        isContextQuery: true,
        queryType: 'organizer_stats',
        response: `You're not currently an organizer. Apply to become one from your dashboard settings to start creating events!`
      };
    }

    let response = `**Your Organizer Stats:**\n\n`;
    response += `• Published events: **${context.organizerEventCount || 0}**\n`;
    response += `• Drafts: **${context.organizerDraftCount || 0}**\n`;
    response += `\nVisit your organizer dashboard to manage your events and view detailed analytics.`;

    return {
      isContextQuery: true,
      queryType: 'organizer_stats',
      response,
      data: { eventCount: context.organizerEventCount, draftCount: context.organizerDraftCount }
    };
  }

  private generateAccountInfoResponse(context: UserContextData): ContextQueryResult {
    let response = `**Your Account:**\n\n`;
    
    if (context.userName) {
      response += `• Name: **${context.userName}**\n`;
    }
    if (context.userEmail) {
      response += `• Email: ${context.userEmail}\n`;
    }
    
    response += `• Role: ${context.isAdmin ? 'Administrator' : context.isOrganizer ? 'Organizer' : 'User'}\n`;
    response += `• Tickets: ${context.ticketCount}\n`;
    response += `• Locked Events: ${context.lockedEventCount}`;

    return {
      isContextQuery: true,
      queryType: 'account_info',
      response,
      data: context
    };
  }
}

// Export singleton instance
export const chatbotUserContextService = new ChatbotUserContextService();
