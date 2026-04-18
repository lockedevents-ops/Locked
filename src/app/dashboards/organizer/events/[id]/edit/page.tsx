"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { getFormattedImagePath } from '@/utils/imageHelpers';
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
  Loader2,
  AlertCircle,
  Upload,
  ShoppingBag,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useDurationCalculator } from '@/hooks/useDurationCalculator';
import { LocationPicker } from '@/components/LocationPicker';
import { 
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

// Minimal draft schema - only requires title
const draftFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  timeZone: z.string().optional(),
  registrationDeadline: z.string().optional(),
  locationType: z.enum(["physical", "online", "hybrid"]).optional(),
  venue: z.string().optional(),
  venueId: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  onlineUrl: z.string().optional(),
  onlinePlatform: z.string().optional(),
  meetingCode: z.string().optional(),
  meetingPassword: z.string().optional(),
  tickets: z.array(z.any()).optional(),
  imageUrl: z.string().optional(),
  imageMetadata: z.any().optional(),
  galleryImages: z.array(z.string()).optional(),
  galleryMetadata: z.array(z.any()).optional(),
  isPrivate: z.boolean().optional(),
  eventTags: z.array(z.string()).optional(),
  organizerNotes: z.string().optional(),
  status: z.enum(["published", "draft"]).optional(),
  hasVoting: z.boolean().optional(),
  votingInfo: z.any().optional(),
  contestants: z.array(z.any()).optional(),
  duration: z.string().optional(),
  features: z.array(z.string()).optional(),
  schedule: z.array(z.any()).optional(),
});

// Enhanced event form schema with comprehensive validations for editing
const eventFormSchema = z.object({
  // Basic Details
  title: z.string().min(5, "Event title is required (minimum 5 characters)")
    .max(100, "Event title cannot exceed 100 characters"),
    // Note: Duplicate title checking is skipped for edit mode since the title belongs to the current event
  description: z.string().min(20, "Event description is required (minimum 20 characters)"),
  category: z.string().min(1, "Category is required"),
  
  // Date and Time - only start date/time are required
  startDate: z.string().min(1, "Start date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endDate: z.string().optional(), // Made clearly optional
  endTime: z.string().optional(), // Made clearly optional
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
  region: z.string().optional(),
  country: z.string().optional(), // Base field optional, will be validated with refine
  latitude: z.number().optional(),
  longitude: z.number().optional(),
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
  meetingCode: z.string().optional(),
  meetingPassword: z.string().optional(),
  
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

  // Merchandise
  hasMerch: z.boolean().default(false),
  merchProducts: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1, "Product name is required"),
      description: z.string().optional(),
      price: z.number().min(0, "Price must be positive"),
      image: z.string().optional(),
      imageFile: z.any().optional(),
      deliveryOption: z.array(z.enum(['pickup', 'nationwide'])).min(1, "Select at least one delivery option").default(['pickup'])
    })
  ).optional(),

  // 18+ Confirmation
  isAdult: z.boolean().default(false),

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
  // Only validate city & country for physical/hybrid locations
  if (data.locationType === "physical" || data.locationType === "hybrid") {
    return !!data.city && !!data.country;
  }
  return true;
}, {
  message: "City and Country are required for physical or hybrid events",
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
});
// Note: Online URL platform matching validation removed to prevent async validation blocking form updates
// The validation will still occur server-side during submission

type EventFormValues = z.infer<typeof eventFormSchema>;

const EVENT_EDIT_DRAFT_PREFIX = 'locked:event-editor:draft:';
const EVENT_EDIT_REFRESH_FLAG_KEY = 'locked:event-editor:refresh';
const EVENT_EDIT_AUTOSAVE_DELAY = 800;

type EventEditorDraftPayload = {
  version: number;
  updatedAt: number;
  eventId: string;
  data: EventFormValues;
};

const buildEventEditorDraftKey = (eventId?: string) => {
  if (!eventId) {
    return null;
  }
  return `${EVENT_EDIT_DRAFT_PREFIX}${eventId}`;
};

const hasMeaningfulEditorDraftData = (values?: Partial<EventFormValues>) => {
  if (!values) return false;
  if (values.title?.trim()) return true;
  if (values.description?.trim()) return true;
  if (values.category) return true;
  if (values.imageUrl) return true;
  if (values.startDate || values.startTime || values.endDate || values.endTime) return true;
  if (values.city?.trim() || values.country?.trim() || values.venue?.trim() || values.onlineUrl?.trim()) return true;
  if (values.tickets && values.tickets.some(ticket => {
    if (!ticket) return false;
    if (typeof ticket.quantity === 'number' && ticket.quantity > 0) return true;
    if (typeof ticket.price === 'number' && ticket.price > 0) return true;
    const defaultName = DEFAULT_VALUES.tickets?.[0]?.name || '';
    if (ticket.name?.trim() && ticket.name.trim() !== defaultName) return true;
    return false;
  })) {
    return true;
  }
  if (values.features && values.features.length > 0) return true;
  if (values.schedule && values.schedule.length > 0) return true;
  return false;
};

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
  startDate: "",
  startTime: "",
  endDate: "", // Optional but included for completeness
  endTime: "", // Optional but included for completeness
  timeZone: "GMT",
  locationType: "physical",
  city: "", // Will be validated only for physical/hybrid
  country: "Ghana",
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

import { useParams } from 'next/navigation';

// Duration Display Component
function DurationDisplayField({ watch }: { watch: any }) {
  const durationResult = useDurationCalculator(watch);
  
  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        Event Duration
      </label>
      {durationResult.hasError ? (
        <div className="w-full px-4 py-3 border border-red-300 bg-red-50 rounded-md flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="text-sm text-red-700">{durationResult.errorMessage}</span>
        </div>
      ) : (
        <div className="w-full px-4 py-3 border border-neutral-300 bg-neutral-50 rounded-md">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-neutral-600" />
            <span className="text-sm font-medium text-neutral-700">
              {durationResult.formattedDuration || 'Add start and end times to auto-calculate'}
            </span>
          </div>
        </div>
      )}
      <p className="text-neutral-500 text-xs mt-1">
        Duration is automatically calculated from start and end times
      </p>
    </div>
  );
}

