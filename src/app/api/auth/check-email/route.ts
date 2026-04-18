import { createClient } from '@/lib/supabase/server/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { exists: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if email exists in profiles table (case-insensitive)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, status')
      .ilike('email', email)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking email:', error);
      return NextResponse.json(
        { exists: false, error: 'Database error' },
        { status: 500 }
      );
    }

    if (profile) {
      return NextResponse.json({
        exists: true,
        verified: profile.status === 'active',
        message: profile.status === 'active'
          ? 'This email is already registered with a verified account.'
          : 'This email is already registered but not verified.'
      });
    }

    return NextResponse.json({ exists: false });
  } catch (error) {
    console.error('Error in check-email route:', error);
    return NextResponse.json(
      { exists: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
