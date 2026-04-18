/**
 * Universal Toast Hook
 * --------------------------------------------------------------
 * Provides access to the universal toast notification system.
 * Works across the entire application (admin, user pages, public pages).
 * 
 * Usage:
 * ```tsx
 * const toast = useToast();
 * toast.showSuccess('Success!', 'Your changes have been saved.');
 * toast.showError('Error', 'Something went wrong.');
 * toast.showInfo('Info', 'Here is some information.');
 * toast.showWarning('Warning', 'Please be careful.');
 * ```
 */

import { useUniversalToast } from '@/components/toast/UniversalToastProvider';

export function useToast() {
  return useUniversalToast();
}

// Backward compatibility alias for admin pages that use useAdminToast
export { useToast as useAdminToast };

export default useToast;
