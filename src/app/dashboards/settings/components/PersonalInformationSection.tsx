"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { 
  User, 
  Camera,
  Upload,
  Trash2,
  Save,
  ChevronDown,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  Heart,
  Globe,
  Shield,
  Edit3,
  Check,
  X,
  Plus,
  AlertCircle,
  Info
} from "lucide-react";
import { MobileAccordion, MobileAccordionItem, MobileSettingRow, MobileToggleSwitch, MobileButton } from './MobileAccordion';
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ImageCropModal } from "@/components/ImageCropModal";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
import { 
  Profile, 
  GHANA_REGIONS,
  EDUCATION_LEVELS,
  RELATIONSHIP_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  PROFILE_VISIBILITY_OPTIONS,
  COMMON_INDUSTRIES,
  COMMON_LANGUAGES,
  COMMON_INTERESTS
} from "@/types/profile";
import {
  validateProfileSection,
  ProfileUpdateData,
  BasicInformationData,
  AddressInformationData,
  EmergencyContactData,
  ProfessionalInformationData,
  PersonalDetailsData,
  PrivacySettingsData
} from "@/schemas/profile";

const PERSONAL_SETTINGS_STORAGE_PREFIX = 'locked:settings:personal:';
const PERSONAL_SETTINGS_REFRESH_PREFIX = 'locked:settings:personal:refresh:';
const PERSONAL_SETTINGS_AUTOSAVE_DELAY = 800;

type PersonalSettingsDraftPayload = {
  version: number;
  updatedAt: number;
  userId?: string;
  data: Partial<Profile>;
};

const buildPersonalStorageKey = (userId?: string | null) => {
  if (!userId) return null;
  return `${PERSONAL_SETTINGS_STORAGE_PREFIX}${userId}`;
};

interface RoleContext {
  isOrganizer: boolean;
  isVenueOwner: boolean;
  roles: string[];
}

interface PersonalInformationSectionProps {
  user: any;
  roleContext: RoleContext;
  isMobile?: boolean;
}

interface SectionState {
  isExpanded: boolean;
  isEditing: boolean;
  hasChanges: boolean;
  errors: Record<string, string>;
}

