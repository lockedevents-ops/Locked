"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Image from "next/image";
import { useToast } from "@/hooks/useToast";
import { createClient } from '@/lib/supabase/client/client';
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { ImageCropModal } from "@/components/ImageCropModal";
import {
  Upload,
  MapPin,
  Link,
  Building,
  Phone,
  AlertCircle,
  Trash2,
  Edit3,
  Save,
  X,
} from "lucide-react";

const ORG_SETTINGS_STORAGE_PREFIX = 'locked:settings:organization:';
const ORG_SETTINGS_REFRESH_PREFIX = 'locked:settings:organization:refresh:';
const ORG_SETTINGS_AUTOSAVE_DELAY = 800;

type OrganizationSettingsDraftPayload = {
  version: number;
  updatedAt: number;
  userId?: string;
  data: Partial<OrganizationFormData>;
};

const ORGANIZATION_FIELDS = [
  'business_name',
  'business_description',
  'business_website',
  'contact_email',
  'business_phone',
] as const;

type OrganizationField = typeof ORGANIZATION_FIELDS[number];

type OrganizationFormData = Record<OrganizationField, string>;

const DEFAULT_ORGANIZATION_FORM: OrganizationFormData = {
  business_name: '',
  business_description: '',
  business_website: '',
  contact_email: '',
  business_phone: '',
};

const buildOrganizationStorageKey = (userId?: string | null) => {
  if (!userId) return null;
  return `${ORG_SETTINGS_STORAGE_PREFIX}${userId}`;
};

