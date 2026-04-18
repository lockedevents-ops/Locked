"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import RequestRoleForm from '@/components/RequestRoleForm';
import Link from 'next/link';
import { PageLoader } from '@/components/loaders/PageLoader';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { 
  Building2, 
  Calendar,
  DollarSign, 
  Users,
  MapPin,
  Star,
  PlusCircle,
  Lock
} from 'lucide-react';
import { venueAnalyticsService, VenueAnalytics } from '@/services/analyticsService';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function VenueOwnerDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, rolesLoading, hasRole } = useAuth();
  const hasRequiredRole = hasRole('venue_owner');
  const loading = authLoading || rolesLoading;
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [analytics, setAnalytics] = useState<VenueAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Load analytics data when user has required role
  useEffect(() => {
    if (hasRequiredRole && user?.id) {
      setAnalyticsLoading(true);
      venueAnalyticsService.getVenueAnalytics(user.id)
        .then(data => {
          setAnalytics(data);
        })
        .catch(error => {
          console.error('Failed to load analytics:', error);
          setAnalytics({
            totalVenues: 0,
            totalBookings: 0,
            totalRevenue: 0,
            avgOccupancyRate: 0,
            venues: [],
            recentBookings: [],
            bookingsByVenue: [],
            loading: false,
            error: 'Failed to load analytics'
          });
        })
        .finally(() => {
          setAnalyticsLoading(false);
        });
    }
  }, [hasRequiredRole, user?.id]);
  
  if (loading || analyticsLoading) {
    return <PageLoader message="Loading venue owner dashboard..." fullHeight />;
  }
  
  // If user wants to see the request form
  if (showRequestForm && !hasRequiredRole) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <RequestRoleForm 
          role="VenueOwner"
          onRequestSubmitted={() => {
            router.refresh();
          }}
        />
      </div>
    );
  }
  
  // Get analytics data or use defaults
  const myVenues = analytics?.venues || [];
  const recentBookings = analytics?.recentBookings || [];
  const totalVenues = analytics?.totalVenues || 0;
  const totalBookings = analytics?.totalBookings || 0;
  const totalRevenue = analytics?.totalRevenue || 0;
  const avgOccupancyRate = analytics?.avgOccupancyRate || 0;
  
  // If user doesn't have access, show restricted view 
  if (!hasRequiredRole) {
    return (
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 sm:p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="bg-amber-100 p-2 rounded-full shrink-0">
                <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-amber-800 text-sm sm:text-base">Venue Owner Access Required</h2>
                <p className="text-amber-700 text-xs sm:text-sm mt-1">
                  You need the Venue Owner role to access this dashboard.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowRequestForm(true)}
              className="w-full sm:w-auto shrink-0 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
            >
              Request Access
            </button>
          </div>
        </div>
        
        {/* Show a preview of what's available with the Venue Owner role */}
        <div className="opacity-60 pointer-events-none">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Venue Owner Dashboard</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-500 font-medium">Total Venues</p>
                  <p className="text-2xl font-bold">--</p>
                </div>
                <div className="p-3 bg-primary/10 text-primary rounded-full">
                  <Building2 className="h-6 w-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-500 font-medium">Confirmed Bookings</p>
                  <p className="text-2xl font-bold">--</p>
                </div>
                <div className="p-3 bg-green-100 text-green-700 rounded-full">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-500 font-medium">Total Revenue</p>
                  <p className="text-2xl font-bold">₵--</p>
                </div>
                <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-500 font-medium">Avg. Occupancy Rate</p>
                  <p className="text-2xl font-bold">--%</p>
                </div>
                <div className="p-3 bg-yellow-100 text-yellow-700 rounded-full">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-lg text-center">
            <h2 className="text-xl font-bold mb-2">Request Venue Owner Access</h2>
            <p className="text-gray-500 mb-4">
              List and manage your venues on our platform by becoming an approved venue owner.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Chart data for bookings by venue
  const chartData = {
    labels: analytics?.bookingsByVenue.map(item => item.name) || [],
    datasets: [
      {
        label: 'Bookings This Month',
        data: analytics?.bookingsByVenue.map(item => item.bookings) || [],
        backgroundColor: 'rgba(37, 99, 235, 0.6)',
        borderColor: 'rgba(37, 99, 235, 1)',
        borderWidth: 1,
      }
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Bookings'
        }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Venue Owner</h1>
        <Link
          href="/dashboards/venue-owner/venues/add"
          className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors flex items-center gap-1"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New Venue</span>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="/dashboards/venue-owner/venues" className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100 hover:shadow-md transition-shadow cursor-pointer block">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium">Total Venues</p>
              <p className="text-2xl font-bold">{totalVenues}</p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-full">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
        </Link>
        
        <Link href="/dashboards/venue-owner/bookings" className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100 hover:shadow-md transition-shadow cursor-pointer block">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium">Confirmed Bookings</p>
              <p className="text-2xl font-bold">{totalBookings}</p>
            </div>
            <div className="p-3 bg-green-100 text-green-700 rounded-full">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </Link>
        
        <Link href="/dashboards/venue-owner/bookings" className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100 hover:shadow-md transition-shadow cursor-pointer block">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold">₵{totalRevenue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </Link>
        
        <Link href="/dashboards/venue-owner/venues" className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100 hover:shadow-md transition-shadow cursor-pointer block">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium">Avg. Occupancy Rate</p>
              <p className="text-2xl font-bold">{avgOccupancyRate}%</p>
            </div>
            <div className="p-3 bg-yellow-100 text-yellow-700 rounded-full">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </Link>
      </div>

      {/* Bookings by Venue Chart */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
        <h2 className="text-xl font-bold mb-4">Bookings by Venue</h2>
        <div className="h-64">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </section>

      {/* My Venues */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">My Venues</h2>
          <Link href="/venue-owner/pages/venues" className="text-primary hover:text-primary-dark text-sm font-medium">
            View All
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myVenues.map((venue) => (
            <div key={venue.id} className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-100 flex flex-col md:flex-row">
              <div className="relative h-48 md:h-auto md:w-1/3">
                <div className="absolute inset-0 bg-neutral-200 flex items-center justify-center">
                  <span className="text-neutral-400">Venue Image</span>
                </div>
              </div>
              <div className="p-4 md:p-6 flex-1">
                <h3 className="font-bold text-lg mb-1">{venue.name}</h3>
                <div className="text-neutral-500 text-sm space-y-1 mb-3">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{venue.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span>{venue.avgRating} rating</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-neutral-50 p-2 rounded-md">
                    <p className="text-xs text-neutral-500">Bookings (Month)</p>
                    <p className="font-semibold">{venue.bookingsThisMonth}</p>
                  </div>
                  <div className="bg-neutral-50 p-2 rounded-md">
                    <p className="text-xs text-neutral-500">Availability</p>
                    <p className="font-semibold">{venue.availability}%</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <Link
                    href={`/venue-owner/pages/venues/${venue.id}/analytics`}
                    className="text-primary font-medium text-sm hover:underline"
                  >
                    View Analytics
                  </Link>
                  <Link
                    href={`/venue-owner/pages/venues/${venue.id}`}
                    className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Bookings */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recent Bookings</h2>
          <Link href="/venue-owner/bookings" className="text-primary hover:text-primary-dark text-sm font-medium">
            View All
          </Link>
        </div>
        
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-neutral-100">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Event</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Venue</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Revenue</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {recentBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-neutral-900">{booking.eventName}</div>
                        <div className="text-xs text-neutral-500">{booking.organizer}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {booking.venue}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {booking.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        booking.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                      ₵{booking.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link 
                        href={`/venue-owner/bookings/${booking.id}`}
                        className="text-primary hover:text-primary-dark font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}