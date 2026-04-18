import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/services/emailService';

export async function POST(req: NextRequest) {
  try {
    const { email, customerName, browser: rawUA, time } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 1. Get IP address
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               '127.0.0.1';

    // 2. Get Location from IP (Dynamic import to avoid build-time issues)
    let location = 'Unknown Location';
    try {
      const geoip = require('geoip-lite');
      const geo = geoip.lookup(ip);
      if (geo) {
        location = `${geo.city || ''}${geo.city ? ', ' : ''}${geo.country || ''}`;
      }
    } catch (e) {
      console.warn('[SecurityAlert] geoip-lite lookup failed:', e);
    }

    // 3. Simple Browser/OS extraction from UA
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    if (rawUA) {
      if (rawUA.includes('Firefox')) browser = 'Firefox';
      else if (rawUA.includes('Chrome')) browser = 'Chrome';
      else if (rawUA.includes('Safari')) browser = 'Safari';
      else if (rawUA.includes('Edge')) browser = 'Edge';

      if (rawUA.includes('Windows')) os = 'Windows';
      else if (rawUA.includes('Mac OS')) os = 'macOS';
      else if (rawUA.includes('iPhone')) os = 'iOS';
      else if (rawUA.includes('Android')) os = 'Android';
      else if (rawUA.includes('Linux')) os = 'Linux';
    }

    // Send security alert email
    await emailService.sendConfirmation({
      to: email,
      subject: 'New Sign-in Detected - Locked Events',
      type: 'auth',
      templateType: 'security_alert',
      templateData: {
        customerName,
        browser,
        os,
        ip: `${ip} (${location || 'Unknown Location'})`,
        time: time || new Date().toLocaleString(),
        actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/dashboards/settings`
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Security alert error:', error);
    return NextResponse.json(
      { error: 'Failed to send security alert' },
      { status: 500 }
    );
  }
}
