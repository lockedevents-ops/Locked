import { z } from 'zod';
import { 
  GHANA_REGIONS, 
  EDUCATION_LEVELS, 
  RELATIONSHIP_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
  PROFILE_VISIBILITY_OPTIONS,
  COMMON_INDUSTRIES,
  COMMON_LANGUAGES,
  COMMON_INTERESTS
} from '../types/profile';

// Helper validation functions
const isValidGhanaianPhoneNumber = (phone: string) => {
  // Ghana phone numbers: +233XXXXXXXXX or 0XXXXXXXXX or 233XXXXXXXXX
  const patterns = [
    /^\+233[2-9]\d{8}$/, // +233XXXXXXXXX format
    /^0[2-9]\d{8}$/, // 0XXXXXXXXX format
    /^233[2-9]\d{8}$/, // 233XXXXXXXXX format
  ];
  return patterns.some(pattern => pattern.test(phone.replace(/\s/g, '')));
};

const isValidURL = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isValidDate = (dateString: string) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && date <= new Date();
};

const isValidAge = (birthDate: string, minAge = 13, maxAge = 150) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age >= minAge && age <= maxAge;
};

// Base schemas for common fields
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .toLowerCase();

export const phoneSchema = z
  .string()
  .optional()
  .refine((phone) => !phone || isValidGhanaianPhoneNumber(phone), {
    message: 'Please enter a valid Ghanaian phone number (e.g., +233XXXXXXXXX or 0XXXXXXXXX)',
  });

export const urlSchema = z
  .string()
  .optional()
  .refine((url) => !url || url.trim() === '' || isValidURL(url), {
    message: 'Please enter a valid URL',
  });

export const dateSchema = z
  .string()
  .optional()
  .refine((date) => !date || isValidDate(date), {
    message: 'Please enter a valid date',
  });

export const birthDateSchema = z
  .string()
  .optional()
  .refine((date) => !date || (isValidDate(date) && isValidAge(date)), {
    message: 'Please enter a valid birth date. You must be at least 13 years old.',
  });

// Social links schema
export const socialLinksSchema = z.object({
  facebook: urlSchema,
  twitter: urlSchema,
  instagram: urlSchema,
  linkedin: urlSchema,
  github: urlSchema,
  website: urlSchema,
  youtube: urlSchema,
  tiktok: urlSchema,
  whatsapp: z.string().optional(),
  telegram: z.string().optional(),
}).optional();

// Basic information schema
export const basicInformationSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Full name can only contain letters, spaces, hyphens, and apostrophes'),
  
  email: emailSchema,
  
  phone_number: phoneSchema,
  
  date_of_birth: birthDateSchema,
  
  gender: z
    .enum(['male', 'female', 'other', 'prefer_not_to_say'])
    .optional(),
  
  nationality: z
    .string()
    .min(2, 'Nationality must be at least 2 characters')
    .max(50, 'Nationality must be less than 50 characters')
    .optional(),
  
  marital_status: z
    .enum(['single', 'married', 'divorced', 'widowed', 'separated', 'prefer_not_to_say'])
    .optional(),
  
  birth_city: z
    .string()
    .max(50, 'Birth city must be less than 50 characters')
    .optional(),
  
  birth_country: z
    .string()
    .max(50, 'Birth country must be less than 50 characters')
    .optional(),
});

// Address information schema
export const addressInformationSchema = z.object({
  address_line_1: z
    .string()
    .max(200, 'Address line 1 must be less than 200 characters')
    .optional(),
  
  address_line_2: z
    .string()
    .max(200, 'Address line 2 must be less than 200 characters')
    .optional(),
  
  city: z
    .string()
    .max(50, 'City must be less than 50 characters')
    .optional(),
  
  region: z
    .enum([...GHANA_REGIONS] as [string, ...string[]])
    .optional(),
  
  postal_code: z
    .string()
    .max(20, 'Postal code must be less than 20 characters')
    .optional(),
  
  country: z
    .string()
    .max(50, 'Country must be less than 50 characters')
    .optional(),
});

