/**
 * Engagement Service
 * --------------------------------------------------------------
 * Handles calculation of event engagement scores and management
 * of featured events based on performance metrics.
 */

import { createClient } from '@/lib/supabase/client/client';

export interface EngagementMetrics {
  viewCount: number;
  lockCount: number;
  ticketsSold: number;
  clickCount: number;
  daysSincePublished: number;
}

export interface EngagementScore {
  eventId: string;
  score: number;
  breakdown: {
    viewsScore: number;
    locksScore: number;
    ticketsScore: number;
    clicksScore: number;
    timeDecay: number;
  };
}

export interface FeaturedEvent {
  id: string;
  title: string;
  featuredType: 'auto' | 'manual' | 'none';
  featuredScore: number;
  featuredAt: string | null;
  featuredUntil: string | null;
  featuredReason: string;
}

class EngagementService {
  private readonly WEIGHTS = {
    views: 1.0,      // Base engagement
    locks: 3.0,      // High intent (bookmarking)
    tickets: 5.0,    // Conversion action
    clicks: 2.0      // Active engagement
  };

  private readonly TIME_DECAY_START_DAYS = 14; // Start applying decay after 2 weeks
  private readonly DECAY_RATE_PER_WEEK = 0.1;  // 10% decay per week
  private readonly MIN_SCORE_MULTIPLIER = 0.1;  // Minimum 10% of original score

  /**
   * Calculate engagement score for a single event
   */
  calculateEngagementScore(metrics: EngagementMetrics): EngagementScore {
    const { viewCount, lockCount, ticketsSold, clickCount, daysSincePublished } = metrics;
    
    // Calculate weighted base score
    const viewsScore = (viewCount || 0) * this.WEIGHTS.views;
    const locksScore = (lockCount || 0) * this.WEIGHTS.locks;
    const ticketsScore = (ticketsSold || 0) * this.WEIGHTS.tickets;
    const clicksScore = (clickCount || 0) * this.WEIGHTS.clicks;
    
    const baseScore = viewsScore + locksScore + ticketsScore + clicksScore;
    
    // Apply time decay for older events
    let timeDecay = 1.0;
    if (daysSincePublished > this.TIME_DECAY_START_DAYS) {
      const weeksOver = (daysSincePublished - this.TIME_DECAY_START_DAYS) / 7;
      timeDecay = Math.max(
        this.MIN_SCORE_MULTIPLIER,
        1.0 - (weeksOver * this.DECAY_RATE_PER_WEEK)
      );
    }
    
    const finalScore = baseScore * timeDecay;
    
    return {
      eventId: '', // Will be set by caller
      score: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
      breakdown: {
        viewsScore: Math.round(viewsScore * 100) / 100,
        locksScore: Math.round(locksScore * 100) / 100,
        ticketsScore: Math.round(ticketsScore * 100) / 100,
        clicksScore: Math.round(clicksScore * 100) / 100,
        timeDecay: Math.round(timeDecay * 100) / 100
      }
    };
  }

  /**
   * Update engagement scores for all published events
   */
  async updateAllEngagementScores(): Promise<number> {
    try {
      const supabase = createClient();
      
      // Call the stored procedure to update all scores
      const { data, error } = await supabase.rpc('update_all_engagement_scores');
      
      if (error) {
        console.error('Error updating engagement scores:', error);
        return 0;
      }
      
      return data || 0;
    } catch (error) {
      console.error('Error in updateAllEngagementScores:', error);
      return 0;
    }
  }

  /**
   * Get current featured events with their details
   */
  async getFeaturedEvents(): Promise<FeaturedEvent[]> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('featured_events_view')
        .select('*')
        .limit(8); // Get up to 8 (4 manual + 4 auto max)
      
      if (error) {
        console.error('Error fetching featured events:', error);
        return [];
      }
      
