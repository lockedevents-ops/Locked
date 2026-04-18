import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client/client';
import { 
  Profile, 
  ProfileUpdatePayload, 
  ProfileError,
  ProfileCompletionStatus,
  PublicProfile,
  ProfileSearchParams,
  ProfileSearchResult
} from '../types/profile';
import { profileUpdateSchema, validateProfileSection } from '../schemas/profile';
import { useToast } from '@/hooks/useToast';

export const useProfile = (userId?: string) => {
  const { user, refreshUserProfile } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false); // Start as false, only show on first fetch
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<ProfileError | null>(null);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [cacheExpiry, setCacheExpiry] = useState<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes - matches event data caching
  const toast = useToast();

  const targetUserId = userId || user?.id;
  const supabase = createClient();

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    // If we lost the user id (e.g., transient session refresh), clear loading to avoid infinite spinner
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    // Check cache expiry - use cached data if still fresh
    const now = Date.now();
    if (hasFetchedOnce && profile && now < cacheExpiry) {
      console.log('📦 Using cached profile data (fresh for', Math.round((cacheExpiry - now) / 1000), 'more seconds)');
      return;
    }

    // Show loading only on first fetch or after cache expires
    setLoading(true);
    
    try {
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      setProfile(data);
      setHasFetchedOnce(true); // Mark as fetched to prevent refetch on remount
      setCacheExpiry(Date.now() + CACHE_DURATION); // Cache expires in 5 minutes
    } catch (err: any) {
      const profileError: ProfileError = {
        code: err.code || 'FETCH_ERROR',
        message: err.message || 'Failed to fetch profile',
      };
      setError(profileError);
      setHasFetchedOnce(true); // Mark as fetched even on error to prevent infinite retries
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  // Update profile data
  const updateProfile = useCallback(async (updates: ProfileUpdatePayload): Promise<boolean> => {
    if (!user?.id) {
      toast.showError('Authentication required');
      return false;
    }

    // Only allow users to update their own profile
    if (targetUserId !== user.id) {
      toast.showError('You can only update your own profile');
      return false;
    }

    try {
      setUpdating(true);
      setError(null);

      // Validate the updates
      const validation = profileUpdateSchema.safeParse(updates);
      if (!validation.success) {
        const errors = validation.error.issues;
        const firstError = errors && errors.length > 0 ? errors[0] : null;
        const errorMessage = firstError?.message || 'Validation failed';
        throw new Error(errorMessage);
      }

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      setProfile(data);
      // Invalidate cache to force recalculation on next fetch
      setCacheExpiry(0);
      toast.showSuccess('Profile updated successfully');
      return true;
    } catch (err: any) {
      const profileError: ProfileError = {
        code: err.code || 'UPDATE_ERROR',
        message: err.message || 'Failed to update profile',
      };
      setError(profileError);
      toast.showError(profileError.message);
      console.error('Error updating profile:', err);
      return false;
    } finally {
      setUpdating(false);
    }
  }, [user?.id, targetUserId]);

  // Update specific profile section
  const updateProfileSection = useCallback(async (
    section: 'basic' | 'address' | 'emergency' | 'professional' | 'personal' | 'privacy',
    data: Record<string, any>
  ): Promise<boolean> => {
    if (!user?.id) {
      toast.showError('Authentication required');
      return false;
    }

    console.log('=== UPDATE PROFILE SECTION CALLED ===', { section, data });

    try {
      setUpdating(true);
      setError(null);

      // Basic client-side validation
      if (data.email && !data.email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }
      
      if (data.phone_number && data.phone_number.length > 0) {
        const phonePattern = /^(\+233|0)[2-9]\d{8}$/;
        if (!phonePattern.test(data.phone_number.replace(/\s/g, ''))) {
          throw new Error('Please enter a valid Ghanaian phone number');
        }
      }

      // Update profile section directly (skip complex schema validation)
      // Convert empty strings to null for optional fields (allows clearing fields)
      // Required fields like full_name, email should be validated in the UI
      const cleanData = Object.fromEntries(
        Object.entries(data)
          .filter(([key, value]) => value !== undefined) // Remove undefined, but keep empty strings
          .map(([key, value]) => [key, value === '' ? null : value]) // Convert empty to null
      );

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update(cleanData)
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Client-side completion check (all 22 fields from Personal Information tab)
      const requiredFields = [
        'avatar_url',
        'full_name', 'email', 'phone_number', 'date_of_birth', 'gender',
        'nationality', 'marital_status', 'birth_city', 'birth_country',
        'address_line_1', 'city', 'region', 'postal_code', 'country',
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
        'bio', 'interests', 'languages'
      ];
      
      
      // Check if profile was complete before update
      const wasComplete = profile && requiredFields.every(field => {
        const value = profile[field as keyof Profile];
        if (Array.isArray(value)) return value.length > 0;
        return value !== null && value !== undefined && value !== '';
      });
      
      // Check if profile is complete after update
      const isNowComplete = updatedProfile && requiredFields.every(field => {
        const value = updatedProfile[field as keyof Profile];
        if (Array.isArray(value)) return value.length > 0;
        return value !== null && value !== undefined && value !== '';
      });
      
      // Debug info
      const missingBefore = profile ? requiredFields.filter(field => {
        const value = profile[field as keyof Profile];
        if (Array.isArray(value)) return value.length === 0;
        return value === null || value === undefined || value === '';
      }) : requiredFields;
      
      const missingAfter = updatedProfile ? requiredFields.filter(field => {
        const value = updatedProfile[field as keyof Profile];
        if (Array.isArray(value)) return value.length === 0;
        return value === null || value === undefined || value === '';
      }) : requiredFields;
      
      setProfile(updatedProfile);
      // Invalidate cache to force recalculation on next fetch
      setCacheExpiry(0);
      toast.showSuccess('Profile section updated successfully');
      
      // Debug notification
      if (missingAfter.length > 0) {
        setTimeout(() => {
          toast.showInfo(`Profile ${Math.round(((22 - missingAfter.length) / 22) * 100)}% complete. Missing: ${missingAfter.join(', ')}`);
        }, 500);
      }
      
      // If profile just reached 100% completion, show modal IMMEDIATELY
      if (!wasComplete && isNowComplete && user?.id) {
        toast.showSuccess('🎉 Profile 100% complete! Showing reward...');
        
        // Import keys store
        import('@/store/keysStore').then(({ useKeysStore }) => {
          // Show modal immediately with expected reward
          useKeysStore.getState().setUnseenEarnings({
            id: crypto.randomUUID(),
            user_id: user.id,
            amount: 10,
            activity_type: 'profile_completion',
            description: 'Profile Completion Reward',
            metadata: {},
            is_read: false,
            created_at: new Date().toISOString()
          } as any);
          
          // Fetch actual keys from DB in background
          setTimeout(() => {
            useKeysStore.getState().fetchKeys(user.id);
          }, 1000);
        });
      }
      
      return true;
    } catch (err: any) {
      const profileError: ProfileError = {
        code: err.code || 'SECTION_UPDATE_ERROR',
        message: err.message || `Failed to update ${section} section`,
      };
      setError(profileError);
      toast.showError(profileError.message);
      console.error(`Error updating ${section} section:`, err);
      return false;
    } finally {
      setUpdating(false);
    }
  }, [user?.id]);

  // Upload avatar
  const uploadAvatar = useCallback(async (file: File): Promise<boolean> => {
    if (!user?.id) {
      toast.showError('Authentication required');
      return false;
    }

    try {
      setUpdating(true);
      setError(null);

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be less than 5MB');
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/avatars/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL directly
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
        .select()
        .single(); // ✅ Returns single object instead of array
      
      if (updateError) {
        console.error('Error updating avatar:', updateError);
        throw updateError;
      }
      
      setProfile(updatedProfile);
      const success = true;
      
      if (success) {
        toast.showSuccess('Avatar updated successfully');
        // Refresh auth context so navbar updates immediately
        await refreshUserProfile();
      }
      
      return success;
    } catch (err: any) {
      const profileError: ProfileError = {
        code: err.code || 'AVATAR_UPLOAD_ERROR',
        message: err.message || 'Failed to upload avatar',
      };
      setError(profileError);
      toast.showError(profileError.message);
      console.error('Error uploading avatar:', err);
      return false;
    } finally {
      setUpdating(false);
    }
  }, [user?.id]);

  // Delete avatar
  const deleteAvatar = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !profile?.avatar_url) {
      return false;
    }

    try {
      setUpdating(true);
      
      // Extract file path from URL
      const url = new URL(profile.avatar_url);
      // Get the full path after the bucket name
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.indexOf('user-avatars');
      
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        // Get the path after the bucket name
        const filePath = pathParts.slice(bucketIndex + 1).join('/');
        
        // Delete from storage
        await supabase.storage
          .from('user-avatars')
          .remove([filePath]);
      }

      // Update profile to remove avatar URL directly
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)
        .select()
        .single();
      
      if (updateError) {
        throw updateError;
      }
      
      setProfile(updatedProfile);
      toast.showSuccess('Avatar removed successfully');
      // Refresh auth context so navbar updates immediately
      await refreshUserProfile();
      return true;
    } catch (err: any) {
      toast.showError('Failed to remove avatar');
      console.error('Error removing avatar:', err);
      return false;
    } finally {
      setUpdating(false);
    }
  }, [user?.id, profile?.avatar_url]);

  // Calculate profile completion status
  const getCompletionStatus = useCallback((): ProfileCompletionStatus => {
    if (!profile) {
      return {
        percentage: 0,
        isComplete: false,
        missingFields: [],
        completedFields: [],
        lastUpdated: null,
      };
    }

    // Required fields for 100% profile completion
    // All fields from the Personal Information tab
    const requiredFields = [
      // Avatar
      'avatar_url',
      // Basic Information
      'full_name', 'email', 'phone_number', 'date_of_birth', 'gender',
      'nationality', 'marital_status', 'birth_city', 'birth_country',
      // Address Information
      'address_line_1', 'city', 'region', 'postal_code', 'country',
      // Emergency Contact
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
      // Personal Details
      'bio', 'interests', 'languages'
    ];

    const completedFields = requiredFields.filter(field => {
      const value = profile[field as keyof Profile];
      // For arrays (interests, languages), check if they have at least one item
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== null && value !== undefined && value !== '';
    });

    const missingFields = requiredFields.filter(field => {
      const value = profile[field as keyof Profile];
      // For arrays, check if empty
      if (Array.isArray(value)) {
        return value.length === 0;
      }
      return value === null || value === undefined || value === '';
    });

    // Calculate percentage based on completed fields
    const percentage = Math.round((completedFields.length / requiredFields.length) * 100);
    const isComplete = percentage >= 80;

    return {
      percentage,
      isComplete,
      missingFields,
      completedFields,
      lastUpdated: profile.updated_at || null,
    };
  }, [profile]);

  // Initialize profile fetch - only fetch once
  useEffect(() => {
    if (!hasFetchedOnce) {
      fetchProfile();
    } else {
      // If already fetched, just clear loading state
      setLoading(false);
    }
  }, [fetchProfile, hasFetchedOnce]);

  return {
    profile,
    loading,
    updating,
    error,
    fetchProfile,
    updateProfile,
    updateProfileSection,
    uploadAvatar,
    deleteAvatar,
    getCompletionStatus,
    refreshProfile: fetchProfile,
  };
};

