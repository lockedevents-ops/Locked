"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, 
  ArrowRight, 
  Image as ImageIcon, 
  Save, 
  MapPin, 
  Building2, 
  Users, 
  Clock,
  Info,
  Star,
  Calendar,
  Pencil,
  DollarSign,
  CheckSquare,
  Trash2
} from 'lucide-react';
import { toastService } from '@/services/toastService';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client/client';
import { 
  checkDuplicateVenueName,
  validateCityName,
  getCityValidationError,
  validateImageSize,
  getImageSizeError,
  validateMultipleImages,
  MAX_IMAGE_SIZE
} from '@/utils/eventValidation';

// Enhanced venue form schema with comprehensive validations
const venueFormSchema = z.object({
  // Basic Details
  name: z.string().min(3, "Name must be at least 3 characters")
    .max(100, "Venue name cannot exceed 100 characters")
    .refine(async (name) => {
      const isDuplicate = await checkDuplicateVenueName(name);
      return !isDuplicate;
    }, "A venue with this name already exists. Please choose a different name."),
  description: z.string().min(20, "Description must be at least 20 characters")
    .max(1000, "Description cannot exceed 1000 characters"),
  venueType: z.string().min(1, "Please select a venue type"),
  
  // Location
  address: z.string().min(5, "Address is required")
    .max(200, "Address cannot exceed 200 characters"),
  city: z.string().min(2, "City is required")
    .max(50, "City name cannot exceed 50 characters")
    .refine(async (city) => {
      const isValid = await validateCityName(city);
      return isValid;
    }, "Please enter a valid city name."),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().optional(),
  mapCoordinates: z.object({
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).optional(),
  
  // Capacity & Features
  capacity: z.number().int().min(1, "Capacity must be at least 1")
    .max(10000, "Capacity cannot exceed 10,000 people"),
  standingCapacity: z.number().int().min(0, "Standing capacity cannot be negative")
    .max(10000, "Standing capacity cannot exceed 10,000").optional(),
  seatedCapacity: z.number().int().min(0, "Seated capacity cannot be negative")
    .max(10000, "Seated capacity cannot exceed 10,000").optional(),
  amenities: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  
  // Pricing
  pricing: z.object({
    basePrice: z.number().min(0, "Base price cannot be negative"),
    currency: z.string().min(1, "Currency is required"),
    pricingModel: z.enum(["hourly", "daily", "flat"]),
    minimumHours: z.number().int().min(1).optional(),
  }),

  // Policies
  policies: z.object({
    cancellationPolicy: z.string().min(1, "Cancellation policy is required"),
    minBookingNotice: z.number().int().min(1, "Minimum booking notice is required"),
    maxBookingInAdvance: z.number().int().min(1, "Maximum booking in advance is required"),
  }),
  
  // Media
  featuredImage: z.string().optional(),
  galleryImages: z.array(z.string()).max(10, "Maximum 10 gallery images allowed").optional(),
  
  // Additional settings
  status: z.enum(["active", "inactive", "pending"] as const),
  rules: z.array(z.string().min(1, "Rule cannot be empty"))
    .max(20, "Maximum 20 rules allowed").optional(),
  ownerNotes: z.string().max(500, "Owner notes cannot exceed 500 characters").optional(),
})
.refine((data) => {
  // Validate that seated + standing capacity doesn't exceed total capacity
  const seated = data.seatedCapacity || 0;
  const standing = data.standingCapacity || 0;
  const total = data.capacity;
  
  // Allow if no specific seated/standing numbers are provided
  if (!data.seatedCapacity && !data.standingCapacity) return true;
  
  // If only one is provided, it should not exceed total
  if (data.seatedCapacity && !data.standingCapacity) {
    return seated <= total;
  }
  if (data.standingCapacity && !data.seatedCapacity) {
    return standing <= total;
  }
  
  // If both are provided, their sum should not exceed total
  return (seated + standing) <= total;
}, {
  message: "Seated and standing capacity combined cannot exceed total capacity",
  path: ["capacity"]
});

type VenueFormValues = z.infer<typeof venueFormSchema>;

const DEFAULT_VALUES: VenueFormValues = {
  name: "",
  description: "",
  venueType: "",
  address: "",
  city: "",
  country: "Ghana",
  postalCode: "",
  capacity: 50,
  standingCapacity: 70,
  seatedCapacity: 50,
  amenities: [],
  features: [],
  pricing: {
    basePrice: 0,
    currency: "GHS",
    pricingModel: "hourly",
    minimumHours: 2,
  },
  policies: {
    cancellationPolicy: "48-hour",
    minBookingNotice: 48,
    maxBookingInAdvance: 180,
  },
  status: "active",
  rules: [],
  ownerNotes: "",
};

// Venue type options
const VENUE_TYPES = [
  "Conference Center",
  "Hotel",
  "Restaurant",
  "Outdoor Space",
  "Banquet Hall",
  "Studio",
  "Theater",
  "Rooftop",
  "Beach",
  "Gallery",
  "Coworking Space",
  "Other"
];

// Amenities list
const AMENITIES = [
  "WiFi",
  "Parking",
  "Sound System",
  "Projector",
  "Stage",
  "Kitchen",
  "Catering",
  "Restrooms",
  "Air Conditioning",
  "Security",
  "Accessibility Features",
  "Changing Rooms"
];

export default function AddVenuePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [imageFocus, setImageFocus] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  const router = useRouter();
  const { user } = useAuth();
  
  const methods = useForm<VenueFormValues>({
    resolver: zodResolver(venueFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  });
  
  const { handleSubmit, formState: { errors, isValid }, watch, setValue } = methods;
  const featuredImageRef = useRef<HTMLInputElement>(null);
  const galleryImagesRef = useRef<HTMLInputElement>(null);
  const imagePreviewRef = useRef<HTMLDivElement>(null);

  // Form steps
  const formSteps = [
    { id: "basics", title: "Basic Details", icon: <Info className="w-5 h-5" /> },
    { id: "location", title: "Location", icon: <MapPin className="w-5 h-5" /> },
    { id: "capacity", title: "Capacity & Features", icon: <Users className="w-5 h-5" /> },
    { id: "pricing", title: "Pricing & Policies", icon: <DollarSign className="w-5 h-5" /> },
    { id: "media", title: "Media", icon: <ImageIcon className="w-5 h-5" /> },
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

  // Handle form submission
  const onSubmit = async (data: VenueFormValues, isDraft = false) => {
    setIsSubmitting(true);
    
    try {
      // Format the data for API
      const venueData = {
        id: Math.floor(Math.random() * 10000), // Generate a temporary ID
        name: data.name,
        description: data.description,
        venueType: data.venueType,
        location: `${data.city}, ${data.country}`,
        address: data.address,
        capacity: data.capacity,
        seatedCapacity: data.seatedCapacity,
        standingCapacity: data.standingCapacity,
        amenities: data.amenities,
        pricing: data.pricing,
        policies: data.policies,
        featuredImage: data.featuredImage,
        galleryImages: data.galleryImages,
        rules: data.rules,
        ownerNotes: data.ownerNotes,
        status: isDraft ? "draft" : "active",
        createdAt: new Date().toISOString(),
        
        // Include image previews
        featuredImagePreview: featuredImagePreview,
        galleryPreviews: galleryPreviews,
        
        // Add image focus to the venue data
        imageFocus: imageFocus,
      };
      
      // Store in localStorage or send to API
      const existingVenues = JSON.parse(localStorage.getItem('venues') || '[]');
      localStorage.setItem('venues', JSON.stringify([...existingVenues, venueData]));
      
      // Show success message with appropriate text
      toastService.success(isDraft ? "Venue saved as draft" : "Venue published successfully");
      
      // Navigate to appropriate page based on draft status
      setTimeout(() => {
        router.push(isDraft ? '/venue-owner/draft-venues' : '/venue-owner/pages/venues');
      }, 500);
    } catch (error) {
      // Handle error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save as draft - bypass validation
  const saveAsDraft = () => {
    // Get current form values without validation
    const currentData = methods.getValues();
    
    // Ensure minimal required fields for drafts
    if (!currentData.name || !currentData.description) {
      toastService.error("Please provide at least a name and description for your venue draft");
      return;
    }
    
    // Don't use handleSubmit which enforces all validation
    try {
      // Format the data for API
      const venueData = {
        id: Math.floor(Math.random() * 10000), // Generate a temporary ID
        name: currentData.name,
        description: currentData.description,
        location: currentData.city ? `${currentData.city}, ${currentData.country || 'Ghana'}` : 'Location not set',
        capacity: currentData.capacity || 0,
        avgRating: 0, // New venues start with no rating
        status: "draft",
        bookingsThisMonth: 0,
        createdAt: new Date().toISOString(),
        
        // Include image data
        featuredImagePreview: featuredImagePreview,
        galleryPreviews: galleryPreviews,
        imageFocus: imageFocus || { x: 50, y: 50 },
      };
      
      // Store the venue in localStorage
      const existingVenues = JSON.parse(localStorage.getItem('venues') || '[]');
      localStorage.setItem('venues', JSON.stringify([...existingVenues, venueData]));
      
      // Show success message
      toastService.success("Venue saved as draft");
      
      // Navigate to drafts page
      setTimeout(() => {
        router.push('/venue-owner/draft-venues');
      }, 500);
    } catch (error) {
      console.error("Error saving draft:", error);
      toastService.error("Failed to save draft. Please try again.");
    }
  };

  // Add these handler functions for image uploads
  const handleFeaturedImageClick = () => {
    if (featuredImageRef.current) {
      featuredImageRef.current.click();
    }
  };

  const handleGalleryClick = () => {
    if (galleryImagesRef.current) {
      galleryImagesRef.current.click();
    }
  };

  const handleFeaturedImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate image size
      const isValidSize = validateImageSize(file);
      if (!isValidSize) {
        const error = getImageSizeError(file);
        toastService.error(error || "Image file is too large");
        // Reset the input
        if (featuredImageRef.current) {
          featuredImageRef.current.value = '';
        }
        return;
      }
      
      // Update the form state
      setValue("featuredImage", file.name);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setFeaturedImagePreview(reader.result as string);
        // Reset position to center when new image is uploaded
        setImageFocus({ x: 50, y: 50 });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Validate all file sizes first
      const filesArray = Array.from(files);
      const invalidFiles: string[] = [];
      
      for (const file of filesArray) {
        const isValidSize = validateImageSize(file);
        if (!isValidSize) {
          invalidFiles.push(file.name);
        }
      }
      
      if (invalidFiles.length > 0) {
        const errorMessage = invalidFiles.length === 1 
          ? `${invalidFiles[0]} exceeds the maximum file size of ${Math.round(MAX_IMAGE_SIZE / (1024 * 1024))}MB`
          : `${invalidFiles.length} files exceed the maximum size limit of ${Math.round(MAX_IMAGE_SIZE / (1024 * 1024))}MB`;
        toastService.error(errorMessage);
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
        toastService.warning("Maximum of 10 gallery images allowed");
        return;
      }
      
      // Take only as many new files as we have space for (already validated)
      const filesToAdd = filesArray.slice(0, maxNewImages);
      
      // Update form state with filenames - append to existing
      const newFilenames = filesToAdd.map(file => file.name);
      setValue("galleryImages", [...currentImages, ...newFilenames]);
      
      // Create previews - append to existing
      let loadedImageCount = 0;
      filesToAdd.forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            setGalleryPreviews(prev => [...prev, reader.result as string]);
            loadedImageCount++;
            
            if (loadedImageCount === filesToAdd.length) {
              if (files.length > maxNewImages) {
                toastService.info(`Added ${maxNewImages} images. Maximum limit of 10 gallery images reached.`);
              }
            }
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Handle adding a rule
  const handleAddRule = () => {
    const currentRules = watch("rules") || [];
    setValue("rules", [...currentRules, ""]);
  };

  // Handle removing a rule
  const handleRemoveRule = (index: number) => {
    const currentRules = watch("rules") || [];
    setValue(
      "rules",
      currentRules.filter((_, i) => i !== index)
    );
  };

  // Handle rule change
  const handleRuleChange = (index: number, value: string) => {
    const currentRules = watch("rules") || [];
    const updatedRules = [...currentRules];
    updatedRules[index] = value;
    setValue("rules", updatedRules);
  };

  const handleAmenityToggle = (amenity: string) => {
    const currentAmenities = watch("amenities") || [];
    if (currentAmenities.includes(amenity)) {
      setValue(
        "amenities",
        currentAmenities.filter(a => a !== amenity)
      );
    } else {
      setValue("amenities", [...currentAmenities, amenity]);
    }
  };

  // Draggable image component
  const DraggableFeaturedImage = () => {
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!featuredImagePreview) return;
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
      >
        {featuredImagePreview && (
          <>
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${featuredImagePreview})`,
                backgroundSize: 'cover',
                backgroundPosition: `${imageFocus.x}% ${imageFocus.y}%`
              }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <span className="text-transparent group-hover:text-white transition-colors bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                Drag to position
              </span>
            </div>
            
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

  // Remove this effect if not needed
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setImageFocus({ x: 50, y: 50 });
      }
    };

    window.addEventListener("keydown", handle);

    return () => {
      window.removeEventListener("keydown", handle);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Add New Venue</h1>
          <p className="text-neutral-500">List your venue and start receiving bookings</p>
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
            {previewMode ? "Edit Venue" : "Preview"}
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
                <h2 className="text-xl font-semibold">Venue Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Venue Name *
                    </label>
                    <input
                      type="text"
                      {...methods.register("name")}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                      placeholder="e.g., Golden Tulip Conference Center"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Venue Description *
                    </label>
                    <textarea
                      {...methods.register("description")}
                      rows={4}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary sm:rows-6"
                      placeholder="Provide a detailed description of your venue..."
                    ></textarea>
                    {errors.description && (
                      <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Venue Type *
                    </label>
                    <select
                      {...methods.register("venueType")}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                    >
                      <option value="">Select a venue type</option>
                      {VENUE_TYPES.map((type) => (
                        <option key={type} value={type.toLowerCase()}>
                          {type}
                        </option>
                      ))}
                    </select>
                    {errors.venueType && (
                      <p className="text-red-500 text-sm mt-1">{errors.venueType.message}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Location Step */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold">Location</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      {...methods.register("address")}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                      placeholder="e.g., 123 Liberation Road"
                    />
                    {errors.address && (
                      <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        {...methods.register("city")}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                        placeholder="e.g., Accra"
                      />
                      {errors.city && (
                        <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Country *
                      </label>
                      <select
                        {...methods.register("country")}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                      >
                        <option value="Ghana">Ghana</option>
                        <option value="Nigeria">Nigeria</option>
                        <option value="South Africa">South Africa</option>
                        <option value="Kenya">Kenya</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.country && (
                        <p className="text-red-500 text-sm mt-1">{errors.country.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Postal/ZIP Code (Optional)
                    </label>
                    <input
                      type="text"
                      {...methods.register("postalCode")}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                      placeholder="e.g., 00233"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Map Location
                    </label>
                    <div className="bg-neutral-100 border border-dashed border-neutral-300 h-60 rounded-md flex items-center justify-center">
                      <div className="text-center text-neutral-500">
                        <MapPin className="mx-auto h-8 w-8 mb-2" />
                        <p>Map functionality will be integrated here</p>
                        <p className="text-sm">Click to set your venue location</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Capacity & Features Step */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold">Capacity & Features</h2>
                
                <div className="space-y-6">
                  <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                    <h3 className="font-medium mb-2">Capacity Information</h3>
                    <p className="text-sm text-neutral-600">
                      Specify how many people your venue can accommodate in different arrangements
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Total Capacity *
                      </label>
                      <input
                        type="number"
                        {...methods.register("capacity", { valueAsNumber: true })}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                        placeholder="Maximum people"
                      />
                      {errors.capacity && (
                        <p className="text-red-500 text-sm mt-1">{errors.capacity.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Seated Capacity
                      </label>
                      <input
                        type="number"
                        {...methods.register("seatedCapacity", { valueAsNumber: true })}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                        placeholder="Seated arrangement"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Standing Capacity
                      </label>
                      <input
                        type="number"
                        {...methods.register("standingCapacity", { valueAsNumber: true })}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                        placeholder="Standing arrangement"
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-3">Amenities</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {AMENITIES.map((amenity) => {
                        const isSelected = (watch("amenities") || []).includes(amenity);
                        return (
                          <div 
                            key={amenity} 
                            className={`flex items-center border rounded-md p-3 cursor-pointer ${
                              isSelected 
                                ? 'border-primary bg-primary/5' 
                                : 'border-neutral-200 hover:bg-neutral-50'
                            }`}
                            onClick={() => handleAmenityToggle(amenity)}
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-primary border-neutral-300 rounded"
                              checked={isSelected}
                              onChange={() => handleAmenityToggle(amenity)}
                            />
                            <span className="ml-2 text-sm">{amenity}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Pricing & Policies Step */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold">Pricing & Policies</h2>
                
                <div className="space-y-6">
                  <div className="bg-neutral-50 p-4 rounded-lg border border-neutral-200">
                    <h3 className="font-medium mb-2">Pricing Information</h3>
                    <p className="text-sm text-neutral-600">
                      Set your pricing structure and booking policies
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Base Price *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-neutral-500">₵</span>
                        </div>
                        <input
                          type="number"
                          {...methods.register("pricing.basePrice", { valueAsNumber: true })}
                          className="w-full pl-8 pr-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Pricing Model
                      </label>
                      <select
                        {...methods.register("pricing.pricingModel")}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                      >
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="flat">Flat Rate</option>
                      </select>
                    </div>
                  </div>

                  {watch("pricing.pricingModel") === "hourly" && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Minimum Booking Hours
                      </label>
                      <input
                        type="number"
                        {...methods.register("pricing.minimumHours", { valueAsNumber: true })}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                        placeholder="e.g., 2"
                      />
                    </div>
                  )}

                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-3">Booking Policies</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Cancellation Policy *
                        </label>
                        <select
                          {...methods.register("policies.cancellationPolicy")}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                        >
                          <option value="flexible">Flexible (24 hours)</option>
                          <option value="moderate">Moderate (48 hours)</option>
                          <option value="strict">Strict (7 days)</option>
                          <option value="non-refundable">Non-refundable</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Minimum Booking Notice (hours) *
                        </label>
                        <input
                          type="number"
                          {...methods.register("policies.minBookingNotice", { valueAsNumber: true })}
                          className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                          placeholder="e.g., 48"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Maximum Days in Advance to Book *
                      </label>
                      <input
                        type="number"
                        {...methods.register("policies.maxBookingInAdvance", { valueAsNumber: true })}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                        placeholder="e.g., 180 days"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Media Step */}
            {currentStep === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold">Venue Media</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Featured Image *
                    </label>
                    <div 
                      onClick={handleFeaturedImageClick}
                      className="border-2 border-dashed border-neutral-300 rounded-lg p-6 flex flex-col items-center justify-center bg-neutral-50 cursor-pointer hover:bg-neutral-100 transition-colors relative"
                    >
                      {featuredImagePreview ? (
                        <div className="w-full">
                          <DraggableFeaturedImage />
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
                              setFeaturedImagePreview(null);
                              setValue("featuredImage", "");
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
                          <p className="text-sm text-neutral-500 mt-1">{`JPG, PNG, or GIF up to ${Math.round(MAX_IMAGE_SIZE / (1024 * 1024))}MB`}</p>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={featuredImageRef}
                        onChange={handleFeaturedImageChange}
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
                                    // Remove image from previews
                                    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
                                    // Remove from form state
                                    const currentImages = watch("galleryImages") || [];
                                    setValue(
                                      "galleryImages", 
                                      currentImages.filter((_, i) => i !== index)
                                    );
                                  }}
                                  className="absolute top-1 right-1 bg-white/80 backdrop-blur-sm p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-500 transition-opacity"
                                  aria-label={`Remove image ${index + 1}`}
                                >
                                  <Trash2 className="w-3 h-3" />
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
                          <p className="text-sm text-neutral-500 mt-1">{`Show your venue from multiple angles (max ${Math.round(MAX_IMAGE_SIZE / (1024 * 1024))}MB each)`}</p>
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

            {/* Settings Step */}
            {currentStep === 5 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold">Venue Settings</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Venue Status</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-neutral-200 rounded-lg gap-3">
                      <div className="flex-1">
                        <h4 className="font-medium">Active Venue</h4>
                        <p className="text-sm text-neutral-500">
                          Your venue will be visible and bookable
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={watch("status") === "active"}
                          onChange={(e) => setValue("status", e.target.checked ? "active" : "inactive")}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-3">Venue Rules & Restrictions</h3>
                    <div className="space-y-3">
                      {(watch("rules") || []).map((rule, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={rule}
                            onChange={(e) => handleRuleChange(index, e.target.value)}
                            className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                            placeholder="e.g., No smoking, No parties after 10pm"
                          />
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRule(index)}
                              className="px-2 py-2 bg-neutral-100 text-neutral-700 rounded-md hover:bg-neutral-200 transition-colors"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={handleAddRule}
                        className="px-4 py-2 border border-dashed border-neutral-300 text-neutral-700 rounded-md hover:bg-neutral-50 transition-colors w-full flex items-center justify-center gap-2"
                      >
                        <span className="text-xl">+</span>
                        <span>Add Rule or Restriction</span>
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-3">Owner Notes</h3>
                    <textarea
                      {...methods.register("ownerNotes")}
                      rows={3}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                      placeholder="Add any internal notes about this venue (only visible to you)"
                    ></textarea>
                    <p className="text-neutral-500 text-sm mt-1">
                      These notes are only visible to you and won't be shown to customers
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
                  onClick={methods.handleSubmit((data) => onSubmit(data, false))}
                  disabled={!isValid || isSubmitting}
                  className={`w-full sm:w-auto px-6 py-2 rounded-md font-medium flex items-center justify-center gap-2 cursor-pointer ${
                    !isValid || isSubmitting
                      ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                      : "bg-primary text-white hover:bg-primary-dark"
                  }`}
                >
                  {isSubmitting ? "Creating..." : "Add Venue"}
                </button>
              )
            }
            </div>
          </form>
        </FormProvider>
      ) : (
        // Preview mode
        <div className="bg-white rounded-lg border border-neutral-200 p-4 sm:p-6">
          <div className="mb-4 pb-4 border-b border-neutral-200">
            <h2 className="text-xl font-semibold">Venue Preview</h2>
            <p className="text-neutral-500">
              This is how your venue will appear to customers
            </p>
          </div>
          
          <div className="space-y-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold mb-2">{formData.name || "Venue Name"}</h1>
              <p className="text-sm text-neutral-500 mb-4">{formData.description || "Venue description goes here..."}</p>
              
              <div className="relative bg-neutral-200 h-64 w-full rounded-lg flex items-center justify-center">
                {featuredImagePreview ? (
                  <div 
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${featuredImagePreview})`,
                      backgroundSize: 'cover',
                      backgroundPosition: `${imageFocus.x}% ${imageFocus.y}%`
                    }}
                  />
                ) : (
                  <div className="text-center text-neutral-500">
                    <ImageIcon className="mx-auto h-8 w-8 mb-2" />
                    <p>Featured image will appear here</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Location</h3>
                <p className="text-sm text-neutral-700">{formData.address}</p>
                <p className="text-sm text-neutral-700">{formData.city}, {formData.country}</p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Contact & Links</h3>
                <p className="text-sm text-neutral-700">Phone: +233 24 000 0000</p>
                <p className="text-sm text-neutral-700">Email: info@venue.com</p>
                <Link href="#" className="text-primary text-sm">
                  Visit Venue Website
                </Link>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-3">Capacity & Features</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="text-md font-medium text-neutral-700 mb-2">Total Capacity</h3>
                  <p className="text-lg font-bold">{formData.capacity}</p>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-neutral-700 mb-2">Seated Capacity</h3>
                  <p className="text-lg font-bold">{formData.seatedCapacity || 0}</p>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-neutral-700 mb-2">Standing Capacity</h3>
                  <p className="text-lg font-bold">{formData.standingCapacity || 0}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-md font-medium text-neutral-700 mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {(formData.amenities || []).map((amenity) => (
                    <span key={amenity} className="text-xs rounded-full bg-primary/10 text-primary px-3 py-1">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-3">Pricing & Policies</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="text-md font-medium text-neutral-700 mb-2">Base Price</h3>
                  <p className="text-lg font-bold">₵{formData.pricing?.basePrice}</p>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-neutral-700 mb-2">Pricing Model</h3>
                  <p className="text-lg font-bold">{formData.pricing?.pricingModel}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-md font-medium text-neutral-700 mb-2">Cancellation Policy</h3>
                <p className="text-sm text-neutral-600">{formData.policies?.cancellationPolicy}</p>
              </div>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-3">Venue Rules & Restrictions</h2>
              
              <ul className="list-disc list-inside mb-4">
                {(formData.rules || []).map((rule, index) => (
                  <li key={index} className="text-sm text-neutral-700">
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-3">Owner Notes</h2>
              <p className="text-sm text-neutral-600">{formData.ownerNotes || "No notes provided."}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}