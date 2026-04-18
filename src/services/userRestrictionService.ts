/**
 * User Restriction Service
 * --------------------------------------------------------------
 * Manages user restrictions and escalating consequences for repeat offenses.
 * Enforces content creation restrictions, platform access limitations, etc.
 */

import { createClient } from '@/lib/supabase/client/client';
import { userOffenseService, type RestrictionType, type EscalationLevel } from './userOffenseService';

export interface RestrictionCheck {
  isRestricted: boolean;
  restrictionType?: RestrictionType;
  remainingTime?: number;
  escalationLevel?: EscalationLevel;
  message?: string;
}

export interface UserRestrictionInfo {
  canCreateEvents: boolean;
  canCreateVenues: boolean;
  canPublishContent: boolean;
  canAccessPlatform: boolean;
  restrictions: {
    type: RestrictionType;
    reason: string;
    startDate: string;
    endDate?: string;
    remainingTime?: number;
  }[];
  warnings: string[];
  escalationLevel: EscalationLevel;
}

export const userRestrictionService = {
  
  /**
   * Check if user can create events
   */
  async canUserCreateEvents(userId: string): Promise<RestrictionCheck> {
    try {
      const restrictionCheck = await userOffenseService.isUserRestricted(userId, 'content_creation');
      const platformCheck = await userOffenseService.isUserRestricted(userId, 'platform_access');
      
      if (platformCheck.isRestricted) {
        return {
          isRestricted: true,
          restrictionType: 'platform_access',
          remainingTime: platformCheck.remainingTime,
          escalationLevel: platformCheck.restrictionDetails?.escalation_level as EscalationLevel,
          message: 'Your account is currently suspended. You cannot access platform features.'
        };
      }
      
      if (restrictionCheck.isRestricted) {
        return {
          isRestricted: true,
          restrictionType: 'content_creation',
          remainingTime: restrictionCheck.remainingTime,
          escalationLevel: restrictionCheck.restrictionDetails?.escalation_level as EscalationLevel,
          message: 'You are temporarily restricted from creating new events due to policy violations.'
        };
      }
      
      return { isRestricted: false };
      
    } catch (error) {
      console.error('Error checking user event creation permissions:', error);
      return { isRestricted: false }; // Fail open for better UX
    }
  },

  /**
   * Check if user can create venues
   */
  async canUserCreateVenues(userId: string): Promise<RestrictionCheck> {
    try {
      const restrictionCheck = await userOffenseService.isUserRestricted(userId, 'content_creation');
      const platformCheck = await userOffenseService.isUserRestricted(userId, 'platform_access');
      
      if (platformCheck.isRestricted) {
        return {
          isRestricted: true,
          restrictionType: 'platform_access',
          remainingTime: platformCheck.remainingTime,
          escalationLevel: platformCheck.restrictionDetails?.escalation_level as EscalationLevel,
          message: 'Your account is currently suspended. You cannot access platform features.'
        };
      }
      
      if (restrictionCheck.isRestricted) {
        return {
          isRestricted: true,
          restrictionType: 'content_creation',
          remainingTime: restrictionCheck.remainingTime,
          escalationLevel: restrictionCheck.restrictionDetails?.escalation_level as EscalationLevel,
          message: 'You are temporarily restricted from creating new venues due to policy violations.'
        };
      }
      
      return { isRestricted: false };
      
    } catch (error) {
      console.error('Error checking user venue creation permissions:', error);
      return { isRestricted: false }; // Fail open for better UX
    }
  },

  /**
   * Check if user can publish content (for existing drafts)
   */
  async canUserPublishContent(userId: string): Promise<RestrictionCheck> {
    try {
      const publishingCheck = await userOffenseService.isUserRestricted(userId, 'publishing');
      const contentCheck = await userOffenseService.isUserRestricted(userId, 'content_creation');
      const platformCheck = await userOffenseService.isUserRestricted(userId, 'platform_access');
      
      if (platformCheck.isRestricted) {
        return {
          isRestricted: true,
          restrictionType: 'platform_access',
          remainingTime: platformCheck.remainingTime,
          escalationLevel: platformCheck.restrictionDetails?.escalation_level as EscalationLevel,
          message: 'Your account is currently suspended. You cannot publish content.'
        };
      }
      
      if (publishingCheck.isRestricted) {
        return {
          isRestricted: true,
          restrictionType: 'publishing',
          remainingTime: publishingCheck.remainingTime,
          escalationLevel: publishingCheck.restrictionDetails?.escalation_level as EscalationLevel,
          message: 'You are temporarily restricted from publishing content due to policy violations.'
        };
      }
      
      if (contentCheck.isRestricted) {
        return {
          isRestricted: true,
          restrictionType: 'content_creation',
          remainingTime: contentCheck.remainingTime,
          escalationLevel: contentCheck.restrictionDetails?.escalation_level as EscalationLevel,
          message: 'You are temporarily restricted from content activities due to policy violations.'
        };
      }
      
      return { isRestricted: false };
      
    } catch (error) {
      console.error('Error checking user publishing permissions:', error);
      return { isRestricted: false }; // Fail open for better UX
    }
  },

  /**
   * Get comprehensive user restriction info
   */
  async getUserRestrictionInfo(userId: string): Promise<UserRestrictionInfo> {
    try {
      const [eventCheck, venueCheck, publishCheck, offenseStats] = await Promise.all([
        this.canUserCreateEvents(userId),
        this.canUserCreateVenues(userId),
        this.canUserPublishContent(userId),
        userOffenseService.getUserOffenseStats(userId)
      ]);
      
      // Get all active restrictions
      const supabase = createClient();
      const { data: restrictions, error } = await supabase
        .from('user_offenses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_restricted', true);
      
      if (error) {
        console.error('Error fetching user restrictions:', error);
      }
      
      const activeRestrictions = (restrictions || [])
        .filter((r: any) => {
          if (!r.restriction_end_date) return true; // Permanent
          return new Date(r.restriction_end_date) > new Date();
        })
        .map((r: any) => ({
          type: r.current_restriction_type as RestrictionType,
          reason: r.violation_details,
          startDate: r.restriction_start_date,
          endDate: r.restriction_end_date,
          remainingTime: r.restriction_end_date 
            ? new Date(r.restriction_end_date).getTime() - new Date().getTime()
            : undefined
        }));
      
      // Generate warnings based on offense history
      const warnings = [];
      if (offenseStats.recentOffenses > 0) {
        warnings.push(`You have ${offenseStats.recentOffenses} policy violation${offenseStats.recentOffenses > 1 ? 's' : ''} in the last 30 days.`);
      }
      
      if (offenseStats.totalOffenses >= 3) {
        warnings.push('Multiple policy violations may result in account restrictions.');
      }
      
      if (offenseStats.currentEscalationLevel >= 3) {
        warnings.push('Your account is under review due to repeated policy violations.');
      }
      
      return {
        canCreateEvents: !eventCheck.isRestricted,
        canCreateVenues: !venueCheck.isRestricted,
        canPublishContent: !publishCheck.isRestricted,
        canAccessPlatform: !activeRestrictions.some((r: any) => r.type === 'platform_access'),
        restrictions: activeRestrictions,
        warnings,
        escalationLevel: offenseStats.currentEscalationLevel
      };
      
    } catch (error) {
      console.error('Error getting user restriction info:', error);
      return {
        canCreateEvents: true,
        canCreateVenues: true,
        canPublishContent: true,
        canAccessPlatform: true,
        restrictions: [],
        warnings: [],
        escalationLevel: 1
      };
    }
  },

  /**
   * Format remaining time for display
   */
  formatRemainingTime(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return 'less than a minute';
    }
  },

  /**
   * Get restriction message for UI display
   */
  getRestrictionMessage(restrictionInfo: UserRestrictionInfo): string | null {
    if (restrictionInfo.restrictions.length === 0) {
      return null;
    }
    
    const mostSevereRestriction = restrictionInfo.restrictions
      .sort((a, b) => {
        const severityOrder: Record<RestrictionType, number> = {
          'platform_access': 4,
          'content_creation': 3,
          'publishing': 2,
          'none': 1
        };
        return severityOrder[b.type] - severityOrder[a.type];
      })[0];
    
    const timeRemaining = mostSevereRestriction.remainingTime 
      ? this.formatRemainingTime(mostSevereRestriction.remainingTime)
      : 'permanently';
    
    switch (mostSevereRestriction.type) {
      case 'platform_access':
        return `Your account is suspended ${mostSevereRestriction.endDate ? `for ${timeRemaining}` : 'indefinitely'} due to policy violations.`;
      case 'content_creation':
        return `You cannot create new content ${mostSevereRestriction.endDate ? `for ${timeRemaining}` : 'at this time'} due to policy violations.`;
      case 'publishing':
        return `You cannot publish content ${mostSevereRestriction.endDate ? `for ${timeRemaining}` : 'at this time'} due to policy violations.`;
      default:
        return 'Your account has restrictions due to policy violations.';
    }
  },

  /**
   * Check user restrictions before allowing event/venue creation
   */
  async enforceCreationRestrictions(userId: string, contentType: 'event' | 'venue'): Promise<{
    allowed: boolean;
    message?: string;
    restrictionInfo?: RestrictionCheck;
  }> {
    try {
      const restrictionCheck = contentType === 'event' 
        ? await this.canUserCreateEvents(userId)
        : await this.canUserCreateVenues(userId);
      
      if (restrictionCheck.isRestricted) {
        return {
          allowed: false,
          message: restrictionCheck.message,
          restrictionInfo: restrictionCheck
        };
      }
      
      return { allowed: true };
      
    } catch (error) {
      console.error('Error enforcing creation restrictions:', error);
      return { allowed: true }; // Fail open
    }
  },

  /**
   * Check user restrictions before allowing content publishing
   */
  async enforcePublishingRestrictions(userId: string): Promise<{
    allowed: boolean;
    message?: string;
    restrictionInfo?: RestrictionCheck;
  }> {
    try {
      const restrictionCheck = await this.canUserPublishContent(userId);
      
      if (restrictionCheck.isRestricted) {
        return {
          allowed: false,
          message: restrictionCheck.message,
          restrictionInfo: restrictionCheck
        };
      }
      
      return { allowed: true };
      
    } catch (error) {
      console.error('Error enforcing publishing restrictions:', error);
      return { allowed: true }; // Fail open
    }
  },

  /**
   * Send restriction notification to user
   */
  async notifyUserOfRestriction(userId: string, restriction: RestrictionCheck): Promise<void> {
    try {
      // You could integrate with your notification system here
      console.log(`[UserRestricted] User ${userId} restricted:`, restriction.message);
      
      // Could add email notifications, in-app notifications, etc.
      // Example:
      // await notificationService.sendRestrictionNotification(userId, restriction);
      
    } catch (error) {
      console.error('Error sending restriction notification:', error);
    }
  },

  /**
   * Log restriction enforcement for audit purposes
   */
  async logRestrictionEnforcement(
    userId: string, 
    action: 'event_creation' | 'venue_creation' | 'content_publishing',
    blocked: boolean,
    reason?: string
  ): Promise<void> {
    try {
      const logEntry = {
        user_id: userId,
        action,
        blocked,
        reason: reason || null,
        timestamp: new Date().toISOString()
      };
      
      console.log('[RestrictionEnforcement]', logEntry);
      
      // Could store in a dedicated audit log table
      // await supabase.from('restriction_enforcement_log').insert(logEntry);
      
    } catch (error) {
      console.error('Error logging restriction enforcement:', error);
    }
  }
};
