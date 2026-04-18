"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Shield, UserPlus, Eye, EyeOff, Mail, User as UserIcon, Key, AlertCircle, X, CheckCircle, XCircle, Search, Crown, Headphones, Edit, Trash2, Ban, MoreVertical, AlertTriangle, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client/client';
import { useToast } from '@/hooks/useToast';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import { useAdminManagementUsers, AdminManagementUser as AdminUser } from '@/hooks/adminQueries';
import { useQueryClient } from '@tanstack/react-query';
import bcrypt from 'bcryptjs-react';
import { RefreshButton } from '@/components/admin/RefreshButton';
import { PageLoader } from '@/components/loaders/PageLoader';

interface CreateAdminData {
  email: string;
  full_name: string;
  phone_number: string;
  ghana_card_number: string;
  avatar_url?: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  address: string;
  city: string;
  country: string;
  department: string;
  password: string;
  role: 'admin' | 'super_admin' | 'support_agent';
  status: 'active' | 'pending' | 'suspended';
}

export default function AdminManagementPage() {
  useSessionManagement();

  const { user, roles: currentUserRoles } = useAuth();
  const toast = useToast();
  const supabase = createClient();
  const queryClient = useQueryClient();

  // React Query hook for fetching admins with caching
  const { 
    data: admins = [], 
    isLoading, 
    isFetching, 
    refetch 
  } = useAdminManagementUsers({
    enabled: !!user?.id, // Only fetch when user is authenticated
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Action modals state
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Determine current user's admin role
  const isSuperAdmin = currentUserRoles.includes('super_admin');
  const isAdmin = currentUserRoles.includes('admin');

  // Filter admins based on role visibility (hide super_admins from non-super_admins)
  const visibleAdmins = useMemo(() => {
    const isSuperAdmin = currentUserRoles.includes('super_admin');
    if (isSuperAdmin) {
      return admins; // Super admins see everyone
    } else {
      // Regular admins and support agents don't see super_admins
      return admins.filter(admin => !admin.roles.includes('super_admin'));
    }
  }, [admins, currentUserRoles]);

  // Filter admins based on search query
  const filteredAdmins = useMemo(() => {
    if (!searchQuery.trim()) return visibleAdmins;

    const query = searchQuery.toLowerCase();
    return visibleAdmins.filter(admin => 
      admin.email.toLowerCase().includes(query) ||
      admin.full_name?.toLowerCase().includes(query)
    );
  }, [visibleAdmins, searchQuery]);

  // Get admin count by role (based on visible admins)
  const superAdminCount = visibleAdmins.filter(a => a.roles.includes('super_admin')).length;
  const adminCount = visibleAdmins.filter(a => a.roles.includes('admin') && !a.roles.includes('super_admin')).length;
  const supportAgentCount = visibleAdmins.filter(a => a.roles.includes('support_agent') && !a.roles.includes('admin') && !a.roles.includes('super_admin')).length;

  // Skeleton Loader
  // Show loading state if initial loading OR fetching (refreshing)
  if (isLoading || isFetching) {
    return <PageLoader message="Loading admin accounts..." fullHeight />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage administrator accounts and permissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(isSuperAdmin || isAdmin) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-black text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-black focus:ring-offset-2 transition-colors cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              Create Admin
            </button>
          )}
          <RefreshButton 
            queryKeys={[['admin', 'admins', 'list']]}
            isLoading={isFetching}
          />
        </div>
      </div>

      {/* Stats Cards - Dynamic grid based on visible cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isSuperAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Admins</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{visibleAdmins.length}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Super Admins</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{superAdminCount}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Regular Admins</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{adminCount}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Support Agents</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{supportAgentCount}</p>
            </div>
            <div className="h-12 w-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center">
              <Headphones className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Admin List */}
      <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg overflow-hidden">
        {filteredAdmins.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ? 'No admins found matching your search' : 'No admin users found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {admin.avatar_url ? (
                          <img 
                            src={admin.avatar_url} 
                            alt={admin.full_name || admin.email}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                            {admin.full_name ? admin.full_name.charAt(0).toUpperCase() : admin.email?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {admin.full_name || 'Not set'}
                          </p>
                          {admin.phone_number && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {admin.phone_number}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900 dark:text-gray-100">{admin.email}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {admin.roles.map((role) => (
                          <span
                            key={role}
                            className={`px-2 py-1 rounded-md text-xs font-medium ${
                              role === 'super_admin'
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                : role === 'support_agent'
                                ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                            }`}
                          >
                            {role === 'super_admin' ? 'Super Admin' : 
                             role === 'support_agent' ? 'Support Agent' : 
                             'Admin'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-medium ${
                          admin.status === 'active'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}
                      >
                        {admin.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {admin.last_login_at 
                        ? new Date(admin.last_login_at).toLocaleDateString() + ' ' + new Date(admin.last_login_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* View */}
                        <button
                          onClick={() => {
                            setSelectedAdmin(admin);
                            setShowViewModal(true);
                          }}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {/* Edit - Super Admin can edit all, Admin can edit non-super-admins */}
                        {(isSuperAdmin || (!admin.roles.includes('super_admin') && isAdmin)) && admin.id !== user?.id && (
                          <button
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setShowEditModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                            title="Edit Admin"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}

                        {/* Suspend/Reinstate */}
                        {(isSuperAdmin || (!admin.roles.includes('super_admin') && isAdmin)) && admin.id !== user?.id && (
                          <button
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setShowSuspendModal(true);
                            }}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              admin.status === 'active'
                                ? 'hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                                : 'hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400'
                            }`}
                            title={admin.status === 'active' ? 'Suspend' : 'Reinstate'}
                          >
                            {admin.status === 'active' ? <Ban className="h-4 w-4" /> : <RefreshCcw className="h-4 w-4" />}
                          </button>
                        )}

                        {/* Delete - Super Admin only, can't delete self */}
                        {isSuperAdmin && admin.id !== user?.id && (
                          <button
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                            title="Delete Admin"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Admin Modal */}
      {showCreateModal && (
        <CreateAdminModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            refetch();
          }}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* View Admin Modal */}
      {showViewModal && selectedAdmin && (
        <ViewAdminModal
          admin={selectedAdmin}
          onClose={() => {
            setShowViewModal(false);
            setSelectedAdmin(null);
          }}
        />
      )}

      {/* Edit Admin Modal */}
      {showEditModal && selectedAdmin && (
        <EditAdminModal
          admin={selectedAdmin}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAdmin(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedAdmin(null);
            refetch();
          }}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* Suspend/Reinstate Modal */}
      {showSuspendModal && selectedAdmin && (
        <SuspendAdminModal
          admin={selectedAdmin}
          onClose={() => {
            setShowSuspendModal(false);
            setSelectedAdmin(null);
          }}
          onSuccess={() => {
            setShowSuspendModal(false);
            setSelectedAdmin(null);
            refetch();
          }}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedAdmin && (
        <DeleteAdminModal
          admin={selectedAdmin}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedAdmin(null);
          }}
          onSuccess={() => {
            setShowDeleteModal(false);
            setSelectedAdmin(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

// Create Admin Modal Component
interface CreateAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isSuperAdmin: boolean;
}

function CreateAdminModal({ isOpen, onClose, onSuccess, isSuperAdmin }: CreateAdminModalProps) {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const supabase = createClient();
  const modalRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<CreateAdminData>({
    email: '',
    full_name: '',
    phone_number: '',
    ghana_card_number: 'GHA-',
    avatar_url: '',
    gender: 'prefer_not_to_say',
    address: '',
    city: '',
    country: '',
    department: '',
    password: '',
    role: 'admin',
    status: 'active',
  });
  const [sendInvite, setSendInvite] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // When invitation flow enabled, force status to pending
  useEffect(() => {
    if (sendInvite) {
      setFormData(prev => ({ ...prev, status: 'pending' }));
    }
  }, [sendInvite]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Format phone number to digits only
    if (name === 'phone_number') {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length <= 10) {
        setFormData(prev => ({ ...prev, [name]: digitsOnly }));
      }
      return;
    }
    
    // Format Ghana Card number (GHA-XXXXXXXXX-X)
    if (name === 'ghana_card_number') {
      // Always ensure it starts with GHA-
      if (!value.startsWith('GHA-')) {
        setFormData(prev => ({ ...prev, [name]: 'GHA-' }));
        return;
      }
      
      // Remove GHA- prefix for processing
      const withoutPrefix = value.substring(4);
      const digitsOnly = withoutPrefix.replace(/\D/g, '');
      
      // Format as GHA-XXXXXXXXX-X (9 digits, hyphen, 1 digit)
      let formatted = 'GHA-';
      if (digitsOnly.length > 0) {
        formatted += digitsOnly.substring(0, 9);
        if (digitsOnly.length > 9) {
          formatted += '-' + digitsOnly.substring(9, 10);
        }
      }
      
      setFormData(prev => ({ ...prev, [name]: formatted }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.showError('Image must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.showError('Only image files are allowed');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const validateForm = (): string | null => {
    if (!formData.email.trim()) return 'Email is required';
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'Invalid email format';
    if (!formData.full_name.trim()) return 'Full name is required';
    if (!formData.phone_number.trim()) return 'Phone number is required';
    if (!/^\d{10}$/.test(formData.phone_number)) return 'Phone number must be exactly 10 digits';
    if (!formData.ghana_card_number.trim()) return 'Ghana Card number is required';
    // Validate Ghana Card format: GHA-XXXXXXXXX-X
    const ghCardRegex = /^GHA-\d{9}-\d$/;
    if (!ghCardRegex.test(formData.ghana_card_number)) return 'Ghana Card number must be in format GHA-123456789-0';
    if (!formData.address.trim()) return 'Address is required';
    if (!formData.city.trim()) return 'City is required';
    if (!formData.country.trim()) return 'Country is required';
    // Department is optional, no validation needed
    if (!sendInvite) {
      if (!formData.password.trim()) return 'Password is required';
      if (formData.password.length < 8) return 'Password must be at least 8 characters';
      if (formData.password !== confirmPassword) return 'Passwords do not match';
    }
    return null;
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();
      
      return !!data; // Returns true if email exists
    } catch (error) {
      console.error('Error checking email:', error);
      return false; // On error, allow submission and let server handle it
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast.showError(validationError);
      return;
    }

    // Check if email already exists
    const emailExists = await checkEmailExists(formData.email);
    if (emailExists) {
      toast.showError('An account with this email already exists. Please use a different email address.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload avatar if provided
      let avatarUrl = '';
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${currentUser?.id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('admin-avatars')
          .upload(filePath, avatarFile, {
            contentType: avatarFile.type,
            upsert: false,
          });

        if (uploadError) {
          console.warn('Avatar upload failed:', uploadError);
          toast.showError('Failed to upload avatar, but continuing with user creation');
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('admin-avatars')
            .getPublicUrl(uploadData.path);
          avatarUrl = publicUrl;
        }
      }

      // Call server-side API to create admin user
      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.full_name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          phoneNumber: formData.phone_number,
          ghanaCardNumber: formData.ghana_card_number,
          image: avatarUrl,
          gender: formData.gender,
          address: formData.address,
          city: formData.city,
          country: formData.country,
          department: formData.department,
          status: formData.status,
          needsPasswordSetup: sendInvite,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create admin user');
      }

      const newUserId = result.user.id;

      // Audit logging is now handled by the API route
      // The log_admin_activity RPC is called server-side

      const roleLabel = {
        'super_admin': 'Super Admin',
        'admin': 'Admin',
        'support_agent': 'Support Agent'
      }[formData.role] || formData.role;

      toast.showSuccess(`${roleLabel} created successfully`);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating admin role:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message || 'Failed to create admin role';
      
      if (errorMessage.includes('already been registered')) {
        errorMessage = 'This email address is already registered. Please use a different email or contact support to manage the existing account.';
      }
      
      toast.showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in duration-200"
      >
        <div className="border-b border-gray-200 dark:border-neutral-800 p-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create Admin User</h3>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 max-h-[calc(90vh-8rem)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div>
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              className="w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="John Doe"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="admin@example.com"
              required
            />
          </div>

          {/* Phone Number */}
          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleInputChange}
              className="w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="0241234567"
              maxLength={10}
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enter 10-digit phone number
            </p>
          </div>

          {/* Ghana Card Number */}
          <div>
            <label htmlFor="ghana_card_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ghana Card Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="ghana_card_number"
              name="ghana_card_number"
              value={formData.ghana_card_number}
              onChange={handleInputChange}
              className="w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 font-mono"
              placeholder="GHA-123456789-0"
              maxLength={15}
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Format: GHA-XXXXXXXXX-X
            </p>
          </div>

          {/* Gender */}
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className="w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 cursor-pointer"
              required
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>

          {/* Profile Picture */}
          <div>
            <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Profile Picture
            </label>
            <div className="flex items-center gap-3">
              {avatarPreview && (
                <div className="flex-shrink-0">
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-300 dark:border-neutral-700"
                  />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  id="avatar"
                  name="avatar"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-neutral-800 rounded-lg cursor-pointer bg-white dark:bg-neutral-900 file:mr-4 file:py-2 file:px-4 file:rounded-l-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 dark:file:bg-neutral-800 file:text-gray-700 dark:file:text-gray-300 hover:file:bg-gray-200 dark:hover:file:bg-neutral-700 file:cursor-pointer"
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Optional. Max 5MB (JPG, PNG, GIF)
            </p>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="123 Main Street, Apt 4B"
              required
            />
          </div>

          {/* Department */}
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Department
            </label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className="w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="e.g., Operations, Customer Support"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Optional field
            </p>
          </div>

          {/* City */}
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              className="w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Accra"
              required
            />
          </div>

          {/* Country */}
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Country <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              className="w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Ghana"
              required
            />
          </div>

    {/* Role */}
    <div>
      <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Role <span className="text-red-500">*</span>
      </label>
      <select
        id="role"
        name="role"
        value={formData.role}
        onChange={handleInputChange}
        className="w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 cursor-pointer"
        required
      >
        {(isSuperAdmin || currentUser?.email) && (
          <option value="support_agent">Support Agent</option>
        )}
        {(isSuperAdmin || currentUser?.email) && (
          <option value="admin">Admin</option>
        )}
        {isSuperAdmin && <option value="super_admin">Super Admin</option>}
      </select>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {isSuperAdmin
          ? 'Select the admin role. Super Admins have full system access.'
          : 'Regular Admins can create Support Agents and other Admins.'}
      </p>
    </div>

    {/* Status */}
    <div>
      <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Status <span className="text-red-500">*</span>
      </label>
      <select
        id="status"
        name="status"
        value={formData.status}
        onChange={handleInputChange}
        disabled={sendInvite}
        className={`w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 cursor-pointer ${sendInvite ? 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 cursor-not-allowed' : ''}`}
        required
      >
        <option value="active">Active</option>
        <option value="pending">Pending</option>
        <option value="suspended">Suspended</option>
      </select>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {sendInvite ? 'Status locked to Pending for invitation.' : 'Set account status. Active users can log in immediately.'}
      </p>
    </div>

    {/* Invitation Toggle - Spans full width */}
    <div className="md:col-span-2">
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
               The administrator will receive an email to set their own password. Account status will be set to Pending.
            </span>
          </label>
      </div>
    </div>

    {/* Password Fields */}
    {!sendInvite && (
      <>
        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 pr-10 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Min. 8 characters"
              required={!sendInvite}
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Confirm Password <span className="text-red-500">*</span>
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-300 dark:border-neutral-800 rounded-lg p-2 text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            placeholder="Re-enter password"
            required={!sendInvite}
            minLength={8}
          />
        </div>
      </>
    )}
  </div>          {/* Warning for Super Admin - Full width below grid */}
          {formData.role === 'super_admin' && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mt-6">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-300">
                <p className="font-medium">Super Admin Access</p>
                <p className="text-xs mt-1">
                  This user will have full system access including the ability to create other Super Admins.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 disabled:opacity-50 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-black dark:bg-white hover:bg-black/90 dark:hover:bg-white/90 disabled:opacity-50 text-white dark:text-black rounded-lg font-medium transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white dark:border-black border-t-transparent inline-block mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Admin'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// View Admin Modal Component
interface ViewAdminModalProps {
  admin: AdminUser;
  onClose: () => void;
}

function ViewAdminModal({ admin, onClose }: ViewAdminModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div ref={modalRef} className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-neutral-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Admin Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Avatar & Name */}
          <div className="flex items-center gap-4">
            {admin.avatar_url ? (
              <img 
                src={admin.avatar_url} 
                alt={admin.full_name || admin.email}
                className="h-20 w-20 rounded-full object-cover border-2 border-primary/20"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                {admin.full_name ? admin.full_name.charAt(0).toUpperCase() : admin.email.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {admin.full_name || 'Not set'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{admin.email}</p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone Number</label>
              <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                {admin.phone_number || 'Not provided'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
              <p className="mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                  admin.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {admin.status === 'active' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {admin.status}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Roles</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {admin.roles.map((role) => (
                  <span
                    key={role}
                    className={`px-2 py-1 rounded-md text-xs font-medium ${
                      role === 'super_admin'
                        ? 'bg-purple-100 text-purple-800'
                        : role === 'support_agent'
                        ? 'bg-cyan-100 text-cyan-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {role === 'super_admin' ? 'Super Admin' : 
                     role === 'support_agent' ? 'Support Agent' : 
                     'Admin'}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</label>
              <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                {new Date(admin.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Admin Modal Component
interface EditAdminModalProps {
  admin: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
  isSuperAdmin: boolean;
}

function EditAdminModal({ admin, onClose, onSuccess, isSuperAdmin }: EditAdminModalProps) {
  const toast = useToast();
  const [formData, setFormData] = useState({
    full_name: admin.full_name || '',
    phone_number: admin.phone_number || '',
    email: admin.email,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/admins/${admin.id}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update admin');
      }

      toast.showSuccess('Admin updated successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error updating admin:', error);
      toast.showError(error.message || 'Failed to update admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div ref={modalRef} className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-neutral-800">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Admin</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                placeholder="0200000000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-800 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 disabled:opacity-50 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-black dark:bg-white hover:bg-black/90 dark:hover:bg-white/90 disabled:opacity-50 text-white dark:text-black rounded-lg font-medium transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Updating...' : 'Update Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Suspend/Reinstate Admin Modal Component
interface SuspendAdminModalProps {
  admin: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
}

function SuspendAdminModal({ admin, onClose, onSuccess }: SuspendAdminModalProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const isSuspending = admin.status === 'active';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/admins/${admin.id}/suspend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspend: isSuspending }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || `Failed to ${isSuspending ? 'suspend' : 'reinstate'} admin`);
      }

      toast.showSuccess(`Admin ${isSuspending ? 'suspended' : 'reinstated'} successfully`);
      onSuccess();
    } catch (error: any) {
      console.error(`Error ${isSuspending ? 'suspending' : 'reinstating'} admin:`, error);
      toast.showError(error.message || `Failed to ${isSuspending ? 'suspend' : 'reinstate'} admin`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div ref={modalRef} className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isSuspending 
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        }`}>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {isSuspending ? 'Suspend Admin' : 'Reinstate Admin'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-black/20 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            {isSuspending ? (
              <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
            ) : (
              <RefreshCcw className="h-6 w-6 text-green-600 flex-shrink-0" />
            )}
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {isSuspending ? (
                  <>
                    Are you sure you want to suspend <strong>{admin.full_name || admin.email}</strong>?
                    <br /><br />
                    This will immediately revoke their admin access and prevent them from logging in.
                  </>
                ) : (
                  <>
                    Are you sure you want to reinstate <strong>{admin.full_name || admin.email}</strong>?
                    <br /><br />
                    This will restore their admin access and allow them to log in again.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-800 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 disabled:opacity-50 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`flex-1 px-4 py-2 disabled:opacity-50 text-white rounded-lg font-medium transition-colors cursor-pointer ${
              isSuspending
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isSubmitting ? 'Processing...' : isSuspending ? 'Suspend' : 'Reinstate'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Delete Admin Modal Component
interface DeleteAdminModalProps {
  admin: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
}

function DeleteAdminModal({ admin, onClose, onSuccess }: DeleteAdminModalProps) {
  const toast = useToast();
  const [confirmText, setConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const expectedText = 'DELETE';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSubmit = async () => {
    if (confirmText !== expectedText) {
      toast.showError('Please type DELETE to confirm');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/admins/${admin.id}/delete`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete admin');
      }

      toast.showSuccess('Admin deleted successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error deleting admin:', error);
      toast.showError(error.message || 'Failed to delete admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div ref={modalRef} className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Delete Admin</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-black/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Are you sure you want to permanently delete <strong>{admin.full_name || admin.email}</strong>?
                <br /><br />
                This action <strong>cannot be undone</strong>. All of their data and access will be permanently removed.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type <strong>DELETE</strong> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-800 flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 disabled:opacity-50 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || confirmText !== expectedText}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            {isSubmitting ? 'Deleting...' : 'Delete Admin'}
          </button>
        </div>
      </div>
    </div>
  );
}
