/**
 * Unified Settings Service
 * 
 * Handles settings operations across multiple user roles with:
 * - Role-aware data fetching and updating
 * - Cross-role settings synchronization
 * - Audit trail logging
 * - Permission validation
 * - Multi-role impact analysis
 */

import { userSettingsService, type UserProfile, type SecuritySettings, type NotificationSettings, type PrivacySettings, type AccountPreferences } from './userSettingsService';

export interface RoleContext {
  isOrganizer: boolean;
  isVenueOwner: boolean;
  roles: string[];
}

export interface UnifiedSettings {
  profile: UserProfile | null;
  security: SecuritySettings;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  preferences: AccountPreferences;
  organizationProfile?: any; // Organization profile for business roles
  roleSettings?: any; // Role-specific settings
  teamMembers?: any[]; // Team members for business roles
  paymentMethods?: any[]; // Payment methods
}

export interface SettingsUpdateResult {
  success: boolean;
  affectedRoles: string[];
  changes: Record<string, any>;
  warnings?: string[];
  error?: string;
}

export class UnifiedSettingsService {
  
  /**
   * Load all settings for a user across all their roles
   */
  async loadAllSettings(userId: string, roleContext: RoleContext): Promise<UnifiedSettings> {
    try {
      // Load base settings (always present)
      const [profile, security, notifications, privacy, preferences] = await Promise.all([
        userSettingsService.getUserProfile(userId),
        userSettingsService.getSecuritySettings(userId),
        userSettingsService.getNotificationSettings(userId),
        userSettingsService.getPrivacySettings(userId),
        userSettingsService.getAccountPreferences(userId)
      ]);

      const settings: UnifiedSettings = {
        profile,
        security,
        notifications,
        privacy,
        preferences
      };

      // Load business role settings if applicable
      if (roleContext.isOrganizer || roleContext.isVenueOwner) {
        try {
          // Load organization profile, team members, payment methods
          settings.organizationProfile = await this.loadOrganizationProfile(userId);
          settings.teamMembers = await this.loadTeamMembers(userId);
          settings.paymentMethods = await this.loadPaymentMethods(userId, roleContext.roles);
        } catch (error) {
          console.warn('Failed to load business role settings:', error);
        }
      }

      // Load role-specific configurations
      if (roleContext.roles.length > 1) {
        settings.roleSettings = await this.loadRoleSpecificSettings(userId, roleContext.roles);
      }

      return settings;
    } catch (error) {
      console.error('Error loading unified settings:', error);
      throw new Error('Failed to load settings');
    }
  }

  /**
   * Update settings with role-aware validation and impact analysis
   */
  async updateSettings(
    userId: string, 
    roleContext: RoleContext,
    settingsType: 'profile' | 'security' | 'notifications' | 'privacy' | 'preferences' | 'organization',
    updates: Record<string, any>
  ): Promise<SettingsUpdateResult> {
    try {
      // Validate permissions
      const hasPermission = this.validateUpdatePermissions(settingsType, roleContext);
      if (!hasPermission.allowed) {
        return {
          success: false,
          affectedRoles: [],
          changes: {},
          error: hasPermission.reason
        };
      }

      // Analyze impact across roles
      const impactAnalysis = this.analyzeMultiRoleImpact(settingsType, updates, roleContext);
      
      let result: any;
      let affectedRoles = impactAnalysis.affectedRoles;

      // Apply updates based on settings type
      switch (settingsType) {
        case 'profile':
          result = await userSettingsService.updateUserProfile(userId, updates);
          break;
        case 'security':
          result = await userSettingsService.updateSecuritySettings(userId, updates);
          break;
        case 'notifications':
          result = await userSettingsService.updateNotificationSettings(userId, updates);
          break;
        case 'privacy':
          result = await userSettingsService.updatePrivacySettings(userId, updates);
          break;
        case 'preferences':
          result = await userSettingsService.updateAccountPreferences(userId, updates);
          break;
        case 'organization':
          result = await this.updateOrganizationProfile(userId, updates);
          affectedRoles = roleContext.roles.filter(r => ['organizer', 'venue_owner'].includes(r));
          break;
        default:
          throw new Error(`Unsupported settings type: ${settingsType}`);
      }

      // Log the change with role context
      await this.logSettingsChange(userId, settingsType, updates, roleContext, affectedRoles);

      return {
        success: true,
        affectedRoles,
        changes: updates,
        warnings: impactAnalysis.warnings
      };

    } catch (error) {
      console.error('Error updating settings:', error);
      return {
        success: false,
        affectedRoles: [],
        changes: {},
        error: error instanceof Error ? error.message : 'Update failed'
      };
    }
  }

