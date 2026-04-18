/**
 * Audit Logging Utility
 * 
 * Provides standardized audit logging for all admin operations.
 * All logs are stored in the admin_audit_logs table with enriched metadata.
 */

import { createClient } from '@/lib/supabase/client/client';

export type AuditActionType = 
  // User Management
  | 'user_profile_update'
  | 'user_create'
  | 'user_delete'
  | 'user_suspend'
  | 'user_unsuspend'
  | 'user_password_reset'
  
  // Role Management
  | 'role_request_approve'
  | 'role_request_reject'
  | 'role_request_revoke'
  | 'role_request_reinstate'
  | 'role_direct_assign'
  | 'role_direct_remove'
  
  // Event Management
  | 'event_approve'
  | 'event_reject'
  | 'event_update'
  | 'event_delete'
  | 'event_status_change'
  | 'event_featured_toggle'
  
  // Venue Management
  | 'venue_verify'
  | 'venue_reject'
  | 'venue_update'
  | 'venue_delete'
  
  // Organizer Management
  | 'organizer_verify'
  | 'organizer_suspend'
  | 'organizer_update'
  
  // Content Moderation
  | 'content_flag'
  | 'content_remove'
  | 'comment_delete'
  
  // System Settings
  | 'settings_update'
  | 'feature_flag_toggle'
  | 'maintenance_mode_toggle'
  
  // Financial
  | 'refund_process'
  | 'payment_dispute_resolve'
  | 'payout_approve'
  
  // Communication
  | 'broadcast_send'
  | 'direct_message_send'
  
  // Security
  | 'admin_access_grant'
  | 'admin_access_revoke'
  | 'security_setting_change'
  | 'admin_login_success'
  | 'admin_login_failure';

export type AuditTargetType =
  | 'user_profile'
  | 'role_request'
  | 'user_role'
  | 'event'
  | 'venue'
  | 'organizer'
  | 'content'
  | 'comment'
  | 'settings'
  | 'feature_flag'
  | 'payment'
  | 'refund'
  | 'payout'
  | 'message'
  | 'admin_access'
  | 'security';

export type AuditStatus = 'success' | 'failure' | 'pending';

export interface AuditLogParams {
  /** Machine-readable action identifier */
  action: AuditActionType;
  
  /** Admin user ID performing the action */
  performedBy: string;
  
  /** Target user ID (if applicable) */
  targetUser?: string | null;
  
  /** Human-readable title for UI display */
  title: string;
  
  /** Detailed description with context */
  description: string;
  
  /** Specific action type (same as action for clarity) */
  actionType: AuditActionType;
  
  /** Type of resource being acted upon */
  targetType: AuditTargetType;
  
  /** Operation status */
  status: AuditStatus;
  
  /** Admin's display name */
  adminName: string;
  
  /** Admin's role (super_admin, admin, support_agent) */
  adminRole: string;
  
  /** Target resource name (if applicable) */
  targetName?: string;
  
  /** Target user email (if applicable) */
  targetEmail?: string;
  
  /** Additional context specific to the action */
  additionalContext?: Record<string, any>;
}

/**
 * Log an admin action to the audit trail
 * 
 * @param params - Audit log parameters
 * @returns Promise that resolves when log is created (non-blocking on failure)
 * 
 * @example
 * ```typescript
 * await logAdminAction({
 *   action: 'user_profile_update',
 *   performedBy: adminUser.id,
 *   targetUser: userId,
 *   title: 'User Profile Updated',
 *   description: `Admin ${adminName} updated profile fields: email, phone`,
 *   actionType: 'user_profile_update',
 *   targetType: 'user_profile',
 *   status: 'success',
 *   adminName: 'John Doe',
 *   adminRole: 'admin',
 *   targetName: 'Jane Smith',
 *   targetEmail: 'jane@example.com',
 *   additionalContext: {
 *     updated_fields: { email: 'new@email.com', phone: '1234567890' }
 *   }
 * });
 * ```
 */