export default function CreateEventPage() {
  const params = useParams<{ id: string }>();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [showGalleryDeleteModal, setShowGalleryDeleteModal] = useState(false);
  const [pendingGalleryDeleteIndex, setPendingGalleryDeleteIndex] = useState<number | null>(null);
  const [galleryAutoConfirmUntil, setGalleryAutoConfirmUntil] = useState<number | null>(null);
  const [isEditingDraft, setIsEditingDraft] = useState<boolean>(false); // Track if editing a draft
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // Track unsaved changes
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false); // Exit confirmation modal
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null); // Store pending route
  const router = useRouter();
  const toast = useToast();
  
  const imageFileRef = useRef<HTMLInputElement>(null);
  const galleryImagesRef = useRef<HTMLInputElement>(null);
  const imagePreviewRef = useRef<HTMLDivElement>(null);
  const productFilesRef = useRef<Record<string, File>>({});

  // Add these new states for position control
  const [imageFocus, setImageFocus] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  // State for storing actual file uploads
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedGalleryFiles, setSelectedGalleryFiles] = useState<File[]>([]);
  const objectUrlsRef = useRef<string[]>([]);
  
  // Use draft schema for drafts, full schema for published events
  const methods = useForm<EventFormValues>({
    resolver: zodResolver((isEditingDraft ? draftFormSchema : eventFormSchema) as any),
    defaultValues: DEFAULT_VALUES as any,
    mode: 'onChange'
  });
  
  const { handleSubmit, formState: { errors, isValid, touchedFields }, watch, setValue, reset, register, trigger } = methods;
  const latestFormValuesRef = useRef<EventFormValues>(methods.getValues());
  const draftSaveTimeoutRef = useRef<number | null>(null);
  const isRestoringDraftRef = useRef(false);
  const restoredFromLocalRef = useRef(false);

  const persistDraftToStorage = useCallback((values: EventFormValues) => {
    if (typeof window === 'undefined') return;
    const storageKey = buildEventEditorDraftKey(params.id);
    if (!storageKey) return;

    if (!values || !hasMeaningfulEditorDraftData(values)) {
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        console.error('[EventEditor] Failed to remove empty draft', error);
      }
      return;
    }

    try {
      const payload: EventEditorDraftPayload = {
        version: 1,
        updatedAt: Date.now(),
        eventId: params.id,
        data: values,
      };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (error) {
      console.error('[EventEditor] Failed to persist draft', error);
    }
  }, [params.id]);

  const clearDraftFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    const storageKey = buildEventEditorDraftKey(params.id);
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
      sessionStorage.removeItem(EVENT_EDIT_REFRESH_FLAG_KEY);
    } catch (error) {
      console.error('[EventEditor] Failed to clear stored draft', error);
    }
  }, [params.id]);

  const scheduleDraftSave = useCallback((values: EventFormValues) => {
    if (typeof window === 'undefined') return;

    if (draftSaveTimeoutRef.current !== null) {
      window.clearTimeout(draftSaveTimeoutRef.current);
      draftSaveTimeoutRef.current = null;
    }

    draftSaveTimeoutRef.current = window.setTimeout(() => {
      persistDraftToStorage(values);
    }, EVENT_EDIT_AUTOSAVE_DELAY);
  }, [persistDraftToStorage]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && draftSaveTimeoutRef.current !== null) {
        window.clearTimeout(draftSaveTimeoutRef.current);
        draftSaveTimeoutRef.current = null;
      }
    };
  }, []);
  
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
        break;
      case 1: // Date & Time
        if (errors.startDate) stepErrors.push(errors.startDate.message || 'Start date is required');
        if (errors.startTime) stepErrors.push(errors.startTime.message || 'Start time is required');
        break;
      case 3: // Location
        if (errors.city) stepErrors.push(errors.city.message || 'City is required for this location type');
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
    { id: "merch", title: "Merchandise", icon: <ShoppingBag className="w-5 h-5" /> },
    { id: "settings", title: "Settings", icon: <CheckSquare className="w-5 h-5" /> },
  ];
  
  // Preview the current form data
  const formData = watch();

  // Handle next step
  const handleNextStep = () => {
    if (currentStep < formSteps.length - 1) {
      // Validate current step before proceeding
      const currentStepErrors = getStepErrors(currentStep);
      if (currentStepErrors.length > 0 && !isEditingDraft) {
        setShowValidationErrors(true);
        toast.showError('Validation Error', `Please fix the errors in ${formSteps[currentStep].title}`);
        return;
      }
      
      setCurrentStep(currentStep + 1);
      
      // ✅ Scroll to top of page when changing steps
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Also update URL hash for bookmarking
      window.history.replaceState(null, '', `#${formSteps[currentStep + 1].id}`);
    }
  };

  // Handle previous step
  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      
      // ✅ Scroll to top of page when changing steps
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Update URL hash
      window.history.replaceState(null, '', `#${formSteps[currentStep - 1].id}`);
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
      toast.showError('Validation Error', 'You must have at least one ticket type');
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

  // Handle form submission
  const onSubmit = async (data: EventFormValues, isDraft = false) => {
    setIsSubmitting(true);
    
    // Use either the explicit isDraft parameter or the form status field
    const finalStatus: "draft" | "published" = isDraft || data.status === "draft" ? "draft" : "published";
    
    try {
      // Get current user
      const { createClient } = await import('@/lib/supabase/client/client');
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.showError('Authentication Required', 'Authentication required');
        router.push('/auth/login');
        return;
      }
      
      // Use the current event ID
      const eventId = params.id as string;
      
      // Import the database service
      const { eventDatabaseService } = await import('@/services/eventDatabaseService');
      
      // ✅ Check if this is a draft event by looking at the event_drafts table
      const { data: existingDraft } = await supabase
        .from('event_drafts')
        .select('id')
        .eq('id', eventId)
        .single();
      
      const isEditingDraft = !!existingDraft;
      
      // Upload featured image if a new one was selected
      let imageUrl = data.imageUrl;
      if (selectedImageFile) {
        try {
          console.log("Uploading new featured image:", selectedImageFile.name);
          imageUrl = await eventDatabaseService.uploadEventImage(selectedImageFile, user.id);
          console.log("Featured image uploaded successfully:", imageUrl);
        } catch (error) {
          console.error('Error uploading featured image:', error);
          toast.showError('Upload Failed', 'Failed to upload featured image');
        }
      }
      
      // Upload new gallery images if any were selected
      let galleryImagePaths = data.galleryImages || [];
      if (selectedGalleryFiles.length > 0) {
        try {
          console.log("Uploading", selectedGalleryFiles.length, "new gallery images...");
          // Upload new gallery images and get their storage paths
          const newPaths = await eventDatabaseService.uploadGalleryImages(selectedGalleryFiles, user.id);
          console.log("New gallery images uploaded. Paths:", newPaths);
          
          // Keep existing gallery images that are already storage paths (contain 'event-images/')
          const existingPaths = (data.galleryImages || []).filter(img => 
            typeof img === 'string' && img.includes('event-images/')
          );
          
          // Combine existing and new paths
          galleryImagePaths = [...existingPaths, ...newPaths];
          console.log("Combined gallery paths:", galleryImagePaths);
        } catch (error) {
          console.error('Error uploading gallery images:', error);
          toast.showWarning('Partial Upload', 'Some gallery images failed to upload');
        }
      }
      
      // Upload Merchandise Images
      const currentProducts = data.merchProducts || [];
      const productsWithImages = await Promise.all(currentProducts.map(async (product) => {
        // Check if we have a file for this product
        if (productFilesRef.current && productFilesRef.current[product.id]) {
          const file = productFilesRef.current[product.id];
          try {
            console.log(`Uploading image for product ${product.name}...`);
            const uploadedUrl = await eventDatabaseService.uploadMerchImage(file);
            return { ...product, image: uploadedUrl };
          } catch (err) {
            console.error(`Failed to upload image for product ${product.name}`, err);
            return product; // Keep original (preview) URL or empty if failed
          }
        }
        return product;
      }));

      // Format the data for database update
      const eventData = {
        title: data.title,
        description: data.description,
        category: data.category,
        
        // Date & Time
        startDate: data.startDate,
        endDate: data.endDate,
        startTime: data.startTime,
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
        latitude: data.latitude, // Add captured coordinates
        longitude: data.longitude, // Add captured coordinates
        onlineUrl: data.onlineUrl,
        onlinePlatform: data.onlinePlatform,
        meetingCode: data.meetingCode,
        meetingPassword: data.meetingPassword,
        
        // Tickets
        tickets: data.tickets,
        
        // Media - use uploaded URLs and paths
        imageUrl: imageUrl,
        galleryImages: galleryImagePaths,
        
        // Settings
        isPrivate: data.isPrivate,
        eventTags: data.eventTags,
        organizerNotes: data.organizerNotes,
        
        // Status
        status: finalStatus,
        
        // Voting
        hasVoting: data.hasVoting === true,
        votingInfo: data.hasVoting ? data.votingInfo : undefined,
        contestants: data.hasVoting ? data.contestants : undefined,

        // Additional fields
        features: data.features || [],
        schedule: data.schedule || [],
        duration: data.duration || "",
        
        // Merchandise
        hasMerch: data.hasMerch,
        merchProducts: productsWithImages,
        
        // Age Restriction
        ageRestriction: data.isAdult ? 18 : 0,
      };
      
      // ✅ If editing a draft and keeping it as draft, update the draft table
      if (isEditingDraft && finalStatus === "draft") {
        const { error: updateError } = await supabase
          .from('event_drafts')
          .update({
            draft_data: eventData,
            updated_at: new Date().toISOString()
          })
          .eq('id', eventId)
          .eq('user_id', user.id);
        
        if (updateError) {
          console.error('Error updating draft:', updateError);
          throw updateError;
        }
        
        setHasUnsavedChanges(false); // ✅ Clear unsaved changes flag
        clearDraftFromStorage();
        toast.showSuccess('Draft Updated', 'Event draft updated successfully');
        setHasUnsavedChanges(false);
        clearDraftFromStorage();
        setTimeout(() => {
          router.push('/dashboards/organizer/draft-events');
        }, 500);
      }
      // ✅ If publishing a draft, move it from drafts to events table
      else if (isEditingDraft && finalStatus === "published") {
        // Create new event in events table
        await eventDatabaseService.createEvent(eventData, user.id);
        
        // Delete from drafts table
        await supabase
          .from('event_drafts')
          .delete()
          .eq('id', eventId)
          .eq('user_id', user.id);
        
        setHasUnsavedChanges(false); // ✅ Clear unsaved changes flag
        clearDraftFromStorage();
        toast.showSuccess('Event Published', 'Event published successfully');
        setTimeout(() => {
          router.push('/dashboards/organizer/events');
        }, 500);
      }
      // ✅ If editing a published event, update the events table
      else {
        await eventDatabaseService.updateEvent(eventId, eventData, user.id);
        
        setHasUnsavedChanges(false); // ✅ Clear unsaved changes flag
        clearDraftFromStorage();
        toast.showSuccess(
          finalStatus === "draft" ? 'Draft Saved' : 'Event Updated',
          finalStatus === "draft" 
            ? "Event saved as draft" 
            : "Event updated successfully"
        );
        
        setTimeout(() => {
          router.push(`/dashboards/organizer/events/${eventId}`);
        }, 500);
      }
    } catch (error) {
      console.error("Error updating event:", error);
      toast.showError('Update Failed', 'Failed to update event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save as draft - bypass validation and only require title
  const saveAsDraft = async () => {
    const currentData = methods.getValues();
    
    // Ensure minimal required fields for drafts
    if (!currentData.title || currentData.title.trim().length === 0) {
      toast.showError('Title Required', 'Please provide at least a title for your event draft');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get current user
      const { createClient } = await import('@/lib/supabase/client/client');
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.showError('Authentication Required', 'Authentication required');
        router.push('/auth/login');
        return;
      }
      
      // Use the current event ID
      const eventId = params.id as string;
      
      // Import the database service
      const { eventDatabaseService } = await import('@/services/eventDatabaseService');
      
      // Upload featured image if a new one was selected
      let imageUrl = currentData.imageUrl;
      if (selectedImageFile) {
        try {
          console.log("Uploading new featured image:", selectedImageFile.name);
          imageUrl = await eventDatabaseService.uploadEventImage(selectedImageFile, user.id);
          console.log("Featured image uploaded successfully:", imageUrl);
        } catch (error) {
          console.error('Error uploading featured image:', error);
          toast.showWarning('Upload Warning', 'Failed to upload featured image');
        }
      }
      
      // Upload new gallery images if any were selected
      let galleryImagePaths = currentData.galleryImages || [];
      if (selectedGalleryFiles.length > 0) {
        try {
          console.log("Uploading", selectedGalleryFiles.length, "new gallery images...");
          const newPaths = await eventDatabaseService.uploadGalleryImages(selectedGalleryFiles, user.id);
          console.log("New gallery images uploaded. Paths:", newPaths);
          
          const existingPaths = (currentData.galleryImages || []).filter(img => 
            typeof img === 'string' && img.includes('event-images/')
          );
          
          galleryImagePaths = [...existingPaths, ...newPaths];
          console.log("Combined gallery paths:", galleryImagePaths);
        } catch (error) {
          console.error('Error uploading gallery images:', error);
          toast.showWarning('Partial Upload', 'Some gallery images failed to upload');
        }
      }
      
      // Format the data for draft storage (all fields, even incomplete)
      const eventData = {
        title: currentData.title,
        description: currentData.description || "",
        category: currentData.category || "",
        startDate: currentData.startDate || "",
        endDate: currentData.endDate || "",
        startTime: currentData.startTime || "",
        endTime: currentData.endTime || "",
        timeZone: currentData.timeZone || "GMT",
        registrationDeadline: currentData.registrationDeadline,
        locationType: currentData.locationType || "physical",
        venue: currentData.venue || "",
        venueId: currentData.venueId || "",
        address: currentData.address || "",
        city: currentData.city || "",
        country: currentData.country || "Ghana",
        latitude: currentData.latitude || 5.6037,
        longitude: currentData.longitude || -0.1870,
        onlineUrl: currentData.onlineUrl || "",
        onlinePlatform: currentData.onlinePlatform || "",
        meetingCode: currentData.meetingCode || "",
        meetingPassword: currentData.meetingPassword || "",
        tickets: currentData.tickets || [],
        imageUrl: imageUrl || "",
        galleryImages: galleryImagePaths,
        isPrivate: currentData.isPrivate || false,
        eventTags: currentData.eventTags || [],
        organizerNotes: currentData.organizerNotes || "",
        status: "draft" as const,
        hasVoting: currentData.hasVoting || false,
        votingInfo: currentData.votingInfo || {
          voteCost: (currentData as any).vote_cost ?? 1,
          currentPhase: "Registration"
        },
        contestants: currentData.contestants || [],
        features: currentData.features || [],
        schedule: currentData.schedule || [],
        duration: currentData.duration || "",
      };
      
      // Check if this is a draft event
      const { data: existingDraft } = await supabase
        .from('event_drafts')
        .select('id')
        .eq('id', eventId)
        .single();
      
      if (existingDraft) {
        // Update existing draft
        const { error: updateError } = await supabase
          .from('event_drafts')
          .update({
            draft_data: eventData,
            updated_at: new Date().toISOString()
          })
          .eq('id', eventId)
          .eq('user_id', user.id);
        
        if (updateError) {
          console.error('Error updating draft:', updateError);
          throw updateError;
        }
        
        toast.showSuccess('Draft Updated', 'Event draft updated successfully');
      } else {
        // This shouldn't happen in edit mode, but handle it
        toast.showError('Error', 'Cannot find draft to update');
        return;
      }
      
      setTimeout(() => {
        router.push('/dashboards/organizer/draft-events');
      }, 500);
      
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.showError('Save Failed', 'Failed to save draft. Please try again.');
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
      // ✅ CRITICAL FIX: Store the actual File object so it can be uploaded to storage
      setSelectedImageFile(file);
      
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
      objectUrlsRef.current.push(objectUrl);
    }
  };

  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Get current gallery images and limit to max 10 total
      const currentImages = watch("galleryImages") || [];
      const currentPreviews = [...galleryPreviews];
      const currentFiles = [...selectedGalleryFiles];
      
      // Calculate how many more images we can add
      const maxNewImages = 10 - currentPreviews.length;
      
      if (maxNewImages <= 0) {
        toast.showWarning('Maximum Reached', 'Maximum of 10 gallery images allowed');
        return;
      }
      
      // Take only as many new files as we have space for
      const filesToAdd = Array.from(files).slice(0, maxNewImages);
      
      // Store the actual File objects for later upload
      setSelectedGalleryFiles([...currentFiles, ...filesToAdd]);
      
      // Update form state with filenames and metadata - append to existing
      const newFilesMetadata = filesToAdd.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type
      }));
      
      // Temporarily store filenames (will be replaced with storage paths after upload)
      setValue("galleryImages", [...currentImages, ...filesToAdd.map(file => file.name)]);
      setValue("galleryMetadata", [...(watch("galleryMetadata") || []), ...newFilesMetadata]);
      
      // Create temporary object URLs for preview
      const newObjectUrls = filesToAdd.map(file => URL.createObjectURL(file));
      setGalleryPreviews(prev => [...prev, ...newObjectUrls]);
      
      // Store URLs for cleanup
      objectUrlsRef.current.push(...newObjectUrls);
      
      if (files.length > maxNewImages) {
        toast.showInfo(
          'Maximum Reached',
          `Added ${maxNewImages} images. Maximum limit of 10 gallery images reached.`
        );
      }
    }
  };

  const removeGalleryImageAt = (index: number) => {
    setGalleryPreviews(prev => {
      const removedUrl = prev[index];
      if (removedUrl && removedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(removedUrl);
      }
      return prev.filter((_, i) => i !== index);
    });

    setSelectedGalleryFiles(prev => prev.filter((_, i) => i !== index));

    const currentImages = watch("galleryImages") || [];
    setValue("galleryImages", currentImages.filter((_, i) => i !== index));

    const currentMetadata = watch("galleryMetadata") || [];
    setValue("galleryMetadata", currentMetadata.filter((_, i) => i !== index));
  };

  const handleRequestGalleryDelete = (index: number) => {
    const now = Date.now();

    if (galleryAutoConfirmUntil && now >= galleryAutoConfirmUntil) {
      setGalleryAutoConfirmUntil(null);
    }

    if (galleryAutoConfirmUntil && now < galleryAutoConfirmUntil) {
      removeGalleryImageAt(index);
      return;
    }

    setPendingGalleryDeleteIndex(index);
    setShowGalleryDeleteModal(true);
  };

  const confirmGalleryDelete = (rememberForFiveMinutes?: boolean) => {
    if (pendingGalleryDeleteIndex === null) return;

    removeGalleryImageAt(pendingGalleryDeleteIndex);

    if (rememberForFiveMinutes) {
      setGalleryAutoConfirmUntil(Date.now() + 5 * 60 * 1000);
    }

    setPendingGalleryDeleteIndex(null);
    setShowGalleryDeleteModal(false);
  };

  const cancelGalleryDelete = () => {
    setPendingGalleryDeleteIndex(null);
    setShowGalleryDeleteModal(false);
  };

  // Add a state to track all created object URLs
  // Add cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Revoke all object URLs when component unmounts
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Merchandise Helpers
  const handleAddMerchProduct = () => {
    const currentProducts = watch("merchProducts") || [];
    setValue("merchProducts", [
      ...currentProducts,
      {
        id: `product-${Date.now()}`,
        name: "",
        price: 0,
        description: "",
        image: "",
        deliveryOption: ["pickup"]
      }
    ]);
  };

  const handleRemoveMerchProduct = (index: number) => {
    const currentProducts = [...(watch("merchProducts") || [])];
    currentProducts.splice(index, 1);
    setValue("merchProducts", currentProducts);
  };

  const handleMerchImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number, productId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size
    if (file.size > MAX_IMAGE_SIZE) {
      toast.showError("Image too large", "Please select an image under 5MB");
      return;
    }

    // Store file for upload on submit
    if (productFilesRef.current) {
      productFilesRef.current[productId] = file;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    
    // Update form data
    const currentProducts = [...(watch("merchProducts") || [])];
    if (currentProducts[index]) {
      currentProducts[index].image = previewUrl;
    }
    setValue("merchProducts", currentProducts);
  };

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storageKey = buildEventEditorDraftKey(params.id);
    if (!storageKey || restoredFromLocalRef.current) return;

    try {
      const serialized = localStorage.getItem(storageKey);
      if (!serialized) return;

      const payload: EventEditorDraftPayload = JSON.parse(serialized);
      if (!payload?.data || !hasMeaningfulEditorDraftData(payload.data)) {
        localStorage.removeItem(storageKey);
        return;
      }

      isRestoringDraftRef.current = true;
      restoredFromLocalRef.current = true;

      reset({
        ...DEFAULT_VALUES,
        ...payload.data,
      } as EventFormValues);
      latestFormValuesRef.current = payload.data as EventFormValues;

      const candidateImage = payload.data.imageUrl;
      if (typeof candidateImage === 'string' && candidateImage.length > 0) {
        if (candidateImage.startsWith('http') || candidateImage.startsWith('data:')) {
          setImagePreview(candidateImage);
        } else {
          setImagePreview(getFormattedImagePath(candidateImage));
        }
      }

      const galleryUrls = (payload.data.galleryImages || [])
        .map((entry) => {
          if (!entry || typeof entry !== 'string') return null;
          if (entry.startsWith('http') || entry.startsWith('data:')) return entry;
          return getFormattedImagePath(entry);
        })
        .filter((url): url is string => Boolean(url));
      if (galleryUrls.length > 0) {
        setGalleryPreviews(galleryUrls);
      }

      setHasUnsavedChanges(true);
      setTimeout(() => trigger(), 0);

      let refreshNotice = false;
      try {
        refreshNotice = sessionStorage.getItem(EVENT_EDIT_REFRESH_FLAG_KEY) === 'true';
        if (refreshNotice) {
          sessionStorage.removeItem(EVENT_EDIT_REFRESH_FLAG_KEY);
        }
      } catch (error) {
        console.warn('[EventEditor] Failed to read refresh flag', error);
      }

      const reminder = candidateImage && !(candidateImage.startsWith('http') || candidateImage.startsWith('data:'))
        ? ' Local images will need to be reselected before publishing.'
        : '';
      const message = refreshNotice
        ? 'We restored your last edits after a refresh.'
        : 'We auto-filled your last in-progress edits.';
      toast.showInfo('Draft Restored', message + reminder);

      setTimeout(() => {
        isRestoringDraftRef.current = false;
      }, 0);
    } catch (error) {
      console.error('[EventEditor] Failed to restore cached draft', error);
      const storageKey = buildEventEditorDraftKey(params.id);
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
      isRestoringDraftRef.current = false;
    }
  }, [params.id, reset, toast, trigger]);

  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // ✅ IMPORTANT: Reset the ref when the event ID changes
    // This ensures we always reload data when navigating to a different event
    hasLoadedRef.current = false;
    
    // Load existing event data from database
    const loadEventData = async () => {
      // Skip if already loaded FOR THIS SPECIFIC EVENT
      if (hasLoadedRef.current) return;
      
      try {
        const eventId = params.id as string;
        
        // Import the database service and supabase
        const { eventDatabaseService } = await import('@/services/eventDatabaseService');
        const { createClient } = await import('@/lib/supabase/client/client');
        const supabase = createClient();
        
        let eventToEdit = null;
        let isDraft = false;
        
        // ✅ NEW: Check drafts table FIRST (silent check - no error logging)
        const { data: draftData, error: draftError } = await supabase
          .from('event_drafts')
          .select('*')
          .eq('id', eventId)
          .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when not found
        
        // If found in drafts, use draft data
        if (draftData && !draftError) {
          isDraft = true;
          setIsEditingDraft(true); // ✅ Set state to use draft schema
          // Parse draft_data if it's a string
          let parsedDraftData = draftData.draft_data;
          if (typeof parsedDraftData === 'string') {
            try {
              parsedDraftData = JSON.parse(parsedDraftData);
            } catch (e) {
              console.error('Failed to parse draft_data:', e);
              parsedDraftData = {};
            }
          }
          
          // Transform draft data to match event structure
          eventToEdit = {
            id: draftData.id,
            organizer_id: draftData.user_id || "",
            title: parsedDraftData.title || draftData.draft_name || "",
            description: parsedDraftData.description || "",
            category: parsedDraftData.category || "",
            start_date: parsedDraftData.startDate || parsedDraftData.start_date || "",
            start_time: parsedDraftData.startTime || parsedDraftData.start_time || "",
            end_date: parsedDraftData.endDate || parsedDraftData.end_date || "",
            end_time: parsedDraftData.endTime || parsedDraftData.end_time || "",
            time_zone: parsedDraftData.timeZone || parsedDraftData.time_zone || "GMT",
            location_type: parsedDraftData.locationType || parsedDraftData.location_type || "physical",
            address: parsedDraftData.address || parsedDraftData.venue || "",
            venue_id: parsedDraftData.venueId || parsedDraftData.venue_id || "",
            city: parsedDraftData.city || "",
            country: parsedDraftData.country || "Ghana",
            online_url: parsedDraftData.onlineUrl || parsedDraftData.online_url || "",
            online_platform: parsedDraftData.onlinePlatform || parsedDraftData.online_platform || "",
            meeting_code: parsedDraftData.meetingCode || parsedDraftData.meeting_code || "",
            meeting_password: parsedDraftData.meetingPassword || parsedDraftData.meeting_password || "",
            tickets: parsedDraftData.tickets || [],
            image_url: parsedDraftData.imageUrl || parsedDraftData.image_url || "",
            gallery_images: parsedDraftData.galleryImages || parsedDraftData.gallery_images || [],
            is_private: parsedDraftData.isPrivate || false,
            is_featured: false,
            require_approval: false,
            event_tags: parsedDraftData.eventTags || parsedDraftData.event_tags || [],
            organizer_notes: parsedDraftData.organizerNotes || parsedDraftData.organizer_notes || "",
            status: "draft",
            has_voting: parsedDraftData.hasVoting || parsedDraftData.has_voting || false,
            vote_cost: parsedDraftData.vote_cost || parsedDraftData.votingInfo?.voteCost || 1,
            voting_info: parsedDraftData.votingInfo || parsedDraftData.voting_info || { voteCost: 1, currentPhase: "Registration" },
            contestants: parsedDraftData.contestants || [],
            duration: parsedDraftData.duration || "",
            features: parsedDraftData.features || [],
            schedule: parsedDraftData.schedule || [],
            attendee_count: 0,
            tickets_sold: 0,
            created_at: draftData.created_at || new Date().toISOString(),
            updated_at: draftData.updated_at || new Date().toISOString()
          };
        } else {
          // Not a draft, try to get from events table (published events)
          eventToEdit = await eventDatabaseService.getEvent(eventId);
          isDraft = false;
          setIsEditingDraft(false); // ✅ Set state to use full schema
        }
        
        if (eventToEdit) {
          if (!restoredFromLocalRef.current) {
            // Helper function to convert timestamps ("2025-12-11T00:00:00+00") to HTML-date friendly values
            const extractDate = (dateString: string | null | undefined): string => {
              if (!dateString) return "";
              const parsed = new Date(dateString);
              if (!Number.isNaN(parsed.getTime())) {
                return parsed.toISOString().split('T')[0];
              }
              const datePart = dateString.split(/[T\s]/)[0];
              return datePart || "";
            };

            // Format the database data to match form structure
            const formData = {
              title: eventToEdit.title || "",
              description: eventToEdit.description || "",
              category: eventToEdit.category || "",
              startDate: extractDate(eventToEdit.start_date),
              startTime: eventToEdit.start_time || "",
              endDate: extractDate(eventToEdit.end_date),
              endTime: eventToEdit.end_time || "",
              timeZone: eventToEdit.time_zone || "GMT",
              locationType: eventToEdit.location_type || "physical",
              venue: eventToEdit.venue || (eventToEdit as any).location_address || "", // Use venue or location_address from database
              venueId: eventToEdit.venue_id || "",
              city: (eventToEdit as any).location_city || (eventToEdit as any).city || "", // Fix: use location_city
              region: (eventToEdit as any).location_region || (eventToEdit as any).region || "", // Fix: use location_region
              country: (eventToEdit as any).location_country || (eventToEdit as any).country || "Ghana", // Fix: use location_country
              latitude: parseFloat((eventToEdit as any).location_latitude) || parseFloat((eventToEdit as any).latitude) || undefined, // Fix: parse to number
              longitude: parseFloat((eventToEdit as any).location_longitude) || parseFloat((eventToEdit as any).longitude) || undefined, // Fix: parse to number
              onlineUrl: eventToEdit.online_url || "",
              onlinePlatform: eventToEdit.online_platform || "",
              tickets: Array.isArray(eventToEdit.tickets) ? eventToEdit.tickets : [{ 
                id: Date.now(), 
                name: "General Admission",
                price: 0, 
                quantity: 100,
                description: "",
                startDate: "",
                endDate: ""
              }],
              imageUrl: eventToEdit.image_url || "",
              imageMetadata: {}, // Will be set from image preview
              galleryImages: Array.isArray(eventToEdit.gallery_images) ? eventToEdit.gallery_images : [],
              galleryMetadata: [],
              isPrivate: eventToEdit.is_private || false,
              eventTags: Array.isArray(eventToEdit.event_tags) ? eventToEdit.event_tags : [],
              organizerNotes: eventToEdit.organizer_notes || "",
              status: (eventToEdit.status === "published" || eventToEdit.status === "draft") ? eventToEdit.status as "published" | "draft" : "published" as "published" | "draft",
              hasVoting: eventToEdit.has_voting || false,
              votingInfo: eventToEdit.voting_info || {
                voteCost: (eventToEdit as any).vote_cost ?? 1,
                currentPhase: "Registration"
              },
              contestants: eventToEdit.contestants || [],
              duration: eventToEdit.duration || "",
              features: Array.isArray(eventToEdit.features) ? eventToEdit.features : [],

              schedule: eventToEdit.schedule || [],
              
              // Merchandise
              hasMerch: eventToEdit.has_merch || false,
              merchProducts: Array.isArray(eventToEdit.merch_products) ? eventToEdit.merch_products : [],
              
              // Age Restriction
              isAdult: eventToEdit.age_restriction === 18,
            };

            // Reset the form with the loaded data
            reset({
              ...formData,
              schedule: Array.isArray(formData.schedule) ? formData.schedule : [],
            });

            // Trigger validation after resetting to ensure form is recognized as valid
            setTimeout(() => {
              trigger();
            }, 100);

            // Set image preview if available
            if (eventToEdit.image_url) {
              setImagePreview(eventToEdit.image_url);
            }

            // Load gallery previews if available - convert storage paths to full URLs
            if (eventToEdit.gallery_images && eventToEdit.gallery_images.length > 0) {
              const galleryUrls = eventToEdit.gallery_images.map((path: string) => getFormattedImagePath(path));
              setGalleryPreviews(galleryUrls);
            }
          }

          // Only show toast once
          if (!hasLoadedRef.current) {
            const loadMessage = isDraft ? 'Draft loaded successfully' : 'Event loaded successfully';
            toast.showSuccess(isDraft ? 'Draft Loaded' : 'Event Loaded', loadMessage);
            hasLoadedRef.current = true;
          }
        } else {
          toast.showError('Not Found', 'Event or draft not found');
          router.push('/dashboards/organizer/events');
        }
      } catch (error) {
        console.error("Error loading event data:", error);
        toast.showError('Loading Error', 'Failed to load event data');
        router.push('/dashboards/organizer/events');
      }
    };
    
    loadEventData();
  }, [params.id, reset, router]);

  // Track form changes to detect unsaved changes + cache
  useEffect(() => {
    const subscription = watch((value, { type }) => {
      const typedValue = (value || {}) as EventFormValues;
      latestFormValuesRef.current = typedValue;

      if (type === 'change' && !isRestoringDraftRef.current) {
        setHasUnsavedChanges(true);
        scheduleDraftSave(typedValue);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, scheduleDraftSave]);

  // Browser navigation guard (close/refresh) -> silent autosave + toast
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!hasUnsavedChanges || isSubmitting) {
        return;
      }

      persistDraftToStorage(latestFormValuesRef.current);
      try {
        sessionStorage.setItem(EVENT_EDIT_REFRESH_FLAG_KEY, 'true');
      } catch (error) {
        console.warn('[EventEditor] Failed to flag refresh intent', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, isSubmitting, persistDraftToStorage]);

  // Intercept browser back/forward buttons
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges && !isSubmitting) {
        e.preventDefault();
        // Push the current state back to keep user on page
        window.history.pushState(null, '', window.location.href);
        setShowExitConfirmModal(true);
      }
    };

    // Push initial state to enable back button interception
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges, isSubmitting]);

  // Intercept all Link clicks in the document
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]');
      
      if (link && link instanceof HTMLAnchorElement) {
        const href = link.getAttribute('href');
        // Only intercept internal links (not external or hash links)
        if (href && href.startsWith('/') && !href.startsWith('#')) {
          e.preventDefault();
          e.stopPropagation();
          setPendingNavigation(href);
          setShowExitConfirmModal(true);
        }
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [hasUnsavedChanges]);

  // Handle navigation with confirmation
  const handleNavigate = (path: string) => {
    if (hasUnsavedChanges && !isSubmitting) {
      setPendingNavigation(path);
      setShowExitConfirmModal(true);
    } else {
      router.push(path);
    }
  };

  // Handle save and exit
  const handleSaveAndExit = async () => {
    await saveAsDraft();
    setHasUnsavedChanges(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
    }
  };

  // Handle exit without saving
  const handleExitWithoutSaving = () => {
    setHasUnsavedChanges(false);
    setShowExitConfirmModal(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
    }
  };

  // Handle cancel exit
  const handleCancelExit = () => {
    setShowExitConfirmModal(false);
    setPendingNavigation(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
            <button
            onClick={() => handleNavigate('/dashboards/organizer/events')}
            className="text-neutral-500 hover:text-neutral-700 inline-flex items-center text-sm w-fit mb-2 cursor-pointer"
            >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Events
            </button>
          <h1 className="text-2xl font-bold">Edit Event</h1>
          <p className="text-neutral-500">Update your event details</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {isEditingDraft ? (
            <button
              type="button"
              onClick={handleSubmit((data: EventFormValues) => onSubmit(data, true))}
              disabled={isSubmitting}
              className={`w-full sm:w-auto px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2 ${
                isSubmitting
                  ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                  : "border border-neutral-300 text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              }`}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSubmitting ? "Saving..." : "Save as Draft"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit((data: EventFormValues) => onSubmit(data, false))}
              disabled={!isValid || isSubmitting}
              className={`w-full sm:w-auto px-4 py-2 rounded-md transition-colors flex items-center justify-center gap-2 font-medium ${
                !isValid || isSubmitting
                  ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary-dark cursor-pointer"
              }`}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSubmitting ? "Updating..." : "Update Event"}
            </button>
          )}
          <button 
            type="button"
            onClick={() => setPreviewMode(!previewMode)}
            className="w-full sm:w-auto px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary/5 transition-colors cursor-pointer"
          >
            {previewMode ? "Edit Details" : "Preview"}
          </button>
        </div>
      </div>

      {/* Progress Indicators */}
      <div className="bg-white rounded-lg border border-neutral-200 p-3 sm:p-4">
        <div className="flex overflow-x-auto gap-2 pb-2 sm:pb-0">
          {formSteps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm whitespace-nowrap cursor-pointer flex-shrink-0 
                ${currentStep === index ? "bg-primary text-white" : "bg-neutral-100 text-neutral-600"}`}
              onClick={() => setCurrentStep(index)}
            >
              {step.icon}
              <span className="hidden sm:inline">{step.title}</span>
              <span className="sm:hidden">{index + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {!previewMode ? (
        <FormProvider {...methods}>
          <form className="bg-white rounded-lg border border-neutral-200 p-4 sm:p-6">
            {/* Basic Details Step */}
            {currentStep === 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold">Event Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      {...register("title")}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                      placeholder="e.g., Annual Tech Conference 2025"
                    />
                    {errors.title && (
                      <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Event Description *
                    </label>
                    <textarea
                      {...register("description")}
                      rows={4}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary sm:rows-6"
                      placeholder="Provide a detailed description of your event..."
                    ></textarea>
                    {errors.description && (
                      <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                    )}
                  </div>

                  {/* Category dropdown with optgroups */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Category *
                    </label>
                    <select
                      {...register("category")}
                      className="select-styled w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary appearance-none bg-white cursor-pointer"
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
                      />
                      {errors.startDate && (
                        <p className="text-red-500 text-sm mt-1">{errors.startDate.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        {...register("endDate")}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                        min={watch("startDate")}
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
                        End Time
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
                  
                  {/* Event Duration - Auto-calculated and read-only */}
                  <div>
                    <DurationDisplayField watch={watch} />
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
                              className="p-2 text-neutral-500 hover:text-red-500"
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
                          className="inline-flex items-center gap-1 text-primary hover:text-primary-dark"
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
                              className="text-neutral-400 hover:text-red-500"
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
                            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-2 px-4 rounded-md transition-colors"
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
                            className="inline-flex items-center gap-1 text-primary hover:text-primary-dark text-sm bg-white border border-primary/20 rounded-md px-3 py-2 hover:bg-primary/5 transition-colors"
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
                              Venue Name *
                            </label>
                            <input
                              type="text"
                              {...register("venue")}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                              placeholder="e.g., Kempinski Hotel"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                City *
                              </label>
                              <input
                                type="text"
                                {...register("city")}
                                className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                                placeholder="e.g., Accra"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Country *
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

                          {/* Location Picker with Map */}
                          <div>
                            <LocationPicker
                              onLocationSelect={(lat, lng) => {
                                setValue("latitude", lat);
                                setValue("longitude", lng);
                              }}
                              onCityUpdate={(city) => {
                                setValue("city", city);
                              }}
                              initialLatitude={watch("latitude") || 5.6037}
                              initialLongitude={watch("longitude") || -0.1870}
                              address={watch("address")}
                              city={watch("city")}
                              country={watch("country")}
                            />
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Platform
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
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Meeting Code / ID
                              </label>
                              <input
                                type="text"
                                {...register("meetingCode")}
                                className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                                placeholder="e.g., 123 456 7890"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Online URL
                              </label>
                              <input
                                type="text"
                                {...register("onlineUrl")}
                                className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                                placeholder="e.g., https://zoom.us/j/123456789"
                              />
                              <p className="text-neutral-500 text-sm mt-1">
                                This will be shared with attendees before the event
                              </p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Meeting Password
                              </label>
                              <input
                                type="text"
                                {...register("meetingPassword")}
                                className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                                placeholder="e.g., 123456"
                              />
                            </div>
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
                            className="text-red-500 hover:text-red-700"
                            disabled={(watch("tickets") || []).length <= 1}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Ticket Name *
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
                              Price (₵) *
                            </label>
                            <input
                              type="number"
                              value={ticket.price}
                              onChange={(e) => {
                                const updatedTickets = [...(watch("tickets") || [])];
                                updatedTickets[index].price = Number(e.target.value);
                                setValue("tickets", updatedTickets);
                              }}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                              placeholder="0 for free events"
                              min="0"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            {ticket.price === 0 ? "Available Spots" : "Available Quantity"} *
                          </label>
                          <input
                            type="number"
                            value={ticket.quantity === 0 ? "" : ticket.quantity}
                            onFocus={(e) => {
                              if (e.target.value === "0") e.target.value = "";
                            }}
                            onChange={(e) => {
                              const updatedTickets = [...(watch("tickets") || [])];
                              updatedTickets[index].quantity = Number(e.target.value);
                              setValue("tickets", updatedTickets);
                            }}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                            placeholder={ticket.price === 0 ? "Enter number of spots" : "Enter quantity"}
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
                              min={ticket.startDate}
                              max={watch("startDate")}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={handleAddTicket}
                      className="w-full py-3 border-2 border-dashed border-neutral-300 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2"
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
                            className="mt-2 text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove image
                          </button>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="h-12 w-12 text-neutral-400 mb-2" />
                          <p className="text-neutral-600">Click to upload featured image</p>
                          <p className="text-sm text-neutral-500 mt-1">JPG, PNG, or GIF up to 10MB</p>
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
                                    handleRequestGalleryDelete(index);
                                  }}
                                  className="absolute top-1 right-1 bg-white/90 backdrop-blur-sm p-1 rounded-full shadow-sm hover:bg-red-50 text-red-500 transition-colors"
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
                          <p className="text-sm text-neutral-500 mt-1">Show your event from multiple angles</p>
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
                  
                  <div className="flex items-center p-4 border border-neutral-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="hasVoting"
                      {...register("hasVoting")}
                      className="h-5 w-5 text-primary border-neutral-300 rounded"
                    />
                    <label htmlFor="hasVoting" className="ml-3 font-medium">
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
                              Voting Start Date
                            </label>
                            <input
                              type="date"
                              {...register("votingInfo.startDate")}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-md"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">
                              Voting End Date
                            </label>
                            <input
                              type="date"
                              {...register("votingInfo.endDate")}
                              className="w-full px-4 py-2 border border-neutral-300 rounded-md"
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
                              Cost per Vote (₵)
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
                          <h3 className="font-medium">Contestants</h3>
                          <button
                            type="button"
                            onClick={handleAddContestant}
                            className="text-primary flex items-center gap-1 hover:underline"
                          >
                            <PlusCircle className="w-4 h-4" /> Add Contestant
                          </button>
                        </div>
                        
                        {/* Show validation error if voting is enabled but no contestants */}
                        {watch("hasVoting") && (!watch("contestants") || (watch("contestants")?.length || 0) === 0) && (
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
                                  className="text-neutral-400 hover:text-red-500"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                                    Name *
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
                                  <div className="w-16 h-16 bg-neutral-100 rounded-full overflow-hidden relative">
                                    {contestant.image ? (
                                      // Show the uploaded image when available
                                      <div 
                                        className="absolute inset-0 bg-cover bg-center" 
                                        style={{ backgroundImage: `url(${contestant.image})` }}
                                      />
                                    ) : (
                                      // Show default icon when no image
                                      <div className="absolute inset-0 flex items-center justify-center text-neutral-400">
                                        <Users className="w-8 h-8" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <input
                                      type="file"
                                      onChange={(e) => handleContestantImageUpload(e, index)}
                                      className="w-full text-sm"
                                    />
                                    <p className="text-xs text-neutral-500 mt-1">Recommended: Square image, at least 300x300px</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
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
                              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-2 px-4 rounded-md transition-colors"
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

            {/* Merchandise Step */}
            {currentStep === 7 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold">Merchandise</h2>
                
                <div className="space-y-6">
                  <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                    <h3 className="font-medium mb-2">Offer Event Merchandise</h3>
                    <p className="text-sm text-neutral-600">
                      Sell t-shirts, caps, or other products directly on your event page
                    </p>
                  </div>
                  
                  <div className="flex items-center p-4 border border-neutral-200 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      id="hasMerch"
                      {...register("hasMerch")}
                      className="h-5 w-5 text-primary border-neutral-300 rounded cursor-pointer"
                    />
                    <label htmlFor="hasMerch" className="ml-3 font-medium cursor-pointer">
                      Enable merchandise for this event
                    </label>
                  </div>
                  
                  {watch("hasMerch") && (
                    <div className="border border-neutral-200 rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">Products</h3>
                      </div>
                      
                      {/* Products list */}
                      <div className="space-y-4">
                        {(watch("merchProducts") || []).map((product, index) => (
                          <div key={index} className="border border-neutral-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-medium">Product #{index + 1}</h4>
                              <button
                                type="button"
                                onClick={() => handleRemoveMerchProduct(index)}
                                className="text-neutral-400 hover:text-red-500 cursor-pointer"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                  Product Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  {...register(`merchProducts.${index}.name`)}
                                  className="w-full px-4 py-2 border border-neutral-300 rounded-md"
                                  placeholder="e.g., Event T-Shirt"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-neutral-700 mb-1">
                                  Price (₵) <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  {...register(`merchProducts.${index}.price`, { valueAsNumber: true })}
                                  className="w-full px-4 py-2 border border-neutral-300 rounded-md"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                            
                            <div className="mt-3">
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Description
                              </label>
                              <textarea
                                {...register(`merchProducts.${index}.description`)}
                                rows={2}
                                className="w-full px-4 py-2 border border-neutral-300 rounded-md"
                                placeholder="Size, materials, etc."
                              />
                            </div>

                            <div className="mt-3">
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Delivery Options <span className="text-red-500">*</span>
                              </label>
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    value="pickup"
                                    {...register(`merchProducts.${index}.deliveryOption`)}
                                    className="w-4 h-4 text-primary border-neutral-300 focus:ring-primary rounded"
                                  />
                                  <span className="text-sm text-neutral-700">On-site Pickup</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-not-allowed opacity-50" title="Coming soon">
                                  <input
                                    type="checkbox"
                                    value="nationwide"
                                    disabled
                                    {...register(`merchProducts.${index}.deliveryOption`)}
                                    className="w-4 h-4 text-neutral-400 border-neutral-300 rounded cursor-not-allowed bg-neutral-100"
                                  />
                                  <span className="text-sm text-neutral-500">Nationwide Delivery</span>
                                </label>
                              </div>
                              <p className="text-xs text-neutral-500 mt-1">
                                * Currently only on-site pickup is supported. Nationwide delivery coming soon.
                              </p>
                            </div>
                            
                            <div className="mt-3">
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Product Image
                              </label>
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-16 h-16 bg-neutral-100 rounded-lg overflow-hidden relative cursor-pointer group"
                                  onClick={() => {
                                    const fileInputs = document.querySelectorAll<HTMLInputElement>(
                                      `input[type="file"][data-merch-index]`
                                    );
                                    fileInputs[index]?.click();
                                  }}
                                  tabIndex={0}
                                  role="button"
                                  aria-label="Upload product image"
                                >
                                  {product.image ? (
                                    <div
                                      className="absolute inset-0 bg-cover bg-center"
                                      style={{ backgroundImage: `url(${product.image})` }}
                                    />
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-neutral-400">
                                      <CheckSquare className="w-8 h-8" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Upload className="w-6 h-6 text-white" />
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <input
                                    type="file"
                                    data-merch-index={index}
                                    onChange={(e) => handleMerchImageUpload(e, index, product.id)}
                                    className="w-full text-sm hidden"
                                  />
                                  <p className="text-xs text-neutral-500 mt-1">
                                    Square image recommended
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={handleAddMerchProduct}
                            className="text-primary flex items-center gap-1 cursor-pointer"
                          >
                            <PlusCircle className="w-4 h-4" /> Add Product
                          </button>
                        </div>
                      </div>
                      
                      {(watch("merchProducts") || []).length === 0 && (
                        <div className="border border-neutral-200 border-dashed rounded-lg p-8 text-center">
                          <CheckSquare className="w-12 h-12 mx-auto text-neutral-300 mb-3" />
                          <h4 className="font-medium mb-1">No Products Added</h4>
                          <p className="text-neutral-500 text-sm mb-3">
                            Add products to your event store
                          </p>
                          <button
                            type="button"
                            onClick={handleAddMerchProduct}
                            className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-2 px-4 rounded-md transition-colors cursor-pointer"
                          >
                            <PlusCircle className="w-4 h-4 inline mr-1" /> Add First Product
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Settings Step */}
            {currentStep === 8 && (
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
                          className="h-4 w-4 text-primary border-neutral-300 rounded"
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
                        className="h-4 w-4 text-primary border-neutral-300 rounded"
                      />
                      <div className="ml-3">
                        <label htmlFor="isPrivate" className="font-medium text-neutral-700 cursor-pointer">
                          Private event
                        </label>
                        <p className="text-sm text-neutral-500">Only accessible via direct link</p>
                      </div>
                    </div>
                  
                    <div className="flex items-center p-3 border border-neutral-200 rounded-lg mt-3">
                      <input
                        type="checkbox"
                        id="isAdult"
                        {...register("isAdult")}
                        className="h-4 w-4 text-primary border-neutral-300 rounded cursor-pointer"
                      />
                      <div className="ml-3">
                        <label htmlFor="isAdult" className="font-medium text-neutral-700 cursor-pointer flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          18+ Event
                        </label>
                        <p className="text-sm text-neutral-500">Contains content suitable only for adults</p>
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
                          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors flex items-center gap-2"
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
                className={`w-full sm:w-auto px-4 py-2 flex items-center justify-center gap-2 transition-all duration-200 ${
                  currentStep === 0
                    ? "text-neutral-300 cursor-not-allowed"
                    : "text-neutral-700 hover:text-neutral-900 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>
              
              {currentStep < formSteps.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full sm:w-auto px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit((data: EventFormValues) => onSubmit(data, false))}
                  disabled={!isValid || isSubmitting}
                  className={`px-6 py-2 rounded-md font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
                    !isValid || isSubmitting
                      ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                      : "bg-primary text-white hover:bg-primary-dark hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  }`}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting 
                    ? "Updating..." 
                    : !isValid 
                      ? "Please fill all required fields" 
                      : (isEditingDraft ? "Save Draft" : "Update Event")}
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
                className="px-6 py-2 bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Edit
              </button>
              
              {isEditingDraft && (
                <button
                  type="button"
                  onClick={saveAsDraft}
                  disabled={isSubmitting}
                  className={`px-6 py-2 rounded-md font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
                    isSubmitting
                      ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                      : "bg-primary text-white hover:bg-primary-dark hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  }`}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? "Saving..." : "Save as Draft"}
                </button>
              )}
              
              <button
                type="button"
                onClick={handleSubmit((data: EventFormValues) => onSubmit(data, false))}
                disabled={!isValid || isSubmitting}
                className={`px-6 py-2 rounded-md font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
                  !isValid || isSubmitting
                    ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                    : "bg-primary text-white hover:bg-primary-dark hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                }`}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting 
                  ? "Updating..." 
                  : !isValid 
                    ? "Please fill all required fields" 
                    : (isEditingDraft ? "Publish Event" : "Update Event")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGalleryDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                  Remove gallery image?
                </h3>
                <p className="text-sm text-neutral-600">
                  This will remove the image from your event. Choose "Yes for 5 minutes" to skip this confirmation for the next few removals.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => confirmGalleryDelete(true)}
                className="w-full px-4 py-2.5 bg-primary text-white rounded-md font-medium hover:bg-primary-dark transition-colors cursor-pointer"
              >
                Yes for 5 minutes
              </button>

              <button
                onClick={() => confirmGalleryDelete(false)}
                className="w-full px-4 py-2.5 bg-red-50 text-red-700 rounded-md font-medium hover:bg-red-100 transition-colors cursor-pointer"
              >
                Yes, remove
              </button>

              <button
                onClick={cancelGalleryDelete}
                className="w-full px-4 py-2.5 border border-neutral-300 text-neutral-700 rounded-md font-medium hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Modal */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                  Unsaved Changes
                </h3>
                <p className="text-sm text-neutral-600">
                  You have unsaved changes. What would you like to do?
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSaveAndExit}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 bg-primary text-white rounded-md font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSubmitting ? "Saving..." : "Save as Draft"}
              </button>
              
              <button
                onClick={handleExitWithoutSaving}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 bg-neutral-100 text-neutral-700 rounded-md font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Leave Without Saving
              </button>
              
              <button
                onClick={handleCancelExit}
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 border border-neutral-300 text-neutral-700 rounded-md font-medium hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
