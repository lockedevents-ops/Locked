"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
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
  Star,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { PageLoader } from '@/components/loaders/PageLoader';

// Reuse the same form schema and constants as the add page
const VENUE_TYPES = [
  "Conference Center",
  "Hotel",
  "Theatre",
  "Stadium",
  "Restaurant",
  "Bar/Club",
  "Co-working Space",
  "Outdoor Space",
  "Private Residence",
  "Other"
];

const AMENITIES = [
  "WiFi",
  "Parking",
  "Audio/Visual Equipment",
  "Stage",
  "Kitchen",
  "Catering",
  "Restrooms",
  "Air Conditioning",
  "Security",
  "Accessibility Features",
  "Changing Rooms"
];

// Form schema validation
const venueFormSchema = z.object({
  name: z.string().min(3, "Venue name must be at least 3 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  venueType: z.string().min(1, "Please select a venue type"),
  
  // Location
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().optional(),
  
  // Capacity
  capacity: z.number().min(1, "Capacity must be at least 1").optional(),
  seatingCapacity: z.number().min(0, "Cannot be negative").optional(),
  standingCapacity: z.number().min(0, "Cannot be negative").optional(),
  
  // Features
  amenities: z.array(z.string()).optional(),
  
  // Pricing
  pricing: z.object({
    basePrice: z.number().min(0, "Price cannot be negative"),
    pricingModel: z.enum(["hourly", "daily", "flat"]),
    minimumHours: z.number().min(1, "Minimum hours must be at least 1").optional(),
    minimumDays: z.number().min(1, "Minimum days must be at least 1").optional(),
    weekendPricing: z.boolean().optional(),
    weekendPriceMultiplier: z.number().min(1, "Multiplier must be at least 1").optional(),
  }),
  
  // Policies
  policies: z.object({
    cancellation: z.string().optional(),
    minBookingNotice: z.number().min(0, "Cannot be negative").optional(),
    maxBookingInAdvance: z.number().min(1, "Must be at least 1").optional(),
  }),
  
  // Media
  featuredImage: z.string().optional(),
  galleryImages: z.array(z.string()).optional(),
  
  // Additional settings
  rules: z.array(z.string()).optional(),
  ownerNotes: z.string().optional(),
  status: z.enum(["active", "inactive", "draft"]),
});

type VenueFormValues = z.infer<typeof venueFormSchema>;

export default function EditVenuePage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [venue, setVenue] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(null);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  
  const featuredImageRef = useRef<HTMLInputElement>(null);
  const galleryImagesRef = useRef<HTMLInputElement>(null);
  const imagePreviewRef = useRef<HTMLDivElement>(null);

  // Add these new states for position control
  const [imageFocus, setImageFocus] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });

  // Form steps - same as add page
  const formSteps = [
    { id: "basics", title: "Basic Details", icon: <Info className="w-5 h-5" /> },
    { id: "location", title: "Location", icon: <MapPin className="w-5 h-5" /> },
    { id: "capacity", title: "Capacity & Features", icon: <Users className="w-5 h-5" /> },
    { id: "pricing", title: "Pricing & Policies", icon: <DollarSign className="w-5 h-5" /> },
    { id: "media", title: "Media", icon: <ImageIcon className="w-5 h-5" /> },
    { id: "settings", title: "Settings", icon: <CheckSquare className="w-5 h-5" /> },
  ];
  
  // Set up react-hook-form
  const methods = useForm<VenueFormValues>({
    resolver: zodResolver(venueFormSchema),
    mode: "onChange",
  });
  
  const { handleSubmit, formState: { errors, isValid }, watch, setValue, reset } = methods;

  // Fetch venue data when component mounts
  useEffect(() => {
    const fetchVenue = () => {
      setIsLoading(true);
      try {
        // Get venue from localStorage
        const venueId = Number(params.id);
        const storedVenues = localStorage.getItem('venues');
        if (storedVenues) {
          const parsedVenues = JSON.parse(storedVenues);
          const foundVenue = parsedVenues.find((v: any) => v.id === venueId);
          
          if (foundVenue) {
            setVenue(foundVenue);
            
            // Transform the venue data to match our form structure
            const formData = {
              name: foundVenue.name || "",
              description: foundVenue.description || "",
              venueType: foundVenue.venueType || "",
              address: foundVenue.address || "",
              city: foundVenue.location ? foundVenue.location.split(',')[0].trim() : "",
              country: foundVenue.location ? foundVenue.location.split(',')[1]?.trim() : "Ghana",
              postalCode: foundVenue.postalCode || "",
              capacity: foundVenue.capacity || 0,
              seatingCapacity: foundVenue.seatingCapacity || 0,
              standingCapacity: foundVenue.standingCapacity || 0,
              amenities: foundVenue.amenities || [],
              pricing: {
                basePrice: foundVenue.pricing?.basePrice || 0,
                pricingModel: foundVenue.pricing?.pricingModel || "hourly",
                minimumHours: foundVenue.pricing?.minimumHours || 1,
                minimumDays: foundVenue.pricing?.minimumDays || 1,
                weekendPricing: foundVenue.pricing?.weekendPricing || false,
                weekendPriceMultiplier: foundVenue.pricing?.weekendPriceMultiplier || 1.5,
              },
              policies: {
                cancellation: foundVenue.policies?.cancellation || "",
                minBookingNotice: foundVenue.policies?.minBookingNotice || 24,
                maxBookingInAdvance: foundVenue.policies?.maxBookingInAdvance || 90,
              },
              featuredImage: foundVenue.featuredImage || "",
              galleryImages: foundVenue.galleryImages || [],
              rules: foundVenue.rules || [],
              ownerNotes: foundVenue.ownerNotes || "",
              status: foundVenue.status || "active",
            };
            
            // Reset form with venue data
            reset(formData);
            
            // Set image previews if available
            if (foundVenue.featuredImagePreview) {
              setFeaturedImagePreview(foundVenue.featuredImagePreview);
            }
            if (foundVenue.galleryPreviews && foundVenue.galleryPreviews.length > 0) {
              setGalleryPreviews(foundVenue.galleryPreviews);
            }
          } else {
            toast.showError('Not Found', 'Venue not found');
            router.push('/venue-owner/pages/venues');
          }
        }
      } catch (error) {
        console.error("Error fetching venue:", error);
        toast.showError('Loading Error', 'Error loading venue details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVenue();
  }, [params.id, router, reset]);

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
      const venueId = Number(params.id);
      
      // Format the data for storage
      const updatedVenueData = {
        ...venue,
        id: venueId,
        name: data.name,
        description: data.description,
        venueType: data.venueType,
        address: data.address,
        location: `${data.city}, ${data.country}`,
        postalCode: data.postalCode,
        capacity: data.capacity,
        seatingCapacity: data.seatingCapacity,
        standingCapacity: data.standingCapacity,
        amenities: data.amenities,
        pricing: data.pricing,
        policies: data.policies,
        featuredImage: data.featuredImage,
        galleryImages: data.galleryImages,
        rules: data.rules,
        ownerNotes: data.ownerNotes,
        status: isDraft ? "draft" : data.status,
        lastUpdated: new Date().toISOString(),
        // Store image previews
        featuredImagePreview: featuredImagePreview,
        galleryPreviews: galleryPreviews,
        // Add image focus to the updated venue data
        imageFocus: imageFocus, // Store the position
      };
      
      // Update the venue in localStorage
      const storedVenues = localStorage.getItem('venues');
      if (storedVenues) {
        const allVenues = JSON.parse(storedVenues);
        const updatedVenues = allVenues.map((v: any) => 
          v.id === venueId ? updatedVenueData : v
        );
        
        localStorage.setItem('venues', JSON.stringify(updatedVenues));
      }
      
      // Show success message
      toast.showSuccess('Venue Updated', 'Venue updated successfully');
      
      // Navigate back to appropriate page based on status
      setTimeout(() => {
        if (isDraft) {
          router.push('/venue-owner/draft-venues');
        } else {
          router.push(`/venue-owner/pages/venues/${venueId}`);
        }
      }, 500);
    } catch (error) {
      console.error("Error updating venue:", error);
      toast.showError('Update Failed', 'Failed to update venue. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save as draft - bypass validation
  const saveAsDraft = () => {
    const currentData = methods.getValues();
    
    // Ensure minimal required fields for drafts
    if (!currentData.name) {
      toast.showError('Name Required', 'Please provide at least a name for your venue draft');
      return;
    }
    
    const venueId = Number(params.id);
    
    try {
      // Format the data for API
      const updatedVenueData = {
        ...venue,
        id: venueId,
        name: currentData.name,
        description: currentData.description || venue.description,
        venueType: currentData.venueType || venue.venueType,
        location: currentData.city ? `${currentData.city}, ${currentData.country || 'Ghana'}` : venue.location,
        status: "draft",
        lastUpdated: new Date().toISOString(),
        featuredImagePreview: featuredImagePreview,
        galleryPreviews: galleryPreviews,
      };
      
      // Update the venue in localStorage
      const storedVenues = localStorage.getItem('venues');
      if (storedVenues) {
        const allVenues = JSON.parse(storedVenues);
        const updatedVenues = allVenues.map((v: any) => 
          v.id === venueId ? updatedVenueData : v
        );
        
        localStorage.setItem('venues', JSON.stringify(updatedVenues));
      }
      
      // Show success message
      toast.showSuccess('Draft Saved', 'Venue saved as draft');
      
      // Navigate to drafts page
      setTimeout(() => {
        router.push('/venue-owner/draft-venues');
      }, 500);
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.showError('Save Failed', 'Failed to save draft. Please try again.');
    }
  };

  // Handle image uploads
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

  // Update the handleGalleryImagesChange function to properly append images
  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Get current gallery images and limit to max 10 total
      const currentImages = watch("galleryImages") || [];
      const currentPreviews = [...galleryPreviews];
      
      // Calculate how many more images we can add
      const maxNewImages = 10 - currentPreviews.length;
      
      if (maxNewImages <= 0) {
        toast.showWarning('Gallery Full', 'Maximum of 10 gallery images allowed');
        return;
      }
      
      // Take only as many new files as we have space for
      const filesToAdd = Array.from(files).slice(0, maxNewImages);
      
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
                toast.showInfo('Images Added', `Added ${maxNewImages} images. Maximum limit of 10 gallery images reached.`);
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

  // DraggableFeaturedImage component
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
        onTouchStart={() => {/* Add touch support later */}}
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

  if (isLoading) {
    return <PageLoader message="Loading venue editor..." fullHeight />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <Link
            href={`/venue-owner/pages/venues/${params.id}`}
            className="text-neutral-500 hover:text-neutral-700 inline-flex items-center text-sm w-fit mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Venue
          </Link>
          <h1 className="text-2xl font-bold">Edit Venue</h1>
          <p className="text-neutral-500">Update your venue information</p>
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
                        placeholder="Maximum capacity"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Seated Capacity
                      </label>
                      <input
                        type="number"
                        {...methods.register("seatingCapacity", { valueAsNumber: true })}
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
                        Pricing Model *
                      </label>
                      <select
                        {...methods.register("pricing.pricingModel")}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                      >
                        <option value="hourly">Hourly Rate</option>
                        <option value="daily">Daily Rate</option>
                        <option value="flat">Flat Rate (per booking)</option>
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
                        placeholder="e.g., 2 hours"
                      />
                    </div>
                  )}

                  {watch("pricing.pricingModel") === "daily" && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Minimum Booking Days
                      </label>
                      <input
                        type="number"
                        {...methods.register("pricing.minimumDays", { valueAsNumber: true })}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                        placeholder="e.g., 1 day"
                      />
                    </div>
                  )}

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="weekendPricing"
                      {...methods.register("pricing.weekendPricing")}
                      className="h-4 w-4 text-primary border-neutral-300 rounded"
                    />
                    <label htmlFor="weekendPricing" className="ml-2 text-sm text-neutral-700">
                      Enable weekend pricing (higher rates for Friday-Sunday)
                    </label>
                  </div>

                  {watch("pricing.weekendPricing") && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Weekend Price Multiplier
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        {...methods.register("pricing.weekendPriceMultiplier", { valueAsNumber: true })}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                        placeholder="e.g., 1.5 (50% more)"
                      />
                      <p className="text-neutral-500 text-sm mt-1">
                        Weekend price will be calculated as (base price × multiplier)
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Cancellation Policy
                    </label>
                    <textarea
                      {...methods.register("policies.cancellation")}
                      rows={3}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                      placeholder="Describe your cancellation policy, e.g., 'Full refund if canceled 7 days before event'"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Minimum Notice for Booking (hours) *
                      </label>
                      <input
                        type="number"
                        {...methods.register("policies.minBookingNotice", { valueAsNumber: true })}
                        className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                        placeholder="e.g., 48"
                      />
                    </div>
                    
                    <div>
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
                          <p className="text-sm text-neutral-500 mt-1">JPG, PNG, or GIF up to 10MB</p>
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
                          <p className="text-sm text-neutral-500 mt-1">Show your venue from multiple angles</p>
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
                            className="flex-1 px-4 py-2 border border-neutral-300 rounded-md focus:ring-primary focus:border-primary"
                            placeholder="e.g., No smoking, No outside food"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveRule(index)}
                            className="p-2 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={handleAddRule}
                        className="inline-flex items-center gap-1 text-primary hover:text-primary-dark"
                      >
                        <span className="text-xl">+</span> Add Rule
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
            
            {/* Debugging section */}
            {currentStep === formSteps.length - 1 && !isValid && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 font-medium text-sm mb-2">Some required fields need attention:</p>
                <ul className="list-disc pl-5 text-sm space-y-1 text-red-600">
                  {errors.name && <li>Venue name: {errors.name.message}</li>}
                  {errors.description && <li>Description: {errors.description.message}</li>}
                  {errors.venueType && <li>Venue type: {errors.venueType.message}</li>}
                  {errors.address && <li>Address: {errors.address.message}</li>}
                  {errors.city && <li>City: {errors.city.message}</li>}
                  {errors.country && <li>Country: {errors.country.message}</li>}
                  {errors.pricing?.basePrice && <li>Base price: {errors.pricing.basePrice.message}</li>}
                  {errors.pricing?.pricingModel && <li>Pricing model: {errors.pricing.pricingModel.message}</li>}
                  {/* Add more error fields as needed */}
                </ul>
                <p className="mt-2 text-sm text-red-600">Please check all form tabs for errors.</p>
              </div>
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
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={saveAsDraft}
                    className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-md hover:bg-neutral-50 transition-colors"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={methods.handleSubmit((data) => onSubmit(data, false))}
                    disabled={isSubmitting}
                    className={`w-full sm:w-auto px-6 py-2 rounded-md font-medium flex items-center justify-center gap-2 cursor-pointer ${
                      isSubmitting
                        ? "bg-neutral-300 text-neutral-500 cursor-not-allowed"
                        : isValid 
                          ? "bg-primary text-white hover:bg-primary-dark" 
                          : "bg-yellow-500 text-white hover:bg-yellow-600"
                    }`}
                  >
                    {isSubmitting ? "Updating..." : isValid ? "Update Venue" : "Update With Errors"}
                  </button>
                </div>
              )}
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
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-neutral-700">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {formData.city && formData.country
                      ? `${formData.city}, ${formData.country}`
                      : "Location TBD"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>Capacity: {formData.capacity || "Not specified"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>{venue?.avgRating || 0} rating</span>
                </div>
              </div>
            </div>
            
            <div className="relative bg-neutral-200 h-64 w-full rounded-lg overflow-hidden">
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
            
            <div>
              <h3 className="font-medium mb-2">Amenities</h3>
              {formData.amenities && formData.amenities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.amenities.map((amenity) => (
                    <span 
                      key={amenity} 
                      className="px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full text-sm"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-neutral-500">No amenities specified yet.</p>
              )}
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Pricing</h3>
              <div className="p-4 border border-neutral-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Base Rate</h4>
                  <div className="font-bold">
                    ₵{formData.pricing?.basePrice || 0}
                    {formData.pricing?.pricingModel === 'hourly' ? '/hour' : 
                     formData.pricing?.pricingModel === 'daily' ? '/day' : ''}
                  </div>
                </div>
                {formData.pricing?.pricingModel === 'hourly' && formData.pricing?.minimumHours && (
                  <p className="text-sm text-neutral-600 mt-1">
                    Minimum booking: {formData.pricing.minimumHours} hours
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-neutral-200 flex justify-center">
            <button
              type="button"
              onClick={() => setPreviewMode(false)}
              className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors cursor-pointer"
            >
              Continue Editing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}