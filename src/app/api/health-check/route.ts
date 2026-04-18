import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint
 * --------------------------------------------------------------
 * Called by Vercel Cron every 5 minutes to keep serverless functions warm.
 * This prevents cold starts for critical Node.js API routes (Auth/Admin).
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    { status: 200 }
  );
}
