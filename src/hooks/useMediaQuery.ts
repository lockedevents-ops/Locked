/**
 * useMediaQuery – Responsive Media Query Hook
 * --------------------------------------------------------------
 * CURRENT ROLE:
 *  - Returns boolean match state for a media query (client-only).
 *
 * MIGRATION / FUTURE:
 *  - Can be kept as-is; optionally unify with a design-system breakpoint utility.
 */
import { useState, useEffect } from 'react';

/**
 * Custom hook that returns whether a media query matches
 * @param query The media query to check
 * @returns A boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false);
  
  useEffect(() => {
    // Check for window to avoid SSR issues
    if (typeof window === 'undefined') return;
    
    // Create the media query list
    const mediaQuery = window.matchMedia(query);
    
    // Set initial value
    setMatches(mediaQuery.matches);
    
    // Define listener function
    const handleResize = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    
    // Add the event listener
    if (typeof mediaQuery.addEventListener === 'function') {
      // Modern browsers
      mediaQuery.addEventListener('change', handleResize);
      return () => {
        mediaQuery.removeEventListener('change', handleResize);
      };
    } else {
      // Fallback for older browsers
      // @ts-ignore - for legacy browsers
      mediaQuery.addListener(handleResize);
      return () => {
        // @ts-ignore - for legacy browsers
        mediaQuery.removeListener(handleResize);
      };
    }
  }, [query]);
  
  return matches;
}