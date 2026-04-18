"use client";

import { useState } from "react";
import { 
  AlertTriangle, 
  Download, 
  UserX, 
  Building, 
  Users, 
  CreditCard,
  X,
  ExternalLink,
  Mail,
  Shield,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { DeletionReasonModal } from "./shared/DeletionReasonModal";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

interface RoleContext {
  isOrganizer: boolean;
  isVenueOwner: boolean;
  roles: string[];
}

interface DangerZoneSectionProps {
  user: any;
  roleContext: RoleContext;
  isMobile?: boolean;
}

export function DangerZoneSection({ user, roleContext, isMobile }: DangerZoneSectionProps) {
  const toast = useToast();
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showDeleteSuccessModal, setShowDeleteSuccessModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isVerifyingIdentity, setIsVerifyingIdentity] = useState(false);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle identity verification from email link
  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setIdentityVerified(true);
      setShowDeleteAccountModal(true); // Re-open modal if they were in the flow
      
      // Clean up URL
      const params = new URLSearchParams(searchParams.toString());
      params.delete('verified');
      const newPath = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
      window.history.replaceState({}, '', newPath);
      
      toast.showSuccess('Identity Verified', 'You can now proceed with sensitive actions.');
    }
  }, [searchParams]);

  const hasMultipleRoles = roleContext.roles.length > 1;
  const businessRoles = roleContext.roles.filter(role => role !== 'user');

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

  const handleSendVerification = async () => {
    setIsSendingVerification(true);
    try {
      const response = await fetch('/api/auth/reauthenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast.showSuccess('Verification Sent', 'Please check your email to verify your identity.');
    } catch (error: any) {
      toast.showError('Error', error.message);
    } finally {
      setIsSendingVerification(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!identityVerified) {
      toast.showError('Verification Required', 'Please verify your identity via email first');
      return;
    }

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
        import('@/lib/supabase/client/client').then(({ createClient }) => {
          createClient().auth.signOut({ scope: 'local' });
        });
      });
      
      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      // Fallback redirect if signOut fails
      window.location.href = '/';
    }
  };

  return (
    <div className={isMobile ? "p-4" : "p-8"}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Management</h2>
        <p className="text-gray-600">
          Export your data and manage your account {hasMultipleRoles ? 'across all roles' : ''}.
        </p>
      </div>

      <div className="space-y-8">
        {/* Export Data Section */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Export Your Data
              </h3>
              <p className="text-gray-600 mb-4">
                Download a complete copy of your account data{hasMultipleRoles ? ' from all your roles' : ''}.
              </p>
              
              {hasMultipleRoles && (
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
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export Data'}
              </button>
            </div>
          </div>
        </div>

        {/* Role-Specific Data Warning */}
        {hasMultipleRoles && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-2">Multiple Role Account</h3>
                <p className="text-amber-800 text-sm mb-3">
                  Your account has multiple roles ({businessRoles.join(', ')}). 
                  Any account actions will affect ALL your roles and associated data.
                </p>
                
                <div className="space-y-2 text-sm text-amber-800">
                  {roleContext.isOrganizer && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <span>Organizer: Events, team members, and analytics will be affected</span>
                    </div>
                  )}
                  {roleContext.isVenueOwner && (
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      <span>Venue Owner: Venues, bookings, and revenue data will be affected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Deletion Section */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                <UserX className="h-5 w-5 text-red-600" />
                Delete Account
              </h3>
              <p className="text-red-700 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              
              {hasMultipleRoles && (
                <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-red-900 mb-2">⚠️ This will delete ALL your data:</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• Personal account and profile information</li>
                    {roleContext.isOrganizer && (
                      <>
                        <li>• All your events and attendee data</li>
                        <li>• Team member access and organization profile</li>
                        <li>• Event analytics and performance history</li>
                      </>
                    )}
                    {roleContext.isVenueOwner && (
                      <>
                        <li>• All your venue listings</li>
                        <li>• Booking history and customer data</li>
                        <li>• Revenue reports and business analytics</li>
                      </>
                    )}
                    <li>• Settings, preferences, and payment methods</li>
                  </ul>
                </div>
              )}

              <button
                onClick={() => setShowReasonModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <AlertTriangle className="h-4 w-4" />
                Delete Account
              </button>
            </div>
          </div>
        </div>

        {/* Help and Support */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
          <p className="text-gray-600 mb-4">
            If you're having issues with your account or need to transfer data, contact our support team.
          </p>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <ExternalLink className="h-4 w-4" />
              Contact Support
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <ExternalLink className="h-4 w-4" />
              Data Protection
            </button>
          </div>
        </div>
      </div>

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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Account</h3>
              <p className="text-gray-600">
                This will permanently delete your account{hasMultipleRoles ? ' and ALL role-specific data' : ''}. 
                This action cannot be undone.
              </p>
            </div>

            {hasMultipleRoles && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800 font-medium mb-2">
                  You have multiple roles. This will delete:
                </p>
                <ul className="text-xs text-red-700 space-y-1">
                  {businessRoles.map(role => (
                    <li key={role}>• All {role} data and permissions</li>
                  ))}
                  <li>• Personal account information</li>
                </ul>
              </div>
            )}

            {/* Identity Verification Step */}
            {!identityVerified ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 mb-1">Verify Identity</p>
                    <p className="text-xs text-amber-700 mb-3">
                      For your security, you must verify your identity before deleting your account.
                    </p>
                    <button
                      onClick={handleSendVerification}
                      disabled={isSendingVerification}
                      className="text-xs font-semibold text-amber-900 underline hover:text-amber-700 disabled:opacity-50"
                    >
                      {isSendingVerification ? 'Sending...' : 'Send Verification Link'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Identity Verified</p>
                    <p className="text-xs text-green-700">
                      You can now proceed with account deletion.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type "DELETE ACCOUNT" to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="DELETE ACCOUNT"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteAccountModal(false);
                  setConfirmText('');
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || confirmText !== 'DELETE ACCOUNT' || !identityVerified}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Account Success Modal */}
      {showDeleteSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-6">
                <Mail className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Account Scheduled for Deletion</h3>
              <p className="text-gray-600 leading-relaxed">
                Your account has been successfully scheduled for deletion. For your security, you are now being logged out.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8 text-left">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Important Information:
              </h4>
              <ul className="text-sm text-blue-800 space-y-3">
                <li className="flex gap-2">
                  <span className="font-bold">•</span>
                  <span>Your data will be permanently purged in <strong>30 days</strong>.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">•</span>
                  <span>You will no longer be able to log in to this account.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold">•</span>
                  <span>To restore your account, please contact <a href="mailto:lockedeventsgh@gmail.com" className="font-bold underline">lockedeventsgh@gmail.com</a> before the 30-day period expires.</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleFinalSignOut}
              className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg"
            >
              Confirm and Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
