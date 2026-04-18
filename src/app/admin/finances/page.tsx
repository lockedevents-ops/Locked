"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { RefreshButton } from '@/components/admin/RefreshButton';
import {
  DollarSign,
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  ChevronRight,
  ArrowUpRight,
  Users,
  Calendar,
  Filter,
} from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { adminFinanceService } from '@/services/adminFinanceService';
import { useToast } from '@/hooks/useToast';
import { PageLoader } from '@/components/loaders/PageLoader';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function AdminFinancesPage() {
  const toast = useToast();
  const [timeRange, setTimeRange] = useState('30days');
  const [showTimeFilter, setShowTimeFilter] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Real data from Supabase
  const [platformStats, setPlatformStats] = useState({
    totalRevenue: 0,
    monthlyFees: 0,
    pendingPayouts: 0,
    totalPayouts: 0,
    growthRate: 0,
    feePercentage: 5.0
  });

  const [monthlyRevenue, setMonthlyRevenue] = useState<Array<{ month: string; revenue: number }>>([]);
  const [revenueByCategory, setRevenueByCategory] = useState<Array<{ category: string; amount: number; percentage: number }>>([]);
  const [topOrganizers, setTopOrganizers] = useState<Array<{ id: string; name: string; eventsCount: number; totalRevenue: number; platformFees: number }>>([]);
  const [pendingPayouts, setPendingPayouts] = useState<Array<{ id: string; organizerName: string; amount: number; requestedAt: string; status: string }>>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [allPayouts, setAllPayouts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  // Load data from Supabase
  useEffect(() => {
    loadFinancialData();
  }, []);

  async function loadFinancialData() {
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [stats, monthly, categories, organizers, payouts, transactions, fullPayouts] = await Promise.all([
        adminFinanceService.getPlatformStats(),
        adminFinanceService.getMonthlyRevenue(),
        adminFinanceService.getRevenueByCategory(),
        adminFinanceService.getTopOrganizers(5),
        adminFinanceService.getPayoutRequests('pending'),
        adminFinanceService.getTransactions(100), // Get recent 100 transactions
        adminFinanceService.getPayoutRequests() // Get all payouts for tab
      ]);

      setPlatformStats(stats);
      setMonthlyRevenue(monthly);
      setRevenueByCategory(categories);
      setTopOrganizers(organizers);
      setPendingPayouts(payouts.slice(0, 3)); // Show only 3 recent pending payouts
      setAllTransactions(transactions);
      setAllPayouts(fullPayouts);
    } catch (error) {
      console.error('Failed to load financial data:', error);
      toast.showError('Load Failed', 'Failed to load financial data');
    } finally {
      setIsLoading(false);
    }
  }

  // Chart data
  const revenueChartData = {
    labels: monthlyRevenue.map(item => item.month),
    datasets: [
      {
        label: 'Platform Revenue',
        data: monthlyRevenue.map(item => item.revenue),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const categoryChartData = {
    labels: revenueByCategory.map(item => item.category),
    datasets: [
      {
        data: revenueByCategory.map(item => item.amount),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
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
          color: 'rgba(0, 0, 0, 0.05)',
        }
      },
      x: {
        grid: {
          display: false,
        }
      }
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 12,
          font: {
            size: 11
          }
        }
      }
    },
    cutout: '70%',
  };

  if (isLoading) {
    return <PageLoader message="Loading financial data..." fullHeight />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Platform Finances</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Real-time data from Supabase & Hubtel API</p>
        </div>
        
        <div className="flex gap-3">
          <RefreshButton 
            onRefresh={loadFinancialData}
            isLoading={isLoading}
            label="Refresh financial data"
            className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800"
          />
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 text-sm font-medium text-gray-900 dark:text-gray-100">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-neutral-800">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {['overview', 'transactions', 'payouts'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize cursor-pointer
                ${activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-neutral-700'}
              `}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex items-center text-green-600 text-sm font-medium">
                    <ArrowUpRight className="w-4 h-4" />
                    {platformStats.growthRate}%
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    ₵{platformStats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Total Platform Revenue</p>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                    {platformStats.feePercentage}%
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    ₵{platformStats.monthlyFees.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Monthly Fee Collection</p>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                    <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {platformStats.pendingPayouts}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Processing Payouts</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Automated via Hubtel</p>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                    <Wallet className="w-6 h-6 text-purple-600" />
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    ₵{platformStats.totalPayouts.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Total Payouts Processed</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Trend */}
                <div className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Revenue Trend</h2>
                <div className="h-80">
                    <Line data={revenueChartData} options={chartOptions} />
                </div>
                </div>

                {/* Revenue by Category */}
                <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Revenue by Category</h2>
                <div className="h-80">
                    <Doughnut data={categoryChartData} options={doughnutOptions} />
                </div>
                </div>
            </div>

            {/* Top Organizers */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Top Revenue Organizers</h2>
                <Link href="/admin/users" className="text-primary text-sm font-medium hover:underline">
                    View All
                </Link>
                </div>
                <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-neutral-900">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Organizer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Events</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Platform Fees</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {topOrganizers.map((organizer) => (
                        <tr key={organizer.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800">
                        <td className="px-6 py-4">
                            <div className="flex items-center">
                            <div className="w-8 h-8 bg-gray-200 dark:bg-neutral-700 rounded-full mr-3" />
                            <span className="font-medium text-gray-900 dark:text-gray-100">{organizer.name}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{organizer.eventsCount}</td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                            ₵{organizer.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-green-600 dark:text-green-400 font-medium">
                            ₵{organizer.platformFees.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4">
                            <button className="text-primary text-sm font-medium hover:underline">
                            View Details
                            </button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'transactions' && (
          <TransactionsView transactions={allTransactions} />
      )}

      {activeTab === 'payouts' && (
          <PayoutsView payouts={allPayouts} />
      )}
    </div>
  );
}

// Subcomponents for cleaner code (could be separate files, but keeping here for single-file task simplicity)
function TransactionsView({ transactions }: { transactions: any[] }) {
    const [filter, setFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'FAILED'>('ALL');
    const [search, setSearch] = useState('');

    const filtered = transactions.filter(tx => {
        const matchesFilter = filter === 'ALL' || tx.status === filter;
        const matchesSearch = 
          (tx.client_reference || '').toLowerCase().includes(search.toLowerCase()) ||
          (tx.hubtel_checkout_id || '').toLowerCase().includes(search.toLowerCase()) ||
          tx.amount.toString().includes(search);
        return matchesFilter && matchesSearch;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PAID': return 'bg-green-100 text-green-800 border-green-200';
            case 'PENDING': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'FAILED': return 'bg-red-100 text-red-800 border-red-200';
            case 'REFUNDED': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search reference, amount..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-900 dark:text-gray-100"
                    />
                </div>
                <div className="flex gap-2">
                    {['ALL', 'PAID', 'PENDING', 'FAILED'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setFilter(s as any)}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                                filter === s 
                                    ? 'bg-gray-900 text-white dark:bg-white dark:text-black' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-300 dark:hover:bg-neutral-700'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/50 dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Reference</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Type</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Amount</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300">Date</th>
                                <th className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No transactions found.
                                    </td> 
                                </tr>
                            ) : (
                                filtered.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-neutral-800 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 dark:text-gray-100">{tx.client_reference}</div>
                                            <div className="text-xs text-gray-500 font-mono mt-0.5">{tx.hubtel_checkout_id || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 text-xs font-medium">
                                                {tx.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-900 dark:text-gray-100">₵ {tx.amount.toFixed(2)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(tx.status)}`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                            {new Date(tx.created_at).toLocaleDateString()}
                                            <div className="text-xs">{new Date(tx.created_at).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-primary hover:text-primary-dark font-medium text-xs">
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function PayoutsView({ payouts }: { payouts: any[] }) {
    // Reusing the Payouts table logic from the original page but full list
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">All Payout Requests</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Automated payouts via Hubtel API</p>
          </div>
        </div>
        <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-neutral-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payout ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Organizer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
              {payouts.length === 0 ? (
                   <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                            No payouts found.
                        </td> 
                    </tr>
              ) : (
                  payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800">
                    <td className="px-6 py-4 font-medium text-primary">{payout.id}</td>
                    <td className="px-6 py-4 text-gray-900 dark:text-gray-100">{payout.organizerName}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
                        ₵{payout.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {new Date(payout.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            payout.status === 'completed' ? 'bg-green-100 text-green-800' :
                            payout.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100'
                        }`}>
                        {payout.status}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        <Link 
                        href={`/admin/finances/payouts?id=${payout.id}`}
                        className="text-primary text-sm font-medium hover:underline"
                        >
                        View Details
                        </Link>
                    </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
}
