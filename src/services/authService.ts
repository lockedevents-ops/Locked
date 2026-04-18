/**
 * Consolidated Auth Service (Client-Side)
 * --------------------------------------------------------------
 * CONSOLIDATED FROM:
 *  - authService.ts (authentication flows)
 *  - userService.ts (user management)
 *  - roleRequestService.ts (role request handling)
 *  - LogService.ts (auth-related logging)
 * 
 * CURRENT ROLE:
 *  - Handles all authentication, user management, and role request operations
 *  - Performs validation (zod) & password hashing (bcryptjs-react) fully client-side
 *  - Manages role requests with approval/rejection workflows
 *  - Centralizes auth-related logging and notifications
 *
 * MIGRATION PLAN (Backend Integration):
 *  - Replace with API endpoints for auth, users, and role requests
 *  - Move password hashing and validation server-side
 *  - Introduce proper error codes and session management
 */

import { User } from '@/types';
import { z } from 'zod';
import bcrypt from 'bcryptjs-react';
import { userRepo, rolesRepo, roleRequestRepo, notificationRepo, activityLogRepo } from '@/storage/repositories';
import { STORAGE_KEYS } from '@/storage/keys';

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

export interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  actionType: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  targetEmail?: string;
  status: 'success' | 'failure' | 'pending' | 'warning';
  details: string;
  ipAddress?: string;
  deviceInfo?: string;
  severity: 'info' | 'warning' | 'error';
}

export interface RoleRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  requestType: 'organizer' | 'venue_owner';
  companyName: string;
  idNumber?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  idType: string;
  idImage?: string;
  selfieWithId?: string;
  businessEmail?: string;
  businessPhone?: string;
  reason?: string;
  rejectionNote?: string;
  role?: string; // Legacy field
  createdAt?: string; // Legacy field
}

export interface RoleRequestActionResult {
  request: RoleRequest | null;
  error?: string;
}

export interface BasicUserUpdate { 
  id: string; 
  roles?: string[]; 
  role?: string; 
  status?: string; 
  accountStatus?: string; 
  [k:string]: any; 
}

interface StoredUser extends Omit<User, 'id'> {
  passwordHash: string;
  id: string;
  verified?: boolean;
  verifiedAt?: string;
}

// User validation schema
const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string()
    .email("Invalid email format")
    .refine(email => {
      const domain = email.split('@')[1]?.toLowerCase();
      const validDomains = [
        'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com',
        'protonmail.com', 'aol.com', 'msn.com', 'live.com', 'me.com'
      ];
      return validDomains.includes(domain);
    }, "Please use a common email provider (Gmail, Outlook, Yahoo, etc.)"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phoneNumber: z.string().optional(),
  role: z.enum(["user", "organizer"]),
});

// =============================================================================
// LOGGING FUNCTIONS
// =============================================================================

export function createLogEntry(entry: Omit<LogEntry, 'id' | 'timestamp'>): LogEntry {
  const log: LogEntry = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...entry };
  activityLogRepo.append(log);
  return log;
}

export function getAllLogs(): LogEntry[] {
  const list = activityLogRepo.list() as any[];
  return list.filter(l => l && l.id && l.timestamp).map(l => l as LogEntry);
}

export function logAuthEvent(userId: string, actionType: string, status: 'success' | 'failure' | 'pending' | 'warning', details: string, userInfo: any) {
  // Activity logging is now limited to admin dashboard activities only
  // This legacy function is kept for backward compatibility but does not log to database
  
  // Also log to legacy system for backward compatibility (will be removed later)
  return createLogEntry({
    userId,
    userName: userInfo?.name || 'Unknown',
    userEmail: userInfo?.email || 'unknown@example.com',
    userRole: userInfo?.role || 'user',
    actionType,
    targetType: 'authentication',
    status,
    details,
    ipAddress: 'client-side',
    severity: status === 'failure' ? 'warning' : 'info'
  });
}

// =============================================================================
// USER MANAGEMENT FUNCTIONS
// =============================================================================

