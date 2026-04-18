"use client";

export type NavigationTelemetryEvent =
  | "NAVIGATION_CHANGE"
  | "PAGE_CONTENT_READY"
  | "SPINNER_START"
  | "SPINNER_END"
  | "ORGANIZER_LOOKUP_START"
  | "ORGANIZER_LOOKUP_SUCCESS"
  | "ORGANIZER_LOOKUP_TIMEOUT"
  | "ORGANIZER_LOOKUP_ERROR";

interface NavigationTelemetryPayload {
  event: NavigationTelemetryEvent;
  path?: string;
  from?: string;
  to?: string;
  message?: string;
  durationMs?: number;
  timestamp?: string;
}

export async function emitNavigationTelemetry(payload: NavigationTelemetryPayload): Promise<void> {
  try {
    await fetch("/api/telemetry/navigation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        timestamp: payload.timestamp ?? new Date().toISOString(),
      }),
      keepalive: true,
    });
  } catch {
    // Intentionally swallow telemetry failures.
  }
}
