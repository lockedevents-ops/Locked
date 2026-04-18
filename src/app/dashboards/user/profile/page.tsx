"use client";

import { useState, useEffect, useRef } from "react";
import { 
  User as UserIcon, 
  Bell, 
  ShieldCheck, 
  CreditCard,  
  Clock,
  XCircle,
  Camera,
  ChevronRight, 
  Check, 
  Pencil, 
  Plus, 
  Building, 
  Calendar,
  Download,
  Trash2,
  X,
  Upload,
  CheckCircle,
  AlertTriangle,
  ChevronsUp,
  ChevronsDown,
  Smartphone
} from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from "next/image";
import { useToast } from '@/hooks/useToast';
/**
 * @deprecated authService and authStore moved to /legacy/
 * Refactoring to use Supabase and AuthContext instead
 * TODO: Replace with Supabase functions and useAuth() hook
 */
import { updateUserProfile, saveRoleRequest, getUserRoleRequests } from '@/legacy/auth/authService';
import { useAuthStore } from '@/legacy/stores/authStore';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotificationStore } from '@/store/notificationStore';
import { v4 as uuidv4 } from 'uuid';
import { useSessionManagementWithInteraction } from '@/hooks/useSessionManagement';
import { isVenuesEnabled } from '@/lib/network';

// Form Schema
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
});

// Password Change Schema
const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;
type TabId = 'profile' | 'security' | 'preferences' | 'payment' | 'roles';

// All event categories (expanded list)
const ALL_CATEGORIES = [
  "Music", "Arts & Culture", "Theatre", "Dance", "Film", "Traditional",
  "Business", "Corporate", "Networking", "Career", 
  "Food & Drink", "Fashion", "Beauty", "Health & Wellness", 
  "Sports & Fitness", "Gaming", "Outdoor", "Adventure", 
  "Technology", "Education", "Academic", "Workshop", 
  "Community", "Charity", "Religious", "Political", 
  "Entertainment", "Family & Kids", "Holiday", "Photography",
  "Science", "Literature", "History", "Comedy",
  "Markets", "Festivals", "Exhibitions", "Conferences"
];

