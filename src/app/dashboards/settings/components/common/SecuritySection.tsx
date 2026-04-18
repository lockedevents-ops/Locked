"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/useToast";
import { MobileAccordion, MobileAccordionItem, MobileSettingRow, MobileToggleSwitch, MobileButton } from '../MobileAccordion';
import {
  Shield as ShieldIcon,
  Bell as BellIcon,
  Key as KeyIcon,
  Monitor as MonitorIcon,
  AlertTriangle,
  Download,
  UserX,
  Building,
  ExternalLink,
  Mail,
} from "lucide-react";
import { ChangePasswordModal } from '../shared/ChangePasswordModal';
import Setup2FAModal from '@/components/modals/Setup2FAModal';
import { DeletionReasonModal } from '../shared/DeletionReasonModal';
import { createClient } from '@/lib/supabase/client/client';

export function SecuritySection({ user, roleContext, isMobile }: any) {
  const toast = useToast();
  const supabase = createClient();
  const [securitySettings, setSecuritySettings] = useState<any>(null);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [showSetup2FAModal, setShowSetup2FAModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isSaving2FA, setIsSaving2FA] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [cacheExpiry, setCacheExpiry] = useState<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes - matches event data caching

  // Load security settings on mount - with caching
  useEffect(() => {
    const loadSecuritySettings = async () => {
      if (!user?.id) return;
      
      // Check cache expiry - use cached data if still fresh
      const now = Date.now();
      if (hasFetchedOnce && securitySettings && now < cacheExpiry) {
        console.log('📦 Using cached security settings (fresh for', Math.round((cacheExpiry - now) / 1000), 'more seconds)');
        return;
      }
      
      // Show loading only on first fetch or after cache expires
      setIsLoading(true);
      
      try {
        const { userSettingsService } = await import('@/services/userSettingsService');
        const settings = await userSettingsService.getSecuritySettings(user.id);
        
        // Check actual MFA status from Supabase Auth
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const hasVerifiedMFA = !!(factors && factors.totp && factors.totp.some((f: any) => f.status === 'verified'));
        
        // Sync database with actual MFA state (ensure boolean shape)
        if (hasVerifiedMFA !== settings.twoFactorEnabled) {
          const updated = await userSettingsService.updateSecuritySettings(user.id, {
            twoFactorEnabled: hasVerifiedMFA,
            twoFactorMethod: hasVerifiedMFA ? 'authenticator' : null
          });
          setSecuritySettings(updated);
        } else {
          setSecuritySettings(settings);
        }
        setHasFetchedOnce(true); // Mark as fetched to prevent refetch
        setCacheExpiry(Date.now() + CACHE_DURATION); // Cache expires in 5 minutes
      } catch (error) {
        console.error('Error loading security settings:', error);
        setHasFetchedOnce(true); // Mark as fetched even on error
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSecuritySettings();
  }, [user, hasFetchedOnce, cacheExpiry, securitySettings]);

  const handleToggle2FA = async () => {
    if (!user?.id || !securitySettings) return;
    
    setIsSaving2FA(true);
    try {
      if (!securitySettings.twoFactorEnabled) {
        // Enabling 2FA - open setup modal
        setShowSetup2FAModal(true);
      } else {
        // Disabling 2FA - unenroll all factors
        const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
        if (listError) throw listError;

        if (factors && factors.totp && factors.totp.length > 0) {
          // Unenroll all TOTP factors
          for (const factor of factors.totp) {
            const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
            if (unenrollError) throw unenrollError;
          }
        }

        // Update database settings
        const { userSettingsService } = await import('@/services/userSettingsService');
        const updated = await userSettingsService.updateSecuritySettings(user.id, {
          twoFactorEnabled: false,
          twoFactorMethod: null
        });
        setSecuritySettings(updated);
        toast.showSuccess('2FA Disabled', '2FA has been disabled successfully');
      }
    } catch (error: any) {
      console.error('Error toggling 2FA:', error);
      toast.showError('Update Failed', error.message || 'Failed to update 2FA settings');
    } finally {
      setIsSaving2FA(false);
    }
  };

  const handle2FASuccess = async () => {
    // Called after successful 2FA enrollment
    try {
      const { userSettingsService } = await import('@/services/userSettingsService');
      const updated = await userSettingsService.updateSecuritySettings(user.id, {
        twoFactorEnabled: true,
        twoFactorMethod: 'authenticator'
      });
      setSecuritySettings(updated);
      toast.showSuccess('2FA Enabled', '2FA has been enabled successfully');
    } catch (error) {
      console.error('Error updating 2FA settings:', error);
      toast.showError('Update Failed', 'Failed to save 2FA settings');
    }
  };

  const handleToggleLoginNotifications = async () => {
    if (!user?.id || !securitySettings) return;
    
    setIsSavingNotifications(true);
    try {
      const { userSettingsService } = await import('@/services/userSettingsService');
      const updated = await userSettingsService.updateSecuritySettings(user.id, {
        loginNotifications: !securitySettings.loginNotifications
      });
      setSecuritySettings(updated);
      toast.showSuccess('Settings Updated', 'Login notification settings updated');
    } catch (error) {
      toast.showError('Update Failed', 'Failed to update notification settings');
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (!user?.id || !securitySettings) return;
    
    const updatedSessions = securitySettings.activeSessions.filter((s: any) => s.id !== sessionId);
    
    try {
      const { userSettingsService } = await import('@/services/userSettingsService');
      const updated = await userSettingsService.updateSecuritySettings(user.id, {
        activeSessions: updatedSessions
      });
      setSecuritySettings(updated);
      toast.showSuccess('Session Terminated', 'Session terminated successfully');
    } catch (error) {
      toast.showError('Termination Failed', 'Failed to terminate session');
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Simulate data export
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const exportData = {
        user: {
          id: user?.id,
          name: user?.name,
          email: user?.email,
          roles: roleContext.roles,
          exportedAt: new Date().toISOString()
        },
        // Add role-specific data based on user's roles
        ...(roleContext.isOrganizer && {
          organizer: {
            events: "Events data would be included",
            teamMembers: "Team data would be included",
            analytics: "Analytics data would be included"
          }
        }),
        ...(roleContext.isVenueOwner && {
          venueOwner: {
            venues: "Venue data would be included", 
            bookings: "Booking data would be included",
            revenue: "Revenue data would be included"
          }
        })
      };
      
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `locked-account-data-${user?.id}-${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.showSuccess('Export Complete', 'Account data exported successfully');
    } catch (error) {
      toast.showError('Export Failed', 'Failed to export account data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE ACCOUNT') {
      toast.showError('Confirmation Required', 'Please type "DELETE ACCOUNT" to confirm');
      return;
    }

    if (!user?.id) return;

    setIsDeleting(true);
    try {
      const { userSettingsService } = await import('@/services/userSettingsService');
      
      // 1. Call soft delete RPC with selected reason
      await userSettingsService.softDeleteAccount(user.id, deletionReason);
      
      setShowDeleteAccountModal(false);
      setShowDeleteSuccessModal(true);
      
    } catch (error: any) {
      toast.showError('Deletion Failed', error.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFinalSignOut = async () => {
    try {
      // Call server-side signout to properly clear HttpOnly cookies
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 3000);
      
      await fetch('/api/auth/signout', {
        method: 'POST',
        signal: controller.signal,
      }).catch(() => {
        // Fallback to client-side signout on timeout
        supabase.auth.signOut({ scope: 'local' });
      });
      
      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      window.location.href = '/';
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-6">
          {/* Header skeleton */}
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
          
          {/* Password section skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
          
          {/* 2FA section skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
          
          {/* Login notifications skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile accordion items for security settings
  const mobileAccordionItems = [
    {
      id: 'password',
      title: 'Password',
      icon: <KeyIcon className="h-4 w-4" />,
      children: (
        <MobileAccordionItem>
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 mb-4">
              Last changed {securitySettings ? new Date(securitySettings.passwordLastChanged).toLocaleDateString() : 'Unknown'}
            </p>
            <MobileButton
              onClick={() => setShowChangePasswordModal(true)}
              className="w-full"
            >
              <KeyIcon className="h-4 w-4 mr-2 inline" />
              Change Password
            </MobileButton>
          </div>
        </MobileAccordionItem>
      )
    },
    {
      id: 'two-factor',
      title: 'Two-Factor Authentication',
      icon: <ShieldIcon className="h-4 w-4" />,
      children: (
        <MobileAccordionItem>
          <MobileSettingRow
            title="Enable 2FA"
            description="Add an extra layer of security to your account"
            action={
              <MobileToggleSwitch
                checked={securitySettings?.twoFactorEnabled || false}
                onChange={handleToggle2FA}
                disabled={isSaving2FA}
              />
            }
            warning={roleContext.roles.length > 1 ? "2FA changes will affect access to all your dashboards" : undefined}
          />
          {securitySettings?.twoFactorEnabled && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Method:</strong> {securitySettings.twoFactorMethod === 'email' ? 'Email' : 
                                         securitySettings.twoFactorMethod === 'sms' ? 'SMS' : 
                                         securitySettings.twoFactorMethod === 'authenticator' ? 'Authenticator App' : 'Unknown'}
              </p>
            </div>
          )}
        </MobileAccordionItem>
      )
    },
    {
      id: 'login-notifications',
      title: 'Login Notifications',
      icon: <BellIcon className="h-4 w-4" />,
      children: (
        <MobileAccordionItem>
          <MobileSettingRow
            title="New Device Alerts"
            description="Get notified when someone signs into your account from a new device or location"
            action={
              <MobileToggleSwitch
                checked={securitySettings?.loginNotifications || false}
                onChange={handleToggleLoginNotifications}
                disabled={isSavingNotifications}
              />
            }
          />
        </MobileAccordionItem>
      )
    },
    {
      id: 'active-sessions',
      title: 'Active Sessions',
      icon: <MonitorIcon className="h-4 w-4" />,
      children: (
        <MobileAccordionItem>
          <div className="space-y-3">
            {securitySettings?.activeSessions?.map((session: any) => (
              <div key={session.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">
                      {session.device} {session.isCurrent && '(Current)'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {session.location}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.ipAddress} • {new Date(session.lastActive).toLocaleString()}
                    </p>
                  </div>
                  {!session.isCurrent && (
                    <MobileButton
                      onClick={() => handleTerminateSession(session.id)}
                      variant="danger"
                      size="small"
                    >
                      Terminate
                    </MobileButton>
                  )}
                </div>
              </div>
            )) || (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No active sessions found</p>
              </div>
            )}
          </div>
        </MobileAccordionItem>
      )
    }
  ];

  // Mobile layout
  if (isMobile) {
    return (
      <div className="p-4">
        {/* Multi-role warning for mobile */}
        {roleContext.roles.length > 1 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-900 mb-1">Multi-role Security</p>
                <p className="text-xs text-amber-800">
                  Settings protect all your roles ({roleContext.roles.filter((r: string) => r !== 'user').join(', ')})
                </p>
              </div>
            </div>
          </div>
        )}

        <MobileAccordion items={mobileAccordionItems} singleOpen={true} />

        {/* Export Data - Mobile */}
        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            Export Your Data
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            Download a complete copy of your account data{roleContext.roles.length > 1 ? ' from all your roles' : ''}.
          </p>
          
          {roleContext.roles.length > 1 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
              <p className="text-xs font-medium text-blue-900 mb-2">What will be included:</p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Personal account information</li>
                {roleContext.isOrganizer && (
                  <>
                    <li>• Organization profile and events</li>
                    <li>• Team and analytics</li>
                  </>
                )}
                {roleContext.isVenueOwner && (
                  <>
                    <li>• Venues and bookings</li>
                    <li>• Revenue data</li>
                  </>
                )}
              </ul>
            </div>
          )}

          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>

        {/* Multiple Role Warning - Mobile */}
        {roleContext.roles.length > 1 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="font-semibold text-amber-900 text-sm mb-2">Multiple Role Account</p>
            <p className="text-xs text-amber-800 mb-3">
              Actions affect ALL roles: {roleContext.roles.filter((r: string) => r !== 'user').join(', ')}
            </p>
            
            <div className="space-y-2 text-xs text-amber-800">
              {roleContext.isOrganizer && (
                <div className="flex items-start gap-2">
                  <Building className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>Organizer: Events, team, analytics</span>
                </div>
              )}
              {roleContext.isVenueOwner && (
                <div className="flex items-start gap-2">
                  <Building className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>Venue Owner: Venues, bookings, revenue</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delete Account - Mobile */}
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="font-semibold text-red-900 text-sm mb-2">Delete Account</p>
          <p className="text-xs text-red-700 mb-3">
            Permanently delete your account and all data. Cannot be undone.
          </p>
          
          {roleContext.roles.length > 1 && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-3">
              <p className="text-xs font-medium text-red-900 mb-2">⚠️ Deletes ALL data:</p>
              <ul className="text-xs text-red-800 space-y-1">
                <li>• Personal account</li>
                {roleContext.isOrganizer && <li>• All events & team data</li>}
                {roleContext.isVenueOwner && <li>• All venues & bookings</li>}
              </ul>
            </div>
          )}

          <button
            onClick={() => setShowDeleteAccountModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <AlertTriangle className="h-4 w-4" />
            Delete Account
          </button>
        </div>

        {/* Help - Mobile */}
        <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-2 text-sm">Need Help?</h3>
          <p className="text-xs text-gray-600 mb-3">
            Issues with your account? Contact support.
          </p>
          <div className="flex flex-col gap-2">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              <ExternalLink className="h-4 w-4" />
              Contact Support
            </button>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
              <ExternalLink className="h-4 w-4" />
              Data Protection
            </button>
          </div>
        </div>

        {/* Change Password Modal */}
        {showChangePasswordModal && (
          <ChangePasswordModal 
            isOpen={showChangePasswordModal}
            onClose={() => setShowChangePasswordModal(false)}
            userId={user?.id}
          />
        )}
      </div>
    );
  }

  // Desktop layout (revamped)
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Security & Login</h2>
        <p className="text-gray-600">
          Manage your account security settings and login preferences.
        </p>
      </div>

      {/* Multi-role security context */}
      {roleContext.roles.length > 1 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-amber-800">
            <strong>Multi-role security:</strong> Security settings protect all your roles ({roleContext.roles.filter((r: string) => r !== 'user').join(', ')}). 
            2FA and login notifications will apply to all dashboard access.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Password Section */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 sm:p-5 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <KeyIcon className="h-5 w-5 text-primary" />
              Password
            </h3>
          </div>
          <div className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                Last changed {securitySettings ? new Date(securitySettings.passwordLastChanged).toLocaleDateString() : 'Unknown'}
              </p>
              <button
                onClick={() => setShowChangePasswordModal(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors cursor-pointer"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 sm:p-5 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <ShieldIcon className="h-5 w-5 text-primary" />
              Two-Factor Authentication
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                securitySettings?.twoFactorEnabled 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {securitySettings?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </h3>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-sm text-gray-600 mb-4">
              Add an extra layer of security to your account with two-factor authentication.
            </p>
            {securitySettings?.twoFactorEnabled && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-800">
                  <strong>Method:</strong> {securitySettings.twoFactorMethod === 'email' ? 'Email' : 
                           securitySettings.twoFactorMethod === 'sms' ? 'SMS' : 
                           securitySettings.twoFactorMethod === 'authenticator' ? 'Authenticator App' : 'Unknown'}
                </p>
              </div>
            )}
            <button
              onClick={handleToggle2FA}
              disabled={isSaving2FA}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                securitySettings?.twoFactorEnabled
                  ? 'bg-gray-800 text-white hover:bg-gray-900 border border-gray-700'
                  : 'bg-primary text-white hover:bg-primary-dark'
              }`}
            >
              {isSaving2FA ? 'Updating...' : securitySettings?.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          </div>
        </div>

        {/* Login Notifications */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 sm:p-5 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <BellIcon className="h-5 w-5 text-primary" />
              Login Notifications
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                securitySettings?.loginNotifications 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {securitySettings?.loginNotifications ? 'Enabled' : 'Disabled'}
              </span>
            </h3>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-sm text-gray-600 mb-4">
              Get notified when someone signs into your account from a new device or location.
            </p>
            <button
              onClick={handleToggleLoginNotifications}
              disabled={isSavingNotifications}
              className={`w-full sm:w-auto px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 ${
                securitySettings?.loginNotifications
                  ? 'bg-gray-800 text-white hover:bg-gray-900 border border-gray-700'
                  : 'bg-primary text-white hover:bg-primary-dark'
              }`}
            >
              {isSavingNotifications ? 'Updating...' : securitySettings?.loginNotifications ? 'Disable Notifications' : 'Enable Notifications'}
            </button>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 sm:p-5 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <MonitorIcon className="h-5 w-5 text-primary" />
              Active Sessions
            </h3>
          </div>
          <div className="p-4 sm:p-5">
            <div className="space-y-3">
              {securitySettings?.activeSessions?.map((session: any) => (
                <div key={session.id} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <MonitorIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {session.device} {session.isCurrent && '(Current)'}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {session.location} • {session.ipAddress}
                      </p>
                      <p className="text-xs text-gray-500">
                        Last active {new Date(session.lastActive).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <button
                      onClick={() => handleTerminateSession(session.id)}
                      className="w-full sm:w-auto px-3 py-1.5 text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                    >
                      Terminate
                    </button>
                  )}
                </div>
              )) || (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  No active sessions found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Export Data Section */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 sm:p-5 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Export Your Data
            </h3>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-gray-600 mb-4">
              Download a complete copy of your account data{roleContext.roles.length > 1 ? ' from all your roles' : ''}.
            </p>
            
            {roleContext.roles.length > 1 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 mb-2">What will be included:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Personal account information</li>
                  {roleContext.isOrganizer && (
                    <>
                      <li>• Organization profile and events data</li>
                      <li>• Team member information and analytics</li>
                    </>
                  )}
                  {roleContext.isVenueOwner && (
                    <>
                      <li>• Venue listings and booking history</li>
                      <li>• Revenue and performance data</li>
                    </>
                  )}
                  <li>• Settings and preferences</li>
                </ul>
              </div>
            )}

            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export Data'}
            </button>
          </div>
        </div>

        {/* Role-Specific Data Warning */}
        {roleContext.roles.length > 1 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 sm:p-5">
            <h3 className="font-semibold text-amber-900 mb-2">Multiple Role Account</h3>
            <p className="text-amber-800 text-sm mb-3">
              Your account has multiple roles ({roleContext.roles.filter((r: string) => r !== 'user').join(', ')}). 
              Any account actions will affect ALL your roles and associated data.
            </p>
            
            <div className="space-y-2 text-sm text-amber-800">
              {roleContext.isOrganizer && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 flex-shrink-0" />
                  <span>Organizer: Events, team members, and analytics will be affected</span>
                </div>
              )}
              {roleContext.isVenueOwner && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 flex-shrink-0" />
                  <span>Venue Owner: Venues, bookings, and revenue data will be affected</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Account Deletion Section */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 sm:p-5">
          <h3 className="font-semibold text-red-900 mb-2 font-bold flex items-center gap-2">
            <UserX className="h-5 w-5" />
            Delete Account
          </h3>
          <p className="text-red-700 mb-6">
            Permanently delete your account and all associated data. This initiates a 30-day grace period where your account is deactivated but recoverable. After 30 days, all data is permanently purged.
          </p>
          
          {roleContext.roles.length > 1 && (
            <div className="bg-red-100 border border-red-300 rounded-xl p-4 mb-6">
              <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2 uppercase text-xs tracking-wider">
                <AlertTriangle className="h-4 w-4" />
                Warning: Multi-Role Account
              </h4>
              <p className="text-sm text-red-800 mb-3 font-medium">This will delete EVERYTHING associated with your account:</p>
              <ul className="text-xs text-red-700 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="font-bold font-mono">01.</span>
                  <span>Personal identification and profile settings across the platform.</span>
                </li>
                {roleContext.isOrganizer && (
                  <li className="flex items-start gap-2">
                    <span className="font-bold font-mono">02.</span>
                    <span>All organizers-related data, events, team member access, and analytics.</span>
                  </li>
                )}
                {roleContext.isVenueOwner && (
                  <li className="flex items-start gap-2">
                    <span className="font-bold font-mono">03.</span>
                    <span>All venues managed, booking records, revenue reports, and customer lists.</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          <button
            onClick={() => setShowReasonModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all transform hover:scale-[1.02] active:scale-95 shadow-md font-bold cursor-pointer"
          >
            <AlertTriangle className="h-5 w-5" />
            Delete Account
          </button>
        </div>

        {/* Help and Support */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 sm:p-5 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Need Help?</h3>
          </div>
          <div className="p-4 sm:p-5">
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">
              If you're having issues with your account or need to transfer ownership of an organization or venue, please contact our dedicated support team instead of deleting your account.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all cursor-pointer font-medium text-gray-700">
                <ExternalLink className="h-4 w-4" />
                Contact Support
              </button>
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all cursor-pointer font-medium text-gray-700">
                <ShieldIcon className="h-4 w-4" />
                Privacy Policy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals Section */}
      <div className="modals-container">
        {/* Change Password Modal */}
        {showChangePasswordModal && (
          <ChangePasswordModal 
            isOpen={showChangePasswordModal}
            onClose={() => setShowChangePasswordModal(false)}
            userId={user?.id}
          />
        )}

        {/* Deletion Reason Modal */}
        <DeletionReasonModal
          isOpen={showReasonModal}
          onClose={() => setShowReasonModal(false)}
          onConfirm={(reason) => {
            setDeletionReason(reason);
            setShowReasonModal(false);
            setShowDeleteAccountModal(true);
          }}
        />

        {/* Delete Account Confirmation Modal */}
        {showDeleteAccountModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
            <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200 border border-red-100">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4 text-red-600 animate-pulse">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Final Confirmation</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  You are about to deactivate your account. All services will be disabled immediately. Please type "DELETE ACCOUNT" to authorize this action.
                </p>
              </div>

              <div className="mb-8">
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-[0.2em]">
                  Authorization Phrase
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full px-4 py-4 bg-red-50/50 border border-red-100 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all font-mono text-center text-red-900 placeholder:text-red-200"
                  placeholder="DELETE ACCOUNT"
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowDeleteAccountModal(false);
                    setConfirmText('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all cursor-pointer"
                  disabled={isDeleting}
                >
                  Go Back
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || confirmText !== 'DELETE ACCOUNT'}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-lg cursor-pointer"
                >
                  {isDeleting ? 'Processing...' : 'Delete Forever'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Success Modal */}
        {showDeleteSuccessModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[80]">
            <div className="bg-white rounded-3xl max-w-md w-full p-10 shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="text-center mb-8">
                <div className="mx-auto w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center mb-6 text-blue-600 shadow-inner">
                  <Mail className="h-12 w-12" />
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">Safely Initiated</h3>
                <p className="text-gray-600 leading-relaxed">
                  Your account is now scheduled for deletion. We've logged you out for your security.
                </p>
              </div>

              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 mb-10 shadow-sm">
                <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <ShieldIcon className="h-4 w-4" />
                  Your Data Policy
                </h4>
                <ul className="text-sm text-blue-800 space-y-4">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Deactivation period: <strong>30 days</strong> starting from now.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Identity and assets are hidden from public view during this time.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Recovery: Email <a href="mailto:lockedeventsgh@gmail.com" className="font-bold underline decoration-2 underline-offset-2">lockedeventsgh@gmail.com</a>.</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleFinalSignOut}
                className="w-full py-5 bg-gray-950 text-white rounded-2xl font-black hover:bg-black transition-all transform hover:scale-[1.02] active:scale-95 shadow-2xl shadow-gray-200 cursor-pointer text-lg tracking-tight"
              >
                Accept and Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Setup 2FA Modal */}
        <Setup2FAModal 
          isOpen={showSetup2FAModal} 
          onClose={() => {
            setShowSetup2FAModal(false);
            setIsSaving2FA(false);
          }} 
          onSuccess={handle2FASuccess} 
        />
      </div>
    </div>
  );
}