export function PersonalInformationSection({ user, roleContext, isMobile }: PersonalInformationSectionProps) {
  const { profile, loading, updating, updateProfileSection, uploadAvatar, deleteAvatar, getCompletionStatus } = useProfile();
  
  // Section states
  const [sections, setSections] = useState<Record<string, SectionState>>({
    basic: { isExpanded: false, isEditing: false, hasChanges: false, errors: {} },
    address: { isExpanded: false, isEditing: false, hasChanges: false, errors: {} },
    emergency: { isExpanded: false, isEditing: false, hasChanges: false, errors: {} },
    personal: { isExpanded: false, isEditing: false, hasChanges: false, errors: {} },
  });

  // Form data for each section
  const [formData, setFormData] = useState<Partial<Profile>>({}); 
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteAvatarConfirmation, setShowDeleteAvatarConfirmation] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  
  // Crop modal states
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  
  // Profile completion status - recalculates when profile changes
  const completionStatus = useMemo(() => getCompletionStatus(), [profile, getCompletionStatus]);

  const storageKey = useMemo(() => buildPersonalStorageKey(user?.id), [user?.id]);
  const refreshFlagKey = useMemo(() => (user?.id ? `${PERSONAL_SETTINGS_REFRESH_PREFIX}${user.id}` : null), [user?.id]);
  const hasRestoredFromCacheRef = useRef(false);
  const hasInitializedFormRef = useRef(false);
  const hasUnsavedChangesRef = useRef(false);
  const autosaveTimeoutRef = useRef<number | null>(null);

  const persistPersonalDraft = useCallback((values: Partial<Profile>) => {
    if (typeof window === 'undefined' || !storageKey) return;
    if (!values || Object.keys(values).length === 0) {
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.error('[Settings][Personal] Failed to remove empty draft', error);
      }
      return;
    }

    try {
      const payload: PersonalSettingsDraftPayload = {
        version: 1,
        updatedAt: Date.now(),
        userId: user?.id,
        data: values,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (error) {
      console.error('[Settings][Personal] Failed to persist draft', error);
    }
  }, [storageKey, user?.id]);

  const clearPersonalDraft = useCallback(() => {
    if (typeof window === 'undefined' || !storageKey) return;
    try {
      localStorage.removeItem(storageKey);
      if (refreshFlagKey) {
        sessionStorage.removeItem(refreshFlagKey);
      }
    } catch (error) {
      console.error('[Settings][Personal] Failed to clear cached draft', error);
    }
  }, [storageKey, refreshFlagKey]);

  const scheduleDraftSave = useCallback((values: Partial<Profile>) => {
    if (typeof window === 'undefined' || !storageKey) return;
    if (!hasUnsavedChangesRef.current) return;

    if (autosaveTimeoutRef.current) {
      window.clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = window.setTimeout(() => {
      persistPersonalDraft(values);
    }, PERSONAL_SETTINGS_AUTOSAVE_DELAY);
  }, [persistPersonalDraft, storageKey]);

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        window.clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  // Load profile data - Initialize formData when profile loads
  useEffect(() => {
    if (!profile) return;
    if (hasRestoredFromCacheRef.current || hasInitializedFormRef.current) return;
    setFormData(profile);
    hasInitializedFormRef.current = true;
  }, [profile]);

  // Restore cached settings from localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !storageKey || hasRestoredFromCacheRef.current) return;

    try {
      const serialized = localStorage.getItem(storageKey);
      if (!serialized) return;

      const payload: PersonalSettingsDraftPayload = JSON.parse(serialized);
      if (!payload?.data || Object.keys(payload.data).length === 0) {
        localStorage.removeItem(storageKey);
        return;
      }

      hasRestoredFromCacheRef.current = true;
      hasUnsavedChangesRef.current = true;
      setFormData(prev => ({ ...prev, ...payload.data }));
      setSections(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
          next[key] = { ...next[key], isExpanded: true, isEditing: true };
        });
        return next;
      });

      let refreshReminder = false;
      if (refreshFlagKey) {
        refreshReminder = sessionStorage.getItem(refreshFlagKey) === 'true';
        if (refreshReminder) {
          sessionStorage.removeItem(refreshFlagKey);
        }
      }

      const message = refreshReminder
        ? 'We restored your unsaved profile edits after a refresh.'
        : 'We reloaded your in-progress profile edits.';
      toast.info(message);
    } catch (error) {
      console.error('[Settings][Personal] Failed to restore cached data', error);
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, refreshFlagKey]);

  useEffect(() => {
    if (!hasUnsavedChangesRef.current) return;
    scheduleDraftSave(formData);
  }, [formData, scheduleDraftSave]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!hasUnsavedChangesRef.current) return;
      persistPersonalDraft(formData);
      if (refreshFlagKey) {
        try {
          sessionStorage.setItem(refreshFlagKey, 'true');
        } catch (error) {
          console.warn('[Settings][Personal] Failed to set refresh flag', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, persistPersonalDraft, refreshFlagKey]);

  // Section management helpers
  const toggleSection = (sectionKey: string) => {
    if (isMobile) {
      // Mobile: single accordion behavior - close all others and toggle the selected one
      setSections(prev => {
        const newSections = { ...prev };
        const isCurrentlyExpanded = prev[sectionKey].isExpanded;
        // Close all sections and exit edit mode
        Object.keys(newSections).forEach(key => {
          newSections[key] = { ...newSections[key], isExpanded: false, isEditing: false };
        });
        // Open the selected section and auto-enter edit mode if it wasn't already open
        if (!isCurrentlyExpanded) {
          newSections[sectionKey] = { ...newSections[sectionKey], isExpanded: true, isEditing: true };
        }
        return newSections;
      });
    } else {
      // Desktop: single accordion behavior (same as mobile) - only one section open at a time
      setSections(prev => {
        const newSections = { ...prev };
        const isCurrentlyExpanded = prev[sectionKey].isExpanded;
        // Close all sections and exit edit mode
        Object.keys(newSections).forEach(key => {
          newSections[key] = { ...newSections[key], isExpanded: false, isEditing: false };
        });
        // Open the selected section and auto-enter edit mode if it wasn't already open
        if (!isCurrentlyExpanded) {
          newSections[sectionKey] = { ...newSections[sectionKey], isExpanded: true, isEditing: true };
        }
        return newSections;
      });
    }
  };

  const toggleEditMode = (sectionKey: string) => {
    setSections(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        isEditing: !prev[sectionKey].isEditing,
        errors: {}
      }
    }));
  };

  const handleInputChange = (field: string, value: string | string[] | boolean | null) => {
    hasUnsavedChangesRef.current = true;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSectionSave = async (sectionKey: string, sectionData: Record<string, any>) => {
    try {
      const success = await updateProfileSection(sectionKey as any, sectionData);
      if (success) {
        setSections(prev => ({
          ...prev,
          [sectionKey]: {
            ...prev[sectionKey],
            isEditing: false,
            hasChanges: false,
            errors: {}
          }
        }));
        hasUnsavedChangesRef.current = false;
        clearPersonalDraft();
      }
    } catch (error) {
      console.error(`Error updating ${sectionKey} section:`, error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setUploadError(null);
    
    // Validate file size (5MB max for original before cropping)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setUploadError('Image must be less than 5MB');
      event.target.value = ''; // Clear the input
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file');
      event.target.value = '';
      return;
    }
    
    //Create preview and open crop modal
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageToCrop(e.target?.result as string);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    
    // Clear the file input so the same file can be selected again
    event.target.value = '';
  };

  const handleCroppedAvatar = async (croppedBlob: Blob) => {
    if (!uploadAvatar) return;
    
    setIsUploading(true);
    
    // Create a File object from the blob
    const croppedFile = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
    
    const success = await uploadAvatar(croppedFile);
    if (!success) {
      setUploadError('Failed to upload image');
    }
    setIsUploading(false);
  };

  const handleImageDelete = async () => {
    if (deleteAvatar) {
      setIsDeleting(true);
      await deleteAvatar();
      setIsDeleting(false);
      setShowDeleteAvatarConfirmation(false);
    }
  };

  const handleConfirmDeleteAvatar = () => {
    setShowDeleteAvatarConfirmation(true);
  };

  const handleInitiateEmailChange = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const response = await fetch('/api/auth/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to update email');

      toast.success('Check both your old and new email addresses to verify the change.');
      setIsChangingEmail(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      setUploadError(null);
      
      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        setUploadError('Image must be less than 5MB');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setUploadError('Please select a valid image file');
        return;
      }
      
      if (uploadAvatar) {
        setIsUploading(true);
        const success = await uploadAvatar(file);
        if (!success) {
          setUploadError('Failed to upload image');
        }
        setIsUploading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Desktop Header - Only show on desktop */}
      {!isMobile && (
        <>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
            <p className="text-gray-600 mb-4">
              Update your personal details and manage how others see your profile.
            </p>
            
            {/* Profile Completion Status */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Profile Completion</span>
                </div>
                <span className="text-sm font-semibold text-blue-800">
                  {completionStatus.percentage}% Complete
                </span>
              </div>
              <div className="w-full bg-blue-100 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionStatus.percentage}%` }}
                ></div>
              </div>
              {completionStatus.percentage < 80 && (
                <p className="text-xs text-blue-600 mt-2">
                  Complete your profile to unlock all features and improve discoverability.
                </p>
              )}
            </div>
          </div>
          
          {/* Role-specific context */}
          {roleContext.roles.length > 1 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Multi-role profile:</strong> Your profile is shared across all your roles ({roleContext.roles.filter(r => r !== 'user').join(', ')}). 
                Changes here will affect how you appear in event listings, venue searches, and business directories.
              </p>
            </div>
          )}
        </>
      )}
      
      {/* Mobile Multi-role warning */}
      {isMobile && roleContext.roles.length > 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-blue-800">
            <strong>Multi-role profile:</strong> Changes affect all your roles
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Avatar Section */}
        <AvatarSection 
          profile={profile}
          isDragging={isDragging}
          uploadError={uploadError}
          updating={updating}
          onImageUpload={handleImageUpload}
          onImageDelete={handleConfirmDeleteAvatar}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          isMobile={isMobile}
          isUploading={isUploading}
          isDeleting={isDeleting}
        />

        {/* Basic Information Section */}
        <BasicInformationSection
          profile={profile}
          formData={formData}
          sectionState={sections.basic}
          updating={updating}
          onToggle={() => toggleSection('basic')}
          onEditToggle={() => toggleEditMode('basic')}
          onInputChange={handleInputChange}
          onSave={(data) => handleSectionSave('basic', data)}
          isChangingEmail={isChangingEmail}
          setIsChangingEmail={setIsChangingEmail}
          newEmail={newEmail}
          setNewEmail={setNewEmail}
          isUpdatingEmail={isUpdatingEmail}
          handleInitiateEmailChange={handleInitiateEmailChange}
        />

        {/* Address Information Section */}
        <AddressInformationSection
          profile={profile}
          formData={formData}
          sectionState={sections.address}
          updating={updating}
          onToggle={() => toggleSection('address')}
          onEditToggle={() => toggleEditMode('address')}
          onInputChange={handleInputChange}
          onSave={(data) => handleSectionSave('address', data)}
        />

        {/* Emergency Contact Section */}
        <EmergencyContactSection
          profile={profile}
          formData={formData}
          sectionState={sections.emergency}
          updating={updating}
          onToggle={() => toggleSection('emergency')}
          onEditToggle={() => toggleEditMode('emergency')}
          onInputChange={handleInputChange}
          onSave={(data) => handleSectionSave('emergency', data)}
        />

        {/* Professional Information Section - COMMENTED OUT */}
        {/* <ProfessionalInformationSection
          profile={profile}
          formData={formData}
          sectionState={sections.professional}
          updating={updating}
          onToggle={() => toggleSection('professional')}
          onEditToggle={() => toggleEditMode('professional')}
          onInputChange={handleInputChange}
          onSave={(data) => handleSectionSave('professional', data)}
        /> */}

        {/* Personal Details Section */}
        <PersonalDetailsSection
          profile={profile}
          formData={formData}
          sectionState={sections.personal}
          updating={updating}
          onToggle={() => toggleSection('personal')}
          onEditToggle={() => toggleEditMode('personal')}
          onInputChange={handleInputChange}
          onSave={(data) => handleSectionSave('personal', data)}
        />
      </div>

      {/* Delete Avatar Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteAvatarConfirmation}
        title="Remove Profile Picture"
        message="Are you sure you want to remove your profile picture? This action cannot be undone."
        confirmText="Remove Picture"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={isDeleting}
        onConfirm={handleImageDelete}
        onClose={() => setShowDeleteAvatarConfirmation(false)}
      />
      
      {/* Image Crop Modal */}
      {imageToCrop && (
        <ImageCropModal
          image={imageToCrop}
          isOpen={cropModalOpen}
          onClose={() => {
            setCropModalOpen(false);
            setImageToCrop(null);
          }}
          onCropComplete={handleCroppedAvatar}
          aspect={1} // Square aspect ratio for avatar
          title="Position Your Avatar"
          cropShape="round" // Round crop for avatar
        />
      )}
    </div>
  );
}