export default function ProfilePage() {
  // ✅ SESSION MANAGEMENT: Prevent session expiration during profile editing (with form interaction tracking)
  useSessionManagementWithInteraction();

  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | undefined>(user?.image);
  const fileInputRef = useState<HTMLInputElement | null>(null);
  const idImageRef = useRef<HTMLInputElement>(null);
  const selfieWithIdRef = useRef<HTMLInputElement>(null);
  const logout = useAuthStore(state => state.logout);
  const venuesEnabled = isVenuesEnabled();

  // Modal states
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showDownloadDataModal, setShowDownloadDataModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRoleRequestModal, setShowRoleRequestModal] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState<string | null>(null);
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [showMoreCategories, setShowMoreCategories] = useState(false);

  // Selected categories state
  const [selectedCategories, setSelectedCategories] = useState([
    "Music", "Technology", "Food & Drink", "Arts & Culture", "Business", "Sports"
  ]);

  // 2FA States
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFAQRCode, setTwoFAQRCode] = useState("/qr-code-placeholder.png");
  const [twoFAStep, setTwoFAStep] = useState<'setup' | 'verify'>('setup');

  // Payment method states
  const [paymentType, setPaymentType] = useState<'card' | 'momo'>('card');
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");
  const [cardName, setCardName] = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [momoProvider, setMomoProvider] = useState("mtn");
  
  // Role request form state
  const [roleRequestData, setRoleRequestData] = useState({
    companyName: '',
    businessEmail: '',
    businessPhone: '',
    idType: '',
    idNumber: '',
    idImage: null as File | null,
    selfieWithId: null as File | null,
    reason: ''
  });
  
  // Displayed categories based on show more toggle
  const displayedCategories = showMoreCategories 
    ? ALL_CATEGORIES 
    : ALL_CATEGORIES.slice(0, 6);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      bio: user?.bio || '',
      location: user?.location || '',
      website: user?.website || '',
      phoneNumber: (user as any)?.phoneNumber || '',
    },
  });

  // Password change form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        bio: user.bio || '',
        location: user.location || '',
        website: user.website || '',
        phoneNumber: (user as any)?.phoneNumber || '',
      });
      setImagePreview(user.image);
    }
  }, [user, reset]);

  // Fetch user role requests
  const [userRoleRequests, setUserRoleRequests] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      const requests = getUserRoleRequests(user.id);
      setUserRoleRequests(requests);
    }
  }, [user?.id]);

  // Handle profile update submission
  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    try {
      if (user?.id) {
        await updateUserProfile(user.id, data);
        toast.showSuccess('Profile Updated', 'Profile updated successfully');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.showError('Update Failed', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Handle password change submission
  const handlePasswordChange = async (data: PasswordFormData) => {
    setPasswordChangeLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.showSuccess('Password Updated', 'Password updated successfully');
      passwordForm.reset();
    } catch (error) {
      toast.showError('Update Failed', 'Failed to update password');
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  // Handle profile photo change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement> | Event) => {
    const target = e.target as HTMLInputElement;
    const file = target?.files?.[0];
    if (!file) return;

    setPhotoLoading(true);
    
    try {
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setImageFile(file);
      
      // In a real app, you would upload the file to a server here
      // For now, we'll simulate a successful upload
      setTimeout(() => {
        if (user?.id) {
          // Update user profile with new image URL
            updateUserProfile(user.id, { 
              image: URL.createObjectURL(file) // In real app, this would be a server URL
            });
          toast.showSuccess('Photo Updated', 'Profile photo updated');
        }
        setPhotoLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Failed to update profile photo:', error);
      toast.showError('Update Failed', 'Failed to update profile photo');
      setPhotoLoading(false);
    }
  };

  // Handle file input click
  const triggerFileInput = () => {
    if (fileInputRef) {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = (e) => handleFileChange(e);
      input.click();
      input.click();
    }
  };

  // Toggle category selection
  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  // Handle account data download
  const handleDownloadData = () => {
    // Get user data from localStorage
    const userData = localStorage.getItem('locked_users');
    if (userData && user?.id) {
      const users = JSON.parse(userData);
      const currentUser = users[user.id];
      
      if (currentUser) {
        // Remove sensitive data
        const { passwordHash, ...safeUserData } = currentUser;
        
        // Create downloadable JSON
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(safeUserData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "locked_user_data.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        setShowDownloadDataModal(false);
        toast.showSuccess('Data Downloaded', 'Your data has been downloaded');
      }
    }
  };

  // Handle account deletion
  const handleDeleteAccount = () => {
    if (user?.id) {
      // Get users from localStorage
      const usersData = localStorage.getItem('locked_users');
      if (usersData) {
        const users = JSON.parse(usersData);
        // Delete the current user
        delete users[user.id];
        // Save back to localStorage
        localStorage.setItem('locked_users', JSON.stringify(users));
        
        // Log the user out
        logout();
        toast.showSuccess('Account Deleted', 'Your account has been deleted');
        // Redirect to homepage
        router.push('/');
      }
    }
  };

  // Handle 2FA setup
  const handle2FASetup = () => {
    setTwoFAStep('setup');
    setTwoFACode("");
    // In a real app, we'd generate a QR code here
    setShow2FAModal(true);
  };

  // Verify 2FA code
  const verify2FACode = () => {
    // In a real app, we'd verify the code against an algorithm
    // For demo, we'll accept any 6-digit code
    if (twoFACode.length === 6 && /^\d+$/.test(twoFACode)) {
      setTwoFAEnabled(true);
      setShow2FAModal(false);
      toast.showSuccess('2FA Enabled', 'Two-factor authentication enabled successfully');
    } else {
      toast.showError('Invalid Code', 'Please enter a valid 6-digit code');
    }
  };

  // Handle payment method addition
  const handleAddPaymentMethod = () => {
    if (paymentType === 'card') {
      if (!cardNumber || !cardExpiry || !cardCVV || !cardName) {
        toast.showError('Missing Details', 'Please fill in all card details');
        return;
      }
      // Simulate payment processing
      toast.showSuccess('Card Added', 'Credit card added successfully');
    } else {
      if (!momoNumber || !momoProvider) {
        toast.showError('Missing Details', 'Please fill in all Mobile Money details');
        return;
      }
      // Simulate payment processing
      toast.showSuccess('Mobile Money Added', 'Mobile Money account added successfully');
    }
    setShowPaymentModal(false);
  };

  // Handle role request
  const handleRoleRequest = (role: string) => {
    // Simulate role request
    toast.showSuccess('Request Submitted', `Your request to become a ${role} has been submitted`);
    setShowRoleRequestModal(null);
  };

  // Handle social account connection
  const handleConnectSocial = (provider: string) => {
    // Simulate social connection
    toast.showSuccess('Connected', `Connected to ${provider}`);
    setShowConnectModal(null);
  };

  // Handle role request submission
  const handleRoleRequestSubmit = () => {
    if (!user) {
      toast.showError('Login Required', 'You must be logged in to request a role');
      return;
    }
    
    if (!isRoleRequestFormValid()) {
      toast.showError('Missing Information', 'Please fill out all required fields');
      return;
    }
    
    try {
      // Create a new role request object
      const newRequest = {
        id: uuidv4(),
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
  requestType: showRoleRequestModal as 'organizer' | 'venue_owner',
        companyName: roleRequestData.companyName,
        businessEmail: roleRequestData.businessEmail,
        businessPhone: roleRequestData.businessPhone,
        status: 'pending' as const,
        submittedAt: new Date().toISOString(),
        idType: roleRequestData.idType,
        idNumber: roleRequestData.idNumber,
        idImage: roleRequestData.idImage ? URL.createObjectURL(roleRequestData.idImage) : undefined,
        selfieWithId: roleRequestData.selfieWithId ? URL.createObjectURL(roleRequestData.selfieWithId) : undefined,
        reason: roleRequestData.reason
      };
      
      // Save the request to localStorage
      saveRoleRequest(newRequest);
      
      // Add a notification about the role request
      const notificationStore = useNotificationStore.getState();
      notificationStore.addNotification({
        type: 'role_request',
        title: `${newRequest.requestType === 'organizer' ? 'Organizer' : 'Venue Owner'} Role Request Submitted`,
        message: `Your request has been submitted and is pending review. We'll notify you when there's an update.`,
        link: '/dashboards/notifications',
        metadata: {
          requestId: newRequest.id,
          requestType: newRequest.requestType
        }
      });
      
      // Close the modal and show success message
      setShowRoleRequestModal(null);
      toast.showSuccess('Request Submitted', `Your ${newRequest.requestType} role request has been submitted for review`);
      
      // Reset the form data
      setRoleRequestData({
        companyName: '',
        businessEmail: '',
        businessPhone: '',
        idType: '',
        idNumber: '',
        idImage: null,
        selfieWithId: null,
        reason: ''
      });
      
    } catch (error) {
      console.error('Error submitting role request:', error);
      toast.showError('Submission Failed', 'Failed to submit role request. Please try again.');
    }
  };

  // Validate role request form
  const isRoleRequestFormValid = () => {
    return (
      roleRequestData.companyName.trim() !== '' &&
      roleRequestData.businessEmail.trim() !== '' &&
      roleRequestData.businessPhone.trim() !== '' &&
      roleRequestData.idType.trim() !== '' &&
      roleRequestData.idNumber.trim() !== '' &&
      roleRequestData.idImage !== null &&
      roleRequestData.selfieWithId !== null &&
      roleRequestData.reason.trim() !== ''
    );
  };

  // Status badge component
  function StatusBadge({ status }: { status: string }) {
    let bgColor, textColor, icon;
    
    switch (status) {
      case 'pending':
        bgColor = 'bg-amber-100';
        textColor = 'text-amber-800';
        icon = <Clock size={14} className="mr-1" />;
        break;
      case 'approved':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        icon = <CheckCircle size={14} className="mr-1" />;
        break;
      case 'rejected':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        icon = <XCircle size={14} className="mr-1" />;
        break;
      default:
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        icon = null;
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-5 mb-6">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Profile Image */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-neutral-100 flex items-center justify-center overflow-hidden">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt={user?.name || 'User'}
                  width={96}
                  height={96}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserIcon className="w-12 h-12 text-neutral-300" />
              )}
              
              {photoLoading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            
            <button 
              onClick={triggerFileInput}
              className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full hover:bg-primary-dark transition-colors shadow-sm"
              disabled={photoLoading}
            >
              <Camera className="w-4 h-4" />
            </button>
            
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileChange}
              ref={(ref) => fileInputRef[1](ref)} 
            />
          </div>
          
          {/* User Info */}
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-xl font-bold">{user?.name || 'User'}</h1>
            <p className="text-neutral-500">{user?.email}</p>
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                {user ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}` : 'User'} Account
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex overflow-x-auto hide-scrollbar mb-6 bg-white rounded-xl shadow-sm border border-neutral-100">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 min-w-0 p-3 text-center border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <span className="inline-flex flex-col items-center gap-1">
            <UserIcon className="w-5 h-5" />
            <span className="text-xs sm:text-sm">Profile</span>
          </span>
        </button>
        
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 min-w-0 p-3 text-center border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <span className="inline-flex flex-col items-center gap-1">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs sm:text-sm">Security</span>
          </span>
        </button>
        
        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex-1 min-w-0 p-3 text-center border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'preferences'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <span className="inline-flex flex-col items-center gap-1">
            <Bell className="w-5 h-5" />
            <span className="text-xs sm:text-sm">Preferences</span>
          </span>
        </button>
        
        <button
          onClick={() => setActiveTab('payment')}
          className={`flex-1 min-w-0 p-3 text-center border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'payment'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <span className="inline-flex flex-col items-center gap-1">
            <CreditCard className="w-5 h-5" />
            <span className="text-xs sm:text-sm">Payment</span>
          </span>
        </button>
        
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex-1 min-w-0 p-3 text-center border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'roles'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <span className="inline-flex flex-col items-center gap-1">
            <Building className="w-5 h-5" />
            <span className="text-xs sm:text-sm">Roles</span>
          </span>
        </button>
      </div>
      
      {/* Active Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-100">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="p-5">
            <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 md:max-w-4xl mx-auto">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    {...register("name")}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary"
                    placeholder="Your full name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Phone Number <span className="text-neutral-400">(Optional)</span>
                  </label>
                  <input
                    type="tel"
                    {...register("phoneNumber")}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary"
                    placeholder="Your phone number"
                  />
                </div>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Location <span className="text-neutral-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    {...register("location")}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary"
                    placeholder="City, Country"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Website <span className="text-neutral-400">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    {...register("website")}
                    className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary"
                    placeholder="https://yourwebsite.com"
                  />
                  {errors.website && (
                    <p className="mt-1 text-sm text-red-600">{errors.website.message}</p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Bio <span className="text-neutral-400">(Optional)</span>
                </label>
                <textarea
                  {...register("bio")}
                  rows={4}
                  className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary"
                  placeholder="Tell us about yourself"
                ></textarea>
                {errors.bio && (
                  <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
                )}
              </div>
              
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto bg-primary text-white py-2.5 px-5 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="p-5">
            <h2 className="text-lg font-semibold mb-4">Security & Login</h2>
            
            <div className="space-y-5 md:max-w-4xl mx-auto">
              {/* Password Change Section */}
              <div className="border border-neutral-100 rounded-lg p-6">
                <h3 className="font-medium text-lg mb-1">Change Password</h3>
                <p className="text-sm text-neutral-500 mb-4">Update your password to keep your account secure</p>
                
                <form className="space-y-4" onSubmit={passwordForm.handleSubmit(handlePasswordChange)}>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary"
                        placeholder="••••••••"
                        {...passwordForm.register("currentPassword")}
                      />
                      {passwordForm.formState.errors.currentPassword && (
                        <p className="mt-1 text-sm text-red-600">
                          {passwordForm.formState.errors.currentPassword.message}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary"
                        placeholder="••••••••"
                        {...passwordForm.register("newPassword")}
                      />
                      {passwordForm.formState.errors.newPassword && (
                        <p className="mt-1 text-sm text-red-600">
                          {passwordForm.formState.errors.newPassword.message}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary"
                        placeholder="••••••••"
                        {...passwordForm.register("confirmPassword")}
                      />
                      {passwordForm.formState.errors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-600">
                          {passwordForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700 mb-2">
                    <p>
                      <strong>Password requirements:</strong> At least 8 characters, one uppercase letter, and one number.
                    </p>
                  </div>
                  
                  <button
                    type="submit"
                    className="bg-primary text-white py-2.5 px-5 rounded-lg font-medium hover:bg-primary-dark transition-colors"
                    disabled={passwordChangeLoading}
                  >
                    {passwordChangeLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Updating...
                      </span>
                    ) : "Update Password"}
                  </button>
                </form>
              </div>
              
              {/* Two-Factor Authentication */}
              <div className="border border-neutral-100 rounded-lg p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-lg">Two-Factor Authentication</h3>
                    <p className="text-sm text-neutral-500">Add an extra layer of security to your account</p>
                  </div>
                  {twoFAEnabled ? (
                    <div className="flex items-center gap-2">
                      <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Enabled
                      </span>
                      <button
                        onClick={() => setTwoFAEnabled(false)}
                        className="bg-red-50 text-red-600 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-red-100 transition-colors"
                      >
                        Disable
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handle2FASetup}
                      className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-medium hover:bg-primary/20 transition-colors"
                    >
                      Enable
                    </button>
                  )}
                </div>
                
                {twoFAEnabled && (
                  <div className="mt-4 bg-green-50 p-4 rounded-lg text-sm text-green-800">
                    <p>
                      <Check className="inline-block w-4 h-4 mr-1" />
                      Two-factor authentication is currently enabled. You'll be asked for a verification code when signing in from unrecognized devices.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Connected Accounts Section */}
              <div className="border border-neutral-100 rounded-lg p-6">
                <h3 className="font-medium text-lg mb-4">Connected Accounts</h3>
                <p className="text-sm text-neutral-500 mb-4">Connect your accounts for easier login</p>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-neutral-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#4285F4] rounded-full flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFFFFF">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium">Google</h4>
                        <p className="text-xs text-neutral-500">Not connected</p>
                      </div>
                    </div>
                    <button 
                      className="text-sm bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-700 px-3 py-1.5 rounded-lg"
                      onClick={() => setShowConnectModal('google')}
                    >
                      Connect
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center py-3 border-b border-neutral-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#1877F2] rounded-full flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFFFFF">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium">Facebook</h4>
                        <p className="text-xs text-neutral-500">Not connected</p>
                      </div>
                    </div>
                    <button 
                      className="text-sm bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-700 px-3 py-1.5 rounded-lg"
                      onClick={() => setShowConnectModal('facebook')}
                    >
                      Connect
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 384 512" fill="#FFFFFF">
                          <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-medium">Apple</h4>
                        <p className="text-xs text-neutral-500">Not connected</p>
                      </div>
                    </div>
                    <button 
                      className="text-sm bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-700 px-3 py-1.5 rounded-lg"
                      onClick={() => setShowConnectModal('apple')}
                    >
                      Connect
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Account Actions */}
              <div className="border border-neutral-100 rounded-lg p-6">
                <h3 className="font-medium text-lg mb-1">Account Actions</h3>
                <p className="text-sm text-neutral-500 mb-4">Manage your account data and settings</p>
                
                <div className="space-y-3">
                  <button 
                    className="flex justify-between w-full p-3 text-left border border-neutral-100 rounded-lg hover:bg-neutral-50 transition-colors"
                    onClick={() => setShowDownloadDataModal(true)}
                  >
                    <div className="flex items-center gap-2">
                      <Download className="w-5 h-5 text-primary" />
                      <span className="font-medium">Download Your Data</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-neutral-400" />
                  </button>
                  
                  <button 
                    className="flex justify-between w-full p-3 text-left border border-neutral-100 rounded-lg hover:bg-neutral-50 transition-colors text-red-600"
                    onClick={() => setShowDeleteAccountModal(true)}
                  >
                    <div className="flex items-center gap-2">
                      <Trash2 className="w-5 h-5" />
                      <span className="font-medium">Delete Account</span>
                    </div>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="p-5">
            <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
            
            <div className="space-y-5 md:max-w-4xl mx-auto">
              {/* Email Notifications */}
              <div>
                <h3 className="font-medium mb-3">Email Notifications</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border border-neutral-100 rounded-lg hover:bg-neutral-50 transition-colors">
                    <div>
                      <p className="font-medium">Event Reminders</p>
                      <p className="text-sm text-neutral-500">Receive reminders about upcoming events</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-neutral-100 rounded-lg hover:bg-neutral-50 transition-colors">
                    <div>
                      <p className="font-medium">Price Alerts</p>
                      <p className="text-sm text-neutral-500">Get notified about price drops and special offers</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-neutral-100 rounded-lg hover:bg-neutral-50 transition-colors">
                    <div>
                      <p className="font-medium">Account Updates</p>
                      <p className="text-sm text-neutral-500">Important information about your account</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-neutral-100 rounded-lg hover:bg-neutral-50 transition-colors">
                    <div>
                      <p className="font-medium">Marketing & Promotions</p>
                      <p className="text-sm text-neutral-500">News, updates, and promotional offers</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
              
              <hr className="border-neutral-100" />
              
              {/* Event Categories */}
              <div>
                <h3 className="font-medium mb-3">Event Preferences</h3>
                <p className="text-sm text-neutral-500 mb-4">Select categories of events you're interested in</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {displayedCategories.map(category => (
                    <label 
                      key={category}
                      className={`flex items-center gap-2 p-2 border rounded-lg hover:bg-neutral-50 cursor-pointer transition-colors ${
                        selectedCategories.includes(category) ? 'border-primary bg-primary/5' : 'border-neutral-200'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        className="rounded border-neutral-300 text-primary focus:ring-primary" 
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                      />
                      <span>{category}</span>
                    </label>
                  ))}
                </div>
                
                <button 
                  className="mt-4 text-primary hover:text-primary-dark text-sm font-medium flex items-center gap-1"
                  onClick={() => setShowMoreCategories(!showMoreCategories)}
                >
                  {showMoreCategories ? (
                    <>
                      <ChevronsUp className="w-4 h-4" />
                      Show Less Categories
                    </>
                  ) : (
                    <>
                      <ChevronsDown className="w-4 h-4" />
                      View More Categories
                    </>
                  )}
                </button>
              </div>
              
              <hr className="border-neutral-100" />
              
              {/* Privacy Settings */}
              <div>
                <h3 className="font-medium mb-3">Privacy Settings</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border border-neutral-100 rounded-lg hover:bg-neutral-50 transition-colors">
                    <div>
                      <p className="font-medium">Profile Visibility</p>
                      <p className="text-sm text-neutral-500">Control who can see your profile</p>
                    </div>
                    <select className="border border-neutral-200 rounded-lg bg-white p-2 text-sm">
                      <option value="public">Public</option>
                      <option value="friends">Friends Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-neutral-100 rounded-lg hover:bg-neutral-50 transition-colors">
                    <div>
                      <p className="font-medium">Show Events I'm Attending</p>
                      <p className="text-sm text-neutral-500">Allow others to see events you're attending</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="pt-2">
                <button className="bg-primary text-white py-2.5 px-5 rounded-lg font-medium hover:bg-primary-dark transition-colors">
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Payment Tab */}
        {activeTab === 'payment' && (
          <div className="p-5">
            <h2 className="text-lg font-semibold mb-4">Payment Methods</h2>
            
            <div className="space-y-5 md:max-w-4xl mx-auto">
              <div className="text-sm text-neutral-600 mb-2">
                Add and manage your payment methods
              </div>
              
              {/* No Payment Methods UI */}
              <div className="border border-neutral-100 rounded-lg p-6 text-center">
                <div className="mx-auto w-14 h-14 bg-neutral-100 rounded-full flex items-center justify-center mb-3">
                  <CreditCard className="w-7 h-7 text-neutral-400" />
                </div>
                <h3 className="font-medium text-lg">No Payment Methods</h3>
                <p className="text-neutral-500 text-sm mt-1 mb-4">
                  You haven't added any payment methods yet
                </p>
                <button 
                  className="bg-primary text-white py-2.5 px-5 rounded-lg font-medium hover:bg-primary-dark transition-colors"
                  onClick={() => setShowPaymentModal(true)}
                >
                  Add Payment Method
                </button>
              </div>
              
              {/* Transaction History - Will be shown when available */}
              <div className="border border-neutral-100 rounded-lg p-4 hidden">
                <h3 className="font-medium text-lg mb-3">Transaction History</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border-b border-neutral-100">
                    <div>
                      <p className="font-medium">Tech Conference 2025</p>
                      <p className="text-sm text-neutral-500">Jul 15, 2025</p>
                    </div>
                    <p className="font-medium">₵ 500.00</p>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border-b border-neutral-100">
                    <div>
                      <p className="font-medium">Ghana Food Festival</p>
                      <p className="text-sm text-neutral-500">Jun 20, 2025</p>
                    </div>
                    <p className="font-medium">₵ 250.00</p>
                  </div>
                </div>
                
                <button className="mt-3 text-primary hover:text-primary-dark text-sm font-medium">
                  View All Transactions
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Roles Tab */}
        {activeTab === 'roles' && (
          <div className="p-5">
            <h2 className="text-lg font-semibold mb-4">Account Roles</h2>
            
            <div className="space-y-5 md:max-w-4xl mx-auto">
              <div className="border border-neutral-100 rounded-lg divide-y divide-neutral-100">
                {/* User Role */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">User</h3>
                        <p className="text-xs text-neutral-500">Attend events, manage tickets, and more</p>
                      </div>
                    </div>
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  </div>
                </div>
                
                {/* Organizer Role */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-neutral-500" />
                      </div>
                      <div>
                        <h3 className="font-medium">Organizer</h3>
                        <p className="text-xs text-neutral-500">Create and manage events</p>
                      </div>
                    </div>
                    
                    {/* Add notification badge and info */}
                    <div className="flex items-center">
                      {user?.role === 'organizer' ? (
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <button
                          onClick={() => setShowRoleRequestModal('organizer')}
                          className="text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-2.5 py-1.5 rounded-md transition-colors"
                        >
                          Request Role
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Venue Owner Role */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                        <Building className="w-5 h-5 text-neutral-500" />
                      </div>
                      <div>
                        <h3 className="font-medium">Venue Owner</h3>
                        <p className="text-xs text-neutral-500">List and manage venues</p>
                      </div>
                    </div>
                    
                    {/* Add notification badge and info */}
                    <div className="flex items-center">
                      {(user?.role as string) === 'venue_owner' && venuesEnabled ? (
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      ) : !venuesEnabled ? (
                        <span className="text-xs bg-neutral-100 text-neutral-500 px-2.5 py-1.5 rounded-md transition-colors">
                          Temporarily Unavailable
                        </span>
                      ) : (
                        <button
                          onClick={() => setShowRoleRequestModal('venue_owner')}
                          className="text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 px-2.5 py-1.5 rounded-md transition-colors"
                        >
                          Request Role
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Add notification CTA */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-start">
                  <div className="bg-blue-100 p-2 rounded-full mr-3">
                    <Bell className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-blue-800 mb-1">Role Request Updates</h3>
                    <p className="text-sm text-blue-700">
                      Role request notifications are now available in the notifications center. 
                      Check your notifications for updates on pending requests.
                    </p>
                    <Link 
                      href="/dashboards/notifications?filter=role_request" 
                      className="inline-flex items-center text-blue-800 hover:text-blue-600 font-medium mt-2 text-sm"
                    >
                      View Role Request Notifications
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2FA Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                {twoFAStep === 'setup' ? 'Set Up Two-Factor Authentication' : 'Verify Your Identity'}
              </h3>
              <button 
                onClick={() => setShow2FAModal(false)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {twoFAStep === 'setup' && (
              <div>
                <p className="text-neutral-600 mb-4">
                  Two-factor authentication adds an extra layer of security to your account by requiring more than just a password to sign in.
                </p>
                
                <div className="mb-6 text-center">
                  <div className="mx-auto w-40 h-40 bg-neutral-100 rounded-lg p-2 mb-4">
                    <Image 
                      src={twoFAQRCode}
                      alt="QR Code" 
                      width={150} 
                      height={150}
                      className="mx-auto"
                    />
                  </div>
                  <p className="text-sm text-neutral-500">
                    Scan this QR code with your authenticator app. If you can't scan the QR code, you can use this code instead:
                  </p>
                  <div className="mt-2 bg-neutral-100 p-2 rounded-md font-mono text-sm">
                    BXEF KLPO 78J1 Y35M
                  </div>
                </div>
                
                <div className="space-y-4">
                  <button
                    onClick={() => setTwoFAStep('verify')}
                    className="w-full bg-primary text-white py-2.5 px-5 rounded-lg font-medium hover:bg-primary-dark transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            
            {twoFAStep === 'verify' && (
              <div>
                <p className="text-neutral-600 mb-4">
                  Enter the verification code from your authenticator app to complete the setup.
                </p>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary text-center font-mono text-lg tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value)}
                  />
                </div>
                
                <div className="space-y-4">
                  <button
                    onClick={verify2FACode}
                    className="w-full bg-primary text-white py-2.5 px-5 rounded-lg font-medium hover:bg-primary-dark transition-colors"
                  >
                    Verify & Enable 2FA
                  </button>
                  <button
                    onClick={() => setTwoFAStep('setup')}
                    className="w-full bg-white border border-neutral-300 text-neutral-700 py-2.5 px-5 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
            {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-red-600">Delete Account</h3>
              <button 
                onClick={() => setShowDeleteAccountModal(false)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-red-100 p-2">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <span className="font-medium text-red-600">This action cannot be undone</span>
              </div>
              <p className="text-neutral-600 mb-4">
                Deleting your account will permanently remove all your data from our platform, including:
              </p>
              <ul className="list-disc pl-5 mb-4 text-neutral-600 space-y-1">
                <li>Your personal information and profile details</li>
                <li>Tickets you've purchased or registered for events</li>
                <li>Events you've created or organized</li>
                <li>Your saved events and preferences</li>
              </ul>
              
              <div className="bg-red-50 p-4 rounded-lg text-red-600 mb-4">
                <p className="text-sm font-medium">To confirm, type "DELETE" below:</p>
                <input 
                  type="text" 
                  className="mt-2 w-full p-2 border border-red-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                  placeholder="Type DELETE to confirm" 
                />
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteAccountModal(false)}
                className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Download Data Modal */}
      {showDownloadDataModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Download Your Data</h3>
              <button 
                onClick={() => setShowDownloadDataModal(false)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-neutral-600 mb-6">
              You're about to download all your personal data from Locked. The file will be in JSON format and may contain sensitive information.
            </p>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-5 h-5 text-blue-500" />
                <span className="font-medium text-blue-700">Your data includes:</span>
              </div>
              <ul className="list-disc pl-5 text-blue-600 text-sm space-y-1">
                <li>Account information and profile details</li>
                <li>Event history and ticket purchases</li>
                <li>Events you've organized (if applicable)</li>
                <li>Saved events and preferences</li>
              </ul>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDownloadDataModal(false)}
                className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDownloadData}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                Download Data
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Payment Method Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Add Payment Method</h3>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-6">
              {/* Payment Method Tabs */}
              <div className="flex mb-6 bg-neutral-100 rounded-lg p-1">
                <button
                  onClick={() => setPaymentType('card')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium ${
                    paymentType === 'card' 
                      ? 'bg-white text-primary shadow-sm' 
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  <CreditCard className="w-4 h-4 inline mr-2" />
                  Credit Card
                </button>
                <button
                  onClick={() => setPaymentType('momo')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium ${
                    paymentType === 'momo' 
                      ? 'bg-white text-primary shadow-sm' 
                      : 'text-neutral-500 hover:text-neutral-700'
                  }`}
                >
                  <Smartphone className="w-4 h-4 inline mr-2" />
                  Mobile Money
                </button>
              </div>
              
              {/* Card Payment Form */}
              {paymentType === 'card' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        CVV
                      </label>
                      <input
                        type="text"
                        className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary"
                        placeholder="123"
                        value={cardCVV}
                        onChange={(e) => setCardCVV(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Name on Card
                    </label>
                    <input
                      type="text"
                      className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary"
                      placeholder="John Doe"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                    />
                  </div>
                </div>
              )}
              
              {/* Mobile Money Form */}
              {paymentType === 'momo' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Mobile Money Provider
                    </label>
                    <select
                      className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary"
                      value={momoProvider}
                      onChange={(e) => setMomoProvider(e.target.value)}
                    >
                      <option value="mtn">MTN Mobile Money</option>
                      <option value="Telecel">Telecel Cash</option>
                      <option value="airteltigo">AirtelTigo Money</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Mobile Money Number
                    </label>
                    <input
                      type="text"
                      className="w-full p-2.5 border border-neutral-200 rounded-lg focus:ring-primary focus:border-primary"
                      placeholder="0XX XXX XXXX"
                      value={momoNumber}
                      onChange={(e) => setMomoNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPaymentMethod}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                Add Payment Method
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Role Request Modal */}
      {showRoleRequestModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full p-8 shadow-xl max-h-[90vh] overflow-y-auto hide-scrollbar">
            <h2 className="text-2xl font-bold mb-2">
              {showRoleRequestModal === 'organizer' ? 'Become an Organizer' : 'Register as a Venue Owner'}
            </h2>
            <p className="text-neutral-600 mb-6">
              {showRoleRequestModal === 'organizer'
                ? 'Register as an event organizer to create and manage events on Locked.'
                : 'Register as a venue owner to list and manage venues for events on Locked.'}
            </p>

            {/* Role Request Form */}
            <form className="space-y-6">
              {/* Company Information Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Company Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Company Name */}
                  <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-neutral-700 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      id="companyName"
                      className="w-full p-2 border border-neutral-300 rounded-md"
                      value={roleRequestData.companyName}
                      onChange={e => setRoleRequestData({...roleRequestData, companyName: e.target.value})}
                    />
                  </div>

                  {/* Business Email */}
                  <div>
                    <label htmlFor="businessEmail" className="block text-sm font-medium text-neutral-700 mb-1">
                      Business Email *
                    </label>
                    <input
                      type="email"
                      id="businessEmail"
                      className="w-full p-2 border border-neutral-300 rounded-md"
                      value={roleRequestData.businessEmail}
                      onChange={e => setRoleRequestData({...roleRequestData, businessEmail: e.target.value})}
                    />
                  </div>

                  {/* Business Phone */}
                  <div>
                    <label htmlFor="businessPhone" className="block text-sm font-medium text-neutral-700 mb-1">
                      Business Phone *
                    </label>
                    <input
                      type="tel"
                      id="businessPhone"
                      className="w-full p-2 border border-neutral-300 rounded-md"
                      value={roleRequestData.businessPhone}
                      onChange={e => setRoleRequestData({...roleRequestData, businessPhone: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Identity Verification Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Identity Verification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ID Type */}
                  <div>
                    <label htmlFor="idType" className="block text-sm font-medium text-neutral-700 mb-1">
                      ID Type *
                    </label>
                    <select
                      id="idType"
                      className="w-full p-2 border border-neutral-300 rounded-md"
                      value={roleRequestData.idType}
                      onChange={e => setRoleRequestData({...roleRequestData, idType: e.target.value})}
                    >
                      <option value="">Select an ID type</option>
                      <option value="national-id">National ID</option>
                      <option value="passport">Passport</option>
                      <option value="drivers-license">Driver's License</option>
                      <option value="voters-id">Voter's ID</option>
                    </select>
                  </div>

                  {/* ID Number */}
                  <div>
                    <label htmlFor="idNumber" className="block text-sm font-medium text-neutral-700 mb-1">
                      ID Number *
                    </label>
                    <input
                      type="text"
                      id="idNumber"
                      className="w-full p-2 border border-neutral-300 rounded-md"
                      value={roleRequestData.idNumber}
                      onChange={e => setRoleRequestData({...roleRequestData, idNumber: e.target.value})}
                    />
                  </div>
                </div>

                {/* ID Document Upload */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Upload ID Document *
                  </label>
                  <div 
                    onClick={() => idImageRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-50 transition-colors ${
                      roleRequestData.idImage ? 'border-green-300 bg-green-50' : 'border-neutral-300'
                    }`}
                  >
                    {roleRequestData.idImage ? (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-green-700 font-medium">{roleRequestData.idImage.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-neutral-400 mb-2" />
                        <p className="text-neutral-600">Click to upload a clear photo of your ID</p>
                        <p className="text-xs text-neutral-500 mt-1">PNG, JPG, or PDF up to 5MB</p>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={idImageRef}
                    className="hidden" 
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setRoleRequestData({...roleRequestData, idImage: file});
                      }
                    }}
                  />
                </div>

                {/* Selfie with ID Upload */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Upload Selfie with ID *
                  </label>
                  <div 
                    onClick={() => selfieWithIdRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-50 transition-colors ${
                      roleRequestData.selfieWithId ? 'border-green-300 bg-green-50' : 'border-neutral-300'
                    }`}
                  >
                    {roleRequestData.selfieWithId ? (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-green-700 font-medium">{roleRequestData.selfieWithId.name}</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-neutral-400 mb-2" />
                        <p className="text-neutral-600">Click to upload a selfie of you holding your ID</p>
                        <p className="text-xs text-neutral-500 mt-1">PNG or JPG up to 5MB</p>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={selfieWithIdRef}
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setRoleRequestData({...roleRequestData, selfieWithId: file});
                      }
                    }}
                  />
                </div>
              </div>

              {/* Tell Us Why Section */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Tell Us Why</h3>
                <p className="text-neutral-600 text-sm">
                  Please provide details about why you want to become a{' '}
                  {showRoleRequestModal === 'organizer' ? 'n organizer' : ' venue owner'} on Locked.
                </p>
                <textarea
                  className="w-full p-3 border border-neutral-300 rounded-md h-32"
                  placeholder={`Tell us about your experience and what you hope to accomplish as a${
                    showRoleRequestModal === 'organizer' ? 'n organizer' : ' venue owner'
                  }...`}
                  value={roleRequestData.reason}
                  onChange={e => setRoleRequestData({...roleRequestData, reason: e.target.value})}
                />
              </div>

              {/* Information Notice */}
              <div className="bg-blue-50 p-4 rounded-lg flex items-start">
                <div className="p-1.5 rounded-full bg-blue-50 mr-3 flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-sm text-blue-700">
                  <strong>Important:</strong> All role requests require identity verification. Your request will be 
                  reviewed by our team within 1-3 business days. You'll receive an email once your request has been processed.
                </p>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowRoleRequestModal(null)}
                  className="px-6 py-2.5 border border-neutral-300 rounded-lg text-neutral-700 hover:bg-neutral-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRoleRequestSubmit}
                  disabled={!isRoleRequestFormValid()}
                  className={`px-6 py-2.5 rounded-lg font-medium ${
                    !isRoleRequestFormValid()
                      ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                      : 'bg-primary text-white hover:bg-primary-dark cursor-pointer'
                  }`}
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Social Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">
                Connect with {showConnectModal === 'google' ? 'Google' : showConnectModal === 'facebook' ? 'Facebook' : 'Apple'}
              </h3>
              <button 
                onClick={() => setShowConnectModal(null)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-neutral-600 mb-6">
              Connecting your {showConnectModal} account will make signing in easier and more secure.
              You won't need to remember separate passwords for Locked.
            </p>
            
            {/* Google Connection */}
            {showConnectModal === 'google' && (
              <button
                onClick={() => handleConnectSocial('google')}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Connect with Google
              </button>
            )}
            
            {/* Facebook Connection */}
            {showConnectModal === 'facebook' && (
              <button
                onClick={() => handleConnectSocial('facebook')}
                className="w-full flex items-center justify-center gap-3 bg-[#1877F2] text-white py-3 px-4 rounded-lg hover:bg-[#1877F2]/90 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Connect with Facebook
              </button>
            )}
            
            {/* Apple Connection */}
            {showConnectModal === 'apple' && (
              <button
                onClick={() => handleConnectSocial('apple')}
                className="w-full flex items-center justify-center gap-3 bg-black text-white py-3 px-4 rounded-lg hover:bg-black/90 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 384 512" xmlns="http://www.w3.org/2000/svg">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                </svg>
                Connect with Apple
              </button>
            )}
            
            <div className="mt-6 pt-6 border-t border-neutral-200">
              <p className="text-sm text-neutral-500">
                By connecting your account, you agree to our 
                <a href="#" className="text-primary hover:underline"> Terms of Service</a> and 
                <a href="#" className="text-primary hover:underline"> Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}