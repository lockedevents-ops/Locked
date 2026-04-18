"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshButton } from '@/components/admin/RefreshButton';
import {
  Calendar, 
  Download, 
  TrendingUp, 
  Users, 
  DollarSign, 
  BarChart2,
  Ticket,
  Filter,
  ChevronDown,
  FileText,
  RefreshCcw,
  Building
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Doughnut, Chart } from 'react-chartjs-2';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminUsersReport, useAdminEventsReport, useAdminRoleRequestsReport } from '@/hooks/adminQueries';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Date range picker component
const DateRangePicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange
}: {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}) => {
  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="pl-10 pr-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-primary focus:border-primary cursor-pointer bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
        />
      </div>
      <span className="text-gray-500 dark:text-gray-400">to</span>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="pl-10 pr-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-primary focus:border-primary cursor-pointer bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100"
        />
      </div>
    </div>
  );
};

interface TopEvent {
  id: string;
  name: string;
  tickets: number;
  revenue: number;
  category: string;
}

interface TopVenue {
  id: string;
  name: string;
  bookings: number;
  revenue: number;
  city: string;
}

interface ReportSummary {
  totalRevenue: number;
  totalUsers: number;
  totalEvents: number;
  totalTickets: number;
  activeVenues: number;
  averageTicketPrice: number;
}

interface ReportData {
  dates: string[];
  revenue: number[];
  userGrowth: number[];
  eventCount: number[];
  ticketSales: number[];
  categoryDistribution: {
    labels: string[];
    data: number[];
  };
  platformUsage: {
    labels: string[];
    data: number[];
  };
  topEvents: TopEvent[];
  topVenues: TopVenue[];
  summary: ReportSummary;
}

