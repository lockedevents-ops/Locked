import { NextRequest, NextResponse } from "next/server";

interface NavigationTelemetryBody {
  event?: string;
  path?: string;
  from?: string;
  to?: string;
  message?: string;
  durationMs?: number;
  timestamp?: string;
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: true });
  }

  try {
    const body = (await request.json()) as NavigationTelemetryBody;
    const timestamp = body.timestamp ?? new Date().toISOString();
    const event = body.event ?? "UNKNOWN";
    const from = body.from ? ` from=${body.from}` : "";
    const to = body.to ? ` to=${body.to}` : "";
    const path = body.path ? ` path=${body.path}` : "";
    const message = body.message ? ` message=${body.message}` : "";
    const duration = typeof body.durationMs === "number" ? ` durationMs=${body.durationMs}` : "";

    console.log(`[NAV_TELEMETRY] ${timestamp} event=${event}${from}${to}${path}${duration}${message}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[NAV_TELEMETRY] Failed to parse payload", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
