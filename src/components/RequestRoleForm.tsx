"use client";

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client/client';
import { adminNotificationService } from '@/services/notificationService';
import { verificationService } from '@/services/verificationService';
import { useToast } from '@/hooks/useToast';
import {
  AlertTriangle,
  CheckCircle,
  Upload,
  Clock,
  Building,
  FileText,
  Shield,
  Info,
  ArrowRight,
  Home,
  ArrowLeft,
  Ban,
  Mail,
  RefreshCw,
  User
} from 'lucide-react';
import Link from 'next/link';
import { isVenuesEnabled } from '@/lib/network';

interface RequestRoleFormProps {
  role: 'Organizer' | 'VenueOwner';
  onRequestSubmitted?: () => void;
}

interface FileState {
  file: File | null;
  preview: string | null;
}

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function RequestRoleForm({ role, onRequestSubmitted }: RequestRoleFormProps) {
  const toast = useToast();
  const venuesEnabled = isVenuesEnabled();
  const [formData, setFormData] = useState({
    companyName: '',
    businessEmail: '',
    businessPhone: '',
    additionalContact: '',
    businessCategory: 'Events',
    idType: 'national_id',
    idNumber: 'GHA-',
    reason: '',
    // New fields for Ghana Card verification
    surname: '',
    firstnames: '',
    gender: '',
    dateOfBirth: '',
  });

  const [isDevMode, setIsDevMode] = useState(false);

  const [idImage, setIdImage] = useState<FileState>({ file: null, preview: null });
  const [selfieWithId, setSelfieWithId] = useState<FileState>({ file: null, preview: null });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [hasPending, setHasPending] = useState(false);
  const [hasRevoked, setHasRevoked] = useState(false);
  const [revokedAt, setRevokedAt] = useState<string | null>(null);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [signedIdUrl, setSignedIdUrl] = useState<string | null>(null);
  const [signedSelfieUrl, setSignedSelfieUrl] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    companyName?: string;
    businessEmail?: string;
    idNumber?: string;
    age?: string;
  }>({});

  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  // ID Verification state
  const [isVerifyingId, setIsVerifyingId] = useState(false);
  const [idVerificationResult, setIdVerificationResult] = useState<{
    isValid: boolean;
    score: string;
  } | null>(null);

  const idImageRef = useRef<HTMLInputElement>(null);
  const selfieWithIdRef = useRef<HTMLInputElement>(null);
  
  // Clear specific validation errors when user starts making changes
  useEffect(() => {
    if (validationErrors.companyName || validationErrors.businessEmail || validationErrors.idNumber) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.companyName;
        delete newErrors.businessEmail;
        delete newErrors.idNumber;
        return newErrors;
      });
    }
  }, [formData.companyName, formData.businessEmail, formData.idNumber]);

  // Instant Age Validation
  useEffect(() => {
    if (formData.dateOfBirth) {
      const age = calculateAge(formData.dateOfBirth);
      if (age < 16) {
        setValidationErrors(prev => ({ 
          ...prev, 
          age: 'You must be at least 16 years old to apply for this role.' 
        }));
      } else {
        setValidationErrors(prev => {
          const { age: _, ...rest } = prev;
          return rest;
        });
      }
    } else {
      setValidationErrors(prev => {
        const { age: _, ...rest } = prev;
        return rest;
      });
    }
  }, [formData.dateOfBirth]);

  // Check for existing pending requests AND revoked roles
  useEffect(() => {
    const checkExistingRequest = async () => {
      setIsCheckingStatus(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsCheckingStatus(false);
          return;
        }

        const requestType = role === 'Organizer' ? 'organizer' : 'venue_owner';
        
        // Check for revoked role first (blocks reapplication)
        const { data: revokedRole } = await supabase
          .from('user_roles')
          .select('revoked_at, reinstated_at')
          .eq('user_id', user.id)
          .eq('role', requestType)
          .not('revoked_at', 'is', null)
          .maybeSingle();
        
        // If role was revoked AND not reinstated, block reapplication
        if (revokedRole && !revokedRole.reinstated_at) {
          setHasRevoked(true);
          setRevokedAt(revokedRole.revoked_at);
          setIsCheckingStatus(false);
          return; // Exit early - don't check for pending requests
        }
        
        const { data, error } = await supabase
          .from('role_requests')
          .select('*')
          .eq('user_id', user.id)
          .eq('request_type', requestType)
          .eq('status', 'pending')
          .limit(1);

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error checking existing requests:', error);
          setIsCheckingStatus(false);
          return;
        }

        if (data && data.length > 0) {
          const request = data[0];
          setHasPending(true);
          setExistingRequest({
            id: request.id,
            companyName: request.company_name,
            businessEmail: request.business_email,
            businessPhone: request.business_phone,
            idType: request.id_type,
            idNumber: request.id_number,
            reason: request.reason,
            idImage: request.id_image_url,
            selfieWithId: request.selfie_with_id_url,
            createdAt: request.submitted_at || request.created_at,
            status: request.status
          });
        }
      } catch (error) {
        console.error('Error checking for existing requests:', error);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    checkExistingRequest();
  }, [role]);

  // Create signed URLs for existing request images (if bucket is private)
  useEffect(() => {
    const generateSigned = async () => {
      try {
        if (!existingRequest) {
          setSignedIdUrl(null);
          setSignedSelfieUrl(null);
          return;
        }
        const supabase = createClient();
        const toPath = (urlOrPath?: string) => {
          if (!urlOrPath) return null;
          try {
            if (urlOrPath.startsWith('http')) {
              const u = new URL(urlOrPath);
              const parts = u.pathname.split('/');
              const idx = parts.findIndex(p => p === 'role-requests');
              if (idx !== -1 && parts.length > idx + 1) {
                return parts.slice(idx + 1).join('/');
              }
              return null;
            }
          } catch {}
          return urlOrPath.replace(/^\/?role-requests\//, '');
        };

        const idPath = toPath(existingRequest.idImage);
        const selfiePath = toPath(existingRequest.selfieWithId);

        if (idPath) {
          const { data, error } = await supabase.storage.from('role-requests').createSignedUrl(idPath, 60 * 60);
          setSignedIdUrl(!error && data?.signedUrl ? data.signedUrl : null);
        } else {
          setSignedIdUrl(null);
        }

        if (selfiePath) {
          const { data, error } = await supabase.storage.from('role-requests').createSignedUrl(selfiePath, 60 * 60);
          setSignedSelfieUrl(!error && data?.signedUrl ? data.signedUrl : null);
        } else {
          setSignedSelfieUrl(null);
        }
      } catch (e) {
        // Non-fatal; fall back to stored URLs
      }
    };

    generateSigned();
  }, [existingRequest?.idImage, existingRequest?.selfieWithId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'businessPhone' || name === 'additionalContact') {
      // Allow only numbers and limit to 10 digits
      const numbersOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({
        ...prev,
        [name]: numbersOnly
      }));
      return;
    }
    
    if (name === 'idNumber') {
      // Allow only numbers and format as 10 digits with a hyphen after the 9th
      let numbers = value.replace(/\D/g, '').slice(0, 10); // Get only first 10 digits
      
      // Format as 123456789-0
      let formattedValue = numbers;
      if (numbers.length > 9) {
        formattedValue = `${numbers.slice(0, 9)}-${numbers[9]}`;
      }
      
      // Prepend GHA- if not present
      if (!formattedValue.startsWith('GHA-')) {
        formattedValue = 'GHA-' + formattedValue;
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: formattedValue
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Step 1 validation
  const isStep1Valid = () => {
    const isPhoneValid = /^\d{10}$/.test(formData.businessPhone);
    return (
      formData.companyName.trim() &&
      formData.businessEmail.trim() &&
      isPhoneValid &&
      formData.businessCategory.trim() &&
      formData.reason.trim()
    );
  };

  // Step 2 validation (ID verification fields + images)
  const isStep2Valid = () => {
    const idNumberRegex = /^GHA-\d{9}-\d$/;
    const isIdValid = idNumberRegex.test(formData.idNumber);
    const age = calculateAge(formData.dateOfBirth);
    const hasValidationErrors = Object.values(validationErrors).some(error => error !== undefined && error !== '');
    
    return (
      isIdValid &&
      formData.surname.trim() &&
      formData.firstnames.trim() &&
      formData.gender &&
      formData.dateOfBirth &&
      age >= 16 &&
      idImage.file &&
      selfieWithId.file &&
      !hasValidationErrors
    );
  };

  const isFormValid = () => {
    return isStep1Valid() && isStep2Valid();
  };

  // Auto-verify Ghana Card when all required fields are filled
  const canVerifyGhanaCard = () => {
    const idNumberRegex = /^GHA-\d{9}-\d$/;
    return (
      idNumberRegex.test(formData.idNumber) &&
      formData.surname.trim() &&
      formData.firstnames.trim() &&
      formData.gender &&
      formData.dateOfBirth
    );
  };

  // Manual Ghana Card verification (called on submit)
  const verifyGhanaCard = async (): Promise<boolean> => {
    if (!canVerifyGhanaCard()) {
      toast.showError('Missing Details', 'Please fill in all ID verification fields.');
      return false;
    }
    
    setIsVerifyingId(true);
    setIdVerificationResult(null);
    
    try {
      // Format date from yyyy-mm-dd to dd/mm/yyyy for API
      const [year, month, day] = formData.dateOfBirth.split('-');
      const formattedDob = `${day}/${month}/${year}`;
      
      const result = await verificationService.verifyGhanaCard(
        formData.idNumber,
        formData.surname,
        formData.firstnames,
        formData.gender,
        formattedDob
      );
      
      setIdVerificationResult(result);
      
      if (result.isValid) {
        toast.showSuccess('ID Verified', `Ghana Card verified with ${result.score} match score`);
        return true;
      } else {
        toast.showError('Verification Failed', 'The details do not match the Ghana Card registry. Please ensure all details match exactly as on your card.');
        return false;
      }
    } catch (error) {
      console.error('Ghana Card verification error:', error);
      toast.showError('Verification Error', 'Could not verify Ghana Card. Please try again.');
      setIdVerificationResult(null);
      return false;
    } finally {
      setIsVerifyingId(false);
    }
  };

  // Validate for duplicate company details
  const validateDuplicates = async () => {
    const errors: typeof validationErrors = {};
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return errors;
      
      const requestType = role === 'Organizer' ? 'organizer' : 'venue_owner';
      
      // Check for existing company name (case-insensitive)
      if (formData.companyName.trim()) {
        const { data: companyData, error: companyError } = await supabase
          .from('role_requests')
          .select('id, user_id, status')
          .ilike('company_name', formData.companyName.trim())
          .neq('user_id', user.id) // Exclude current user's requests
          .in('status', ['pending', 'approved']); // Only check active requests
          
        if (!companyError && companyData && companyData.length > 0) {
          errors.companyName = 'This company name is already registered. If you believe this is a mistake, please contact support.';
        }
      }
      
      // Check for existing business email (case-insensitive)
      if (formData.businessEmail.trim()) {
        const { data: emailData, error: emailError } = await supabase
          .from('role_requests')
          .select('id, user_id, status')
          .ilike('business_email', formData.businessEmail.trim())
          .neq('user_id', user.id) // Exclude current user's requests
          .in('status', ['pending', 'approved']); // Only check active requests
          
        if (!emailError && emailData && emailData.length > 0) {
          errors.businessEmail = 'This business email is already registered. If you believe this is a mistake, please contact support.';
        }
      }
      
      // Check for existing ID number (case-insensitive)
      if (formData.idNumber.trim()) {
        const { data: idData, error: idError } = await supabase
          .from('role_requests')
          .select('id, user_id, status')
          .ilike('id_number', formData.idNumber.trim())
          .neq('user_id', user.id) // Exclude current user's requests
          .in('status', ['pending', 'approved']); // Only check active requests
          
        if (!idError && idData && idData.length > 0) {
          errors.idNumber = 'This ID number is already registered. If you believe this is a mistake, please contact support.';
        }
      }
      
    } catch (error) {
      console.error('Error validating duplicates:', error);
      // Don't block submission if validation fails, just log the error
    }
    
    return errors;
  };

  const handleFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<FileState>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size (5MB = 5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      toast.showError('File Too Large', `File size must be less than 5MB. Current size: ${formatFileSize(file.size)}`);
      e.target.value = ''; // Clear the input
      return;
    }
    
    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      toast.showError('Invalid File Type', 'Please select an image file (JPEG, PNG, WebP, etc.)');
      e.target.value = ''; // Clear the input
      return;
    }
    
    const url = URL.createObjectURL(file);
    setter({ file, preview: url });
  };

  // Upload file to Supabase Storage
  const uploadFileToSupabase = async (file: File, folder: string): Promise<string | null> => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('role-requests')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get the public URL
      const { data } = supabase.storage
        .from('role-requests')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (role === 'VenueOwner' && !venuesEnabled) {
      toast.showInfo('Temporarily Unavailable', 'Venue owner requests are currently disabled.');
      return;
    }
    
    if (isSubmitting) return;

    // Logic handle: If they press Enter on Step 1, move to Step 2 if valid
    if (currentStep < totalSteps) {
      if (isStep1Valid()) {
        setCurrentStep(currentStep + 1);
      } else {
        toast.showError('Incomplete Information', 'Please fill in all required business details.');
      }
      return;
    }

    if (hasPending) {
      toast.showInfo('Pending Request', 'A request is already pending review.');
      return;
    }
    
    // Final Age Validation Check
    const age = calculateAge(formData.dateOfBirth);
    if (age < 16) {
      setValidationErrors(prev => ({ ...prev, age: 'You must be at least 16 years old to apply for this role.' }));
      toast.showError('Age Validation Failed', 'You must be at least 16 years old to apply for this role.');
      return;
    }
    
    if (!isFormValid()) {
      toast.showError('Incomplete Form', 'Complete all required fields and verification.');
      return;
    }
    
    setIsSubmitting(true);
    
    // Validate for duplicates before submission
    const duplicateErrors = await validateDuplicates();
    if (Object.keys(duplicateErrors).length > 0) {
      setValidationErrors(duplicateErrors);
      setIsSubmitting(false);
      toast.showError('Validation Error', 'Please resolve the validation errors before submitting.');
      return;
    }
    
    // Verify Ghana Card before submission (skip if dev mode)
    if (!isDevMode) {
      const isVerified = await verifyGhanaCard();
      if (!isVerified) {
        setIsSubmitting(false);
        return; // Verification failed, error toast already shown
      }
    } else {
      console.log('[DevMode] Skipping Ghana Card verification');
      toast.showInfo('Dev Mode', 'Skipping Ghana Card verification');
    }
    
    // Clear any previous validation errors
    setValidationErrors({});
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.showError('Not Authenticated', 'You must be logged in to submit a role request.');
        setIsSubmitting(false);
        return;
      }

      // Check if user is suspended
      if (user.user_metadata?.status === 'suspended') {
        toast.showError('Account Suspended', 'Your account is suspended. You cannot submit new role requests.');
        setIsSubmitting(false);
        return;
      }

      // ✅ SECURITY: Rate limiting - check for recent role requests in last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const requestType = role === 'Organizer' ? 'organizer' : 'venue_owner';
      
      const { data: recentRequests, error: rateLimitError } = await supabase
        .from('role_requests')
        .select('id, submitted_at, status')
        .eq('user_id', user.id)
        .eq('request_type', requestType)
        .gte('submitted_at', twentyFourHoursAgo)
        .order('submitted_at', { ascending: false });
      
      if (rateLimitError) {
        console.error('Error checking rate limit:', rateLimitError);
        // Continue with submission on error to avoid blocking legitimate requests
      } else if (recentRequests && recentRequests.length >= 3) {
        toast.showError(
          'Too Many Requests', 
          `You have submitted ${recentRequests.length} ${role.toLowerCase()} role requests in the last 24 hours. Please wait before submitting again.`
        );
        setIsSubmitting(false);
        return;
      }

      let idImageUrl: string | null = null;
      let selfieWithIdUrl: string | null = null;

      // Upload ID image
      if (idImage.file) {
        idImageUrl = await uploadFileToSupabase(idImage.file, 'id-documents');
      }

      // Upload selfie with ID
      if (selfieWithId.file) {
        selfieWithIdUrl = await uploadFileToSupabase(selfieWithId.file, 'selfie-documents');
      }
      
      // Insert role request via API to trigger email notification
      const response = await fetch('/api/role-requests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: requestType,
          company_name: formData.companyName,
          business_email: formData.businessEmail,
          business_phone: formData.businessPhone,
          additional_contact: formData.additionalContact || null,
          business_category: formData.businessCategory,
          id_type: formData.idType,
          id_number: formData.idNumber,
          id_image_url: idImageUrl,
          selfie_with_id_url: selfieWithIdUrl,
          organization_description: formData.reason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit request');
      }

      const { data } = await response.json();

      // Create the request object for state updates
      const newRequest = {
        id: data.id,
        companyName: data.company_name,
        businessEmail: data.business_email,
        businessPhone: data.business_phone,
        idType: data.id_type,
        idNumber: data.id_number,
        reason: data.organization_description,
        idImage: data.id_image_url,
        selfieWithId: data.selfie_with_id_url,
        createdAt: data.submitted_at || data.created_at || new Date().toISOString(),
        status: data.status
      };

      // Show success message and update state
      toast.showSuccess('Request Submitted', `${role} role request submitted successfully`);
      setHasPending(true);
      setExistingRequest(newRequest);
      onRequestSubmitted?.();
      
      // 🔔 Non-blocking: Notify admins about the new role request
      const roleLabel = requestType === 'organizer' ? 'Event Organizer' : 'Venue Owner';
      adminNotificationService.create({
        title: 'New Role Request Submitted',
        message: `${roleLabel} role request from ${user.user_metadata?.name || user.email} (${user.email}). Company: ${data.company_name}.`,
        type: 'role_request',
        link: '/admin/role-requests',
        meta: {
          requestId: data.id,
          requestType: requestType,
          userId: user.id
        }
      }).then(result => {
        if (result && result.length > 0) {
          console.log(`✅ Admin notification sent to ${result.length} admin(s)`);
        } else {
          console.warn('⚠️ No admin users found to notify');
        }
      }).catch(notifyErr => {
        console.warn('⚠️ Failed to send admin notification (non-blocking):', notifyErr);
      });
    } catch (err) {
      console.error('Error submitting role request:', err);
      toast.showError('Submission Failed', 'Failed to submit role request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show nothing while checking status (prevents form flash)
  if (isCheckingStatus) {
    return null;
  }

  if (role === 'VenueOwner' && !venuesEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          <div className="bg-neutral-50 border-2 border-neutral-200 rounded-xl p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center">
                <Building className="w-8 h-8 text-neutral-500" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-neutral-900 mb-2">Venue Owner Requests Paused</h3>
            <p className="text-neutral-700 mb-2">
              Venue owner onboarding is temporarily disabled while we focus on event workflows.
            </p>
            <p className="text-sm text-neutral-600">You can still request the Organizer role.</p>
          </div>
        </div>
      </div>
    );
  }

  // 🚨 REVOKED STATE: Block users with revoked roles from reapplying
  if (hasRevoked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
              <Ban className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          
          <h3 className="text-xl font-semibold text-red-900 dark:text-red-100 mb-2">
            Role Access Revoked
          </h3>
          
          <p className="text-red-700 dark:text-red-300 mb-4">
            Your <span className="font-medium">{role}</span> role was revoked on{' '}
            <span className="font-medium">
              {revokedAt ? new Date(revokedAt).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : 'a previous date'}
            </span>.
          </p>
          
          <p className="text-sm text-red-600 dark:text-red-400 mb-6">
            You cannot submit new role requests at this time.
          </p>
          
          <div className="bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              <span className="font-medium">Need to regain access?</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              If you believe this was a mistake or have resolved the issues that led to the revocation, 
              please contact our support team for review.
            </p>
            <a 
              href="mailto:support@yourplatform.com?subject=Role Revocation Appeal - User Request"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
            >
              <Mail className="w-4 h-4" />
              Contact Support
            </a>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Our support team will review your case and may reinstate your role if appropriate.
          </p>
        </div>
        </div>
      </div>
    );
  }

  // Pending state (integrated styling)
  if (hasPending && existingRequest) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:p-4">
          <div className="mt-0.5 rounded-full bg-amber-100 p-1.5 sm:p-2 shrink-0">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-amber-800">Request Pending Review</h2>
            <p className="text-xs sm:text-sm text-amber-700 mt-1">
              Your {role} role request was received on{' '}
              {new Date(existingRequest.createdAt).toLocaleString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}. You will be notified when a decision is made.
            </p>
          </div>
        </div>

        <div className="rounded-lg sm:rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-4 sm:px-5 py-3 sm:py-4 flex items-center gap-2">
            <div className="rounded-md bg-primary/10 p-1.5 sm:p-2">
              <Building className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold">Submitted Details</h3>
          </div>
          <div className="px-4 sm:px-5 py-4 sm:py-5 space-y-5 sm:space-y-6">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <InfoItem label="Company" value={existingRequest.companyName} />
              <InfoItem label="Business Email" value={existingRequest.businessEmail} />
              <InfoItem label="Business Phone" value={existingRequest.businessPhone} />
              <InfoItem label="ID Type" value={existingRequest.idType} />
              <InfoItem label="ID Number" value={existingRequest.idNumber} />
              {/* Only show reason field if status is not pending */}
              {existingRequest.reason && existingRequest.status !== 'pending' && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-neutral-500 mb-1">Reason</p>
                  <p className="rounded-md bg-neutral-50 p-3 text-xs sm:text-sm text-neutral-700 whitespace-pre-wrap break-words overflow-hidden max-w-full">
                    {existingRequest.reason}
                  </p>
                </div>
              )}
            </div>

            {/* Only show images if status is not pending */}
            {existingRequest.status !== 'pending' && (
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                {existingRequest.idImage && (
                  <PreviewThumb title="ID Image">
                    <img
                      src={signedIdUrl || existingRequest.idImage}
                      className="h-full w-full object-cover"
                      alt="ID"
                    />
                  </PreviewThumb>
                )}
                {existingRequest.selfieWithId && (
                  <PreviewThumb title="Selfie With ID">
                    <img
                      src={signedSelfieUrl || existingRequest.selfieWithId}
                      className="h-full w-full object-cover"
                      alt="Selfie with ID"
                    />
                  </PreviewThumb>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 border-t border-neutral-100 px-4 sm:px-5 py-3 sm:py-4">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
            <Link
              href="/dashboards/user"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">User Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 sm:space-y-8 rounded-lg sm:rounded-xl border border-neutral-200 bg-white p-4 sm:p-6 lg:p-8 shadow-sm"
    >
      {/* Header with Step Indicator */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 sm:p-3 shrink-0">
            <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900 mb-2">
              {role === 'VenueOwner' ? 'Venue Owner' : 'Organizer'} Role Request
            </h2>
            <p className="text-sm text-neutral-600">
              Step {currentStep} of {totalSteps}: {currentStep === 1 ? 'Business Information' : 'Identity Verification'}
            </p>
          </div>

          {/* Dev Mode Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Dev Mode</span>
            <button
              type="button"
              onClick={() => setIsDevMode(!isDevMode)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isDevMode ? 'bg-amber-600' : 'bg-neutral-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isDevMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
        
        {/* Step Indicator */}
        <div className="flex items-center gap-2 px-0 sm:px-2">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
            currentStep >= 1 ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-500'
          }`}>
            1
          </div>
          <div className={`flex-1 h-1 rounded-full transition-colors ${
            currentStep >= 2 ? 'bg-primary' : 'bg-neutral-200'
          }`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
            currentStep >= 2 ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-500'
          }`}>
            2
          </div>
        </div>
      </div>

      {/* STEP 1: Business Information */}
      {currentStep === 1 && (
        <Section title="Business Information" icon={<Building className="h-4 w-4" />}>
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2">
            <div>
              <Field
                label="Company Name"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                required
                placeholder="e.g. Event Nexus Ltd."
              />
              {validationErrors.companyName && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.companyName}</p>
              )}
            </div>
            <div>
              <Field
                label="Business Email"
                type="email"
                name="businessEmail"
                value={formData.businessEmail}
                onChange={handleChange}
                required
                placeholder="you@company.com"
              />
              {validationErrors.businessEmail && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.businessEmail}</p>
              )}
            </div>
            <div>
              <Field
                label="Business Phone"
                name="businessPhone"
                value={formData.businessPhone}
                onChange={handleChange}
                required
                placeholder="e.g., 0551234567"
              />
              {formData.businessPhone && !/^\d{10}$/.test(formData.businessPhone) && (
                <p className="mt-1 text-xs text-red-600">Please enter a valid 10-digit phone number</p>
              )}
            </div>
            <div>
              <Field
                label="Additional Contact (Optional)"
                name="additionalContact"
                value={formData.additionalContact}
                onChange={handleChange}
                placeholder="e.g., 0541234567"
              />
              {formData.additionalContact && !/^\d{0,10}$/.test(formData.additionalContact) && (
                <p className="mt-1 text-xs text-red-600">Please enter a valid 10-digit phone number</p>
              )}
            </div>
            {role === 'Organizer' && (
              <div>
                <Label text="Business Category" required htmlFor="businessCategory" />
                <select
                  id="businessCategory"
                  name="businessCategory"
                  value={formData.businessCategory}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Events">Events</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Sports">Sports & Recreation</option>
                  <option value="Corporate">Corporate Events</option>
                  <option value="Arts">Arts & Culture</option>
                  <option value="Education">Education & Training</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <Label text={role === 'VenueOwner' ? 'Tell us about your venue(s)' : 'Tell us about your organization'} required />
              <div className="relative">
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  maxLength={500}
                  rows={4}
                  placeholder={role === 'VenueOwner' 
                    ? 'Tell us about your venue(s) and why you need the venue owner role.'
                    : 'Tell us about your organization and why you need the organizer role.'}
                  className="mt-1 w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 mt-1">
                  <p className="text-xs text-neutral-500">
                    {role === 'VenueOwner' 
                      ? 'Provide details about your venue(s).' 
                      : 'Provide details about your organization.'}
                  </p>
                  <span className={`text-xs ${formData.reason.length > 450 ? 'text-amber-600' : 'text-neutral-500'} whitespace-nowrap`}>
                    {formData.reason.length}/500 characters
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* STEP 2: Identity Verification */}
      {currentStep === 2 && (
        <Section 
          title="Identity Verification" 
          icon={
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {isVerifyingId && <RefreshCw className="h-3 w-3 animate-spin text-primary" />}
              {idVerificationResult?.isValid && <CheckCircle className="h-4 w-4 text-green-500" />}
            </div>
          }
        >
          {/* Important Note */}
          {/* <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 sm:px-4 py-3 flex gap-2 sm:gap-3 mb-5">
            <div className="rounded-md bg-amber-100 p-1.5 h-fit shrink-0">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
            </div>
            <div className="text-xs sm:text-sm text-amber-800">
              <p className="font-medium mb-1">Important: Details Must Match Exactly</p>
              <p>Enter your details <strong>exactly as they appear on your Ghana Card</strong>. Any mismatch will cause verification to fail.</p>
            </div>
          </div> */}

          {/* Verification Status Badge */}
          {idVerificationResult && (
            <div className={`rounded-lg border px-4 py-3 mb-5 flex items-center gap-3 ${
              idVerificationResult.isValid 
                ? 'border-green-200 bg-green-50' 
                : 'border-red-200 bg-red-50'
            }`}>
              {idVerificationResult.isValid ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Identity Verified</p>
                    <p className="text-xs text-green-700">Match Score: {idVerificationResult.score}</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Verification Failed</p>
                    <p className="text-xs text-red-700">Please check that all details match your Ghana Card exactly.</p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2">
            <div>
              <Label text="ID Type" required htmlFor="idType" />
              <select
                id="idType"
                name="idType"
                value="national_id"
                disabled
                className="mt-1 w-full rounded-md border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm text-neutral-600 cursor-not-allowed"
                aria-label="ID Type"
              >
                <option value="national_id">Ghana Card (National ID)</option>
              </select>
            </div>
            <div>
              <Label text="Ghana Card Number" required htmlFor="idNumber" />
              <div className="relative">
                <input
                  id="idNumber"
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleChange}
                  required
                  placeholder="GHA-123456789-0"
                  className={`mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    idVerificationResult?.isValid ? 'border-green-500' : 'border-neutral-300'
                  }`}
                  aria-describedby="idNumberHelp"
                />
                {isVerifyingId && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}
              </div>
              {validationErrors.idNumber ? (
                <p id="idNumberHelp" className="mt-1 text-xs text-red-600">{validationErrors.idNumber}</p>
              ) : formData.idNumber && !/^GHA-\d{9}-\d$/.test(formData.idNumber) ? (
                <p id="idNumberHelp" className="mt-1 text-xs text-yellow-600">Format: GHA-123456789-0</p>
              ) : null}
            </div>
          </div>

          {/* New Ghana Card Verification Fields */}
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 mt-5">
            <div>
              <Field
                label="Surname (Last Name)"
                name="surname"
                value={formData.surname}
                onChange={handleChange}
                required
                placeholder="As on Ghana Card"
              />
            </div>
            <div>
              <Field
                label="First Names"
                name="firstnames"
                value={formData.firstnames}
                onChange={handleChange}
                required
                placeholder="As on Ghana Card"
              />
            </div>
            <div>
              <Label text="Gender" required htmlFor="gender" />
              <select
                id="gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <Label text="Date of Birth" required htmlFor="dateOfBirth" />
              <input
                id="dateOfBirth"
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
                max={new Date().toISOString().split('T')[0]}
                className={`mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                  validationErrors.age ? 'border-orange-500 shadow-sm shadow-orange-100' : 'border-neutral-300'
                }`}
              />
              {validationErrors.age && (
                <p className="mt-1 text-xs text-orange-600 font-medium">{validationErrors.age}</p>
              )}
            </div>
          </div>

          {/* ID Image Uploads */}
          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 mt-5">
            <UploadCard
              title="ID Image"
              description="Front (and back if needed) clear photo."
              onClick={() => idImageRef.current?.click()}
              fileState={idImage}
              required
            />
              <input
                ref={idImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleFile(e, setIdImage)}
              />
            <UploadCard
              title="Selfie With ID"
              description="Hold the same ID next to your face."
              onClick={() => selfieWithIdRef.current?.click()}
              fileState={selfieWithId}
              required
            />
              <input
                ref={selfieWithIdRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleFile(e, setSelfieWithId)}
              />
          </div>
        </Section>
      )}

      {/* Debug information - remove in production */}
      {process.env.NODE_ENV === 'development' && Object.keys(validationErrors).length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2">
          <p className="text-xs text-red-800">
            <strong>Debug - Validation Errors:</strong> {JSON.stringify(validationErrors)}
          </p>
          <p className="text-xs text-red-800">
            <strong>Form Valid:</strong> {isFormValid() ? 'Yes' : 'No'}
          </p>
        </div>
      )}
      
      {/* Info Box */}
      {/* <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 sm:px-4 py-3 sm:py-4 flex gap-2 sm:gap-3">
        <div className="rounded-md bg-blue-100 p-1.5 sm:p-2 h-fit shrink-0">
          <Info className="h-4 w-4 text-blue-700" />
        </div>
        <p className="text-xs sm:text-sm text-blue-800">
          {currentStep === 1 
            ? 'Fill in your business details to proceed to identity verification.'
            : 'Your Ghana Card will be verified automatically. Ensure all details match exactly as on your card.'}
        </p>
      </div> */}

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-neutral-200 pt-5">
        <div>
          {currentStep === 1 ? (
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
        </div>
        
        <div>
          {currentStep === 1 ? (
            <button
              key="next-button"
              type="button"
              onClick={() => setCurrentStep(2)}
              disabled={!isStep1Valid()}
              className={`inline-flex items-center justify-center gap-2 rounded-md px-6 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer w-full sm:w-auto ${
                !isStep1Valid()
                  ? 'bg-primary/50 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90'
              }`}
            >
              Next: Identity Verification
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              key="submit-button"
              type="button"
              onClick={(e) => handleSubmit(e as any)}
              disabled={isSubmitting || !isFormValid()}
              className={`inline-flex items-center justify-center gap-2 rounded-md px-6 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer w-full sm:w-auto ${
                isSubmitting || !isFormValid()
                  ? 'bg-green-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
              title={!isFormValid() ? (Object.keys(validationErrors).length > 0 ? 'Please resolve validation errors' : 'Please fill in all required fields and verify your ID') : ''}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit Request
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}


/* Supporting small components */
function Label({ text, required, htmlFor }: { text: string; required?: boolean; htmlFor?: string }) {
  return (
    <label 
      htmlFor={htmlFor}
      className="text-sm font-medium text-neutral-700"
    >
      {text} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  required?: boolean;
}
function Field({ label, required, ...rest }: FieldProps) {
  return (
    <div>
      <Label text={label} required={required} />
      <input
        {...rest}
        className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50/70">
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 sm:px-4 py-2.5">
        <span className="rounded-md bg-white p-1.5 shadow-sm">{icon}</span>
        <h2 className="text-sm font-semibold tracking-wide text-neutral-800">{title}</h2>
      </div>
      <div className="p-4 sm:p-5 space-y-5 sm:space-y-6">{children}</div>
    </div>
  );
}

function UploadCard({
  title,
  description,
  onClick,
  fileState,
  required
}: {
  title: string;
  description: string;
  onClick: () => void;
  fileState: FileState;
  required?: boolean;
}) {
  return (
    <div>
      <Label text={title} required={required} />
      <div
        onClick={onClick}
        className={`group mt-1 relative flex h-36 sm:h-40 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed ${
          fileState.file ? 'border-primary/50 bg-primary/5' : 'border-neutral-300 bg-white hover:bg-neutral-50 active:bg-neutral-100'
        } transition-colors`}
      >
        {!fileState.file && (
          <div className="flex flex-col items-center text-center px-3 sm:px-4">
            <Upload className="h-5 w-5 sm:h-6 sm:w-6 text-neutral-400 group-hover:text-neutral-500 mb-2" />
            <p className="text-xs font-medium text-neutral-600">{title}</p>
            <p className="mt-1 text-[11px] text-neutral-400 line-clamp-2">{description}</p>
            <p className="mt-1 text-[10px] text-neutral-400">Max size: 1MB</p>
          </div>
        )}
        {fileState.preview && (
          <div className="absolute inset-0">
            <img
              src={fileState.preview}
              alt={title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-xs font-medium text-white">Change</span>
            </div>
          </div>
        )}
      </div>
      {fileState.file && (
        <div className="mt-2 flex items-center gap-2 text-xs text-neutral-600">
          <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
          <span className="truncate flex-1 min-w-0">{fileState.file.name}</span>
          <span className="text-neutral-400 shrink-0">({formatFileSize(fileState.file.size)})</span>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
        {value || '—'}
      </div>
    </div>
  );
}

function PreviewThumb({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-neutral-500">{title}</p>
      <div className="relative h-40 w-full overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
        {children}
      </div>
    </div>
  );
}