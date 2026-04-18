"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/useToast";
import { 
  MobileAccordion, 
  MobileAccordionItem, 
  MobileSettingRow, 
  MobileToggleSwitch 
} from '../MobileAccordion';
import {
  Bell,
  Mail,
  Smartphone,
  Clock
} from "lucide-react";

export function NotificationsSection({ user, roleContext, isMobile }: any) {
  const toast = useToast();
  const [notificationSettings, setNotificationSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load notification settings on mount
  useEffect(() => {
    const loadNotificationSettings = async () => {
      if (!user?.id) return;
      
      try {
        // Simulate loading notification settings
        setNotificationSettings({
          email: {
            eventUpdates: true,
            ticketSales: true,
            payoutNotifications: true,
            marketingEmails: false,
            securityAlerts: true,
            teamActivity: roleContext.isOrganizer || roleContext.isVenueOwner,
            bookingUpdates: roleContext.isVenueOwner,
            venueReviews: roleContext.isVenueOwner
          },
          push: {
            eventReminders: true,
            urgentAlerts: true,
            ticketSales: true,
            teamNotifications: roleContext.isOrganizer || roleContext.isVenueOwner,
            bookingAlerts: roleContext.isVenueOwner
          },
          sms: {
            enabled: false,
            phoneNumber: '',
            securityAlerts: true,
            urgentOnly: true
          },
          digest: {
            frequency: 'weekly',
            includeAnalytics: roleContext.isOrganizer || roleContext.isVenueOwner,
            includeFinancials: roleContext.isOrganizer || roleContext.isVenueOwner
          }
        });
      } catch (error) {
        console.error('Error loading notification settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadNotificationSettings();
  }, [user, roleContext]);

  const updateNotificationSetting = async (category: string, setting: string, value: any) => {
    if (!user?.id || !notificationSettings) return;
    
    setIsSaving(true);
    try {
      const updated = {
        ...notificationSettings,
        [category]: {
          ...notificationSettings[category],
          [setting]: value
        }
      };
      
      setNotificationSettings(updated);
      toast.showSuccess('Settings Updated', 'Notification settings updated');
    } catch (error) {
      toast.showError('Update Failed', 'Failed to update notification settings');
    } finally {
      setIsSaving(false);
    }
  };

  const ToggleSwitch = ({ checked, onChange, disabled = false }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
    <button
      onClick={onChange}
      disabled={disabled || isSaving}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-gray-200'
      } ${disabled || isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  // Mobile accordion items for notifications
  const mobileAccordionItems = [
    {
      id: 'email-notifications',
      title: 'Email Notifications',
      icon: <Mail className="h-4 w-4" />,
      children: (
        <MobileAccordionItem>
          <div className="space-y-3">
            {[
              { key: 'eventUpdates', label: 'Event Updates', description: 'Get notified about events you\'re interested in' },
              { key: 'ticketSales', label: 'Ticket Sales', description: 'Notifications about ticket purchases and sales' },
              ...(roleContext.isOrganizer || roleContext.isVenueOwner ? [
                { key: 'payoutNotifications', label: 'Payout Notifications', description: 'Payment and earning notifications' }
              ] : []),
              ...(roleContext.isVenueOwner ? [
                { key: 'bookingUpdates', label: 'Booking Updates', description: 'Venue booking confirmations and changes' },
                { key: 'venueReviews', label: 'Venue Reviews', description: 'New reviews and ratings for your venues' }
              ] : []),
              { key: 'marketingEmails', label: 'Marketing Emails', description: 'Promotional content and special offers' },
              { key: 'securityAlerts', label: 'Security Alerts', description: 'Important security-related notifications' }
            ].map(({ key, label, description }) => (
              <MobileSettingRow
                key={key}
                title={label}
                description={description}
                action={
                  <MobileToggleSwitch
                    checked={notificationSettings?.email?.[key] || false}
                    onChange={() => updateNotificationSetting('email', key, !notificationSettings?.email?.[key])}
                    disabled={isSaving}
                  />
                }
              />
            ))}
          </div>
        </MobileAccordionItem>
      )
    },
    {
      id: 'push-notifications',
      title: 'Push Notifications',
      icon: <Bell className="h-4 w-4" />,
      children: (
        <MobileAccordionItem>
          <div className="space-y-3">
            {[
              { key: 'eventReminders', label: 'Event Reminders', description: 'Reminders for upcoming events' },
              { key: 'urgentAlerts', label: 'Urgent Alerts', description: 'Critical and time-sensitive notifications' },
              { key: 'ticketSales', label: 'Ticket Sales', description: 'Instant notifications for ticket activities' },
              ...(roleContext.isVenueOwner ? [
                { key: 'bookingAlerts', label: 'Booking Alerts', description: 'Immediate booking confirmations and updates' }
              ] : [])
            ].map(({ key, label, description }) => (
              <MobileSettingRow
                key={key}
                title={label}
                description={description}
                action={
                  <MobileToggleSwitch
                    checked={notificationSettings?.push?.[key] || false}
                    onChange={() => updateNotificationSetting('push', key, !notificationSettings?.push?.[key])}
                    disabled={isSaving}
                  />
                }
              />
            ))}
          </div>
        </MobileAccordionItem>
      )
    },
    {
      id: 'sms-notifications',
      title: 'SMS Notifications',
      icon: <Smartphone className="h-4 w-4" />,
      children: (
        <MobileAccordionItem>
          <div className="space-y-4">
            <MobileSettingRow
              title="Enable SMS"
              description="Receive notifications via text message"
              action={
                <MobileToggleSwitch
                  checked={notificationSettings?.sms?.enabled || false}
                  onChange={() => updateNotificationSetting('sms', 'enabled', !notificationSettings?.sms?.enabled)}
                  disabled={isSaving}
                />
              }
            />
            
            {notificationSettings?.sms?.enabled && (
              <div className="pl-4 border-l-2 border-gray-300 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={notificationSettings?.sms?.phoneNumber || ''}
                    onChange={(e) => updateNotificationSetting('sms', 'phoneNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter your phone number"
                  />
                </div>
                
                <MobileSettingRow
                  title="Security Alerts"
                  description="Critical security notifications"
                  action={
                    <MobileToggleSwitch
                      checked={notificationSettings?.sms?.securityAlerts || false}
                      onChange={() => updateNotificationSetting('sms', 'securityAlerts', !notificationSettings?.sms?.securityAlerts)}
                      disabled={isSaving}
                    />
                  }
                />
                
                <MobileSettingRow
                  title="Urgent Only"
                  description="Only receive urgent notifications"
                  action={
                    <MobileToggleSwitch
                      checked={notificationSettings?.sms?.urgentOnly || false}
                      onChange={() => updateNotificationSetting('sms', 'urgentOnly', !notificationSettings?.sms?.urgentOnly)}
                      disabled={isSaving}
                    />
                  }
                />
              </div>
            )}
          </div>
        </MobileAccordionItem>
      )
    },
    {
      id: 'email-digest',
      title: 'Email Digest',
      icon: <Clock className="h-4 w-4" />,
      children: (
        <MobileAccordionItem>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Frequency</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'never', label: 'Never' }
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => updateNotificationSetting('digest', 'frequency', value)}
                    disabled={isSaving}
                    className={`p-3 text-center border-2 rounded-lg transition-colors ${
                      notificationSettings?.digest?.frequency === value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <span className="font-medium text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {(roleContext.isOrganizer || roleContext.isVenueOwner) && notificationSettings?.digest?.frequency !== 'never' && (
              <div className="space-y-3">
                <MobileSettingRow
                  title="Include Analytics"
                  description="Performance insights in your digest"
                  action={
                    <MobileToggleSwitch
                      checked={notificationSettings?.digest?.includeAnalytics || false}
                      onChange={() => updateNotificationSetting('digest', 'includeAnalytics', !notificationSettings?.digest?.includeAnalytics)}
                      disabled={isSaving}
                    />
                  }
                />
                
                <MobileSettingRow
                  title="Include Financials"
                  description="Revenue and payout summaries"
                  action={
                    <MobileToggleSwitch
                      checked={notificationSettings?.digest?.includeFinancials || false}
                      onChange={() => updateNotificationSetting('digest', 'includeFinancials', !notificationSettings?.digest?.includeFinancials)}
                      disabled={isSaving}
                    />
                  }
                />
              </div>
            )}
          </div>
        </MobileAccordionItem>
      )
    }
  ];

  if (isLoading) {
    return (
      <div className={`${isMobile ? 'p-4' : 'p-8'} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className="p-4">
        {/* Multi-role warning for mobile */}
        {roleContext.roles.length > 1 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-amber-800">
              <strong>Multi-role account:</strong> Notification preferences apply to all your roles
            </p>
          </div>
        )}

        <MobileAccordion items={mobileAccordionItems} singleOpen={true} />
      </div>
    );
  }

  // Desktop layout (original)
  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Notifications</h2>
        <p className="text-gray-600">Choose what notifications you receive and how you receive them.</p>
      </div>
      
      {roleContext.roles.length > 1 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800">
            <strong>Multi-role account:</strong> Notification preferences apply to all your roles. 
            You'll receive notifications for organizer and venue owner activities.
          </p>
        </div>
      )}
      
      <div className="space-y-8">
        {/* Email Notifications */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Email Notifications
          </h3>
          <div className="space-y-4">
            {[
              { key: 'eventUpdates', label: 'Event Updates', description: 'Get notified about events you\'re interested in' },
              { key: 'ticketSales', label: 'Ticket Sales', description: 'Notifications about ticket purchases and sales' },
              ...(roleContext.isOrganizer || roleContext.isVenueOwner ? [
                { key: 'payoutNotifications', label: 'Payout Notifications', description: 'Payment and earning notifications' }
              ] : []),
              ...(roleContext.isVenueOwner ? [
                { key: 'bookingUpdates', label: 'Booking Updates', description: 'Venue booking confirmations and changes' },
                { key: 'venueReviews', label: 'Venue Reviews', description: 'New reviews and ratings for your venues' }
              ] : []),
              { key: 'marketingEmails', label: 'Marketing Emails', description: 'Promotional content and special offers' },
              { key: 'securityAlerts', label: 'Security Alerts', description: 'Important security-related notifications' }
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{label}</p>
                  <p className="text-sm text-gray-600">{description}</p>
                </div>
                <ToggleSwitch
                  checked={notificationSettings?.email?.[key] || false}
                  onChange={() => updateNotificationSetting('email', key, !notificationSettings?.email?.[key])}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <div className="h-5 w-5 bg-primary rounded-sm flex items-center justify-center">
              <div className="h-2 w-2 bg-white rounded-full"></div>
            </div>
            Push Notifications
          </h3>
          <div className="space-y-4">
            {[
              { key: 'eventReminders', label: 'Event Reminders', description: 'Reminders for upcoming events' },
              { key: 'urgentAlerts', label: 'Urgent Alerts', description: 'Critical and time-sensitive notifications' },
              { key: 'ticketSales', label: 'Ticket Sales', description: 'Instant notifications for ticket activities' },
              ...(roleContext.isVenueOwner ? [
                { key: 'bookingAlerts', label: 'Booking Alerts', description: 'Immediate booking confirmations and updates' }
              ] : [])
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{label}</p>
                  <p className="text-sm text-gray-600">{description}</p>
                </div>
                <ToggleSwitch
                  checked={notificationSettings?.push?.[key] || false}
                  onChange={() => updateNotificationSetting('push', key, !notificationSettings?.push?.[key])}
                />
              </div>
            ))}
          </div>
        </div>

        {/* SMS Notifications */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            SMS Notifications
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Enable SMS</p>
                <p className="text-sm text-gray-600">Receive notifications via text message</p>
              </div>
              <ToggleSwitch
                checked={notificationSettings?.sms?.enabled || false}
                onChange={() => updateNotificationSetting('sms', 'enabled', !notificationSettings?.sms?.enabled)}
              />
            </div>
            
            {notificationSettings?.sms?.enabled && (
              <>
                <div className="pl-4 border-l-2 border-gray-300">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={notificationSettings?.sms?.phoneNumber || ''}
                      onChange={(e) => updateNotificationSetting('sms', 'phoneNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter your phone number"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Security Alerts</p>
                        <p className="text-sm text-gray-600">Critical security notifications</p>
                      </div>
                      <ToggleSwitch
                        checked={notificationSettings?.sms?.securityAlerts || false}
                        onChange={() => updateNotificationSetting('sms', 'securityAlerts', !notificationSettings?.sms?.securityAlerts)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">Urgent Only</p>
                        <p className="text-sm text-gray-600">Only receive urgent notifications</p>
                      </div>
                      <ToggleSwitch
                        checked={notificationSettings?.sms?.urgentOnly || false}
                        onChange={() => updateNotificationSetting('sms', 'urgentOnly', !notificationSettings?.sms?.urgentOnly)}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Email Digest */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Email Digest
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
            {[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'never', label: 'Never' }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => updateNotificationSetting('digest', 'frequency', value)}
                disabled={isSaving}
                className={`p-3 text-center border-2 rounded-lg transition-colors ${
                  notificationSettings?.digest?.frequency === value
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
          
          {(roleContext.isOrganizer || roleContext.isVenueOwner) && notificationSettings?.digest?.frequency !== 'never' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Include Analytics</p>
                  <p className="text-sm text-gray-600">Performance insights in your digest</p>
                </div>
                <ToggleSwitch
                  checked={notificationSettings?.digest?.includeAnalytics || false}
                  onChange={() => updateNotificationSetting('digest', 'includeAnalytics', !notificationSettings?.digest?.includeAnalytics)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Include Financials</p>
                  <p className="text-sm text-gray-600">Revenue and payout summaries</p>
                </div>
                <ToggleSwitch
                  checked={notificationSettings?.digest?.includeFinancials || false}
                  onChange={() => updateNotificationSetting('digest', 'includeFinancials', !notificationSettings?.digest?.includeFinancials)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
