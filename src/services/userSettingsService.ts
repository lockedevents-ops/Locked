/**
 * User Settings Service
 * =====================
 * 
 * Comprehensive service for managing user settings including:
 * - Profile information (via profiles table + user_profiles)
 * - Security settings (2FA, password, sessions) 
 * - Notification preferences (via user_settings)
 * - Team member management (via team_members)
 * - Privacy settings (via user_settings)
 * - Account preferences (via user_settings)
 * 
 * @module userSettingsService
 * @version 2.0.0 - Migrated from localStorage to Supabase
 */

import { createClient } from '@/lib/supabase/client/client';

export interface UserProfile {
  id: string;
  organizationName: string;
  description: string;
  email: string;
  phoneNumber?: string;
  website?: string;
  country: string;
  city?: string;
  address?: string;
  profileImage?: string;
  bannerImage?: string;
  socialLinks: SocialLink[];
  timezone: string;
  language: string;
  updatedAt: string;
}

export interface SocialLink {
  platform: string;
  username: string;
  url: string;
}

export interface SecuritySettings {
  userId: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: 'sms' | 'email' | 'authenticator' | null;
  twoFactorPhone?: string;
  passwordLastChanged: string;
  loginNotifications: boolean;
  trustedDevices: TrustedDevice[];
  activeSessions: Session[];
  updatedAt: string;
}

export interface TrustedDevice {
  id: string;
  name: string;
  type: string;
  addedAt: string;
  lastUsed: string;
  location?: string;
}

