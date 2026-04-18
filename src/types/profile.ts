// Enhanced profile types to match the extended database schema

export interface Profile {
  // Basic profile information
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  
  // Personal information
  date_of_birth: string | null; // ISO date string
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  nationality: string | null;
  birth_city: string | null;
  birth_country: string | null;
  marital_status: 'single' | 'married' | 'divorced' | 'widowed' | 'separated' | 'prefer_not_to_say' | null;
  
  // Address information
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  region: string | null; // Ghana regions
  postal_code: string | null;
  country: string | null;
  
  // Emergency contact
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: 'parent' | 'spouse' | 'sibling' | 'child' | 'friend' | 'colleague' | 'other' | null;
  
  // Professional information
  occupation: string | null;
  company: string | null;
  industry: string | null;
  work_address: string | null;
  education_level: 'primary' | 'secondary' | 'tertiary' | 'postgraduate' | 'professional' | 'other' | null;
  
  // Personal details
  bio: string | null;
  interests: string[] | null;
  languages: string[] | null;
  social_links: SocialLinks | null;
  
  // Privacy and preferences
  profile_visibility: 'public' | 'friends' | 'private';
  allow_messages: boolean;
  allow_event_invitations: boolean;
  
  // Profile completion tracking
  is_profile_complete: boolean;
  profile_completion_percentage: number;
  last_profile_update: string | null; // ISO timestamp
  
  // Timestamps
  created_at: string | null; // ISO timestamp
  updated_at: string | null; // ISO timestamp
}

export interface SocialLinks {
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  youtube?: string;
  tiktok?: string;
  whatsapp?: string;
  telegram?: string;
  [key: string]: string | undefined;
}

// Profile update payload type (excludes read-only fields)
export interface ProfileUpdatePayload {
  full_name?: string;
  phone_number?: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: Profile['gender'];
  nationality?: string;
  birth_city?: string;
  birth_country?: string;
  marital_status?: Profile['marital_status'];
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: Profile['emergency_contact_relationship'];
  occupation?: string;
  company?: string;
  industry?: string;
  work_address?: string;
  education_level?: Profile['education_level'];
  bio?: string;
  interests?: string[];
  languages?: string[];
  social_links?: SocialLinks;
  profile_visibility?: Profile['profile_visibility'];
  allow_messages?: boolean;
  allow_event_invitations?: boolean;
}

// Public profile view (limited information)
export interface PublicProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  occupation: string | null;
  company: string | null;
  industry: string | null;
  interests: string[] | null;
  languages: string[] | null;
  social_links: SocialLinks | null;
  is_profile_complete: boolean;
  profile_completion_percentage: number;
  created_at: string | null;
  updated_at: string | null;
}

// Profile section interfaces for form organization
export interface BasicInformation {
  full_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender: Profile['gender'];
  nationality: string;
  marital_status: Profile['marital_status'];
  birth_city: string;
  birth_country: string;
}

export interface AddressInformation {
  address_line_1: string;
  address_line_2: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
}

export interface EmergencyContact {
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: Profile['emergency_contact_relationship'];
}

export interface ProfessionalInformation {
  occupation: string;
  company: string;
  industry: string;
  work_address: string;
  education_level: Profile['education_level'];
}

export interface PersonalDetails {
  bio: string;
  interests: string[];
  languages: string[];
  social_links: SocialLinks;
}

export interface PrivacySettings {
  profile_visibility: Profile['profile_visibility'];
  allow_messages: boolean;
  allow_event_invitations: boolean;
}

// Form validation types
export interface ProfileValidationErrors {
  full_name?: string;
  email?: string;
  phone_number?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  [key: string]: string | undefined;
}

// Constants for dropdown options
export const GHANA_REGIONS = [
  'Greater Accra',
  'Ashanti',
  'Western',
  'Central',
  'Eastern',
  'Volta',
  'Northern',
  'Upper East',
  'Upper West',
  'Brong Ahafo',
  'Western North',
  'Ahafo',
  'Bono',
  'Bono East',
  'Oti',
  'North East',
  'Savannah'
] as const;

export const EDUCATION_LEVELS = [
  { value: 'primary', label: 'Primary Education' },
  { value: 'secondary', label: 'Secondary/High School' },
  { value: 'tertiary', label: 'Tertiary (University/Polytechnic)' },
  { value: 'postgraduate', label: 'Postgraduate (Masters/PhD)' },
  { value: 'professional', label: 'Professional Certification' },
  { value: 'other', label: 'Other' }
] as const;

export const RELATIONSHIP_OPTIONS = [
  { value: 'parent', label: 'Parent' },
  { value: 'spouse', label: 'Spouse/Partner' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'child', label: 'Child' },
  { value: 'friend', label: 'Friend' },
  { value: 'colleague', label: 'Colleague' },
  { value: 'other', label: 'Other' }
] as const;

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
] as const;

export const MARITAL_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
  { value: 'separated', label: 'Separated' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
] as const;

export const PROFILE_VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', description: 'Anyone can view your profile' },
  { value: 'friends', label: 'Friends Only', description: 'Only your friends can view your profile' },
  { value: 'private', label: 'Private', description: 'Only you can view your profile' }
] as const;

// Common industries in Ghana
export const COMMON_INDUSTRIES = [
  'Agriculture',
  'Banking & Finance',
  'Construction',
  'Education',
  'Energy & Mining',
  'Healthcare',
  'Hospitality & Tourism',
  'Information Technology',
  'Manufacturing',
  'Media & Communications',
  'Real Estate',
  'Retail & Trade',
  'Transportation',
  'Government',
  'Non-Profit',
  'Other'
] as const;

// Common languages in Ghana
export const COMMON_LANGUAGES = [
  'English',
  'Akan/Twi',
  'Ga',
  'Ewe',
  'Dagbani',
  'Nzema',
  'Hausa',
  'Gonja',
  'Dagaare',
  'French',
  'Arabic',
  'Other'
] as const;

// Common interests/hobbies
export const COMMON_INTERESTS = [
  'Music',
  'Sports',
  'Technology',
  'Reading',
  'Travel',
  'Food & Cooking',
  'Art & Design',
  'Photography',
  'Dancing',
  'Movies & TV',
  'Business',
  'Fashion',
  'Politics',
  'History',
  'Nature & Environment',
  'Fitness',
  'Gaming',
  'Volunteering',
  'Religion & Spirituality',
  'Other'
] as const;

// Helper types for form sections
export type ProfileSection = 
  | 'basic'
  | 'address'
  | 'emergency'
  | 'professional'
  | 'personal'
  | 'privacy';

export interface ProfileSectionProps {
  profile: Profile | null;
  onUpdate: (updates: ProfileUpdatePayload) => Promise<void>;
  isLoading?: boolean;
  isEditing?: boolean;
  onEditToggle?: () => void;
}

// Profile completion status
export interface ProfileCompletionStatus {
  percentage: number;
  isComplete: boolean;
  missingFields: string[];
  completedFields: string[];
  lastUpdated: string | null;
}

// Search and filtering types
export interface ProfileSearchParams {
  query?: string;
  city?: string;
  region?: string;
  occupation?: string;
  interests?: string[];
  minCompletionPercentage?: number;
}

export interface ProfileSearchResult extends PublicProfile {
  relevanceScore?: number;
}

// Profile analytics/insights
export interface ProfileInsights {
  viewCount: number;
  messageCount: number;
  eventInvitationCount: number;
  connectionCount: number;
  lastActivityDate: string | null;
}

// Error handling types
export type ProfileError = {
  code: string;
  message: string;
  field?: string;
};