// Emergency contact schema
export const emergencyContactSchema = z.object({
  emergency_contact_name: z
    .string()
    .min(2, 'Emergency contact name must be at least 2 characters')
    .max(100, 'Emergency contact name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Emergency contact name can only contain letters, spaces, hyphens, and apostrophes')
    .optional(),
  
  emergency_contact_phone: z
    .string()
    .optional()
    .refine((phone) => !phone || isValidGhanaianPhoneNumber(phone), {
      message: 'Please enter a valid Ghanaian phone number for emergency contact',
    }),
  
  emergency_contact_relationship: z
    .enum(['parent', 'spouse', 'sibling', 'child', 'friend', 'colleague', 'other'])
    .optional(),
});

// Professional information schema
export const professionalInformationSchema = z.object({
  occupation: z
    .string()
    .max(100, 'Occupation must be less than 100 characters')
    .optional(),
  
  company: z
    .string()
    .max(100, 'Company must be less than 100 characters')
    .optional(),
  
  industry: z
    .string()
    .max(50, 'Industry must be less than 50 characters')
    .optional(),
  
  work_address: z
    .string()
    .max(200, 'Work address must be less than 200 characters')
    .optional(),
  
  education_level: z
    .enum(['primary', 'secondary', 'tertiary', 'postgraduate', 'professional', 'other'])
    .optional(),
});

// Personal details schema
export const personalDetailsSchema = z.object({
  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
  
  interests: z
    .array(z.string().min(1).max(50))
    .max(20, 'You can select up to 20 interests')
    .optional(),
  
  languages: z
    .array(z.string().min(1).max(50))
    .max(15, 'You can select up to 15 languages')
    .optional(),
  
  social_links: socialLinksSchema,
});

// Privacy settings schema
export const privacySettingsSchema = z.object({
  profile_visibility: z
    .enum(['public', 'friends', 'private'])
    .default('public'),
  
  allow_messages: z
    .boolean()
    .default(true),
  
  allow_event_invitations: z
    .boolean()
    .default(true),
});

// Avatar upload schema
export const avatarSchema = z.object({
  avatar_url: urlSchema,
});