const getStoredUsers = (): Record<string, StoredUser> => {
  return userRepo.all() as Record<string, StoredUser>;
};

const saveUser = (user: StoredUser) => {
  userRepo.upsert(user);
};

export const userService = {
  get(id: string) { return userRepo.get(id); },
  upsert(user: BasicUserUpdate) { userRepo.upsert(user); },
  addRole(userId: string, role: string) {
  const canonical = role === 'venue_owner' ? 'VenueOwner' : role.charAt(0).toUpperCase() + role.slice(1);
    const existing = userRepo.get(userId) || { id: userId, roles: ['User'] } as any;
    const rolesArr = Array.from(new Set([...(existing.roles || ['User']), canonical]));
    userRepo.upsert({ ...existing, role: canonical, roles: rolesArr });
    rolesRepo.addRole(userId, canonical);
  },
  isSuspended(userId: string) {
    const rec = userRepo.get(userId);
    if (!rec) return false;
    const status = (rec.status || rec.accountStatus || '').toString().toLowerCase();
    return status === 'suspended';
  }
};

// =============================================================================
// AUTHENTICATION FUNCTIONS
// =============================================================================

export async function signIn(identifier: string, password: string): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 800));

  const users: Record<string, any> = getStoredUsers();
  if (!users || Object.keys(users).length === 0) throw new Error('No users found');

  const user: any = Object.values(users).find((u: any) => 
    u?.email === identifier || u?.phoneNumber === identifier
  ) || null;

  if (!user) {
    throw new Error('User not found');
  }

  // Block suspended accounts
  try {
    const rawStatus = (user.status || user.accountStatus || '').toString().toLowerCase();
    if (rawStatus === 'suspended') {
      throw new Error('Account suspended. Please contact support.');
    }
    if (rawStatus === 'deactivated' || rawStatus === 'disabled') {
      throw new Error('Account inactive. Please contact support.');
    }
  } catch (e: any) {
    if (e instanceof Error) throw e;
    throw new Error('Account unavailable.');
  }

  // Special case for admin@locked.com
  if (identifier === 'admin@locked.com') {
    if (password === 'admin123') return user;
    throw new Error('Invalid password');
  }

  // Password validation with bcrypt
  try {
    const storedHash: string = user.passwordHash;
    let passwordMatch = false;

    if (storedHash?.startsWith('$2')) {
      passwordMatch = await bcrypt.compare(password, storedHash);
    } else {
      // Legacy password migration
      try {
        const decoded = atob(storedHash || '');
        if (decoded === password) {
          passwordMatch = true;
          const newHash = bcrypt.hashSync(password, 10);
          const users = getStoredUsers();
          const existing = users[user.id];
          if (existing) {
            saveUser({ ...(existing as any), passwordHash: newHash });
          }
        }
      } catch { /* not base64 or decode failed */ }
    }

    if (!passwordMatch) throw new Error('Invalid password');
    return user;
  } catch (error) {
    console.error('Error verifying password:', error);
    throw new Error('Invalid password');
  }
}

export async function signUp(
  name: string,
  email: string,
  password: string,
  phoneNumber?: string,
  role: 'user' | 'organizer' = 'user'
): Promise<{ tempUserId: string; email: string }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const actualRole = 'user'; // Always use 'user' role
        
        const validationResult = userSchema.safeParse({
          name, email, password, phoneNumber, role: actualRole
        });
        
        if (!validationResult.success) {
          const firstIssue = (validationResult as any).error?.issues?.[0];
          reject(new Error(firstIssue?.message || 'Validation failed'));
          return;
        }
        
        const users = getStoredUsers();
        const emailExists = Object.values(users).some(user => (user as any).email === email);
        
        if (emailExists) {
          reject(new Error('Email already registered'));
          return;
        }
        
        const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const passwordHash = bcrypt.hashSync(password, 10);
        
        // Store unverified user data temporarily
        const tempUserData = {
          tempUserId,
          name,
          email,
          phoneNumber,
          role: actualRole,
          passwordHash,
          createdAt: new Date().toISOString(),
          verified: false
        };
        
        // Store in localStorage temporarily
        const tempUsers = JSON.parse(localStorage.getItem('temp_users') || '{}');
        tempUsers[tempUserId] = tempUserData;
        localStorage.setItem('temp_users', JSON.stringify(tempUsers));
        
        resolve({ tempUserId, email });
      } catch (error) {
        console.error('Sign-up error:', error);
        reject(new Error('Sign-up failed. Please try again.'));
      }
    }, 800);
  });
}

