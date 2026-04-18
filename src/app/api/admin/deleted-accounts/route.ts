import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server/admin';

/**
 * GET /api/admin/deleted-accounts
 * Fetches soft-deleted accounts for admin review
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    const { searchParams } = new URL(request.url);
    const adminUserId = searchParams.get('adminUserId');
    const filter = searchParams.get('filter') || 'all';

    if (!adminUserId) {
      return NextResponse.json(
        { success: false, error: 'Admin user ID is required' },
        { status: 400 }
      );
    }

    // Verify the requester is an admin
    const { data: adminRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUserId)
      .in('role', ['admin', 'super_admin']);

    if (roleError || !adminRoles || adminRoles.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // Build query for deleted accounts
    let query = supabaseAdmin
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        avatar_url,
        deleted_at,
        deletion_reason,
        deletion_flagged,
        deletion_flagged_by,
        deletion_flag_reason,
        scheduled_purge_at,
        created_at
      `)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    // Apply filter
    if (filter === 'flagged') {
      query = query.eq('deletion_flagged', true);
    } else if (filter === 'unflagged') {
      query = query.or('deletion_flagged.is.null,deletion_flagged.eq.false');
    }

    const { data: accounts, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching deleted accounts:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch deleted accounts' },
        { status: 500 }
      );
    }

    // Calculate days until purge for each account
    const accountsWithPurgeInfo = (accounts || []).map(account => {
      let daysUntilPurge = null;
      if (account.scheduled_purge_at) {
        const purgeDate = new Date(account.scheduled_purge_at);
        const now = new Date();
        daysUntilPurge = Math.max(0, Math.ceil((purgeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      } else if (account.deleted_at) {
        // Default 30-day retention if no scheduled_purge_at
        const deletedDate = new Date(account.deleted_at);
        const purgeDate = new Date(deletedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        const now = new Date();
        daysUntilPurge = Math.max(0, Math.ceil((purgeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }
      return { ...account, daysUntilPurge };
    });

    return NextResponse.json({
      success: true,
      accounts: accountsWithPurgeInfo
    });

  } catch (error) {
    console.error('Deleted accounts API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/deleted-accounts
 * Handle actions on deleted accounts: restore, permanent_delete, flag, unflag
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();
    const body = await request.json();
    const { action, accountId, adminUserId, reason } = body;

    if (!action || !accountId || !adminUserId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 1. Fetch Admin Profile and Role
    const [adminProfileRes, adminRoleRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('full_name, email').eq('id', adminUserId).single(),
      supabaseAdmin.from('user_roles')
        .select('role')
        .eq('user_id', adminUserId)
        .in('role', ['admin', 'super_admin'])
        .is('revoked_at', null)
        .limit(1)
        .maybeSingle()
    ]);

    if (adminRoleRes.error || !adminRoleRes.data) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    const adminInfo = {
      id: adminUserId,
      name: adminProfileRes.data?.full_name || 'Admin',
      email: adminProfileRes.data?.email || 'admin@system',
      role: adminRoleRes.data.role
    };

    // 2. Fetch Target User Profile (FETCH BEFORE ACTION especially for delete)
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email')
      .eq('id', accountId)
      .maybeSingle();

    const targetInfo = {
      id: accountId,
      name: targetProfile?.full_name || 'Deleted User',
      email: targetProfile?.email || 'unknown@user'
    };

    switch (action) {
      case 'restore': {
        // Restore the account by clearing deleted_at and related fields
        const { error: restoreError } = await supabaseAdmin
          .from('profiles')
          .update({
            status: 'active',
            deleted_at: null,
            deletion_reason: null,
            deletion_flagged: null,
            deletion_flagged_by: null,
            deletion_flag_reason: null,
            scheduled_purge_at: null
          })
          .eq('id', accountId);

        if (restoreError) {
          console.error('Error restoring account:', restoreError);
          return NextResponse.json(
            { success: false, error: 'Failed to restore account' },
            { status: 500 }
          );
        }

        // Log the action
        await logAdminAction(supabaseAdmin, adminInfo, 'restore_account', targetInfo, {
          title: 'Account Restored',
          description: `${adminInfo.name} restored the account for ${targetInfo.name} (${targetInfo.email})`,
          details: { reason }
        });

        return NextResponse.json({
          success: true,
          message: 'Account restored successfully'
        });
      }

      case 'permanent_delete': {
        // Permanently delete the account using Supabase Admin API
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(accountId);

        if (deleteError) {
          console.error('Error permanently deleting account:', deleteError);
          return NextResponse.json(
            { success: false, error: 'Failed to permanently delete account' },
            { status: 500 }
          );
        }

        // Log the action
        await logAdminAction(supabaseAdmin, adminInfo, 'permanent_delete_account', targetInfo, {
          title: 'Account Permanently Deleted',
          description: `${adminInfo.name} permanently deleted the account for ${targetInfo.name} (${targetInfo.email})`,
          details: { reason: reason || 'Admin requested permanent deletion' }
        });

        return NextResponse.json({
          success: true,
          message: 'Account permanently deleted'
        });
      }

      case 'flag': {
        // Flag the account for review
        const { error: flagError } = await supabaseAdmin
          .from('profiles')
          .update({
            deletion_flagged: true,
            deletion_flagged_by: adminUserId,
            deletion_flag_reason: reason || 'Flagged for review'
          })
          .eq('id', accountId);

        if (flagError) {
          console.error('Error flagging account:', flagError);
          return NextResponse.json(
            { success: false, error: 'Failed to flag account' },
            { status: 500 }
          );
        }

        // Log the action
        await logAdminAction(supabaseAdmin, adminInfo, 'flag_deleted_account', targetInfo, {
          title: 'Account Flagged for Review',
          description: `${adminInfo.name} flagged ${targetInfo.name}'s account (${targetInfo.email}) for review`,
          details: { reason }
        });

        return NextResponse.json({
          success: true,
          message: 'Account flagged for review'
        });
      }

      case 'unflag': {
        // Remove flag from account
        const { error: unflagError } = await supabaseAdmin
          .from('profiles')
          .update({
            deletion_flagged: false,
            deletion_flagged_by: null,
            deletion_flag_reason: null
          })
          .eq('id', accountId);

        if (unflagError) {
          console.error('Error unflagging account:', unflagError);
          return NextResponse.json(
            { success: false, error: 'Failed to unflag account' },
            { status: 500 }
          );
        }

        // Log the action
        await logAdminAction(supabaseAdmin, adminInfo, 'unflag_deleted_account', targetInfo, {
          title: 'Account Unflagged',
          description: `${adminInfo.name} removed the flag from ${targetInfo.name}'s account (${targetInfo.email})`,
          details: { reason }
        });

        return NextResponse.json({
          success: true,
          message: 'Account unflagged'
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Deleted accounts action API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to log admin actions using the standardized RPC
 */
