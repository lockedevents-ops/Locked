"use client";

import React from 'react';
import { cn } from "@/lib/utils";

interface VenueBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: {
    name: string;
    pricing: {
      basePrice: number;
      currency: string;
    };
  };
}

export function VenueBookingModal({ isOpen, onClose, venue }: VenueBookingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Book {venue.name}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Event Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="eventType" className="block text-sm font-medium text-gray-700">
                  Event Type
                </label>
                <select
                  id="eventType"
                  className="w-full p-2 border border-gray-200 rounded-md"
                >
                  <option value="">Select event type</option>
                  <option value="wedding">Wedding</option>
                  <option value="conference">Conference</option>
                  <option value="corporate">Corporate Event</option>
                  <option value="birthday">Birthday Party</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="attendees" className="block text-sm font-medium text-gray-700">
                  Expected Attendees
                </label>
                <input
                  type="number"
                  id="attendees"
                  className="w-full p-2 border border-gray-200 rounded-md"
                  placeholder="Number of guests"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                  Event Date
                </label>
                <input
                  type="date"
                  id="date"
                  className="w-full p-2 border border-gray-200 rounded-md"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                  Start Time
                </label>
                <input
                  type="time"
                  id="time"
                  className="w-full p-2 border border-gray-200 rounded-md"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                  Duration (hours)
                </label>
                <input
                  type="number"
                  id="duration"
                  className="w-full p-2 border border-gray-200 rounded-md"
                  placeholder="Event duration"
                  min="1"
                  max="24"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Additional Services</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="catering" className="w-4 h-4 rounded" />
                <label htmlFor="catering" className="text-sm">Catering Service</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="setup" className="w-4 h-4 rounded" />
                <label htmlFor="setup" className="text-sm">Setup & Decoration</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="equipment" className="w-4 h-4 rounded" />
                <label htmlFor="equipment" className="text-sm">Audio/Visual Equipment</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="security" className="w-4 h-4 rounded" />
                <label htmlFor="security" className="text-sm">Security Service</label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Pricing</h3>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Base Price (per hour)</span>
                <span>{venue.pricing.currency} {venue.pricing.basePrice}</span>
              </div>
              <div className="border-t border-gray-200 my-2"></div>
              <div className="flex justify-between font-semibold">
                <span>Total Estimate</span>
                <span>{venue.pricing.currency} {venue.pricing.basePrice}</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                * Final price may vary based on additional services and specific requirements
              </p>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            Request Booking
          </button>
        </div>
      </div>
    </div>
  );
}

function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
