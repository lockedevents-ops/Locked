import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server/server';
import { createAdminClient } from '@/lib/supabase/server/admin';
import { emailService } from '@/services/emailService';

interface RoleRow { role: string }

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin privileges
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const roles = (rolesData as RoleRow[] | null || []).map(r => r.role);
    const isAdmin = roles.some(r => ['admin', 'super_admin', 'support_agent'].includes(r));
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Insufficient privileges' }, { status: 403 });
    }

    // Parse request body
    const userData = await request.json();
    const { name, email, password, role, phoneNumber, ghanaCardNumber, image, needsPasswordSetup, gender, address, city, country, department, status } = userData;

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Role permission validation
    const currentUserRole = roles.includes('super_admin') ? 'super_admin' : 
                           roles.includes('admin') ? 'admin' : 
                           roles.includes('support_agent') ? 'support_agent' : '';

    // Only super_admin can create other super_admin or admin users
    if ((role === 'super_admin' || role === 'admin') && currentUserRole !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can create admin or super admin users' }, { status: 403 });
    }

    // Only admin and above can create support_agent
    if (role === 'support_agent' && !['admin', 'super_admin'].includes(currentUserRole)) {
      return NextResponse.json({ error: 'Only admins or super admins can create support agents' }, { status: 403 });
    }

    // Create user via Supabase Admin API
    // Note: We need service_role key for this, not anon key
    const adminSupabase = createAdminClient();
    
    const userCreateData: any = {
      email,
      email_confirm: true, // Skip email confirmation for admin-created users
      user_metadata: {
        name,
        full_name: name,
      }
    };

    // Add password if provided, otherwise send invite
    if (password && !needsPasswordSetup) {
      userCreateData.password = password;
    }

    const { data: authData, error: createError } = await adminSupabase.auth.admin.createUser(userCreateData);

    if (createError || !authData?.user) {
      console.error('User creation error:', createError);
      return NextResponse.json({ 
        error: createError?.message || 'Failed to create user account' 
      }, { status: 400 });
    }

    const createdUser = authData.user;

    // Create/update profile (use adminSupabase to bypass RLS)
    // Important: Override status to 'pending' if invitation is being sent
    const finalStatus = (needsPasswordSetup || !password) ? 'pending' : (status || 'active');
    
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: createdUser.id,
        email,
        full_name: name,
        phone_number: phoneNumber || null,
        ghana_card_number: ghanaCardNumber || null,
        avatar_url: image || null,
        gender: gender || null,
        address_line_1: address || null,
        city: city || null,
        country: country || null,
        occupation: department || null,
        status: finalStatus,
      });

    if (profileError) {
      console.warn('Profile creation error:', profileError);
      // Continue anyway - profile might be created by trigger
    }

    console.log(`[User Create API] User ${createdUser.id} status set to: ${finalStatus}`);

    // Assign the selected role (if not default user role)
    // Use adminSupabase to bypass RLS (admins should be able to assign roles)
    if (role && role !== 'user') {
      const { data: roleData, error: roleError } = await adminSupabase
        .from('user_roles')
        .insert({
          user_id: createdUser.id,
          role,
          granted_by: user.id,
          granted_at: new Date().toISOString()
        })
        .select()
        .single();

      if (roleError) {
        console.error('Role assignment error:', roleError);
        return NextResponse.json({ 
          error: `User created but role assignment failed: ${roleError.message}`,
          userId: createdUser.id 
        }, { status: 500 });
      }

      console.log('Role assigned successfully:', roleData);
    }

    // Determine if this is an admin role
    const isAdminRole = ['admin', 'super_admin', 'support_agent'].includes(role || '');

    // Send invitation email if password was not set
    if (needsPasswordSetup || (!password)) {
      try {
        const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.generateLink({
          type: 'invite',
          email: email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/auth/callback?next=/auth/setup-account`
          }
        });
        
        if (inviteError || !inviteData.properties?.action_link) {
          console.warn('Invitation link generation failed:', inviteError);
        } else {
          // Use different template for admin invites
          const emailResult = await emailService.sendConfirmation({
            to: email,
            subject: isAdminRole ? 'You\'re invited to be an Admin' : 'You\'re invited to Locked Events',
            type: 'auth',
            templateType: isAdminRole ? 'admin_invite' : 'invite',
            templateData: {
              actionUrl: inviteData.properties.action_link,
              customerName: name || 'Friend' 
            }
          });
          
          if (emailResult.success) {
            console.log(`✅ [User Create API] Invitation email sent to ${email}`);
          } else {
            console.warn(`❌ [User Create API] Invitation email failed:`, emailResult.error);
          }
        }
      } catch (inviteErr) {
        console.warn('Invitation process failed:', inviteErr);
      }
    } else {
      // Send welcome email for direct password setup (non-invitation mode)
      try {
        const emailResult = await emailService.sendConfirmation({
          to: email,
          subject: isAdminRole ? 'Welcome to the Admin Team' : 'Welcome to Locked Events',
          type: 'auth',
          templateType: isAdminRole ? 'admin_welcome' : 'welcome',
          templateData: {
            customerName: name || 'there',
            actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/auth/sign-in`
          }
        });
        
        if (emailResult.success) {
          console.log(`✅ [User Create API] Welcome email sent to ${email}`);
        } else {
          console.warn(`❌ [User Create API] Welcome email failed:`, emailResult.error);
        }
      } catch (welcomeErr) {
        console.warn('Welcome email failed:', welcomeErr);
      }
    }

    // Log the activity with comprehensive details
    try {
      const roleLabel = {
        'super_admin': 'Super Admin',
        'admin': 'Admin',
        'support_agent': 'Support Agent',
        'user': 'User'
      }[role as string] || 'User';

      // Try to use admin_audit_logs table directly (use adminSupabase to bypass RLS)
      await adminSupabase.from('admin_audit_logs').insert({
        action: 'admin_user_create',
        performed_by: user.id,
        target_user: createdUser.id,
        details: {
          title: roleLabel === 'User' ? 'New User Created' : 'Admin User Created',
          description: `New ${roleLabel} account created for ${name} (${email}) by ${user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin'}${department ? ` - ${department}` : ''}, ${city || ''}, ${country || ''}`,
          action_type: 'admin_user_create',
          target_type: 'user',
          status: 'success',
          admin_user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin',
          admin_user_role: currentUserRole,
          target_name: name,
          target_email: email,
          target_role: role,
          target_phone: phoneNumber,
          target_ghana_card: ghanaCardNumber,
          target_gender: gender,
          target_address: address,
          target_city: city,
          target_country: country,
          target_department: department,
          target_status: status || 'active',
        },
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.warn('Admin audit log failed:', logError);
      // Fallback to RPC function if direct insert fails
      try {
        await adminSupabase.rpc('log_admin_activity', {
          p_admin_user_id: user.id,
          p_admin_user_name: user.user_metadata?.name || user.email,
          p_admin_user_email: user.email,
          p_admin_user_role: currentUserRole,
          p_action_type: 'create_user',
          p_target_type: 'user',
          p_target_id: createdUser.id,
          p_target_name: name,
          p_target_email: email,
          p_status: 'success',
          p_title: 'User Created',
          p_description: `Admin created new user with ${role || 'user'} role`,
          p_details: {
            role: role || 'user',
            created_by: user.id,
            invitation_sent: needsPasswordSetup || (!password),
            gender, address, city, country, department, status
          },
          p_severity: 'info'
        });
      } catch (rpcError) {
        console.warn('Activity logging RPC also failed:', rpcError);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: createdUser.id,
        name,
        email,
        role: role || 'user',
        created_at: createdUser.created_at,
        needsPasswordSetup: needsPasswordSetup || (!password)
      }
    });

  } catch (error) {
    console.error('Admin user creation error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