export interface Session {
  id: string;
  device: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface NotificationSettings {
  userId: string;
  email: {
    eventUpdates: boolean;
    ticketSales: boolean;
    payoutNotifications: boolean;
    marketingEmails: boolean;
    securityAlerts: boolean;
    teamActivity: boolean;
  };
  push: {
    eventReminders: boolean;
    urgentAlerts: boolean;
    ticketSales: boolean;
    teamNotifications: boolean;
  };
  sms: {
    enabled: boolean;
    phoneNumber?: string;
    securityAlerts: boolean;
    urgentOnly: boolean;
  };
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  permissions: string[];
  invitedAt: string;
  lastActive?: string;
  status: 'active' | 'pending' | 'inactive';
  avatar?: string;
}

export interface PrivacySettings {
  userId: string;
  profileVisibility: 'public' | 'private' | 'limited';
  showEmail: boolean;
  showPhone: boolean;
  allowDirectMessages: boolean;
  dataSharing: boolean;
  analyticsOptOut: boolean;
  marketingOptOut: boolean;
  updatedAt: string;
}

export interface AccountPreferences {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  emailDigest: 'daily' | 'weekly' | 'monthly' | 'never';
  currency: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  defaultEventVisibility: 'public' | 'private';
  autoSaveDrafts: boolean;
  updatedAt: string;
}

/**
 * User Settings Service
 */
export const userSettingsService = {
  // Profile Management (Supabase)
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const supabase = createClient();
      
      // Get profile from profiles table (main user profile)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          avatar_url,
          bio,
          created_at,
          updated_at
        `)
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error loading user profile:', error);
        return null;
      }
      
      // Also get extended profile data if it exists
      const { data: extendedProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      // Merge data into UserProfile format
      return {
        id: userId,
        organizationName: extendedProfile?.display_name || profile?.full_name || '',
        description: extendedProfile?.bio || profile?.bio || '',
        email: profile?.email || '',
        phoneNumber: profile?.phone || extendedProfile?.phone_number,
        website: extendedProfile?.website_url,
        country: extendedProfile?.country || 'Ghana',
        city: extendedProfile?.city,
        address: extendedProfile?.address,
        profileImage: profile?.avatar_url || extendedProfile?.avatar_url,
        bannerImage: extendedProfile?.banner_url,
        socialLinks: Array.isArray(extendedProfile?.social_links) 
          ? extendedProfile.social_links 
          : [],
        timezone: extendedProfile?.timezone || 'GMT',
        language: extendedProfile?.language || 'en',
        updatedAt: extendedProfile?.updated_at || profile?.updated_at || new Date().toISOString()
      };
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  },

  async updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const supabase = createClient();
      
      // Update main profiles table
      const profileUpdates: any = {};
      if (profile.email) profileUpdates.email = profile.email;
      if (profile.phoneNumber) profileUpdates.phone = profile.phoneNumber;
      if (profile.profileImage) profileUpdates.avatar_url = profile.profileImage;
      if (profile.organizationName) profileUpdates.full_name = profile.organizationName;
      if (profile.description) profileUpdates.bio = profile.description;
      
      if (Object.keys(profileUpdates).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            ...profileUpdates,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
        
        if (profileError) {
          console.error('Error updating profiles:', profileError);
        }
      }
      
      // Update or insert user_profiles (extended profile data)
      const extendedUpdates: any = {
        user_id: userId,
        updated_at: new Date().toISOString()
      };
      
      if (profile.organizationName) extendedUpdates.display_name = profile.organizationName;
      if (profile.description) extendedUpdates.bio = profile.description;
      if (profile.website) extendedUpdates.website_url = profile.website;
      if (profile.country) extendedUpdates.country = profile.country;
      if (profile.city) extendedUpdates.city = profile.city;
      if (profile.address) extendedUpdates.address = profile.address;
      if (profile.profileImage) extendedUpdates.avatar_url = profile.profileImage;
      if (profile.bannerImage) extendedUpdates.banner_url = profile.bannerImage;
      if (profile.socialLinks) extendedUpdates.social_links = profile.socialLinks;
      if (profile.timezone) extendedUpdates.timezone = profile.timezone;
      if (profile.language) extendedUpdates.language = profile.language;
      if (profile.phoneNumber) extendedUpdates.phone_number = profile.phoneNumber;
      
      const { error: extendedError } = await supabase
        .from('user_profiles')
        .upsert(extendedUpdates, { 
          onConflict: 'user_id' 
        });
      
      if (extendedError) {
        console.error('Error updating user_profiles:', extendedError);
      }
      
      // Return updated profile
      const updatedProfile = await this.getUserProfile(userId);
      if (!updatedProfile) {
        throw new Error('Failed to retrieve updated profile');
      }
      
      return updatedProfile;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update profile');
    }
  },

  // Security Settings (Supabase Database)
  async getSecuritySettings(userId: string): Promise<SecuritySettings> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('security_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error loading security settings:', error);
        throw new Error('Failed to load security settings');
      }

      // If no settings exist, return default settings
      if (!data) {
        return {
          userId,
          twoFactorEnabled: false,
          twoFactorMethod: null,
          passwordLastChanged: new Date().toISOString(),
          loginNotifications: true,
          trustedDevices: [],
          activeSessions: [{
            id: 'current',
            device: 'Current Device',
            location: 'Accra, Ghana',
            ipAddress: '192.168.1.1',
            lastActive: new Date().toISOString(),
            isCurrent: true
          }],
          updatedAt: new Date().toISOString()
        };
      }

      // Transform database record to SecuritySettings interface
      return {
        userId: data.user_id,
        twoFactorEnabled: data.two_factor_enabled,
        twoFactorMethod: data.two_factor_method as 'sms' | 'email' | 'authenticator' | null,
        twoFactorPhone: data.two_factor_phone,
        passwordLastChanged: data.password_last_changed,
        loginNotifications: data.login_notifications,
        trustedDevices: Array.isArray(data.trusted_devices) ? data.trusted_devices : [],
        activeSessions: Array.isArray(data.active_sessions) ? data.active_sessions : [{
          id: 'current',
          device: 'Current Device',
          location: 'Accra, Ghana',
          ipAddress: '192.168.1.1',
          lastActive: new Date().toISOString(),
          isCurrent: true
        }],
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error loading security settings:', error);
      throw new Error('Failed to load security settings');
    }
  },

  async updateSecuritySettings(userId: string, settings: Partial<SecuritySettings>): Promise<SecuritySettings> {
    try {
      const supabase = createClient();

      // Transform interface to database column names
      const dbSettings: any = {};
      if (settings.twoFactorEnabled !== undefined) dbSettings.two_factor_enabled = settings.twoFactorEnabled;
      if (settings.twoFactorMethod !== undefined) dbSettings.two_factor_method = settings.twoFactorMethod;
      if (settings.twoFactorPhone !== undefined) dbSettings.two_factor_phone = settings.twoFactorPhone;
      if (settings.loginNotifications !== undefined) dbSettings.login_notifications = settings.loginNotifications;
      if (settings.trustedDevices !== undefined) dbSettings.trusted_devices = settings.trustedDevices;
      if (settings.activeSessions !== undefined) dbSettings.active_sessions = settings.activeSessions;
      if (settings.passwordLastChanged !== undefined) dbSettings.password_last_changed = settings.passwordLastChanged;

      // First, try to update existing record
      const { data: updateData, error: updateError } = await supabase
        .from('security_settings')
        .update(dbSettings)
        .eq('user_id', userId)
        .select()
        .maybeSingle();

      // If no record exists, insert a new one
      if (updateError?.code === 'PGRST116' || !updateData) {
        const { data: insertData, error: insertError } = await supabase
          .from('security_settings')
          .insert({
            user_id: userId,
            ...dbSettings
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting security settings:', insertError);
          throw new Error('Failed to create security settings');
        }

        // Transform back to SecuritySettings interface
        return {
          userId: insertData.user_id,
          twoFactorEnabled: insertData.two_factor_enabled,
          twoFactorMethod: insertData.two_factor_method,
          twoFactorPhone: insertData.two_factor_phone,
          passwordLastChanged: insertData.password_last_changed,
          loginNotifications: insertData.login_notifications,
          trustedDevices: insertData.trusted_devices || [],
          activeSessions: insertData.active_sessions || [],
          updatedAt: insertData.updated_at
        };
      }

      if (updateError) {
        console.error('Error updating security settings:', updateError);
        throw new Error('Failed to update security settings');
      }

      // Transform back to SecuritySettings interface
      return {
        userId: updateData.user_id,
        twoFactorEnabled: updateData.two_factor_enabled,
        twoFactorMethod: updateData.two_factor_method,
        twoFactorPhone: updateData.two_factor_phone,
        passwordLastChanged: updateData.password_last_changed,
        loginNotifications: updateData.login_notifications,
        trustedDevices: updateData.trusted_devices || [],
        activeSessions: updateData.active_sessions || [],
        updatedAt: updateData.updated_at
      };
    } catch (error) {
      console.error('Error updating security settings:', error);
      throw new Error('Failed to update security settings');
    }
  },

  // Notification Settings (Supabase)
  async getNotificationSettings(userId: string): Promise<NotificationSettings> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('email_notifications, push_notifications, sms_notifications, updated_at')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading notification settings:', error);
      }
      
      // Default settings
      const defaults: NotificationSettings = {
        userId,
        email: {
          eventUpdates: true,
          ticketSales: true,
          payoutNotifications: true,
          marketingEmails: false,
          securityAlerts: true,
          teamActivity: true
        },
        push: {
          eventReminders: true,
          urgentAlerts: true,
          ticketSales: true,
          teamNotifications: true
        },
        sms: {
          enabled: false,
          securityAlerts: false,
          urgentOnly: true
        },
        updatedAt: new Date().toISOString()
      };
      
      if (!data) {
        return defaults;
      }
      
      // Transform database JSONB to NotificationSettings interface
      const emailNotifs = data.email_notifications || {};
      const pushNotifs = data.push_notifications || {};
      const smsNotifs = data.sms_notifications || {};
      
      return {
        userId,
        email: {
          eventUpdates: emailNotifs.event_updates ?? defaults.email.eventUpdates,
          ticketSales: emailNotifs.ticket_sales ?? defaults.email.ticketSales,
          payoutNotifications: emailNotifs.payout_notifications ?? defaults.email.payoutNotifications,
          marketingEmails: emailNotifs.marketing_emails ?? defaults.email.marketingEmails,
          securityAlerts: emailNotifs.security_alerts ?? defaults.email.securityAlerts,
          teamActivity: emailNotifs.team_activity ?? defaults.email.teamActivity
        },
        push: {
          eventReminders: pushNotifs.event_reminders ?? defaults.push.eventReminders,
          urgentAlerts: pushNotifs.urgent_alerts ?? defaults.push.urgentAlerts,
          ticketSales: pushNotifs.ticket_sales ?? defaults.push.ticketSales,
          teamNotifications: pushNotifs.team_notifications ?? defaults.push.teamNotifications
        },
        sms: {
          enabled: smsNotifs.enabled ?? defaults.sms.enabled,
          phoneNumber: smsNotifs.phone_number,
          securityAlerts: smsNotifs.security_alerts ?? defaults.sms.securityAlerts,
          urgentOnly: smsNotifs.urgent_only ?? defaults.sms.urgentOnly
        },
        updatedAt: data.updated_at || new Date().toISOString()
      };
    } catch (error) {
      console.error('Error loading notification settings:', error);
      throw new Error('Failed to load notification settings');
    }
  },

  async updateNotificationSettings(userId: string, settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    try {
      const supabase = createClient();
      const currentSettings = await this.getNotificationSettings(userId);

      // Transform to database format
      const dbUpdate: any = {
        user_id: userId,
        updated_at: new Date().toISOString()
      };
      
      // Merge email notifications
      if (settings.email) {
        dbUpdate.email_notifications = {
          event_updates: settings.email.eventUpdates ?? currentSettings.email.eventUpdates,
          ticket_sales: settings.email.ticketSales ?? currentSettings.email.ticketSales,
          payout_notifications: settings.email.payoutNotifications ?? currentSettings.email.payoutNotifications,
          marketing_emails: settings.email.marketingEmails ?? currentSettings.email.marketingEmails,
          security_alerts: settings.email.securityAlerts ?? currentSettings.email.securityAlerts,
          team_activity: settings.email.teamActivity ?? currentSettings.email.teamActivity
        };
      }
      
      // Merge push notifications
      if (settings.push) {
        dbUpdate.push_notifications = {
          event_reminders: settings.push.eventReminders ?? currentSettings.push.eventReminders,
          urgent_alerts: settings.push.urgentAlerts ?? currentSettings.push.urgentAlerts,
          ticket_sales: settings.push.ticketSales ?? currentSettings.push.ticketSales,
          team_notifications: settings.push.teamNotifications ?? currentSettings.push.teamNotifications
        };
      }
      
      // Merge SMS notifications
      if (settings.sms) {
        dbUpdate.sms_notifications = {
          enabled: settings.sms.enabled ?? currentSettings.sms.enabled,
          phone_number: settings.sms.phoneNumber ?? currentSettings.sms.phoneNumber,
          security_alerts: settings.sms.securityAlerts ?? currentSettings.sms.securityAlerts,
          urgent_only: settings.sms.urgentOnly ?? currentSettings.sms.urgentOnly
        };
      }
      
      // Upsert settings
      const { error } = await supabase
        .from('user_settings')
        .upsert(dbUpdate, { onConflict: 'user_id' });
      
      if (error) {
        console.error('Error updating notification settings:', error);
        throw new Error('Failed to update notification settings');
      }
      
      return this.getNotificationSettings(userId);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw new Error('Failed to update notification settings');
    }
  },

  // Team Management (Supabase)
  async getTeamMembers(userId: string): Promise<TeamMember[]> {
    try {
      const supabase = createClient();
      
      // First get the organization profile for this user
      const { data: orgProfile, error: orgError } = await supabase
        .from('organization_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (orgError || !orgProfile) {
        // User doesn't have an organization profile yet
        return [];
      }
      
      // Get team members for this organization
      const { data: members, error } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          invited_email,
          invited_name,
          role_type,
          permissions,
          status,
          accepted_at,
          created_at,
          updated_at
        `)
        .eq('organization_id', orgProfile.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading team members:', error);
        return [];
      }
      
