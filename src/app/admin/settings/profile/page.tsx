"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client/client';
import { useToast } from '@/hooks/useToast';
import {
  User,
  Mail,
  Lock,
  Camera,
  Save,
  X,
  Shield,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle,
  Crown
} from 'lucide-react';
import { PageLoader } from '@/components/loaders/PageLoader';

interface AdminProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone_number: string | null;
}

export default function AdminProfileSettingsPage() {
  const { user, roles } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);

  // Permissions
  const isSuperAdmin = roles.includes('super_admin');
  const canEditEmail = isSuperAdmin; // Only super admins can change email
  const canEditProfile = true; // Everyone can edit their own profile

  // Fetch profile
  useEffect(() => {
    if (!user) {
      router.push('/admin/login');
      return;
    }

    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, phone_number')
        .eq('id', user!.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFullName(data.full_name || '');
      setEmail(data.email || '');
      setPhoneNumber(data.phone_number || '');
      
      // Generate signed URL for avatar if it exists (private bucket)
      if (data.avatar_url) {
        try {
          // Check if we have a cached signed URL
          const cacheKey = `avatar_signed_url_${user!.id}`;
          const cachedData = localStorage.getItem(cacheKey);
          
          if (cachedData) {
            const { url, path, expiresAt } = JSON.parse(cachedData);
            // If cached URL is still valid (with 1 day buffer) and path matches, use it
            if (url && path === data.avatar_url && expiresAt > Date.now() + 86400000) {
              setAvatarPreview(url);
              return;
            }
          }

          // Extract file path from full URL if it's already a URL
          let filePath = data.avatar_url;
          if (data.avatar_url.includes('admin-avatars')) {
            const parts = data.avatar_url.split('admin-avatars/');
            filePath = parts[1] || data.avatar_url;
          }
          
          const { data: signedUrlData } = await supabase.storage
            .from('admin-avatars')
            .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year
          
          if (signedUrlData?.signedUrl) {
            setAvatarPreview(signedUrlData.signedUrl);
            // Cache the signed URL with expiry time
            localStorage.setItem(cacheKey, JSON.stringify({
              url: signedUrlData.signedUrl,
              path: data.avatar_url,
              expiresAt: Date.now() + (60 * 60 * 24 * 365 * 1000) // 1 year in ms
            }));
          }
        } catch (err) {
          console.error('Error generating signed URL:', err);
          setAvatarPreview(data.avatar_url);
        }
      } else {
        setAvatarPreview(null);
        // Clear cache if avatar was removed
        localStorage.removeItem(`avatar_signed_url_${user!.id}`);
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast.showError('Failed to load profile', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.showError('File too large', 'Avatar must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.showError('Invalid file type', 'Please select an image file');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Remove avatar
  const handleRemoveAvatar = () => {
    setShowDeleteConfirm(true);
  };

  // Delete avatar from storage and database
  const handleDeleteAvatar = async () => {
    if (!user) return;

    try {
      setDeletingAvatar(true);

      // Delete from storage if exists
      if (profile?.avatar_url) {
        try {
          let filePath = profile.avatar_url;
          if (profile.avatar_url.includes('admin-avatars')) {
            const parts = profile.avatar_url.split('admin-avatars/');
            filePath = parts[1] || profile.avatar_url;
          }
          
          await supabase.storage
            .from('admin-avatars')
            .remove([filePath]);
        } catch (err) {
          console.error('Error deleting from storage:', err);
        }
      }

      // Update database
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (error) throw error;

      // Audit log
      try {
        await supabase.from('admin_audit_logs').insert({
          action: 'profile_avatar_delete',
          performed_by: user.id,
          target_user: user.id,
          details: {
            title: 'Avatar Deleted',
            description: `Admin ${profile?.full_name || user.email} deleted their profile avatar`,
            action_type: 'profile_avatar_delete',
            target_type: 'profile',
            status: 'success',
            admin_user_name: profile?.full_name || user.email?.split('@')[0] || 'Admin',
            admin_user_role: roles.includes('super_admin') ? 'super_admin' : 'admin',
            old_avatar_url: profile?.avatar_url
          },
          created_at: new Date().toISOString()
        });
      } catch (auditErr) {
        console.warn('Audit log failed (non-fatal):', auditErr);
      }

      // Update local state
      setAvatarFile(null);
      setAvatarPreview(null);
      setProfile(prev => prev ? { ...prev, avatar_url: null } : null);
      
      // Clear cache
      localStorage.removeItem(`avatar_signed_url_${user.id}`);
      
      toast.showSuccess('Avatar deleted successfully');
      setShowDeleteConfirm(false);
    } catch (error: any) {
      console.error('Error deleting avatar:', error);
      toast.showError('Failed to delete avatar', error.message);
    } finally {
      setDeletingAvatar(false);
    }
  };

  // Upload avatar to Supabase Storage
  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;

    try {
      setUploadingAvatar(true);

      // Delete old avatar if exists
      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('admin-avatars')
            .remove([`${user.id}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('admin-avatars')
        .upload(filePath, avatarFile);

      if (uploadError) throw uploadError;

      // Get signed URL (private bucket requires signed URLs)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('admin-avatars')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year expiry

      if (signedUrlError) throw signedUrlError;

      return signedUrlData.signedUrl;
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.showError('Failed to upload avatar', error.message);
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Upload avatar if changed
      let avatarUrl = profile?.avatar_url;
      if (avatarFile) {
        const newAvatarUrl = await uploadAvatar();
        if (newAvatarUrl) {
          avatarUrl = newAvatarUrl;
          // Clear old cache when new avatar is uploaded
          localStorage.removeItem(`avatar_signed_url_${user.id}`);
        }
      }

      // Prepare update data
      const updates: any = {
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim() || null,
        avatar_url: avatarUrl,
      };

      // Only super admins can change email
      if (canEditEmail && email !== profile?.email) {
        updates.email = email.trim();
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Audit log
      try {
        const changes: Record<string, any> = {};
        if (fullName.trim() !== profile?.full_name) changes.full_name = { old: profile?.full_name, new: fullName.trim() };
        if (phoneNumber.trim() !== profile?.phone_number) changes.phone_number = { old: profile?.phone_number, new: phoneNumber.trim() || null };
        if (canEditEmail && email !== profile?.email) changes.email = { old: profile?.email, new: email.trim() };
        if (avatarFile) changes.avatar_uploaded = true;

        await supabase.from('admin_audit_logs').insert({
          action: 'profile_update',
          performed_by: user.id,
          target_user: user.id,
          details: {
            title: 'Profile Updated',
            description: `Admin ${profile?.full_name || user.email} updated their profile`,
            action_type: 'profile_update',
            target_type: 'profile',
            status: 'success',
            admin_user_name: profile?.full_name || user.email?.split('@')[0] || 'Admin',
            admin_user_role: roles.includes('super_admin') ? 'super_admin' : 'admin',
            changes
          },
          created_at: new Date().toISOString()
        });
      } catch (auditErr) {
        console.warn('Audit log failed (non-fatal):', auditErr);
      }

      toast.showSuccess('Profile updated successfully');
      await fetchProfile();
      setAvatarFile(null);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.showError('Failed to save profile', error.message);
    } finally {
      setSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!user) return;

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.showError('All password fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.showError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.showError('New password must be at least 8 characters');
      return;
    }

    try {
      setChangingPassword(true);

      // Verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile?.email || '',
        password: currentPassword,
      });

      if (signInError) {
        toast.showError('Current password is incorrect');
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // Audit log
      try {
        await supabase.from('admin_audit_logs').insert({
          action: 'password_change',
          performed_by: user.id,
          target_user: user.id,
          details: {
            title: 'Password Changed',
            description: `Admin ${profile?.full_name || user.email} changed their password`,
            action_type: 'password_change',
            target_type: 'account',
            status: 'success',
            admin_user_name: profile?.full_name || user.email?.split('@')[0] || 'Admin',
            admin_user_role: roles.includes('super_admin') ? 'super_admin' : 'admin'
          },
          created_at: new Date().toISOString()
        });
      } catch (auditErr) {
        console.warn('Audit log failed (non-fatal):', auditErr);
      }

      toast.showSuccess('Password changed successfully');
      
      // Reset password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.showError('Failed to change password', error.message);
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <PageLoader message="Loading profile settings..." fullHeight />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profile Settings</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your admin account details and security
          </p>
        </div>
        {isSuperAdmin && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm font-medium">
            <Crown className="h-4 w-4" />
            Super Admin
          </div>
        )}
      </div>

      {/* Permission Notice */}
      {!isSuperAdmin && (
        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Limited Permissions</p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Some fields like email can only be changed by a Super Admin for security reasons.
            </p>
          </div>
        </div>
      )}

      {/* Avatar Section */}
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Profile Picture</h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="h-24 w-24 rounded-full object-cover border-2 border-gray-200 dark:border-neutral-700"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white text-2xl font-bold border-2 border-gray-200 dark:border-neutral-700">
                {(() => {
                  const name = fullName.trim() || 'Admin';
                  const parts = name.split(' ');
                  if (parts.length >= 2) {
                    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
                  }
                  return name.slice(0, 2).toUpperCase();
                })()}
              </div>
            )}
            {avatarPreview && (
              <button
                onClick={handleRemoveAvatar}
                className="absolute -top-1 -right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full cursor-pointer"
                title="Remove avatar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors cursor-pointer"
            >
              <Camera className="h-4 w-4" />
              Change Avatar
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              JPG, PNG or GIF. Max size 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Profile Information</h2>
        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter your full name"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              Email Address
              {!canEditEmail && (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                  (Contact Super Admin to change)
                </span>
              )}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!canEditEmail}
                className={`w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary ${
                  !canEditEmail ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                placeholder="Enter your email"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your phone number"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveProfile}
            disabled={saving || uploadingAvatar}
            className="flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all font-medium cursor-pointer"
          >
            {(saving || uploadingAvatar) ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Password Section */}
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Password & Security</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Update your password to keep your account secure
            </p>
          </div>
          <Shield className="h-6 w-6 text-gray-400" />
        </div>

        {!showPasswordSection ? (
          <button
            onClick={() => setShowPasswordSection(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors cursor-pointer"
          >
            <Lock className="h-4 w-4" />
            Change Password
          </button>
        ) : (
          <div className="space-y-4">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter new password (min 8 characters)"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {newPassword && newPassword.length < 8 && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Password must be at least 8 characters
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
                className="flex items-center gap-2 px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black hover:bg-black/90 dark:hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all font-medium cursor-pointer"
              >
                {changingPassword ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Update Password
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowPasswordSection(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="px-6 py-2.5 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role Information */}
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Role & Permissions</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-neutral-800 rounded-lg">
            <span className="text-sm text-gray-600 dark:text-gray-400">Current Role</span>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <span
                  key={role}
                  className={`px-3 py-1 text-xs font-medium rounded-full ${
                    role === 'super_admin'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                      : role === 'admin'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  }`}
                >
                  {role === 'super_admin' ? 'Super Admin' : role === 'support_agent' ? 'Support Agent' : 'Admin'}
                </span>
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isSuperAdmin
              ? 'You have full access to all system settings and user management.'
              : 'Contact a Super Admin to modify your permissions or account details.'}
          </p>
        </div>
      </div>

      {/* Delete Avatar Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Delete Avatar
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Are you sure you want to delete your avatar? This action cannot be undone and will remove the avatar from storage.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAvatar}
                    disabled={deletingAvatar}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium cursor-pointer transition-colors"
                  >
                    {deletingAvatar ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent inline-block mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deletingAvatar}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
