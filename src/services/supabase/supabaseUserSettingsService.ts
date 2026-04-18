import { createClient as createSupabaseClient } from '@/lib/supabase/client/client';
import type { 
  UserProfile,
  SecuritySettings,
  NotificationSettings,
  PrivacySettings,
  AccountPreferences,
  TeamMember
} from '@/services/userSettingsService';

// Helper to get a client per call (client component safe)
function supabase() {
  return createSupabaseClient();
}

// Default builders to keep UI working even if rows don't exist yet
function defaultSecurity(userId: string): SecuritySettings {
  return {
    userId,
    twoFactorEnabled: false,
    twoFactorMethod: null,
    passwordLastChanged: new Date().toISOString(),
    loginNotifications: true,
    trustedDevices: [],
    activeSessions: [
      {
        id: 'current',
        device: 'Current Device',
        location: 'Unknown',
        ipAddress: '0.0.0.0',
        lastActive: new Date().toISOString(),
        isCurrent: true,
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

function defaultNotifications(userId: string): NotificationSettings {
  return {
    userId,
    email: {
      eventUpdates: true,
      ticketSales: true,
      payoutNotifications: true,
      marketingEmails: false,
      securityAlerts: true,
      teamActivity: true,
    },
    push: {
      eventReminders: true,
      urgentAlerts: true,
      ticketSales: true,
      teamNotifications: true,
    },
    sms: {
      enabled: false,
      securityAlerts: false,
      urgentOnly: true,
    },
    updatedAt: new Date().toISOString(),
  };
}

function defaultPrivacy(userId: string): PrivacySettings {
  return {
    userId,
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    allowDirectMessages: true,
    dataSharing: false,
    analyticsOptOut: false,
    marketingOptOut: false,
    updatedAt: new Date().toISOString(),
  };
}

function defaultPreferences(userId: string): AccountPreferences {
  return {
    userId,
    theme: 'system',
    emailDigest: 'weekly',
    currency: 'GHS',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    defaultEventVisibility: 'public',
    autoSaveDrafts: true,
    updatedAt: new Date().toISOString(),
  };
}

export const userSettingsService = {
  // Profile Management
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = Row not found
      console.error('Supabase: getUserProfile error', error);
      return null;
    }

    return (data as any) || null;
  },

  async updateUserProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    const payload = { ...profile, id: userId, updatedAt: new Date().toISOString() } as any;
    const { data, error } = await supabase()
      .from('profiles')
      .upsert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('Supabase: updateUserProfile error', error);
      throw new Error('Failed to update profile');
    }

    return data as any;
  },

  // Security Settings
  async getSecuritySettings(userId: string): Promise<SecuritySettings> {
    const { data, error } = await supabase()
      .from('security_settings')
      .select('*')
      .eq('userId', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase: getSecuritySettings error', error);
      throw new Error('Failed to load security settings');
    }

    return (data as any) || defaultSecurity(userId);
  },

  async updateSecuritySettings(userId: string, settings: Partial<SecuritySettings>): Promise<SecuritySettings> {
    const payload = { ...settings, userId, updatedAt: new Date().toISOString() } as any;
    const { data, error } = await supabase()
      .from('security_settings')
      .upsert(payload, { onConflict: 'userId' })
      .select('*')
      .single();

    if (error) {
      console.error('Supabase: updateSecuritySettings error', error);
      throw new Error('Failed to update security settings');
    }

    return data as any;
  },

  // Notification Settings
  async getNotificationSettings(userId: string): Promise<NotificationSettings> {
    const { data, error } = await supabase()
      .from('notification_settings')
      .select('*')
      .eq('userId', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase: getNotificationSettings error', error);
      throw new Error('Failed to load notification settings');
    }

    return (data as any) || defaultNotifications(userId);
  },

  async updateNotificationSettings(userId: string, settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const payload = { ...settings, userId, updatedAt: new Date().toISOString() } as any;
    const { data, error } = await supabase()
      .from('notification_settings')
      .upsert(payload, { onConflict: 'userId' })
      .select('*')
      .single();

    if (error) {
      console.error('Supabase: updateNotificationSettings error', error);
      throw new Error('Failed to update notification settings');
    }

    return data as any;
  },

  // Team management (optional): not implemented in Supabase here; leave as no-ops for now
  async getTeamMembers(_userId: string): Promise<TeamMember[]> {
    return [];
  },

  // Privacy
  async getPrivacySettings(userId: string): Promise<PrivacySettings> {
    const { data, error } = await supabase()
      .from('privacy_settings')
      .select('*')
      .eq('userId', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase: getPrivacySettings error', error);
      throw new Error('Failed to load privacy settings');
    }

    return (data as any) || defaultPrivacy(userId);
  },

  async updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): Promise<PrivacySettings> {
    const payload = { ...settings, userId, updatedAt: new Date().toISOString() } as any;
    const { data, error } = await supabase()
      .from('privacy_settings')
      .upsert(payload, { onConflict: 'userId' })
      .select('*')
      .single();

    if (error) {
      console.error('Supabase: updatePrivacySettings error', error);
      throw new Error('Failed to update privacy settings');
    }

    return data as any;
  },

  // Preferences
  async getAccountPreferences(userId: string): Promise<AccountPreferences> {
    const { data, error } = await supabase()
      .from('account_preferences')
      .select('*')
      .eq('userId', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase: getAccountPreferences error', error);
      throw new Error('Failed to load account preferences');
    }

    return (data as any) || defaultPreferences(userId);
  },

  async updateAccountPreferences(userId: string, preferences: Partial<AccountPreferences>): Promise<AccountPreferences> {
    const payload = { ...preferences, userId, updatedAt: new Date().toISOString() } as any;
    const { data, error } = await supabase()
      .from('account_preferences')
      .upsert(payload, { onConflict: 'userId' })
      .select('*')
      .single();

    if (error) {
      console.error('Supabase: updateAccountPreferences error', error);
      throw new Error('Failed to update account preferences');
    }

    return data as any;
  },

  // Utilities
  async exportUserData(userId: string): Promise<any> {
    const [profile, security, notifications, privacy, preferences] = await Promise.all([
      this.getUserProfile(userId),
      this.getSecuritySettings(userId),
      this.getNotificationSettings(userId),
      this.getPrivacySettings(userId),
      this.getAccountPreferences(userId),
    ]);

    return {
      profile,
      security: { ...security, trustedDevices: [], activeSessions: [] },
      notifications,
      privacy,
      preferences,
      exportedAt: new Date().toISOString(),
    };
  },

  async deleteUserData(userId: string): Promise<void> {
    // Soft-delete: remove rows across tables
    const client = supabase();
    await Promise.all([
      client.from('profiles').delete().eq('id', userId),
      client.from('security_settings').delete().eq('userId', userId),
      client.from('notification_settings').delete().eq('userId', userId),
      client.from('privacy_settings').delete().eq('userId', userId),
      client.from('account_preferences').delete().eq('userId', userId),
    ]);
  },
};