async function logAdminAction(
  supabaseAdmin: any,
  adminInfo: { id: string; name: string; email: string; role: string },
  actionType: string,
  targetInfo: { id: string; name: string; email: string },
  loggingDetails: { title: string; description: string; details?: any }
) {
  try {
    const { error } = await supabaseAdmin.rpc('log_admin_activity', {
      p_admin_user_id: adminInfo.id,
      p_admin_user_name: adminInfo.name,
      p_admin_user_email: adminInfo.email,
      p_admin_user_role: adminInfo.role,
      p_action_type: actionType,
      p_target_type: 'user',
      p_target_id: targetInfo.id,
      p_target_name: targetInfo.name,
      p_target_email: targetInfo.email,
      p_status: 'success',
      p_title: loggingDetails.title,
      p_description: loggingDetails.description,
      p_details: {
        ...loggingDetails.details,
        category: 'deleted_account_management'
      },
      p_severity: actionType.includes('delete') ? 'warning' : 'info'
    });

    if (error) {
      console.error('RPC logging failed:', error);
      // Fallback to direct insert if RPC fails (e.g. schema mismatch)
      await supabaseAdmin.from('admin_audit_logs').insert({
        performed_by: adminInfo.id,
        action: actionType,
        target_user: targetInfo.id,
        details: {
          ...loggingDetails.details,
          title: loggingDetails.title,
          description: loggingDetails.description,
          admin_user_name: adminInfo.name,
          admin_user_email: adminInfo.email,
          target_name: targetInfo.name,
          target_email: targetInfo.email,
          category: 'deleted_account_management'
        }
      });
    }
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}
