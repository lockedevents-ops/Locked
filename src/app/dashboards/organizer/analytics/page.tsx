"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/loaders/PageLoader';
import { 
  Line,
  Bar, 
  Doughnut 
} from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  Filler 
} from 'chart.js';
import { 
  Calendar, 
  Users, 
  CreditCard, 
  TrendingUp, 
  Map, 
  ChevronDown, 
  ArrowUpRight,
  ArrowDownRight,
  Ticket,
  Globe,
  Smartphone,
  Laptop,
  Loader
} from 'lucide-react';
import { organizerAnalyticsService, OrganizerAnalytics } from '@/services/analyticsService';

// Register Chart.js components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement,
  Filler
);

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState("30days");
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [showEventSelector, setShowEventSelector] = useState(false);
  const [analytics, setAnalytics] = useState<OrganizerAnalytics | null>(null);
  const [loading, setLoading] = useState(false); // Start as false, only show loading on initial fetch
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  // Load analytics data with caching - only fetch once per session
  useEffect(() => {
    if (!user?.id) return;

    const cached = organizerAnalyticsService.getCachedAnalytics(user.id);
    if (cached) {
      setAnalytics(prev => prev ?? cached);
      setLoading(false);
    }

    if (!hasFetchedOnce) {
      setLoading(!cached);
      organizerAnalyticsService.getOrganizerAnalytics(user.id)
        .then(data => {
          setAnalytics(data);
          setHasFetchedOnce(true);
        })
        .catch(error => {
          console.error('Failed to load analytics:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [user?.id, hasFetchedOnce]);

  // Get analytics data or use defaults
  const events = [...(analytics?.upcomingEvents || []), ...(analytics?.pastEvents || [])];
  const metrics = {
    totalRevenue: `₵${(analytics?.totalRevenue || 0).toLocaleString()}`,
    totalAttendees: (analytics?.totalTicketsSold || 0).toLocaleString(),
    ticketsSold: (analytics?.totalTicketsSold || 0).toLocaleString(),
    conversionRate: "N/A" // Would need conversion tracking data
  };

  const growthMetrics = [
    {
      title: "Total Events",
      value: analytics?.totalEvents.toString() || "0",
      trend: "up",
      description: "events created"
    },
    {
      title: "Upcoming Events",
      value: (analytics?.upcomingEvents.length || 0).toString(),
      trend: "up",
      description: "scheduled events"
    },
    {
      title: "Average Ticket Price",
      value: analytics?.totalRevenue && analytics?.totalTicketsSold 
        ? `₵${Math.round(analytics.totalRevenue / analytics.totalTicketsSold).toLocaleString()}`
        : "₵0",
      trend: "up",
      description: "average price"
    },
    {
      title: "Completion Rate",
      value: analytics?.pastEvents && analytics?.totalEvents
        ? `${Math.round((analytics.pastEvents.length / analytics.totalEvents) * 100)}%`
        : "0%",
      trend: "up",
      description: "events completed"
    }
  ];

  // Chart data based on real analytics
  const revenueData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Revenue',
        data: analytics?.revenueByMonth || Array(12).fill(0),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.3,
        fill: true
      }
    ]
  };

  const attendanceData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Tickets Sold',
        data: analytics?.monthlyTicketSales || Array(12).fill(0),
        backgroundColor: 'rgba(75, 192, 192, 0.7)',
      }
    ]
  };

  // Generate ticket types data from events
  const ticketTypes = events.reduce((acc: any, event: any) => {
    if (event.tickets) {
      event.tickets.forEach((ticket: any) => {
        acc[ticket.name] = (acc[ticket.name] || 0) + (ticket.sold || ticket.quantity || 0);
      });
    }
    return acc;
  }, {});

  const ticketTypesData = {
    labels: Object.keys(ticketTypes).length > 0 ? Object.keys(ticketTypes) : ['No Data'],
    datasets: [
      {
        data: Object.keys(ticketTypes).length > 0 ? Object.values(ticketTypes) : [1],
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const genderData = {
    labels: ['Female', 'Male', 'Other/Not Specified'],
    datasets: [
      {
        data: [48, 46, 6],
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const trafficSourceData = {
    labels: ['Direct', 'Social Media', 'Search', 'Email', 'Referral'],
    datasets: [
      {
        label: 'Traffic Sources',
        data: [32, 28, 18, 14, 8],
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
        ],
      }
    ]
  };

  const deviceData = {
    labels: ['Mobile', 'Desktop', 'Tablet'],
    datasets: [
      {
        label: 'Devices',
        data: [65, 28, 7],
        backgroundColor: [
          'rgba(255, 159, 64, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(75, 192, 192, 0.7)',
        ],
      }
    ]
  };

  const geographicData = [
    { city: "Accra", attendees: 1840, percentage: 47.9 },
    { city: "Kumasi", attendees: 762, percentage: 19.8 },
    { city: "Tamale", attendees: 304, percentage: 7.9 },
    { city: "Cape Coast", attendees: 218, percentage: 5.7 },
    { city: "Takoradi", attendees: 186, percentage: 4.8 },
    { city: "Other", attendees: 532, percentage: 13.9 },
  ];

  const ageGroups = {
    labels: ['18-24', '25-34', '35-44', '45-54', '55+'],
    datasets: [
      {
        label: 'Age Distribution',
        data: [28, 42, 18, 8, 4],
        backgroundColor: 'rgba(153, 102, 255, 0.7)',
      }
    ]
  };

  const timeRangeOptions = [
    { value: "7days", label: "Last 7 days" },
    { value: "30days", label: "Last 30 days" },
    { value: "90days", label: "Last 90 days" },
    { value: "year", label: "This year" },
    { value: "custom", label: "Custom range" }
  ];

  // Chart options
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    },
    elements: {
      line: {
        tension: 0.4
      }
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 10,
          padding: 15,
          font: {
            size: 11
          }
        }
      }
    },
    cutout: '70%',
  };

  // ✅ Show skeleton only when loading - matches draft events pattern exactly
  if (loading) {
    return <PageLoader message="Loading analytics..." fullHeight />;
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col lg:flex-row justify-between gap-4">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Time range selector */}
          <div className="relative">
            <button
              onClick={() => setShowDateSelector(!showDateSelector)}
              className="flex items-center gap-2 bg-white border border-neutral-200 rounded-md px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Calendar className="h-4 w-4" />
              {timeRangeOptions.find(option => option.value === selectedTimeRange)?.label}
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {showDateSelector && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-10 w-48">
                <div className="py-1">
                  {timeRangeOptions.map(option => (
                    <button
                      key={option.value}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 ${
                        selectedTimeRange === option.value ? 'bg-neutral-50 text-primary font-medium' : 'text-neutral-700'
                      }`}
                      onClick={() => {
                        setSelectedTimeRange(option.value);
                        setShowDateSelector(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Event selector */}
          <div className="relative">
            <button
              onClick={() => setShowEventSelector(!showEventSelector)}
              className="flex items-center gap-2 bg-white border border-neutral-200 rounded-md px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Ticket className="h-4 w-4" />
              {selectedEvent === 'all' ? 'All Events' : events.find(e => e.id.toString() === selectedEvent)?.title || 'Select Event'}
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {showEventSelector && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-10 w-64">
                <div className="py-1">
                  <button
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 ${
                      selectedEvent === 'all' ? 'bg-neutral-50 text-primary font-medium' : 'text-neutral-700'
                    }`}
                    onClick={() => {
                      setSelectedEvent('all');
                      setShowEventSelector(false);
                    }}
                  >
                    All Events
                  </button>
                  {events.map(event => (
                    <button
                      key={event.id}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 ${
                        selectedEvent === event.id.toString() ? 'bg-neutral-50 text-primary font-medium' : 'text-neutral-700'
                      }`}
                      onClick={() => {
                        setSelectedEvent(event.id.toString());
                        setShowEventSelector(false);
                      }}
                    >
                      {event.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold">{metrics.totalRevenue}</p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-full">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium">Total Attendees</p>
              <p className="text-2xl font-bold">{metrics.totalAttendees}</p>
            </div>
            <div className="p-3 bg-green-50 text-green-600 rounded-full">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium">Tickets Sold</p>
              <p className="text-2xl font-bold">{metrics.ticketsSold}</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
              <Ticket className="h-6 w-6" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-neutral-500 font-medium">Conversion Rate</p>
              <p className="text-2xl font-bold">{metrics.conversionRate}</p>
            </div>
            <div className="p-3 bg-purple-50 text-purple-600 rounded-full">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Growth Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {growthMetrics.map((metric, index) => (
          <div key={index} className="bg-white p-5 rounded-lg shadow-sm border border-neutral-100">
            <p className="text-neutral-500 font-medium text-sm">{metric.title}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-bold">{metric.value}</p>
              <div className={`flex items-center text-xs font-medium ${
                metric.trend === 'up' ? 'text-green-600' : 'text-red-500'
              }`}>
                {metric.trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-0.5" />
                )}
                {metric.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue & Attendance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-neutral-100">
          <h3 className="font-semibold mb-4">Revenue Trends</h3>
          <div className="h-72">
            <Line data={revenueData} options={lineChartOptions} />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-lg shadow-sm border border-neutral-100">
          <h3 className="font-semibold mb-4">Attendance Trends</h3>
          <div className="h-72">
            <Bar data={attendanceData} options={barChartOptions} />
          </div>
        </div>
      </div>

      {/* Demographic and Traffic Charts (2x2 Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-neutral-100">
          <h3 className="font-semibold mb-4">Ticket Types</h3>
          <div className="h-64">
            <Doughnut data={ticketTypesData} options={doughnutOptions} />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-lg shadow-sm border border-neutral-100">
          <h3 className="font-semibold mb-4">Gender Distribution</h3>
          <div className="h-64">
            <Doughnut data={genderData} options={doughnutOptions} />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-lg shadow-sm border border-neutral-100">
          <h3 className="font-semibold mb-4">Traffic Sources</h3>
          <div className="h-64">
            <Doughnut data={trafficSourceData} options={doughnutOptions} />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-lg shadow-sm border border-neutral-100">
          <h3 className="font-semibold mb-4">Device Types</h3>
          <div className="h-64">
            <Doughnut data={deviceData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Age Distribution Chart */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-neutral-100">
          <h3 className="font-semibold mb-4">Age Distribution</h3>
          <div className="h-64">
            <Bar data={ageGroups} options={barChartOptions} />
          </div>
        </div>
      </div>

      {/* Geographic Distribution */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Geographic Distribution</h3>
            <div className="text-sm text-neutral-500 flex items-center">
              <Map className="h-4 w-4 mr-1" />
              <span>Ghana</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    City
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Attendees
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Distribution
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {geographicData.map((city, index) => (
                  <tr key={index} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-neutral-400" />
                        {city.city}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {city.attendees.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                      {city.percentage}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-neutral-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${city.percentage}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-neutral-100 flex items-center">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-full mr-4">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-neutral-500">Mobile Users</p>
            <p className="text-2xl font-bold">65%</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-lg shadow-sm border border-neutral-100 flex items-center">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full mr-4">
            <Laptop className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-neutral-500">Desktop Users</p>
            <p className="text-2xl font-bold">28%</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-lg shadow-sm border border-neutral-100 flex items-center">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-full mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-neutral-500">Tablet Users</p>
            <p className="text-2xl font-bold">7%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