export async function logAdminAction(params: AuditLogParams): Promise<void> {
  try {
    const supabase = createClient();
    
    const { error } = await supabase.from('admin_audit_logs').insert({
      action: params.action,
      performed_by: params.performedBy,
      target_user: params.targetUser,
      details: {
        title: params.title,
        description: params.description,
        action_type: params.actionType,
        target_type: params.targetType,
        status: params.status,
        admin_user_name: params.adminName,
        admin_user_role: params.adminRole,
        target_name: params.targetName,
        target_email: params.targetEmail,
        timestamp: new Date().toISOString(),
        ...params.additionalContext
      },
      created_at: new Date().toISOString()
    });
    
    if (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging should never break main application flow
    }
  } catch (error) {
    console.error('Audit logging exception:', error);
    // Silent failure - audit logging is non-critical
  }
}

/**
 * Helper function to get admin role string from roles array
 */
export function getAdminRoleString(roles: string[]): string {
  if (roles.includes('super_admin')) return 'super_admin';
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('support_agent')) return 'support_agent';
  return 'user';
}

/**
 * Convenience function for logging user profile updates
 */
export async function logUserProfileUpdate(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  targetUserId: string;
  targetName: string;
  targetEmail: string;
  updatedFields: Record<string, any>;
  oldValues?: Record<string, any> | null;
  changesSummary?: string;
}): Promise<void> {
  const fieldNames = Object.keys(params.updatedFields).join(', ');
  
  // Create detailed description with before/after values
  let description = `Admin ${params.adminName} updated ${params.targetName}'s profile`;
  
  if (params.changesSummary) {
    description += `: ${params.changesSummary}`;
  } else if (params.oldValues) {
    const changes = Object.keys(params.updatedFields).map(key => {
      const oldValue = params.oldValues?.[key] || 'None';
      const newValue = params.updatedFields[key] || 'None';
      return `${key}: "${oldValue}" → "${newValue}"`;
    }).join(', ');
    description += `: ${changes}`;
  } else {
    description += `. Fields: ${fieldNames}`;
  }
  
  await logAdminAction({
    action: 'user_profile_update',
    performedBy: params.adminId,
    targetUser: params.targetUserId,
    title: 'User Profile Updated',
    description,
    actionType: 'user_profile_update',
    targetType: 'user_profile',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.targetName,
    targetEmail: params.targetEmail,
    additionalContext: {
      updated_fields: params.updatedFields,
      old_values: params.oldValues,
      changes_summary: params.changesSummary
    }
  });
}

/**
 * Convenience function for logging user deletion
 */
export async function logUserDeletion(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  targetUserId: string;
  targetName: string;
  targetEmail: string;
  reason?: string;
}): Promise<void> {
  await logAdminAction({
    action: 'user_delete',
    performedBy: params.adminId,
    targetUser: params.targetUserId,
    title: 'User Account Deleted',
    description: `Admin ${params.adminName} deleted user account: ${params.targetName}${params.reason ? ` (Reason: ${params.reason})` : ''}`,
    actionType: 'user_delete',
    targetType: 'user_profile',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.targetName,
    targetEmail: params.targetEmail,
    additionalContext: {
      deletion_reason: params.reason
    }
  });
}

/**
 * Convenience function for logging user suspension
 */
export async function logUserSuspension(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  targetUserId: string;
  targetName: string;
  targetEmail: string;
  reason?: string;
  duration?: string;
}): Promise<void> {
  await logAdminAction({
    action: 'user_suspend',
    performedBy: params.adminId,
    targetUser: params.targetUserId,
    title: 'User Account Suspended',
    description: `Admin ${params.adminName} suspended user: ${params.targetName}${params.duration ? ` for ${params.duration}` : ''}${params.reason ? ` (Reason: ${params.reason})` : ''}`,
    actionType: 'user_suspend',
    targetType: 'user_profile',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.targetName,
    targetEmail: params.targetEmail,
    additionalContext: {
      suspension_reason: params.reason,
      suspension_duration: params.duration
    }
  });
}

