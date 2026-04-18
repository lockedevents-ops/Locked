// ============================================================================
// Settings Components - Central Export File
// ============================================================================
// ✅ PHASE 2 COMPLETE: All common components extracted
// ✅ PHASE 3 COMPLETE: Organizer & Venue Owner components extracted
//
// All components have been extracted to separate files for better:
// - Code organization and maintainability
// - Lazy loading and performance optimization
// - Team collaboration and parallel development
// - Testing and debugging isolation
// ============================================================================

// Export common components (for all authenticated users)
export { SecuritySection, NotificationsSection, PrivacySection, PreferencesSection, SocialsSection } from './common';

// Export organizer-specific components
export { OrganizationSection, TeamManagementSection, PaymentSettingsSection } from './organizer';

// Export venue owner-specific components
export { VenueSettingsSection } from './venue-owner';

// Export shared utilities
export { ChangePasswordModal } from './shared/ChangePasswordModal';
export { AddPaymentMethodModal } from './shared/AddPaymentMethodModal';

// Export mobile accordion utilities (used by other components)
export { MobileAccordion, MobileAccordionItem, MobileSettingRow, MobileToggleSwitch, MobileButton } from './MobileAccordion';

// ============================================================================
// Component Structure:
// ============================================================================
// common/
//   ├── SecuritySection.tsx        - Password, 2FA, sessions
//   ├── NotificationsSection.tsx   - Email, push, in-app preferences
//   ├── PrivacySection.tsx         - Profile visibility, data settings
//   ├── PreferencesSection.tsx     - Language, timezone, display
//   ├── SocialsSection.tsx         - Social media links
//   └── index.ts                   - Exports all common components
//
// organizer/
//   ├── OrganizationSection.tsx    - Logo, banner, business info
//   ├── TeamManagementSection.tsx  - Team collaboration (Coming Soon)
//   ├── PaymentSettingsSection.tsx - Payment methods, payouts, tax
//   └── index.ts                   - Exports all organizer components
//
// venue-owner/
//   ├── VenueSettingsSection.tsx   - Venue configuration (Coming Soon)
//   └── index.ts                   - Exports all venue owner components
//
// shared/
//   ├── ChangePasswordModal.tsx    - Password change modal
//   ├── AddPaymentMethodModal.tsx  - Payment method modal
//   └── index.ts                   - Exports shared components
//
// MobileAccordion.tsx              - Mobile UI utilities
// PersonalInformationSection.tsx   - Personal profile settings
// DangerZoneSection.tsx            - Account deletion
// ============================================================================
