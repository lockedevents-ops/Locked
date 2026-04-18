"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { migrateEventsTaxonomy } from '@/utils/eventTaxonomy';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client/client';
import { eventDatabaseService } from '@/services/eventDatabaseService';
import { 
  ArrowLeft, 
  ArrowRight, 
  Info, 
  MapPin, 
  Users, 
  DollarSign, 
  ImageIcon, 
  CheckSquare,
  Save,
  Calendar,
  Clock,
  Globe,
  Ticket,
  Upload,
  Trash2,
  Plus,
  Minus,
  PlusCircle,
  ListChecks, 
  XCircle,
  Search,
  AlertTriangle,
  CheckCircle,
  Award,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { 
  checkDuplicateEventTitle,
  validateCityName,
  getCityValidationError,
  validateOnlineUrl,
  getOnlineUrlValidationError,
  validateImageSize,
  getImageSizeError,
  validateMultipleImages,
  ONLINE_PLATFORMS,
  MAX_IMAGE_SIZE
} from '@/utils/eventValidation';

// Enhanced event form schema with comprehensive validations
const eventFormSchema = z.object({
  // Basic Details
  title: z.string().min(5, "Event title is required (minimum 5 characters)")
    .max(100, "Event title cannot exceed 100 characters")
    .refine(async (title) => {
      const isDuplicate = await checkDuplicateEventTitle(title);
      return !isDuplicate;
    }, "An event with this title already exists. Please choose a different title."),
  description: z.string().min(20, "Event description is required (minimum 20 characters)"),
  category: z.string().min(1, "Category is required"),
  format: z.string().min(1, "Format is required"),
  
  // Date and Time - start and end date/time are required
  startDate: z.string().min(1, "Start date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.string().min(1, "End date is required"),
  endTime: z.string().min(1, "End time is required"),
  timeZone: z.string().optional(),
  registrationDeadline: z.string().optional(),
  
  // Location - conditional validation based on locationType
  locationType: z.enum(["physical", "online", "hybrid"]),
  venue: z.string().optional(),
  venueId: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional()
    .refine((city) => {
      if (!city) return true; // Allow empty for optional validation
      return validateCityName(city);
    }, "City name cannot contain numbers or digits"),
  country: z.string().optional(), // Base field optional, will be validated with refine
  region: z.string().optional(), // Region field for Ghana events
  onlineUrl: z.string().optional()
    .refine((url) => {
      if (!url) return true; // Allow empty for conditional validation
      
      try {
        new URL(url); // Basic URL validation
        return true;
      } catch {
        return false;
      }
    }, "Please provide a valid URL"),
  onlinePlatform: z.string().optional(),
  
  // Tickets
  tickets: z.array(
    z.object({
      id: z.number(),
      name: z.string().min(1, "Ticket name is required"),
      price: z.number().min(0, "Price cannot be negative"),
      quantity: z.number().min(1, "At least one ticket must be available"),
      description: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
  ).min(1, "At least one ticket type is required"),
  
  // Media
  imageUrl: z.string().min(1, "Featured image is required"), // Changed from optional to required
  imageMetadata: z.object({
    name: z.string().optional(),
    size: z.number().optional()
      .refine((size) => {
        if (!size) return true;
        return size <= MAX_IMAGE_SIZE;
      }, `Image size must be less than 1MB`),
    type: z.string().optional()
  }).optional(),
  galleryImages: z.array(z.string()).optional(),
  galleryMetadata: z.array(
    z.object({
      name: z.string().optional(),
      size: z.number().optional()
        .refine((size) => {
          if (!size) return true;
          return size <= MAX_IMAGE_SIZE;
        }, `Image size must be less than 1MB`),
      type: z.string().optional()
    })
  ).optional(),
  
  // Settings - all optional
  isPrivate: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  requireApproval: z.boolean().optional(),
  eventTags: z.array(z.string()).optional(),
  organizerNotes: z.string().optional(),
  status: z.enum(["published", "draft"]),

  // Voting fields
  hasVoting: z.boolean().default(false),
  votingInfo: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    currentPhase: z.string().optional(),
    voteCost: z.number().min(0.1).default(1)
  }).optional(),
  contestants: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1, "Contestant name is required"),
      image: z.string().optional(),
      description: z.string().optional()
    })
  ).optional(),

  // Add these new fields
  duration: z.string().optional(),
  features: z.array(z.string()).optional(),
  schedule: z.array(
    z.object({
      time: z.string().min(1, "Time is required"),
      title: z.string().min(1, "Title is required"),
      description: z.string().optional()
    })
  ).optional(),
}).refine((data) => {
  // Only validate city, country & region for physical/hybrid locations
  if (data.locationType === "physical" || data.locationType === "hybrid") {
    return !!data.city && !!data.country && !!data.region;
  }
  return true;
}, {
  message: "City, Country and Region are required for physical or hybrid events",
  path: ["city"]
}).refine((data) => {
  // Validate online URL for online/hybrid events
  if (data.locationType === "online" || data.locationType === "hybrid") {
    return !!data.onlineUrl;
  }
  return true;
}, {
  message: "Online URL is required for online or hybrid events",
  path: ["onlineUrl"]
}).refine((data) => {
  // Validate online platform for online/hybrid events
  if (data.locationType === "online" || data.locationType === "hybrid") {
    return !!data.onlinePlatform;
  }
  return true;
}, {
  message: "Online platform is required for online or hybrid events",
  path: ["onlinePlatform"]
}).refine((data) => {
  // Validate contestants when voting is enabled
  if (data.hasVoting) {
    return data.contestants && data.contestants.length > 0;
  }
  return true;
}, {
  message: "At least one contestant is required when voting is enabled",
  path: ["contestants"]
}).refine(async (data) => {
  // Validate online URL matches platform for online/hybrid events
  if ((data.locationType === "online" || data.locationType === "hybrid") && data.onlineUrl && data.onlinePlatform) {
    try {
      return await validateOnlineUrl(data.onlineUrl, data.onlinePlatform);
    } catch {
      return false;
    }
  }
  return true;
}, {
  message: "The online URL must match the selected platform",
  path: ["onlineUrl"]
});

type EventFormValues = z.infer<typeof eventFormSchema>;

// Event types - expanded and regrouped
const EVENT_TYPES = [
  // Performances & Entertainment
  "Concert",
  "Festival",
  "Performance",
  "Comedy Show",
  "DJ Night",
  "Screening",
  
  // Learning & Professional
  "Conference",
  "Workshop",
  "Seminar",
  "Webinar",
  "Training",
  "Networking",
  
  // Exhibitions & Showcases
  "Exhibition",
  "Trade Show",
  "Art Show",
  "Product Launch",
  
  // Competitions & Ceremonies
  "Competition",
  "Award Ceremony",
  "Beauty Pageant",
  "Contest",
  
  // Social Events
  "Party",
  "Wedding",
  "Gala",
  "Meetup",
  
  // Other
  "Retreat",
  "Fundraiser",
  "Religious Event",
  "Other"
];

// Event categories - expanded and regrouped
const EVENT_CATEGORIES = [
  // Arts & Culture
  "Music",
  "Arts & Culture",
  "Theatre",
  "Dance",
  "Film",
  "Traditional",
  
  // Business & Professional
  "Business",
  "Corporate",
  "Networking",
  "Career",
  
  // Lifestyle
  "Food & Drink",
  "Fashion",
  "Beauty",
  "Health & Wellness",
  
  // Sports & Activities
  "Sports & Fitness",
  "Gaming",
  "Outdoor",
  "Adventure",
  
  // Knowledge & Learning
  "Technology",
  "Education",
  "Academic",
  "Workshop",
  
  // Community & Causes
  "Community",
  "Charity",
  "Religious",
  "Political",
  
  // Other
  "Entertainment",
  "Family & Kids",
  "Holiday",
  "Other"
];

const DEFAULT_VALUES: Partial<EventFormValues> = {
  title: "",
  description: "",
  category: "",
  format: "",
  startDate: "",
  startTime: "",
  endDate: "", // Optional but included for completeness
  endTime: "", // Optional but included for completeness
  timeZone: "GMT",
  locationType: "physical",
  venue: "", // Venue name for physical/hybrid events
  venueId: "", // Optional: venue ID if selecting from existing venues
  address: "", // Street address for physical/hybrid events
  city: "", // Will be validated only for physical/hybrid
  country: "Ghana",
  region: "", // Region for Ghana events
  onlineUrl: "", // URL for online/hybrid events
  onlinePlatform: "", // Platform name for online/hybrid events
  tickets: [
    { 
      id: Date.now(), 
      name: "General Admission", // Required
      price: 0, // Required 
      quantity: 0, // Required - user must enter value
      description: "", // Optional
      startDate: "", // Optional
      endDate: ""  // Optional
    }
  ],
  isPrivate: false,
  isFeatured: false,
  requireApproval: false,
  eventTags: [],
  organizerNotes: "",
  status: "published",
  imageUrl: "",
  galleryImages: [],
  hasVoting: false,
  votingInfo: {
    voteCost: 1,
    currentPhase: "Registration"
  },
  contestants: [],

  // Add these new defaults
  duration: "",
  features: [],
  schedule: [],
};