  /**
   * Analyze the impact of settings changes across multiple roles
   */
  private analyzeMultiRoleImpact(
    settingsType: string, 
    updates: Record<string, any>, 
    roleContext: RoleContext
  ) {
    const analysis = {
      affectedRoles: ['user'] as string[],
      warnings: [] as string[]
    };

    // Profile changes affect all roles
    if (settingsType === 'profile') {
      analysis.affectedRoles = [...roleContext.roles];
      if (roleContext.roles.length > 1) {
        analysis.warnings.push('Profile changes will affect how you appear in all dashboards');
      }
    }

    // Security changes affect all roles
    if (settingsType === 'security') {
      analysis.affectedRoles = [...roleContext.roles];
      if (updates.twoFactorEnabled !== undefined) {
        analysis.warnings.push('2FA changes will affect access to all your dashboards');
      }
    }

    // Notification changes can be role-specific
    if (settingsType === 'notifications') {
      analysis.affectedRoles = [...roleContext.roles];
      if (roleContext.isOrganizer && roleContext.isVenueOwner) {
        analysis.warnings.push('Notification settings apply to both organizer and venue owner activities');
      }
    }

    // Privacy changes affect public-facing profiles
    if (settingsType === 'privacy') {
      analysis.affectedRoles = [...roleContext.roles];
      if (roleContext.roles.length > 1) {
        analysis.warnings.push('Privacy settings affect your visibility in events, venues, and business directories');
      }
    }

    return analysis;
  }