/**
 * Convenience function for logging event approval
 */
export async function logEventApproval(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  eventId: string;
  eventName: string;
  organizerId: string;
  organizerName: string;
}): Promise<void> {
  await logAdminAction({
    action: 'event_approve',
    performedBy: params.adminId,
    targetUser: params.organizerId,
    title: 'Event Approved',
    description: `Admin ${params.adminName} approved event: ${params.eventName} by ${params.organizerName}`,
    actionType: 'event_approve',
    targetType: 'event',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.organizerName,
    additionalContext: {
      event_id: params.eventId,
      event_name: params.eventName
    }
  });
}

/**
 * Convenience function for logging venue verification
 */
export async function logVenueVerification(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  venueId: string;
  venueName: string;
  ownerId: string;
  ownerName: string;
}): Promise<void> {
  await logAdminAction({
    action: 'venue_verify',
    performedBy: params.adminId,
    targetUser: params.ownerId,
    title: 'Venue Verified',
    description: `Admin ${params.adminName} verified venue: ${params.venueName} owned by ${params.ownerName}`,
    actionType: 'venue_verify',
    targetType: 'venue',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.ownerName,
    additionalContext: {
      venue_id: params.venueId,
      venue_name: params.venueName
    }
  });
}

/**
 * Convenience function for logging settings updates
 */
export async function logSettingsUpdate(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  settingName: string;
  oldValue: any;
  newValue: any;
}): Promise<void> {
  await logAdminAction({
    action: 'settings_update',
    performedBy: params.adminId,
    targetUser: null,
    title: 'System Settings Updated',
    description: `Admin ${params.adminName} updated setting: ${params.settingName}`,
    actionType: 'settings_update',
    targetType: 'settings',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    additionalContext: {
      setting_name: params.settingName,
      old_value: params.oldValue,
      new_value: params.newValue
    }
  });
}

/**
 * Convenience function for logging user creation
 */
export async function logUserCreation(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  targetUserId: string;
  targetName: string;
  targetEmail: string;
  initialRoles?: string[];
}): Promise<void> {
  await logAdminAction({
    action: 'user_create',
    performedBy: params.adminId,
    targetUser: params.targetUserId,
    title: 'User Account Created',
    description: `Admin ${params.adminName} created user account: ${params.targetName} (${params.targetEmail})${params.initialRoles?.length ? ` with roles: ${params.initialRoles.join(', ')}` : ''}`,
    actionType: 'user_create',
    targetType: 'user_profile',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.targetName,
    targetEmail: params.targetEmail,
    additionalContext: {
      initial_roles: params.initialRoles
    }
  });
}

/**
 * Convenience function for logging user unsuspension
 */
export async function logUserUnsuspension(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  targetUserId: string;
  targetName: string;
  targetEmail: string;
  reason?: string;
}): Promise<void> {
  await logAdminAction({
    action: 'user_unsuspend',
    performedBy: params.adminId,
    targetUser: params.targetUserId,
    title: 'User Account Unsuspended',
    description: `Admin ${params.adminName} unsuspended user: ${params.targetName}${params.reason ? ` (Reason: ${params.reason})` : ''}`,
    actionType: 'user_unsuspend',
    targetType: 'user_profile',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.targetName,
    targetEmail: params.targetEmail,
    additionalContext: {
      unsuspension_reason: params.reason
    }
  });
}

/**
 * Convenience function for logging event rejection
 */
export async function logEventRejection(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  eventId: string;
  eventName: string;
  organizerId: string;
  organizerName: string;
  reason?: string;
}): Promise<void> {
  await logAdminAction({
    action: 'event_reject',
    performedBy: params.adminId,
    targetUser: params.organizerId,
    title: 'Event Rejected',
    description: `Admin ${params.adminName} rejected event: ${params.eventName} by ${params.organizerName}${params.reason ? ` (Reason: ${params.reason})` : ''}`,
    actionType: 'event_reject',
    targetType: 'event',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.organizerName,
    additionalContext: {
      event_id: params.eventId,
      event_name: params.eventName,
      rejection_reason: params.reason
    }
  });
}

