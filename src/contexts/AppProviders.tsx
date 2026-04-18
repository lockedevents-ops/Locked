"use client";

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { UniversalToastProvider } from '@/components/toast/UniversalToastProvider';
// Backward compatibility - AdminToastProvider is now UniversalToastProvider
import { UniversalToastProvider as AdminToastProvider } from '@/components/toast/UniversalToastProvider';

/**
 * AppProviders – wraps global client-side context providers
 * ---------------------------------------------------------
 * - React Query: Optimized caching for better performance
 * - AuthProvider: existing auth/session logic
 * - UniversalToastProvider: universal toast notifications for entire app (admin + user pages)
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  // Single QueryClient instance (lazy init for RSC boundaries)
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // ✅ PHASE 2 OPTIMIZATION: Optimized React Query settings
        staleTime: 15 * 60 * 1000, // 15 minutes - data stays fresh longer
        gcTime: 30 * 60 * 1000, // 30 minutes - keep unused data in cache longer
        refetchOnReconnect: true, // Refetch when reconnecting to network
        refetchOnMount: false, // Don't refetch on component mount (use cache)
        refetchOnWindowFocus: false, // Don't refetch on window focus (reduces API calls)
        retry: 1, // Only retry failed requests once
        // Show cached data instantly, no background refetch unless explicitly triggered
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <UniversalToastProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </UniversalToastProvider>
    </QueryClientProvider>
  );
}

// Export for backward compatibility
export { AdminToastProvider };
