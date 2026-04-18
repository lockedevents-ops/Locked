/**
 * Follow Organizer Service
 * --------------------------------------------------------------
 * Handles follow/unfollow operations for organizers with database sync.
 * Similar to engagementService's lock tracking but for organizer follows.
 */

import { createClient } from '@/lib/supabase/client/client';

export interface FollowMetrics {
  organizerId: string;
  isFollowing: boolean;
}

class FollowOrganizerService {
  /**
   * Track user follow/unfollow action
   * Increments or decrements the organizer's follower_count
   */
  async trackFollow(
    organizerId: string,
    userId: string,
    action: 'follow' | 'unfollow'
  ): Promise<{ success: boolean; newCount?: number; error?: any }> {
    const supabase = createClient();

    try {
      if (action === 'follow') {
        // ===== FOLLOW ACTION =====
        // 1. Insert into user_organizer_follows (upsert to handle duplicates)
        const { error: insertError } = await supabase
          .from('user_organizer_follows')
          .upsert(
            {
              user_id: userId,
              organizer_id: organizerId,
              followed_at: new Date().toISOString()
            },
            {
              onConflict: 'user_id,organizer_id', // Don't error on duplicate
              ignoreDuplicates: false // Update followed_at if already exists
            }
          );

        if (insertError) {
          console.error('[FollowOrganizerService] Insert error:', insertError);
          return { success: false, error: insertError };
        }

        // 2. Calculate the updated follower count from user_organizer_follows
        const { count, error: countError } = await supabase
          .from('user_organizer_follows')
          .select('*', { count: 'exact', head: true })
          .eq('organizer_id', organizerId);

        if (countError) {
          console.error('[FollowOrganizerService] Count error:', countError);
          return { success: true, newCount: undefined }; // Still successful, just couldn't get count
        }

        // ✅ SECURITY: Removed sensitive user/organizer ID logging
        return { success: true, newCount: count || 0 };

      } else {
        // ===== UNFOLLOW ACTION =====
        // 1. Delete from user_organizer_follows
        const { error: deleteError } = await supabase
          .from('user_organizer_follows')
          .delete()
          .eq('user_id', userId)
          .eq('organizer_id', organizerId);

        if (deleteError) {
          console.error('[FollowOrganizerService] Delete error:', deleteError);
          return { success: false, error: deleteError };
        }

        // 2. Calculate the updated follower count from user_organizer_follows
        const { count, error: countError } = await supabase
          .from('user_organizer_follows')
          .select('*', { count: 'exact', head: true })
          .eq('organizer_id', organizerId);

        if (countError) {
          console.error('[FollowOrganizerService] Count error:', countError);
          return { success: true, newCount: undefined };
        }

        // ✅ SECURITY: Removed sensitive user/organizer ID logging
        return { success: true, newCount: count || 0 };
      }
    } catch (error) {
      console.error(`[FollowOrganizerService] trackFollow error:`, error);
      return { success: false, error };
    }
  }

  /**
   * Check if user is following an organizer
   */
  async isFollowingOrganizer(organizerId: string, userId: string): Promise<boolean> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('user_organizer_follows')
        .select('id')
        .eq('user_id', userId)
        .eq('organizer_id', organizerId)
        .maybeSingle();

      if (error) {
        console.error('[FollowOrganizerService] isFollowingOrganizer error:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('[FollowOrganizerService] isFollowingOrganizer catch:', error);
      return false;
    }
  }

  /**
   * Get all organizers followed by a user
   * Returns organizer IDs
   */
  async getUserFollowedOrganizers(userId: string): Promise<string[]> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('user_organizer_follows')
        .select('organizer_id')
        .eq('user_id', userId);

      if (error) {
        console.error('[FollowOrganizerService] getUserFollowedOrganizers error:', error);
        return [];
      }

      return data.map((record: any) => record.organizer_id);
    } catch (error) {
      console.error('[FollowOrganizerService] getUserFollowedOrganizers catch:', error);
      return [];
    }
  }

  /**
   * Get detailed list of organizers followed by a user
   * Returns full organizer data with follower counts
   */
  async getUserFollowedOrganizersDetailed(userId: string): Promise<any[]> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('user_organizer_follows')
        .select(`
          followed_at,
          organizers:organizer_id (
            id,
            business_name,
            logo_url,
            banner_url,
            business_description,
            total_events_published,
            status
          )
        `)
        .eq('user_id', userId)
        .order('followed_at', { ascending: false });

      if (error) {
        console.error('[FollowOrganizerService] getUserFollowedOrganizersDetailed error:', error);
        return [];
      }

      // Transform the nested data structure
      return data.map((record: any) => {
        const org = record.organizers;
        return {
          id: org.id,
          name: org.business_name || 'Unknown Organizer',
          profile_image: org.logo_url,
          cover_image: org.banner_url,
          bio: org.business_description,
          total_events: org.total_events_published || 0,
          status: org.status,
          followedAt: record.followed_at
        };
      });
    } catch (error) {
      console.error('[FollowOrganizerService] getUserFollowedOrganizersDetailed catch:', error);
      return [];
    }
  }

  /**
   * Get follower count for an organizer
   */
  async getOrganizerFollowerCount(organizerId: string): Promise<number> {
    try {
      const supabase = createClient();
      
      // Count followers from user_organizer_follows table
      // Note: This table may not exist yet - return 0 if error
      const { count, error } = await supabase
        .from('user_organizer_follows')
        .select('*', { count: 'exact', head: true })
        .eq('organizer_id', organizerId);

      if (error) {
        // Table doesn't exist or other error - return 0
        console.warn('[FollowOrganizerService] getOrganizerFollowerCount - table may not exist:', error.code);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('[FollowOrganizerService] getOrganizerFollowerCount catch:', error);
      return 0;
    }
  }

  /**
   * Get multiple organizers' follower counts in batch
   * Calculates counts from user_organizer_follows junction table
   */
  async getMultipleFollowerCounts(organizerIds: string[]): Promise<Record<string, number>> {
    try {
      const supabase = createClient();
      
      // Get all follow records for these organizers
      const { data, error } = await supabase
        .from('user_organizer_follows')
        .select('organizer_id')
        .in('organizer_id', organizerIds);

      if (error) {
        console.warn('[FollowOrganizerService] getMultipleFollowerCounts - table may not exist:', error.code);
        return {};
      }

      // Count followers per organizer
      const counts: Record<string, number> = {};
      
      // Initialize all organizers with 0
      organizerIds.forEach(id => {
        counts[id] = 0;
      });
      
      // Count occurrences
      data.forEach((record: any) => {
        counts[record.organizer_id] = (counts[record.organizer_id] || 0) + 1;
      });
      
      return counts;
    } catch (error) {
      console.error('[FollowOrganizerService] getMultipleFollowerCounts catch:', error);
      return {};
    }
  }

  /**
   * Get list of users following an organizer (for organizer dashboard)
   */
  async getOrganizerFollowers(organizerId: string, limit: number = 50): Promise<any[]> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('user_organizer_follows')
        .select(`
          followed_at,
          user:user_id (
            id,
            email
          )
        `)
        .eq('organizer_id', organizerId)
        .order('followed_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[FollowOrganizerService] getOrganizerFollowers error:', error);
        return [];
      }

      return data.map((record: any) => ({
        userId: record.user?.id,
        userEmail: record.user?.email,
        followedAt: record.followed_at
      }));
    } catch (error) {
      console.error('[FollowOrganizerService] getOrganizerFollowers catch:', error);
      return [];
    }
  }
}

// Export singleton instance
export const followOrganizerService = new FollowOrganizerService();
export default followOrganizerService;
