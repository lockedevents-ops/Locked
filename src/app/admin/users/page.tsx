"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, AlertCircle, User as UserIcon, Key, Mail, Download, Trash2, Upload, Search, Filter, UserPlus, Shield, Eye, EyeOff, User2, Clock, Phone, FileText, Edit, RefreshCcw, ChevronDown, ChevronLeft, ChevronRight, UserX, UserCheck, MoreVertical, Calendar } from 'lucide-react';
import Image from 'next/image';
import { RefreshButton } from '@/components/admin/RefreshButton';
import { ActionIconButton } from '@/components/admin/ActionIconButton';
import bcrypt from 'bcryptjs-react';
import { useAuth } from '@/contexts/AuthContext';
import { canDeleteUser, canSuspendUser, canEditUser } from '@/lib/adminPermissions';
/**
 * @deprecated authService moved to /legacy/auth/authService.ts
 * Now using activityLogRepo directly
 */
import { adminUserRepo, userRepo, rolesRepo, notificationRepo, activityLogRepo } from '@/storage/repositories';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient as createSupabaseClient } from '@/lib/supabase/client/client';
import { useAdminUsersDetailed } from '@/hooks/adminQueries';
import { useToast } from '@/hooks/useToast';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import { useDebounce } from '@/hooks/useDebounce';
import { createLogEntry } from '@/legacy/auth/authService';
import { logUserProfileUpdate, getAdminRoleString } from '@/lib/auditLogger';
import { PageLoader } from '@/components/loaders/PageLoader';

// Define user type
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  roles?: string[];
  createdAt: string;
  lastLoginAt?: string;
  status: 'active' | 'suspended' | 'pending';
  image?: string;
  phoneNumber?: string;
  bio?: string;
  location?: string;
  website?: string;
  password?: string; // Optional password property for admin creation
  // Invitation / credential provisioning helpers
  needsPasswordSetup?: boolean;
  invitationToken?: string;
  invitedAt?: string;
}
  
// (Legacy ConfirmationModal removed – inline confirmations now used inside the modal itself)

