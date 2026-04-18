"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  User, 
  Building2, 
  DollarSign, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  Mail,
  Phone,
  FileText,
  Printer,
  Download,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { PageLoader } from '@/components/loaders/PageLoader';

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Mock booking data - in a real app, this would be fetched from an API
  useEffect(() => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      // Get a valid venue ID from localStorage if available
      let validVenueId = 1;
      let venueName = "Golden Tulip Conference Center";
      
      try {
        const storedVenues = localStorage.getItem('venues');
        if (storedVenues) {
          const parsedVenues = JSON.parse(storedVenues);
          if (parsedVenues.length > 0) {
            // Use the first venue's ID to ensure it exists
            validVenueId = parsedVenues[0].id;
            venueName = parsedVenues[0].name || venueName;
          }
        }
      } catch (error) {
        console.error("Error accessing localStorage:", error);
      }
      
      // Generate mock data based on the ID
      const bookingId = Number(params.id);
      
      const mockBooking = {
        id: bookingId,
        eventName: bookingId % 3 === 0 ? "Corporate Workshop" : 
                  bookingId % 3 === 1 ? "Annual Meeting" : "Product Launch",
        organizer: bookingId % 3 === 0 ? "Tech Solutions Inc." : 
                  bookingId % 3 === 1 ? "Finance Group" : "Startup Innovations",
        organizerEmail: "organizer@example.com",
        organizerPhone: "+233 20 123 4567",
        venueId: validVenueId,  // Use the valid venue ID
        venueName: venueName,   // Use the actual venue name
        venueLocation: "Accra, Ghana",
        date: bookingId % 3 === 0 ? "August 15, 2025" : 
              bookingId % 3 === 1 ? "September 3, 2025" : "September 10, 2025",
        startTime: "10:00 AM",
        endTime: "4:00 PM",
        duration: "6 hours",
        status: bookingId % 2 === 0 ? "confirmed" : "pending",
        attendees: bookingId % 3 === 0 ? 45 : bookingId % 3 === 1 ? 120 : 75,
        revenue: bookingId % 3 === 0 ? 3500 : bookingId % 3 === 1 ? 7000 : 5200,
        bookingDate: "July 12, 2025",
        specialRequirements: "Requires AV setup, catering for lunch, classroom-style seating",
        notes: "Client is a returning customer. They've used our venue twice before with positive feedback.",
        paymentStatus: "paid",
        paymentMethod: "Bank Transfer",
        invoiceNumber: `INV-2025-${bookingId.toString().padStart(4, '0')}`,
        roomSetup: "Classroom",
        amenitiesRequested: ["Projector", "Sound System", "Whiteboard", "WiFi", "Catering"]
      };
      
      setBooking(mockBooking);
      setIsLoading(false);
    }, 1000);
  }, [params.id]);
  
  if (isLoading) {
    return <PageLoader message="Loading booking details..." fullHeight />;
  }
  
  if (!booking) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="mx-auto h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Booking Not Found</h1>
        <p className="text-neutral-600 mb-6">The booking you're looking for doesn't exist or has been removed</p>
        <Link 
          href="/venue-owner/bookings" 
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Bookings
        </Link>
      </div>
    );
  }
  
  // Define the status color based on booking status
  const statusColor = booking.status === 'confirmed' 
    ? 'bg-green-100 text-green-800 border-green-200' 
    : booking.status === 'pending' 
    ? 'bg-yellow-100 text-yellow-800 border-yellow-200' 
    : 'bg-red-100 text-red-800 border-red-200';

  return (
    <div className="space-y-6">
      {/* Back Button and Booking Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link
            href={`/venue-owner/pages/venues/${booking.venueId}?tab=bookings`}
            className="text-neutral-500 hover:text-neutral-700 inline-flex items-center text-sm w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Venue Bookings
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {booking.eventName}
            <span className={`text-xs px-2.5 py-1 rounded-full ${statusColor}`}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
          </h1>
          <p className="text-neutral-500">Booking #{params.id}</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => toast.showInfo('Print', 'Printing functionality would be implemented here')}
            className="px-4 py-2 bg-white border border-neutral-300 rounded-md text-sm text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          
          <button
            onClick={() => toast.showInfo('Download', 'Download functionality would be implemented here')}
            className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-dark transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Download Details
          </button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column - Booking Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Overview Card */}
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium mb-4">Booking Overview</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-neutral-500">Date</p>
                    <p className="font-medium">{booking.date}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-neutral-500">Time</p>
                    <p className="font-medium">{booking.startTime} - {booking.endTime}</p>
                    <p className="text-sm text-neutral-500">Duration: {booking.duration}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Building2 className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-neutral-500">Venue</p>
                    <p className="font-medium">{booking.venueName}</p>
                    <p className="text-sm text-neutral-500">{booking.venueLocation}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-neutral-500">Attendees</p>
                    <p className="font-medium">{booking.attendees} expected</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-neutral-500">Organizer</p>
                    <p className="font-medium">{booking.organizer}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-neutral-500">Revenue</p>
                    <p className="font-medium">₵{booking.revenue.toLocaleString()}</p>
                    <p className={`text-xs px-2 py-0.5 rounded-full inline-block ${booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Additional Details Card */}
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium mb-4">Event Requirements & Setup</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 mb-2">Room Setup</h3>
                  <p>{booking.roomSetup}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 mb-2">Amenities Requested</h3>
                  <div className="flex flex-wrap gap-2">
                    {booking.amenitiesRequested.map((amenity: string, index: number) => (
                      <span 
                        key={index} 
                        className="bg-neutral-100 text-neutral-700 rounded-full px-3 py-1 text-xs"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-neutral-700 mb-2">Special Requirements</h3>
                  <p className="text-neutral-700">{booking.specialRequirements}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Notes Card */}
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium mb-4">Internal Notes</h2>
              <p className="text-neutral-700">{booking.notes || "No notes available for this booking."}</p>
              
              {/* Add Note Form */}
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Add a Note
                </label>
                <div className="flex gap-2">
                  <textarea 
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md"
                    rows={2}
                    placeholder="Add internal notes about this booking..."
                  ></textarea>
                  <button
                    onClick={() => toast.showInfo('Note Saved', 'Note saving functionality would be implemented here')}
                    className="px-3 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark transition-colors self-start"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Actions and Contact Info */}
        <div className="space-y-6">
          {/* Action Card */}
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium mb-4">Booking Actions</h2>
              
              <div className="space-y-3">
                {booking.status === 'pending' && (
                  <>
                    <button
                      onClick={() => toast.showSuccess('Booking Confirmed', 'Booking would be confirmed here')}
                      className="w-full px-4 py-2.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Confirm Booking
                    </button>
                    
                    <button
                      onClick={() => toast.showError('Booking Declined', 'Booking would be declined here')}
                      className="w-full px-4 py-2.5 bg-white border border-red-300 text-red-600 rounded-md text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Decline Booking
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => toast.showInfo('Modify Booking', 'Modification would be initiated here')}
                  className="w-full px-4 py-2.5 bg-white border border-neutral-300 text-neutral-700 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors"
                >
                  Modify Booking
                </button>
                
                <button
                  onClick={() => toast.showInfo('Email Sent', 'Email would be sent here')}
                  className="w-full px-4 py-2.5 bg-white border border-neutral-300 text-neutral-700 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Email Client
                </button>
              </div>
            </div>
          </div>
          
          {/* Contact Card */}
          <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium mb-4">Contact Information</h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-neutral-500">Organizer</p>
                    <p className="font-medium">{booking.organizer}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-neutral-500">Email</p>
                    <a href={`mailto:${booking.organizerEmail}`} className="font-medium text-primary hover:underline">
                      {booking.organizerEmail}
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-neutral-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-neutral-500">Phone</p>
                    <a href={`tel:${booking.organizerPhone}`} className="font-medium">
                      {booking.organizerPhone}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
                {/* Payment Info Card */}
                <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
                  <div className="p-6">
                    {/* Payment info content goes here */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }