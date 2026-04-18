"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { emitNavigationTelemetry } from "@/lib/navigationTelemetry";

function buildCurrentUrl(pathname: string, searchParams: URLSearchParams): string {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function NavigationTelemetry() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousUrlRef = useRef<string | null>(null);
  const routeStartRef = useRef<number>(performance.now());

  useEffect(() => {
    const currentUrl = buildCurrentUrl(pathname, searchParams);
    const previousUrl = previousUrlRef.current;

    if (previousUrl !== null && previousUrl !== currentUrl) {
      routeStartRef.current = performance.now();
      void emitNavigationTelemetry({
        event: "NAVIGATION_CHANGE",
        from: previousUrl,
        to: currentUrl,
      });
    }

    if (previousUrl === null) {
      routeStartRef.current = performance.now();
      void emitNavigationTelemetry({
        event: "NAVIGATION_CHANGE",
        from: "[initial]",
        to: currentUrl,
      });
    }

    previousUrlRef.current = currentUrl;

    // Emit after paint so this approximates when content is on screen.
    const rafId = window.requestAnimationFrame(() => {
      const durationMs = Math.round(performance.now() - routeStartRef.current);
      void emitNavigationTelemetry({
        event: "PAGE_CONTENT_READY",
        path: currentUrl,
        durationMs,
      });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [pathname, searchParams]);

  return null;
}
