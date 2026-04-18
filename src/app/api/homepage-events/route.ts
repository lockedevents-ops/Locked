import { NextResponse } from 'next/server';
import { sharedEventService } from '@/services/sharedEventService';
import { createClient } from '@/lib/supabase/server/server';

/**
 * ✅ PHASE 3: API Route for Homepage Events
 * 
 * Benefits:
 * - Server-side caching with Cache-Control headers
 * - Reduced client-side JavaScript execution
 * - Better cache hit rates across users
 * - CDN-friendly with stale-while-revalidate
 */

export const runtime = 'nodejs'; // ✅ COMPATIBILITY: Ensures full Node.js support and avoids Edge limitations
export const dynamic = 'force-dynamic'; // Opt out of static generation
export const revalidate = 60; // Revalidate every 60 seconds

export async function GET(request: Request) {
  try {
    // Get userId from query params if available (for personalized events)
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    
    // Create server client to ensure we don't rely on browser client
    const supabase = await createClient(); // Await because createClient is async in server.ts
    
    // Fetch homepage events using the shared service with SERVER client
    const eventData = await sharedEventService.getHomepageEvents(userId, supabase);
    
    // Return with aggressive caching headers
    return NextResponse.json(eventData, {
      status: 200,
      headers: {
        // Cache for 60 seconds, serve stale for 30 seconds while revalidating
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        // Vary by user authentication for personalized content
        'Vary': 'Cookie',
        // Add ETag for conditional requests
        'ETag': `W/"homepage-events-${Date.now()}"`,
      }
    });
  } catch (error) {
    console.error('Error in homepage-events API:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch homepage events' },
      { 
        status: 500,
        headers: {
          // Don't cache errors
          'Cache-Control': 'no-store',
        }
      }
    );
  }
}
