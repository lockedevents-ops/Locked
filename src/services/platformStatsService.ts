/**
 * Platform Statistics Service
 * Fetches real-time statistics from the database for the StatisticsShowcase component
 */

import { createClient } from '@/lib/supabase/client/client';
import { isVenuesEnabled } from '@/lib/network';

export interface PlatformStats {
  eventsHosted: number;      // Total events (past + present + future)
  totalAttendees: number;    // Sum of attendee_count across all events
  votesCast: number;         // Total votes cast (placeholder for future implementation)
  satisfactionRate: number;  // Fixed at 98%
  venuesWorldwide: number;   // Total venues from venues table
  organizers: number;        // Total organizers from organizers table
}

class PlatformStatsService {
  /**
   * Fetch all platform statistics from database
   */
  async getPlatformStats(): Promise<PlatformStats> {
    try {
      const supabase = createClient();
      const venuesEnabled = isVenuesEnabled();

      // Fetch all stats in parallel for better performance
      const [eventsResult, attendeesResult, venuesResult, organizersResult] = await Promise.all([
        // Get total events count (all status, all dates)
        supabase
          .from('events')
          .select('id', { count: 'exact', head: true }),

        // Count attendee records directly to avoid transferring every event row.
        supabase
          .from('event_registrations')
          .select('id', { count: 'exact', head: true })
          .in('status', ['registered', 'checked_in']),

        // Get total venues count
        venuesEnabled
          ? supabase
              .from('venues')
              .select('id', { count: 'exact', head: true })
          : Promise.resolve({ count: 0, data: null, error: null }),

        // Get total organizers count
        supabase
          .from('organizers')
          .select('id', { count: 'exact', head: true })
      ]);

      const totalAttendees = attendeesResult.count || 0;

      // For votes, we'll use a placeholder calculation based on attendees
      // (Assuming ~12 votes per attendee based on the 1M votes target)
      // TODO: Create a votes table in the future for accurate tracking
      const votesCast = Math.floor(totalAttendees * 2.5); // Approximation

      return {
        eventsHosted: eventsResult.count || 0,
        totalAttendees,
        votesCast,
        satisfactionRate: 98, // Fixed rate
        venuesWorldwide: venuesResult.count || 0,
        organizers: organizersResult.count || 0
      };
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      
      // Return fallback values on error
      return {
        eventsHosted: 0,
        totalAttendees: 0,
        votesCast: 0,
        satisfactionRate: 98,
        venuesWorldwide: 0,
        organizers: 0
      };
    }
  }

  /**
   * Format large numbers with K, M suffixes
   */
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }

  /**
   * Format number with suffix (K+ or M+)
   */
  formatWithSuffix(num: number): { value: string; suffix: string } {
    if (num >= 1000000) {
      return {
        value: (num / 1000000).toFixed(1),
        suffix: 'M+'
      };
    } else if (num >= 1000) {
      return {
        value: (num / 1000).toFixed(1),
        suffix: 'K+'
      };
    }
    return {
      value: num.toString(),
      suffix: '+'
    };
  }
}

// Export singleton instance
export const platformStatsService = new PlatformStatsService();
export default platformStatsService;