/**
 * Convenience function for logging event updates
 */
export async function logEventUpdate(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  eventId: string;
  eventName: string;
  organizerId: string;
  organizerName: string;
  updatedFields: Record<string, any>;
  oldValues?: Record<string, any>;
  changesSummary?: string;
}): Promise<void> {
  let description = `Admin ${params.adminName} updated event: ${params.eventName}`;
  
  if (params.changesSummary) {
    description += ` (${params.changesSummary})`;
  } else if (params.oldValues) {
    const changes = Object.keys(params.updatedFields).map(key => {
      const oldValue = params.oldValues?.[key] || 'None';
      const newValue = params.updatedFields[key] || 'None';
      return `${key}: "${oldValue}" → "${newValue}"`;
    }).join(', ');
    description += ` (${changes})`;
  }

  await logAdminAction({
    action: 'event_update',
    performedBy: params.adminId,
    targetUser: params.organizerId,
    title: 'Event Updated',
    description,
    actionType: 'event_update',
    targetType: 'event',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.organizerName,
    additionalContext: {
      event_id: params.eventId,
      event_name: params.eventName,
      updated_fields: params.updatedFields,
      old_values: params.oldValues
    }
  });
}

/**
 * Convenience function for logging event deletion
 */
export async function logEventDeletion(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  eventId: string;
  eventName: string;
  organizerId: string;
  organizerName: string;
  reason?: string;
}): Promise<void> {
  await logAdminAction({
    action: 'event_delete',
    performedBy: params.adminId,
    targetUser: params.organizerId,
    title: 'Event Deleted',
    description: `Admin ${params.adminName} deleted event: ${params.eventName} by ${params.organizerName}${params.reason ? ` (Reason: ${params.reason})` : ''}`,
    actionType: 'event_delete',
    targetType: 'event',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.organizerName,
    additionalContext: {
      event_id: params.eventId,
      event_name: params.eventName,
      deletion_reason: params.reason
    }
  });
}

/**
 * Convenience function for logging event status changes
 */
export async function logEventStatusChange(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  eventId: string;
  eventName: string;
  organizerId: string;
  organizerName: string;
  oldStatus: string;
  newStatus: string;
  reason?: string;
}): Promise<void> {
  await logAdminAction({
    action: 'event_status_change',
    performedBy: params.adminId,
    targetUser: params.organizerId,
    title: 'Event Status Changed',
    description: `Admin ${params.adminName} changed event "${params.eventName}" status: ${params.oldStatus} → ${params.newStatus}${params.reason ? ` (Reason: ${params.reason})` : ''}`,
    actionType: 'event_status_change',
    targetType: 'event',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.organizerName,
    additionalContext: {
      event_id: params.eventId,
      event_name: params.eventName,
      old_status: params.oldStatus,
      new_status: params.newStatus,
      reason: params.reason
    }
  });
}

/**
 * Convenience function for logging event featured toggle
 */
export async function logEventFeaturedToggle(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  eventId: string;
  eventName: string;
  organizerId: string;
  organizerName: string;
  isFeatured: boolean;
}): Promise<void> {
  await logAdminAction({
    action: 'event_featured_toggle',
    performedBy: params.adminId,
    targetUser: params.organizerId,
    title: 'Event Featured Status Changed',
    description: `Admin ${params.adminName} ${params.isFeatured ? 'featured' : 'unfeatured'} event: ${params.eventName}`,
    actionType: 'event_featured_toggle',
    targetType: 'event',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.organizerName,
    additionalContext: {
      event_id: params.eventId,
      event_name: params.eventName,
      is_featured: params.isFeatured
    }
  });
}

/**
 * Convenience function for logging venue rejection
 */