// Hook for searching public profiles
export const useProfileSearch = () => {
  const supabase = createClient();
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ProfileError | null>(null);

  const searchProfiles = useCallback(async (params: ProfileSearchParams) => {

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('public_profiles')
        .select('*');

      // Apply filters
      if (params.query) {
        const { data, error: searchError } = await supabase
          .rpc('search_profiles', { search_term: params.query });

        if (searchError) throw searchError;
        
        setResults(data || []);
        return;
      }

      if (params.city) {
        query = query.ilike('city', `%${params.city}%`);
      }

      if (params.region) {
        query = query.eq('region', params.region);
      }

      if (params.occupation) {
        query = query.ilike('occupation', `%${params.occupation}%`);
      }

      if (params.minCompletionPercentage) {
        query = query.gte('profile_completion_percentage', params.minCompletionPercentage);
      }

      // Apply interests filter
      if (params.interests && params.interests.length > 0) {
        query = query.overlaps('interests', params.interests);
      }

      // Order by completion percentage and recency
      query = query.order('profile_completion_percentage', { ascending: false })
                   .order('updated_at', { ascending: false })
                   .limit(50);

      const { data, error: searchError } = await query;

      if (searchError) {
        throw searchError;
      }

      setResults(data || []);
    } catch (err: any) {
      const profileError: ProfileError = {
        code: err.code || 'SEARCH_ERROR',
        message: err.message || 'Failed to search profiles',
      };
      setError(profileError);
      console.error('Error searching profiles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    searchProfiles,
    clearResults,
  };
};

// Hook for getting public profile data
export const usePublicProfile = (userId: string) => {
  const supabase = createClient();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ProfileError | null>(null);

  const fetchPublicProfile = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('public_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();


      if (fetchError) {
        throw fetchError;
      }

      setProfile(data);
    } catch (err: any) {
      const profileError: ProfileError = {
        code: err.code || 'PUBLIC_PROFILE_FETCH_ERROR',
        message: err.message || 'Failed to fetch public profile',
      };
      setError(profileError);
      console.error('Error fetching public profile:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchPublicProfile();
  }, [fetchPublicProfile]);

  return {
    profile,
    loading,
    error,
    refetch: fetchPublicProfile,
  };
};

// Custom hook for profile completion tracking
export const useProfileCompletion = () => {
  const { profile } = useProfile();
  const [completionStatus, setCompletionStatus] = useState<ProfileCompletionStatus>({
    percentage: 0,
    isComplete: false,
    missingFields: [],
    completedFields: [],
    lastUpdated: null,
  });

  useEffect(() => {
    if (!profile) return;

    // Required fields for 100% profile completion
    // All fields from the Personal Information tab
    const requiredFields = [
      // Avatar
      'avatar_url',
      // Basic Information
      'full_name', 'email', 'phone_number', 'date_of_birth', 'gender',
      'nationality', 'marital_status', 'birth_city', 'birth_country',
      // Address Information
      'address_line_1', 'city', 'region', 'postal_code', 'country',
      // Emergency Contact
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
      // Personal Details
      'bio', 'interests', 'languages'
    ];

    const completedFields = requiredFields.filter(field => {
      const value = profile[field as keyof Profile];
      // For arrays (interests, languages), check if they have at least one item
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== null && value !== undefined && value !== '';
    });

    const missingFields = requiredFields.filter(field => {
      const value = profile[field as keyof Profile];
      // For arrays, check if empty
      if (Array.isArray(value)) {
        return value.length === 0;
      }
      return value === null || value === undefined || value === '';
    });

    setCompletionStatus({
      percentage: profile.profile_completion_percentage || 0,
      isComplete: profile.is_profile_complete || false,
      missingFields,
      completedFields,
      lastUpdated: profile.last_profile_update,
    });
  }, [profile]);

  return completionStatus;
};