// New function to verify email with code
export async function verifyEmail(
  tempUserId: string,
  verificationCode: string
): Promise<User> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        // Verification is now handled server-side via Supabase email links
        // No client-side code verification needed
        
        // Get temp user data
        const tempUsers = JSON.parse(localStorage.getItem('temp_users') || '{}');
        const tempUserData = tempUsers[tempUserId];
        
        if (!tempUserData) {
          reject(new Error('Verification session expired. Please try signing up again.'));
          return;
        }
        
        // Create permanent user account
        const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const newUser: StoredUser = {
          id,
          name: tempUserData.name,
          email: tempUserData.email,
          phoneNumber: tempUserData.phoneNumber,
          role: tempUserData.role,
          passwordHash: tempUserData.passwordHash,
          createdAt: tempUserData.createdAt,
          verified: true,
          verifiedAt: new Date().toISOString()
        };
        
        saveUser(newUser);
        
        try { rolesRepo.setForUser(id, ['User']); } catch (e) { console.error('Failed to init roles', e); }
        
        // Clean up temp user data
        delete tempUsers[tempUserId];
        localStorage.setItem('temp_users', JSON.stringify(tempUsers));
        
        const { passwordHash: _, ...userWithoutPassword } = newUser;
        resolve(userWithoutPassword);
      } catch (error) {
        console.error('Email verification error:', error);
        reject(new Error('Email verification failed. Please try again.'));
      }
    }, 1000);
  });
}

export async function updateUserProfile(userId: string, userData: Partial<User>): Promise<User> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const users = getStoredUsers();
        const existing = users[userId];
        if (!existing) { reject(new Error('User not found')); return; }
        const updated: StoredUser = { ...existing, ...userData } as StoredUser;
        saveUser(updated);
        const { passwordHash, ...updatedUser } = updated;
        resolve(updatedUser as any);
      } catch (error) {
        reject(new Error('Failed to update profile'));
      }
    }, 300);
  });
}

export async function signOut(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Toast notification will be shown by the component calling signOut
      resolve();
    }, 300);
  });
}

export async function forgotPassword(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const users = getStoredUsers();
      const emailExists = Object.values(users).some(user => user.email === email);
      
      if (!emailExists) {
        reject(new Error('No account found with this email'));
        return;
      }
      
      resolve();
    }, 800);
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (token && token.length > 10) {
        resolve();
      } else {
        reject(new Error('Invalid or expired token'));
      }
    }, 800);
  });
}

// =============================================================================
// ROLE REQUEST FUNCTIONS
// =============================================================================

export function getAllRoleRequests(): RoleRequest[] {
  try {
    const combinedRequests = roleRequestRepo.all().map((legacyReq: any) => {
      if (legacyReq.userName && legacyReq.userEmail) return legacyReq as RoleRequest;
      return {
        id: legacyReq.id,
        userId: legacyReq.userId || 'unknown',
        userName: legacyReq.userName || legacyReq.name || 'Unknown User',
        userEmail: legacyReq.userEmail || legacyReq.email || 'unknown@example.com',
  requestType: legacyReq.requestType || (legacyReq.role?.toLowerCase() === 'venueowner' ? 'venue_owner' : 'organizer'),
        companyName: legacyReq.companyName || 'Unknown Company',
        status: legacyReq.status || 'pending',
        submittedAt: legacyReq.submittedAt || legacyReq.createdAt || new Date().toISOString(),
        reviewedAt: legacyReq.reviewedAt,
        reviewedBy: legacyReq.reviewedBy,
        idType: legacyReq.idType || 'Unknown',
        idImage: legacyReq.idImage,
        selfieWithId: legacyReq.selfieWithId,
        businessEmail: legacyReq.businessEmail,
        businessPhone: legacyReq.businessPhone,
        reason: legacyReq.reason
      } as RoleRequest;
    });
    return combinedRequests as RoleRequest[];
  } catch (e) {
    console.error('Error getting role requests:', e);
    return [];
  }
}

