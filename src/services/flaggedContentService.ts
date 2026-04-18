/**
 * Flagged Content Service
 * --------------------------------------------------------------
 * Manages flagged events and venues that violate platform policies.
 * Provides functionality for flagging, unflagging, and taking actions
 * on content that violates community guidelines or terms of service.
 */

import { createClient } from '@/lib/supabase/client/client';

export type FlaggedContentType = 'event' | 'venue';
export type FlagStatus = 'flagged' | 'reviewed' | 'dismissed';
export type FlagReason = 'inappropriate_content' | 'spam' | 'fake_listing' | 'policy_violation' | 'manual_review' | 'automated_detection';

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  type: 'keyword' | 'pattern' | 'manual';
  rules: {
    keywords?: string[];
    patterns?: string[];
    severity?: 'low' | 'medium' | 'high';
  };
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlaggedContent {
  id: string;
  content_type: FlaggedContentType;
  content_id: string;
  reason: FlagReason;
  status: FlagStatus;
  flagged_by: string; // user_id of who flagged it (system for automated)
  flagged_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  policy_rule_id?: string;
  auto_flagged: boolean;
  metadata: {
    content_title?: string;
    content_description?: string;
    owner_id?: string;
    owner_name?: string;
    violation_details?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface FlaggedContentWithDetails extends FlaggedContent {
  content_details: {
    title: string;
    description?: string;
    created_at: string;
    owner_id: string;
    owner_name: string;
    status?: string;
    image_url?: string;
  };
}

export const flaggedContentService = {
  /**
   * Check if user is admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    const supabase = createClient();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return false;
      
      const userRole = user.user_metadata?.role;
      const userEmail = user.email;
      
      return (
        userRole === 'admin' ||
        userRole === 'super_admin' ||
        userEmail === 'admin@locked.com' ||
        userEmail === 'admin@locked.gh'
      );
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  },

  /**
   * Get all policy rules
   */
  async getPolicyRules(): Promise<PolicyRule[]> {
    // For now, return hardcoded simple rules that can be expanded later
    return [
      {
        id: 'rule_1',
        name: 'Prohibited Keywords',
        description: 'Flags content containing inappropriate or prohibited keywords',
        type: 'keyword',
        rules: {
          keywords: ['spam', 'scam', 'illegal', 'fake', 'fraud', 'stolen'],
          severity: 'high'
        },
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'rule_2',
        name: 'Suspicious Patterns',
        description: 'Flags content with suspicious patterns like excessive capitals or special characters',
        type: 'pattern',
        rules: {
          patterns: [
            '[A-Z]{10,}', // 10+ consecutive capitals
            '[$£€¥]{3,}', // Multiple currency symbols
            '[!@#$%^&*()]{5,}' // 5+ consecutive special chars
          ],
          severity: 'medium'
        },
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'rule_3',
        name: 'Manual Review Required',
        description: 'Content requiring manual review based on user reports',
        type: 'manual',
        rules: {
          severity: 'low'
        },
        enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  },

  /**
   * Check content against policy rules
   */
  async checkContentAgainstPolicies(
    content: { title: string; description?: string }, 
    contentType: FlaggedContentType
  ): Promise<{ violated: boolean; rule?: PolicyRule; reason?: string }> {
    const rules = await this.getPolicyRules();
    
    for (const rule of rules) {
      if (!rule.enabled) continue;
      
      const textToCheck = `${content.title} ${content.description || ''}`.toLowerCase();
      
      if (rule.type === 'keyword' && rule.rules.keywords) {
        for (const keyword of rule.rules.keywords) {
          if (textToCheck.includes(keyword.toLowerCase())) {
            return {
              violated: true,
              rule,
              reason: `Contains prohibited keyword: "${keyword}"`
            };
          }
        }
      }
      
      if (rule.type === 'pattern' && rule.rules.patterns) {
        for (const pattern of rule.rules.patterns) {
          const regex = new RegExp(pattern);
          if (regex.test(content.title + ' ' + (content.description || ''))) {
            return {
              violated: true,
              rule,
              reason: `Matches suspicious pattern: ${pattern}`
            };
          }
        }
      }
    }
    
    return { violated: false };
  },

  /**
   * Flag content for policy violation
   */
  async flagContent(
    contentType: FlaggedContentType,
    contentId: string,
    reason: FlagReason,
    flaggedBy: string,
    policyRuleId?: string,
    violationDetails?: string,
    autoFlagged = false
  ): Promise<FlaggedContent> {
    const supabase = createClient();
    
    // Get content details to store metadata
    let contentDetails: any = null;
    if (contentType === 'event') {
      const { data } = await supabase.from('events').select('*').eq('id', contentId).single();
      contentDetails = data;
    } else if (contentType === 'venue') {
      const { data } = await supabase.from('venues').select('*').eq('id', contentId).single();
      contentDetails = data;
    }

    const flaggedContent: Omit<FlaggedContent, 'id' | 'created_at' | 'updated_at'> = {
      content_type: contentType,
      content_id: contentId,
      reason,
      status: 'flagged',
      flagged_by: flaggedBy,
      flagged_at: new Date().toISOString(),
      policy_rule_id: policyRuleId,
      auto_flagged: autoFlagged,
      metadata: {
        content_title: contentDetails?.title || contentDetails?.name,
        content_description: contentDetails?.description,
        owner_id: contentDetails?.organizer_id || contentDetails?.user_id,
        owner_name: contentDetails?.organizer_name || 'Unknown',
        violation_details: violationDetails
      }
    };

    // For now, store in localStorage (in real app, this would go to database)
    try {
      const existingFlags = JSON.parse(localStorage.getItem('flagged_content') || '[]');
      const newFlag: FlaggedContent = {
        ...flaggedContent,
        id: `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      existingFlags.push(newFlag);
      localStorage.setItem('flagged_content', JSON.stringify(existingFlags));
      
      return newFlag;
    } catch (error) {
      console.error('Error flagging content:', error);
      throw error;
    }
  },

  /**
   * Get all flagged content with details
   */
  async getFlaggedContent(filters?: {
    contentType?: FlaggedContentType;
    status?: FlagStatus;
    reason?: FlagReason;
  }): Promise<FlaggedContentWithDetails[]> {
    const supabase = createClient();
    
    try {
      // Get flagged content from localStorage
      const flaggedContent: FlaggedContent[] = JSON.parse(
        localStorage.getItem('flagged_content') || '[]'
      );
      
      // Filter if requested
      let filtered = flaggedContent;
      if (filters?.contentType) {
        filtered = filtered.filter(item => item.content_type === filters.contentType);
      }
      if (filters?.status) {
        filtered = filtered.filter(item => item.status === filters.status);
      }
      if (filters?.reason) {
        filtered = filtered.filter(item => item.reason === filters.reason);
      }
      
      // Enhance with current content details
      const enhancedContent: FlaggedContentWithDetails[] = [];
      
      for (const item of filtered) {
        try {
          let contentDetails: any = null;
          
          if (item.content_type === 'event') {
            const { data } = await supabase
              .from('events')
              .select('id, title, description, created_at, organizer_id, status, image_url')
              .eq('id', item.content_id)
              .single();
            
            if (data) {
              contentDetails = {
                title: data.title,
                description: data.description,
                created_at: data.created_at,
                owner_id: data.organizer_id,
                owner_name: 'Event Organizer', // This could be enhanced with organizer lookup
                status: data.status,
                image_url: data.image_url
              };
            }
          } else if (item.content_type === 'venue') {
            const { data } = await supabase
              .from('venues')
              .select('id, name, description, created_at, user_id, status, image_urls')
              .eq('id', item.content_id)
              .single();
            
            if (data) {
              contentDetails = {
                title: data.name,
                description: data.description,
                created_at: data.created_at,
                owner_id: data.user_id,
                owner_name: 'Venue Owner', // This could be enhanced with user lookup
                status: data.status,
                image_url: data.image_urls?.[0]
              };
            }
          }
          
          // If content still exists, add to list
          if (contentDetails) {
            enhancedContent.push({
              ...item,
              content_details: contentDetails
            });
          }
        } catch (error) {
          console.warn(`Error fetching details for ${item.content_type} ${item.content_id}:`, error);
          // Include item with metadata as fallback
          enhancedContent.push({
            ...item,
            content_details: {
              title: item.metadata.content_title || 'Unknown Content',
              description: item.metadata.content_description,
              created_at: item.created_at,
              owner_id: item.metadata.owner_id || 'unknown',
              owner_name: item.metadata.owner_name || 'Unknown Owner'
            }
          });
        }
      }
      
      // Sort by flagged date (newest first)
      enhancedContent.sort((a, b) => 
        new Date(b.flagged_at).getTime() - new Date(a.flagged_at).getTime()
      );
      
      return enhancedContent;
    } catch (error) {
      console.error('Error getting flagged content:', error);
      return [];
    }
  },

  /**
   * Update flagged content status (review, dismiss, etc.)
   */
  async updateFlaggedContent(
    flagId: string,
    updates: {
      status?: FlagStatus;
      reviewed_by?: string;
      review_notes?: string;
    }
  ): Promise<FlaggedContent | null> {
    try {
      const flaggedContent: FlaggedContent[] = JSON.parse(
        localStorage.getItem('flagged_content') || '[]'
      );
      
      const index = flaggedContent.findIndex(item => item.id === flagId);
      if (index === -1) {
        throw new Error('Flagged content not found');
      }
      
      // Update the item
      flaggedContent[index] = {
        ...flaggedContent[index],
        ...updates,
        reviewed_at: updates.status !== 'flagged' ? new Date().toISOString() : flaggedContent[index].reviewed_at,
        updated_at: new Date().toISOString()
      };
      
      localStorage.setItem('flagged_content', JSON.stringify(flaggedContent));
      
      return flaggedContent[index];
    } catch (error) {
      console.error('Error updating flagged content:', error);
      return null;
    }
  },

  /**
   * Remove content (for admins)
   */
  async removeContent(
    contentType: FlaggedContentType,
    contentId: string,
    userId: string
  ): Promise<boolean> {
    const supabase = createClient();
    const isUserAdmin = await this.isAdmin(userId);
    
    if (!isUserAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }
    
    try {
      if (contentType === 'event') {
        const { error } = await supabase
          .from('events')
          .delete()
          .eq('id', contentId);
        
        if (error) throw error;
      } else if (contentType === 'venue') {
        const { error } = await supabase
          .from('venues')
          .delete()
          .eq('id', contentId);
        
        if (error) throw error;
      }
      
      // Also remove from flagged content
      const flaggedContent: FlaggedContent[] = JSON.parse(
        localStorage.getItem('flagged_content') || '[]'
      );
      
      const updatedFlags = flaggedContent.filter(
        item => !(item.content_type === contentType && item.content_id === contentId)
      );
      
      localStorage.setItem('flagged_content', JSON.stringify(updatedFlags));
      
      return true;
    } catch (error) {
      console.error('Error removing content:', error);
      return false;
    }
  },

  /**
   * Get flagged content statistics
   */
  async getFlaggedContentStats(): Promise<{
    total: number;
    by_type: { events: number; venues: number };
    by_status: { flagged: number; reviewed: number; dismissed: number };
    by_reason: Record<FlagReason, number>;
    recent_flags: number; // last 7 days
  }> {
    try {
      const flaggedContent: FlaggedContent[] = JSON.parse(
        localStorage.getItem('flagged_content') || '[]'
      );
      
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const stats = {
        total: flaggedContent.length,
        by_type: {
          events: flaggedContent.filter(item => item.content_type === 'event').length,
          venues: flaggedContent.filter(item => item.content_type === 'venue').length
        },
        by_status: {
          flagged: flaggedContent.filter(item => item.status === 'flagged').length,
          reviewed: flaggedContent.filter(item => item.status === 'reviewed').length,
          dismissed: flaggedContent.filter(item => item.status === 'dismissed').length
        },
        by_reason: {
          inappropriate_content: flaggedContent.filter(item => item.reason === 'inappropriate_content').length,
          spam: flaggedContent.filter(item => item.reason === 'spam').length,
          fake_listing: flaggedContent.filter(item => item.reason === 'fake_listing').length,
          policy_violation: flaggedContent.filter(item => item.reason === 'policy_violation').length,
          manual_review: flaggedContent.filter(item => item.reason === 'manual_review').length,
          automated_detection: flaggedContent.filter(item => item.reason === 'automated_detection').length
        },
        recent_flags: flaggedContent.filter(
          item => new Date(item.flagged_at) >= sevenDaysAgo
        ).length
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting flagged content stats:', error);
      return {
        total: 0,
        by_type: { events: 0, venues: 0 },
        by_status: { flagged: 0, reviewed: 0, dismissed: 0 },
        by_reason: {
          inappropriate_content: 0,
          spam: 0,
          fake_listing: 0,
          policy_violation: 0,
          manual_review: 0,
          automated_detection: 0
        },
        recent_flags: 0
      };
    }
  }
};