export async function logVenueRejection(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  venueId: string;
  venueName: string;
  ownerId: string;
  ownerName: string;
  reason?: string;
}): Promise<void> {
  await logAdminAction({
    action: 'venue_reject',
    performedBy: params.adminId,
    targetUser: params.ownerId,
    title: 'Venue Verification Rejected',
    description: `Admin ${params.adminName} rejected venue: ${params.venueName} owned by ${params.ownerName}${params.reason ? ` (Reason: ${params.reason})` : ''}`,
    actionType: 'venue_reject',
    targetType: 'venue',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.ownerName,
    additionalContext: {
      venue_id: params.venueId,
      venue_name: params.venueName,
      rejection_reason: params.reason
    }
  });
}

/**
 * Convenience function for logging venue updates
 */
export async function logVenueUpdate(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  venueId: string;
  venueName: string;
  ownerId: string;
  ownerName: string;
  updatedFields: Record<string, any>;
  oldValues?: Record<string, any>;
  changesSummary?: string;
}): Promise<void> {
  let description = `Admin ${params.adminName} updated venue: ${params.venueName}`;
  
  if (params.changesSummary) {
    description += ` (${params.changesSummary})`;
  } else if (params.oldValues) {
    const changes = Object.keys(params.updatedFields).map(key => {
      const oldValue = params.oldValues?.[key] || 'None';
      const newValue = params.updatedFields[key] || 'None';
      return `${key}: "${oldValue}" → "${newValue}"`;
    }).join(', ');
    description += ` (${changes})`;
  }

  await logAdminAction({
    action: 'venue_update',
    performedBy: params.adminId,
    targetUser: params.ownerId,
    title: 'Venue Updated',
    description,
    actionType: 'venue_update',
    targetType: 'venue',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.ownerName,
    additionalContext: {
      venue_id: params.venueId,
      venue_name: params.venueName,
      updated_fields: params.updatedFields,
      old_values: params.oldValues
    }
  });
}

/**
 * Convenience function for logging venue deletion
 */
export async function logVenueDeletion(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  venueId: string;
  venueName: string;
  ownerId: string;
  ownerName: string;
  reason?: string;
}): Promise<void> {
  await logAdminAction({
    action: 'venue_delete',
    performedBy: params.adminId,
    targetUser: params.ownerId,
    title: 'Venue Deleted',
    description: `Admin ${params.adminName} deleted venue: ${params.venueName} owned by ${params.ownerName}${params.reason ? ` (Reason: ${params.reason})` : ''}`,
    actionType: 'venue_delete',
    targetType: 'venue',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.ownerName,
    additionalContext: {
      venue_id: params.venueId,
      venue_name: params.venueName,
      deletion_reason: params.reason
    }
  });
}

/**
 * Convenience function for logging organizer verification
 */
export async function logOrganizerVerification(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  organizerId: string;
  organizerName: string;
  userId: string;
}): Promise<void> {
  await logAdminAction({
    action: 'organizer_verify',
    performedBy: params.adminId,
    targetUser: params.userId,
    title: 'Organizer Verified',
    description: `Admin ${params.adminName} verified organizer: ${params.organizerName}`,
    actionType: 'organizer_verify',
    targetType: 'organizer',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.organizerName,
    additionalContext: {
      organizer_id: params.organizerId,
      organizer_name: params.organizerName
    }
  });
}

/**
 * Convenience function for logging organizer suspension
 */
export async function logOrganizerSuspension(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  organizerId: string;
  organizerName: string;
  userId: string;
  reason?: string;
  duration?: string;
}): Promise<void> {
  await logAdminAction({
    action: 'organizer_suspend',
    performedBy: params.adminId,
    targetUser: params.userId,
    title: 'Organizer Suspended',
    description: `Admin ${params.adminName} suspended organizer: ${params.organizerName}${params.duration ? ` for ${params.duration}` : ''}${params.reason ? ` (Reason: ${params.reason})` : ''}`,
    actionType: 'organizer_suspend',
    targetType: 'organizer',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.organizerName,
    additionalContext: {
      organizer_id: params.organizerId,
      organizer_name: params.organizerName,
      suspension_reason: params.reason,
      suspension_duration: params.duration
    }
  });
}