// ====== SECTION COMPONENTS ======
// Previously these were in PersonalInfoSections.tsx, now consolidated here

interface SectionProps {
  profile: Profile | null;
  formData: Partial<Profile>;
  sectionState: {
    isExpanded: boolean;
    isEditing: boolean;
    hasChanges: boolean;
    errors: Record<string, string>;
  };
  updating: boolean;
  onToggle: () => void;
  onEditToggle: () => void;
  onInputChange: (field: string, value: any) => void;
  onSave: (data: any) => void;
  // Email change props
  isChangingEmail?: boolean;
  setIsChangingEmail?: (val: boolean) => void;
  newEmail?: string;
  setNewEmail?: (val: string) => void;
  isUpdatingEmail?: boolean;
  handleInitiateEmailChange?: () => void;
}

// Helper component for section headers
function SectionHeader({ title, icon, isExpanded, onToggle }: any) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-3 text-left p-4 group cursor-pointer hover:bg-gray-100 transition-colors bg-gray-50 border-b border-gray-200"
    >
      <div className="text-gray-500 group-hover:text-gray-700 transition-colors">
        {icon}
      </div>
      <div>
        <h3 className="font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
          {title}
        </h3>
      </div>
      <div className="text-gray-400 ml-auto">
        {isExpanded ? 
          <ChevronDown className="w-4 h-4" /> : 
          <ChevronRight className="w-4 h-4" />
        }
      </div>
    </button>
  );
}

