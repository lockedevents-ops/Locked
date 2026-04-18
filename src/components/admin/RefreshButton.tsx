"use client";

import React, { useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';

interface RefreshButtonProps {
  /** Query key(s) to invalidate before refresh. If provided, will invalidate cache to force fresh fetch. */
  queryKeys?: QueryKey[];
  /** Direct refresh function (e.g., refetch from React Query or custom fetch) */
  onRefresh?: () => void | Promise<void>;
  isLoading?: boolean;
  label?: string;
  className?: string;
}

/**
 * Reusable Refresh Button for Admin Pages
 * Supports both React Query cache invalidation and direct refresh functions.
 * Consistent styling with cursor-pointer across all admin pages.
 */
export function RefreshButton({ 
  queryKeys,
  onRefresh, 
  isLoading = false, 
  label = "Refresh",
  className = ""
}: RefreshButtonProps) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isLoading || isRefreshing) return; // Prevent double refresh
    setIsRefreshing(true);
    
    // Safety timeout: stop spinning after 30 seconds no matter what
    const timeoutId = setTimeout(() => {
      setIsRefreshing(false);
      console.warn(`[RefreshButton] Refresh timed out after 30s (${label})`);
    }, 30000);

    try {
      // If query keys provided, invalidate cache first to force fresh fetch
      if (queryKeys && queryKeys.length > 0) {
        await Promise.all(
          queryKeys.map(key => queryClient.invalidateQueries({ queryKey: key }))
        );
      }
      // Then call the refresh function if provided
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error(`[RefreshButton] Error during refresh (${label}):`, error);
    } finally {
      clearTimeout(timeoutId);
      setIsRefreshing(false);
    }
  };

  const loading = isLoading || isRefreshing;

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className={`flex items-center justify-center p-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 disabled:opacity-50 cursor-pointer transition-colors ${className}`}
      title={label}
    >
      <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
    </button>
  );
}