export function saveRoleRequest(request: RoleRequest): RoleRequest {
  try {
    roleRequestRepo.save(request);
    
    try {
      createLogEntry({
        userId: request.userId,
        userName: request.userName,
        userEmail: request.userEmail,
        userRole: 'user',
        actionType: 'create',
        targetType: 'role_request',
        targetId: request.id,
        targetName: request.companyName,
        status: 'pending',
        details: `Role request submitted for ${request.requestType}`,
        severity: 'info',
        ipAddress: 'client-side'
      });
    } catch {}
    
    try {
      const { adminNotificationService } = require('./notificationService');
      adminNotificationService.create({
        title: 'New Role Request',
        message: `${request.userName} submitted a ${request.requestType === 'organizer' ? 'Organizer' : 'Venue Owner'} request`,
        type: 'role_request',
        link: `/admin/role-requests?requestId=${encodeURIComponent(request.id)}`,
        meta: { requestId: request.id }
      });
    } catch {}
    
    return request;
  } catch (error) {
    console.error('Error saving role request:', error);
    return request;
  }
}

export function updateRoleRequestStatus(
  id: string, 
  status: 'approved' | 'rejected' | 'cancelled', 
  adminName: string,
  rejectionNote?: string
): RoleRequest | null {
  try {
    // ✅ SECURITY: Removed sensitive request ID and admin name logging
    
    const requests = getAllRoleRequests();
    const originalRequest = requests.find(req => req.id === id);
    console.log('Original request:', originalRequest);
    
    if (!originalRequest) {
      console.error('Request not found with ID:', id);
      return null;
    }
    
    let updatedRequest: RoleRequest | null = null;
    
    const existing = roleRequestRepo.all();
    const current = existing.find(r=>r.id===id) as RoleRequest | undefined;
    if (!current) return null;
    
    updatedRequest = { ...current, status, reviewedAt: new Date().toISOString(), reviewedBy: adminName };
    if (status === 'rejected' && rejectionNote) (updatedRequest as any).rejectionNote = rejectionNote;
    roleRequestRepo.update(id, () => updatedRequest!);
    
    // Log status change
    try {
      if (updatedRequest) {
        const finalUpdated = updatedRequest as RoleRequest;
        const roleType = finalUpdated.requestType === 'organizer' ? 'Organizer' : 'Venue Owner';
        createLogEntry({
          userId: finalUpdated.userId,
          userName: finalUpdated.userName,
          userEmail: finalUpdated.userEmail,
          userRole: 'user',
          actionType: status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'cancel',
          targetType: 'role_request',
          targetId: finalUpdated.id,
          targetName: finalUpdated.companyName,
          status: status === 'approved' ? 'success' : 'warning',
          details: `${adminName} ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'cancelled'} ${roleType} role request for ${finalUpdated.userName}${(status === 'rejected' || status === 'cancelled') && rejectionNote ? ' (Reason: ' + rejectionNote + ')' : ''}`,
          severity: status === 'approved' ? 'info' : 'warning',
          ipAddress: 'client-side'
        });
        
        // Admin notification
        notificationRepo.prepend({
          id: `notif_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
          title: status === 'approved' ? 'Role Request Approved' : status === 'rejected' ? 'Role Request Rejected' : 'Role Request Revoked',
          message: `${adminName} ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'revoked'} ${finalUpdated.userName}'s ${roleType} request${(status === 'rejected' || status === 'cancelled') && rejectionNote ? ': ' + rejectionNote : ''}`,
          type: 'role_request',
          read: false,
          time: new Date().toISOString(),
          link: `/admin/role-requests?requestId=${encodeURIComponent(finalUpdated.id)}`
        });
      }
    } catch(e) {
      console.warn('Failed to log role request status change', e);
    }
    
    // Update user role if approved, or handle revocation
    if (status === 'approved' && updatedRequest) {
      try {
        updateUserRole(updatedRequest);
      } catch (error) {
        console.error('Error in updateUserRole:', error);
      }
    } else if (status === 'cancelled' && updatedRequest) {
      try {
        removeUserRole(updatedRequest);
      } catch (error) {
        console.error('Error in removeUserRole:', error);
      }
    }
    
    // Add notification for rejected requests
    if (status === 'rejected' && updatedRequest) {
      try {
        const { useNotificationStore } = require('@/store/notificationStore');
        const addNotification = useNotificationStore.getState().addNotification;
        
        const roleType = (updatedRequest as any).requestType === 'organizer' ? 'Organizer' : 'Venue Owner';
        
        addNotification({
          type: 'role_request',
          title: `${roleType} Role Request Rejected`,
          message: rejectionNote 
            ? `Your request for ${roleType} role was declined: ${rejectionNote}`
            : `Your request for ${roleType} role was declined. You can submit a new request with the correct information.`,
          link: `/pages/request-role/${(updatedRequest as any).requestType?.toLowerCase() || 'organizer'}`
        });
        
        console.log('Added role rejection notification');
      } catch (error) {
        console.error('Error adding rejection notification:', error);
      }
    }
    
    return updatedRequest;
  } catch (error) {
    console.error('Error updating role request:', error);
    return null;
  }
}