export default function ReportsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const adminToast = useToast();
  const queryClient = useQueryClient();
  const hasShownNotImplementedToast = useRef(false);
  
  // States for filters
  const [reportType, setReportType] = useState('overview');
  const [timeRange, setTimeRange] = useState('7days');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  
  // Users report data hook
  const { data: usersReportData, isLoading: usersLoading, isFetching: usersFetching } = useAdminUsersReport(
    {
      // Only pass startDate/endDate for custom ranges, let timeRange calculate dates for presets
      startDate: timeRange === 'custom' ? startDate : undefined,
      endDate: timeRange === 'custom' ? endDate : undefined,
      timeRange: timeRange === '7days' ? '7d' : timeRange === '30days' ? '30d' : timeRange === '90days' ? '90d' : undefined,
    },
    { enabled: (reportType === 'users' || reportType === 'overview') && !!user }
  );
  
  // Events report data hook
  const { data: eventsReportData, isLoading: eventsLoading, isFetching: eventsFetching } = useAdminEventsReport(
    {
      // Only pass startDate/endDate for custom ranges, let timeRange calculate dates for presets
      startDate: timeRange === 'custom' ? startDate : undefined,
      timeRange: timeRange === '7days' ? '7d' : timeRange === '30days' ? '30d' : timeRange === '90days' ? '90d' : undefined,
    },
    { enabled: !!user }
  );
  
  // Role Requests report data hook
  const { data: roleRequestsReportData, isLoading: roleRequestsLoading, isFetching: roleRequestsFetching } = useAdminRoleRequestsReport(
    {
      startDate: timeRange === 'custom' ? startDate : undefined,
      endDate: timeRange === 'custom' ? endDate : undefined,
      timeRange: timeRange === '7days' ? '7d' : timeRange === '30days' ? '30d' : timeRange === '90days' ? '90d' : undefined,
    },
    { enabled: !!user }
  );
  
  // Handle report type change
  const handleReportTypeChange = (type: string) => {
    setReportType(type);
    loadReportData(type, startDate, endDate);
  };
  
  // Handle time range change
  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    
    const today = new Date();
    let start = new Date();
    
    switch(range) {
      case '7days':
        start.setDate(today.getDate() - 7);
        break;
      case '30days':
        start.setDate(today.getDate() - 30);
        break;
      case '90days':
        start.setDate(today.getDate() - 90);
        break;
      case '1year':
        start.setFullYear(today.getFullYear() - 1);
        break;
      default:
        start.setDate(today.getDate() - 30);
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
    
    loadReportData(reportType, start.toISOString().split('T')[0], today.toISOString().split('T')[0]);
  };
  
  // Handle date changes
  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    setTimeRange('custom');
    loadReportData(reportType, date, endDate);
  };
  
  const handleEndDateChange = (date: string) => {
    setEndDate(date);
    setTimeRange('custom');
    loadReportData(reportType, startDate, date);
  };
  
  // Load report data based on type and date range
  const loadReportData = async (type: string, start: string, end: string) => {
    setIsLoading(true);
    
    try {
      // For Users tab, use real data from the hook
      if (type === 'users' && usersReportData) {
        const data: ReportData = {
          dates: usersReportData.dates,
          revenue: [],
          userGrowth: usersReportData.userGrowth,
          eventCount: [],
          ticketSales: [],
          categoryDistribution: {
            labels: [],
            data: []
          },
          platformUsage: usersReportData.platformUsage,
          topEvents: [],
          topVenues: [],
          summary: {
            totalRevenue: 0,
            totalUsers: usersReportData.totalUsers,
            totalEvents: 0,
            totalTickets: 0,
            activeVenues: 0,
            averageTicketPrice: 0
          }
        };
        
        setReportData(data);
        setIsLoading(false);
        return;
      }
      
      // For Events tab, use real data from the hook
      if (type === 'events' && eventsReportData) {
        const data: ReportData = {
          dates: eventsReportData.dates,
          revenue: [],
          userGrowth: [],
          eventCount: eventsReportData.eventCount,
          ticketSales: eventsReportData.ticketSales,
          categoryDistribution: eventsReportData.categoryDistribution,
          platformUsage: {
            labels: [],
            data: []
          },
          topEvents: eventsReportData.topEvents,
          topVenues: [],
          summary: {
            totalRevenue: 0,
            totalUsers: 0,
            totalEvents: eventsReportData.totalEvents,
            totalTickets: eventsReportData.ticketSales.reduce((sum, val) => sum + val, 0),
            activeVenues: 0,
            averageTicketPrice: 0
          }
        };
        
        setReportData(data);
        setIsLoading(false);
        return;
      }
      
      // For Overview tab, aggregate data from available hooks
      if (type === 'overview') {
        const data: ReportData = {
          // Prefer event dates as they might be more activity-driven, or user dates? 
          // They should ideally be the same range if params are same.
          dates: eventsReportData?.dates || usersReportData?.dates || [],
          
          // Revenue endpoint not yet implemented for daily trend
          revenue: [], 
          
          // User Growth from Users Report
          userGrowth: usersReportData?.userGrowth || [],
          
          // Event & Ticket Stats from Events Report
          eventCount: eventsReportData?.eventCount || [],
          ticketSales: eventsReportData?.ticketSales || [],
          
          // Distributions
          categoryDistribution: eventsReportData?.categoryDistribution || { labels: [], data: [] },
          platformUsage: usersReportData?.platformUsage || { labels: [], data: [] },
          
          // Lists
          topEvents: eventsReportData?.topEvents || [],
          topVenues: [], // Not implemented
          
          // Summary Aggregation
          summary: {
            totalRevenue: 0,
            totalUsers: usersReportData?.totalUsers || 0,
            totalEvents: eventsReportData?.totalEvents || 0,
            totalTickets: eventsReportData?.ticketSales?.reduce((a, b) => a + b, 0) || 0,
            activeVenues: 0,
            averageTicketPrice: 0
          }
        };
        
        setReportData(data);
        setIsLoading(false);
        return;
      }

      // TODO: Replace with actual API call when backend is ready for other report types
      // const response = await fetch(
      //   `/api/admin/reports?type=${type}&startDate=${start}&endDate=${end}`
      // );
      // if (!response.ok) throw new Error('Failed to fetch report data');
      // const data: ReportData = await response.json();
      // setReportData(data);
      
      // For now, set empty data structure and show info message
      if (!hasShownNotImplementedToast.current && type !== 'users' && type !== 'events' && type !== 'overview') {
        adminToast.showInfo('Reports API', 'Reports API endpoint not yet implemented');
        hasShownNotImplementedToast.current = true;
      }
      
      const emptyData: ReportData = {
        dates: [],
        revenue: [],
        userGrowth: [],
        eventCount: [],
        ticketSales: [],
        categoryDistribution: {
          labels: [],
          data: []
        },
        platformUsage: {
          labels: [],
          data: []
        },
        topEvents: [],
        topVenues: [],
        summary: {
          totalRevenue: 0,
          totalUsers: 0,
          totalEvents: 0,
          totalTickets: 0,
          activeVenues: 0,
          averageTicketPrice: 0
        }
      };
      
      setReportData(emptyData);

      
    } catch (error) {
      console.error("Error loading report data:", error);
  adminToast.showError('Report Load Failed', 'Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // This function will be implemented when backend is ready
  // const generateDateRange = (start: Date, end: Date) => {
  //   // Will be handled by the backend
  // };
  
  // Handle export report
  const handleExportReport = (format: 'pdf' | 'csv' | 'excel') => {
    // TODO: Implement when backend is ready
    // const response = await fetch(`/api/admin/reports/export?format=${format}`);
    // const blob = await response.blob();
    // const url = window.URL.createObjectURL(blob);
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = `report.${format}`;
    // a.click();
    
  adminToast.showInfo('Export Pending', 'Export functionality will be implemented when backend is ready');
  };

  // Load data on mount
  useEffect(() => {
    loadReportData(reportType, startDate, endDate);
  }, []);
  
  // Update report data when users data changes
  useEffect(() => {
    if ((reportType === 'users' || reportType === 'overview') && usersReportData) {
      loadReportData(reportType, startDate, endDate);
    }
  }, [usersReportData, reportType]);
  
  // Update report data when events data changes
  useEffect(() => {
    if ((reportType === 'events' || reportType === 'overview') && eventsReportData) {
      loadReportData(reportType, startDate, endDate);
    }
  }, [eventsReportData, reportType]);
  
  // Update report data when role requests data changes
  useEffect(() => {
    if (reportType === 'role-requests' && roleRequestsReportData) {
      loadReportData(reportType, startDate, endDate);
    }
  }, [roleRequestsReportData, reportType]);
  
  // Show loading state
  if ((isLoading && !reportData) || (reportType === 'users' && usersLoading) || (reportType === 'events' && eventsLoading) || (reportType === 'role-requests' && roleRequestsLoading)) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse flex justify-between items-center">
          <div className="h-8 bg-gray-200 dark:bg-neutral-800 rounded-md w-1/4"></div>
          <div className="h-8 bg-gray-200 dark:bg-neutral-800 rounded-md w-1/3"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white dark:bg-neutral-900 p-6 rounded-lg h-32 shadow-sm border border-gray-200 dark:border-neutral-800">
              <div className="h-5 bg-gray-200 dark:bg-neutral-800 rounded-md w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-neutral-800 rounded-md w-1/3"></div>
            </div>
          ))}
        </div>
        
        <div className="animate-pulse bg-white dark:bg-neutral-900 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-neutral-800 h-80">
          <div className="h-6 bg-gray-200 dark:bg-neutral-800 rounded-md w-1/4 mb-8"></div>
          <div className="h-64 bg-gray-100 dark:bg-neutral-800 rounded-md"></div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const revenueChartData = {
    labels: reportData?.dates || [],
    datasets: [
      {
        label: 'Revenue (GHS)',
        data: reportData?.revenue || [],
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
        tension: 0.2,
      }
    ],
  };
  
  const userGrowthChartData = {
    labels: reportData?.dates || [],
    datasets: [
      {
        label: 'Total Users',
        data: reportData?.userGrowth || [],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        tension: 0.2,
      }
    ],
  };
  
  const eventTicketChartData = {
    labels: reportData?.dates || [],
    datasets: [
      {
        type: 'bar' as const,
        label: 'Events',
        data: reportData?.eventCount || [],
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        yAxisID: 'y',
        order: 2,
      },
      {
        type: 'line' as const,
        label: 'Tickets Sold',
        data: reportData?.ticketSales || [],
        borderColor: 'rgb(244, 63, 94)',
        backgroundColor: 'rgba(244, 63, 94, 0.5)',
        yAxisID: 'y1',
        tension: 0.2,
        order: 1,
      }
    ],
  };
  
  const categoryDistributionData = {
    labels: reportData?.categoryDistribution?.labels || [],
    datasets: [
      {
        label: 'Category Distribution',
        data: reportData?.categoryDistribution?.data || [],
        backgroundColor: [
          'rgba(99, 102, 241, 0.7)',
          'rgba(244, 63, 94, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(139, 92, 246, 0.7)',
          'rgba(236, 72, 153, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const platformUsageData = {
    labels: reportData?.platformUsage?.labels || [],
    datasets: [
      {
        label: 'Platform Usage',
        data: reportData?.platformUsage?.data || [],
        backgroundColor: [
          'rgba(99, 102, 241, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(244, 63, 94, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold dark:text-gray-100">Reports & Analytics</h1>
        
        <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <RefreshButton 
            onRefresh={async () => { 
               await Promise.all([
                 queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
                 queryClient.invalidateQueries({ queryKey: ['admin', 'users', 'report'] }),
                 queryClient.invalidateQueries({ queryKey: ['admin', 'events', 'report'] }),
                 queryClient.invalidateQueries({ queryKey: ['admin', 'role-requests', 'report'] })
               ]);
               router.refresh(); 
            }}
            isLoading={isLoading || usersLoading || eventsLoading || roleRequestsLoading || usersFetching || eventsFetching || roleRequestsFetching}
            className="h-[42px]" 
          />
          
          <div className="relative inline-flex rounded-md shadow-sm">
             {/* Export button modified to be standalone rounded */}
            <button 
              className="px-4 py-2 rounded-md bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 cursor-pointer flex items-center shadow-sm"
              onClick={() => {
                const dropdown = document.getElementById('exportDropdown');
                dropdown?.classList.toggle('hidden');
              }}
            >
              <Download className="h-5 w-5 mr-1" />
              <span>Export</span>
              <ChevronDown className="h-4 w-4 ml-1" />
            </button>
            
            <div 
              id="exportDropdown" 
              className="absolute right-0 mt-1 w-40 bg-white dark:bg-neutral-900 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-neutral-800 hidden"
            >
              <button 
                onClick={() => handleExportReport('pdf')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer"
              >
                  <FileText className="h-4 w-4 inline mr-2" />
                  PDF Report
                </button>
                <button 
                  onClick={() => handleExportReport('csv')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer"
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  CSV Export
                </button>
                <button 
                  onClick={() => handleExportReport('excel')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer"
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Excel Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Report Type:</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleReportTypeChange('overview')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                reportType === 'overview' 
                  ? 'bg-black dark:bg-black text-white' 
                  : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
              } cursor-pointer transition-colors`}
            >
              Overview
            </button>
            <button
              onClick={() => handleReportTypeChange('revenue')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                reportType === 'revenue' 
                  ? 'bg-black dark:bg-black text-white' 
                  : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
              } cursor-pointer transition-colors`}
            >
              Revenue
            </button>
            <button
              onClick={() => handleReportTypeChange('users')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                reportType === 'users' 
                  ? 'bg-black dark:bg-black text-white' 
                  : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
              } cursor-pointer transition-colors`}
            >
              Users
            </button>
            <button
              onClick={() => handleReportTypeChange('events')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                reportType === 'events' 
                  ? 'bg-black dark:bg-black text-white' 
                  : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
              } cursor-pointer transition-colors`}
            >
              Events
            </button>
            <button
              onClick={() => handleReportTypeChange('role-requests')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                reportType === 'role-requests' 
                  ? 'bg-black dark:bg-black text-white' 
                  : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
              } cursor-pointer transition-colors`}
            >
              Role Requests
            </button>
            <button
              onClick={() => handleReportTypeChange('venues')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                reportType === 'venues' 
                  ? 'bg-black dark:bg-black text-white' 
                  : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
              } cursor-pointer transition-colors`}
            >
              Venues
            </button>
          </div>
          
          <div className="md:ml-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Time Range:</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleTimeRangeChange('7days')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  timeRange === '7days' 
                    ? 'bg-black dark:bg-black text-white' 
                    : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
                } cursor-pointer transition-colors`}
              >
                7 Days
              </button>
              <button
                onClick={() => handleTimeRangeChange('30days')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  timeRange === '30days' 
                    ? 'bg-black dark:bg-black text-white' 
                    : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
                } cursor-pointer transition-colors`}
              >
                30 Days
              </button>
              <button
                onClick={() => handleTimeRangeChange('90days')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  timeRange === '90days' 
                    ? 'bg-black dark:bg-black text-white' 
                    : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
                } cursor-pointer transition-colors`}
              >
                90 Days
              </button>
              <button
                onClick={() => handleTimeRangeChange('1year')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  timeRange === '1year' 
                    ? 'bg-primary text-white' 
                    : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-neutral-600'
                } cursor-pointer transition-colors`}
              >
                1 Year
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex justify-end">
          <DateRangePicker 
            startDate={startDate} 
            endDate={endDate}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
          />
        </div>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-primary/10 text-primary rounded-full">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
              <p className="text-xl font-bold dark:text-gray-100">₵{reportData?.summary.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
              <Users className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</p>
              <p className="text-xl font-bold dark:text-gray-100">{reportData?.summary.totalUsers.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Events</p>
              <p className="text-xl font-bold dark:text-gray-100">{reportData?.summary.totalEvents.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
              <Ticket className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tickets Sold</p>
              <p className="text-xl font-bold dark:text-gray-100">{reportData?.summary.totalTickets.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
              <Building className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Venues</p>
              <p className="text-xl font-bold dark:text-gray-100">{reportData?.summary.activeVenues}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <div className="flex items-center">
            <div className="flex-shrink-0 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
              <BarChart2 className="h-5 w-5" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Ticket Price</p>
              <p className="text-xl font-bold dark:text-gray-100">₵{reportData?.summary.averageTicketPrice}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Active Users Section (Overview Only) */}
      {reportType === 'overview' && usersReportData && (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <h2 className="text-lg font-bold mb-4 dark:text-gray-100">Active Users Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">Daily Active Users</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-300 mt-1">{usersReportData.dailyActiveUsers || 0}</p>
                  <p className="text-xs text-green-600 dark:text-green-500 mt-1">Last 24 hours</p>
                </div>
                <Users className="h-8 w-8 text-green-700 dark:text-green-400" />
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Monthly Active Users</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-300 mt-1">{usersReportData.monthlyActiveUsers || 0}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">Last 30 days</p>
                </div>
                <Users className="h-8 w-8 text-blue-700 dark:text-blue-400" />
              </div>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-400">Yearly Active Users</p>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-300 mt-1">{usersReportData.yearlyActiveUsers || 0}</p>
                  <p className="text-xs text-purple-600 dark:text-purple-500 mt-1">Last 365 days</p>
                </div>
                <Users className="h-8 w-8 text-purple-700 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Charts (different based on report type) */}
      {reportType === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
            <h2 className="text-lg font-bold mb-6 dark:text-gray-100">Revenue Trend</h2>
            <div className="h-72">
              <Line 
                data={revenueChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `₵${value}`
                      }
                    }
                  },
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: (context) => `₵${context.parsed.y.toLocaleString()}`
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
          
          {/* User Growth */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
            <h2 className="text-lg font-bold mb-6 dark:text-gray-100">User Growth</h2>
            <div className="h-72">
              <Line 
                data={userGrowthChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                    }
                  },
                }}
              />
            </div>
          </div>
          
          {/* Events and Tickets */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
            <h2 className="text-lg font-bold mb-6 dark:text-gray-100">Events & Ticket Sales</h2>
            <div className="h-72">
              <Chart
                type="bar"
                data={eventTicketChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      position: 'left',
                      title: {
                        display: true,
                        text: 'Events'
                      }
                    },
                    y1: {
                      beginAtZero: true,
                      position: 'right',
                      grid: {
                        drawOnChartArea: false,
                      },
                      title: {
                        display: true,
                        text: 'Tickets'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
          
          {/* Pie Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold mb-6 dark:text-gray-100">Category Distribution</h2>
              <div className="h-64">
                <Doughnut 
                  data={categoryDistributionData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          boxWidth: 15
                        }
                      }
                    },
                    cutout: '60%'
                  }}
                />
              </div>
            </div>
            
            {/* Platform Usage */}
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold mb-6 dark:text-gray-100">Platform Usage</h2>
              <div className="h-64">
                <Doughnut 
                  data={platformUsageData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          boxWidth: 15
                        }
                      }
                    },
                    cutout: '60%'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {reportType === 'revenue' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
            <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">Revenue Trend</h2>
            <div className="h-80">
              <Line 
                data={revenueChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (value) => `₵${value}`
                      }
                    }
                  },
                  plugins: {
                    tooltip: {
                      callbacks: {
                        label: (context) => `₵${context.parsed.y.toLocaleString()}`
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
          
          {/* Revenue Breakdown Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Events by Revenue */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Top Events by Revenue</h3>
              </div>
              <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-600">
                  <thead className="bg-gray-50 dark:bg-neutral-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Event</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tickets</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-600">
                    {reportData?.topEvents.map((event: any) => (
                      <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-neutral-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {event.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {event.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                          {event.tickets.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                          ₵{event.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Top Venues by Revenue */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Top Venues by Revenue</h3>
              </div>
              <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-600">
                  <thead className="bg-gray-50 dark:bg-neutral-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Venue</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bookings</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-600">
                    {reportData?.topVenues.map((venue: any) => (
                      <tr key={venue.id} className="hover:bg-gray-50 dark:hover:bg-neutral-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {venue.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {venue.city}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                          {venue.bookings}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                          ₵{venue.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {reportType === 'users' && (
        <div className="space-y-6">
          {/* Active Users Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                  <Users className="h-5 w-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Daily Active Users</p>
                  <p className="text-xl font-bold dark:text-gray-100">{usersReportData?.dailyActiveUsers || 0}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Last 24 hours</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                  <Users className="h-5 w-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Monthly Active Users</p>
                  <p className="text-xl font-bold dark:text-gray-100">{usersReportData?.monthlyActiveUsers || 0}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Last 30 days</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                  <Users className="h-5 w-5" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Yearly Active Users</p>
                  <p className="text-xl font-bold dark:text-gray-100">{usersReportData?.yearlyActiveUsers || 0}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Last 365 days</p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Users Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">Daily Active Users Trend</h2>
              <div className="h-80">
                <Line 
                  data={{
                    labels: usersReportData?.dates || [],
                    datasets: [
                      {
                        label: 'Daily Active Users',
                        data: usersReportData?.dauTrend || [],
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">Monthly Active Users Trend</h2>
              <div className="h-80">
                <Line 
                  data={{
                    labels: usersReportData?.dates || [],
                    datasets: [
                      {
                        label: 'Monthly Active Users',
                        data: usersReportData?.mauTrend || [],
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
            <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">User Growth</h2>
            <div className="h-80">
              <Line 
                data={userGrowthChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                    }
                  }
                }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">Platform Usage</h2>
              <div className="h-80">
                <Doughnut 
                  data={platformUsageData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                      }
                    },
                    cutout: '50%'
                  }}
                />
              </div>
            </div>
            
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">User Acquisition Channels</h2>
              <div className="h-80">
                <Doughnut 
                  data={{
                    labels: ['Organic', 'Social Media', 'Referral', 'Email', 'Direct'],
                    datasets: [
                      {
                        label: 'User Acquisition',
                        data: [35, 25, 20, 15, 5],
                        backgroundColor: [
                          'rgba(16, 185, 129, 0.7)',
                          'rgba(59, 130, 246, 0.7)',
                          'rgba(245, 158, 11, 0.7)',
                          'rgba(99, 102, 241, 0.7)',
                          'rgba(244, 63, 94, 0.7)',
                        ],
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                      }
                    },
                    cutout: '50%'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {reportType === 'events' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
            <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">Events & Ticket Sales</h2>
            <div className="h-80">
              <Chart
                type="bar"
                data={eventTicketChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      position: 'left',
                      title: {
                        display: true,
                        text: 'Events'
                      }
                    },
                    y1: {
                      beginAtZero: true,
                      position: 'right',
                      grid: {
                        drawOnChartArea: false,
                      },
                      title: {
                        display: true,
                        text: 'Tickets'
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">Category Distribution</h2>
              <div className="h-80">
                <Doughnut 
                  data={categoryDistributionData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                      }
                    },
                    cutout: '50%'
                  }}
                />
              </div>
            </div>
            
            {/* Top Events by Ticket Sales */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Top Events by Ticket Sales</h3>
              </div>
              <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-600">
                  <thead className="bg-gray-50 dark:bg-neutral-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Event</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tickets</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-600">
                    {reportData?.topEvents.map((event: any) => (
                      <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-neutral-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {event.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {event.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                          {event.tickets.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                          ₵{event.revenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportType === 'venues' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">Venue Distribution by City</h2>
              <div className="h-80">
                <Doughnut 
                  data={{
                    labels: ['Accra', 'Kumasi', 'Tema', 'Cape Coast', 'Takoradi'],
                    datasets: [
                      {
                        label: 'Venues by City',
                        data: reportData?.platformUsage?.data || [35, 25, 15, 15, 10],
                        backgroundColor: [
                          'rgba(99, 102, 241, 0.7)',
                          'rgba(16, 185, 129, 0.7)',
                          'rgba(244, 63, 94, 0.7)',
                          'rgba(245, 158, 11, 0.7)',
                          'rgba(139, 92, 246, 0.7)',
                        ],
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                      }
                    },
                    cutout: '50%'
                  }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">Venue Types</h2>
              <div className="h-80">
                <Doughnut 
                  data={{
                    labels: ['Conference Hall', 'Event Center', 'Hotel', 'Restaurant', 'Outdoor Space', 'Other'],
                    datasets: [
                      {
                        label: 'Venue Types',
                        data: reportData?.categoryDistribution?.data || [30, 25, 20, 15, 7, 3],
                        backgroundColor: [
                          'rgba(99, 102, 241, 0.7)',
                          'rgba(16, 185, 129, 0.7)',
                          'rgba(244, 63, 94, 0.7)',
                          'rgba(245, 158, 11, 0.7)',
                          'rgba(139, 92, 246, 0.7)',
                          'rgba(59, 130, 246, 0.7)',
                        ],
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                      }
                    },
                    cutout: '50%'
                  }}
                />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">Capacity Distribution</h2>
              <div className="h-80">
                <Doughnut 
                  data={{
                    labels: ['< 100', '100-500', '501-1000', '1001-2000', '> 2000'],
                    datasets: [
                      {
                        label: 'Venue Capacity',
                        data: [15, 35, 25, 15, 10],
                        backgroundColor: [
                          'rgba(99, 102, 241, 0.7)',
                          'rgba(16, 185, 129, 0.7)',
                          'rgba(244, 63, 94, 0.7)',
                          'rgba(245, 158, 11, 0.7)',
                          'rgba(139, 92, 246, 0.7)',
                        ],
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                      }
                    },
                    cutout: '50%'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Venue Performance Table */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Top Performing Venues</h3>
            </div>
            <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-600">
                <thead className="bg-gray-50 dark:bg-neutral-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Venue</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Capacity</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Events</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-600">
                  {reportData?.topVenues.map((venue: any) => (
                    <tr key={venue.id} className="hover:bg-gray-50 dark:hover:bg-neutral-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {venue.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {venue.city}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                        500 {/* This will be replaced with actual data when API is ready */}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                        {venue.bookings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                        ₵{venue.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Role Requests Report */}
      {reportType === 'role-requests' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Total Requests</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {roleRequestsReportData?.totalRequests?.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Pending</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">
                {roleRequestsReportData?.pendingRequests?.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Approved</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-500">
                {roleRequestsReportData?.approvedRequests?.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Approval Rate</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {roleRequestsReportData?.overallApprovalRate !== undefined ? `${roleRequestsReportData.overallApprovalRate}%` : '0%'}
              </p>
            </div>
          </div>

          {/* Request Trends Chart */}
          <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
            <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">Role Request Trends</h2>
            <div className="h-80">
              <Line 
                data={{
                  labels: roleRequestsReportData?.dates || [],
                  datasets: [
                    {
                      label: 'Total Requests',
                      data: roleRequestsReportData?.requestCount || [],
                      borderColor: 'rgb(59, 130, 246)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      tension: 0.4,
                      fill: true,
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Request Type Distribution */}
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">Request Types</h2>
              <div className="h-80">
                <Doughnut 
                  data={{
                    labels: roleRequestsReportData?.requestTypeDistribution?.labels || ['Organizer', 'Venue Owner'],
                    datasets: [
                      {
                        label: 'Request Types',
                        data: roleRequestsReportData?.requestTypeDistribution?.data || [0, 0],
                        backgroundColor: [
                          'rgba(99, 102, 241, 0.7)',
                          'rgba(16, 185, 129, 0.7)',
                        ],
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                      }
                    },
                    cutout: '50%'
                  }}
                />
              </div>
            </div>

            {/* Approval Rate Trend */}
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <h2 className="text-lg font-bold mb-6 text-gray-900 dark:text-gray-100">Daily Approval Rate</h2>
              <div className="h-80">
                <Line 
                  data={{
                    labels: roleRequestsReportData?.dates || [],
                    datasets: [
                      {
                        label: 'Approval Rate (%)',
                        data: roleRequestsReportData?.approvalRate || [],
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: 'top',
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                          callback: function(value) {
                            return value + '%';
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Processing Time & Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Avg Processing Time</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {roleRequestsReportData?.avgProcessingTime !== undefined 
                  ? `${roleRequestsReportData.avgProcessingTime.toFixed(1)}h` 
                  : '0h'}
              </p>
            </div>
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Rejected</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-500">
                {roleRequestsReportData?.rejectedRequests?.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Revoked</p>
              <p className="text-3xl font-bold text-gray-600 dark:text-gray-500">
                {roleRequestsReportData?.revokedRequests?.toLocaleString() || 0}
              </p>
            </div>
          </div>

          {/* Top Requestors Table */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Recent Requestors</h3>
            </div>
            <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-600">
                <thead className="bg-gray-50 dark:bg-neutral-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role Requested</th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Requested At</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-600">
                  {roleRequestsReportData?.topRequestors && roleRequestsReportData.topRequestors.length > 0 ? (
                    roleRequestsReportData.topRequestors.map((request: any, index: number) => (
                      <tr key={request.id || index} className="hover:bg-gray-50 dark:hover:bg-neutral-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {request.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {request.email || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {request.requestType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            request.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                            request.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                          }`}>
                            {request.status?.charAt(0).toUpperCase() + request.status?.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                          {new Date(request.submittedAt).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                        No role requests found for this period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}