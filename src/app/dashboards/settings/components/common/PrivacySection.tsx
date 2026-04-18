"use client";

/**
 * Privacy Settings Component
 * 
 * NOTE: This section is currently disabled as privacy settings are not needed
 * in the current implementation. Users can only view their own profiles.
 * 
 * Features like profile_visibility, allow_messages, allow_event_invitations
 * will be re-enabled when the live chat / messaging feature is implemented.
 * 
 * For now, all privacy fields are managed by the backend and default to safe values.
 */

export function PrivacySection({ user, roleContext, isMobile }: any) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Privacy</h2>
        <p className="text-gray-600">Privacy settings will be available when messaging features are added.</p>
      </div>
      
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
          <p className="text-gray-600">
            Privacy settings will be enabled when we add live chat and messaging features. 
            Currently, all user profiles are private and can only be viewed by the account owner.
          </p>
        </div>
      </div>
    </div>
  );
}