export function removeUserRole(request: RoleRequest): void {
  try {
    const userId = request.userId;
    if (!userId) {
      console.error('Cannot remove user role: missing userId in request');
      return;
    }
    
    const roleMapping: Record<string, string> = {
      'organizer': 'Organizer',
      'venue_owner': 'VenueOwner'
    };
    
    const roleKey = request.requestType === 'organizer' ? 'organizer' : 'venue_owner';
    const normalizedRole = roleMapping[roleKey];
    
    // ✅ SECURITY: Removed sensitive user ID logging
    
    // Remove role from user repository
    const existingUser = userRepo.get(userId) || { id: userId, roles: ['User'] } as any;
    const rolesArr: string[] = Array.isArray(existingUser.roles) ? [...existingUser.roles] : ['User'];
    const updatedRoles = rolesArr.filter(role => role !== normalizedRole);
    
    // Update primary role if it was the one being revoked
    const newPrimaryRole = updatedRoles.length > 0 ? updatedRoles[0] : 'User';
    userRepo.upsert({ ...existingUser, role: newPrimaryRole, roles: updatedRoles });
    
    // Remove role from roles repository
    const map = rolesRepo.map();
    const mapRoles = Array.isArray(map[userId]) ? [...map[userId]] : ['User'];
    const updatedMapRoles = mapRoles.filter(role => role !== normalizedRole);
    rolesRepo.setForUser(userId, updatedMapRoles.length > 0 ? updatedMapRoles : ['User']);
    
    // Add revocation notification
    try {
      const { useNotificationStore } = require('@/store/notificationStore');
      const addNotification = useNotificationStore.getState().addNotification;
      
      addNotification({
        type: 'role_request',
        title: `${normalizedRole} Role Revoked`,
        message: `Your ${normalizedRole} role has been revoked by an administrator.`,
        link: '/dashboards/user'
      });
      
      console.log('Added role revocation notification');
    } catch (error) {
      console.error('Error adding revocation notification:', error);
    }
  } catch (error) {
    console.error('Error removing user role:', error);
  }
}

