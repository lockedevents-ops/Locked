"use client";
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { SESSION_CONFIG } from '@/config/sessionConfig';

/**
 * IdleLogout – automatically signs the user out after inactivity.
 * ----------------------------------------------------------------
 * Tracks mouse / keyboard / scroll / visibility changes. Resets
 * timer on activity. When threshold exceeded: clears React Query
 * cache + performs signOut (secure cleanup of sensitive data).
 */
// Single-source configuration: default pulled from SESSION_CONFIG.IDLE_LOGOUT_MS
// Optional prop allows temporary override (e.g. testing) without changing global config.
export function IdleLogout({ inactivityMs }: { inactivityMs?: number } = {}) {
  const { signOut, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActiveRef = useRef<number>(Date.now());
  const signingOutRef = useRef(false);
  const toast = useToast();

  useEffect(() => {
    const effectiveMs = inactivityMs ?? SESSION_CONFIG.IDLE_LOGOUT_MS;
    console.debug('[IdleLogout] Active inactivity threshold (ms):', effectiveMs);
    // If user is not authenticated, ensure the signing out guard resets so a future login re-arms logout
    if (!isAuthenticated) {
      signingOutRef.current = false; // allow next inactivity cycle after re-login
      return; // no listeners while logged out
    }

    // User just became authenticated (or re-authenticated). Make sure guard is cleared.
    signingOutRef.current = false;

    const resetTimer = () => {
      lastActiveRef.current = Date.now();
      if (timerRef.current) clearTimeout(timerRef.current);
  timerRef.current = setTimeout(handleTimeout, effectiveMs);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') resetTimer();
    };

    const handleTimeout = async () => {
  if (signingOutRef.current) return; // already processing / processed
      signingOutRef.current = true;
      try {
        // Don't log here - signOut() will handle logging with 'idle' reason
        // This prevents duplicate logging
        toast.showInfo('You were signed out due to inactivity');
        queryClient.clear();
        await signOut('idle'); // Pass reason to signOut for proper logging
      } catch (e) {
        console.error('Idle logout failed', e);
      }
    };

    const activityEvents: (keyof DocumentEventMap | keyof WindowEventMap)[] = [
      'mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'
    ];
    activityEvents.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibility);
    resetTimer();

    return () => {
      activityEvents.forEach(ev => window.removeEventListener(ev, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, inactivityMs, signOut, queryClient]);

  return null;
}
