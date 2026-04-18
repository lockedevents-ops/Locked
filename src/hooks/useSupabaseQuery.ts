import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client/client';
import { useAuth } from '@/contexts/AuthContext';

interface UseSupabaseQueryOptions<T> {
  queryFn: () => Promise<T>;
  enabled?: boolean;
  refetchOnMount?: boolean;
  staleTime?: number;
  cacheKey?: string;
}

interface UseSupabaseQueryReturn<T> {
  data: T | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Simple in-memory cache
const queryCache = new Map<string, { data: any; timestamp: number }>();

// In-flight request map for deduplication: cacheKey -> Promise
const inflightRequests = new Map<string, Promise<any>>();

export function useSupabaseQuery<T = any>(
  options: UseSupabaseQueryOptions<T>
): UseSupabaseQueryReturn<T> {
  const { isReady } = useAuth();
  const {
    queryFn,
    enabled = true,
    refetchOnMount = true,
    staleTime = 60000, // 1 minute default
    cacheKey
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const latestRequestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const executeQuery = useCallback(async ({ force } = { force: false }) => {
    const requestId = ++latestRequestIdRef.current;
    const isStaleRequest = () => !mountedRef.current || requestId !== latestRequestIdRef.current;

    if (!enabled || !isReady) {
      if (!isStaleRequest()) setIsLoading(false);
      return;
    }

    const cachedEntry = cacheKey ? queryCache.get(cacheKey) : undefined;
    const cacheAge = cachedEntry ? Date.now() - cachedEntry.timestamp : null;

    if (cacheKey) {
      console.log('[useSupabaseQuery] Query start', {
        cacheKey,
        force,
        hasCache: Boolean(cachedEntry),
        cacheAge,
        staleTime
      });
    }

    // Check cache first
    if (cachedEntry) {
      if (!force && cacheAge !== null && cacheAge < staleTime) {
        console.log('[useSupabaseQuery] Using cached data for:', cacheKey);
        if (!isStaleRequest()) {
          setData(cachedEntry.data);
          setIsLoading(false);
        }
        return;
      } else if (!force) {
        console.log('[useSupabaseQuery] Cache stale, serving stale data while refreshing:', cacheKey);
        if (!isStaleRequest()) {
          setData(cachedEntry.data);
          setIsLoading(false);
          setIsError(false);
          setError(null);
        }
      } else {
        if (!isStaleRequest()) setIsLoading(true);
      }
    } else {
      if (!isStaleRequest()) setIsLoading(true);
    }

    if (!isStaleRequest()) {
      setIsError(false);
      setError(null);
    }

    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    // If there's an in-flight request for this cacheKey, reuse it
    if (cacheKey && inflightRequests.has(cacheKey)) {
      try {
        const sharedPromise = inflightRequests.get(cacheKey)!;
        const result = await sharedPromise;
        if (!isStaleRequest()) {
          setData(result);
          setIsLoading(false);
        }
        return;
      } catch (err) {
        lastError = err as Error;
        if (!isStaleRequest()) {
          setError(lastError);
          setIsError(true);
          setIsLoading(false);
        }
        return;
      }
    }

    // Create a fetch promise and store it in the inflight map (if we have a cacheKey)
    const fetchPromise = (async () => {
      for (let retry = 0; retry < MAX_RETRIES; retry++) {
        try {
          console.log('[useSupabaseQuery] Fetching data, attempt:', retry + 1);
          const result = await queryFn();

          // Cache the result
          if (cacheKey) {
            queryCache.set(cacheKey, { data: result, timestamp: Date.now() });
          }

          return result;
        } catch (err) {
          lastError = err as Error;
          console.error(`[useSupabaseQuery] Error (attempt ${retry + 1}):`, err);

          if (retry < MAX_RETRIES - 1) {
            // Wait before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retry) * 1000));
          }
        }
      }
      throw lastError;
    })();

    if (cacheKey) inflightRequests.set(cacheKey, fetchPromise);

    try {
      const result = await fetchPromise;
      if (!isStaleRequest()) {
        setData(result);
        setIsLoading(false);
        setIsError(false);
      }
      return;
    } catch (err) {
      lastError = err as Error;
      if (!isStaleRequest()) {
        setError(lastError);
        setIsError(true);
        setIsLoading(false);
      }
      return;
    } finally {
      if (cacheKey) inflightRequests.delete(cacheKey);
    }

    // All retries failed
    setError(lastError);
    setIsError(true);
    setIsLoading(false);
  }, [enabled, isReady, queryFn, cacheKey, staleTime]);

  const refetch = useCallback(async () => {
    // Clear cache for this key
    if (cacheKey) {
      queryCache.delete(cacheKey);
    }
    setAttemptCount(prev => prev + 1);
    await executeQuery({ force: true });
  }, [executeQuery, cacheKey]);

  // Execute query on mount and when dependencies change
  useEffect(() => {
    if (refetchOnMount || attemptCount > 0) {
      executeQuery();
    }
  }, [executeQuery, refetchOnMount, attemptCount]);

  // Add timeout for loading state
  useEffect(() => {
    if (!isLoading) return;

    const timeoutRequestId = latestRequestIdRef.current;
    const timeout = setTimeout(() => {
      if (isLoading && timeoutRequestId === latestRequestIdRef.current && mountedRef.current) {
        console.error('[useSupabaseQuery] Query timeout');
        // Invalidate any eventual late result from the timed-out request.
        latestRequestIdRef.current += 1;
        setError(new Error('Query timeout - please refresh the page'));
        setIsError(true);
        setIsLoading(false);
      }
    }, 30000); // 30 second timeout

    return () => clearTimeout(timeout);
  }, [isLoading]);

  return { data, isLoading, isError, error, refetch };
}

// Function to clear all cache
export function clearQueryCache(keyPattern?: string) {
  if (keyPattern) {
    // Clear specific keys matching pattern
    for (const key of queryCache.keys()) {
      if (key.includes(keyPattern)) {
        queryCache.delete(key);
      }
    }
  } else {
    // Clear all cache
    queryCache.clear();
  }
}

/**
 * Optimistic mutation helper hook.
 * Usage:
 * const { mutate, isMutating } = useOptimisticMutation(mutateFn, { onMutate, onError, onSuccess, invalidateKeys })
 */
export function useOptimisticMutation<TVariables = any, TResponse = any>(
  mutateFn: (vars: TVariables) => Promise<TResponse>,
  options?: {
  onMutate?: (vars: TVariables) => Record<string, any> | undefined; // return context (snapshot)
    onError?: (err: any, vars: TVariables, context?: Record<string, any>) => void;
    onSuccess?: (data: TResponse, vars: TVariables, context?: Record<string, any>) => void;
    invalidateKeys?: string[]; // keys or substrings to invalidate after success
  }
) {
  const [isMutating, setIsMutating] = useState(false);

  const mutate = useCallback(async (vars: TVariables) => {
    setIsMutating(true);
  let context: Record<string, any> | undefined = undefined;

    try {
      // Call onMutate to get optimistic update snapshot
      if (options?.onMutate) {
        context = options.onMutate(vars) || undefined;
      }

      const result = await mutateFn(vars);

      // Invalidate matching cache keys
      if (options?.invalidateKeys) {
        for (const pattern of options.invalidateKeys) {
          for (const key of Array.from(queryCache.keys())) {
            if (key.includes(pattern)) queryCache.delete(key);
          }
        }
      }

      if (options?.onSuccess) options.onSuccess(result, vars, context);

      return result;
    } catch (err) {
      // Rollback if context provided
      if (context) {
        for (const [k, v] of Object.entries(context)) {
          queryCache.set(k, { data: v, timestamp: Date.now() });
        }
      }

      if (options?.onError) options.onError(err, vars, context);
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, [mutateFn, options]);

  return { mutate, isMutating };
}