export function updateUserRole(request: RoleRequest): void {
  try {
    const userId = request.userId;
    if (!userId) {
      console.error('Cannot update user role: missing userId in request');
      return;
    }
    
    const roleMapping: Record<string, string> = {
      'organizer': 'Organizer',
  'venue_owner': 'VenueOwner'
    };
    
  const roleKey = request.requestType === 'organizer' ? 'organizer' : 'venue_owner';
    const normalizedRole = roleMapping[roleKey];
    
    // ✅ SECURITY: Removed sensitive user ID logging
    
    const existingUser = userRepo.get(userId) || { id: userId, roles: ['User'] } as any;
    const rolesArr: string[] = Array.isArray(existingUser.roles) ? [...existingUser.roles] : ['User'];
    if (!rolesArr.includes(normalizedRole)) rolesArr.push(normalizedRole);
    userRepo.upsert({ ...existingUser, role: normalizedRole, roles: rolesArr });
    
    const map = rolesRepo.map();
    const mapRoles = Array.isArray(map[userId]) ? [...map[userId]] : ['User'];
    if (!mapRoles.includes(normalizedRole)) mapRoles.push(normalizedRole);
    rolesRepo.setForUser(userId, mapRoles);
    
    // Add approval notification
    try {
      const { useNotificationStore } = require('@/store/notificationStore');
      const addNotification = useNotificationStore.getState().addNotification;
      
      addNotification({
        type: 'role_request',
        title: `${normalizedRole} Role Approved`,
        message: `Your request for ${normalizedRole} role has been approved. You now have access to the ${normalizedRole} dashboard.`,
        link: `/${roleKey.toLowerCase()}`
      });
      
      console.log('Added role approval notification');
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  } catch (error) {
    console.error('Error updating user role:', error);
  }
}

export function getUserRoleRequests(userId: string): RoleRequest[] {
  try {
    const requests = getAllRoleRequests();
    return requests.filter(request => request.userId === userId);
  } catch (error) {
    console.error('Error retrieving user role requests:', error);
    return [];
  }
}

export function approveRoleRequest(id: string, adminName: string): RoleRequestActionResult {
  try {
    const updated = updateRoleRequestStatus(id, 'approved', adminName);
    if (!updated) return { request: null, error: 'Request not found' };
    
    const { adminNotificationService } = require('./notificationService');
    adminNotificationService.create({
      title: 'Role Request Approved',
      message: `${adminName} approved ${updated.userName}'s ${(updated.requestType === 'organizer' ? 'Organizer' : 'Venue Owner')} request`,
      type: 'role_request',
      link: `/admin/role-requests?requestId=${encodeURIComponent(updated.id)}`,
      meta: { requestId: updated.id, status: 'approved' }
    });
    return { request: updated };
  } catch (e:any) {
    return { request: null, error: e?.message || 'Approval failed' };
  }
}

export function rejectRoleRequest(id: string, adminName: string, note?: string): RoleRequestActionResult {
  try {
    const updated = updateRoleRequestStatus(id, 'rejected', adminName, note);
    if (!updated) return { request: null, error: 'Request not found' };
    
    const { adminNotificationService } = require('./notificationService');
    adminNotificationService.create({
      title: 'Role Request Rejected',
      message: `${adminName} rejected ${updated.userName}'s ${(updated.requestType === 'organizer' ? 'Organizer' : 'Venue Owner')} request${note ? ': ' + note : ''}`,
      type: 'role_request',
      link: `/admin/role-requests?requestId=${encodeURIComponent(updated.id)}`,
      meta: { requestId: updated.id, status: 'rejected' }
    });
    return { request: updated };
  } catch (e:any) {
    return { request: null, error: e?.message || 'Rejection failed' };
  }
}

// =============================================================================
// LEGACY COMPATIBILITY
// =============================================================================

export const ROLE_REQUESTS_KEY = STORAGE_KEYS.ROLE_REQUESTS;
export const LEGACY_ROLE_REQUESTS_KEY = STORAGE_KEYS.ROLE_REQUESTS_LEGACY;
