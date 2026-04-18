import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';

/**
 * POST /api/auth/track-login
 * Track user login activity
 */
export async function POST() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update last login timestamp
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Track Login] Error:', updateError);
      return NextResponse.json({ error: 'Failed to track login' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Track Login] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