// Complete profile update schema (all fields optional for partial updates)
export const profileUpdateSchema = z.object({
  full_name: z.string().min(2).max(100).regex(/^[a-zA-Z\s'-]+$/).optional(),
  email: z.string().email().toLowerCase().optional(),
  phone_number: phoneSchema,
  date_of_birth: birthDateSchema,
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  nationality: z.string().min(2).max(50).optional(),
  marital_status: z.enum(['single', 'married', 'divorced', 'widowed', 'separated', 'prefer_not_to_say']).optional(),
  birth_city: z.string().max(50).optional(),
  birth_country: z.string().max(50).optional(),
  address_line_1: z.string().max(200).optional(),
  address_line_2: z.string().max(200).optional(),
  city: z.string().max(50).optional(),
  region: z.enum([...GHANA_REGIONS] as [string, ...string[]]).optional(),
  postal_code: z.string().max(20).optional(),
  country: z.string().max(50).optional(),
  emergency_contact_name: z.string().min(2).max(100).regex(/^[a-zA-Z\s'-]+$/).optional(),
  emergency_contact_phone: phoneSchema,
  emergency_contact_relationship: z.enum(['parent', 'spouse', 'sibling', 'child', 'friend', 'colleague', 'other']).optional(),
  occupation: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  industry: z.string().max(50).optional(),
  work_address: z.string().max(200).optional(),
  education_level: z.enum(['primary', 'secondary', 'tertiary', 'postgraduate', 'professional', 'other']).optional(),
  bio: z.string().max(500).optional(),
  interests: z.array(z.string().min(1).max(50)).max(20).optional(),
  languages: z.array(z.string().min(1).max(50)).max(15).optional(),
  social_links: socialLinksSchema,
  profile_visibility: z.enum(['public', 'friends', 'private']).optional(),
  allow_messages: z.boolean().optional(),
  allow_event_invitations: z.boolean().optional(),
  avatar_url: urlSchema,
}).partial();

// Individual section schemas for step-by-step validation
export const profileSectionSchemas = {
  basic: basicInformationSchema,
  address: addressInformationSchema,
  emergency: emergencyContactSchema,
  professional: professionalInformationSchema,
  personal: personalDetailsSchema,
  privacy: privacySettingsSchema,
  avatar: avatarSchema,
} as const;

// Schema for profile search
export const profileSearchSchema = z.object({
  query: z.string().max(100).optional(),
  city: z.string().max(50).optional(),
  region: z.enum([...GHANA_REGIONS] as [string, ...string[]]).optional(),
  occupation: z.string().max(100).optional(),
  interests: z.array(z.string()).max(10).optional(),
  minCompletionPercentage: z.number().min(0).max(100).optional(),
});

// Validation error messages
export const PROFILE_ERROR_MESSAGES = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid Ghanaian phone number',
  INVALID_URL: 'Please enter a valid URL',
  INVALID_DATE: 'Please enter a valid date',
  MIN_AGE: 'You must be at least 13 years old',
  MAX_LENGTH: (length: number) => `Must be less than ${length} characters`,
  MIN_LENGTH: (length: number) => `Must be at least ${length} characters`,
  INVALID_FORMAT: 'Invalid format',
  TOO_MANY_ITEMS: (max: number) => `You can select up to ${max} items`,
} as const;

// Helper function to validate profile section
export const validateProfileSection = (
  section: keyof typeof profileSectionSchemas,
  data: unknown
) => {
  try {
    const schema = profileSectionSchemas[section];
    const result = schema.parse(data);
    return { success: true, data: result, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      // Safely handle the issues array (Zod v3)
      const issues = (error as z.ZodError).issues;
      if (Array.isArray(issues)) {
        issues.forEach((err) => {
          const path = Array.isArray(err.path) ? err.path : [];
          if (path.length > 0) {
            fieldErrors[path.join('.')] = err.message;
          } else {
            fieldErrors['general'] = err.message;
          }
        });
      }
      return { success: false, data: null, errors: fieldErrors };
    }
    return { 
      success: false, 
      data: null, 
      errors: { general: 'Validation failed' } 
    };
  }
};

// Helper function to check if emergency contact info is complete
export const isEmergencyContactComplete = (data: {
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
}) => {
  const { emergency_contact_name, emergency_contact_phone, emergency_contact_relationship } = data;
  
  // If any field is filled, all should be filled
  const hasAnyField = !!(emergency_contact_name || emergency_contact_phone || emergency_contact_relationship);
  
  if (!hasAnyField) return true; // All empty is valid
  
  return !!(emergency_contact_name && emergency_contact_phone && emergency_contact_relationship);
};

// Emergency contact validation with conditional requirements
export const conditionalEmergencyContactSchema = z
  .object({
    emergency_contact_name: z.string().optional(),
    emergency_contact_phone: z.string().optional(),
    emergency_contact_relationship: z.enum(['parent', 'spouse', 'sibling', 'child', 'friend', 'colleague', 'other']).optional(),
  })
  .refine(
    (data) => isEmergencyContactComplete(data),
    {
      message: 'If you provide emergency contact information, all fields (name, phone, relationship) are required',
      path: ['emergency_contact_name'], // Show error on name field
    }
  );

// Profile completion calculation helper
export const calculateRequiredFields = (profile: Record<string, any>) => {
  const requiredFields = [
    'full_name',
    'email',
    'phone_number',
    'date_of_birth',
  ];
  
  const importantFields = [
    'city',
    'region',
    'country',
    'occupation',
    'bio',
  ];
  
  const completedRequired = requiredFields.filter(field => 
    profile[field] && profile[field].trim() !== ''
  );
  
  const completedImportant = importantFields.filter(field => 
    profile[field] && profile[field].trim() !== ''
  );
  
  return {
    totalRequired: requiredFields.length,
    completedRequired: completedRequired.length,
    totalImportant: importantFields.length,
    completedImportant: completedImportant.length,
    missingRequired: requiredFields.filter(field => 
      !profile[field] || profile[field].trim() === ''
    ),
    missingImportant: importantFields.filter(field => 
      !profile[field] || profile[field].trim() === ''
    ),
  };
};

// Export types for use in components
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
export type BasicInformationData = z.infer<typeof basicInformationSchema>;
export type AddressInformationData = z.infer<typeof addressInformationSchema>;
export type EmergencyContactData = z.infer<typeof emergencyContactSchema>;
export type ProfessionalInformationData = z.infer<typeof professionalInformationSchema>;
export type PersonalDetailsData = z.infer<typeof personalDetailsSchema>;
export type PrivacySettingsData = z.infer<typeof privacySettingsSchema>;
export type ProfileSearchData = z.infer<typeof profileSearchSchema>;
