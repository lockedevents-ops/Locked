/**
 * Policy Service
 * --------------------------------------------------------------
 * Handles policy checking and flagging of events and venues.
 * This service will evaluate content against policy rules and flag violations.
 */

import { createClient } from '@/lib/supabase/client/client';
import { userOffenseService, type OffenseType, type SeverityLevel } from './userOffenseService';

export interface FlaggedItem {
  id: string;
  item_type: 'event' | 'venue';
  item_id: string;
  policy_violation: string;
  violation_details: string;
  flagged_at: string;
  flagged_by: string; // user_id or 'system'
  reviewed: boolean;
  reviewed_at?: string;
  reviewed_by?: string;
  resolution: 'pending' | 'unflagged' | 'removed' | 'warning_issued';
  admin_notes?: string;
  is_active: boolean; // whether the flag is still active
  severity: 'low' | 'medium' | 'high' | 'critical';
  auto_generated: boolean; // whether flagged by automated system or manual
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  rule_type: 'content' | 'spam' | 'inappropriate' | 'fraud' | 'safety';
  keywords: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  auto_action: 'flag' | 'hide' | 'remove';
  is_active: boolean;
}

// Simple policy rules (can be expanded later)
// Helper function to map rule types to offense types
const mapRuleTypeToOffenseType = (ruleType: string): OffenseType => {
  switch (ruleType) {
    case 'inappropriate': return 'inappropriate';
    case 'spam': return 'spam';
    case 'fraud': return 'fraud';
    case 'safety': return 'safety';
    default: return 'content';
  }
};

// Helper function to map severity levels
const mapSeverity = (severity: string): SeverityLevel => {
  const validSeverities: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];
  return validSeverities.includes(severity as SeverityLevel) ? severity as SeverityLevel : 'medium';
};

const DEFAULT_POLICY_RULES: Omit<PolicyRule, 'id'>[] = [
  {
    name: 'Inappropriate Content',
    description: 'Content contains inappropriate language or themes',
    rule_type: 'inappropriate',
    keywords: ['fuck', 'shit', 'damn', 'sexual', 'nude', 'porn', 'xxx'],
    severity: 'high',
    auto_action: 'flag',
    is_active: true,
  },
  {
    name: 'Spam Detection',
    description: 'Content appears to be spam or promotional',
    rule_type: 'spam',
    keywords: ['buy now', 'click here', 'limited time', 'act fast', 'guaranteed', 'free money'],
    severity: 'medium',
    auto_action: 'flag',
    is_active: true,
  },
  {
    name: 'Potential Fraud',
    description: 'Content may contain fraudulent claims',
    rule_type: 'fraud',
    keywords: ['get rich quick', 'make money fast', 'guaranteed returns', 'no risk', 'secret method'],
    severity: 'critical',
    auto_action: 'flag',
    is_active: true,
  },
  {
    name: 'Safety Concerns',
    description: 'Content may pose safety risks',
    rule_type: 'safety',
    keywords: ['dangerous', 'unsafe', 'no safety measures', 'risk of injury', 'hazardous'],
    severity: 'high',
    auto_action: 'flag',
    is_active: true,
  },
];