/**
 * Convenience function for logging organizer updates
 */
export async function logOrganizerUpdate(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  organizerId: string;
  organizerName: string;
  userId: string;
  updatedFields: Record<string, any>;
  oldValues?: Record<string, any>;
  changesSummary?: string;
}): Promise<void> {
  let description = `Admin ${params.adminName} updated organizer: ${params.organizerName}`;
  
  if (params.changesSummary) {
    description += ` (${params.changesSummary})`;
  } else if (params.oldValues) {
    const changes = Object.keys(params.updatedFields).map(key => {
      const oldValue = params.oldValues?.[key] || 'None';
      const newValue = params.updatedFields[key] || 'None';
      return `${key}: "${oldValue}" → "${newValue}"`;
    }).join(', ');
    description += ` (${changes})`;
  }

  await logAdminAction({
    action: 'organizer_update',
    performedBy: params.adminId,
    targetUser: params.userId,
    title: 'Organizer Updated',
    description,
    actionType: 'organizer_update',
    targetType: 'organizer',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.organizerName,
    additionalContext: {
      organizer_id: params.organizerId,
      organizer_name: params.organizerName,
      updated_fields: params.updatedFields,
      old_values: params.oldValues
    }
  });
}

/**
 * Convenience function for logging feature flag toggles
 */
export async function logFeatureFlagToggle(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  featureName: string;
  enabled: boolean;
  affectedUsers?: string;
}): Promise<void> {
  await logAdminAction({
    action: 'feature_flag_toggle',
    performedBy: params.adminId,
    targetUser: null,
    title: 'Feature Flag Changed',
    description: `Admin ${params.adminName} ${params.enabled ? 'enabled' : 'disabled'} feature: ${params.featureName}${params.affectedUsers ? ` for ${params.affectedUsers}` : ''}`,
    actionType: 'feature_flag_toggle',
    targetType: 'feature_flag',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    additionalContext: {
      feature_name: params.featureName,
      enabled: params.enabled,
      affected_users: params.affectedUsers
    }
  });
}

/**
 * Convenience function for logging maintenance mode toggles
 */
export async function logMaintenanceModeToggle(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  enabled: boolean;
  reason?: string;
  estimatedDuration?: string;
}): Promise<void> {
  await logAdminAction({
    action: 'maintenance_mode_toggle',
    performedBy: params.adminId,
    targetUser: null,
    title: 'Maintenance Mode Changed',
    description: `Admin ${params.adminName} ${params.enabled ? 'enabled' : 'disabled'} maintenance mode${params.enabled && params.estimatedDuration ? ` (estimated: ${params.estimatedDuration})` : ''}${params.reason ? ` - ${params.reason}` : ''}`,
    actionType: 'maintenance_mode_toggle',
    targetType: 'settings',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    additionalContext: {
      maintenance_enabled: params.enabled,
      reason: params.reason,
      estimated_duration: params.estimatedDuration
    }
  });
}

/**
 * Convenience function for logging refund processing
 */
export async function logRefundProcess(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  userId: string;
  userName: string;
  userEmail: string;
  refundId: string;
  amount: number;
  currency: string;
  reason: string;
  transactionId?: string;
}): Promise<void> {
  await logAdminAction({
    action: 'refund_process',
    performedBy: params.adminId,
    targetUser: params.userId,
    title: 'Refund Processed',
    description: `Admin ${params.adminName} processed refund of ${params.currency} ${params.amount} for ${params.userName} (Reason: ${params.reason})`,
    actionType: 'refund_process',
    targetType: 'refund',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.userName,
    targetEmail: params.userEmail,
    additionalContext: {
      refund_id: params.refundId,
      amount: params.amount,
      currency: params.currency,
      reason: params.reason,
      transaction_id: params.transactionId
    }
  });
}

