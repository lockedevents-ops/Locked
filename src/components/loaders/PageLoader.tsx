"use client";

import React, { useEffect, useRef } from 'react';
import { AppleSpinner } from '@/components/loaders/AppleSpinner';
import { emitNavigationTelemetry } from '@/lib/navigationTelemetry';

interface PageLoaderProps {
  message?: string;
  fullHeight?: boolean;
  size?: number;
}

export function PageLoader({
  message = 'Loading...',
  fullHeight = false,
  size = 28,
}: PageLoaderProps) {
  const spinnerStartedAtRef = useRef<number>(performance.now());

  // Keep loader copy concise and consistent across pages.
  const normalizedMessage = message?.toLowerCase().startsWith('loading ') ? 'Loading...' : message;

  useEffect(() => {
    const currentUrl = typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : 'unknown';

    spinnerStartedAtRef.current = performance.now();
    void emitNavigationTelemetry({
      event: 'SPINNER_START',
      path: currentUrl,
      message: normalizedMessage,
    });

    return () => {
      const durationMs = Math.round(performance.now() - spinnerStartedAtRef.current);
      void emitNavigationTelemetry({
        event: 'SPINNER_END',
        path: currentUrl,
        message: normalizedMessage,
        durationMs,
      });
    };
  }, [normalizedMessage]);

  return (
    <div className={`${fullHeight ? 'min-h-[60vh]' : 'py-16'} flex items-center justify-center`.trim()}>
      <div className="flex flex-col items-center gap-5 text-center">
        <AppleSpinner size={size} />
        <p className="text-sm text-neutral-600">{normalizedMessage}</p>
      </div>
    </div>
  );
}