export const policyService = {
  /**
   * Check if user is admin or super admin (deprecated - client side auth preferred)
   */
  async isAdmin(): Promise<boolean> {
    console.warn('[PolicyService] Server-side admin check is deprecated. Use client-side auth context instead.');
    return true; // Allow all requests through, client-side auth will handle it
  },

  /**
   * Initialize policy rules in database (run once during setup)
   */
  async initializePolicyRules(): Promise<void> {
    const supabase = createClient();
    
    try {
      // Check if rules already exist
      const { data: existingRules, error: checkError } = await supabase
        .from('policy_rules')
        .select('id')
        .limit(1);

      if (checkError) {
        console.error('Error checking existing policy rules:', checkError);
        return;
      }

      // Only insert if no rules exist
      if (!existingRules || existingRules.length === 0) {
        const { error: insertError } = await supabase
          .from('policy_rules')
          .insert(DEFAULT_POLICY_RULES);

        if (insertError) {
          console.error('Error inserting policy rules:', insertError);
        } else {
          console.log('Policy rules initialized successfully');
        }
      }
    } catch (error) {
      console.error('Error initializing policy rules:', error);
    }
  },

  /**
   * Evaluate content against policy rules
   */
  async evaluateContent(content: string): Promise<{
    violations: Array<{
      rule: PolicyRule;
      matchedKeywords: string[];
    }>;
    shouldFlag: boolean;
    highestSeverity: 'low' | 'medium' | 'high' | 'critical' | null;
  }> {
    const supabase = createClient();
    
    try {
      const { data: rules, error } = await supabase
        .from('policy_rules')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching policy rules:', error);
        return { violations: [], shouldFlag: false, highestSeverity: null };
      }

      const violations = [];
      let highestSeverity: 'low' | 'medium' | 'high' | 'critical' | null = null;
      
      const contentLower = content.toLowerCase();

      for (const rule of rules || []) {
        const matchedKeywords = rule.keywords.filter((keyword: string) => 
          contentLower.includes(keyword.toLowerCase())
        );

        if (matchedKeywords.length > 0) {
          violations.push({ rule, matchedKeywords });
          
          // Update highest severity
          const severityLevels: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
          if (!highestSeverity || severityLevels[rule.severity] > severityLevels[highestSeverity]) {
            highestSeverity = rule.severity as 'low' | 'medium' | 'high' | 'critical';
          }
        }
      }

      return {
        violations,
        shouldFlag: violations.length > 0,
        highestSeverity,
      };
    } catch (error) {
      console.error('Error evaluating content:', error);
      return { violations: [], shouldFlag: false, highestSeverity: null };
    }
  },

  /**
   * Flag an event for policy violation
   */
  async flagEvent(eventId: string, violation: string, details: string, flaggedBy: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium', autoGenerated = true): Promise<void> {
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('flagged_items')
        .insert({
          item_type: 'event',
          item_id: eventId,
          policy_violation: violation,
          violation_details: details,
          flagged_by: flaggedBy,
          severity,
          auto_generated: autoGenerated,
          reviewed: false,
          resolution: 'pending',
          is_active: true,
        });

      if (error) {
        console.error('Error flagging event:', error);
        throw error;
      }

      console.log(`Event ${eventId} flagged for: ${violation}`);
    } catch (error) {
      console.error('Error flagging event:', error);
      throw error;
    }
  },

  /**
   * Flag a venue for policy violation
   */
  async flagVenue(venueId: string, violation: string, details: string, flaggedBy: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium', autoGenerated = true): Promise<void> {
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('flagged_items')
        .insert({
          item_type: 'venue',
          item_id: venueId,
          policy_violation: violation,
          violation_details: details,
          flagged_by: flaggedBy,
          severity,
          auto_generated: autoGenerated,
          reviewed: false,
          resolution: 'pending',
          is_active: true,
        });

      if (error) {
        console.error('Error flagging venue:', error);
        throw error;
      }

      console.log(`Venue ${venueId} flagged for: ${violation}`);
    } catch (error) {
      console.error('Error flagging venue:', error);
      throw error;
    }
  },

  /**
   * Automatically check and flag an event
   */
  async checkAndFlagEvent(eventId: string, eventData: any, userId = 'system'): Promise<void> {
    try {
      // Combine title and description for evaluation
      const contentToCheck = `${eventData.title || ''} ${eventData.description || ''}`.trim();
      
      if (!contentToCheck) return;

      // First, check for similar content (repeat offenses)
      const organizerId = eventData.organizer_id || userId;
      const similarContent = await userOffenseService.checkContentSimilarity(
        organizerId,
        contentToCheck,
        'event',
        eventId
      );

      // If similar content found with high similarity, flag it immediately as a repeat offense
      const repeatOffense = similarContent.find(c => c.flagged_as_repeat);
      if (repeatOffense) {
        // ✅ SECURITY: Removed sensitive organizer ID logging
        
        // Flag immediately with higher severity
        await this.flagEvent(
          eventId,
          'Repeat Policy Violation',
          `Repeat offense: Attempting to republish similar content that was previously flagged. Similarity score: ${repeatOffense.similarity_score?.toFixed(2)}`,
          userId,
          'high', // Increase severity for repeat offenses
          true
        );
        
        // Record this as a repeat offense
        try {
          await userOffenseService.recordOffense(
            organizerId,
            'content', // General offense type for repeat violations
            'event',
            eventId,
            'Attempting to republish similar flagged content',
            'high',
            contentToCheck,
            undefined,
            userId === 'system' ? undefined : userId
          );
        } catch (offenseError) {
          console.error('Error recording repeat offense:', offenseError);
        }
        
        return; // Already flagged, no need to continue with regular policy check
      }

      // Continue with regular policy check
      const evaluation = await this.evaluateContent(contentToCheck);

      if (evaluation.shouldFlag) {
        const violationSummary = evaluation.violations.map(v => v.rule.name).join(', ');
        const keywordDetails = evaluation.violations.map(v => 
          `${v.rule.name}: ${v.matchedKeywords.join(', ')}`
        ).join('; ');

        // Flag the event
        await this.flagEvent(
          eventId,
          violationSummary,
          `Automatic flag: ${keywordDetails}`,
          userId,
          evaluation.highestSeverity || 'medium',
          true
        );
        
        // Also record the offense in the user offenses system
        if (evaluation.violations.length > 0 && organizerId !== 'system') {
          try {
            const firstViolation = evaluation.violations[0];
            const offenseType = mapRuleTypeToOffenseType(firstViolation.rule.rule_type);
            const severity = mapSeverity(evaluation.highestSeverity || 'medium');
            
            await userOffenseService.recordOffense(
              organizerId,
              offenseType,
              'event',
              eventId,
              keywordDetails,
              severity,
              contentToCheck,
              undefined,
              userId === 'system' ? undefined : userId
            );
          } catch (offenseError) {
            console.error('Error recording user offense:', offenseError);
          }
        }
      }
    } catch (error) {
      console.error('Error checking and flagging event:', error);
    }
  },

  /**
   * Automatically check and flag a venue
   */
  async checkAndFlagVenue(venueId: string, venueData: any, userId = 'system'): Promise<void> {
    try {
      // Combine name and description for evaluation
      const contentToCheck = `${venueData.name || ''} ${venueData.description || ''}`.trim();
      
      if (!contentToCheck) return;
      
      // First, check for similar content (repeat offenses)
      const ownerId = venueData.user_id || userId;
      const similarContent = await userOffenseService.checkContentSimilarity(
        ownerId,
        contentToCheck,
        'venue',
        venueId
      );

      // If similar content found with high similarity, flag it immediately as a repeat offense
      const repeatOffense = similarContent.find((c: any) => c.flagged_as_repeat);
      if (repeatOffense) {
        // ✅ SECURITY: Removed sensitive owner ID logging
        
        // Flag immediately with higher severity
        await this.flagVenue(
          venueId,
          'Repeat Policy Violation',
          `Repeat offense: Attempting to republish similar content that was previously flagged. Similarity score: ${repeatOffense.similarity_score?.toFixed(2)}`,
          userId,
          'high', // Increase severity for repeat offenses
          true
        );
        
        // Record this as a repeat offense
        try {
          await userOffenseService.recordOffense(
            ownerId,
            'content', // General offense type for repeat violations
            'venue',
            venueId,
            'Attempting to republish similar flagged content',
            'high',
            contentToCheck,
            undefined,
            userId === 'system' ? undefined : userId
          );
        } catch (offenseError) {
          console.error('Error recording repeat offense:', offenseError);
        }
        
        return; // Already flagged, no need to continue with regular policy check
      }

      // Continue with regular policy check
      const evaluation = await this.evaluateContent(contentToCheck);

      if (evaluation.shouldFlag) {
        const violationSummary = evaluation.violations.map(v => v.rule.name).join(', ');
        const keywordDetails = evaluation.violations.map(v => 
          `${v.rule.name}: ${v.matchedKeywords.join(', ')}`
        ).join('; ');

        // Flag the venue
        await this.flagVenue(
          venueId,
          violationSummary,
          `Automatic flag: ${keywordDetails}`,
          userId,
          evaluation.highestSeverity || 'medium',
          true
        );
        
        // Also record the offense in the user offenses system
        if (evaluation.violations.length > 0 && ownerId !== 'system') {
          try {
            const firstViolation = evaluation.violations[0];
            const offenseType = mapRuleTypeToOffenseType(firstViolation.rule.rule_type);
            const severity = mapSeverity(evaluation.highestSeverity || 'medium');
            
            await userOffenseService.recordOffense(
              ownerId,
              offenseType,
              'venue',
              venueId,
              keywordDetails,
              severity,
              contentToCheck,
              undefined,
              userId === 'system' ? undefined : userId
            );
          } catch (offenseError) {
            console.error('Error recording user offense:', offenseError);
          }
        }
      }
    } catch (error) {
      console.error('Error checking and flagging venue:', error);
    }
  },

  /**
   * Get all flagged items
   */
  async getFlaggedItems(filters?: {
    item_type?: 'event' | 'venue';
    resolution?: 'pending' | 'unflagged' | 'removed' | 'warning_issued';
    severity?: 'low' | 'medium' | 'high' | 'critical';
    reviewed?: boolean;
    is_active?: boolean;
  }): Promise<Array<FlaggedItem & { item_details?: any }>> {
    const supabase = createClient();
    
    try {
      let query = supabase
        .from('flagged_items')
        .select('*')
        .order('flagged_at', { ascending: false });

      if (filters?.item_type) {
        query = query.eq('item_type', filters.item_type);
      }
      if (filters?.resolution) {
        query = query.eq('resolution', filters.resolution);
      }
      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters?.reviewed !== undefined) {
        query = query.eq('reviewed', filters.reviewed);
      }
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const { data: flaggedItems, error } = await query;

      if (error) {
        console.error('Error fetching flagged items:', error);
        throw error;
      }

      // Fetch additional item details
      const itemsWithDetails = await Promise.all(
        (flaggedItems || []).map(async (item: any) => {
          let itemDetails = null;
          
          try {
            if (item.item_type === 'event') {
              const { data: eventData } = await supabase
                .from('events')
                .select('id, title, description, status, start_date')
                .eq('id', item.item_id)
                .single();
              itemDetails = eventData;
            } else if (item.item_type === 'venue') {
              const { data: venueData } = await supabase
                .from('venues')
                .select('id, name, description, status')
                .eq('id', item.item_id)
                .single();
              itemDetails = venueData;
            }
          } catch (error) {
            console.warn(`Error fetching details for ${item.item_type} ${item.item_id}:`, error);
          }

          return {
            ...item,
            item_details: itemDetails,
          };
        })
      );

      return itemsWithDetails;
    } catch (error) {
      console.error('Error getting flagged items:', error);
      throw error;
    }
  },

  /**
   * Unflag an item (mark as resolved)
   */
  async unflagItem(flagId: string, adminId: string, adminNotes?: string): Promise<void> {
    const supabase = createClient();
    
    try {
      const { error } = await supabase
        .from('flagged_items')
        .update({
          reviewed: true,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId,
          resolution: 'unflagged',
          admin_notes: adminNotes || null,
          is_active: false,
        })
        .eq('id', flagId);

      if (error) {
        console.error('Error unflagging item:', error);
        throw error;
      }

      console.log(`Flag ${flagId} removed by admin ${adminId}`);
    } catch (error) {
      console.error('Error unflagging item:', error);
      throw error;
    }
  },

  /**
   * Remove flagged item (mark item as removed and resolve flag)
   */
  async removeItem(flagId: string, adminId: string, adminNotes?: string): Promise<void> {
    const supabase = createClient();
    
    try {
      // First get the flagged item details
      const { data: flaggedItem, error: fetchError } = await supabase
        .from('flagged_items')
        .select('*')
        .eq('id', flagId)
        .single();

      if (fetchError || !flaggedItem) {
        throw new Error('Flagged item not found');
      }

      // Update the actual item status to cancelled/inactive
      if (flaggedItem.item_type === 'event') {
        await supabase
          .from('events')
          .update({ status: 'cancelled' })
          .eq('id', flaggedItem.item_id);
      } else if (flaggedItem.item_type === 'venue') {
        await supabase
          .from('venues')
          .update({ status: 'inactive' })
          .eq('id', flaggedItem.item_id);
      }

      // Update the flag as resolved
      const { error } = await supabase
        .from('flagged_items')
        .update({
          reviewed: true,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId,
          resolution: 'removed',
          admin_notes: adminNotes || null,
          is_active: false,
        })
        .eq('id', flagId);

      if (error) {
        console.error('Error removing flagged item:', error);
        throw error;
      }

      console.log(`${flaggedItem.item_type} ${flaggedItem.item_id} removed by admin ${adminId}`);
    } catch (error) {
      console.error('Error removing flagged item:', error);
      throw error;
    }
  },

  /**
   * Get flagged items statistics
   */
  async getFlaggedItemsStats(): Promise<{
    total: number;
    pending: number;
    resolved: number;
    events: number;
    venues: number;
    by_severity: Record<string, number>;
  }> {
    const supabase = createClient();
    
    try {
      const { data: items, error } = await supabase
        .from('flagged_items')
        .select('item_type, resolution, severity, is_active');

      if (error) {
        console.error('Error fetching flagged items stats:', error);
        throw error;
      }

      const stats = {
        total: items?.length || 0,
        pending: items?.filter((item: any) => item.resolution === 'pending').length || 0,
        resolved: items?.filter((item: any) => item.resolution !== 'pending').length || 0,
        events: items?.filter((item: any) => item.item_type === 'event').length || 0,
        venues: items?.filter((item: any) => item.item_type === 'venue').length || 0,
        by_severity: {
          low: items?.filter((item: any) => item.severity === 'low').length || 0,
          medium: items?.filter((item: any) => item.severity === 'medium').length || 0,
          high: items?.filter((item: any) => item.severity === 'high').length || 0,
          critical: items?.filter((item: any) => item.severity === 'critical').length || 0,
        },
      };

      return stats;
    } catch (error) {
      console.error('Error getting flagged items stats:', error);
      throw error;
    }
  },
};
