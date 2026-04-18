/**
 * useSessionManagement Hook
 * 
 * Automatically manages Supabase session lifecycle for pages with long forms
 * or critical operations. Prevents session expiration during user activity.
 * 
 * Usage:
 * ```typescript
 * import { useSessionManagement } from '@/hooks/useSessionManagement';
 * 
 * export default function MyPage() {
 *   // Add this one line to enable automatic session management
 *   useSessionManagement();
 *   
 *   // Rest of your component...
 * }
 * ```
 * 
 * Features:
 * - Background session refresh every 10 minutes
 * - Automatic cleanup on component unmount
 * - Console logging for debugging
 * - Can be disabled via parameter
 * 
 * @param enabled - Whether to enable session management (default: true)
 * @param intervalMs - Refresh interval in milliseconds (default: 10 minutes)
 */

import { useEffect } from 'react';
import { keepSessionAlive } from '@/lib/sessionManager';

interface UseSessionManagementOptions {
  /** Whether to enable session management (default: true) */
  enabled?: boolean;
  /** Refresh interval in milliseconds (default: 10 minutes) */
  intervalMs?: number;
  /** Custom log prefix for debugging (default: 'Session Management') */
  logPrefix?: string;
}

export function useSessionManagement(options: UseSessionManagementOptions = {}) {
  const { 
    enabled = true, 
    intervalMs = 10 * 60 * 1000, // 10 minutes default
    logPrefix = 'Session Management'
  } = options;

  useEffect(() => {
    // Skip if disabled
    if (!enabled) {
      return;
    }

    // Background refresh ownership is centralized in AuthContext.
    // This hook now keeps interaction-based touchpoints only.
    const handleInteraction = () => {
      keepSessionAlive(5 * 60 * 1000);
    };

    window.addEventListener('input', handleInteraction);
    window.addEventListener('click', handleInteraction);

    return () => {
      window.removeEventListener('input', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, [enabled, intervalMs, logPrefix]);
}

/**
 * Hook for pages with form interactions
 * Adds both background monitoring AND interaction-based keep-alive
 * 
 * Usage:
 * ```typescript
 * import { useSessionManagementWithInteraction } from '@/hooks/useSessionManagement';
 * 
 * export default function MyFormPage() {
 *   useSessionManagementWithInteraction();
 *   
 *   // Rest of your component...
 * }
 * ```
 */
export function useSessionManagementWithInteraction(options: UseSessionManagementOptions = {}) {
  const { 
    enabled = true, 
    intervalMs = 10 * 60 * 1000,
    logPrefix = 'Session Management (Interactive)'
  } = options;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Interaction-based keep-alive (throttled to 5 minutes)
    const handleInteraction = () => {
      keepSessionAlive(5 * 60 * 1000);
    };
    
    // Listen to form interactions
    window.addEventListener('input', handleInteraction);
    window.addEventListener('click', handleInteraction);
    
    // Cleanup
    return () => {
      window.removeEventListener('input', handleInteraction);
      window.removeEventListener('click', handleInteraction);
    };
  }, [enabled, intervalMs, logPrefix]);
}