/**
 * Convenience function for logging payment dispute resolution
 */
export async function logPaymentDisputeResolve(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  userId: string;
  userName: string;
  userEmail: string;
  disputeId: string;
  resolution: string;
  amount?: number;
  currency?: string;
}): Promise<void> {
  await logAdminAction({
    action: 'payment_dispute_resolve',
    performedBy: params.adminId,
    targetUser: params.userId,
    title: 'Payment Dispute Resolved',
    description: `Admin ${params.adminName} resolved payment dispute for ${params.userName} (Resolution: ${params.resolution})`,
    actionType: 'payment_dispute_resolve',
    targetType: 'payment',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.userName,
    targetEmail: params.userEmail,
    additionalContext: {
      dispute_id: params.disputeId,
      resolution: params.resolution,
      amount: params.amount,
      currency: params.currency
    }
  });
}

/**
 * Convenience function for logging payout approval
 */
export async function logPayoutApproval(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  organizerId: string;
  organizerName: string;
  payoutId: string;
  amount: number;
  currency: string;
  period?: string;
}): Promise<void> {
  await logAdminAction({
    action: 'payout_approve',
    performedBy: params.adminId,
    targetUser: params.organizerId,
    title: 'Payout Approved',
    description: `Admin ${params.adminName} approved payout of ${params.currency} ${params.amount} for ${params.organizerName}${params.period ? ` (${params.period})` : ''}`,
    actionType: 'payout_approve',
    targetType: 'payout',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.organizerName,
    additionalContext: {
      payout_id: params.payoutId,
      amount: params.amount,
      currency: params.currency,
      period: params.period
    }
  });
}

/**
 * Convenience function for logging broadcast messages
 */
export async function logBroadcastSend(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  title: string;
  messagePreview: string;
  recipientCount: number;
  recipientType: string;
  channel: string;
}): Promise<void> {
  await logAdminAction({
    action: 'broadcast_send',
    performedBy: params.adminId,
    targetUser: null,
    title: 'Broadcast Message Sent',
    description: `Admin ${params.adminName} sent broadcast "${params.title}" to ${params.recipientCount} ${params.recipientType} via ${params.channel}`,
    actionType: 'broadcast_send',
    targetType: 'message',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    additionalContext: {
      message_title: params.title,
      message_preview: params.messagePreview,
      recipient_count: params.recipientCount,
      recipient_type: params.recipientType,
      channel: params.channel
    }
  });
}

/**
 * Convenience function for logging direct messages
 */
export async function logDirectMessageSend(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  messagePreview: string;
}): Promise<void> {
  await logAdminAction({
    action: 'direct_message_send',
    performedBy: params.adminId,
    targetUser: params.recipientId,
    title: 'Direct Message Sent',
    description: `Admin ${params.adminName} sent message to ${params.recipientName}: "${params.subject}"`,
    actionType: 'direct_message_send',
    targetType: 'message',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.recipientName,
    targetEmail: params.recipientEmail,
    additionalContext: {
      subject: params.subject,
      message_preview: params.messagePreview
    }
  });
}

/**
 * Convenience function for logging admin access grants
 */
export async function logAdminAccessGrant(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  targetUserId: string;
  targetName: string;
  targetEmail: string;
  grantedRole: string;
  permissions?: string[];
}): Promise<void> {
  await logAdminAction({
    action: 'admin_access_grant',
    performedBy: params.adminId,
    targetUser: params.targetUserId,
    title: 'Admin Access Granted',
    description: `Admin ${params.adminName} granted ${params.grantedRole} access to ${params.targetName}${params.permissions?.length ? ` with permissions: ${params.permissions.join(', ')}` : ''}`,
    actionType: 'admin_access_grant',
    targetType: 'admin_access',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.targetName,
    targetEmail: params.targetEmail,
    additionalContext: {
      granted_role: params.grantedRole,
      permissions: params.permissions
    }
  });
}