export default function CreateEventPage() {
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const router = useRouter();
  const { user } = useAuth(); // Add this line to get the authenticated user
  
  const imageFileRef = useRef<HTMLInputElement>(null);
  const galleryImagesRef = useRef<HTMLInputElement>(null);
  const imagePreviewRef = useRef<HTMLDivElement>(null);

  // Add these new states for position control
  const [imageFocus, setImageFocus] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  
  const methods = useForm<EventFormValues>({
    // Cast to any to bridge potential minor version type divergence between zod v4 & resolver
    resolver: zodResolver(eventFormSchema as any),
    defaultValues: DEFAULT_VALUES as any,
    mode: "onChange", // validation mode for react-hook-form
  });
  // Run taxonomy migration once (Phase 1)
  useEffect(() => { migrateEventsTaxonomy(); }, []);
  
  const { handleSubmit, formState: { errors, isValid, touchedFields }, watch, setValue, reset, register, trigger } = methods;
  
  // Enhanced validation state
  const [validationSummary, setValidationSummary] = useState<string[]>([]);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  
  // Function to get step validation status
  const getStepValidationStatus = (stepIndex: number) => {
    const stepErrors = getStepErrors(stepIndex);
    return stepErrors.length === 0;
  };
  
  // Function to get errors for a specific step
  const getStepErrors = (stepIndex: number): string[] => {
    const stepErrors: string[] = [];
    
    switch (stepIndex) {
      case 0: // Basic Details
        if (errors.title) stepErrors.push(errors.title.message || 'Title is required');
        if (errors.description) stepErrors.push(errors.description.message || 'Description is required');
        if (errors.category) stepErrors.push(errors.category.message || 'Category is required');
        if (errors.format) stepErrors.push(errors.format.message || 'Format is required');
        break;
      case 1: // Date & Time
        if (errors.startDate) stepErrors.push(errors.startDate.message || 'Start date is required');
        if (errors.startTime) stepErrors.push(errors.startTime.message || 'Start time is required');
        break;
      case 3: // Location
        if (errors.city) stepErrors.push(errors.city.message || 'City is required for this location type');
        if (errors.region) stepErrors.push(errors.region.message || 'Region is required for this location type');
        if (errors.onlineUrl) stepErrors.push(errors.onlineUrl.message || 'Online URL is required for this location type');
        if (errors.onlinePlatform) stepErrors.push(errors.onlinePlatform.message || 'Online platform is required for this location type');
        break;
      case 4: // Tickets
        if (errors.tickets) stepErrors.push('At least one valid ticket type is required');
        break;
      case 5: // Media
        if (errors.imageUrl) stepErrors.push(errors.imageUrl.message || 'Featured image is required');
        break;
      case 6: // Voting
        if (errors.contestants) stepErrors.push(errors.contestants.message || 'Contestants are required when voting is enabled');
        break;
    }
    
    return stepErrors;
  };
  
  // Function to update validation summary
  const updateValidationSummary = () => {
    const allErrors: string[] = [];
    
    formSteps.forEach((step, index) => {
      const stepErrors = getStepErrors(index);
      if (stepErrors.length > 0) {
        allErrors.push(`${step.title}: ${stepErrors.join(', ')}`);
      }
    });
    
    setValidationSummary(allErrors);
  };
  
  // Update validation summary when errors change
  React.useEffect(() => {
    updateValidationSummary();
  }, [errors]);

  // Form steps
  const formSteps = [
    { id: "basics", title: "Basic Details", icon: <Info className="w-5 h-5" /> },
    { id: "datetime", title: "Date & Time", icon: <Calendar className="w-5 h-5" /> },
    { id: "outline", title: "Event Outline", icon: <ListChecks className="w-5 h-5" /> },
    { id: "location", title: "Location", icon: <MapPin className="w-5 h-5" /> },
    { id: "tickets", title: "Tickets", icon: <Ticket className="w-5 h-5" /> },
    { id: "media", title: "Media", icon: <ImageIcon className="w-5 h-5" /> },
    { id: "voting", title: "Voting", icon: <Award className="w-5 h-5" /> }, 
    { id: "settings", title: "Settings", icon: <CheckSquare className="w-5 h-5" /> },
  ];
  
  // Preview the current form data
  const formData = watch();

  // Handle next step
  const handleNextStep = () => {
    if (currentStep < formSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle previous step
  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle adding a ticket
  const handleAddTicket = () => {
    const currentTickets = watch("tickets") || [];
    const newTicket = {
      id: Date.now(),
      name: "",
      price: 0,
      quantity: 0,
      description: "",
      startDate: "",
      endDate: ""
    };
    
    setValue("tickets", [...currentTickets, newTicket]);
  };

  // Handle removing a ticket
  const handleRemoveTicket = (id: number) => {
    const currentTickets = watch("tickets") || [];
    
    if (currentTickets.length <= 1) {
      toast.showError('Ticket Required', 'You must have at least one ticket type');
      return;
    }
    
    setValue(
      "tickets",
      currentTickets.filter(ticket => ticket.id !== id)
    );
  };

  // Handle adding a tag
  const handleAddTag = (tag: string) => {
    const currentTags = watch("eventTags") || [];
    if (!tag.trim()) return;
    if (currentTags.includes(tag)) return;
    
    setValue("eventTags", [...currentTags, tag]);
  };

  // Handle removing a tag
  const handleRemoveTag = (tag: string) => {
    const currentTags = watch("eventTags") || [];
    setValue(
      "eventTags",
      currentTags.filter(t => t !== tag)
    );
  };

  // Add a contestant
  const handleAddContestant = () => {
    const currentContestants = watch("contestants") || [];
    const newContestant = {
      id: `contestant-${Date.now()}`,
      name: "",
      image: "",
      description: ""
    };
    
    setValue("contestants", [...currentContestants, newContestant]);
  };

  // Remove a contestant
  const handleRemoveContestant = (index: number) => {
    const currentContestants = watch("contestants") || [];
    setValue(
      "contestants",
      currentContestants.filter((_, i) => i !== index)
    );
  };

  // Handle contestant image upload
  const handleContestantImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const currentContestants = [...(watch("contestants") || [])];
        currentContestants[index].image = reader.result as string;
        setValue("contestants", currentContestants);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload file to Supabase Storage - Updated to match RLS policy structure
  const uploadFileToSupabase = async (file: File, bucket: string, folder: string, fileName?: string): Promise<string | null> => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const fileExt = file.name.split('.').pop();
      const finalFileName = fileName ? `${fileName}.${fileExt}` : `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Updated path structure to match RLS policies: event-images/{user.id}/{filename}
      const filePath = `event-images/${user.id}/${finalFileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get the public URL
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  // Handle form submission
  const onSubmit = async (data: EventFormValues, isDraft = false) => {
    setIsSubmitting(true);
    
    // Use either the explicit isDraft parameter or the form status field
    const finalStatus = isDraft || data.status === "draft" ? "draft" : "published";
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.showError('Authentication Required', 'You must be logged in to create an event');
        return;
      }

      let featuredImageUrl = null;
      let galleryImageUrls: string[] = [];
      let contestantImageUrls: { [key: number]: string } = {};

      // Upload featured image if selected
      if (imageFileRef.current?.files?.[0]) {
        const file = imageFileRef.current.files[0];
        featuredImageUrl = await uploadFileToSupabase(file, 'event-images', 'featured', `event-${Date.now()}`);
      }

      // Upload gallery images if selected
      if (galleryImagesRef.current?.files) {
        const files = Array.from(galleryImagesRef.current.files);
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const url = await uploadFileToSupabase(file, 'event-images', 'gallery', `gallery-${Date.now()}-${i}`);
          if (url) galleryImageUrls.push(url);
        }
      }

      // Upload contestant images if voting is enabled
      if (data.hasVoting && data.contestants) {
        const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"][data-contestant-index]');
        for (let i = 0; i < fileInputs.length; i++) {
          const fileInput = fileInputs[i];
          const file = fileInput.files?.[0];
          if (file) {
            const url = await uploadFileToSupabase(file, 'event-images', 'contestants', `contestant-${i}-${Date.now()}`);
            if (url) contestantImageUrls[i] = url;
          }
        }
      }

      // Prepare contestants data with uploaded image URLs
      let processedContestants = data.contestants;
      if (data.hasVoting && data.contestants) {
        processedContestants = data.contestants.map((contestant, index) => ({
          ...contestant,
          image: contestantImageUrls[index] || contestant.image || ''
        }));
      }
      
      // Build data for database service
      const eventDataForService = {
        title: data.title,
        description: data.description,
        category: data.category,
        event_type: data.format, // Maps form 'format' field to database 'event_type' column
        // Date & Time
        startDate: data.startDate,
        startTime: data.startTime,
        endDate: data.endDate,
        endTime: data.endTime,
        timeZone: data.timeZone,
        registrationDeadline: data.registrationDeadline,
        // Location
        locationType: data.locationType,
        venue: data.venue,
        venueId: data.venueId,
        address: data.address,
        city: data.city,
        country: data.country,
        region: data.region,
        onlineUrl: data.onlineUrl,
        onlinePlatform: data.onlinePlatform,
        // Tickets
        tickets: data.tickets || [],
        // Media
        imageUrl: featuredImageUrl || undefined,
        imageMetadata: data.imageMetadata,
        galleryImages: galleryImageUrls,
        galleryMetadata: data.galleryMetadata,
        // Settings
        isPrivate: data.isPrivate,
        isFeatured: data.isFeatured,
        requireApproval: data.requireApproval,
        eventTags: data.eventTags,
        organizerNotes: data.organizerNotes,
        status: finalStatus,
        // Voting
        hasVoting: data.hasVoting,
        votingInfo: data.votingInfo,
        contestants: processedContestants || undefined,
        // Additional
        features: data.features,
        schedule: data.schedule,
        duration: data.duration || undefined,
      };

      console.log('Saving event via service:', eventDataForService);
      await eventDatabaseService.createEvent(eventDataForService as any, user.id);
      
      // Show success message
      toast.showSuccess(
        finalStatus === "draft" ? 'Draft Saved' : 'Event Published',
        finalStatus === "draft" ? 'Event saved as draft' : 'Event published successfully'
      );
      
      // Navigate to appropriate page
      setTimeout(() => {
        router.push('/admin/events');
      }, 500);
    } catch (error) {
      console.error("Error creating event:", error);
      toast.showError('Creation Failed', `Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save as draft - bypass validation
  const saveAsDraft = async () => {
    setIsSubmitting(true);
    const currentData = methods.getValues();
    
    // Ensure minimal required fields for drafts
    if (!currentData.title) {
      toast.showError('Title Required', 'Please provide at least a title for your event draft');
      setIsSubmitting(false);
      return;
    }
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.showError('Authentication Required', 'You must be logged in to save a draft');
        setIsSubmitting(false);
        return;
      }

      let featuredImageUrl = null;
      
      // Upload featured image if selected
      if (imageFileRef.current?.files?.[0]) {
        const file = imageFileRef.current.files[0];
        featuredImageUrl = await uploadFileToSupabase(file, 'events', 'featured', `draft-${Date.now()}`);
      }
      
      // Build data for database service (draft)
      const eventDataForService = {
        title: currentData.title,
        description: currentData.description || 'No description provided',
        category: currentData.category || '',
        event_type: currentData.format || '', // Maps form 'format' field to database 'event_type' column
        // Date & Time (draft-safe defaults)
        startDate: currentData.startDate || new Date().toISOString().slice(0,10),
        startTime: currentData.startTime || '00:00',
        endDate: currentData.endDate || undefined,
        endTime: currentData.endTime || undefined,
        timeZone: currentData.timeZone,
        registrationDeadline: currentData.registrationDeadline,
        // Location
        locationType: currentData.locationType || 'physical',
        venue: currentData.venue || undefined,
        venueId: currentData.venueId || undefined,
        address: currentData.address || undefined,
        city: currentData.city || undefined,
        country: currentData.country || undefined,
        region: currentData.region || undefined,
        onlineUrl: currentData.onlineUrl || undefined,
        onlinePlatform: currentData.onlinePlatform || undefined,
        // Tickets
        tickets: currentData.tickets || [],
        // Media
        imageUrl: featuredImageUrl || undefined,
        imageMetadata: currentData.imageMetadata,
        galleryImages: [],
        galleryMetadata: [],
        // Features
        features: currentData.features || [],
        schedule: currentData.schedule || [],
        duration: currentData.duration || undefined,
        // Voting
        hasVoting: currentData.hasVoting || false,
        votingInfo: currentData.hasVoting ? currentData.votingInfo : undefined,
        contestants: currentData.hasVoting ? currentData.contestants : undefined,
        // Settings
        isPrivate: currentData.isPrivate || false,
        isFeatured: currentData.isFeatured || false,
        requireApproval: currentData.requireApproval || false,
        eventTags: currentData.eventTags || [],
        organizerNotes: currentData.organizerNotes || undefined,
        status: 'draft' as const,
      };

      console.log('Saving draft via service:', eventDataForService);
      await eventDatabaseService.createEvent(eventDataForService as any, user.id);
      
      // Show success message
      toast.showSuccess('Draft Saved', 'Event saved as draft');
      
      // Navigate to events page
      setTimeout(() => {
        router.push('/admin/events');
      }, 500);
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.showError('Save Failed', `Failed to save draft: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle image uploads
  const handleImageClick = () => {
    if (imageFileRef.current) {
      imageFileRef.current.click();
    }
  };

  const handleGalleryClick = () => {
    if (galleryImagesRef.current) {
      galleryImagesRef.current.click();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate image size first
      if (!validateImageSize(file)) {
        const error = getImageSizeError(file);
        toast.showError('Image Too Large', error || 'Image file is too large');
        // Reset the input
        if (imageFileRef.current) {
          imageFileRef.current.value = '';
        }
        return;
      }
      
      // Update the form state
      setValue("imageUrl", file.name);
      setValue("imageMetadata", {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      // Create temporary URL for preview only (will be cleaned up)
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
      
      // Reset position to center when new image is uploaded
      setImageFocus({ x: 50, y: 50 });
      
      // Store URL for cleanup
      setObjectUrls(prev => [...prev, objectUrl]);
    }
  };

  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Validate all file sizes first
      const filesArray = Array.from(files);
      const invalidFiles: string[] = [];
      
      for (const file of filesArray) {
        if (!validateImageSize(file)) {
          invalidFiles.push(file.name);
        }
      }
      
      if (invalidFiles.length > 0) {
        const errorMessage = invalidFiles.length === 1 
          ? `${invalidFiles[0]} exceeds the maximum file size of ${Math.round(MAX_IMAGE_SIZE / (1024 * 1024))}MB`
          : `${invalidFiles.length} files exceed the maximum size limit of ${Math.round(MAX_IMAGE_SIZE / (1024 * 1024))}MB`;
        toast.showError('Invalid File Size', errorMessage);
        // Reset the input
        if (galleryImagesRef.current) {
          galleryImagesRef.current.value = '';
        }
        return;
      }
      
      // Get current gallery images and limit to max 10 total
      const currentImages = watch("galleryImages") || [];
      const currentPreviews = [...galleryPreviews];
      
      // Calculate how many more images we can add
      const maxNewImages = 10 - currentPreviews.length;
      
      if (maxNewImages <= 0) {
        toast.showWarning('Image Limit Reached', 'Maximum of 10 gallery images allowed');
        return;
      }
      
      // Take only as many new files as we have space for (already validated)
      const filesToAdd = filesArray.slice(0, maxNewImages);
      
      // Update form state with filenames and metadata - append to existing
      const newFilesMetadata = filesToAdd.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      }));
      
      setValue("galleryImages", [...currentImages, ...filesToAdd.map(file => file.name)]);
      setValue("galleryMetadata", [...(watch("galleryMetadata") || []), ...newFilesMetadata]);
      
      // Create temporary object URLs for preview
      const newObjectUrls = filesToAdd.map(file => URL.createObjectURL(file));
      setGalleryPreviews(prev => [...prev, ...newObjectUrls]);
      
      // Store URLs for cleanup
      setObjectUrls(prev => [...prev, ...newObjectUrls]);
      
      if (files.length > maxNewImages) {
        toast.showInfo('Image Limit Reached', `Added ${maxNewImages} images. Maximum limit of 10 gallery images reached.`);
      }
    }
  };

  // Add a state to track all created object URLs
  const [objectUrls, setObjectUrls] = useState<string[]>([]);

  // Add cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Revoke all object URLs when component unmounts
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [objectUrls]);

  // DraggableImage component
  const DraggableImage = () => {
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!imagePreview) return;
      setIsDragging(true);
      setDragStartPosition({
        x: e.clientX,
        y: e.clientY
      });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
      if (!isDragging || !imagePreviewRef.current) return;
      
      const deltaX = e.clientX - dragStartPosition.x;
      const deltaY = e.clientY - dragStartPosition.y;
      
      // Convert pixel change to percentage change based on image container size
      const containerWidth = imagePreviewRef.current.clientWidth;
      const containerHeight = imagePreviewRef.current.clientHeight;
      
      // Update position - limit movement to avoid image edge going too far
      setImageFocus(prev => {
        // Calculate percentage delta (reversed to get natural feeling dragging)
        const percentageX = (deltaX / containerWidth) * -100;
        const percentageY = (deltaY / containerHeight) * -100;
        
        // Calculate new position with boundaries (0-100)
        const newX = Math.max(0, Math.min(100, prev.x + percentageX));
        const newY = Math.max(0, Math.min(100, prev.y + percentageY));
        
        return { x: newX, y: newY };
      });
      
      // Update start position for next move
      setDragStartPosition({
        x: e.clientX,
        y: e.clientY
      });
    }, [isDragging, dragStartPosition, setImageFocus]);

    const handleMouseUp = useCallback(() => {
      setIsDragging(false);
    }, []);

    // Add and remove event listeners
    useEffect(() => {
      if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      }
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    return (
      <div 
        className="img-preview-container relative h-48 w-full overflow-hidden rounded-lg bg-neutral-100 cursor-move group"
        ref={imagePreviewRef}
        onMouseDown={handleMouseDown}
        onTouchStart={() => {/* Add touch support later */}}
      >
        {imagePreview && (
          <>
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${imagePreview})`,
                backgroundSize: 'cover',
                backgroundPosition: `${imageFocus.x}% ${imageFocus.y}%`
              }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <span className="text-transparent group-hover:text-white transition-colors bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                Drag to position
              </span>
            </div>
            
            {/* Add the image focus explanation here */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/50 backdrop-blur-sm text-white text-xs">
              <div className="flex justify-between items-center">
                <span>Image Focus: {Math.round(imageFocus.x)}% x {Math.round(imageFocus.y)}%</span>
                <span className="text-white/80">Drag to adjust</span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Create New Event</h1>
          <p className="text-neutral-500">Fill out the form to create your event</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={saveAsDraft}
            className="w-full sm:w-auto px-4 py-2 border border-neutral-300 text-neutral-700 rounded-md hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Save as Draft
          </button>
          <button 
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="w-full sm:w-auto px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/5 transition-colors cursor-pointer"
          >
            {previewMode ? "Edit Event" : "Preview"}
          </button>
        </div>
      </div>

      {/* Progress Indicators */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 sm:p-4">
        <div className="flex overflow-x-auto gap-2 pb-2 sm:pb-0 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
          {/* Validation summary banner */}
          {showValidationErrors && validationSummary.length > 0 && (
            <div className="w-full mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              <div className="font-medium mb-1">Please fix the following:</div>
              <ul className="list-disc pl-5 space-y-1">
                {validationSummary.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {formSteps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm whitespace-nowrap cursor-pointer flex-shrink-0 relative
                ${currentStep === index 
                  ? "bg-black dark:bg-black text-white" 
                  : getStepValidationStatus(index)
                  ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                  : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"}`}
              onClick={() => setCurrentStep(index)}
            >
              {!getStepValidationStatus(index) && (
                <AlertTriangle className="w-3 h-3 text-red-500" />
              )}
              {step.icon}
              <span className="hidden sm:inline">{step.title}</span>
              <span className="sm:hidden">{index + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {!previewMode ? (
        <FormProvider {...methods}>
          <form className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 sm:p-6">
            {/* Step-specific error messages */}
            {(() => {
              const currentStepErrors = getStepErrors(currentStep);
              if (currentStepErrors.length > 0) {
                return (
                  <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-md text-sm">
                    <div className="font-medium mb-1 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Issues in this step:
                    </div>
                    <ul className="list-disc pl-5 space-y-1">
                      {currentStepErrors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                );
              }
              return null;
            })()}
            {/* Basic Details Step */}
            {currentStep === 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-gray-100">Event Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      {...register("title")}
                      className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-800 rounded-md focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-neutral-900 dark:text-gray-100 placeholder-neutral-500 dark:placeholder-gray-400"
                      placeholder="e.g., Annual Tech Conference 2025"
                    />
                    {errors.title && (
                      <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1">
                      Event Description *
                    </label>
                    <textarea
                      {...register("description")}
                      rows={4}
                      className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-800 rounded-md focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-neutral-900 dark:text-gray-100 placeholder-neutral-500 dark:placeholder-gray-400 sm:rows-6"
                      placeholder="Provide a detailed description of your event..."
                    ></textarea>
                    {errors.description && (
                      <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1">
                        Format *
                      </label>
                      <select
                        {...register("format")}
                        className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-800 rounded-md focus:ring-primary focus:border-primary bg-white dark:bg-neutral-800 text-neutral-900 dark:text-gray-100"
                      >
                        <option value="">Select format</option>
                        <optgroup label="Performances & Entertainment">
                          <option value="Concert">Concert</option>
                          <option value="Festival">Festival</option>
                          <option value="Performance">Performance</option>
                          <option value="Comedy Show">Comedy Show</option>
                          <option value="DJ Night">DJ Night</option>
                          <option value="Screening">Screening</option>
                        </optgroup>
                        <optgroup label="Learning & Professional">
                          <option value="Conference">Conference</option>
                          <option value="Workshop">Workshop</option>
                          <option value="Seminar">Seminar</option>
                          <option value="Webinar">Webinar</option>
                          <option value="Training">Training</option>
                          <option value="Networking">Networking</option>
                        </optgroup>
                        <optgroup label="Exhibitions & Showcases">
                          <option value="Exhibition">Exhibition</option>
                          <option value="Trade Show">Trade Show</option>
                          <option value="Art Show">Art Show</option>
                          <option value="Product Launch">Product Launch</option>
                        </optgroup>
                        <optgroup label="Competitions & Ceremonies">
                          <option value="Competition">Competition</option>
                          <option value="Award Ceremony">Award Ceremony</option>
                          <option value="Beauty Pageant">Beauty Pageant</option>
                          <option value="Contest">Contest</option>
                        </optgroup>
                        <optgroup label="Social Events">
                          <option value="Party">Party</option>
                          <option value="Wedding">Wedding</option>
                          <option value="Gala">Gala</option>
                          <option value="Meetup">Meetup</option>
                        </optgroup>
                        <optgroup label="Other">
                          <option value="Retreat">Retreat</option>
                          <option value="Fundraiser">Fundraiser</option>
                          <option value="Religious Event">Religious Event</option>
                          <option value="Other">Other</option>
                        </optgroup>
                      </select>
                      {errors.format && (
                        <p className="text-red-500 text-sm mt-1">{errors.format.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Category *
                      </label>
                      <select
                        {...register("category")}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                      >
                        <option value="">Select category</option>
                        <optgroup label="Arts & Culture">
                          <option value="music">Music</option>
                          <option value="arts_culture">Arts & Culture</option>
                          <option value="theatre">Theatre</option>
                          <option value="dance">Dance</option>
                          <option value="film">Film</option>
                          <option value="traditional">Traditional</option>
                        </optgroup>
                        <optgroup label="Business & Professional">
                          <option value="business">Business</option>
                          <option value="corporate">Corporate</option>
                          <option value="networking">Networking</option>
                          <option value="career">Career</option>
                        </optgroup>
                        <optgroup label="Lifestyle">
                          <option value="food_drink">Food & Drink</option>
                          <option value="fashion">Fashion</option>
                          <option value="beauty">Beauty</option>
                          <option value="health_wellness">Health & Wellness</option>
                        </optgroup>
                        <optgroup label="Sports & Activities">
                          <option value="sports_fitness">Sports & Fitness</option>
                          <option value="gaming">Gaming</option>
                          <option value="outdoor">Outdoor</option>
                          <option value="adventure">Adventure</option>
                        </optgroup>
                        <optgroup label="Knowledge & Learning">
                          <option value="technology">Technology</option>
                          <option value="education">Education</option>
                          <option value="academic">Academic</option>
                          <option value="workshop">Workshop</option>
                        </optgroup>
                        <optgroup label="Community & Causes">
                          <option value="community">Community</option>
                          <option value="charity">Charity</option>
                          <option value="religious">Religious</option>
                          <option value="political">Political</option>
                        </optgroup>
                        <optgroup label="Other">
                          <option value="entertainment">Entertainment</option>
                          <option value="family_kids">Family & Kids</option>
                          <option value="holiday">Holiday</option>
                          <option value="other">Other</option>
                        </optgroup>
                      </select>
                      {errors.category && (
                        <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Date & Time Step */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold">Date & Time</h2>
                
                <div className="space-y-6">
                  <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                    <h3 className="font-medium mb-2">When will your event take place?</h3>
                    <p className="text-sm text-neutral-600">
                      Set the start and end times for your event
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Start Date *
                      </label>
                      <input
                      type="date"
                      {...register("startDate")}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                      min={new Date().toISOString().split("T")[0]}
                      />
                      {errors.startDate && (
                      <p className="text-red-500 text-sm mt-1">{errors.startDate.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                      End Date <span className="text-red-500">*</span>
                      </label>
                      <input
                      type="date"
                      {...register("endDate")}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                      min={watch("startDate") || new Date().toISOString().split("T")[0]}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Start Time *
                      </label>
                      <input
                        type="time"
                        {...register("startTime")}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                      />
                      {errors.startTime && (
                        <p className="text-red-500 text-sm mt-1">{errors.startTime.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        End Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        {...register("endTime")}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Time Zone
                    </label>
                    <select
                      {...register("timeZone")}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                    >
                      <option value="GMT">Ghana Mean Time (GMT)</option>
                      <option value="UTC">UTC</option>
                      <option value="WAT">West Africa Time (WAT)</option>
                      <option value="CAT">Central Africa Time (CAT)</option>
                      <option value="EAT">East Africa Time (EAT)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Registration Deadline
                    </label>
                    <input
                      type="date"
                      {...register("registrationDeadline")}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                      max={watch("startDate")}
                    />
                    <p className="text-neutral-500 text-sm mt-1">
                      If left blank, registration will be open until the event starts
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Event Outline Step */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold">Event Outline</h2>
                
                <div className="space-y-6">
                  <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                    <h3 className="font-medium mb-2">What happens during your event?</h3>
                    <p className="text-sm text-neutral-600">
                      Create a schedule to help attendees understand what to expect. Add key activities, presentations, or segments.
                    </p>
                  </div>
                  
                  {/* Event Duration */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Event Duration
                    </label>
                    <input
                      type="text"
                      {...register("duration")}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                      placeholder="e.g., 3 hours, 2 days, etc."
                    />
                  </div>
                  
                  {/* What to Expect */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      What to Expect (Features)
                    </label>
                    <div className="border border-neutral-200 rounded-lg p-4">
                      <div className="space-y-3">
                        {watch("features")?.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={feature}
                              onChange={(e) => {
                                const updatedFeatures = [...(watch("features") || [])];
                                updatedFeatures[index] = e.target.value;
                                setValue("features", updatedFeatures);
                              }}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-md"
                              placeholder="e.g., Live performances, Networking opportunities, etc."
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updatedFeatures = [...(watch("features") || [])];
                                updatedFeatures.splice(index, 1);
                                setValue("features", updatedFeatures);
                              }}
                              className="p-2 text-neutral-500 hover:text-red-500 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        
                        <button
                          type="button"
                          onClick={() => {
                          setValue("features", [...(watch("features") || []), ""]);
                          }}
                          className="inline-flex items-center gap-1 text-primary hover:text-primary-dark cursor-pointer"
                        >
                          <PlusCircle className="w-4 h-4" />
                          <span>Add Feature</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Event Schedule */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-neutral-700">
                        Event Schedule
                      </label>
                    </div>
                    
                    <div className="space-y-4">
                      {watch("schedule")?.map((item, index) => (
                        <div key={index} className="border border-neutral-200 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="font-medium">Schedule Item #{index + 1}</h4>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedSchedule = [...(watch("schedule") || [])];
                                updatedSchedule.splice(index, 1);
                                setValue("schedule", updatedSchedule);
                              }}
                              className="text-neutral-400 hover:text-red-500 cursor-pointer"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Time *
                              </label>
                              <input
                                type="text"
                                value={item.time}
                                onChange={(e) => {
                                  const updatedSchedule = [...(watch("schedule") || [])];
                                  updatedSchedule[index].time = e.target.value;
                                  setValue("schedule", updatedSchedule);
                                }}
                                className="w-full px-4 py-2 border border-neutral-300 rounded-md"
                                placeholder="e.g., 9:00 AM"
                              />
                            </div>
                            
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Title *
                              </label>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) => {
                                  const updatedSchedule = [...(watch("schedule") || [])];
                                  updatedSchedule[index].title = e.target.value;
                                  setValue("schedule", updatedSchedule);
                                }}
                                className="w-full px-4 py-2 border border-neutral-300 rounded-md"
                                placeholder="e.g., Opening Ceremony"
                              />
                            </div>
                          </div>
                          
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Description
                            </label>
                            <textarea
                              value={item.description}
                              onChange={(e) => {
                                const updatedSchedule = [...(watch("schedule") || [])];
                                updatedSchedule[index].description = e.target.value;
                                setValue("schedule", updatedSchedule);
                              }}
                              rows={2}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-md"
                              placeholder="Describe what happens during this part of the event"
                            />
                          </div>
                        </div>
                      ))}
                      
                      {(!watch("schedule") || watch("schedule")?.length === 0) && (
                        <div className="border border-neutral-200 border-dashed rounded-lg p-8 text-center">
                          <Clock className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
                          <h4 className="font-medium mb-1">No Schedule Items</h4>
                          <p className="text-neutral-500 text-sm mb-3">
                            Add schedule items to create a timeline for your event
                          </p>
                            <button
                            type="button"
                            onClick={() => {
                              setValue("schedule", [
                              { time: "", title: "", description: "" }
                              ]);
                            }}
                            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-2 px-4 rounded-md transition-colors cursor-pointer"
                            >
                            <PlusCircle className="w-4 h-4 inline mr-1" /> Add First Item
                            </button>
                        </div>
                      )}
                      
                      {/* Add schedule item button at the bottom */}
                      {(watch("schedule")?.length || 0) > 0 && (
                        <div className="flex justify-end mt-4">
                            <button
                            type="button"
                            onClick={() => {
                              setValue("schedule", [
                              ...(watch("schedule") || []),
                              { time: "", title: "", description: "" }
                              ]);
                            }}
                            className="inline-flex items-center gap-1 text-primary hover:text-primary-dark text-sm bg-white border border-primary/20 rounded-md px-3 py-2 hover:bg-primary/5 transition-colors cursor-pointer"
                            >
                            <PlusCircle className="w-4 h-4" />
                            <span>Add Schedule Item</span>
                            </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Location Step */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold">Location</h2>
                
                <div className="space-y-6">
                  <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                    <h3 className="font-medium mb-2">Where will your event be held?</h3>
                    <p className="text-sm text-neutral-600">
                      Specify whether it's an in-person, online, or hybrid event
                    </p>
                  </div>
                  
                  <div className="flex flex-col space-y-3">
                    <label className="text-sm font-medium text-neutral-700">Event Location Type *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div 
                        className={`border rounded-lg p-4 cursor-pointer ${
                          watch("locationType") === "physical" 
                            ? "border-primary bg-primary/5" 
                            : "border-neutral-200 hover:bg-neutral-50"
                        }`}
                        onClick={() => setValue("locationType", "physical")}
                      >
                        <div className="flex items-start">
                          <input
                            type="radio"
                            id="physical"
                            checked={watch("locationType") === "physical"}
                            onChange={() => setValue("locationType", "physical")}
                            className="mt-1"
                          />
                          <div className="ml-2">
                            <label htmlFor="physical" className="font-medium cursor-pointer">In-Person</label>
                            <p className="text-sm text-neutral-600 mt-1">Event will be held at a physical venue</p>
                          </div>
                        </div>
                      </div>
                      
                      <div 
                        className={`border rounded-lg p-4 cursor-pointer ${
                          watch("locationType") === "online" 
                            ? "border-primary bg-primary/5" 
                            : "border-neutral-200 hover:bg-neutral-50"
                        }`}
                        onClick={() => setValue("locationType", "online")}
                      >
                        <div className="flex items-start">
                          <input
                            type="radio"
                            id="online"
                            checked={watch("locationType") === "online"}
                            onChange={() => setValue("locationType", "online")}
                            className="mt-1"
                          />
                          <div className="ml-2">
                            <label htmlFor="online" className="font-medium cursor-pointer">Online</label>
                            <p className="text-sm text-neutral-600 mt-1">Virtual event with online access</p>
                          </div>
                        </div>
                      </div>
                      
                      <div 
                        className={`border rounded-lg p-4 cursor-pointer ${
                          watch("locationType") === "hybrid" 
                            ? "border-primary bg-primary/5" 
                            : "border-neutral-200 hover:bg-neutral-50"
                        }`}
                        onClick={() => setValue("locationType", "hybrid")}
                      >
                        <div className="flex items-start">
                          <input
                            type="radio"
                            id="hybrid"
                            checked={watch("locationType") === "hybrid"}
                            onChange={() => setValue("locationType", "hybrid")}
                            className="mt-1"
                          />
                          <div className="ml-2">
                            <label htmlFor="hybrid" className="font-medium cursor-pointer">Hybrid</label>
                            <p className="text-sm text-neutral-600 mt-1">Both in-person and online options</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Physical Location Fields */}
                  {(watch("locationType") === "physical" || watch("locationType") === "hybrid") && (
                    <>
                      <div>
                        <h3 className="text-lg font-medium mb-3">Physical Location</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Venue Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              {...register("venue")}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                              placeholder="e.g., Kempinski Hotel"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Street Address <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              {...register("address")}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                              placeholder="e.g., 123 Liberation Road"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                City <span className="text-red-500">*</span>
                              </label>
                              <input
                                type="text"
                                {...register("city")}
                                className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                                placeholder="e.g., Accra"
                              />
                              {errors.city && (
                                <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Country <span className="text-red-500">*</span>
                              </label>
                              <select
                                {...register("country")}
                                className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary bg-gray-50"
                                disabled
                              >
                                <option value="Ghana">Ghana</option>
                                {/* Future expansion: Uncomment when scaling to other countries */}
                                {/* <option value="Nigeria">Nigeria</option> */}
                                {/* <option value="South Africa">South Africa</option> */}
                                {/* <option value="Kenya">Kenya</option> */}
                                {/* <option value="Other">Other</option> */}
                              </select>
                              <p className="text-xs text-neutral-500 mt-1">Currently available in Ghana only</p>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Region <span className="text-red-500">*</span>
                            </label>
                            <select
                              {...register("region")}
                              className="select-styled w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                            >
                              <option value="">Select Region</option>
                              <option value="Greater Accra">Greater Accra</option>
                              <option value="Ashanti">Ashanti</option>
                              <option value="Western">Western</option>
                              <option value="Central">Central</option>
                              <option value="Eastern">Eastern</option>
                              <option value="Volta">Volta</option>
                              <option value="Northern">Northern</option>
                              <option value="Upper East">Upper East</option>
                              <option value="Upper West">Upper West</option>
                              <option value="Bono">Bono</option>
                              <option value="Bono East">Bono East</option>
                              <option value="Ahafo">Ahafo</option>
                              <option value="Savannah">Savannah</option>
                              <option value="North East">North East</option>
                              <option value="Oti">Oti</option>
                              <option value="Western North">Western North</option>
                            </select>
                            {errors.region && (
                              <p className="text-red-500 text-sm mt-1">{errors.region.message}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Online Location Fields */}
                  {(watch("locationType") === "online" || watch("locationType") === "hybrid") && (
                    <>
                      <div>
                        <h3 className="text-lg font-medium mb-3">Online Location</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Platform <span className="text-red-500">*</span>
                            </label>
                            <select
                              {...register("onlinePlatform")}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                            >
                              <option value="">Select platform</option>
                              <option value="zoom">Zoom</option>
                              <option value="googlemeet">Google Meet</option>
                              <option value="teams">Microsoft Teams</option>
                              <option value="youtube">YouTube Live</option>
                              <option value="facebook">Facebook Live</option>
                              <option value="other">Other</option>
                            </select>
                            {errors.onlinePlatform && (
                              <p className="text-red-500 text-sm mt-1">{errors.onlinePlatform.message}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Online URL <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              {...register("onlineUrl")}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                              placeholder="e.g., https://zoom.us/j/123456789"
                            />
                            {errors.onlineUrl && (
                              <p className="text-red-500 text-sm mt-1">{errors.onlineUrl.message}</p>
                            )}
                            <p className="text-neutral-500 text-sm mt-1">
                              This will be shared with attendees before the event
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* Tickets Step */}
            {currentStep === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold">Tickets</h2>
                
                <div className="space-y-6">
                  <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                    <h3 className="font-medium mb-2">Create Ticket Types</h3>
                    <p className="text-sm text-neutral-600">
                      Set up different ticket options for your attendees
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    {(watch("tickets") || []).map((ticket, index) => (
                      <div key={ticket.id} className="border border-neutral-200 rounded-lg p-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium">Ticket Type {index + 1}</h4>
                            <button
                            type="button"
                            onClick={() => handleRemoveTicket(ticket.id)}
                            className="text-red-500 hover:text-red-700 cursor-pointer"
                            disabled={(watch("tickets") || []).length <= 1}
                            >
                            <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Ticket Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={ticket.name}
                              onChange={(e) => {
                                const updatedTickets = [...(watch("tickets") || [])];
                                updatedTickets[index].name = e.target.value;
                                setValue("tickets", updatedTickets);
                              }}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                              placeholder="e.g., General Admission"
                            />
                          </div>
                          
                            <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Price (₵) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={ticket.price === 0 ? "" : ticket.price}
                              onFocus={(e) => {
                              if (e.target.value === "0") e.target.value = "";
                              }}
                              onChange={(e) => {
                              const updatedTickets = [...(watch("tickets") || [])];
                              updatedTickets[index].price = Number(e.target.value) || 0;
                              setValue("tickets", updatedTickets);
                              }}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                              placeholder="Leave empty for free events"
                              min="0"
                            />
                            </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Available Quantity <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={ticket.quantity}
                            onChange={(e) => {
                              const updatedTickets = [...(watch("tickets") || [])];
                              updatedTickets[index].quantity = Number(e.target.value);
                              setValue("tickets", updatedTickets);
                            }}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                            placeholder="Enter quantity"
                            min="1"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Ticket Description
                          </label>
                          <textarea
                            value={ticket.description || ""}
                            onChange={(e) => {
                              const updatedTickets = [...(watch("tickets") || [])];
                              updatedTickets[index].description = e.target.value;
                              setValue("tickets", updatedTickets);
                            }}
                            rows={2}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                            placeholder="Describe what's included with this ticket"
                          ></textarea>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Sales Start Date
                            </label>
                            <input
                              type="date"
                              value={ticket.startDate || ""}
                              onChange={(e) => {
                                const updatedTickets = [...(watch("tickets") || [])];
                                updatedTickets[index].startDate = e.target.value;
                                setValue("tickets", updatedTickets);
                              }}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                              min={new Date().toISOString().split("T")[0]} // Disable past dates
                              max={watch("startDate")}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Sales End Date
                            </label>
                            <input
                              type="date"
                              value={ticket.endDate || ""}
                              onChange={(e) => {
                                const updatedTickets = [...(watch("tickets") || [])];
                                updatedTickets[index].endDate = e.target.value;
                                setValue("tickets", updatedTickets);
                              }}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                              min={ticket.startDate || new Date().toISOString().split("T")[0]} // Disable past dates
                              max={watch("startDate")}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={handleAddTicket}
                      className="w-full py-3 border-2 border-dashed border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-5 h-5" />
                      Add Another Ticket Type
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Media Step */}
            {currentStep === 5 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold">Event Media</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Featured Image *
                    </label>
                    <div 
                      onClick={handleImageClick}
                      className="border-2 border-dashed border-neutral-300 rounded-lg p-6 flex flex-col items-center justify-center bg-neutral-50 cursor-pointer hover:bg-neutral-100 transition-colors relative"
                    >
                      {imagePreview ? (
                        <div className="w-full">
                          <DraggableImage />
                          <p className="text-sm text-center text-neutral-600 mt-2">Click to change image</p>
                          
                          {/* Image focus explanation */}
                          <div className="mt-2 p-2 bg-neutral-100 rounded-md">
                            <div className="flex justify-between items-center">
                              <p className="text-sm font-medium text-neutral-600">Image Focus</p>
                              <span className="text-xs text-neutral-600">
                                Adjust how your image appears in different dimensions
                              </span>
                            </div>
                          </div>
                          
                          {/* Add remove button */}
                            <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImagePreview(null);
                              setValue("imageUrl", "");
                            }}
                            className="mt-2 text-sm text-red-500 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                            >
                            <Trash2 className="w-4 h-4" />
                            Remove image
                            </button>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="h-12 w-12 text-neutral-400 mb-2" />
                          <p className="text-neutral-600">Click to upload featured image</p>
                          <p className="text-sm text-neutral-500 mt-1">{`JPG, PNG, or GIF up to ${Math.round(MAX_IMAGE_SIZE / (1024 * 1024))}MB`}</p>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={imageFileRef}
                        onChange={handleImageChange}
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-2 p-2 rounded bg-yellow-50 border border-yellow-300">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium text-yellow-800">
                        Pro tip: Choose images that capture the right mood, and keep text overlays minimal to avoid distractions.
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Gallery Images (Up to 10)
                    </label>
                    <div 
                      onClick={handleGalleryClick}
                      className="border-2 border-dashed border-neutral-300 rounded-lg p-6 flex flex-col items-center justify-center bg-neutral-50 cursor-pointer hover:bg-neutral-100 transition-colors"
                    >
                      {galleryPreviews.length > 0 ? (
                        <div className="w-full">
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-3">
                            {galleryPreviews.map((preview, index) => (
                              <div key={index} className="aspect-square relative group">
                                <Image 
                                  src={preview} 
                                  alt={`Gallery image ${index + 1}`} 
                                  width={120}
                                  height={120}
                                  className="w-full h-full object-cover rounded" 
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                  e.stopPropagation();
                                  // Remove image from previews
                                  setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
                                  // Remove from form state
                                  const currentImages = watch("galleryImages") || [];
                                  setValue(
                                    "galleryImages", 
                                    currentImages.filter((_, i) => i !== index)
                                  );
                                  }}
                                  className="absolute top-1 right-1 bg-white/80 backdrop-blur-sm p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-500 transition-opacity cursor-pointer"
                                  aria-label={`Remove image ${index + 1}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                          {galleryPreviews.length > 0 && (
                            <div className="flex justify-between text-sm text-neutral-500 mb-2">
                              <span>{galleryPreviews.length}/10 images</span>
                              <span className="text-primary cursor-pointer" onClick={handleGalleryClick}>
                                Add more
                              </span>
                            </div>
                          )}
                          <p className="text-sm text-center text-neutral-600">
                            {galleryPreviews.length === 0 ? "Click to upload gallery images" : "Click to add more images"}
                          </p>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="h-12 w-12 text-neutral-400 mb-2" />
                          <p className="text-neutral-600">Click to upload gallery images</p>
                          <p className="text-sm text-neutral-500 mt-1">{`Show your event from multiple angles (max ${Math.round(MAX_IMAGE_SIZE / (1024 * 1024))}MB each)`}</p>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        ref={galleryImagesRef}
                        onChange={handleGalleryImagesChange}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Voting Step */}
            {currentStep === 6 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold">Voting Configuration</h2>
                
                <div className="space-y-6">
                  <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                    <h3 className="font-medium mb-2">Enable Voting for this Event</h3>
                    <p className="text-sm text-neutral-600">
                      Allow audience to vote for contestants during your event
                    </p>
                  </div>
                  
                    <div className="flex items-center p-4 border border-neutral-200 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      id="hasVoting"
                      {...register("hasVoting")}
                      className="h-5 w-5 text-primary border-neutral-300 rounded cursor-pointer"
                    />
                    <label htmlFor="hasVoting" className="ml-3 font-medium cursor-pointer">
                      Enable voting for this event
                    </label>
                    </div>
                  
                  {watch("hasVoting") && (
                    <>
                      <div className="border border-neutral-200 rounded-lg p-4 space-y-4">
                        <h3 className="font-medium">Voting Settings</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Voting Start Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            {...register("votingInfo.startDate")}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-md"
                            min={new Date().toISOString().split("T")[0]}
                          />
                          </div>
                          
                          <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Voting End Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            {...register("votingInfo.endDate")}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-md"
                            min={watch("votingInfo.startDate") || new Date().toISOString().split("T")[0]}
                          />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Current Phase
                            </label>
                            <input
                              type="text"
                              {...register("votingInfo.currentPhase")}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-md"
                              placeholder="e.g., Auditions, Semi-finals, Finals"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Cost per Vote (₵) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0.1"
                              {...register("votingInfo.voteCost", { valueAsNumber: true })}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-md"
                              placeholder="1.00"
                              defaultValue={1}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">Contestants <span className="text-red-500">*</span></h3>
                        </div>
                        
                        {/* Show validation error if voting is enabled but no contestants */}
                        {watch("hasVoting") && ((watch("contestants") ?? []).length === 0) && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm flex items-center">
                              <AlertTriangle className="w-4 h-4 mr-1" />
                              At least one contestant is required when voting is enabled
                            </p>
                          </div>
                        )}
                        
                        {/* Contestants list */}
                        <div className="space-y-4">
                          {(watch("contestants") || []).map((contestant, index) => (
                            <div key={index} className="border border-neutral-200 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="font-medium">Contestant #{index + 1}</h4>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveContestant(index)}
                                  className="text-neutral-400 hover:text-red-500 cursor-pointer"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Name <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    {...register(`contestants.${index}.name`)}
                                    className="w-full px-4 py-2 border border-neutral-300 rounded-md"
                                    placeholder="Contestant name"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Contestant ID
                                  </label>
                                  <input
                                    type="text"
                                    {...register(`contestants.${index}.id`)}
                                    className="w-full px-4 py-2 border border-neutral-300 rounded-md"
                                    placeholder="Unique identifier"
                                    defaultValue={`contestant-${Date.now()}-${index}`}
                                    readOnly
                                  />
                                </div>
                              </div>
                              
                              <div className="mt-3">
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                  Description
                                </label>
                                <textarea
                                  {...register(`contestants.${index}.description`)}
                                  rows={2}
                                  className="w-full px-4 py-2 border border-neutral-300 rounded-md"
                                  placeholder="Brief description of the contestant"
                                />
                              </div>
                              
                              <div className="mt-3">
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                  Contestant Image
                                </label>
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-16 h-16 bg-neutral-100 rounded-full overflow-hidden relative cursor-pointer group"
                                    onClick={() => {
                                      const fileInputs = document.querySelectorAll<HTMLInputElement>(
                                        `input[type="file"][data-contestant-index]`
                                      );
                                      fileInputs[index]?.click();
                                    }}
                                    tabIndex={0}
                                    role="button"
                                    aria-label="Upload contestant image"
                                  >
                                    {contestant.image ? (
                                      <div
                                        className="absolute inset-0 bg-cover bg-center"
                                        style={{ backgroundImage: `url(${contestant.image})` }}
                                      />
                                    ) : (
                                      <div className="absolute inset-0 flex items-center justify-center text-neutral-400">
                                        <Users className="w-8 h-8" />
                                      </div>
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Upload className="w-6 h-6 text-white" />
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <input
                                      type="file"
                                      data-contestant-index={index}
                                      onChange={(e) => handleContestantImageUpload(e, index)}
                                      className="w-full text-sm hidden"
                                    />
                                    <p className="text-xs text-neutral-500 mt-1">
                                      Recommended: Square image, at least 300x300px
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {/* Only show Add Contestant button below the last contestant card */}
                          {(watch("contestants") || []).length > 0 && (
                            <div className="mt-4 flex justify-end">
                              <button
                                type="button"
                                onClick={handleAddContestant}
                                className="text-primary flex items-center gap-1 cursor-pointer"
                              >
                                <PlusCircle className="w-4 h-4" /> Add Contestant
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {(watch("contestants") || []).length === 0 && (
                          <div className="border border-neutral-200 border-dashed rounded-lg p-8 text-center">
                            <Users className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
                            <h4 className="font-medium mb-1">No Contestants Added</h4>
                            <p className="text-neutral-500 text-sm mb-3">
                              Add contestants for your voting event
                            </p>
                            <button
                              type="button"
                              onClick={handleAddContestant}
                              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-2 px-4 rounded-md transition-colors cursor-pointer"
                            >
                              <PlusCircle className="w-4 h-4 inline mr-1" /> Add First Contestant
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* Settings Step */}
            {currentStep === 7 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold">Event Settings</h2>
                
                <div className="space-y-6">
                  <div>
                  <h3 className="text-lg font-medium mb-3">Event Visibility</h3>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-neutral-200 rounded-lg gap-3">
                    <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="publishStatus"
                      checked={watch("status") === "published"}
                      onChange={(e) => {
                      setValue("status", e.target.checked ? "published" : "draft");
                      }}
                      className="h-4 w-4 text-primary border-neutral-300 rounded cursor-pointer"
                    />
                    <div className="ml-3">
                      <label htmlFor="publishStatus" className="font-medium text-neutral-700 cursor-pointer">
                      Published Event
                      </label>
                      <p className="text-sm text-neutral-500">Your event will be visible and ticketing will be live</p>
                    </div>
                    </div>
                  </div>
                  </div>
                  
                  <div className="space-y-3">
                  <h3 className="text-lg font-medium mb-3">Additional Settings</h3>
                  
                  <div className="flex items-center p-3 border border-neutral-200 rounded-lg">
                    <input
                    type="checkbox"
                    id="isPrivate"
                    {...register("isPrivate")}
                    className="h-4 w-4 text-primary border-neutral-300 rounded cursor-pointer"
                    />
                    <div className="ml-3">
                    <label htmlFor="isPrivate" className="font-medium text-neutral-700 cursor-pointer">
                      Private event
                    </label>
                    <p className="text-sm text-neutral-500">Only accessible via direct link</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 border border-neutral-200 rounded-lg">
                    <input
                    type="checkbox"
                    id="requireApproval"
                    {...register("requireApproval")}
                    className="h-4 w-4 text-primary border-neutral-300 rounded cursor-pointer"
                    />
                    <div className="ml-3">
                    <label htmlFor="requireApproval" className="font-medium text-neutral-700 cursor-pointer">
                      Require registration approval
                    </label>
                    <p className="text-sm text-neutral-500">You'll need to approve attendees before they can register</p>
                    </div>
                  </div>
                  </div>
                  
                  <div>
                  <h3 className="text-lg font-medium mb-3">Event Tags</h3>
                  <div className="border border-neutral-200 rounded-lg p-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                    {(watch("eventTags") || []).map(tag => (
                      <div key={tag} className="bg-neutral-100 px-3 py-1 rounded-full flex items-center gap-1">
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-neutral-400 hover:text-red-500"
                      >
                        <span className="sr-only">Remove</span>
                        <XCircle className="w-4 h-4" />
                      </button>
                      </div>
                    ))}
                    </div>
                    
                    <div className="flex gap-2">
                    <input
                      type="text"
                      id="tag-input"
                      className="flex-1 px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                      placeholder="Add a tag and press Enter"
                      onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const value = (e.target as HTMLInputElement).value;
                        handleAddTag(value);
                        (e.target as HTMLInputElement).value = "";
                      }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                      const tagInput = document.getElementById("tag-input") as HTMLInputElement;
                      const value = tagInput.value;
                      handleAddTag(value);
                      tagInput.value = "";
                      }}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add Tag
                    </button>
                    </div>
                  </div>
                  </div>
                  
                  <div>
                  <h3 className="text-lg font-medium mb-3">Organizer Notes</h3>
                  <textarea
                    {...register("organizerNotes")}
                    rows={3}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="Add any internal notes about this event (only visible to you)"
                  ></textarea>
                  <p className="text-neutral-500 text-sm mt-1">
                    These notes are only visible to you and other organizers
                  </p>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Navigation buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-5 border-t border-neutral-200">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={currentStep === 0}
                className={`w-full sm:w-auto px-4 py-2 flex items-center justify-center gap-2 ${
                  currentStep === 0
                    ? "text-neutral-300 cursor-not-allowed"
                    : "text-neutral-700 hover:text-neutral-900 cursor-pointer"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>
              
              {currentStep < formSteps.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit((data: EventFormValues) => onSubmit(data, false))}
                  disabled={!isValid || isSubmitting}
                  className={`w-full sm:w-auto px-6 py-2 rounded-md font-medium flex items-center justify-center gap-2 ${
                  !isValid || isSubmitting
                    ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                    : "bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer"
                  }`}
                >
                  {isSubmitting 
                  ? "Creating..." 
                  : !isValid 
                    ? "Please fill all required fields" 
                    : (watch("status") === "draft" ? "Create Draft" : "Create Event")}
                </button>
              )}
            </div>
          </form>
        </FormProvider>
      ) : (
        // Preview mode
        <div className="bg-white rounded-lg border border-neutral-200 p-4 sm:p-6">
          <div className="mb-4 pb-4 border-b border-neutral-200">
            <h2 className="text-xl font-semibold">Event Preview</h2>
            <p className="text-neutral-500">
              This is how your event will appear to attendees
            </p>
          </div>
          
          <div className="space-y-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold mb-2">{formData.title || "Event Title"}</h1>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-neutral-700">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {formData.startDate
                      ? new Date(formData.startDate).toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric'
                        })
                      : "Date TBD"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formData.startTime || "Time TBD"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {formData.locationType === "physical"
                      ? (formData.city ? `${formData.city}, ${formData.country}` : "Location TBD")
                      : "Online Event"}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="relative bg-neutral-200 h-64 w-full rounded-lg overflow-hidden">
              {imagePreview ? (
                <div 
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${imagePreview})`,
                    backgroundSize: 'cover',
                    backgroundPosition: `${imageFocus.x}% ${imageFocus.y}%`
                  }}
                />
              ) : (
                <div className="text-center text-neutral-500 absolute inset-0 flex flex-col items-center justify-center">
                  <ImageIcon className="h-8 w-8 mb-2" />
                  <p>Featured image will appear here</p>
                </div>
              )}
            </div>
            
            <div className="bg-neutral-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-neutral-700 whitespace-pre-line">
                {formData.description || "No description provided yet."}
              </p>
            </div>
            
            {formData.features && formData.features.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">What to expect</h3>
                <ul className="space-y-2">
                  {formData.features.filter(f => f).map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {formData.schedule && formData.schedule.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Event Schedule</h3>
                  {formData.duration && (
                    <div className="text-sm text-neutral-600 flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {formData.duration}
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {formData.schedule.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="relative">
                        <div className="w-3 h-3 bg-primary rounded-full" />
                        {Array.isArray(formData.schedule) && index !== formData.schedule.length - 1 && (
                          <div className="w-0.5 h-full bg-neutral-200 absolute top-3 left-1.5" />
                        )}
                      </div>
                      <div className="pb-4">
                        <div className="text-sm text-neutral-500">{item.time}</div>
                        <div className="font-medium">{item.title}</div>
                        {item.description && <p className="text-neutral-700 text-sm mt-1">{item.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPreviewMode(false)}
                className="px-6 py-2 bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Edit
              </button>
              
              <button
                type="button"
                onClick={handleSubmit((data: EventFormValues) => onSubmit(data, true))}
                disabled={isSubmitting}
                className={`px-6 py-2 rounded-md font-medium flex items-center justify-center gap-2 ${
                  isSubmitting
                    ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                    : "bg-primary text-white hover:bg-primary-dark transition-colors"
                }`}
              >
                {isSubmitting ? "Saving..." : "Save as Draft"}
              </button>
              
                <button
                type="button"
                onClick={() => {
                  if (!isValid) {
                    setShowValidationErrors(true);
                    trigger(); // Trigger validation to show all errors
                    return;
                  }
                  handleSubmit((data: EventFormValues) => onSubmit(data, false))();
                }}
                disabled={isSubmitting}
                className={`px-6 py-2 rounded-md font-medium flex items-center justify-center gap-2 ${
                  !isValid
                  ? "bg-yellow-500 text-white hover:bg-yellow-600 cursor-pointer"
                  : isSubmitting
                  ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer"
                }`}
                >
                {isSubmitting 
                  ? "Creating..." 
                  : !isValid 
                  ? "Show Missing Fields" 
                  : watch("status") === "draft" ? "Create Draft" : "Create Event"}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wherever events are loaded from localStorage, ensure organizer info is included
// If organizer info is missing, you can add a default:

// Replace the top-level localStorage access with a safe guard:
let loadedEvents: any[] = [];
if (typeof window !== 'undefined') {
  try {
    loadedEvents = (JSON.parse(localStorage.getItem('events') || '[]') as any[])
      .map((event: any) => ({
        ...event,
        organizer: event.organizer || { id: 'default', name: 'Event Organizer' }
      }));
  } catch (e) {
    console.warn('Failed to load events from localStorage', e);
    loadedEvents = [];
  }
}
