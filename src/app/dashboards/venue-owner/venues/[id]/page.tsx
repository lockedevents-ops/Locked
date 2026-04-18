"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { PageLoader } from '@/components/loaders/PageLoader';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Star, 
  Users, 
  Edit, 
  Clock, 
  ArrowLeft, 
  DollarSign,
  FileText,
  ImageIcon,
  Settings,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
} from 'lucide-react';
import { useToast } from '@/hooks/useToast';

// Tab type
type TabType = 'overview' | 'bookings' | 'availability' | 'gallery' | 'settings';

export default function ManageVenuePage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const [venue, setVenue] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmStatusChange, setConfirmStatusChange] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'active' | 'inactive' | null>(null);

  // Fetch venue data
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
            
            // Check for tab parameter in URL
            const searchParams = new URLSearchParams(window.location.search);
            const tabParam = searchParams.get('tab');
            if (tabParam && ['overview', 'bookings', 'availability', 'gallery', 'settings'].includes(tabParam as TabType)) {
              setActiveTab(tabParam as TabType);
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
  }, [params.id, router]);

  // Handle status change
  const handleStatusChange = (newStatus: 'active' | 'inactive') => {
    try {
      const storedVenues = localStorage.getItem('venues');
      if (storedVenues && venue) {
        const allVenues = JSON.parse(storedVenues);
        const updatedVenues = allVenues.map((v: any) => 
          v.id === venue.id ? {...v, status: newStatus} : v
        );
        
        localStorage.setItem('venues', JSON.stringify(updatedVenues));
        setVenue({...venue, status: newStatus});
        
        toast.showSuccess('Status Updated', `Venue ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
      }
    } catch (error) {
      console.error(`Error ${newStatus === 'active' ? 'activating' : 'deactivating'} venue:`, error);
      toast.showError('Status Update Failed', `Failed to ${newStatus === 'active' ? 'activate' : 'deactivate'} venue`);
    }
  };

  // Handle venue deletion
  const handleDeleteVenue = () => {
    try {
      const storedVenues = localStorage.getItem('venues');
      if (storedVenues && venue) {
        const allVenues = JSON.parse(storedVenues);
        const updatedVenues = allVenues.filter((v: any) => v.id !== venue.id);
        
        localStorage.setItem('venues', JSON.stringify(updatedVenues));
        toast.showSuccess('Venue Deleted', 'Venue deleted successfully');
        router.push('/venue-owner/pages/venues');
      }
    } catch (error) {
      console.error("Error deleting venue:", error);
      toast.showError('Deletion Failed', 'Failed to delete venue');
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading venue details..." fullHeight />;
  }

  if (!venue) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Venue Not Found</h1>
        <p className="text-neutral-600 mb-6">The venue you're looking for doesn't exist or has been removed</p>
        <Link 
          href="/venue-owner/pages/venues" 
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Venues
        </Link>
      </div>
    );
  }

  // Mock booking data for the venue
  const recentBookings = [
    {
      id: 1,
      eventName: "Corporate Workshop",
      organizer: "Tech Solutions Inc.",
      date: "August 15, 2025",
      attendees: 45,
      status: "confirmed",
      revenue: 3500
    },
    {
      id: 2,
      eventName: "Annual Meeting",
      organizer: "Finance Group",
      date: "September 3, 2025",
      attendees: 120,
      status: "pending",
      revenue: 7000
    },
    {
      id: 3,
      eventName: "Product Launch",
      organizer: "Startup Innovations",
      date: "September 10, 2025",
      attendees: 75,
      status: "confirmed",
      revenue: 5200
    }
  ];

  return (
    <div className="space-y-6">
      {/* Back Button and Venue Name */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link
            href="/venue-owner/pages/venues"
            className="text-neutral-500 hover:text-neutral-700 inline-flex items-center text-sm w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to All Venues
          </Link>
          <h1 className="text-2xl font-bold">{venue.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            venue.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-neutral-100 text-neutral-800'
          }`}>
            {venue.status === 'active' ? 'Active' : 'Inactive'}
          </span>
          <Link
            href={`/venue-owner/pages/venues/${venue.id}/edit`}
            className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Venue</span>
          </Link>
        </div>
      </div>

      {/* Venue Header with Image */}
      <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
        <div className="relative h-48 md:h-64 bg-neutral-100">
          {venue.featuredImagePreview ? (
            <Image
              src={venue.featuredImagePreview}
              alt={venue.name}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 1200px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
              <Building2 className="w-12 h-12 text-primary" />
            </div>
          )}
        </div>
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-neutral-500" />
                <span>{venue.location}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Users className="w-4 h-4 text-neutral-500" />
                <span>Capacity: {venue.capacity || "Not specified"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              {venue.status === 'active' ? (
                <button 
                  onClick={() => {
                    setPendingStatus('inactive');
                    setConfirmStatusChange(true);
                  }}
                  className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-100 transition-colors text-center cursor-pointer flex items-center"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Deactivate Venue
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setPendingStatus('active');
                    setConfirmStatusChange(true);
                  }}
                  className="bg-green-50 border border-green-200 text-green-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-green-100 transition-colors text-center cursor-pointer flex items-center"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Activate Venue
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Venue Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium text-sm">Total Bookings</p>
              <p className="text-xl font-bold">{venue.bookingsThisMonth || 0}</p>
            </div>
            <div className="p-2 bg-primary/10 text-primary rounded-full">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium text-sm">Avg Rating</p>
              <p className="text-xl font-bold flex items-center">
                {venue.avgRating || 0}
                <Star className="w-4 h-4 text-yellow-500 ml-1" />
              </p>
            </div>
            <div className="p-2 bg-yellow-100 text-yellow-700 rounded-full">
              <Star className="h-5 w-5" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium text-sm">Revenue</p>
              <p className="text-xl font-bold">₵{((venue.bookingsThisMonth || 0) * 1500).toLocaleString()}</p>
            </div>
            <div className="p-2 bg-blue-100 text-blue-700 rounded-full">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium text-sm">Availability</p>
              <p className="text-xl font-bold">65%</p>
            </div>
            <div className="p-2 bg-green-100 text-green-700 rounded-full">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-neutral-200">
        <nav className="flex overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 ${
              activeTab === 'overview' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-neutral-600 hover:text-neutral-800'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 ${
              activeTab === 'bookings' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-neutral-600 hover:text-neutral-800'
            }`}
          >
            Bookings
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 ${
              activeTab === 'availability' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-neutral-600 hover:text-neutral-800'
            }`}
          >
            Availability
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 ${
              activeTab === 'gallery' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-neutral-600 hover:text-neutral-800'
            }`}
          >
            Gallery
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 ${
              activeTab === 'settings' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-neutral-600 hover:text-neutral-800'
            }`}
          >
            Settings
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <h2 className="text-lg font-medium mb-4">Description</h2>
              <p className="text-neutral-700">
                {venue.description || 
                 "This venue currently has no detailed description. Edit the venue to add a description that highlights its features and amenities."}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-neutral-200 p-6">
                <h2 className="text-lg font-medium mb-4">Details</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Capacity</p>
                    <p>{venue.capacity || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Venue Type</p>
                    <p>{venue.venueType || "General"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Added On</p>
                    <p>{new Date(venue.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-neutral-200 p-6">
                <h2 className="text-lg font-medium mb-4">Quick Links</h2>
                <div className="space-y-4">
                  <Link
                    href={`/venue-owner/pages/venues/${venue.id}/edit`}
                    className="flex items-center gap-2 text-neutral-800 hover:text-primary"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit Venue Details</span>
                  </Link>
                  <Link
                    href={`/venue-owner/pages/venues/${venue.id}/bookings`}
                    className="flex items-center gap-2 text-neutral-800 hover:text-primary"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Manage Bookings</span>
                  </Link>
                  <Link
                    href={`/venue/${venue.id}`}
                    className="flex items-center gap-2 text-neutral-800 hover:text-primary"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Public Listing</span>
                  </Link>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium">Recent Bookings</h2>
                <Link 
                  href={`/venue-owner/pages/venues/${venue.id}/bookings`} 
                  className="text-primary hover:text-primary-dark text-sm font-medium"
                >
                  View All
                </Link>
              </div>
              
              {/* Recent Bookings Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200">
                  <thead>
                    <tr className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Attendees</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {recentBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-neutral-900">
                              {booking.eventName}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {booking.organizer}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">
                          {booking.date}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            booking.status === 'confirmed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {booking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">
                          {booking.attendees}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900 text-right">
                          ₵{booking.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {recentBookings.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-10 w-10 text-neutral-300 mb-2" />
                  <h3 className="text-base font-medium text-neutral-900">No Bookings Yet</h3>
                  <p className="text-sm text-neutral-500 mt-1">
                    This venue hasn't received any bookings yet
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">All Bookings</h2>
              <div className="flex items-center gap-2">
                <select className="border border-neutral-300 rounded-md text-sm p-2">
                  <option value="all">All Statuses</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select className="border border-neutral-300 rounded-md text-sm p-2">
                  <option value="recent">Most Recent</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                </select>
              </div>
            </div>
            
            {/* Bookings Table - same as in overview but with more entries */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead>
                  <tr className="text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Attendees</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {/* Reuse the same booking data but imagine more entries */}
                  {recentBookings.concat(recentBookings).map((booking, index) => (
                    <tr key={`${booking.id}-${index}`} className="hover:bg-neutral-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-neutral-900">
                            {booking.eventName}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {booking.organizer}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">
                        {booking.date}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          booking.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-500">
                        {booking.attendees}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-900 text-right">
                        ₵{booking.revenue.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                        <Link 
                          href={`/venue-owner/bookings/${booking.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-neutral-500">
                Showing <span className="font-medium">1</span> to <span className="font-medium">6</span> of <span className="font-medium">12</span> results
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 border border-neutral-300 rounded-md text-sm hover:bg-neutral-50">
                  Previous
                </button>
                <button className="px-3 py-1 border border-neutral-300 rounded-md text-sm hover:bg-neutral-50">
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Availability Tab */}
        {activeTab === 'availability' && (
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <h2 className="text-lg font-medium mb-4">Manage Availability</h2>
            
            <div className="mb-6">
              <p className="text-neutral-600 mb-4">
                Set the days and times when your venue is available for booking. Unavailable times will not be shown to potential customers.
              </p>
              
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <div>
                  <h3 className="font-medium">Operating Hours</h3>
                  <p className="text-sm text-neutral-600">Set your regular venue hours</p>
                </div>
                <Link
                  href={`/venue-owner/pages/venues/${venue.id}/hours`}
                  className="bg-white border border-neutral-300 text-neutral-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors"
                >
                  Edit Hours
                </Link>
              </div>
            </div>
            
            <div className="mt-8">
              <h3 className="font-medium mb-4">Blocked Dates</h3>
              
              <div className="border border-neutral-200 rounded-lg p-4 mb-4">
                <p className="text-neutral-600 mb-4">
                  Mark specific dates as unavailable for booking
                </p>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">3 dates blocked</p>
                    <p className="text-sm text-neutral-500">Next: August 15, 2025</p>
                  </div>
                  <button className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors">
                    Manage Blocked Dates
                  </button>
                </div>
              </div>
              
              <div className="mt-6">
                <p className="text-sm text-neutral-600">
                  Note: Bookings already confirmed will not be affected by availability changes
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Gallery Tab */}
        {activeTab === 'gallery' && (
          <div className="bg-white rounded-lg border border-neutral-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">Venue Gallery</h2>
              <button className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-1">
                <ImageIcon className="w-4 h-4" />
                <span>Add Photos</span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Placeholder for gallery images */}
              {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                <div key={item} className="aspect-square bg-neutral-100 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-neutral-300" />
                </div>
              ))}
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-neutral-600">
                Add high-quality photos of your venue to attract more bookings
              </p>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-neutral-200 p-6">
              <h2 className="text-lg font-medium mb-4">General Settings</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div>
                    <h3 className="font-medium">Booking Settings</h3>
                    <p className="text-sm text-neutral-600">Configure how users can book your venue</p>
                  </div>
                  <Link
                    href={`/venue-owner/pages/venues/${venue.id}/booking-settings`}
                    className="bg-white border border-neutral-300 text-neutral-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors"
                  >
                    Configure
                  </Link>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div>
                    <h3 className="font-medium">Pricing</h3>
                    <p className="text-sm text-neutral-600">Set pricing details for your venue</p>
                  </div>
                  <Link
                    href={`/venue-owner/pages/venues/${venue.id}/pricing`}
                    className="bg-white border border-neutral-300 text-neutral-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors"
                  >
                    Manage Pricing
                  </Link>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  <div>
                    <h3 className="font-medium">Rules & Requirements</h3>
                    <p className="text-sm text-neutral-600">Set policies for venue usage</p>
                  </div>
                  <Link
                    href={`/venue-owner/pages/venues/${venue.id}/rules`}
                    className="bg-white border border-neutral-300 text-neutral-800 px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors"
                  >
                    Edit Rules
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Danger Zone */}
            <div className="bg-white rounded-lg border border-red-200 p-6">
              <h2 className="text-lg font-medium mb-4 text-red-600">Danger Zone</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <h3 className="font-medium">Delete Venue</h3>
                    <p className="text-sm text-neutral-600">Permanently remove this venue from the platform</p>
                  </div>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="bg-white border border-red-300 text-red-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    Delete Venue
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Delete Venue</h3>
            <p className="text-neutral-600 mb-6">
              Are you sure you want to delete this venue? This action cannot be undone, and all associated data will be permanently removed.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteVenue}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors cursor-pointer"
              >
                Delete Venue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation Modal */}
      {confirmStatusChange && pendingStatus && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4">
              {pendingStatus === 'active' ? 'Activate Venue' : 'Deactivate Venue'}
            </h3>
            <p className="text-neutral-600 mb-6">
              {pendingStatus === 'active' 
                ? 'Are you sure you want to activate this venue? It will become visible to all users and available for booking.'
                : 'Are you sure you want to deactivate this venue? It will no longer be visible to users and cannot be booked.'
              }
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setConfirmStatusChange(false);
                  setPendingStatus(null);
                }}
                className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleStatusChange(pendingStatus);
                  setConfirmStatusChange(false);
                  setPendingStatus(null);
                }}
                className={`px-4 py-2 text-white rounded-md transition-colors cursor-pointer ${
                  pendingStatus === 'active' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {pendingStatus === 'active' ? 'Activate' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}