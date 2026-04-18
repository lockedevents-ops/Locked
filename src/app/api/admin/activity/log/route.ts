import { createClient } from '@/lib/supabase/server/server';
import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await request.json();
    const {
      admin_user_id,
      admin_user_name,
      admin_user_email,
      admin_user_role,
      action_type,
      target_type,
      target_id,
      target_name,
      target_email,
      status,
      title,
      description,
      details,
      user_agent,
      device_info,
      session_id,
      severity,
      priority,
      metadata
    } = body;
    
    // Capture IP address from headers
    let ip = (request as any).ip || 
             request.headers.get('x-vercel-proxied-for')?.split(',')[0].trim() ||
             request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
             request.headers.get('x-real-ip') || 
             request.headers.get('cf-connecting-ip') || 
             'unknown';
    
    // Lookup GeoIP - Prioritize Vercel Edge headers for production
    let location = null;
    
    // Vercel Geolocation headers
    const vercelCity = request.headers.get('x-vercel-ip-city');
    const vercelCountry = request.headers.get('x-vercel-ip-country');
    const vercelRegion = request.headers.get('x-vercel-ip-country-region');
    const vercelTimezone = request.headers.get('x-vercel-ip-timezone');

    if (vercelCity || vercelCountry) {
      location = { 
        city: vercelCity || 'Unknown City', 
        country: vercelCountry || 'Unknown Country',
        timezone: vercelTimezone || 'UTC',
        region: vercelRegion || null,
        method: 'vercel'
      };
    } else if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      location = { city: 'Local Host', country: 'Internal Network', timezone: 'UTC' };
    } else if (ip !== 'unknown') {
      try {
        const geoipModule = await import('geoip-lite');
        const geoip = (geoipModule as any).default || geoipModule;
        
        if (geoip && typeof geoip.lookup === 'function') {
          const geo = geoip.lookup(ip);
          if (geo) {
            location = { 
              city: geo.city || null, 
              country: geo.country || null, 
              timezone: geo.timezone || null,
              region: geo.region || null
            };
          }
        }
      } catch (e) {
        console.error('GeoIP lookup failed:', e);
      }
    }

    const finalLocation = location || { city: 'Unknown', country: 'Unknown' };

    // Enhance device info with location AND IP
    const enhancedDeviceInfo = {
      ...device_info,
      location: finalLocation,
      ip: ip
    };
    
    // Call the database function
    const { data, error } = await supabase.rpc('log_admin_activity', {
      p_admin_user_id: admin_user_id,
      p_admin_user_name: admin_user_name,
      p_admin_user_email: admin_user_email,
      p_admin_user_role: admin_user_role,
      p_action_type: action_type,
      p_target_type: target_type,
      p_target_id: target_id,
      p_target_name: target_name,
      p_target_email: target_email,
      p_status: status,
      p_title: title,
      p_description: description,
      p_details: details,
      p_ip_address: ip, // Use captured IP
      p_user_agent: user_agent,
      p_device_info: enhancedDeviceInfo,
      p_session_id: session_id,
      p_severity: severity,
      p_priority: priority,
      p_metadata: metadata
    });

    if (error) {
      console.error('Error logging activity via API:', error);
      return NextResponse.json(
        { error: 'Database error', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data });
    
  } catch (error: any) {
    console.error('Unexpected error in activity log API:', error);
    if (error?.stack) console.error(error.stack);
    
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
