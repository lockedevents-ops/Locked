"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SignInModal } from '@/components/ui/SignInModal';
import { useAuth } from '@/contexts/AuthContext';
import { VenueBookingModal } from '@/components/venues/VenueBookingModal';
import { usePathname, useParams } from 'next/navigation';
import { BiShare, BiLockOpen, BiLockAlt } from 'react-icons/bi';
import { X, Copy, Check, Building } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useLockStore } from '@/store/lockStore'; // Import the lock store
import { addRecentlyViewedVenue } from '@/utils/recentlyViewed';
import { isVenuesEnabled } from '@/lib/network';
import { PageLoader } from '@/components/loaders/PageLoader';

interface VenueDetails {
  id: string;
  name: string;
  description: string;
  location: {
    address: string;
    city: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  capacity: number;
  amenities: string[];
  images: string[];
  pricing: {
    basePrice: number;
    currency: string;
  };
  availability: {
    availableDates: string[];
    businessHours: {
      open: string;
      close: string;
    };
  };
  rating: number;
  reviewCount: number;
  features: string[];
  policies: {
    cancellation: string;
    minimumBookingTime: string;
    restrictions: string[];
  };
  venueType?: string; // Added venueType property
}

export default function VenueDetailsPage() {
  const params = useParams();
  const toast = useToast();
  const venueId = params.id as string;
  const pathname = usePathname();
  
  const [venue, setVenue] = useState<VenueDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInAction, setSignInAction] = useState<'lock' | 'book'>('book');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const venuesEnabled = isVenuesEnabled();
  
  // Get isLocked from global state
  const { isItemLocked, toggleLock } = useLockStore();
  const isLocked = isItemLocked(venueId, 'venue');
  
  let isAuthenticated = false;
  try {
    isAuthenticated = useAuth().isAuthenticated;
  } catch {}