      // Transform to TeamMember interface
      return (members || []).map((member: any) => ({
        id: member.id,
        name: member.invited_name || 'Team Member',
        email: member.invited_email,
        role: member.role_type === 'admin' ? 'admin' 
            : member.role_type === 'editor' ? 'editor' 
            : 'viewer' as 'admin' | 'editor' | 'viewer',
        permissions: Array.isArray(member.permissions) ? member.permissions : Object.keys(member.permissions || {}),
        invitedAt: member.created_at,
        lastActive: member.accepted_at || member.updated_at,
        status: member.status === 'active' ? 'active' 
              : member.status === 'invited' ? 'pending' 
              : 'inactive' as 'active' | 'pending' | 'inactive',
        avatar: undefined // Could be fetched from profiles if user_id exists
      }));
    } catch (error) {
      console.error('Error loading team members:', error);
      return [];
    }
  },

  async addTeamMember(userId: string, member: Omit<TeamMember, 'id' | 'invitedAt'>): Promise<TeamMember> {
    try {
      const supabase = createClient();
      
      // Get or create organization profile
      let { data: orgProfile, error: orgError } = await supabase
        .from('organization_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!orgProfile) {
        // Create organization profile first
        const { data: newOrg, error: createError } = await supabase
          .from('organization_profiles')
          .insert({
            user_id: userId,
            organization_name: 'My Organization', // Default name
            organization_type: 'event_organizer'
          })
          .select('id')
          .single();
        
        if (createError) {
          console.error('Error creating organization profile:', createError);
          throw new Error('Failed to create organization profile');
        }
        
        orgProfile = newOrg;
      }
      
      // Generate invitation token
      const invitationToken = crypto.randomUUID();
      
      // Insert team member
      const { data: newMember, error } = await supabase
        .from('team_members')
        .insert({
          organization_id: orgProfile!.id,
          invited_email: member.email,
          invited_name: member.name,
          role_type: member.role,
          permissions: member.permissions || [],
          status: 'invited',
          invitation_token: invitationToken,
          invitation_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .select('*')
        .single();
      
      if (error) {
        console.error('Error adding team member:', error);
        throw new Error('Failed to add team member');
      }
      
      return {
        id: newMember.id,
        name: newMember.invited_name || member.name,
        email: newMember.invited_email,
        role: newMember.role_type as 'admin' | 'editor' | 'viewer',
        permissions: member.permissions || [],
        invitedAt: newMember.created_at,
        lastActive: undefined,
        status: 'pending'
      };
    } catch (error) {
      console.error('Error adding team member:', error);
      throw new Error('Failed to add team member');
    }
  },

  async updateTeamMember(userId: string, memberId: string, updates: Partial<TeamMember>): Promise<TeamMember> {
    try {
      const supabase = createClient();
      
      // Build update object
      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      };
      
      if (updates.name) dbUpdates.invited_name = updates.name;
      if (updates.role) dbUpdates.role_type = updates.role;
      if (updates.permissions) dbUpdates.permissions = updates.permissions;
      if (updates.status) {
        dbUpdates.status = updates.status === 'active' ? 'active' 
                        : updates.status === 'pending' ? 'invited' 
                        : 'suspended';
      }
      
      const { data, error } = await supabase
        .from('team_members')
        .update(dbUpdates)
        .eq('id', memberId)
        .select('*')
        .single();
      
      if (error) {
        console.error('Error updating team member:', error);
        throw new Error('Failed to update team member');
      }
      
      return {
        id: data.id,
        name: data.invited_name || 'Team Member',
        email: data.invited_email,
        role: data.role_type as 'admin' | 'editor' | 'viewer',
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        invitedAt: data.created_at,
        lastActive: data.accepted_at || data.updated_at,
        status: data.status === 'active' ? 'active' : data.status === 'invited' ? 'pending' : 'inactive'
      };
    } catch (error) {
      console.error('Error updating team member:', error);
      throw new Error('Failed to update team member');
    }
  },

  async removeTeamMember(userId: string, memberId: string): Promise<void> {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);
      
      if (error) {
        console.error('Error removing team member:', error);
        throw new Error('Failed to remove team member');
      }
    } catch (error) {
      console.error('Error removing team member:', error);
      throw new Error('Failed to remove team member');
    }
  },

  // Privacy Settings (Supabase)
  async getPrivacySettings(userId: string): Promise<PrivacySettings> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('user_settings')
        .select(`
          profile_visibility,
          show_email,
          show_phone,
          allow_direct_messages,
          data_sharing_consent,
          analytics_opt_out,
          marketing_opt_out,
          updated_at
        `)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading privacy settings:', error);
      }
      
      // Default settings
      const defaults: PrivacySettings = {
        userId,
        profileVisibility: 'public',
        showEmail: false,
        showPhone: false,
        allowDirectMessages: true,
        dataSharing: false,
        analyticsOptOut: false,
        marketingOptOut: false,
        updatedAt: new Date().toISOString()
      };
      
      if (!data) {
        return defaults;
      }
      
      return {
        userId,
        profileVisibility: (data.profile_visibility as 'public' | 'private' | 'limited') || defaults.profileVisibility,
        showEmail: data.show_email ?? defaults.showEmail,
        showPhone: data.show_phone ?? defaults.showPhone,
        allowDirectMessages: data.allow_direct_messages ?? defaults.allowDirectMessages,
        dataSharing: data.data_sharing_consent ?? defaults.dataSharing,
        analyticsOptOut: data.analytics_opt_out ?? defaults.analyticsOptOut,
        marketingOptOut: data.marketing_opt_out ?? defaults.marketingOptOut,
        updatedAt: data.updated_at || defaults.updatedAt
      };
    } catch (error) {
      console.error('Error loading privacy settings:', error);
      throw new Error('Failed to load privacy settings');
    }
  },

  async updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): Promise<PrivacySettings> {
    try {
      const supabase = createClient();
      
      // Transform to database format
      const dbUpdate: any = {
        user_id: userId,
        updated_at: new Date().toISOString()
      };
      
      if (settings.profileVisibility !== undefined) dbUpdate.profile_visibility = settings.profileVisibility;
      if (settings.showEmail !== undefined) dbUpdate.show_email = settings.showEmail;
      if (settings.showPhone !== undefined) dbUpdate.show_phone = settings.showPhone;
      if (settings.allowDirectMessages !== undefined) dbUpdate.allow_direct_messages = settings.allowDirectMessages;
      if (settings.dataSharing !== undefined) dbUpdate.data_sharing_consent = settings.dataSharing;
      if (settings.analyticsOptOut !== undefined) dbUpdate.analytics_opt_out = settings.analyticsOptOut;
      if (settings.marketingOptOut !== undefined) dbUpdate.marketing_opt_out = settings.marketingOptOut;
      
      // Upsert settings
      const { error } = await supabase
        .from('user_settings')
        .upsert(dbUpdate, { onConflict: 'user_id' });
      
      if (error) {
        console.error('Error updating privacy settings:', error);
        throw new Error('Failed to update privacy settings');
      }
      
      return this.getPrivacySettings(userId);
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      throw new Error('Failed to update privacy settings');
    }
  },

  // Account Preferences (Supabase)
  async getAccountPreferences(userId: string): Promise<AccountPreferences> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('user_settings')
        .select(`
          theme,
          email_digest_frequency,
          auto_save_drafts,
          default_event_visibility,
          updated_at
        `)
        .eq('user_id', userId)
        .maybeSingle();
      
      // Also get preferences from user_profiles (currency, date/time format)
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('currency, date_format, time_format')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading account preferences:', error);
      }
      
      // Default preferences
      const defaults: AccountPreferences = {
        userId,
        theme: 'system',
        emailDigest: 'weekly',
        currency: 'GHS',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        defaultEventVisibility: 'public',
        autoSaveDrafts: true,
        updatedAt: new Date().toISOString()
      };
      
      return {
        userId,
        theme: (data?.theme as 'light' | 'dark' | 'system') || defaults.theme,
        emailDigest: (data?.email_digest_frequency as 'daily' | 'weekly' | 'monthly' | 'never') || defaults.emailDigest,
        currency: profileData?.currency || defaults.currency,
        dateFormat: profileData?.date_format || defaults.dateFormat,
        timeFormat: (profileData?.time_format as '12h' | '24h') || defaults.timeFormat,
        defaultEventVisibility: (data?.default_event_visibility as 'public' | 'private') || defaults.defaultEventVisibility,
        autoSaveDrafts: data?.auto_save_drafts ?? defaults.autoSaveDrafts,
        updatedAt: data?.updated_at || defaults.updatedAt
      };
    } catch (error) {
      console.error('Error loading account preferences:', error);
      throw new Error('Failed to load account preferences');
    }
  },

  async updateAccountPreferences(userId: string, preferences: Partial<AccountPreferences>): Promise<AccountPreferences> {
    try {
      const supabase = createClient();
      
      // Split updates between user_settings and user_profiles
      const settingsUpdate: any = {
        user_id: userId,
        updated_at: new Date().toISOString()
      };
      
      const profileUpdate: any = {
        user_id: userId,
        updated_at: new Date().toISOString()
      };
      
      // user_settings fields
      if (preferences.theme !== undefined) settingsUpdate.theme = preferences.theme;
      if (preferences.emailDigest !== undefined) settingsUpdate.email_digest_frequency = preferences.emailDigest;
      if (preferences.defaultEventVisibility !== undefined) settingsUpdate.default_event_visibility = preferences.defaultEventVisibility;
      if (preferences.autoSaveDrafts !== undefined) settingsUpdate.auto_save_drafts = preferences.autoSaveDrafts;
      
      // user_profiles fields
      if (preferences.currency !== undefined) profileUpdate.currency = preferences.currency;
      if (preferences.dateFormat !== undefined) profileUpdate.date_format = preferences.dateFormat;
      if (preferences.timeFormat !== undefined) profileUpdate.time_format = preferences.timeFormat;
      
      // Update user_settings
      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert(settingsUpdate, { onConflict: 'user_id' });
      
      if (settingsError) {
        console.error('Error updating user_settings:', settingsError);
      }
      
      // Update user_profiles if needed
      if (preferences.currency || preferences.dateFormat || preferences.timeFormat) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert(profileUpdate, { onConflict: 'user_id' });
        
        if (profileError) {
          console.error('Error updating user_profiles:', profileError);
        }
      }
      
      return this.getAccountPreferences(userId);
    } catch (error) {
      console.error('Error updating account preferences:', error);
      throw new Error('Failed to update account preferences');
    }
  },

  // Utility Methods
  async exportUserData(userId: string): Promise<any> {
    try {
      const profile = await this.getUserProfile(userId);
      const security = await this.getSecuritySettings(userId);
      const notifications = await this.getNotificationSettings(userId);
      const team = await this.getTeamMembers(userId);
      const privacy = await this.getPrivacySettings(userId);
      const preferences = await this.getAccountPreferences(userId);

      return {
        profile,
        security: { ...security, trustedDevices: [], activeSessions: [] }, // Remove sensitive data
        notifications,
        team,
        privacy,
        preferences,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw new Error('Failed to export user data');
    }
  },

  async deleteUserData(userId: string): Promise<void> {
    try {
      const supabase = createClient();
      
      // Delete user data from all tables (cascade will handle most, but be explicit)
      // Note: Most deletions are handled by CASCADE on the auth.users FK
      
      // Delete user_settings
      await supabase.from('user_settings').delete().eq('user_id', userId);
      
      // Delete user_profiles
      await supabase.from('user_profiles').delete().eq('user_id', userId);
      
      // Delete security_settings
      await supabase.from('security_settings').delete().eq('user_id', userId);
      
      // Delete role_settings
      await supabase.from('role_settings').delete().eq('user_id', userId);
      
      // Note: organization_profiles and team_members will cascade delete
      
      console.log(`[UserSettings] Deleted all data for user ${userId}`);
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw new Error('Failed to delete user data');
    }
  },

  /**
   * softDeleteAccount
   * Marks an account as deleted using the database RPC function.
   * This initiates the grace period (default 30 days) and sets account status to deleted.
   */
  async softDeleteAccount(userId: string, reason?: string): Promise<boolean> {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase.rpc('soft_delete_account', {
        target_user_id: userId,
        reason: reason || 'User requested deletion',
        retention_days: 30
      });
      
      if (error) {
        console.error('Error calling soft_delete_account rpc:', error);
        throw error;
      }
      
      return !!data;
    } catch (error) {
      console.error('Failed to soft delete account:', error);
      throw new Error('Failed to initiate account deletion');
    }
  }
};