/**
 * Convenience function for logging admin access revocations
 */
export async function logAdminAccessRevoke(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  targetUserId: string;
  targetName: string;
  targetEmail: string;
  revokedRole: string;
  reason?: string;
}): Promise<void> {
  await logAdminAction({
    action: 'admin_access_revoke',
    performedBy: params.adminId,
    targetUser: params.targetUserId,
    title: 'Admin Access Revoked',
    description: `Admin ${params.adminName} revoked ${params.revokedRole} access from ${params.targetName}${params.reason ? ` (Reason: ${params.reason})` : ''}`,
    actionType: 'admin_access_revoke',
    targetType: 'admin_access',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.targetName,
    targetEmail: params.targetEmail,
    additionalContext: {
      revoked_role: params.revokedRole,
      reason: params.reason
    }
  });
}

/**
 * Convenience function for logging security setting changes
 */
export async function logSecuritySettingChange(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  settingName: string;
  oldValue: any;
  newValue: any;
  securityImpact: string;
}): Promise<void> {
  await logAdminAction({
    action: 'security_setting_change',
    performedBy: params.adminId,
    targetUser: null,
    title: 'Security Setting Changed',
    description: `Admin ${params.adminName} changed security setting: ${params.settingName} (Impact: ${params.securityImpact})`,
    actionType: 'security_setting_change',
    targetType: 'security',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    additionalContext: {
      setting_name: params.settingName,
      old_value: params.oldValue,
      new_value: params.newValue,
      security_impact: params.securityImpact
    }
  });
}

/**
 * Convenience function for logging successful admin logins
 */
export async function logAdminLoginSuccess(params: {
  adminId: string;
  adminName: string;
  adminRole: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await logAdminAction({
    action: 'admin_login_success',
    performedBy: params.adminId,
    targetUser: null,
    title: 'Admin Login Successful',
    description: `Admin ${params.adminName} logged in successfully${params.ipAddress ? ` from ${params.ipAddress}` : ''}`,
    actionType: 'admin_login_success',
    targetType: 'security',
    status: 'success',
    adminName: params.adminName,
    adminRole: params.adminRole,
    additionalContext: {
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Convenience function for logging failed admin login attempts
 */
export async function logAdminLoginFailure(params: {
  adminId?: string;
  adminName?: string;
  attemptedEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  failureReason: string;
}): Promise<void> {
  await logAdminAction({
    action: 'admin_login_failure',
    performedBy: params.adminId || 'unknown',
    targetUser: null,
    title: 'Admin Login Failed',
    description: `Failed admin login attempt${params.attemptedEmail ? ` for ${params.attemptedEmail}` : ''}${params.ipAddress ? ` from ${params.ipAddress}` : ''} (Reason: ${params.failureReason})`,
    actionType: 'admin_login_failure',
    targetType: 'security',
    status: 'failure',
    adminName: params.adminName || params.attemptedEmail || 'Unknown',
    adminRole: 'unknown',
    additionalContext: {
      attempted_email: params.attemptedEmail,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      failure_reason: params.failureReason,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Convenience function for logging failed actions
 */
export async function logFailedAction(params: {
  action: AuditActionType;
  adminId: string;
  adminName: string;
  adminRole: string;
  targetUserId?: string;
  targetName?: string;
  targetType: AuditTargetType;
  errorMessage: string;
  errorCode?: string;
}): Promise<void> {
  await logAdminAction({
    action: params.action,
    performedBy: params.adminId,
    targetUser: params.targetUserId,
    title: 'Action Failed',
    description: `Admin ${params.adminName} attempted ${params.action} but failed: ${params.errorMessage}`,
    actionType: params.action,
    targetType: params.targetType,
    status: 'failure',
    adminName: params.adminName,
    adminRole: params.adminRole,
    targetName: params.targetName,
    additionalContext: {
      error_message: params.errorMessage,
      error_code: params.errorCode
    }
  });
}