export function OrganizationSection({ user, roleContext, isMobile }: any) {
  const toast = useToast();
  const supabase = createClient();
  const [organizationData, setOrganizationData] = useState<any>(null);
  const [formData, setFormData] = useState<OrganizationFormData>({ ...DEFAULT_ORGANIZATION_FORM });
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [bannerUploadError, setBannerUploadError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<'logo' | 'banner' | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [cropType, setCropType] = useState<'logo' | 'banner'>('logo');

  const storageKey = useMemo(() => buildOrganizationStorageKey(user?.id), [user?.id]);
  const refreshFlagKey = useMemo(() => (user?.id ? `${ORG_SETTINGS_REFRESH_PREFIX}${user.id}` : null), [user?.id]);
  const hasUnsavedChangesRef = useRef(false);
  const hasRestoredFromCacheRef = useRef(false);
  const autosaveTimeoutRef = useRef<number | null>(null);

  const pickOrganizationDraftFields = useCallback((values: Partial<OrganizationFormData> = {}) => {
    const picked: Partial<OrganizationFormData> = {};
    ORGANIZATION_FIELDS.forEach((field) => {
      if (field in values) {
        picked[field] = values[field] ?? '';
      }
    });
    return picked;
  }, []);

  const persistOrganizationDraft = useCallback((values: OrganizationFormData) => {
    if (typeof window === 'undefined' || !storageKey) return;
    const payloadValues = pickOrganizationDraftFields(values);
    const hasMeaningfulData = Object.values(payloadValues).some(
      (value) => typeof value === 'string' && value.trim().length > 0
    );

    if (!hasMeaningfulData) {
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.error('[Settings][Organization] Failed to remove empty draft', error);
      }
      return;
    }

    try {
      const payload: OrganizationSettingsDraftPayload = {
        version: 1,
        updatedAt: Date.now(),
        userId: user?.id,
        data: payloadValues,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (error) {
      console.error('[Settings][Organization] Failed to persist draft', error);
    }
  }, [pickOrganizationDraftFields, storageKey, user?.id]);

  const clearOrganizationDraft = useCallback(() => {
    if (typeof window === 'undefined' || !storageKey) return;
    try {
      localStorage.removeItem(storageKey);
      if (refreshFlagKey) {
        sessionStorage.removeItem(refreshFlagKey);
      }
    } catch (error) {
      console.error('[Settings][Organization] Failed to clear cached draft', error);
    }
  }, [storageKey, refreshFlagKey]);

  const scheduleOrganizationDraftSave = useCallback((values: OrganizationFormData) => {
    if (typeof window === 'undefined' || !storageKey) return;
    if (!hasUnsavedChangesRef.current) return;

    if (autosaveTimeoutRef.current !== null) {
      window.clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    autosaveTimeoutRef.current = window.setTimeout(() => {
      persistOrganizationDraft(values);
    }, ORG_SETTINGS_AUTOSAVE_DELAY);
  }, [persistOrganizationDraft, storageKey]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && autosaveTimeoutRef.current !== null) {
        window.clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !storageKey || hasRestoredFromCacheRef.current) return;

    try {
      const serialized = localStorage.getItem(storageKey);
      if (!serialized) return;

      const payload: OrganizationSettingsDraftPayload = JSON.parse(serialized);
      if (!payload?.data) {
        localStorage.removeItem(storageKey);
        return;
      }

      const restoredData: Partial<OrganizationFormData> = {};
      ORGANIZATION_FIELDS.forEach((field) => {
        if (payload.data && field in payload.data) {
          restoredData[field] = payload.data[field] ?? '';
        }
      });

      const hasRestorableData = Object.values(restoredData).some(
        (value) => typeof value === 'string' && value.trim().length > 0
      );

      if (!hasRestorableData) {
        localStorage.removeItem(storageKey);
        return;
      }

      hasRestoredFromCacheRef.current = true;
      hasUnsavedChangesRef.current = true;
      setFormData(prev => ({ ...prev, ...restoredData }));
      setIsEditMode(true);

      let refreshReminder = false;
      if (refreshFlagKey) {
        refreshReminder = sessionStorage.getItem(refreshFlagKey) === 'true';
        if (refreshReminder) {
          sessionStorage.removeItem(refreshFlagKey);
        }
      }

      const message = refreshReminder
        ? 'We restored your organization edits after a refresh.'
        : 'We reloaded your in-progress organization edits.';
      toast.showInfo('Draft Restored', message);
    } catch (error) {
      console.error('[Settings][Organization] Failed to restore cached data', error);
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, refreshFlagKey, toast]);

  useEffect(() => {
    if (!hasUnsavedChangesRef.current) return;
    scheduleOrganizationDraftSave(formData);
  }, [formData, scheduleOrganizationDraftSave]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!hasUnsavedChangesRef.current) return;
      persistOrganizationDraft(formData);
      if (refreshFlagKey) {
        try {
          sessionStorage.setItem(refreshFlagKey, 'true');
        } catch (error) {
          console.warn('[Settings][Organization] Failed to set refresh flag', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, persistOrganizationDraft, refreshFlagKey]);

  // Load organization data from database
  useEffect(() => {
    const loadOrganizationData = async () => {
      if (!user?.id) return;
      
      try {
        // Fetch organizer profile from database
        // Only select editable fields that should be displayed in settings
        const { data: organizer, error: orgError } = await supabase
          .from('organizers')
          .select('id, business_name, business_description, business_website, contact_email, business_phone, logo_url, banner_url')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (orgError) {
          console.error('Error loading organizer:', orgError);
          setIsLoading(false);
          return;
        }

        if (!organizer) {
          // User is an organizer but no organizer record found
          // This shouldn't happen if roles are properly managed
          console.warn('Organizer role found but no organizer record exists for user:', user.id);
          toast.showError('Configuration Error', 'Organizer profile not found. Please contact support.');
          setIsLoading(false);
          return;
        }

        setOrganizationData(organizer);
        if (!hasRestoredFromCacheRef.current) {
          setFormData({
            business_name: organizer.business_name || '',
            business_description: organizer.business_description || '',
            business_website: organizer.business_website || '',
            contact_email: organizer.contact_email || '',
            business_phone: organizer.business_phone || '',
          });
        }
        setLogoPreview(null);
        setBannerPreview(null);
      } catch (error) {
        console.error('Error loading organization data:', error);
        toast.showError('Load Failed', 'Failed to load organization profile');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadOrganizationData();
  }, [user, supabase, toast]);

  const updateOrganizationData = async (updates: any) => {
    if (!user?.id || !organizationData?.id) {
      toast.showError('Validation Error', 'Organizer profile not found');
      return;
    }
    
    setIsSaving(true);
    try {
      // Only allow updating specific fields that are editable in settings
      const allowedFields = ['business_name', 'business_description', 'business_website', 'contact_email', 'business_phone', 'logo_url', 'banner_url'];
      const sanitizedUpdates = Object.fromEntries(
        Object.entries(updates).filter(([key]) => allowedFields.includes(key))
      );

      // Must have existing organizer ID to update
      if (!organizationData.id) {
        throw new Error('Cannot update: organizer profile not initialized');
      }

      // Update existing organizer record
      const { error } = await supabase
        .from('organizers')
        .update(sanitizedUpdates)
        .eq('id', organizationData.id);
      
      if (error) throw error;

      // Update local state
      const updated = {
        ...organizationData,
        ...sanitizedUpdates
      };
      setOrganizationData(updated);
      setFormData({
        business_name: updated.business_name || '',
        business_description: updated.business_description || '',
        business_website: updated.business_website || '',
        contact_email: updated.contact_email || '',
        business_phone: updated.business_phone || '',
      });
      toast.showSuccess('Profile Updated', 'Organization profile saved successfully');
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.showError('Update Failed', 'Failed to save organization profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: OrganizationField, value: string) => {
    hasUnsavedChangesRef.current = true;
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    await updateOrganizationData(formData);
    hasUnsavedChangesRef.current = false;
    clearOrganizationDraft();
    setIsEditMode(false);
  };

  const handleCancel = () => {
    // Reset form data to current organization data
    setFormData({
      business_name: organizationData?.business_name || '',
      business_description: organizationData?.business_description || '',
      business_website: organizationData?.business_website || '',
      contact_email: organizationData?.contact_email || '',
      business_phone: organizationData?.business_phone || '',
    });
    hasUnsavedChangesRef.current = false;
    clearOrganizationDraft();
    setIsEditMode(false);
  };

  const toggleEditMode = () => {
    if (!isEditMode) {
      // Entering edit mode - sync form data with current data
      setFormData({
        business_name: organizationData?.business_name || '',
        business_description: organizationData?.business_description || '',
        business_website: organizationData?.business_website || '',
        contact_email: organizationData?.contact_email || '',
        business_phone: organizationData?.business_phone || '',
      });
    }
    setIsEditMode(!isEditMode);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id || !organizationData?.id) return;

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

    setUploadError(null);

    // Create preview and open crop modal
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageToCrop(e.target?.result as string);
      setCropType('logo');
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    
    // Clear the file input so the same file can be selected again
    event.target.value = '';
  };

  const handleCroppedLogo = async (croppedBlob: Blob) => {
    if (!user?.id || !organizationData?.id) return;

    setIsUploadingLogo(true);
    try {
      const fileExt = 'jpg'; // We output JPEG from the cropper
      const filePath = `organizer-logos/${organizationData.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('organizer-media')
        .upload(filePath, croppedBlob, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('organizer-media')
        .getPublicUrl(filePath);
      
      // Create preview from blob
      setLogoPreview(URL.createObjectURL(croppedBlob));
      
      // Save the public URL to database
      await updateOrganizationData({ logo_url: publicUrl });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.showError('Upload Failed', 'Failed to upload logo');
      setLogoPreview(null);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id || !organizationData?.id) return;

    // Validate file size (5MB max for original before cropping)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setBannerUploadError('Image must be less than 5MB');
      event.target.value = ''; // Clear the input
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setBannerUploadError('Please select a valid image file');
      event.target.value = '';
      return;
    }

    setBannerUploadError(null);

    // Create preview and open crop modal
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageToCrop(e.target?.result as string);
      setCropType('banner');
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    
    // Clear the file input
    event.target.value = '';
  };

  const handleCroppedBanner = async (croppedBlob: Blob) => {
    if (!user?.id || !organizationData?.id) return;

    setIsUploadingBanner(true);
    try {
      const fileExt = 'jpg'; // We output JPEG from the cropper
      const filePath = `organizer-banners/${organizationData.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('organizer-media')
        .upload(filePath, croppedBlob, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('organizer-media')
        .getPublicUrl(filePath);
      
      // Create preview from blob
      setBannerPreview(URL.createObjectURL(croppedBlob));
      
      // Save the public URL to database
      await updateOrganizationData({ banner_url: publicUrl });
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.showError('Upload Failed', 'Failed to upload banner');
      setBannerPreview(null);
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!organizationData?.logo_url) return;

    setIsSaving(true);
    try {
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('organizer-media')
        .remove([organizationData.logo_url]);
      
      if (deleteError) throw deleteError;
      
      // Update database to clear the image URL
      await updateOrganizationData({ logo_url: null });
      setLogoPreview(null);
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast.showError('Delete Failed', 'Failed to remove logo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBanner = async () => {
    if (!organizationData?.banner_url) return;

    setIsSaving(true);
    try {
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('organizer-media')
        .remove([organizationData.banner_url]);
      
      if (deleteError) throw deleteError;
      
      // Update database to clear the image URL
      await updateOrganizationData({ banner_url: null });
      setBannerPreview(null);
      setDeleteConfirmation(null);
    } catch (error) {
      console.error('Error deleting banner:', error);
      toast.showError('Delete Failed', 'Failed to remove banner');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!organizationData) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">Organizer Profile Not Found</h3>
              <p className="text-red-800 mb-4">
                Your organizer profile could not be loaded. This might indicate a configuration issue. 
                Please contact support if the problem persists.
              </p>
              <p className="text-sm text-red-700">
                User ID: {user?.id}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Organization Profile</h2>
        <p className="text-sm sm:text-base text-gray-600">Manage your organization information and public profile.</p>
      </div>
      
      {roleContext?.isOrganizer && roleContext?.isVenueOwner && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Dual business account:</strong> This organization profile is shared between 
            your organizer and venue owner roles.
          </p>
        </div>
      )}
      
      {!organizationData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800">
            No organization profile found. Create one to customize your public profile.
          </p>
        </div>
      )}
      
      <div className="space-y-8">
        {/* Basic Information */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Building className="h-5 w-5 text-primary" />
            Basic Information
          </h3>
          
          {/* Banner Upload */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Cover Banner
            </label>
            <div className="space-y-4">
              <div className="w-full aspect-[16/5] md:aspect-[16/4] rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gradient-to-r from-primary/10 to-primary-dark/10 overflow-hidden relative">
                {bannerPreview || organizationData?.banner_url ? (
                  <Image 
                    src={bannerPreview || organizationData?.banner_url} 
                    alt="Organization banner" 
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="absolute inset-0 object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <Building className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Upload a cover banner</p>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="w-full sm:w-auto">
                  <input
                    type="file"
                    id="banner-upload"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    className="hidden"
                    disabled={isSaving}
                  />
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                    <label
                      htmlFor="banner-upload"
                      className={`inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                        isUploadingBanner ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Upload className="h-4 w-4" />
                      {isUploadingBanner ? 'Uploading...' : 'Upload Banner'}
                    </label>
                    {organizationData?.banner_url && (
                      <button
                        onClick={() => setDeleteConfirmation('banner')}
                        disabled={isUploadingBanner || isSaving}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-center sm:text-right">
                  <p className="text-sm text-gray-500">
                    PNG, JPG up to 5MB. Recommended: 1200x300px
                  </p>
                  {bannerUploadError && (
                    <p className="text-sm text-red-600 mt-1">{bannerUploadError}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Logo Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-3 text-center sm:text-left">
                Organization Logo
              </label>
              <div className="flex flex-col items-center sm:items-start gap-4">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative">
                  {logoPreview || organizationData?.logo_url ? (
                    <Image 
                      src={logoPreview || organizationData?.logo_url} 
                      alt="Organization logo" 
                      fill
                      sizes="(max-width: 640px) 112px, 128px"
                      className="absolute inset-0 object-cover"
                    />
                  ) : (
                    <Building className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="w-full sm:w-auto">
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={isSaving}
                  />
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 mb-3">
                    <label
                      htmlFor="logo-upload"
                      className={`inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                        isUploadingLogo ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Upload className="h-4 w-4" />
                      {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    </label>
                    {organizationData?.logo_url && (
                      <button
                        onClick={() => setDeleteConfirmation('logo')}
                        disabled={isUploadingLogo || isSaving}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-sm text-gray-500">
                      PNG, JPG up to 5MB. Recommended: 400x400px
                    </p>
                    {uploadError && (
                      <p className="text-sm text-red-600 mt-1">{uploadError}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Edit Button - Only show when not in edit mode */}
            {!isEditMode && (
              <div className="md:col-span-2 mt-4">
                <button
                  onClick={toggleEditMode}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit Organization Info
                </button>
              </div>
            )}
            
            {/* Organization Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={isEditMode ? formData?.business_name : organizationData?.business_name || ''}
                onChange={(e) => handleInputChange('business_name', e.target.value)}
                disabled={!isEditMode || isSaving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Your organization name"
              />
            </div>
            
            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <div className="relative">
                <Link className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  type="url"
                  value={isEditMode ? formData?.business_website : organizationData?.business_website || ''}
                  onChange={(e) => handleInputChange('business_website', e.target.value)}
                  disabled={!isEditMode || isSaving}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>
            
            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                value={isEditMode ? formData?.business_description : organizationData?.business_description || ''}
                onChange={(e) => handleInputChange('business_description', e.target.value)}
                disabled={!isEditMode || isSaving}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Tell people about your organization..."
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Contact Information
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Email
              </label>
              <input
                type="email"
                value={isEditMode ? formData?.contact_email : organizationData?.contact_email || ''}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                disabled={!isEditMode || isSaving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="contact@yourorganization.com"
              />
            </div>
            
            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Phone
              </label>
              <input
                type="tel"
                value={isEditMode ? formData?.business_phone : organizationData?.business_phone || ''}
                onChange={(e) => handleInputChange('business_phone', e.target.value)}
                disabled={!isEditMode || isSaving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="+233 123 456 789"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons - Only show when in edit mode */}
      {isEditMode && (
        <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Delete Logo Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation === 'logo'}
        title="Remove Logo"
        message="Are you sure you want to remove your organization logo? This action cannot be undone."
        confirmText="Remove Logo"
        cancelText="Cancel"
        isLoading={isSaving}
        onConfirm={handleDeleteLogo}
        onClose={() => setDeleteConfirmation(null)}
        isDangerous={true}
      />

      {/* Delete Banner Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation === 'banner'}
        title="Remove Banner"
        message="Are you sure you want to remove your organization banner? This action cannot be undone."
        confirmText="Remove Banner"
        cancelText="Cancel"
        isLoading={isSaving}
        onConfirm={handleDeleteBanner}
        onClose={() => setDeleteConfirmation(null)}
        isDangerous={true}
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
          onCropComplete={cropType === 'logo' ? handleCroppedLogo : handleCroppedBanner}
          aspect={cropType === 'logo' ? 1 : 16 / 9}
          cropShape={cropType === 'logo' ? 'round' : 'rect'}
          title={cropType === 'logo' ? 'Position Logo' : 'Position Banner'}
        />
      )}
    </div>
  );
}