  // Fetch venue data
  useEffect(() => {
    if (!venuesEnabled) {
      setVenue(null);
      setIsLoading(false);
      return;
    }

    const fetchVenue = () => {
      setIsLoading(true);
      try {
        // Get venue from localStorage
        const storedVenues = localStorage.getItem('venues');
        if (storedVenues) {
          const allVenues = JSON.parse(storedVenues);
          
          // Find the venue with matching ID - note that some might be numbers, some strings
          const foundVenue = allVenues.find((v: any) => String(v.id) === String(venueId));
          
          if (foundVenue) {
            // Transform the data to match our VenueDetails interface
            const venueData: VenueDetails = {
              id: String(foundVenue.id),
              name: foundVenue.name || "Unnamed Venue",
              description: foundVenue.description || "No description available",
              location: {
                address: foundVenue.address || "",
                city: foundVenue.city || "",
                country: foundVenue.country || "Ghana",
                coordinates: foundVenue.coordinates || { lat: 5.6037, lng: -0.1870 }
              },
              capacity: foundVenue.capacity || 0,
              amenities: foundVenue.amenities || [],
              // Use featuredImage, galleryImages, or default placeholders
              images: [
                foundVenue.featuredImagePreview || "/venue-placeholder.jpg",
                ...(foundVenue.galleryPreviews || [])
              ].filter(Boolean),
              pricing: {
                basePrice: foundVenue.pricing?.basePrice || 0,
                currency: "GHS"
              },
              availability: {
                availableDates: [],
                businessHours: {
                  open: "09:00",
                  close: "17:00"
                }
              },
              rating: foundVenue.rating || 4.5,
              reviewCount: foundVenue.reviewCount || Math.floor(Math.random() * 100) + 10,
              features: foundVenue.features || [
                `${foundVenue.capacity || 100} Person Capacity`,
                foundVenue.venueType || "Standard Venue"
              ],
              policies: {
                cancellation: foundVenue.policies?.cancellation || "Standard 48-hour cancellation policy",
                minimumBookingTime: foundVenue.policies?.minBookingNotice 
                  ? `${foundVenue.policies.minBookingNotice} hours` 
                  : "24 hours",
                restrictions: foundVenue.rules || []
              }
            };
            
            setVenue(venueData);
          } else {
            toast.showError("Venue Not Found", "The venue you're looking for could not be found");
            setVenue(null);
          }
        } else {
          toast.showError("No Venues Available", "No venue data is currently available");
          setVenue(null);
        }
      } catch (error) {
        console.error("Error fetching venue:", error);
        toast.showError("Load Failed", "Error loading venue details");
        setVenue(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVenue();
    
    // ✅ PHASE 2: Save to recently viewed with TTL support
    addRecentlyViewedVenue({
      id: venueId,
    });
  }, [venueId, venuesEnabled]);

  if (!venuesEnabled) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="max-w-xl text-center rounded-xl border border-neutral-200 p-8 shadow-sm">
          <Building className="mx-auto h-12 w-12 text-neutral-300 mb-4" />
          <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Venue Pages Are Paused</h1>
          <p className="text-neutral-600">This page is unavailable while venue functionality is temporarily frozen.</p>
        </div>
      </div>
    );
  }

  // Handle share function
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: venue?.name || "Check out this venue",
        url: window.location.href,
      });
    } else {
      setShowShareModal(true);
    }
  };

  // Handle copy link function
  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
        });
    } else {
      const inputElement = document.getElementById('share-url-input');
      if (inputElement) {
        (inputElement as HTMLInputElement).select();
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    }
  };

  // Handle lock/unlock
  const handleLockToggle = () => {
    if (!isAuthenticated) {
      setSignInAction('lock');
      setShowSignInModal(true);
      return;
    }
    
    // Use the venue data for the lock store
    toggleLock(venueId, 'venue', venue);
  };

  // Get similar venues based on venue type or capacity
  const getSimilarVenues = () => {
    if (!venue) return [];
    
    try {
      const storedVenues = localStorage.getItem('venues');
      if (!storedVenues) return [];
      
      const allVenues = JSON.parse(storedVenues);
      
      // Filter for active venues that aren't the current one
      const activeVenues = allVenues.filter((v: any) => 
        v.status === 'active' && String(v.id) !== String(venueId)
      );
      
      // Sort by similarity (same type or similar capacity)
      const sortedVenues = activeVenues.sort((a: any, b: any) => {
        const aTypeMatch = a.venueType === venue.venueType ? 1 : 0;
        const bTypeMatch = b.venueType === venue.venueType ? 1 : 0;
        
        const aCapacityDiff = a.capacity ? Math.abs(a.capacity - venue.capacity) : 1000;
        const bCapacityDiff = b.capacity ? Math.abs(b.capacity - venue.capacity) : 1000;
        
        const aScore = aTypeMatch * 10 + (1000 - aCapacityDiff) * 0.01;
        const bScore = bTypeMatch * 10 + (1000 - bCapacityDiff) * 0.01;
        
        return bScore - aScore;
      });
      
      // Map to the format needed by the UI
      return sortedVenues.slice(0, 3).map((v: any) => ({
        id: String(v.id),
        name: v.name,
        image: v.featuredImagePreview || "/venue-placeholder.jpg",
        location: v.location || "Ghana",
        capacity: v.capacity || 0,
        priceRange: getPriceRangeSymbol(v.pricing?.basePrice || 0)
      }));
    } catch (error) {
      console.error("Error getting similar venues:", error);
      return [];
    }
  };
  
  // Helper function to convert price to symbols
  const getPriceRangeSymbol = (price: number) => {
    if (price <= 200) return "₵";
    if (price <= 500) return "₵₵";
    if (price <= 1000) return "₵₵₵";
    return "₵₵₵₵";
  };

  // Loading state
  if (isLoading) {
    return <PageLoader message="Loading venue details..." fullHeight />;
  }

  // Error state - venue not found
  if (!venue) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Venue Not Found</h1>
          <p className="text-neutral-600 mb-6">
            The venue you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href="/pages/venues"
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors"
          >
            Browse All Venues
          </Link>
        </div>
      </div>
    );
  }

  const similarVenues = getSimilarVenues();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="relative aspect-video rounded-lg overflow-hidden">
                <Image
                  src={venue.images[activeImageIndex] || '/venue-placeholder.jpg'}
                  alt={venue.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {venue.images.map((image, index) => (
                  <button
                    key={index}
                    className={`relative aspect-video rounded-md overflow-hidden ${
                      index === activeImageIndex ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setActiveImageIndex(index)}
                  >
                    <Image
                      src={image}
                      alt={`${venue.name} view ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Venue Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold">{venue.name}</h1>
                <p className="text-gray-600 mt-2">
                  {venue.location.address || venue.location.city}, {venue.location.country}
                </p>
              </div>
              
              <div className="flex gap-4">
                <button
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 bg-white text-gray-700 hover:bg-neutral-100 hover:text-primary font-medium shadow-sm transition cursor-pointer"
                  style={{ cursor: 'pointer' }}
                  onClick={handleShare}
                >
                  <BiShare className="w-5 h-5" />
                  <span>Share</span>
                </button>
                <button
                  type="button"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-200 font-medium shadow-sm transition cursor-pointer ${
                    isLocked
                      ? 'bg-success/10 text-success hover:bg-success/20'
                      : 'bg-white text-gray-700 hover:bg-neutral-100 hover:text-primary'
                  }`}
                  style={{ cursor: 'pointer' }}
                  onClick={handleLockToggle}
                >
                  {isLocked ? (
                    <>
                      <BiLockAlt className="w-5 h-5 text-success" />
                      <span>Locked</span>
                    </>
                  ) : (
                    <>
                      <BiLockOpen className="w-5 h-5 text-gray-400" />
                      <span>Lock</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <span className="text-yellow-400">★</span>
                  <span className="ml-1 font-medium">{venue.rating}</span>
                  <span className="text-gray-500 ml-1">({venue.reviewCount} reviews)</span>
                </div>
                <div className="text-gray-500">•</div>
                <div className="text-gray-600">
                  Up to {venue.capacity} guests
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">Description</h2>
                <p className="text-gray-600">{venue.description}</p>
              </div>

              <div>
                <h2 className="text-xl font-semibold mb-2">Amenities</h2>
                <div className="grid grid-cols-2 gap-y-2">
                  {(showAllAmenities ? venue.amenities : venue.amenities.slice(0, 6)).map((amenity) => (
                    <div key={amenity} className="flex items-center space-x-2">
                      <span className="text-primary">✓</span>
                      <span>{amenity}</span>
                    </div>
                  ))}
                </div>
                {venue.amenities.length > 6 && (
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 mt-3 text-sm font-medium text-primary hover:text-primary-dark bg-primary/5 hover:bg-primary/10 rounded-full transition-colors cursor-pointer"
                    onClick={() => setShowAllAmenities(!showAllAmenities)}
                  >
                    {showAllAmenities ? (
                      <>
                        <span>Show less</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 15l-6-6-6 6"/>
                        </svg>
                      </>
                    ) : (
                      <>
                        <span>Show all amenities</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="border-t pt-6">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-bold">
                      {venue.pricing.currency} {venue.pricing.basePrice.toLocaleString()}
                    </span>
                    <span className="text-gray-600"> / day</span>
                  </div>
                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        setShowSignInModal(true);
                        return;
                      }
                      setIsBookingModalOpen(true);
                    }}
                    className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-md font-medium transition-colors cursor-pointer"
                  >
                    Book Now
                  </button>
                </div>
                <p className="text-gray-500 text-sm mt-2">
                  Minimum booking: {venue.policies.minimumBookingTime}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold">Share This Venue</h3>
              <button 
                className="text-gray-500 hover:text-gray-800"
                onClick={() => setShowShareModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Share this venue with your friends and family who might be interested.
            </p>
            
            <button 
              onClick={handleCopyLink}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-colors ${
                copySuccess 
                  ? 'bg-green-500 text-white' 
                  : 'bg-primary text-white hover:bg-primary-dark'
              }`}
            >
              {copySuccess ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
            
            <input
              id="share-url-input"
              type="text"
              readOnly
              value={window.location.href}
              className="sr-only"
              aria-hidden="true"
            />
            
            <div className="mt-6 mb-2">
              <p className="text-sm text-center text-gray-600 mb-4">
                Or share directly on social media:
              </p>
              <div className="flex justify-center gap-4">
                {/* Social sharing buttons */}
                <a 
                  href={`https://wa.me/?text=${encodeURIComponent(`Check out this venue: ${window.location.href}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-[#25D366] text-white hover:opacity-90 hover:shadow-md transition-all transform hover:-translate-y-1"
                  aria-label="Share on WhatsApp"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.091 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345z"/>
                  </svg>
                </a>
                
                {/* Other social sharing buttons */}
                {/* ... */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      <VenueBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        venue={venue}
      />

      {/* Sign In Modal */}
      <SignInModal 
        isOpen={showSignInModal} 
        onClose={() => setShowSignInModal(false)}
        action={signInAction}
        returnUrl={pathname}
      />

      {/* Additional Sections */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Policies */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Venue Policies</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Cancellation Policy</h3>
                  <p className="text-gray-600 text-sm">{venue.policies.cancellation}</p>
                </div>
                <div>
                  <h3 className="font-medium">Restrictions</h3>
                  <ul className="text-gray-600 text-sm list-disc list-inside">
                    {venue.policies.restrictions.length > 0 ? (
                      venue.policies.restrictions.map((restriction, index) => (
                        <li key={index}>{restriction}</li>
                      ))
                    ) : (
                      <li>No specific restrictions listed</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Business Hours</h2>
              <div className="text-gray-600">
                <p>Open daily</p>
                <p>
                  {venue.availability.businessHours.open} - {venue.availability.businessHours.close}
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Key Features</h2>
              <ul className="space-y-2">
                {venue.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <span className="text-primary mr-2">•</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Similar Venues Section */}
      {similarVenues.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6">Similar Venues You May Like</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarVenues.map((similarVenue: {
                id: string;
                name: string;
                image: string;
                location: string;
                capacity: number;
                priceRange: string;
              }) => (
                <div key={similarVenue.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 flex flex-col h-full">
                  <div className="relative w-full h-48">
                    <Image
                      src={similarVenue.image}
                      alt={similarVenue.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  
                  <div className="p-5 flex flex-col gap-2 flex-1">
                    <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{similarVenue.name}</h3>
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.1a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{similarVenue.location}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                        Capacity: {similarVenue.capacity}
                      </span>
                      {similarVenue.priceRange && (
                        <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full font-medium">
                          {similarVenue.priceRange}
                        </span>
                      )}
                    </div>
                    
                    {/* Add View Venue CTA Button */}
                    <Link 
                      href={`/venue/${similarVenue.id}`}
                      className="mt-auto w-full bg-primary text-white text-center py-2 rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      View Venue
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}