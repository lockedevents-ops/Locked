/**
 * User Offense Tracking Service
 * --------------------------------------------------------------
 * Manages user violations, repeat offenses, and escalating consequences.
 * Tracks offense history and implements progressive discipline system.
 */

import { createClient } from '@/lib/supabase/client/client';

export type OffenseType = 'inappropriate' | 'spam' | 'fraud' | 'safety' | 'content';
export type ContentType = 'event' | 'venue';
export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type EscalationLevel = 1 | 2 | 3 | 4; // 1=warning, 2=restriction, 3=suspension, 4=ban
export type RestrictionType = 'content_creation' | 'platform_access' | 'publishing' | 'none';
export type ActionType = 'flagged' | 'warned' | 'restricted' | 'suspended' | 'banned' | 'restriction_removed';

export interface UserOffense {
  id: string;
  user_id: string;
  offense_type: OffenseType;
  content_type: ContentType;
  content_id: string;
  content_hash?: string;
  original_content?: string;
  violation_details: string;
  severity: SeverityLevel;
  
  // Tracking
  flagged_item_id?: string;
  first_offense_date: string;
  latest_offense_date: string;
  offense_count: number;
  
  // Escalation
  escalation_level: EscalationLevel;
  current_restriction_type?: RestrictionType;
  restriction_start_date?: string;
  restriction_end_date?: string;
  is_restricted: boolean;
  
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface UserOffenseHistory {
  id: string;
  user_id: string;
  user_offense_id: string;
  offense_date: string;
  content_type: ContentType;
  content_id: string;
  violation_details: string;
  severity: SeverityLevel;
  action_taken: ActionType;
  action_details?: string;
  admin_id?: string;
  admin_notes?: string;
  created_at: string;
}

export interface ContentSimilarity {
  id: string;
  user_id: string;
  original_content_hash: string;
  new_content_hash: string;
  content_type: ContentType;
  original_content_id?: string;
  new_content_id?: string;
  similarity_score?: number;
  flagged_as_repeat: boolean;
  created_at: string;
}

export interface OffenseEscalationRule {
  offense_count: number;
  escalation_level: EscalationLevel;
  restriction_type: RestrictionType;
  restriction_duration_hours: number;
  automatic_action: boolean;
  severity_multiplier: number;
}

// Default escalation rules
const DEFAULT_ESCALATION_RULES: OffenseEscalationRule[] = [
  {
    offense_count: 1,
    escalation_level: 1,
    restriction_type: 'none',
    restriction_duration_hours: 0,
    automatic_action: false,
    severity_multiplier: 1.0
  },
  {
    offense_count: 2,
    escalation_level: 2,
    restriction_type: 'content_creation',
    restriction_duration_hours: 24,
    automatic_action: true,
    severity_multiplier: 1.5
  },
  {
    offense_count: 3,
    escalation_level: 2,
    restriction_type: 'content_creation',
    restriction_duration_hours: 72,
    automatic_action: true,
    severity_multiplier: 2.0
  },
  {
    offense_count: 5,
    escalation_level: 3,
    restriction_type: 'platform_access',
    restriction_duration_hours: 168, // 1 week
    automatic_action: true,
    severity_multiplier: 3.0
  },
  {
    offense_count: 8,
    escalation_level: 4,
    restriction_type: 'platform_access',
    restriction_duration_hours: 8760, // 1 year (effectively permanent)
    automatic_action: false, // Requires admin review
    severity_multiplier: 5.0
  }
];

export const userOffenseService = {
  
  /**
   * Create a content hash for similarity detection
   */
  createContentHash(content: string): string {
    // Normalize content: lowercase, remove extra spaces, punctuation
    const normalized = content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Simple hash function for browser compatibility
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  },

  /**
   * Calculate content similarity score (simple implementation)
   */
  calculateSimilarityScore(content1: string, content2: string): number {
    const normalize = (text: string) => text.toLowerCase().replace(/[^\w\s]/g, '').split(' ');
    const words1 = new Set(normalize(content1));
    const words2 = new Set(normalize(content2));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  },

  /**
   * Check if user has existing offenses
   */
  async getUserOffenseRecord(userId: string, offenseType?: OffenseType): Promise<UserOffense | null> {
    const supabase = createClient();
    
    try {
      let query = supabase
        .from('user_offenses')
        .select('*')
        .eq('user_id', userId)
        .order('latest_offense_date', { ascending: false });
      
      if (offenseType) {
        query = query.eq('offense_type', offenseType);
      }
      
      const { data, error } = await query.limit(1).maybeSingle();
      
      if (error) {
        console.error('Error fetching user offense record:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in getUserOffenseRecord:', error);
      return null;
    }
  },

  /**
   * Check for similar content attempts
   */
  async checkContentSimilarity(userId: string, newContent: string, contentType: ContentType, contentId: string): Promise<ContentSimilarity[]> {
    const supabase = createClient();
    
    try {
      const newHash = this.createContentHash(newContent);
      
      // Get user's previous flagged content of the same type
      const { data: previousOffenses, error } = await supabase
        .from('user_offenses')
        .select('content_hash, original_content, content_id')
        .eq('user_id', userId)
        .eq('content_type', contentType)
        .not('content_hash', 'is', null);
      
      if (error || !previousOffenses) {
        return [];
      }
      
      const similarities: ContentSimilarity[] = [];
      
      for (const offense of previousOffenses) {
        if (!offense.content_hash || !offense.original_content) continue;
        
        const similarityScore = this.calculateSimilarityScore(newContent, offense.original_content);
        
        // Consider content similar if similarity > 70%
        if (similarityScore > 0.7) {
          const similarity: ContentSimilarity = {
            id: `similarity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            user_id: userId,
            original_content_hash: offense.content_hash,
            new_content_hash: newHash,
            content_type: contentType,
            original_content_id: offense.content_id,
            new_content_id: contentId,
            similarity_score: similarityScore,
            flagged_as_repeat: similarityScore > 0.8, // Flag as repeat if >80% similar
            created_at: new Date().toISOString()
          };
          
          similarities.push(similarity);
          
          // Store in database
          await supabase.from('content_similarity').insert(similarity);
        }
      }
      
      return similarities;
    } catch (error) {
      console.error('Error checking content similarity:', error);
      return [];
    }
  },

  /**
   * Record a new offense or update existing record
   */
  async recordOffense(
    userId: string,
    offenseType: OffenseType,
    contentType: ContentType,
    contentId: string,
    violationDetails: string,
    severity: SeverityLevel,
    originalContent: string,
    flaggedItemId?: string,
    adminId?: string
  ): Promise<{ offense: UserOffense; escalationApplied: boolean; action: ActionType }> {
    const supabase = createClient();
    
    try {
      const contentHash = this.createContentHash(originalContent);
      const now = new Date().toISOString();
      
      // Check for existing offense record of same type
      const existingOffense = await this.getUserOffenseRecord(userId, offenseType);
      
      let offense: UserOffense;
      let escalationApplied = false;
      let action: ActionType = 'flagged';
      
      if (existingOffense) {
        // Update existing offense record
        const newOffenseCount = existingOffense.offense_count + 1;
        const escalationRule = this.getEscalationRule(newOffenseCount);
        
        const updatedOffense = {
          ...existingOffense,
          content_id: contentId,
          content_hash: contentHash,
          original_content: originalContent,
          violation_details: violationDetails,
          severity: severity,
          flagged_item_id: flaggedItemId,
          latest_offense_date: now,
          offense_count: newOffenseCount,
          escalation_level: escalationRule.escalation_level,
          updated_at: now
        };
        
        // Apply escalation if rule exists
        if (escalationRule.automatic_action) {
          const restrictionEndDate = new Date();
          restrictionEndDate.setHours(restrictionEndDate.getHours() + escalationRule.restriction_duration_hours);
          
          updatedOffense.current_restriction_type = escalationRule.restriction_type;
          updatedOffense.restriction_start_date = now;
          updatedOffense.restriction_end_date = restrictionEndDate.toISOString();
          updatedOffense.is_restricted = escalationRule.restriction_type !== 'none';
          
          escalationApplied = true;
          action = escalationRule.escalation_level >= 3 ? 'suspended' : 'restricted';
        }
        
        const { data, error } = await supabase
          .from('user_offenses')
          .update(updatedOffense)
          .eq('id', existingOffense.id)
          .select()
          .single();
        
        if (error) throw error;
        offense = data;
        
      } else {
        // Create new offense record
        const escalationRule = this.getEscalationRule(1);
        
        const newOffense = {
          user_id: userId,
          offense_type: offenseType,
          content_type: contentType,
          content_id: contentId,
          content_hash: contentHash,
          original_content: originalContent,
          violation_details: violationDetails,
          severity: severity,
          flagged_item_id: flaggedItemId,
          first_offense_date: now,
          latest_offense_date: now,
          offense_count: 1,
          escalation_level: escalationRule.escalation_level,
          is_restricted: false
        };
        
        const { data, error } = await supabase
          .from('user_offenses')
          .insert(newOffense)
          .select()
          .single();
        
        if (error) throw error;
        offense = data;
      }
      
      // Record in history
      await this.recordOffenseHistory(
        userId,
        offense.id,
        contentType,
        contentId,
        violationDetails,
        severity,
        action,
        escalationApplied ? `Escalation level ${offense.escalation_level} applied` : 'Initial offense recorded',
        adminId
      );
      
      return { offense, escalationApplied, action };
      
    } catch (error) {
      console.error('Error recording offense:', error);
      throw error;
    }
  },

  /**
   * Record offense history entry
   */
  async recordOffenseHistory(
    userId: string,
    userOffenseId: string,
    contentType: ContentType,
    contentId: string,
    violationDetails: string,
    severity: SeverityLevel,
    actionTaken: ActionType,
    actionDetails?: string,
    adminId?: string,
    adminNotes?: string
  ): Promise<void> {
    const supabase = createClient();
    
    try {
      const historyEntry = {
        user_id: userId,
        user_offense_id: userOffenseId,
        offense_date: new Date().toISOString(),
        content_type: contentType,
        content_id: contentId,
        violation_details: violationDetails,
        severity: severity,
        action_taken: actionTaken,
        action_details: actionDetails,
        admin_id: adminId,
        admin_notes: adminNotes
      };
      
      const { error } = await supabase
        .from('user_offense_history')
        .insert(historyEntry);
      
      if (error) throw error;
      
    } catch (error) {
      console.error('Error recording offense history:', error);
    }
  },

  /**
   * Get escalation rule based on offense count
   */
  getEscalationRule(offenseCount: number): OffenseEscalationRule {
    // Find the highest applicable rule
    const applicableRules = DEFAULT_ESCALATION_RULES.filter(rule => offenseCount >= rule.offense_count);
    return applicableRules[applicableRules.length - 1] || DEFAULT_ESCALATION_RULES[0];
  },

  /**
   * Check if user is currently restricted
   */
  async isUserRestricted(userId: string, restrictionType?: RestrictionType): Promise<{
    isRestricted: boolean;
    restrictionDetails?: UserOffense;
    remainingTime?: number;
  }> {
    const supabase = createClient();
    
    try {
      let query = supabase
        .from('user_offenses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_restricted', true);
      
      if (restrictionType) {
        query = query.eq('current_restriction_type', restrictionType);
      }
      
      const { data: restrictions, error } = await query;
      
      if (error || !restrictions || restrictions.length === 0) {
        return { isRestricted: false };
      }
      
      // Check if any restrictions are still active
      const now = new Date();
      const activeRestriction = restrictions.find((restriction: any) => {
        if (!restriction.restriction_end_date) return true; // Permanent restriction
        return new Date(restriction.restriction_end_date) > now;
      });
      
      if (activeRestriction) {
        const remainingTime = activeRestriction.restriction_end_date 
          ? new Date(activeRestriction.restriction_end_date).getTime() - now.getTime()
          : null;
        
        return {
          isRestricted: true,
          restrictionDetails: activeRestriction,
          remainingTime: remainingTime || undefined
        };
      }
      
      // Clean up expired restrictions
      await supabase
        .from('user_offenses')
        .update({ is_restricted: false })
        .eq('user_id', userId)
        .lt('restriction_end_date', now.toISOString());
      
      return { isRestricted: false };
      
    } catch (error) {
      console.error('Error checking user restrictions:', error);
      return { isRestricted: false };
    }
  },

  /**
   * Get user offense statistics
   */
  async getUserOffenseStats(userId: string): Promise<{
    totalOffenses: number;
    offensesByType: Record<OffenseType, number>;
    offensesBySeverity: Record<SeverityLevel, number>;
    currentEscalationLevel: EscalationLevel;
    isRestricted: boolean;
    recentOffenses: number; // Last 30 days
  }> {
    const supabase = createClient();
    
    try {
      // Get offense history
      const { data: history, error } = await supabase
        .from('user_offense_history')
        .select('offense_type, severity, offense_date')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error fetching user offense stats:', error);
        return this.getEmptyStats();
      }
      
      // Get current offense record
      const currentOffense = await this.getUserOffenseRecord(userId);
      const { isRestricted } = await this.isUserRestricted(userId);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const offensesByType = {
        inappropriate: 0,
        spam: 0,
        fraud: 0,
        safety: 0,
        content: 0
      };
      
      const offensesBySeverity = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      };
      
      let recentOffenses = 0;
      
      history?.forEach((offense: any) => {
        offensesByType[offense.offense_type as OffenseType]++;
        offensesBySeverity[offense.severity as SeverityLevel]++;
        
        if (new Date(offense.offense_date) >= thirtyDaysAgo) {
          recentOffenses++;
        }
      });
      
      return {
        totalOffenses: history?.length || 0,
        offensesByType,
        offensesBySeverity,
        currentEscalationLevel: (currentOffense?.escalation_level || 1) as EscalationLevel,
        isRestricted,
        recentOffenses
      };
      
    } catch (error) {
      console.error('Error in getUserOffenseStats:', error);
      return this.getEmptyStats();
    }
  },

  /**
   * Get empty stats object
   */
  getEmptyStats() {
    return {
      totalOffenses: 0,
      offensesByType: {
        inappropriate: 0,
        spam: 0,
        fraud: 0,
        safety: 0,
        content: 0
      },
      offensesBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      currentEscalationLevel: 1 as EscalationLevel,
      isRestricted: false,
      recentOffenses: 0
    };
  },

  /**
   * Manually apply or remove restrictions (admin action)
   */
  async updateUserRestriction(
    userId: string,
    restrictionType: RestrictionType,
    durationHours: number,
    adminId: string,
    adminNotes?: string
  ): Promise<boolean> {
    const supabase = createClient();
    
    try {
      const now = new Date();
      const endDate = new Date();
      endDate.setHours(endDate.getHours() + durationHours);
      
      // Update or create offense record
      const existingOffense = await this.getUserOffenseRecord(userId);
      
      if (existingOffense) {
        const { error } = await supabase
          .from('user_offenses')
          .update({
            current_restriction_type: restrictionType,
            restriction_start_date: now.toISOString(),
            restriction_end_date: durationHours > 0 ? endDate.toISOString() : null,
            is_restricted: restrictionType !== 'none',
            admin_notes: adminNotes,
            updated_at: now.toISOString()
          })
          .eq('id', existingOffense.id);
        
        if (error) throw error;
        
        // Record in history
        await this.recordOffenseHistory(
          userId,
          existingOffense.id,
          'event', // Default, could be parameterized
          'manual-admin-action',
          `Manual restriction: ${restrictionType}`,
          'medium',
          restrictionType === 'none' ? 'restriction_removed' : 'restricted',
          `Admin ${adminId} ${restrictionType === 'none' ? 'removed restriction' : `applied ${restrictionType} restriction for ${durationHours} hours`}`,
          adminId,
          adminNotes
        );
      }
      
      return true;
      
    } catch (error) {
      console.error('Error updating user restriction:', error);
      return false;
    }
  }
};