// Basic Information Section Component
export function BasicInformationSection({ 
  profile, 
  formData, 
  sectionState, 
  updating, 
  onToggle, 
  onEditToggle, 
  onInputChange, 
  onSave,
  isChangingEmail,
  setIsChangingEmail,
  newEmail,
  setNewEmail,
  isUpdatingEmail,
  handleInitiateEmailChange
}: SectionProps) {
  const handleSave = () => {
    const data = {
      full_name: formData.full_name || '',
      phone_number: formData.phone_number || '',
      date_of_birth: formData.date_of_birth || '',
      gender: formData.gender || null,
      nationality: formData.nationality || '',
      marital_status: formData.marital_status || null,
      birth_city: formData.birth_city || '',
      birth_country: formData.birth_country || ''
    };
    onSave(data);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <SectionHeader 
        title="Basic Information"
        icon={<User className="w-4 h-4" />}
        isExpanded={sectionState.isExpanded}
        onToggle={onToggle}
      />
      
      {sectionState.isExpanded && (
        <div className="p-6 space-y-4">
          {sectionState.isEditing ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name || profile?.full_name || ''}
                    onChange={(e) => onInputChange('full_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={isChangingEmail ? newEmail : (profile?.email || '')}
                      onChange={(e) => setNewEmail?.(e.target.value)}
                      readOnly={!isChangingEmail}
                      className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg ${
                        !isChangingEmail ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-blue-500'
                      }`}
                    />
                    {!isChangingEmail ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsChangingEmail?.(true);
                          setNewEmail?.(profile?.email || '');
                        }}
                        className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-500 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        Change
                      </button>
                    ) : (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleInitiateEmailChange?.()}
                          disabled={isUpdatingEmail}
                          className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {isUpdatingEmail ? '...' : 'Verify'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsChangingEmail?.(false)}
                          className="px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  {!isChangingEmail && (
                    <p className="text-xs text-gray-500 mt-1">
                      Verification will be sent to both addresses
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone_number || ''}
                    onChange={(e) => onInputChange('phone_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+233XXXXXXXXX"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth || ''}
                    onChange={(e) => onInputChange('date_of_birth', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => onInputChange('gender', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select gender</option>
                    {GENDER_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={formData.nationality || ''}
                    onChange={(e) => onInputChange('nationality', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Ghanaian"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Marital Status
                  </label>
                  <select
                    value={formData.marital_status || ''}
                    onChange={(e) => onInputChange('marital_status', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select status</option>
                    {MARITAL_STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Birth City
                  </label>
                  <input
                    type="text"
                    value={formData.birth_city || ''}
                    onChange={(e) => onInputChange('birth_city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="City where you were born"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Birth Country
                  </label>
                  <input
                    type="text"
                    value={formData.birth_country || ''}
                    onChange={(e) => onInputChange('birth_country', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Country where you were born"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={onEditToggle}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-sm font-medium text-gray-500">Full Name</span>
                  <p className="text-gray-900 mt-1">{profile?.full_name || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Email</span>
                  <p className="text-gray-900 mt-1">{profile?.email || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Phone Number</span>
                  <p className="text-gray-900 mt-1">{profile?.phone_number || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Date of Birth</span>
                  <p className="text-gray-900 mt-1">
                    {profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'Not provided'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Gender</span>
                  <p className="text-gray-900 mt-1">
                    {profile?.gender ? GENDER_OPTIONS.find(g => g.value === profile.gender)?.label : 'Not provided'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Nationality</span>
                  <p className="text-gray-900 mt-1">{profile?.nationality || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Marital Status</span>
                  <p className="text-gray-900 mt-1">
                    {profile?.marital_status ? MARITAL_STATUS_OPTIONS.find(m => m.value === profile.marital_status)?.label : 'Not provided'}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Birth City</span>
                  <p className="text-gray-900 mt-1">{profile?.birth_city || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Birth Country</span>
                  <p className="text-gray-900 mt-1">{profile?.birth_country || 'Not provided'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Address Information Section Component  
export function AddressInformationSection({ profile, formData, sectionState, updating, onToggle, onEditToggle, onInputChange, onSave }: SectionProps) {
  const handleSave = () => {
    const data = {
      address_line_1: formData.address_line_1 || '',
      address_line_2: formData.address_line_2 || '',
      city: formData.city || '',
      region: formData.region || '',
      postal_code: formData.postal_code || '',
      country: formData.country || ''
    };
    onSave(data);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <SectionHeader 
        title="Address Information"
        icon={<MapPin className="w-4 h-4" />}
        isExpanded={sectionState.isExpanded}
        onToggle={onToggle}
      />
      
      {sectionState.isExpanded && (
        <div className="p-6 space-y-4">
          {sectionState.isEditing ? (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    value={formData.address_line_1 || ''}
                    onChange={(e) => onInputChange('address_line_1', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Street address, P.O. Box, etc."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.address_line_2 || ''}
                    onChange={(e) => onInputChange('address_line_2', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Apartment, suite, building, etc."
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City/Town
                    </label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => onInputChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter city or town"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Region
                    </label>
                    <select
                      value={formData.region || ''}
                      onChange={(e) => onInputChange('region', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select region</option>
                      {GHANA_REGIONS.map(region => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      value={formData.postal_code || ''}
                      onChange={(e) => onInputChange('postal_code', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Postal/ZIP code"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.country || ''}
                      onChange={(e) => onInputChange('country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={onEditToggle}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="space-y-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Address</span>
                  <p className="text-gray-900 mt-1">
                    {[profile?.address_line_1, profile?.address_line_2].filter(Boolean).join(', ') || 'Not provided'}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <span className="text-sm font-medium text-gray-500">City/Town</span>
                    <p className="text-gray-900 mt-1">{profile?.city || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Region</span>
                    <p className="text-gray-900 mt-1">{profile?.region || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Country</span>
                    <p className="text-gray-900 mt-1">{profile?.country || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Emergency Contact Section Component
export function EmergencyContactSection({ profile, formData, sectionState, updating, onToggle, onEditToggle, onInputChange, onSave }: SectionProps) {
  const handleSave = () => {
    const data = {
      emergency_contact_name: formData.emergency_contact_name || '',
      emergency_contact_phone: formData.emergency_contact_phone || '',
      emergency_contact_relationship: formData.emergency_contact_relationship || null
    };
    onSave(data);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <SectionHeader 
        title="Emergency Contact"
        icon={<Phone className="w-4 h-4" />}
        isExpanded={sectionState.isExpanded}
        onToggle={onToggle}
      />
      
      {sectionState.isExpanded && (
        <div className="p-6 space-y-4">
          {sectionState.isEditing ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <Info className="w-4 h-4 inline mr-1" />
                  This information will be used in case of emergencies. All fields are required if you provide emergency contact information.
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name || ''}
                    onChange={(e) => onInputChange('emergency_contact_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Full name of emergency contact"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.emergency_contact_phone || ''}
                    onChange={(e) => onInputChange('emergency_contact_phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="+233XXXXXXXXX"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship
                  </label>
                  <select
                    value={formData.emergency_contact_relationship || ''}
                    onChange={(e) => onInputChange('emergency_contact_relationship', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select relationship</option>
                    {RELATIONSHIP_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={onEditToggle}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-sm font-medium text-gray-500">Contact Name</span>
                  <p className="text-gray-900 mt-1">{profile?.emergency_contact_name || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Contact Phone</span>
                  <p className="text-gray-900 mt-1">{profile?.emergency_contact_phone || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Relationship</span>
                  <p className="text-gray-900 mt-1">
                    {profile?.emergency_contact_relationship 
                      ? RELATIONSHIP_OPTIONS.find(r => r.value === profile.emergency_contact_relationship)?.label 
                      : 'Not provided'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Professional Information Section Component
export function ProfessionalInformationSection({ profile, formData, sectionState, updating, onToggle, onEditToggle, onInputChange, onSave }: SectionProps) {
  const handleSave = () => {
    const data = {
      occupation: formData.occupation || '',
      company: formData.company || '',
      industry: formData.industry || '',
      work_address: formData.work_address || '',
      education_level: formData.education_level || null
    };
    onSave(data);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <SectionHeader 
        title="Professional Information"
        icon={<Briefcase className="w-4 h-4" />}
        isExpanded={sectionState.isExpanded}
        onToggle={onToggle}
      />
      
      {sectionState.isExpanded && (
        <div className="p-6 space-y-4">
          {sectionState.isEditing ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Occupation/Job Title
                  </label>
                  <input
                    type="text"
                    value={formData.occupation || ''}
                    onChange={(e) => onInputChange('occupation', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your job title or profession"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company/Organization
                  </label>
                  <input
                    type="text"
                    value={formData.company || ''}
                    onChange={(e) => onInputChange('company', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Company or organization name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry
                  </label>
                  <select
                    value={formData.industry || ''}
                    onChange={(e) => onInputChange('industry', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select industry</option>
                    {COMMON_INDUSTRIES.map(industry => (
                      <option key={industry} value={industry}>
                        {industry}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Education Level
                  </label>
                  <select
                    value={formData.education_level || ''}
                    onChange={(e) => onInputChange('education_level', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select education level</option>
                    {EDUCATION_LEVELS.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Address (Optional)
                </label>
                <textarea
                  value={formData.work_address || ''}
                  onChange={(e) => onInputChange('work_address', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your work address"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={onEditToggle}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-sm font-medium text-gray-500">Occupation</span>
                  <p className="text-gray-900 mt-1">{profile?.occupation || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Company</span>
                  <p className="text-gray-900 mt-1">{profile?.company || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Industry</span>
                  <p className="text-gray-900 mt-1">{profile?.industry || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Education Level</span>
                  <p className="text-gray-900 mt-1">
                    {profile?.education_level 
                      ? EDUCATION_LEVELS.find(e => e.value === profile.education_level)?.label 
                      : 'Not provided'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Personal Details Section Component
export function PersonalDetailsSection({ profile, formData, sectionState, updating, onToggle, onEditToggle, onInputChange, onSave }: SectionProps) {
  const [newInterest, setNewInterest] = useState('');
  const [newLanguage, setNewLanguage] = useState('');

  const handleSave = () => {
    const data = {
      bio: formData.bio || '',
      interests: formData.interests || [],
      languages: formData.languages || [],
      // social_links: formData.social_links || {} - Moved to Socials Tab
    };
    onSave(data);
  };

  const addInterest = () => {
    if (newInterest.trim() && (!formData.interests || !formData.interests.includes(newInterest.trim()))) {
      const currentInterests = formData.interests || [];
      onInputChange('interests', [...currentInterests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    const currentInterests = formData.interests || [];
    onInputChange('interests', currentInterests.filter(i => i !== interest));
  };

  const addLanguage = () => {
    if (newLanguage.trim() && (!formData.languages || !formData.languages.includes(newLanguage.trim()))) {
      const currentLanguages = formData.languages || [];
      onInputChange('languages', [...currentLanguages, newLanguage.trim()]);
      setNewLanguage('');
    }
  };

  const removeLanguage = (language: string) => {
    const currentLanguages = formData.languages || [];
    onInputChange('languages', currentLanguages.filter(l => l !== language));
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    const currentLinks = formData.social_links || {};
    onInputChange('social_links', {
      ...currentLinks,
      [platform]: value || undefined
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <SectionHeader 
        title="Personal Details"
        icon={<Heart className="w-4 h-4" />}
        isExpanded={sectionState.isExpanded}
        onToggle={onToggle}
      />
      
      {sectionState.isExpanded && (
        <div className="p-6 space-y-6">
          {sectionState.isEditing ? (
            <>
              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={formData.bio || ''}
                  onChange={(e) => onInputChange('bio', e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tell us about yourself..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(formData.bio || '').length}/500 characters
                </p>
              </div>

              {/* Interests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Interests & Hobbies
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add an interest"
                    onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                  />
                  <button
                    onClick={addInterest}
                    type="button"
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(formData.interests || []).map((interest, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {interest}
                      <button
                        onClick={() => removeInterest(interest)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-500 mr-2">Suggestions:</span>
                  {COMMON_INTERESTS.slice(0, 8).map(interest => (
                    <button
                      key={interest}
                      onClick={() => {
                        if (!formData.interests?.includes(interest)) {
                          setNewInterest(interest);
                          addInterest();
                        }
                      }}
                      className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Languages
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add a language"
                    onKeyPress={(e) => e.key === 'Enter' && addLanguage()}
                  />
                  <button
                    onClick={addLanguage}
                    type="button"
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(formData.languages || []).map((language, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                    >
                      {language}
                      <button
                        onClick={() => removeLanguage(language)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-gray-500 mr-2">Common:</span>
                  {COMMON_LANGUAGES.slice(0, 6).map(language => (
                    <button
                      key={language}
                      onClick={() => {
                        if (!formData.languages?.includes(language)) {
                          setNewLanguage(language);
                          addLanguage();
                        }
                      }}
                      className="text-xs px-2 py-1 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {language}
                    </button>
                  ))}
                </div>
              </div>

              {/* Social Links - MOVED TO SOCIALS TAB */}
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Social Links
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['facebook', 'twitter', 'instagram', 'linkedin', 'website', 'youtube'].map(platform => (
                    <div key={platform}>
                      <label className="block text-sm text-gray-600 mb-1 capitalize">
                        {platform === 'website' ? 'Personal Website' : platform}
                      </label>
                      <input
                        type="url"
                        value={(formData.social_links as any)?.[platform] || ''}
                        onChange={(e) => handleSocialLinkChange(platform, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`Your ${platform} ${platform === 'website' ? 'URL' : 'profile URL'}`}
                      />
                    </div>
                  ))}
                </div>
              </div> */}
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={onEditToggle}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div>
                <span className="text-sm font-medium text-gray-500">Bio</span>
                <p className="text-gray-900 mt-2">{profile?.bio || 'No bio provided'}</p>
              </div>
              
              {profile?.interests && profile.interests.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Interests</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {profile?.languages && profile.languages.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Languages</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.languages.map((language, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {language}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links - MOVED TO SOCIALS TAB */}
              {/* {profile?.social_links && Object.keys(profile.social_links).length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Social Links</span>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {Object.entries(profile.social_links).map(([platform, url]) => 
                      url && (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          <Globe className="w-3 h-3" />
                          <span className="capitalize">{platform}</span>
                        </a>
                      )
                    )}
                  </div>
                </div>
              )} */}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Privacy Settings Section Component
export function PrivacySettingsSection({ profile, formData, sectionState, updating, onToggle, onEditToggle, onInputChange, onSave }: SectionProps) {
  const handleSave = () => {
    const data = {
      profile_visibility: formData.profile_visibility || 'public',
      allow_messages: formData.allow_messages ?? true,
      allow_event_invitations: formData.allow_event_invitations ?? true
    };
    onSave(data);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <SectionHeader 
        title="Privacy Settings"
        icon={<Shield className="w-4 h-4" />}
        isExpanded={sectionState.isExpanded}
        onToggle={onToggle}
      />
      
      {sectionState.isExpanded && (
        <div className="p-6 space-y-4">
          {sectionState.isEditing ? (
            <>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Profile Visibility
                  </label>
                  <div className="space-y-3">
                    {PROFILE_VISIBILITY_OPTIONS.map(option => (
                      <label key={option.value} className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="profile_visibility"
                          value={option.value}
                          checked={formData.profile_visibility === option.value}
                          onChange={(e) => onInputChange('profile_visibility', e.target.value)}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{option.label}</div>
                          <div className="text-sm text-gray-500">{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Allow Messages</h4>
                      <p className="text-sm text-gray-500">Allow other users to send you messages</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allow_messages ?? true}
                        onChange={(e) => onInputChange('allow_messages', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Allow Event Invitations</h4>
                      <p className="text-sm text-gray-500">Allow event organizers to invite you to events</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allow_event_invitations ?? true}
                        onChange={(e) => onInputChange('allow_event_invitations', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={onEditToggle}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Profile Visibility</span>
                <p className="text-gray-900 mt-1">
                  {PROFILE_VISIBILITY_OPTIONS.find(v => v.value === profile?.profile_visibility)?.label || 'Public'}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="text-sm font-medium text-gray-500">Allow Messages</span>
                  <p className="text-gray-900 mt-1">{profile?.allow_messages ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Allow Event Invitations</span>
                  <p className="text-gray-900 mt-1">{profile?.allow_event_invitations ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Component for Avatar Section
function AvatarSection({ 
  profile, 
  isDragging, 
  uploadError, 
  updating, 
  onImageUpload, 
  onImageDelete,
  onDragOver, 
  onDragLeave, 
  onDrop,
  isMobile,
  isUploading,
  isDeleting
}: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 justify-center text-sm">
        <Camera className="w-4 h-4" />
        Profile Picture
      </h3>
      
      <div className="flex flex-col items-center gap-3">
        {/* Avatar Circle */}
        <div 
          className={`w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center bg-white overflow-hidden transition-colors relative flex-shrink-0 ${
            isDragging 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {profile?.avatar_url ? (
            <Image 
              src={profile.avatar_url} 
              alt="Profile picture" 
              fill
              sizes="96px"
              className="absolute inset-0 object-cover rounded-full"
            />
          ) : (
            <User className="h-10 w-10 text-gray-400" />
          )}
        </div>
        
        {/* Buttons and Info */}
        <div className="flex flex-col items-center gap-2">
          {/* Buttons */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              onChange={onImageUpload}
              className="hidden"
              disabled={isUploading || isDeleting}
            />
            <label
              htmlFor="avatar-upload"
              className={`inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors text-xs font-medium ${
                (isUploading || isDeleting) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Upload className="w-4 h-4" />
              {isUploading ? 'Wait...' : (profile?.avatar_url ? 'Change' : 'Upload')}
            </label>
            
            {profile?.avatar_url && (
              <button
                onClick={onImageDelete}
                disabled={isUploading || isDeleting}
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 cursor-pointer transition-colors disabled:opacity-50 text-xs font-medium"
              >
                <Trash2 className="w-4 h-4" />
                {isDeleting ? 'Wait...' : 'Remove'}
              </button>
            )}
          </div>
          
          {/* Info Text */}
          <div className="text-center">
            {isUploading && (
              <p className="text-xs text-primary font-medium mb-1">Uploading...</p>
            )}
            <p className="text-xs text-gray-500">
              PNG, JPG up to 1MB
            </p>
            {uploadError && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1 justify-center">
                <AlertCircle className="w-3 h-3" />
                {uploadError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
