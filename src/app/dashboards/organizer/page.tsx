"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import RequestRoleForm from '@/components/RequestRoleForm';
import { PageLoader } from '@/components/loaders/PageLoader';
import Link from 'next/link';
import { 
  BarChart3, 
  Calendar, 
  Clock, 
  DollarSign,
  PlusCircle,
  Tag,
  Ticket,
  Users,
  Lock,
  MapPin as Location
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { organizerAnalyticsService, OrganizerAnalytics } from '@/services/analyticsService';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function OrganizerDashboardPage() {
  // ✅ SESSION MANAGEMENT: Prevent session expiration on organizer dashboard
  useSessionManagement();

  const router = useRouter();
  const { user, loading: authLoading, rolesLoading, hasRole } = useAuth();
  const hasRequiredRole = hasRole('organizer');
  const loading = authLoading || rolesLoading;
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [analytics, setAnalytics] = useState<OrganizerAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true); // Start as true to show skeleton immediately
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [roleLoadingTimedOut, setRoleLoadingTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setRoleLoadingTimedOut(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setRoleLoadingTimedOut(true);
    }, 8000);

    return () => clearTimeout(timeoutId);
  }, [loading]);

  // Load analytics data when user has required role - with caching
  useEffect(() => {
    if (!hasRequiredRole || !user?.id) return;

    const cached = organizerAnalyticsService.getCachedAnalytics(user.id);
    if (cached) {
      setAnalytics(prev => prev ?? cached);
      setAnalyticsLoading(false);
    }

    if (!hasFetchedOnce) {
      setAnalyticsLoading(!cached);
      organizerAnalyticsService.getOrganizerAnalytics(user.id)
        .then(data => {
          setAnalytics(data);
          setHasFetchedOnce(true);
        })
        .catch(error => {
          console.error('❌ Failed to load analytics:', error);
          setAnalytics({
            totalEvents: 0,
            totalTicketsSold: 0,
            totalRevenue: 0,
            followerCount: 0,
            upcomingEvents: [],
            pastEvents: [],
            monthlyTicketSales: Array(12).fill(0),
            revenueByMonth: Array(12).fill(0),
            loading: false,
            error: 'Failed to load analytics'
          });
          setHasFetchedOnce(true);
        })
        .finally(() => {
          setAnalyticsLoading(false);
        });
    } else {
      setAnalyticsLoading(false);
    }
  }, [hasRequiredRole, user?.id, hasFetchedOnce]);
  
  // ✅ OPTIMIZATION: Memoize chart data to prevent recreation on every render
  const chartData = useMemo(() => ({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Ticket Sales',
        data: analytics?.monthlyTicketSales || Array(12).fill(0),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  }), [analytics?.monthlyTicketSales]);

  // ✅ OPTIMIZATION: Memoize chart options (static configuration)
  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Monthly Ticket Sales',
      },
    },
  }), []);
  
  // ✅ OPTIMIZATION: Memoize analytics values to prevent recalculation
  const upcomingEvents = useMemo(() => analytics?.upcomingEvents || [], [analytics?.upcomingEvents]);
  const pastEvents = useMemo(() => analytics?.pastEvents || [], [analytics?.pastEvents]);
  const totalTicketsSold = useMemo(() => analytics?.totalTicketsSold || 0, [analytics?.totalTicketsSold]);
  const totalRevenue = useMemo(() => analytics?.totalRevenue || 0, [analytics?.totalRevenue]);
  const totalEvents = useMemo(() => analytics?.totalEvents || 0, [analytics?.totalEvents]);
  const followerCount = useMemo(() => analytics?.followerCount || 0, [analytics?.followerCount]);
  
  // ✅ OPTIMIZATION: Memoize handler with useCallback
  const handleRequestAccess = useCallback(() => {
    setShowRequestForm(true);
  }, []);
  
  // Show loading skeleton only on initial page load
  if (loading) {
    if (roleLoadingTimedOut) {
      return (
        <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-neutral-900 mb-2">Organizer Dashboard Is Taking Too Long</h2>
          <p className="text-neutral-600 mb-5">
            Role verification is slower than expected. Refresh the page to try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors cursor-pointer"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return (
      <PageLoader message="Loading organizer dashboard..." fullHeight />
    );
  }
  
  // If user wants to see the request form
  if (showRequestForm && !hasRequiredRole) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <RequestRoleForm 
          role="Organizer"
          onRequestSubmitted={() => {
            router.refresh();
          }}
        />
      </div>
    );
  }

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
                <h2 className="font-bold text-amber-800 text-sm sm:text-base">Organizer Access Required</h2>
                <p className="text-amber-700 text-xs sm:text-sm mt-1">
                  You need the Organizer role to access this dashboard.
                </p>
              </div>
            </div>
            <button 
              onClick={handleRequestAccess}
              className="w-full sm:w-auto shrink-0 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
            >
              Request Access
            </button>
          </div>
        </div>
        
        {/* Show a preview of what's available with the Organizer role */}
        <div className="opacity-60 pointer-events-none">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Organizer Dashboard</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-500 font-medium">Total Events</p>
                  <p className="text-2xl font-bold">--</p>
                </div>
                <div className="p-3 bg-primary/10 text-primary rounded-full">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-500 font-medium">Tickets Sold</p>
                  <p className="text-2xl font-bold">--</p>
                </div>
                <div className="p-3 bg-success/10 text-success rounded-full">
                  <Ticket className="h-6 w-6" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-neutral-500 font-medium">Total Revenue</p>
                  <p className="text-2xl font-bold">--</p>
                </div>
                <div className="p-3 bg-amber-100 text-amber-700 rounded-full">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-lg text-center">
            <h2 className="text-xl font-bold mb-2">Request Organizer Access</h2>
            <p className="text-gray-500 mb-4">
              Create and manage events on our platform by becoming an approved organizer.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If user has required role, show the full dashboard
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Organizer Dashboard</h1>
        <Link
          href="/dashboards/organizer/create-event"
          className="bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create Event</span>
        </Link>
      </div>

      {/* Show skeleton loader while fetching analytics */}
      {analyticsLoading ? (
        <PageLoader message="Loading organizer analytics..." />
      ) : (
        <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboards/organizer/events" className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100 hover:shadow-md transition-shadow cursor-pointer block">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium">Total Events</p>
              <p className="text-2xl font-bold">{totalEvents}</p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-full">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </Link>
        
        <Link href="/dashboards/organizer/analytics" className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100 hover:shadow-md transition-shadow cursor-pointer block">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium">Tickets Sold</p>
              <p className="text-2xl font-bold">{totalTicketsSold}</p>
            </div>
            <div className="p-3 bg-success/10 text-success rounded-full">
              <Ticket className="h-6 w-6" />
            </div>
          </div>
        </Link>
        
        <Link href="/dashboards/organizer/finances" className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100 hover:shadow-md transition-shadow cursor-pointer block">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold">₵{totalRevenue.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-amber-100 text-amber-700 rounded-full">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </Link>
        
        <Link href="/dashboards/organizer/analytics" className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100 hover:shadow-md transition-shadow cursor-pointer block">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium">Followers</p>
              <p className="text-2xl font-bold">{followerCount}</p>
            </div>
            <div className="p-3 bg-blue-100 text-blue-700 rounded-full">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Sales Analytics */}
      <section className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
        <h2 className="text-xl font-bold mb-4">Ticket Sales Overview</h2>
        <div className="h-64">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </section>

      {/* Upcoming Events */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Upcoming Events</h2>
          <Link href="/dashboards/organizer/events" className="text-primary hover:text-primary-dark text-sm font-medium">
            View All
          </Link>
        </div>
        {upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingEvents.slice(0, 4).map((event) => (
              <div key={event.id} className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-100 flex flex-col md:flex-row">
                {event.imageUrl && (
                  <div className="relative h-48 md:h-auto md:w-1/3">
                    <Image
                      src={event.imageUrl}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-4 md:p-6 flex-1">
                  <h3 className="font-bold text-lg mb-1">{event.title}</h3>
                  <div className="text-neutral-500 text-sm space-y-1 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Location className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{event.ticketsSold} / {event.totalCapacity} tickets sold</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="w-full max-w-xs">
                      <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(event.ticketsSold / event.totalCapacity) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-neutral-500">
                        <span>{Math.round((event.ticketsSold / event.totalCapacity) * 100)}% sold</span>
                        <span>{event.totalCapacity - event.ticketsSold} remaining</span>
                      </div>
                    </div>
                    <Link
                      href={`/dashboards/organizer/events/${event.id}`}
                      className="ml-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-3 py-1 rounded text-sm font-medium transition-colors"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {upcomingEvents.length === 0 && (
          <div className="bg-white p-8 rounded-lg border border-neutral-100 text-center">
            <p className="text-neutral-500">No upcoming events. Start creating your first event!</p>
            <Link 
              href="/dashboards/organizer/create-event" 
              className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-md"
            >
              Create Event
            </Link>
          </div>
        )}
      </section>

      {/* Recent Events Performance */}
      {/* <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recent Events Performance</h2>
          <Link href="/organizer/analytics" className="text-primary hover:text-primary-dark text-sm font-medium">
            View All Analytics
          </Link>
        </div>
        {pastEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-100 flex flex-col md:flex-row">
                <div className="relative h-48 md:h-auto md:w-1/3">
                  <div className="absolute inset-0 bg-neutral-200 flex items-center justify-center">
                    <span className="text-neutral-400">Event Image</span>
                  </div>
                </div>
                <div className="p-4 md:p-6 flex-1">
                  <h3 className="font-bold text-lg mb-1">{event.title}</h3>
                  <div className="text-neutral-500 text-sm space-y-1 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Location className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-neutral-50 p-2 rounded-md">
                      <p className="text-xs text-neutral-500">Attendance</p>
                      <p className="font-semibold">{event.ticketsSold} / {event.totalCapacity}</p>
                    </div>
                    <div className="bg-neutral-50 p-2 rounded-md">
                      <p className="text-xs text-neutral-500">Revenue</p>
                      <p className="font-semibold">₵{event.revenue.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <Link
                      href={`/dashboards/organizer/analytics`}
                      className="text-primary font-medium text-sm hover:underline"
                    >
                      View Analytics
                    </Link>
                    <Link
                      href={`/dashboards/organizer/events/${event.id}`}
                      className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-3 py-1 rounded text-sm font-medium transition-colors"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg border border-neutral-100 text-center">
            <p className="text-neutral-500 mb-4">No past events yet.</p>
            <Link 
              href="/dashboards/organizer/create-event" 
              className="inline-block px-4 py-2 bg-primary text-white rounded-md"
            >
              Create Your First Event
            </Link>
          </div>
        )}
      </section> */}
        </>
      )}
    </div>
  );
}