  /**
   * Validate if user has permission to update specific settings
   */
  private validateUpdatePermissions(settingsType: string, roleContext: RoleContext) {
    // Base settings can be updated by anyone
    if (['profile', 'security', 'notifications', 'privacy', 'preferences'].includes(settingsType)) {
      return { allowed: true };
    }

    // Organization settings require business role
    if (settingsType === 'organization') {
      if (!roleContext.isOrganizer && !roleContext.isVenueOwner) {
        return { 
          allowed: false, 
          reason: 'Organization settings require organizer or venue owner role' 
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get account deletion impact analysis
   */
  async getAccountDeletionImpact(userId: string, roleContext: RoleContext) {
    const impact = {
      totalRoles: roleContext.roles.length,
      affectedRoles: roleContext.roles,
      personalData: {
        profile: true,
        settings: true,
        preferences: true
      },
      businessData: {
        organizationProfile: false,
        events: 0,
        venues: 0,
        teamMembers: 0,
        revenue: 0
      },
      warnings: [] as string[]
    };

    try {
      // Analyze business role impact
      if (roleContext.isOrganizer || roleContext.isVenueOwner) {
        impact.businessData.organizationProfile = true;

        // Get business data counts (this would be real data in implementation)
        if (roleContext.isOrganizer) {
          impact.businessData.events = await this.getEventsCount(userId);
          impact.warnings.push(`${impact.businessData.events} events and associated attendee data`);
        }

        if (roleContext.isVenueOwner) {
          impact.businessData.venues = await this.getVenuesCount(userId);
          impact.warnings.push(`${impact.businessData.venues} venues and associated booking data`);
        }

        impact.businessData.teamMembers = await this.getTeamMembersCount(userId);
        if (impact.businessData.teamMembers > 0) {
          impact.warnings.push(`Team access for ${impact.businessData.teamMembers} members`);
        }
      }

      // Add general warnings
      if (roleContext.roles.length > 1) {
        impact.warnings.unshift('This will delete ALL your roles and associated data');
      }

    } catch (error) {
      console.error('Error analyzing deletion impact:', error);
    }

    return impact;
  }

  /**
   * Export all user data across roles
   */
  async exportAllUserData(userId: string, roleContext: RoleContext) {
    try {
      const exportData = {
        exportInfo: {
          userId,
          roles: roleContext.roles,
          exportedAt: new Date().toISOString()
        },
        personalData: {},
        businessData: {}
      };

      // Export base settings
      exportData.personalData = await userSettingsService.exportUserData(userId);

      // Export business data if applicable
      if (roleContext.isOrganizer || roleContext.isVenueOwner) {
        exportData.businessData = {
          organizationProfile: await this.loadOrganizationProfile(userId),
          teamMembers: await this.loadTeamMembers(userId),
          paymentMethods: await this.loadPaymentMethods(userId, roleContext.roles),
          ...(roleContext.isOrganizer && { 
            events: await this.exportEventsData(userId),
            analytics: await this.exportAnalyticsData(userId, 'organizer')
          }),
          ...(roleContext.isVenueOwner && { 
            venues: await this.exportVenuesData(userId),
            bookings: await this.exportBookingsData(userId),
            analytics: await this.exportAnalyticsData(userId, 'venue_owner')
          })
        };
      }

      return exportData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw new Error('Failed to export user data');
    }
  }

  // Private helper methods for data operations
  private async loadOrganizationProfile(userId: string) {
    // Placeholder - would load from organization_profiles table
    return { userId, organizationName: '', description: '', email: '' };
  }

  private async loadTeamMembers(userId: string) {
    // Placeholder - would load from team_members table
    return [];
  }

  private async loadPaymentMethods(userId: string, roles: string[]) {
    // Placeholder - would load from payment_methods table filtered by roles
    return [];
  }

  private async loadRoleSpecificSettings(userId: string, roles: string[]) {
    // Placeholder - would load from role_settings table
    return {};
  }

  private async updateOrganizationProfile(userId: string, updates: any) {
    // Placeholder - would update organization_profiles table
    return { ...updates, userId };
  }

  private async getEventsCount(userId: string): Promise<number> {
    // Placeholder - would count from events table
    return 0;
  }

  private async getVenuesCount(userId: string): Promise<number> {
    // Placeholder - would count from venues table
    return 0;
  }

  private async getTeamMembersCount(userId: string): Promise<number> {
    // Placeholder - would count from team_members table
    return 0;
  }

  private async exportEventsData(userId: string) {
    // Placeholder - would export events data
    return {};
  }

  private async exportVenuesData(userId: string) {
    // Placeholder - would export venues data
    return {};
  }

  private async exportBookingsData(userId: string) {
    // Placeholder - would export bookings data
    return {};
  }

  private async exportAnalyticsData(userId: string, roleType: string) {
    // Placeholder - would export analytics data
    return {};
  }

  private async logSettingsChange(
    userId: string,
    settingsType: string,
    updates: Record<string, any>,
    roleContext: RoleContext,
    affectedRoles: string[]
  ) {
    try {
      // This would log to the settings_audit_log table
      const logEntry = {
        user_id: userId,
        table_name: settingsType,
        action_type: 'update',
        changed_by_role: 'user', // Could be determined by current context
        affected_roles: affectedRoles,
        old_values: {}, // Would need to fetch current values first
        new_values: updates,
        changed_fields: Object.keys(updates),
        created_at: new Date().toISOString()
      };

      console.log('Settings change logged:', logEntry);
      // In real implementation, this would save to database
    } catch (error) {
      console.error('Failed to log settings change:', error);
    }
  }
}

// Export singleton instance
export const unifiedSettingsService = new UnifiedSettingsService();