      return (data || []).map((event: any) => ({
        id: event.id,
        title: event.title,
        featuredType: event.featured_type,
        featuredScore: event.featured_score || 0,
        featuredAt: event.featured_at,
        featuredUntil: event.featured_until,
        featuredReason: event.featured_reason || 'Unknown'
      }));
    } catch (error) {
      console.error('Error in getFeaturedEvents:', error);
      return [];
    }
  }

  /**
   * Manually feature an event (admin action)
   */
  async manuallyFeatureEvent(
    eventId: string, 
    durationDays?: number,
    reason: string = 'Promoted'
  ): Promise<boolean> {
    try {
      const supabase = createClient();
      
      const featuredUntil = durationDays 
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString()
        : null;
      
      const { error } = await supabase
        .from('events')
        .update({
          featured_type: 'manual',
          is_featured: true,
          featured_at: new Date().toISOString(),
          featured_until: featuredUntil,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);
      
      if (error) {
        console.error('Error manually featuring event:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in manuallyFeatureEvent:', error);
      return false;
    }
  }

  /**
   * Remove featured status from an event
   */
  async unfeatureEvent(eventId: string): Promise<boolean> {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('events')
        .update({
          featured_type: 'none',
          is_featured: false,
          featured_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);
      
      if (error) {
        console.error('Error unfeaturing event:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in unfeatureEvent:', error);
      return false;
    }
  }

  /**
   * Get engagement analytics for an event
   */
  async getEventEngagementAnalytics(eventId: string): Promise<EngagementScore | null> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('events')
        .select('view_count, lock_count, tickets_sold, click_count, created_at, featured_score, likes, attendee_count')
        .eq('id', eventId)
        .single();
      
      if (error || !data) {
        console.error('Error fetching event analytics:', error);
        return null;
      }
      
      const daysSincePublished = Math.floor(
        (Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const metrics: EngagementMetrics = {
        viewCount: data.view_count || 0,
        lockCount: data.lock_count || 0,
        ticketsSold: data.tickets_sold || 0,
        clickCount: data.click_count || 0,
        daysSincePublished
      };
      
      const score = this.calculateEngagementScore(metrics);
      score.eventId = eventId;
      
      return score;
    } catch (error) {
      console.error('Error in getEventEngagementAnalytics:', error);
      return null;
    }
  }

  /**
   * Track event click for engagement calculation
   */
  async trackEventClick(eventId: string): Promise<boolean> {
    try {
      const supabase = createClient();
      
      // Get current click count and increment it
      const { data: event, error: fetchError } = await supabase
        .from('events')
        .select('click_count')
        .eq('id', eventId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching event click count:', fetchError);
        return false;
      }
      
      const newClickCount = (event?.click_count || 0) + 1;
      
      const { error } = await supabase
        .from('events')
        .update({
          click_count: newClickCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);
      
      if (error) {
        console.error('Error tracking event click:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in trackEventClick:', error);
      return false;
    }
  }

  /**
   * Get top performing events that could be featured
   */
  async getTopPerformingEvents(limit: number = 10): Promise<FeaturedEvent[]> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('events')
        .select('id, title, featured_score, featured_type, view_count, lock_count, tickets_sold, click_count')
        .eq('status', 'published')
        .gt('start_date', new Date().toISOString())
        .order('featured_score', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching top performing events:', error);
        return [];
      }
      
      return (data || []).map((event: any) => ({
        id: event.id,
        title: event.title,
        featuredType: event.featured_type || 'none',
        featuredScore: event.featured_score || 0,
        featuredAt: null,
        featuredUntil: null,
        featuredReason: event.featured_type === 'auto' ? 'Trending' : 'Not Featured'
      }));
    } catch (error) {
      console.error('Error in getTopPerformingEvents:', error);
      return [];
    }
  }

  /**
   * Clean up expired manual featured events
   */
  async cleanupExpiredFeaturedEvents(): Promise<number> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('events')
        .update({
          featured_type: 'none',
          is_featured: false,
          featured_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('featured_type', 'manual')
        .lt('featured_until', new Date().toISOString())
        .select('id');
      
      if (error) {
        console.error('Error cleaning up expired featured events:', error);
        return 0;
      }
      
      return data?.length || 0;
    } catch (error) {
      console.error('Error in cleanupExpiredFeaturedEvents:', error);
      return 0;
    }
  }

  /**
   * Track user lock/unlock (bookmark) action
   * Increments or decrements the event's lock_count
   */
  async trackLock(eventId: string, userId: string, action: 'lock' | 'unlock'): Promise<{ success: boolean; newCount?: number; error?: any }> {
    try {
      const supabase = createClient();

      if (action === 'lock') {
        // Insert or update user_event_locks table (tracks which users locked which events)
        const { error: lockError } = await supabase
          .from('user_event_locks')
          .upsert({
            user_id: userId,
            event_id: eventId,
            locked_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,event_id'
          });

        if (lockError) {
          console.error('Error inserting lock:', lockError);
          return { success: false, error: lockError };
        }

        // Trigger automatically updates lock_count, just fetch the new value
        const { data: event, error: fetchError } = await supabase
          .from('events')
          .select('lock_count')
          .eq('id', eventId)
          .single();

        if (fetchError) {
          console.error('Error fetching lock count:', fetchError);
          return { success: false, error: fetchError };
        }

        return { success: true, newCount: event?.lock_count || 0 };
      } else {
        // Remove from user_event_locks table
        const { error: unlockError } = await supabase
          .from('user_event_locks')
          .delete()
          .eq('user_id', userId)
          .eq('event_id', eventId);

        if (unlockError) {
          console.error('Error removing lock:', unlockError);
          return { success: false, error: unlockError };
        }

        // Trigger automatically updates lock_count, just fetch the new value
        const { data: event, error: fetchError } = await supabase
          .from('events')
          .select('lock_count')
          .eq('id', eventId)
          .single();

        if (fetchError) {
          console.error('Error fetching lock count:', fetchError);
          return { success: false, error: fetchError };
        }

        return { success: true, newCount: event?.lock_count || 0 };
      }
    } catch (error) {
      console.error('Error in trackLock:', error);
      return { success: false, error };
    }
  }

  /**
   * Check if user has locked an event
   */
  async isEventLocked(eventId: string, userId: string): Promise<boolean> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('user_event_locks')
        .select('id')
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .maybeSingle();

      if (error) {
        console.error('Error checking lock status:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error in isEventLocked:', error);
      return false;
    }
  }

  /**
   * Get all events locked by a user
   */
  async getUserLockedEvents(userId: string): Promise<string[]> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('user_event_locks')
        .select('event_id')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user locked events:', error);
        return [];
      }

      return data?.map((lock: any) => lock.event_id) || [];
    } catch (error) {
      console.error('Error in getUserLockedEvents:', error);
      return [];
    }
  }
}

// Export singleton instance
export const engagementService = new EngagementService();
export default engagementService;
