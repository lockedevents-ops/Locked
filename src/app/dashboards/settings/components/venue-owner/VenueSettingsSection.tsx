"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/useToast";
import { Home } from "lucide-react";

export function VenueSettingsSection({ user, roleContext, isMobile }: any) {
  const toast = useToast();
  const [venueSettings, setVenueSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load venue settings on mount
  useEffect(() => {
    const loadVenueSettings = async () => {
      if (!user?.id) return;
      
      try {
        // Simulate loading venue settings
        setVenueSettings({
          defaultSettings: {
            autoApproveBookings: false,
            requireDeposit: true,
            defaultDepositPercentage: 25,
            cancellationPolicy: 'moderate',
            leadTimeRequired: 48,
            maxAdvanceBooking: 365,
            instantBookingEnabled: false,
            weekendPricing: true,
            seasonalPricing: false
          },
          availabilitySettings: {
            defaultAvailability: {
              monday: { available: true, hours: { start: '09:00', end: '22:00' } },
              tuesday: { available: true, hours: { start: '09:00', end: '22:00' } },
              wednesday: { available: true, hours: { start: '09:00', end: '22:00' } },
              thursday: { available: true, hours: { start: '09:00', end: '22:00' } },
              friday: { available: true, hours: { start: '09:00', end: '23:00' } },
              saturday: { available: true, hours: { start: '10:00', end: '23:00' } },
              sunday: { available: false, hours: { start: '10:00', end: '20:00' } }
            },
            blockoutDates: [],
            minimumBookingDuration: 2,
            maximumBookingDuration: 12,
            bufferTime: 30
          },
          communicationSettings: {
            autoResponseEnabled: true,
            autoResponseMessage: 'Thank you for your booking inquiry! We\'ll get back to you within 24 hours.',
            bookingConfirmationTemplate: '',
            reminderSettings: {
              enabled: true,
              daysBefore: [7, 1],
              includeDirections: true,
              includeContactInfo: true
            }
          },
          reviewSettings: {
            enableReviews: true,
            requireApproval: false,
            respondToReviews: true,
            emailOnNewReview: true,
            showOwnerResponse: true
          },
          venues: [
            {
              id: 'v1',
              name: 'Grand Event Hall',
              status: 'active',
              bookingsThisMonth: 12,
              revenue: 15000,
              rating: 4.8,
              reviewCount: 45
            },
            {
              id: 'v2', 
              name: 'Intimate Garden Space',
              status: 'active',
              bookingsThisMonth: 8,
              revenue: 6800,
              rating: 4.9,
              reviewCount: 23
            }
          ]
        });
      } catch (error) {
        console.error('Error loading venue settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadVenueSettings();
  }, [user]);

  const updateVenueSetting = async (category: string, key: string, value: any) => {
    setIsSaving(true);
    try {
      const updated = {
        ...venueSettings,
        [category]: {
          ...venueSettings[category],
          [key]: value
        }
      };
      setVenueSettings(updated);
      toast.showSuccess('Settings Updated', 'Venue settings updated successfully');
    } catch (error) {
      toast.showError('Update Failed', 'Failed to update venue settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateAvailabilityDay = async (day: string, updates: any) => {
    setIsSaving(true);
    try {
      const updated = {
        ...venueSettings,
        availabilitySettings: {
          ...venueSettings.availabilitySettings,
          defaultAvailability: {
            ...venueSettings.availabilitySettings.defaultAvailability,
            [day]: {
              ...venueSettings.availabilitySettings.defaultAvailability[day],
              ...updates
            }
          }
        }
      };
      setVenueSettings(updated);
    } catch (error) {
      toast.showError('Update Failed', 'Failed to update availability');
    } finally {
      setIsSaving(false);
    }
  };

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      disabled={isSaving}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
        checked ? 'bg-primary' : 'bg-gray-200'
      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Venue Settings</h2>
        <p className="text-gray-600">Advanced venue settings are coming soon!</p>
      </div>
      
      {/* Friendly Coming Soon Message */}
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
            <Home className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            Advanced Venue Settings Coming Soon!
          </h3>
          <p className="text-gray-600 mb-6 leading-relaxed">
            We're working on powerful venue management tools that will let you configure booking rules, 
            availability schedules, pricing options, and much more right from this settings page.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 mb-2">
              <strong>In the meantime:</strong>
            </p>
            <p className="text-sm text-blue-700">
              You can manage your venues, bookings, and basic settings through the main dashboard. 
              All your current venue management tools are available there.
            </p>
          </div>
        </div>
      </div>
      
      {/* All venue settings options are hidden for MVP - just show the friendly message */}
    </div>
  );
}