// Add User Modal Component
const AddUserModal = ({ 
  isOpen, 
  onClose, 
  onAdd 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAdd: (userData: Partial<User>) => Promise<void>;
}) => {
  // Admin toast system
  const adminToast = useToast();
  const [userData, setUserData] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'user',
    status: 'active',
    password: '',  // Add this for storing password
  });
  const [sendInvite, setSendInvite] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Always get currentAdmin (don't move this inside conditional blocks)
  const { user: currentAdmin, roles: adminRoles } = useAuth();
  const adminRole = adminRoles.includes('super_admin') ? 'super_admin' : (adminRoles.includes('admin') ? 'admin' : (adminRoles.includes('support_agent') ? 'support_agent' : ''));
  
  // Only handle click outside when the modal is open
  useEffect(() => {
    if (!isOpen) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // When invitation flow enabled, force status to pending
  useEffect(() => {
    if (sendInvite) {
      setUserData(prev => ({ ...prev, status: 'pending' }));
    }
  }, [sendInvite]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUserData({ ...userData, [name]: value });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Enforce creation permissions: support_agent only by admin or super_admin
    if (userData.role === 'support_agent' && !['admin','super_admin'].includes(adminRole)) {
      adminToast.showError('Permission Denied','Only admins or super admins can create support agents');
      setIsLoading(false);
      return;
    }

    // Validation: for admin/super_admin require either password or invitation toggle
    if (['admin','super_admin'].includes(userData.role || '') && !sendInvite && !userData.password) {
      adminToast.showError('Missing Password','Provide an initial password or choose invitation');
      setIsLoading(false);
      return;
    }

    // Validation: if not sending invite and no password for any role, set invite automatically
    if (!['admin','super_admin'].includes(userData.role || '') && !sendInvite && !userData.password) {
      // Auto-enable invite if password omitted for standard roles
      setSendInvite(true);
    }
    
    // Prepare user data with invitation setup
    const newUser = {
      ...userData,
      needsPasswordSetup: sendInvite && !userData.password,
      roles: [userData.role || 'user'],
    };
    
    // Call the parent function to handle actual user creation
    try {
      await onAdd(newUser);
      setIsLoading(false);
      onClose();
      
      // Reset form
      setUserData({
        name: '',
        email: '',
        role: 'user',
        status: 'active',
        password: '',
      });
      setSendInvite(false);
    } catch (error) {
      console.error('User creation failed:', error);
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        ref={modalRef}
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
      >
        <div className="border-b border-gray-200 dark:border-neutral-800 p-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add New User</h3>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 max-h-[calc(90vh-8rem)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={userData.name}
                onChange={handleInputChange}
                className="w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={userData.email}
                onChange={handleInputChange}
                className="w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="user@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <select
                name="role"
                value={userData.role}
                onChange={handleInputChange}
                className="w-full p-2.5 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-primary focus:border-primary bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 cursor-pointer"
              >
                <option value="user">User</option>
                <option value="organizer">Organizer</option>
                <option value="venue_owner">Venue Owner</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Use Admin Management page to create admin roles (Admin, Super Admin, Support Agent).
              </p>
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={userData.status}
                onChange={handleInputChange}
                disabled={sendInvite}
                className={`w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 ${sendInvite ? 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 cursor-not-allowed' : ''}`}
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
              {sendInvite && (
                <p className="mt-1 text-xs text-amber-600">Invitation selected: status locked to Pending until the user sets a password.</p>
              )}
            </div>
            
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={userData.phoneNumber || ''}
                onChange={handleInputChange}
                className="w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="+233 20 123 4567"
              />
            </div>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location
              </label>
              <input
                id="location"
                name="location"
                type="text"
                value={userData.location || ''}
                onChange={handleInputChange}
                className="w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Accra, Ghana"
              />
            </div>
          </div>
          
          <div className="mt-6">
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              value={userData.bio || ''}
              onChange={handleInputChange}
              className="w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Brief description about the user"
            ></textarea>
          </div>
          
          {/* Credential provisioning section */}
          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900">
              <input
                id="sendInvite"
                type="checkbox"
                className="mt-1 cursor-pointer"
                checked={sendInvite}
                onChange={(e) => setSendInvite(e.target.checked)}
              />
              <label htmlFor="sendInvite" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                <span className="font-medium block mb-0.5">Send invitation email with password setup link</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {['admin','super_admin'].includes(userData.role || '')
                    ? 'Admins can also be invited. If unchecked you must set a password now.'
                    : 'Leave unchecked to manually set a password now (optional). If you leave password blank we will auto-send invite.'}
                </span>
              </label>
            </div>
            {!sendInvite && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {['admin','super_admin','support_agent'].includes(userData.role || '') ? 'Initial Password*' : 'Initial Password (optional)'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="w-full p-2.5 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:ring-primary focus:border-primary pr-10 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder={['admin','super_admin','support_agent'].includes(userData.role || '') ? 'Set initial password' : 'Leave blank to send invite'}
                    value={userData.password || ''}
                    onChange={handleInputChange}
                    required={['admin','super_admin','support_agent'].includes(userData.role || '') && !sendInvite}
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {['admin','super_admin','support_agent'].includes(userData.role || '') ? 'Required unless you choose invitation flow.' : 'Optional: if blank an invite link will be issued.'}
                </p>
              </div>
            )}
            {sendInvite && (
              <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-md p-3">
                An invitation token will be generated and a simulated email log entry (action: invite) will be recorded. The user will appear with status <strong>pending</strong> until they set their password.
              </div>
            )}
          </div>
          
          <div className="bg-gray-50 dark:bg-neutral-900 -mx-6 -mb-6 px-6 py-3 mt-6 border-t border-gray-200 dark:border-neutral-800">
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-neutral-800 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-black dark:bg-black text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-800 cursor-pointer flex items-center"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>Add User</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Redesigned User Detail Modal Component (complete overhaul)
const UserDetailModal = ({ user, onClose, onUpdateUser, onSuspendUser, onDeleteUser, initialEditMode = false }: { user: User; onClose: () => void; onUpdateUser: (id:string,data:Partial<User>)=>void; onSuspendUser:(id:string,s:boolean)=>void; onDeleteUser:(id:string)=>void; initialEditMode?: boolean; }) => {
  const adminToast = useToast();
  const [isEditing,setIsEditing]=useState(initialEditMode);
  const [userData,setUserData]=useState<Partial<User>>(user);
  const [activeTab,setActiveTab]=useState<'profile'|'activity'|'security'>('profile');
  const [imagePreview,setImagePreview]=useState<string|null>(user.image||null);
  const [showPasswordForm,setShowPasswordForm]=useState(false);
  const [newPassword,setNewPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [showNewPassword,setShowNewPassword]=useState(false);
  const [showConfirmPassword,setShowConfirmPassword]=useState(false);
  const [savingProfile,setSavingProfile]=useState(false);
  // destructive action confirmation state
  const [pendingAction,setPendingAction]=useState<null|{type:'suspend'|'reactivate'|'delete'; location:'quick'|'danger'}>(null);
  const [adminPassword,setAdminPassword]=useState('');
  const [actionLoading,setActionLoading]=useState(false);
  const REQUIRE_ADMIN_PASSWORD_FOR_DESTRUCTIVE = true;
  const modalRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{const esc=(e:KeyboardEvent)=>{if(e.key==='Escape') onClose();};document.addEventListener('keydown',esc);return()=>document.removeEventListener('keydown',esc);},[onClose]);
  const handleInputChange=(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>{const {name,value}=e.target;setUserData(p=>({...p,[name]:value}));};
  const saveProfile=()=>{setSavingProfile(true);try{onUpdateUser(user.id,userData);setIsEditing(false);}finally{setTimeout(()=>setSavingProfile(false),400);}};
  const activityEntries=React.useMemo(()=>{try{const all=(activityLogRepo?.list?.()||[]).filter((l:any)=>l.userId===user.id||l.targetId===user.id);return all.sort((a:any,b:any)=>new Date(b.time||b.timestamp||b.createdAt).getTime()-new Date(a.time||a.timestamp||a.createdAt).getTime()).slice(0,25);}catch{return[];}},[user.id]);
  const roleBadges=(userData.roles||[userData.role]).filter(Boolean).map((r,i)=>(<span key={i} className={`px-2 py-0.5 rounded text-xs font-medium ${r==='super_admin'?'bg-purple-100 text-purple-700': r==='admin'?'bg-purple-50 text-purple-600': r==='organizer'?'bg-blue-50 text-blue-600': r==='venue_owner'?'bg-amber-50 text-amber-700':'bg-gray-100 text-gray-600'}`}>{r==='venue_owner'?'Venue Owner': r==='super_admin'?'Super Admin': r!.charAt(0).toUpperCase()+r!.replace('_',' ').slice(1)}</span>));
  const normalizedStatus = userData.status || user.status || 'active';
  const statusPill=(<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${normalizedStatus==='active'?'bg-green-100 text-green-700': normalizedStatus==='suspended'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>{normalizedStatus==='active'&&<CheckCircle className="h-3 w-3" />}{normalizedStatus==='suspended'&&<XCircle className="h-3 w-3" />}{normalizedStatus==='pending'&&<Clock className="h-3 w-3" />}{normalizedStatus.charAt(0).toUpperCase()+normalizedStatus.slice(1)}</span>);
  const { user: currentAdmin, roles: currentAdminRoles } = useAuth(); const currentAdminRole = currentAdminRoles.includes('super_admin') ? 'super_admin' : (currentAdminRoles.includes('admin') ? 'admin' : (currentAdminRoles.includes('support_agent') ? 'support_agent' : '')); const canEditThis=currentAdmin&&canEditUser(currentAdminRole,user.id); const canSuspendThis=currentAdmin&&canSuspendUser(currentAdminRole,user.id); const canDeleteThis=currentAdmin&&canDeleteUser(currentAdminRole,user.id)&&currentAdmin.id!==user.id; const canPassword=canManagePassword(currentAdminRole,user.id,user.role);
  const handleSetPassword=()=>{
    if(!newPassword||newPassword.length<8){adminToast.showError('Password Too Short','Minimum length is 8 characters');return;}
    if(newPassword!==confirmPassword){adminToast.showError('Mismatch','Passwords do not match');return;}
    try{
      const hash = bcrypt.hashSync(newPassword,10);
      if(['admin','super_admin'].includes(user.role)){
        // store raw password (dev only) plus hash for adminUserRepo (will refactor later)
        adminUserRepo.upsert({id:user.id,email:user.email,name:user.name,role:user.role as any,password:newPassword,passwordHash:hash,lastActive:Date.now(),is2FAVerified:true} as any);
      }
      // Upsert user with hashed password; keep legacy btoa fallback removed
      userRepo.upsert({id:user.id,passwordHash:hash});
      createLogEntry({userId:currentAdmin?.id||'unknown',userName:currentAdmin?.name||'Unknown',userEmail:currentAdmin?.email||'',userRole:currentAdmin?.role||'admin',actionType:'reset_password',targetType:'user',targetId:user.id,targetName:user.name,status:'success',details:`Inline password set for ${user.name}`,severity:'info'});
      adminToast.showSuccess('Password Updated','New password saved successfully');
      setShowPasswordForm(false); setNewPassword(''); setConfirmPassword('');
    }catch(e){console.error(e);adminToast.showError('Update Failed','Could not update password');}
  };

  // Validate admin password for destructive action using Supabase re-authentication
  const verifyAdminPassword = async (): Promise<boolean> => {
    if (!REQUIRE_ADMIN_PASSWORD_FOR_DESTRUCTIVE) return true;
    if (!currentAdmin) {
      adminToast.showError('No Admin Context');
      return false;
    }
    if (!adminPassword) {
      adminToast.showError('Password Required', 'Please enter your password');
      return false;
    }

    try {
      // Verify password by attempting to sign in
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: currentAdmin.email || '',
        password: adminPassword,
      });

      if (error) {
        adminToast.showError('Invalid Password', 'The password you entered is incorrect');
        return false;
      }

      return true;
    } catch (err) {
      console.error('Password verification error:', err);
      adminToast.showError('Verification Failed', 'Could not verify password');
      return false;
    }
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;
    
    const verified = await verifyAdminPassword();
    if (!verified) return;

    setActionLoading(true);
    const type = pendingAction.type;
    try {
      if (type === 'delete') {
        await onDeleteUser(user.id);
        createLogEntry({
          userId: currentAdmin?.id || 'unknown',
          userName: currentAdmin?.name || 'Unknown',
          userEmail: currentAdmin?.email || '',
          userRole: currentAdmin?.role || 'admin',
          actionType: 'delete_user',
          targetType: 'user',
          targetId: user.id,
          targetName: user.name,
          status: 'success',
          details: 'User deleted via inline confirmation',
          severity: 'error'
        });
        onClose();
      } else if (type === 'suspend') {
        await onSuspendUser(user.id, true);
        // Update local state to reflect suspension
        setUserData(prev => ({ ...prev, status: 'suspended' }));
        createLogEntry({
          userId: currentAdmin?.id || 'unknown',
          userName: currentAdmin?.name || 'Unknown',
          userEmail: currentAdmin?.email || '',
          userRole: currentAdmin?.role || 'admin',
          actionType: 'suspend_user',
          targetType: 'user',
          targetId: user.id,
          targetName: user.name,
          status: 'success',
          details: 'User suspended',
          severity: 'warning'
        });
      } else if (type === 'reactivate') {
        await onSuspendUser(user.id, false);
        // Update local state to reflect reactivation
        setUserData(prev => ({ ...prev, status: 'active' }));
        createLogEntry({
          userId: currentAdmin?.id || 'unknown',
          userName: currentAdmin?.name || 'Unknown',
          userEmail: currentAdmin?.email || '',
          userRole: currentAdmin?.role || 'admin',
          actionType: 'reactivate_user',
          targetType: 'user',
          targetId: user.id,
          targetName: user.name,
          status: 'success',
          details: 'User reactivated',
          severity: 'info'
        });
      }
      setPendingAction(null);
      setAdminPassword('');
    } catch (error) {
      console.error('Action execution error:', error);
    } finally {
      setTimeout(() => setActionLoading(false), 400);
    }
  };

  const ConfirmationPanel = ({inline}:{inline?:boolean}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(()=>{ if(pendingAction && inputRef.current){ inputRef.current.focus(); } },[pendingAction]);
    if(!pendingAction) return null;
    const verb = pendingAction.type==='delete'?'Delete': pendingAction.type==='suspend'?'Suspend': 'Reactivate';
    const cfg = {
      delete: { wrap:'bg-red-50 border-red-200', btn:'bg-red-600 hover:bg-red-700' },
      suspend:{ wrap:'bg-amber-50 border-amber-200', btn:'bg-amber-600 hover:bg-amber-700' },
      reactivate:{ wrap:'bg-green-50 border-green-200', btn:'bg-green-600 hover:bg-green-700' }
    } as const;
    const palette = cfg[pendingAction.type];
    return (
      <div className={`w-full border rounded-md p-4 space-y-3 ${palette.wrap}`}>
        <p className="text-sm font-medium text-gray-800">Confirm {verb} Action</p>
        <p className="text-sm text-gray-600">Type your admin password to proceed. This action will be logged.</p>
        {REQUIRE_ADMIN_PASSWORD_FOR_DESTRUCTIVE && (
          <input ref={inputRef} autoFocus type="password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} className="w-full border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 rounded-md px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary" placeholder="Admin password" />
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          <button disabled={actionLoading} onClick={executePendingAction} className={`px-4 py-2 text-sm font-medium rounded-md text-white ${palette.btn} disabled:opacity-50 cursor-pointer`}>{actionLoading? 'Processing...': `Confirm ${verb}`}</button>
          <button disabled={actionLoading} onClick={()=>{setPendingAction(null);setAdminPassword('');}} className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-neutral-700 cursor-pointer">Cancel</button>
        </div>
      </div>
    );
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-profile-dialog-title"
      aria-describedby="user-profile-dialog-description"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={modalRef} className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-xl shadow-2xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 px-6 pt-6 pb-4 border-b">
          <div className="flex items-start gap-4 flex-1">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden ring-2 ring-white shadow">
                {imagePreview ? (
                  <Image 
                    src={imagePreview} 
                    alt={userData.name || 'User'} 
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-2xl font-semibold text-gray-600">{userData.name?.charAt(0)||'U'}</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="user-profile-dialog-title" className="text-xl font-semibold tracking-tight mr-2">{userData.name}</h2>
                {statusPill}
              </div>
              <div className="flex flex-wrap gap-1">{roleBadges}</div>
              <div className="text-sm text-gray-500 flex items-center gap-1"><Mail className="h-4 w-4" /> {userData.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start lg:self-auto">
            {canEditThis && !isEditing && (
              <button onClick={()=>setIsEditing(true)} className="px-3 py-2 text-sm font-medium rounded-md bg-black text-white hover:bg-gray-800 cursor-pointer flex items-center gap-1">
                <Edit className="h-4 w-4" /> Edit
              </button>
            )}
            {isEditing && (
              <>
                <button onClick={()=>{setUserData(user);setImagePreview(user.image||null);setIsEditing(false);}} className="px-3 py-2 text-sm font-medium rounded-md border hover:bg-gray-50 cursor-pointer">Cancel</button>
                <button disabled={savingProfile} onClick={saveProfile} className="px-3 py-2 text-sm font-medium rounded-md bg-black dark:bg-black text-white hover:bg-gray-800 dark:hover:bg-gray-800 disabled:opacity-60 cursor-pointer">{savingProfile? 'Saving...':'Save'}</button>
              </>
            )}
            <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 cursor-pointer" aria-label="Close"><X className="h-5 w-5" /></button>
          </div>
        </div>
  {/* Hidden description for assistive tech */}
  <p id="user-profile-dialog-description" className="sr-only">View and edit user profile, roles, security, and activity details.</p>
  {/* Tabs */}
        <div className="px-6 border-b bg-gray-50/50 dark:bg-neutral-900/50">
          <div className="flex gap-6">
            {['profile','activity','security'].map(tab=>(
              <button key={tab} onClick={()=>setActiveTab(tab as any)} className={`relative py-3 text-sm font-medium cursor-pointer transition-colors ${activeTab===tab?'text-black dark:text-white':'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'}`}>
                {tab==='profile'?'Profile':tab==='activity'?'Activity':'Security'}
                {activeTab===tab && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-black dark:bg-white rounded-full" />}
              </button>
            ))}
          </div>
        </div>
        {/* Animated Tab Content with consistent height */}
        <div className="p-6 h-[60vh] overflow-hidden">
          <div key={activeTab} className="h-full w-full overflow-y-auto px-0 space-y-8 animate-fade-slide [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
            {activeTab==='profile' && (
              <div className="space-y-8">
                {isEditing ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Avatar</label>
                      <div className="flex items-center gap-4">
                        <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden relative group">
                          {imagePreview ? (
                            <Image 
                              src={imagePreview} 
                              alt="Preview"
                              width={80}
                              height={80}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <span className="text-lg text-gray-600 font-semibold">{userData.name?.charAt(0)||'U'}</span>
                          )}
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{const data=r.result as string;setImagePreview(data);setUserData(prev=>({...prev,image:data}));};r.readAsDataURL(f);}} />
                        </div>
                        <p className="text-sm text-gray-500">Click avatar to upload a new image.</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                      <input name="name" value={userData.name||''} onChange={handleInputChange} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                      <input name="email" value={userData.email||''} onChange={handleInputChange} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                      <input name="phoneNumber" value={userData.phoneNumber||''} onChange={handleInputChange} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Location</label>
                      <input name="location" value={userData.location||''} onChange={handleInputChange} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Website</label>
                      <input name="website" value={userData.website||''} onChange={handleInputChange} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary" placeholder="https://" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Role</label>
                      <select name="role" value={userData.role||''} onChange={handleInputChange} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-neutral-600">
                        <option value="user">User</option>
                        <option value="organizer">Organizer</option>
                        <option value="venue_owner">Venue Owner</option>
                        <option value="admin">Admin</option>
                        <option value="support_agent">Support Agent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                      <select name="status" value={userData.status||''} onChange={handleInputChange} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary">
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-600 mb-1">Bio</label>
                      <textarea name="bio" rows={4} value={userData.bio||''} onChange={handleInputChange} className="w-full border rounded-md px-3 py-2 text-sm focus:ring-primary focus:border-primary resize-y" />
                    </div>
                  </div>
                ): (
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="space-y-6 md:col-span-2">
                      <section className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-lg p-5 shadow-sm">
                        <h3 className="text-sm font-semibold mb-3 tracking-wide text-gray-700 dark:text-gray-300">About</h3>
                        <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">{user.bio || 'No bio provided.'}</p>
                      </section>
                      <section className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-lg p-5 shadow-sm">
                        <h3 className="text-sm font-semibold mb-3 tracking-wide text-gray-700 dark:text-gray-300">Contact & Metadata</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div><span className="block text-gray-500 dark:text-gray-400">Email</span><span className="font-medium text-gray-800 dark:text-gray-200 break-all">{user.email}</span></div>
                          <div><span className="block text-gray-500 dark:text-gray-400">Phone</span><span className="font-medium text-gray-800 dark:text-gray-200">{user.phoneNumber||'—'}</span></div>
                          <div><span className="block text-gray-500 dark:text-gray-400">Location</span><span className="font-medium text-gray-800 dark:text-gray-200">{user.location||'—'}</span></div>
                          <div><span className="block text-gray-500 dark:text-gray-400">Website</span><span className="font-medium text-primary dark:text-primary truncate">{user.website||'—'}</span></div>
                          <div><span className="block text-gray-500 dark:text-gray-400">Created</span><span className="font-medium text-gray-800 dark:text-gray-200">{new Date(user.createdAt).toLocaleString()}</span></div>
                          <div><span className="block text-gray-500 dark:text-gray-400">Last Login</span><span className="font-medium text-gray-800 dark:text-gray-200">{user.lastLoginAt? new Date(user.lastLoginAt).toLocaleString(): '—'}</span></div>
                                                      <div className="sm:col-span-2"><span className="block text-gray-500 dark:text-gray-400">User ID</span><code className="text-xs bg-gray-100 dark:bg-neutral-900 px-2 py-1 rounded inline-block mt-0.5 text-gray-800 dark:text-gray-200">{user.id}</code></div>
                        </div>
                      </section>
                    </div>
                    <div className="space-y-6">
                      <section className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-lg p-5 shadow-sm">
                        <h3 className="text-sm font-semibold mb-3 tracking-wide text-gray-700">Roles & Status</h3>
                        <div className="flex flex-wrap gap-2 mb-3">{roleBadges}</div>
                        <div>{statusPill}</div>
                      </section>
                      <section className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-lg p-5 shadow-sm space-y-4">
                        <h3 className="text-sm font-semibold tracking-wide text-gray-700">Quick Actions</h3>
                        {pendingAction && pendingAction.location==='quick' ? (
                          <ConfirmationPanel inline />
                        ) : (
                          <div className="flex flex-col gap-2">
                            {canSuspendThis && (
                              <button onClick={()=>setPendingAction({type:userData.status==='suspended'?'reactivate':'suspend',location:'quick'})} className={`px-3 py-2 text-sm font-medium rounded-md cursor-pointer text-white ${userData.status==='suspended'?'bg-green-600 hover:bg-green-700':'bg-amber-600 hover:bg-amber-700'}`}>{userData.status==='suspended'?'Reactivate':'Suspend'} Account</button>
                            )}
                            {canDeleteThis && (
                              <button onClick={()=>setPendingAction({type:'delete',location:'quick'})} className="px-3 py-2 text-sm font-medium rounded-md cursor-pointer bg-red-600 hover:bg-red-700 text-white">Delete Account</button>
                            )}
                          </div>
                        )}
                      </section>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab==='activity' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold tracking-wide text-gray-700">Recent Activity</h3>
                  <span className="text-xs uppercase tracking-wider text-gray-400">{activityEntries.length} entries</span>
                </div>
                <div className="space-y-3">
                  {activityEntries.length===0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-neutral-900 border dark:border-neutral-800 rounded-md p-4">No activity recorded for this user yet.</div>
                  )}
                  {activityEntries.map((log:any)=>{const ts=new Date(log.time||log.timestamp||log.createdAt||Date.now()).toLocaleString();return(
                    <div key={log.id} className="flex gap-3 items-start bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-md p-3 shadow-sm">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-semibold uppercase">{(log.actionType||'?').slice(0,2)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 font-medium">{log.actionType?.replace(/_/g,' ')||'Action'}</p>
                        <p className="text-xs text-gray-600 truncate">{log.details||log.message||'—'}</p>
                        <span className="text-xs text-gray-400">{ts}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${log.status==='success'?'bg-green-100 text-green-700': log.status==='failed'?'bg-red-100 text-red-700':'bg-gray-100 text-gray-700'}`}>{log.status||'info'}</span>
                    </div>
                  );})}
                </div>
              </div>
            )}
            {activeTab==='security' && (
              <div className="space-y-8">
                <section className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-lg p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold tracking-wide text-gray-700 flex items-center gap-1"><Key className="h-4 w-4" /> Password Management</h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-md">Set a new password directly or send a reset link by email. Direct setting restricted to super_admin privileges.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={()=>{adminToast.showSuccess('Reset Link Sent','Password reset link sent (simulated)');}} className="px-3 py-2 text-sm font-medium rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer flex items-center gap-1"><Mail className="h-4 w-4" /> Send Reset Link</button>
                    {canPassword && (
                      <button onClick={()=>setShowPasswordForm(p=>!p)} className="px-3 py-2 text-sm font-medium rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer flex items-center gap-1"><Key className="h-4 w-4" /> {showPasswordForm?'Cancel':'Set Password'}</button>
                    )}
                  </div>
                  {showPasswordForm && (
                    <div className="mt-2 border-t pt-4 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">New Password</label>
                          <div className="relative">
                            <input
                              type={showNewPassword? 'text':'password'}
                              value={newPassword}
                              onChange={e=>setNewPassword(e.target.value)}
                              className="w-full border rounded-md px-3 py-2 pr-10 text-sm focus:ring-primary focus:border-primary"
                              placeholder="Minimum 8 characters"
                            />
                            <button
                              type="button"
                              onClick={()=>setShowNewPassword(p=>!p)}
                              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700 cursor-pointer"
                              aria-label={showNewPassword? 'Hide password':'Show password'}
                            >
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Confirm Password</label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword? 'text':'password'}
                              value={confirmPassword}
                              onChange={e=>setConfirmPassword(e.target.value)}
                              className="w-full border rounded-md px-3 py-2 pr-10 text-sm focus:ring-primary focus:border-primary"
                              placeholder="Re-enter password"
                            />
                            <button
                              type="button"
                              onClick={()=>setShowConfirmPassword(p=>!p)}
                              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700 cursor-pointer"
                              aria-label={showConfirmPassword? 'Hide password':'Show password'}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      {newPassword&&confirmPassword&&newPassword!==confirmPassword && <p className="text-sm text-red-600">Passwords do not match</p>}
                      <div className="flex justify-end">
                        <button onClick={handleSetPassword} disabled={!newPassword||newPassword!==confirmPassword||newPassword.length<8} className="px-4 py-2 text-sm font-medium rounded-md bg-black dark:bg-black text-white hover:bg-gray-800 dark:hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer">Save Password</button>
                      </div>
                    </div>
                  )}
                </section>
                <section className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-lg p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold tracking-wide text-gray-700 flex items-center gap-1"><Download className="h-4 w-4" /> Data Export</h3>
                  <p className="text-sm text-gray-500">Download a JSON snapshot of this user's profile data.</p>
                  <button onClick={()=>{try{const dataStr='data:text/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(user,null,2));const a=document.createElement('a');a.href=dataStr;a.download=`user-${user.id}.json`;document.body.appendChild(a);a.click();a.remove();adminToast.showSuccess('Export Started');}catch{adminToast.showError('Export Failed');}}} className="px-3 py-2 text-sm font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer w-fit">Export JSON</button>
                </section>
                <section className="bg-white dark:bg-neutral-900 border dark:border-neutral-800 rounded-lg p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-semibold tracking-wide text-red-600 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Danger Zone</h3>
                  <p className="text-sm text-gray-500">Permanent or high-risk actions. They are logged and require admin password.</p>
                  {pendingAction && pendingAction.location==='danger' ? (
                    <ConfirmationPanel />
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {canSuspendThis && (
                        <button onClick={()=>setPendingAction({type:userData.status==='suspended'?'reactivate':'suspend',location:'danger'})} className={`px-3 py-2 text-sm font-medium rounded-md text-white cursor-pointer ${userData.status==='suspended'?'bg-green-600 hover:bg-green-700':'bg-amber-600 hover:bg-amber-700'}`}>{userData.status==='suspended'?'Reactivate':'Suspend'} Account</button>
                      )}
                      {canDeleteThis && (
                        <button onClick={()=>setPendingAction({type:'delete',location:'danger'})} className="px-3 py-2 text-sm font-medium rounded-md bg-red-600 hover:bg-red-700 text-white cursor-pointer">Delete Account</button>
                      )}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
      <style jsx global>{`
        .animate-fade-slide { animation: fadeSlide .25s ease; }
        @keyframes fadeSlide { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  let color, icon, label;
  
  switch(status) {
    case 'active':
      color = 'bg-green-100 text-green-800';
      icon = <CheckCircle className="w-3 h-3 mr-1" />;
      label = 'Active';
      break;
    case 'suspended':
      color = 'bg-red-100 text-red-800';
      icon = <XCircle className="w-3 h-3 mr-1" />;
      label = 'Suspended';
      break;
    case 'pending':
      color = 'bg-yellow-100 text-yellow-800';
      icon = <Clock className="w-3 h-3 mr-1" />;
      label = 'Pending';
      break;
    default:
      color = 'bg-gray-100 text-gray-800';
      icon = <AlertCircle className="w-3 h-3 mr-1" />;
      label = status;
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {icon}
      {label}
    </span>
  );
};

// Empty state component
const EmptyState = ({
  onClearFilters,
  hasFilters
}: {
  onClearFilters: () => void;
  hasFilters: boolean;
}) => (
  <div className="text-center py-12">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-neutral-900 mb-4">
      <UserIcon className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-1">No users found</h3>
    {hasFilters ? (
      <>
        <p className="text-gray-500 mb-4">Try adjusting your search or filter parameters</p>
        <button 
          onClick={onClearFilters}
          className="text-primary hover:text-primary-dark font-medium cursor-pointer"
        >
          Clear all filters
        </button>
      </>
    ) : (
      <p className="text-gray-500">
        No users have been registered yet.
      </p>
    )}
  </div>
);

// Role pill component
const RolePill = ({ role }: { role: string }) => {
  let bgColor = '';
  let textColor = '';
  let displayRole = '';
  
  switch (role.toLowerCase()) {
    case 'admin':
      bgColor = 'bg-purple-100';
      textColor = 'text-purple-800';
      displayRole = 'Admin';
      break;
    case 'super_admin':
      bgColor = 'bg-purple-100';
      textColor = 'text-purple-800';
      displayRole = 'Super Admin';
      break;
    case 'organizer':
      bgColor = 'bg-blue-100';
      textColor = 'text-blue-800';
      displayRole = 'Organizer';
      break;
  case 'venue_owner':
    case 'venueowner':
      bgColor = 'bg-amber-100';
      textColor = 'text-amber-800';
      displayRole = 'Venue Owner';
      break;
    default:
      bgColor = 'bg-gray-100';
      textColor = 'text-gray-800';
      displayRole = role.charAt(0).toUpperCase() + role.slice(1);
  }
  
  return (
    <span className={`${bgColor} ${textColor} px-2 py-0.5 rounded-md text-xs font-medium`}>
      {displayRole}
    </span>
  );
};

export default function UsersPage() {
  // ✅ SESSION MANAGEMENT: Prevent session expiration on users page
  useSessionManagement();
  
  // Admin Toast system
  const adminToast = useToast();
  const { data: usersData, isLoading, refetch, isFetching } = useAdminUsersDetailed();
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // ✅ PHASE 2 OPTIMIZATION: Debounce search term to reduce unnecessary filtering
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [openInEditMode, setOpenInEditMode] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 50;
  // loading now driven by React Query
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
const [showAddUserModal, setShowAddUserModal] = useState(false);
const [isRefreshing, setIsRefreshing] = useState(false);
// Removed legacy delete confirmation modal state (now inline in UserDetailModal)
const { user: adminUser, roles: adminRoles } = useAuth();  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Apply URL param filters on initial data availability
  useEffect(() => {
    if (!isLoading) {
      const roleParam = searchParams.get('role');
      const statusParam = searchParams.get('status');
      const searchParam2 = searchParams.get('search');
      if (roleParam) setRoleFilter(roleParam);
      if (statusParam && ['active', 'suspended', 'pending', 'all'].includes(statusParam)) setStatusFilter(statusParam);
      if (searchParam2) setSearchTerm(searchParam2);
    }
  }, [isLoading, searchParams]);
  
  // Handle filter changes
  const users: User[] = useMemo(() => {
    return (usersData || []).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.primaryRole,
      roles: u.roles,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      status: u.status || 'active',
      image: u.image,
      phoneNumber: u.phoneNumber,
    }));
  }, [usersData]);

  // Update selectedUser when users data changes (after refetch)
  useEffect(() => {
    if (selectedUser && users.length > 0) {
      const updatedUser = users.find(u => u.id === selectedUser.id);
      if (updatedUser) {
        setSelectedUser(updatedUser);
      }
    }
  }, [users]);

  useEffect(() => {
    const result = users.filter(user => {
      // Hide super_admins from non-super_admins
      const isSuperAdmin = adminRoles.includes('super_admin');
      if (!isSuperAdmin) {
        const userRoles = user.roles || [user.role];
        if (userRoles.includes('super_admin')) return false;
      }
      
      // Role filter
      if (roleFilter !== 'all') {
        const roles = user.roles || [user.role];
        if (!roles.includes(roleFilter)) return false;
      }
      
      // Status filter
      if (statusFilter !== 'all' && user.status !== statusFilter) return false;
      
      // Search filter
      if (debouncedSearchTerm) {
        const lower = debouncedSearchTerm.toLowerCase();
        if (!(user.name.toLowerCase().includes(lower) || user.email.toLowerCase().includes(lower) || (user.location && user.location.toLowerCase().includes(lower)))) return false;
      }
      return true;
    });
    setFilteredUsers(result);
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [users, adminRoles, roleFilter, statusFilter, debouncedSearchTerm]);
  
  // Calculate pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
  
  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Handle user updates
  const handleUpdateUser = async (userId: string, userData: Partial<User>) => {
    try {
      // Use adminUser from component-level useAuth() hook
      if (!adminUser) { adminToast.showError('Authentication Error'); return; }

      // Persist profile to Supabase
      const profileUpdates: any = {};
      if (userData.name !== undefined) profileUpdates.full_name = userData.name;
      if (userData.email !== undefined) profileUpdates.email = userData.email;
      if (userData.phoneNumber !== undefined) profileUpdates.phone_number = userData.phoneNumber;
      if (userData.image !== undefined) profileUpdates.avatar_url = userData.image;
      if (userData.bio !== undefined) profileUpdates.bio = userData.bio;
      if (userData.location !== undefined) profileUpdates.location = userData.location;
      if (userData.website !== undefined) profileUpdates.website = userData.website;

      if (Object.keys(profileUpdates).length) {
        const supabase = createSupabaseClient();
        
        // Fetch old values before updating
        const { data: oldProfile } = await supabase
          .from('profiles')
          .select('full_name, email, phone_number, avatar_url, bio, location, website')
          .eq('id', userId)
          .single();
        
        const { data: updatedData, error } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', userId)
          .select();
        
        if (error) { 
          console.error('Profile update error:', error);
          adminToast.showError('Profile Update Failed', error.message || 'Database error'); 
          return; 
        }
        
        if (!updatedData || updatedData.length === 0) {
          console.warn('Profile update returned no data');
          adminToast.showError('Update Warning', 'No rows were updated');
          return;
        }

        // Debug: Log what was updated
        console.log('✅ Profile update successful:', {
          userId,
          updates: profileUpdates,
          oldValues: oldProfile,
          newData: updatedData[0]
        });

        // Audit log for profile update with before/after values
        const changes = Object.keys(profileUpdates).map(key => {
          const oldValue = oldProfile?.[key as keyof typeof oldProfile] || 'None';
          const newValue = profileUpdates[key] || 'None';
          return `${key}: "${oldValue}" → "${newValue}"`;
        }).join(', ');

        await logUserProfileUpdate({
          adminId: adminUser.id,
          adminName: adminUser.email?.split('@')[0] || 'Admin',
          adminRole: getAdminRoleString(adminRoles),
          targetUserId: userId,
          targetName: userData.name || oldProfile?.full_name || 'Unknown',
          targetEmail: userData.email || oldProfile?.email || '',
          updatedFields: profileUpdates,
          oldValues: oldProfile,
          changesSummary: changes
        });
      }

      // Sync primary role if provided
      if (userData.role) {
        const existingUser = users.find(u => u.id === userId);
        const existingRoles = existingUser?.roles || [];
        if (!existingRoles.includes(userData.role)) {
          const response = await fetch(`/api/admin/users/${userId}/role`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: userData.role }),
          });

          if (!response.ok) {
            const error = await response.json();
            adminToast.showError(error.error || 'Role Update Failed');
            return;
          }

          adminToast.showSuccess(`${userData.role} role granted successfully`);
        }
      }

  // Optimistic UI update on filtered list (query will revalidate in background)
  setFilteredUsers(prev => prev.map((u: any) => u.id === userId ? { ...u, ...userData } : u));
  
  // Force refetch to get latest data from database
  await refetch();

      createLogEntry({
        userId: adminUser?.id || 'unknown',
        userName: adminUser?.email?.split('@')[0] || 'Unknown',
        userEmail: adminUser?.email || '',
        userRole: adminRoles.includes('super_admin') ? 'super_admin' : 'admin',
        actionType: 'update_user',
        targetType: 'user',
        targetId: userId,
        targetName: userData.name || 'Unknown user',
        targetEmail: userData.email,
        status: 'success',
        details: `${adminUser.email?.split('@')[0]} updated profile` ,
        severity: 'info'
      });

  adminToast.showSuccess('User Updated');
    } catch (error) {
      console.error('Error updating user:', error);
  adminToast.showError('Update Failed','Failed to update user');
    }
  };
  
  // Handle add new user
  const handleAddUser = async (userData: Partial<User>) => {
    try {
      if (!adminUser) {
        adminToast.showError('Authentication Required');
        return;
      }

      // Call the admin API endpoint to create user
      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email,
          password: userData.password,
          role: userData.role || 'user',
          phoneNumber: userData.phoneNumber,
          image: userData.image,
          needsPasswordSetup: userData.needsPasswordSetup
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      if (!result.success) {
        throw new Error(result.error || 'User creation failed');
      }

      // Update the local users list
      await refetch();
      
      const roleText = userData.role && userData.role !== 'user' ? ` with ${userData.role} role` : '';
  adminToast.showSuccess('User Created',`User ${userData.name} created successfully${roleText}`);
      
    } catch (error: any) {
      console.error('Error creating user:', error);
  adminToast.showError('Creation Failed', error?.message || 'Failed to create user. Please try again.');
    }
  };
  
  // Update this function in the UsersPage component
  const handleSuspendUser = async (userId: string, suspend: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspend }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Failed to ${suspend ? 'suspend' : 'reactivate'} user`);
      }

      adminToast.showSuccess(
        suspend ? 'User Suspended' : 'User Reactivated',
        suspend ? 'The user account has been suspended' : 'The user account has been reactivated'
      );

      // Refetch users to update the list
      refetch();
    } catch (error: any) {
      console.error(`Error ${suspend ? 'suspending' : 'reactivating'} user:`, error);
      adminToast.showError(
        `${suspend ? 'Suspend' : 'Reactivate'} Failed`,
        error.message || `Failed to ${suspend ? 'suspend' : 'reactivate'} user`
      );
    }
  };
  
  // Replace the handleDeleteUser function to include permission checks
  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/delete`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      adminToast.showSuccess(
        'User Deleted',
        'The user account has been permanently deleted'
      );

      // Refetch users to update the list
      refetch();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      adminToast.showError(
        'Delete Failed',
        error.message || 'Failed to delete user'
      );
    }
  };
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Update URL with search params for shareable links
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (roleFilter !== 'all') params.set('role', roleFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    
    const url = `/admin/users${params.toString() ? `?${params.toString()}` : ''}`;
    router.replace(url);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setRoleFilter('all');
    setStatusFilter('all');
    setSearchTerm('');
    router.replace('/admin/users');
  };
  
  // Toggle dropdown
  const toggleDropdown = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (dropdownOpen === userId) {
      setDropdownOpen(null);
    } else {
      setDropdownOpen(userId);
    }
  };
  
  // Close all dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(null);
    };
    
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);
  
  // Calculate stats
  const activeCount = users.filter(u => u.status === 'active').length;
  const suspendedCount = 0; // status not tracked in DB yet
  const pendingCount = 0;
  const adminCount = users.filter(u => (u.roles||[u.role]).some(r => r === 'admin' || r === 'super_admin')).length;
  
  // Check if any filters are applied
  const hasFilters = roleFilter !== 'all' || statusFilter !== 'all' || searchTerm !== '';
  
  // Loading state
  if (isLoading) {
    return <PageLoader message="Loading users..." fullHeight />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>User Management</span>
            {/* Total user count badge (unfiltered total) */}
            <span
              className="inline-flex items-center rounded-full bg-gray-200/80 dark:bg-neutral-800/80 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:text-gray-200 ring-1 ring-inset ring-white/60 dark:ring-black/40 shadow-sm"
              aria-label={`Total users: ${users.length}`}
            >
              {users.length}
            </span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Manage user accounts, roles, and permissions</p>
        </div>
        <div className="flex gap-2">
          <button
        onClick={() => setShowAddUserModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-black text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-black focus:ring-offset-2 transition-colors cursor-pointer"
          >
        <UserPlus className="h-4 w-4" />
        Add User
          </button>
          <RefreshButton 
            onRefresh={async () => { await refetch(); adminToast.showSuccess('Users Refreshed'); }}
            isLoading={isFetching}
          />
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="organizer">Organizer</option>
              <option value="venue_owner">Venue Owner</option>
              <option value="support_agent">Support Agent</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-800">
      <thead className="bg-gray-50 dark:bg-neutral-800">
              <tr>
        <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
        <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email
                </th>
        <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Phone
                </th>
        <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Roles
                </th>
        <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
        <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Joined
                </th>
        <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Login
                </th>
        <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-800">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <UserX className="h-12 w-12 text-gray-300 dark:text-neutral-600 mb-3" />
                      <p className="text-base font-medium text-gray-900 dark:text-gray-100">No users found</p>
                      <p className="text-sm mt-1">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.slice(indexOfFirstUser, indexOfLastUser).map((user) => (
        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
          <td className="px-6 py-2 whitespace-nowrap">
                    <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-neutral-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user.image ? (
              <Image 
                src={user.image} 
                alt={user.name}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
                unoptimized
              />
                        ) : (
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {user.name?.charAt(0) || 'U'}
                          </span>
                        )}
                      </div>
            <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</div>
                      </div>
                    </div>
                  </td>
          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {user.email}
                  </td>
          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                    {user.phoneNumber || '—'}
                  </td>
          <td className="px-6 py-2 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.map((role) => (
                        <span key={role} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          role === 'super_admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                          role === 'admin' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                          role === 'support_agent' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                          role === 'venue_owner' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' :
                          'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200'
                        }`}>
                          {role === 'venue_owner' ? 'Venue Owner' : 
                           role === 'super_admin' ? 'Super Admin' : 
                           role?.charAt(0).toUpperCase() + role?.slice(1)}
                        </span>
                      ))}
                    </div>
                  </td>
          <td className="px-6 py-2 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                      user.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                      'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                    }`}>
                      {user.status === 'active' ? 'Active' : 
                       user.status === 'pending' ? 'Pending' : 'Suspended'}
                    </span>
                  </td>
          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                  </td>
          <td className="px-6 py-2 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <ActionIconButton
                        label="View details"
                        variant="view"
                        onClick={() => { setOpenInEditMode(false); setSelectedUser(user); }}
                      >
                        <Eye className="h-4 w-4" />
                      </ActionIconButton>
                      <ActionIconButton
                        label="Edit user"
                        variant="edit"
                        onClick={() => { setOpenInEditMode(true); setSelectedUser(user); }}
                      >
                        <Edit className="h-4 w-4" />
                      </ActionIconButton>
                      {/* Suspend/Reactivate and Delete actions intentionally removed per request */}
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Results Summary and Pagination */}
        <div className="bg-white dark:bg-neutral-900 px-4 py-3 border-t border-gray-200 dark:border-neutral-800 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium">{indexOfFirstUser + 1}</span> to{' '}
                <span className="font-medium">{Math.min(indexOfLastUser, filteredUsers.length)}</span> of{' '}
                <span className="font-medium">{filteredUsers.length}</span> users
                {filteredUsers.length < users.length && (
                  <span className="text-gray-500 dark:text-gray-400"> (filtered from {users.length} total)</span>
                )}
              </p>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-neutral-700 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <div className="flex items-center gap-1">
                  {/* First page */}
                  {currentPage > 2 && (
                    <>
                      <button
                        onClick={() => handlePageChange(1)}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-neutral-700 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
                      >
                        1
                      </button>
                      {currentPage > 3 && (
                        <span className="px-2 text-gray-500 dark:text-gray-400">...</span>
                      )}
                    </>
                  )}
                  
                  {/* Previous page */}
                  {currentPage > 1 && (
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-neutral-700 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
                    >
                      {currentPage - 1}
                    </button>
                  )}
                  
                  {/* Current page */}
                  <button
                    className="px-3 py-1 text-sm border-2 border-blue-500 dark:border-blue-600 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                  >
                    {currentPage}
                  </button>
                  
                  {/* Next page */}
                  {currentPage < totalPages && (
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-neutral-700 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
                    >
                      {currentPage + 1}
                    </button>
                  )}
                  
                  {/* Last page */}
                  {currentPage < totalPages - 1 && (
                    <>
                      {currentPage < totalPages - 2 && (
                        <span className="px-2 text-gray-500 dark:text-gray-400">...</span>
                      )}
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-neutral-700 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-800 text-gray-700 dark:text-gray-300"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-neutral-700 rounded-md hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddUserModal && (
        <AddUserModal
          isOpen={showAddUserModal}
          onClose={() => setShowAddUserModal(false)}
          onAdd={handleAddUser}
        />
      )}

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => { setSelectedUser(null); setOpenInEditMode(false); }}
          onUpdateUser={handleUpdateUser}
          onSuspendUser={handleSuspendUser}
          onDeleteUser={(userId) => handleDeleteUser(userId)}
          initialEditMode={openInEditMode}
        />
      )}
    </div>
  );
}

// Helper function (if not already imported)
function canManagePassword(adminRole: string, targetUserId: string, targetRole?: string) {
  if (adminRole !== 'super_admin') return false;
  if (targetRole === 'super_admin') {
    // Note: This needs to be moved inside a React component to use useAuth()
    // For now, allowing super_admins to manage other super_admin passwords
    // This should be refactored when moving this function to a proper location
    return true;
  }
  return true;
}