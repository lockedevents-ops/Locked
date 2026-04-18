"use client";

import React, { useState, useEffect } from "react";
import {
  Line,
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
} from 'chart.js';
import {
  Wallet,
  Calendar,
  Download,
  CreditCard,
  Filter,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  Clock,
  FileText,
  ChevronLeft,
  CircleDollarSign,
  X,
  Plus,
  Building2,
  Smartphone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Pencil,
  Trash2,
  Edit,
  RefreshCw,
  TrendingUp,
  ArrowDownToLine
} from 'lucide-react';
import { financialAnalyticsService, type FinancialMetrics } from '@/services/analyticsService';
import { verificationService } from '@/services/verificationService';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client/client';
import { useToast } from '@/hooks/useToast';
import { PageLoader } from '@/components/loaders/PageLoader';

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
  ArcElement
);

// TypeScript Interfaces
interface PaymentMethod {
  id: string;
  method_type: 'bank_account' | 'mobile_money';
  provider: string;
  account_number: string;
  account_name: string;
  bank_name?: string;
  is_default: boolean;
  created_at: string;
}

interface WithdrawalRequest {
  amount: number;
  payment_method_id: string;
  notes?: string;
}

const MINIMUM_WITHDRAWAL = 50; // ₵50 minimum
// NOTE: Platform fee (5%) is deducted at ticket purchase, NOT at withdrawal

// Helper function for payout status badge styling
const getPayoutStatusBadge = (status: string) => {
  switch(status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'processing':
      return 'bg-blue-100 text-blue-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function FinancesPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();
  const toast = useToast();
  
  const [timeRange, setTimeRange] = useState("30days");
  const [showTimeRangeSelector, setShowTimeRangeSelector] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [showTransactionFilter, setShowTransactionFilter] = useState(false);
  const [currentTransactionsPage, setCurrentTransactionsPage] = useState(1);
  const [financialData, setFinancialData] = useState<FinancialMetrics>({
    balance: 0,
    pendingAmount: 0,
    lifetimeRevenue: 0,
    totalFees: 0,
    totalWithdrawn: 0, // Track total amount withdrawn
    revenueByMonth: [],
    eventRevenue: [],
    transactions: [],
    payouts: [],
    loading: true
  });
  
  // Withdrawal Modal State
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalNotes, setWithdrawalNotes] = useState('');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
  const [withdrawalProcessing, setWithdrawalProcessing] = useState(false);
  
  // Payment Methods State
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  
  // Add Payment Method Form State
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    method_type: 'bank_account' as 'bank_account' | 'mobile_money',
    provider: '',
    account_number: '',
    account_name: '',
    bank_name: ''
  });
  
  // Payout History State
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [payoutHistoryLoading, setPayoutHistoryLoading] = useState(false);
  
  // Confirmation Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<string | null>(null);
  const [showDefaultConfirm, setShowDefaultConfirm] = useState(false);
  const [methodToSetDefault, setMethodToSetDefault] = useState<string | null>(null);
  
  const timeRangeOptions = [
    { value: "7days", label: "Last 7 days" },
    { value: "30days", label: "Last 30 days" },
    { value: "90days", label: "Last 90 days" },
    { value: "year", label: "This year" },
    { value: "custom", label: "Custom range" },
  ];

  // Load financial data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user?.id) {
          setFinancialData(prev => ({ ...prev, loading: false, error: 'Authentication required' }));
          return;
        }
        const data = await financialAnalyticsService.getFinancialAnalytics(user.id);
        setFinancialData(data);
      } catch (err) {
        console.error('Error loading financial data:', err);
        setFinancialData(prev => ({ ...prev, loading: false, error: 'Failed to load financial data' }));
      }
    };

    if (authLoading) return;
    loadData();
  }, [user?.id, authLoading]);
  
  // Load payment methods
  useEffect(() => {
    if (authLoading || !user?.id) {
      setPaymentMethodsLoading(false);
      setPayoutHistoryLoading(false);
      return;
    }

    loadPaymentMethods();
    loadPayoutHistory();
  }, [user?.id, authLoading]);
  
  const loadPaymentMethods = async () => {
    if (!user?.id) return;
    
    setPaymentMethodsLoading(true);
    try {
      // Get organizer ID - use maybeSingle() to avoid 406 errors
      const { data: organizerData, error: organizerError } = await supabase
        .from('organizers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to handle missing profiles gracefully
      
      if (organizerError) {
        console.error('Error fetching organizer:', organizerError);
        throw organizerError;
      }

      // If no organizer profile exists, show empty state
      if (!organizerData) {
        console.log('No organizer profile found for user:', user.id);
        setPaymentMethods([]);
        setPaymentMethodsLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('organizer_id', organizerData.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setPaymentMethods(data || []);
      
      // Set default payment method as selected
      const defaultMethod = data?.find((pm: PaymentMethod) => pm.is_default);
      if (defaultMethod) {
        setSelectedPaymentMethodId(defaultMethod.id);
      } else if (data && data.length > 0) {
        setSelectedPaymentMethodId(data[0].id);
      }
    } catch (err) {
      console.error('Error loading payment methods:', err);
      toast.showError('Loading Error', 'Failed to load payment methods');
    } finally {
      setPaymentMethodsLoading(false);
    }
  };
  
  const loadPayoutHistory = async () => {
    if (!user?.id) return;
    
    setPayoutHistoryLoading(true);
    try {
      // Get organizer ID
      const { data: organizerData, error: organizerError } = await supabase
        .from('organizers')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (organizerError) throw organizerError;
      
      // Get payout requests with payment method details
      const { data, error } = await supabase
        .from('payout_requests')
        .select(`
          *,
          payment_method:payment_methods(
            method_type,
            provider,
            account_number,
            bank_name
          )
        `)
        .eq('organizer_id', organizerData.id)
        .order('requested_at', { ascending: false });
      
      if (error) throw error;
      
      setPayoutHistory(data || []);
    } catch (err) {
      console.error('Error loading payout history:', err);
      toast.showError('Loading Error', 'Failed to load payout history');
    } finally {
      setPayoutHistoryLoading(false);
    }
  };
  
  // Handle withdrawal request
  const handleWithdrawal = async () => {
    if (!user?.id) {
      toast.showError('Authentication Required', 'Please sign in to make a withdrawal');
      return;
    }
    
    const amount = parseFloat(withdrawalAmount);
    
    // Validations
    if (isNaN(amount) || amount <= 0) {
      toast.showError('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    
    if (amount < MINIMUM_WITHDRAWAL) {
      toast.showError('Minimum Amount', `Minimum withdrawal amount is ₵${MINIMUM_WITHDRAWAL}`);
      return;
    }
    
    if (amount > balance) {
      toast.showError('Insufficient Balance', 'Insufficient balance');
      return;
    }
    
    if (!selectedPaymentMethodId) {
      toast.showError('Payment Method Required', 'Please select a payment method');
      return;
    }
    
    setWithdrawalProcessing(true);
    
    try {
      // Get organizer ID
      const { data: organizerData, error: organizerError } = await supabase
        .from('organizers')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (organizerError) throw organizerError;
      
      // Create payout request
      const { data: payoutData, error: payoutError } = await supabase
        .from('payout_requests')
        .insert({
          organizer_id: organizerData.id,
          amount: amount,
          payment_method_id: selectedPaymentMethodId,
          status: 'pending',
          requested_at: new Date().toISOString(),
          notes: withdrawalNotes || null
        })
        .select()
        .single();
      
      if (payoutError) throw payoutError;
      
      toast.showSuccess('Request Submitted', 'Withdrawal request submitted successfully');
      
      // Reset form and close modal
      setWithdrawalAmount('');
      setWithdrawalNotes('');
      setShowWithdrawalModal(false);
      
      // Reload financial data and payout history
      const data = await financialAnalyticsService.getFinancialAnalytics(user.id);
      setFinancialData(data);
      loadPayoutHistory();
      
    } catch (err: any) {
      console.error('Error processing withdrawal:', err);
      toast.showError('Withdrawal Failed', err.message || 'Failed to process withdrawal request');
    } finally {
      setWithdrawalProcessing(false);
    }
  };
  
  const [isAddingPaymentMethod, setIsAddingPaymentMethod] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null);

  // Reset verification when inputs change

  // Bank Options with Hubtel Codes
  const bankOptions = [
    { name: "GCB Bank", code: "300304" },
    { name: "Ecobank", code: "300312" },
    { name: "Stanbic Bank", code: "300318" },
    { name: "Fidelity Bank", code: "300323" },
    { name: "Access Bank", code: "300329" },
    { name: "CalBank", code: "300313" },
    { name: "Zenith Bank", code: "300311" },
    { name: "GTBank", code: "300322" },
    { name: "Standard Chartered", code: "300302" },
    { name: "Absa Bank", code: "300303" },
  ];

  // Handle Verification
  const verifyAccount = async (accountNumber?: string, bankName?: string, providerName?: string) => {
    const accNum = accountNumber || newPaymentMethod.account_number;
    const bank = bankName || newPaymentMethod.bank_name;
    const provider = providerName || newPaymentMethod.provider;

    if (!accNum || accNum.length < 10) return;

    // Don't auto-verify if bank/provider is missing
    if (newPaymentMethod.method_type === 'bank_account' && !bank) return;
    if (newPaymentMethod.method_type === 'mobile_money' && !provider) return;

    setIsVerifying(true);
    let resolvedName: string | null = null;

    try {
        if (newPaymentMethod.method_type === 'bank_account') {
            const bankObj = bankOptions.find(b => b.name === bank);
            if (bankObj) {
                resolvedName = await verificationService.resolveBankAccount(bankObj.code, accNum);
            }
        } else {
            resolvedName = await verificationService.resolveMobileMoney(provider!, accNum);
        }

        if (resolvedName) {
            setVerifiedName(resolvedName);
            setNewPaymentMethod(prev => ({ ...prev, account_name: resolvedName! }));
            toast.showSuccess('Verified', `Account verified: ${resolvedName}`);
        } else {
            setVerifiedName(null);
            // Only show error if explicitly called or if input length is exactly 10 (likely finished typing)
             if (accNum.length === 10) {
                 toast.showError('Verification Failed', 'Could not verify account details.');
             }
        }
    } catch (error) {
        console.error(error);
        if (accNum.length === 10) {
            toast.showError('Error', 'Verification service failed');
        }
    } finally {
        setIsVerifying(false);
    }
  };

  // Auto-trigger verification
  useEffect(() => {
    if (newPaymentMethod.account_number.length === 10 && !editingMethodId) {
        verifyAccount();
    } else if (newPaymentMethod.account_number.length < 10 && verifiedName) {
        setVerifiedName(null);
        setNewPaymentMethod(prev => ({ ...prev, account_name: '' }));
    }
  }, [newPaymentMethod.account_number, newPaymentMethod.bank_name, newPaymentMethod.provider]);

  // Handle edit payment method click
  const handleEditClick = (method: PaymentMethod) => {
    setEditingMethodId(method.id);
    setNewPaymentMethod({
      method_type: method.method_type,
      provider: method.provider,
      account_number: method.account_number,
      account_name: method.account_name,
      bank_name: method.bank_name || ''
    });
    setShowAddPaymentMethod(true);
  };

  // Handle add/update payment method
  const handleSavePaymentMethod = async () => {
    console.log('handleSavePaymentMethod called', newPaymentMethod);
    
    if (isAddingPaymentMethod) return;

    if (!user?.id) {
      console.log('User not authenticated');
      toast.showError('Authentication Required', 'Please sign in to manage payment methods');
      return;
    }
    
    // Validations
    if (!newPaymentMethod.account_number || !newPaymentMethod.account_name) {
      console.log('Missing account number or name');
      toast.showError('Required Fields', 'Please fill in all required fields');
      return;
    }
    
    if (newPaymentMethod.method_type === 'bank_account' && !newPaymentMethod.bank_name) {
      console.log('Missing bank name');
      toast.showError('Bank Required', 'Please select a bank');
      return;
    }
    
    if (newPaymentMethod.method_type === 'mobile_money' && !newPaymentMethod.provider) {
      console.log('Missing provider');
      toast.showError('Provider Required', 'Please select a mobile money provider');
      return;
    }
    
    // Start loading
    setIsAddingPaymentMethod(true);

    try {
      if (editingMethodId) {
        // UPDATE existing method
        console.log('Updating payment method:', editingMethodId);
        
        const payload = {
            method_type: newPaymentMethod.method_type,
            provider: newPaymentMethod.provider || newPaymentMethod.bank_name,
            account_number: newPaymentMethod.account_number,
            account_name: newPaymentMethod.account_name,
            bank_name: newPaymentMethod.method_type === 'bank_account' ? newPaymentMethod.bank_name : null,
            // Don't update is_default or organizer_id
        };

        const { error } = await supabase
          .from('payment_methods')
          .update(payload)
          .eq('id', editingMethodId);
        
        if (error) {
            console.error('Supabase update error:', error);
            throw error;
        }
        
        toast.showSuccess('Payment Method Updated', 'Payment method updated successfully');

      } else {
        // INSERT new method
        console.log('Fetching organizer profile...');
        // Get organizer ID
        const { data: organizerData, error: organizerError } = await supabase
          .from('organizers')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (organizerError) {
            console.error('Error fetching organizer:', organizerError);
            throw new Error('Could not find organizer profile: ' + organizerError.message);
        }
        
        console.log('Organizer found:', organizerData.id);

        // Check if this is the first payment method (make it default)
        const isFirstMethod = paymentMethods.length === 0;
        
        const payload = {
            organizer_id: organizerData.id,
            method_type: newPaymentMethod.method_type,
            provider: newPaymentMethod.provider || newPaymentMethod.bank_name,
            account_number: newPaymentMethod.account_number,
            account_name: newPaymentMethod.account_name,
            bank_name: newPaymentMethod.method_type === 'bank_account' ? newPaymentMethod.bank_name : null,
            is_default: isFirstMethod
        };

        console.log('Inserting payment method:', payload);

        const { data, error } = await supabase
          .from('payment_methods')
          .insert(payload)
          .select()
          .single();
        
        if (error) {
            console.error('Supabase insert error:', error);
            throw error;
        }
      }
      
      if (!editingMethodId) {
         toast.showSuccess('Payment Method Added', 'Payment method added successfully! Ready to use for withdrawals.');
      }
      
      // Reset form and reload payment methods
      setNewPaymentMethod({
        method_type: 'bank_account',
        provider: '',
        account_number: '',
        account_name: '',
        bank_name: ''
      });
      setEditingMethodId(null);
      setShowAddPaymentMethod(false);
      loadPaymentMethods();
      
    } catch (err: any) {
      console.error('Error saving payment method:', err);
      toast.showError('Operation Failed', err.message || 'Failed to save payment method');
    } finally {
        setIsAddingPaymentMethod(false);
    }
  };
  
  // Handle set default payment method
  const handleSetDefaultPaymentMethod = async (methodId: string) => {
    if (!user?.id) return;
    
    // Show confirmation modal
    setMethodToSetDefault(methodId);
    setShowDefaultConfirm(true);
  };
  
  // Confirm set default
  const confirmSetDefault = async () => {
    console.log('confirmSetDefault called for method:', methodToSetDefault);
    
    if (!user?.id || !methodToSetDefault) {
      console.log('Missing user or method ID');
      return;
    }
    
    try {
      console.log('Fetching organizer...');
      // Get organizer ID
      const { data: organizerData, error: organizerError } = await supabase
        .from('organizers')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (organizerError) {
        console.error('Error fetching organizer:', organizerError);
        throw organizerError;
      }
      
      console.log('Organizer found:', organizerData.id);

      // Remove default from all methods
      console.log('Clearing existing defaults...');
      const { error: clearError } = await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('organizer_id', organizerData.id);
        
      if (clearError) {
          console.error('Error clearing defaults:', clearError);
          throw clearError;
      }
      
      // Set new default
      console.log('Setting new default:', methodToSetDefault);
      const { error: setError } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', methodToSetDefault);
      
      if (setError) {
          console.error('Error setting new default:', setError);
          throw setError;
      }
      
      console.log('Default updated successfully');
      toast.showSuccess('Default Updated', 'Default payment method updated');
      loadPaymentMethods();
      
    } catch (err: any) {
      console.error('Error setting default payment method:', err);
      toast.showError('Update Failed', err.message || 'Failed to update default payment method');
    } finally {
      setShowDefaultConfirm(false);
      setMethodToSetDefault(null);
      setSettingDefaultId(null);
    }
  };
  
  // Handle delete payment method
  const handleDeletePaymentMethod = async (methodId: string) => {
    if (!user?.id) return;
    
    // Show confirmation modal
    setMethodToDelete(methodId);
    setShowDeleteConfirm(true);
  };
  
  // Confirm delete
  const confirmDelete = async () => {
    if (!user?.id || !methodToDelete) return;
    
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', methodToDelete);
      
      if (error) throw error;
      
      toast.showSuccess('Method Deleted', 'Payment method deleted');
      loadPaymentMethods();
      
    } catch (err: any) {
      console.error('Error deleting payment method:', err);
      toast.showError('Delete Failed', err.message || 'Failed to delete payment method');
    } finally {
      setShowDeleteConfirm(false);
      setMethodToDelete(null);
    }
  };

  // Extract values from financial data
  const { balance, pendingAmount, lifetimeRevenue, totalFees, totalWithdrawn, revenueByMonth, eventRevenue, transactions, payouts, loading, error } = financialData;

  // Chart data for revenue
  const revenueChartData = {
    labels: revenueByMonth.map(item => item.month),
    datasets: [
      {
        label: 'Revenue',
        data: revenueByMonth.map(item => item.revenue),
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        tension: 0.3,
        fill: true
      }
    ]
  };

  // Chart data for revenue by event
  const eventRevenueData = {
    labels: eventRevenue.map(item => item.eventTitle),
    datasets: [
      {
        data: eventRevenue.map(item => item.revenue),
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
        ],
        borderWidth: 1,
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
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 15,
          font: {
            size: 12
          }
        }
      }
    },
    cutout: '70%',
  };
  
  // Filter transactions based on the selected filter
  const filteredTransactions = transactions.filter(transaction => {
    if (transactionFilter === 'all') return true;
    if (transactionFilter === 'sales' && transaction.amount > 0) return true;
    if (transactionFilter === 'payouts' && transaction.amount < 0) return true;
    if (transactionFilter === 'pending' && transaction.status === 'pending') return true;
    return false;
  });
  
  // Pagination for transactions
  const transactionsPerPage = 5;
  const indexOfLastTransaction = currentTransactionsPage * transactionsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction);
  const totalTransactionsPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
  
  // Handle page change for transactions
  const handleTransactionsPageChange = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalTransactionsPages) return;
    setCurrentTransactionsPage(pageNumber);
  };

  // Handle transaction status badge style
  const getTransactionStatusBadge = (status: string) => {
    switch(status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Financial Management</h1>
        <PageLoader message="Loading financial data..." />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Financial Management</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-700 font-medium">Error</div>
          <div className="text-red-600 text-sm mt-1">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with title and time range filter */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold">Financial Management</h1>
        
        <div className="relative">
          <button
            onClick={() => setShowTimeRangeSelector(!showTimeRangeSelector)}
            className="flex items-center gap-2 bg-white border border-neutral-200 rounded-md px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
          >
            <Calendar className="h-4 w-4" />
            {timeRangeOptions.find(option => option.value === timeRange)?.label}
            <ChevronDown className="h-4 w-4" />
          </button>
          
          {showTimeRangeSelector && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-10 w-48">
              <div className="py-1">
                {timeRangeOptions.map(option => (
                  <button
                    key={option.value}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 ${
                      timeRange === option.value ? 'bg-neutral-50 text-primary font-medium' : 'text-neutral-700'
                    }`}
                    onClick={() => {
                      setTimeRange(option.value);
                      setShowTimeRangeSelector(false);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Financial Summary Cards - 4 Card Layout with Reduced Height */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Earnings */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-600">Total Earnings</span>
            <CircleDollarSign className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            ₵{lifetimeRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
          <p className="text-xs text-neutral-500 mt-1">Gross revenue</p>
        </div>
        
        {/* Card 2: Available Balance */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-600">Available Balance</span>
            <Wallet className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">
            ₵{balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
          <p className="text-xs text-neutral-500 mt-1">Ready to withdraw</p>
        </div>
        
        {/* Card 3: Total Withdrawn */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-600">Total Withdrawn</span>
            <ArrowDownToLine className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            ₵{totalWithdrawn.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
          <p className="text-xs text-neutral-500 mt-1">Lifetime withdrawals</p>
        </div>
        
        {/* Card 4: Platform Fees */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-neutral-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-neutral-600">Platform Fees</span>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-600">
            ₵{totalFees.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </div>
          <p className="text-xs text-neutral-500 mt-1">Deducted at purchase</p>
        </div>
      </div>
      
      {/* Withdraw Button */}
      <div className="flex justify-end">
        <button 
          onClick={() => setShowWithdrawalModal(true)}
          disabled={false}
          className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2 cursor-pointer"
        >
          <ArrowDownToLine className="h-4 w-4" />
          Request Payout
        </button>
      </div>

      {/* Revenue Chart and Event Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white p-4 sm:p-5 rounded-lg shadow-sm border border-neutral-100 lg:col-span-2">
          <h3 className="font-semibold mb-4">Revenue Trend</h3>
          <div className="h-64 sm:h-72 overflow-hidden">
            <Line data={revenueChartData} options={chartOptions} />
          </div>
        </div>
        
        {/* Event Revenue Breakdown */}
        <div className="bg-white p-4 sm:p-5 rounded-lg shadow-sm border border-neutral-100">
          <h3 className="font-semibold mb-4">Revenue by Event</h3>
          <div className="h-64 sm:h-72 overflow-hidden">
            <Doughnut data={eventRevenueData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Transactions Section */}
      <div className="bg-white p-4 sm:p-5 rounded-lg shadow-sm border border-neutral-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h3 className="font-semibold">Transaction History</h3>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            {/* Filter dropdown */}
            <div className="relative w-full sm:w-auto">
              <button
                onClick={() => setShowTransactionFilter(!showTransactionFilter)}
                className="flex items-center justify-between w-full sm:w-auto gap-2 bg-white border border-neutral-200 rounded-md px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="truncate">
                    {transactionFilter === 'all' ? 'All Transactions' :
                     transactionFilter === 'sales' ? 'Sales Only' :
                     transactionFilter === 'payouts' ? 'Payouts Only' :
                     'Pending Only'}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              </button>
              
              {showTransactionFilter && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-neutral-200 rounded-md shadow-lg z-10 w-48">
                  <div className="py-1">
                    <button
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 ${
                        transactionFilter === 'all' ? 'bg-neutral-50 text-primary font-medium' : 'text-neutral-700'
                      }`}
                      onClick={() => {
                        setTransactionFilter('all');
                        setShowTransactionFilter(false);
                      }}
                    >
                      All Transactions
                    </button>
                    <button
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 ${
                        transactionFilter === 'sales' ? 'bg-neutral-50 text-primary font-medium' : 'text-neutral-700'
                      }`}
                      onClick={() => {
                        setTransactionFilter('sales');
                        setShowTransactionFilter(false);
                      }}
                    >
                      Sales Only
                    </button>
                    <button
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 ${
                        transactionFilter === 'payouts' ? 'bg-neutral-50 text-primary font-medium' : 'text-neutral-700'
                      }`}
                      onClick={() => {
                        setTransactionFilter('payouts');
                        setShowTransactionFilter(false);
                      }}
                    >
                      Payouts Only
                    </button>
                    <button
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-neutral-50 ${
                        transactionFilter === 'pending' ? 'bg-neutral-50 text-primary font-medium' : 'text-neutral-700'
                      }`}
                      onClick={() => {
                        setTransactionFilter('pending');
                        setShowTransactionFilter(false);
                      }}
                    >
                      Pending Only
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Export button */}
            <button className="flex items-center justify-center gap-2 bg-white border border-neutral-200 rounded-md px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 w-full sm:w-auto cursor-pointer">
              <Download className="h-4 w-4 flex-shrink-0" />
              <span>Export</span>
            </button>
          </div>
        </div>
        
        {/* Transactions Table - Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Transaction ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Fee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {currentTransactions.map(transaction => (
                <tr key={transaction.id} className="hover:bg-neutral-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                    {transaction.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-800">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                    {transaction.customer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={transaction.amount < 0 ? "text-red-600" : "text-green-600"}>
                      {transaction.amount < 0 ? '-' : ''}₵{Math.abs(transaction.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                    ₵{transaction.fee.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTransactionStatusBadge(transaction.status)}`}>
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
              
              {currentTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-neutral-500">
                    No transactions found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Transactions Cards - Mobile/Tablet */}
        <div className="lg:hidden space-y-4">
          {currentTransactions.length > 0 ? (
            currentTransactions.map(transaction => (
              <div key={transaction.id} className="bg-white border border-neutral-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-sm font-medium text-primary mb-1">
                      {transaction.id}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {new Date(transaction.date).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTransactionStatusBadge(transaction.status)}`}>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="text-neutral-500 flex-shrink-0">Description:</span>
                    <span className="text-neutral-800 break-words">{transaction.description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Customer:</span>
                    <span className="text-neutral-500 text-right truncate max-w-[60%]">{transaction.customer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Amount:</span>
                    <span className={`font-medium text-right ${transaction.amount < 0 ? "text-red-600" : "text-green-600"}`}>
                      {transaction.amount < 0 ? '-' : ''}₵{Math.abs(transaction.amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Fee:</span>
                    <span className="text-neutral-500 text-right">
                      ₵{transaction.fee.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white border border-neutral-200 rounded-lg p-8 text-center text-neutral-500">
              No transactions found matching your filters.
            </div>
          )}
        </div>
        
        {/* Pagination for transactions */}
        {totalTransactionsPages > 1 && (
          <div className="flex justify-center mt-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleTransactionsPageChange(currentTransactionsPage - 1)}
                disabled={currentTransactionsPage === 1}
                className={`p-2 rounded-md border ${
                  currentTransactionsPage === 1 
                    ? 'text-neutral-300 border-neutral-200 cursor-not-allowed' 
                    : 'text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {[...Array(totalTransactionsPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleTransactionsPageChange(i + 1)}
                  className={`px-3 py-1 rounded-md ${
                    currentTransactionsPage === i + 1 
                      ? 'bg-primary text-white' 
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              
              <button
                onClick={() => handleTransactionsPageChange(currentTransactionsPage + 1)}
                disabled={currentTransactionsPage === totalTransactionsPages}
                className={`p-2 rounded-md border ${
                  currentTransactionsPage === totalTransactionsPages 
                    ? 'text-neutral-300 border-neutral-200 cursor-not-allowed' 
                    : 'text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Financial Reports */}
      <div className="bg-white p-4 sm:p-5 rounded-lg shadow-sm border border-neutral-100">
        <h3 className="font-semibold mb-4">Financial Reports & Documents</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium">Monthly Revenue Report</h4>
                <p className="text-sm text-neutral-500">April 2024</p>
              </div>
            </div>
            <button className="mt-3 w-full text-center py-1.5 text-sm border border-neutral-300 rounded-md hover:bg-neutral-100 cursor-pointer">
              Download PDF
            </button>
          </div>
          
          <div className="p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 text-green-600 rounded">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium">Tax Summary</h4>
                <p className="text-sm text-neutral-500">Q1 2024</p>
              </div>
            </div>
            <button className="mt-3 w-full text-center py-1.5 text-sm border border-neutral-300 rounded-md hover:bg-neutral-100">
              Download PDF
            </button>
          </div>
          
          <div className="p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium">Annual Statement</h4>
                <p className="text-sm text-neutral-500">2023</p>
              </div>
            </div>
            <button className="mt-3 w-full text-center py-1.5 text-sm border border-neutral-300 rounded-md hover:bg-neutral-100">
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Payment Methods Section */}
      <div className="bg-white p-4 sm:p-5 rounded-lg shadow-sm border border-neutral-100">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h3 className="font-semibold">Payment Methods</h3>
          <button 
            onClick={() => {
              setNewPaymentMethod({
                method_type: 'bank_account',
                provider: '',
                account_number: '',
                account_name: '',
                bank_name: ''
              });
              setEditingMethodId(null);
              setShowAddPaymentMethod(true);
            }}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark font-medium w-full sm:w-auto text-center cursor-pointer flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Payment Method
          </button>
        </div>
        
        {paymentMethodsLoading ? (
          <PageLoader message="Loading payment methods..." />
        ) : paymentMethods.length === 0 ? (
          <div className="text-center py-8 text-neutral-500">
            <p>No payment methods added yet.</p>
            <button 
              onClick={() => {
              setNewPaymentMethod({
                method_type: 'bank_account',
                provider: '',
                account_number: '',
                account_name: '',
                bank_name: ''
              });
              setEditingMethodId(null);
              setShowAddPaymentMethod(true);
            }}
              className="mt-4 text-primary font-medium hover:underline"
            >
              Add your first payment method
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-4 border border-neutral-200 rounded-lg gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-neutral-100 rounded flex-shrink-0">
                    {method.method_type === 'bank_account' ? (
                      <Building2 className="h-6 w-6" />
                    ) : (
                      <Smartphone className="h-6 w-6" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium">
                      {method.method_type === 'bank_account' ? 'Bank Account' : 'Mobile Money'}
                      {method.is_default && ' (Primary)'}
                    </h4>
                    <p className="text-sm text-neutral-500 truncate">
                      {method.provider} •••• {method.account_number.slice(-4)}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">{method.account_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {method.is_default ? (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">Default</span>
                  ) : (
                    <button
                      onClick={() => handleSetDefaultPaymentMethod(method.id)}
                      disabled={settingDefaultId === method.id}
                      className="px-2 py-0.5 text-xs rounded-full border border-neutral-300 hover:bg-neutral-50 cursor-pointer flex items-center gap-1"
                    >
                      {settingDefaultId === method.id && <RefreshCw className="h-3 w-3 animate-spin" />}
                      Set as Default
                    </button>
                  )}
                    <button
                      onClick={() => handleEditClick(method)}
                      className="text-neutral-500 hover:text-neutral-700 cursor-pointer mr-2"
                      title="Edit payment method"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeletePaymentMethod(method.id)}
                    disabled={method.is_default}
                    className={`${method.is_default ? 'text-neutral-300 cursor-not-allowed' : 'text-red-500 hover:text-red-700 cursor-pointer'}`}
                    title={method.is_default ? 'Cannot delete default payment method' : 'Delete payment method'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Withdrawal Modal */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-200">
              <h2 className="text-xl font-bold">Withdraw Funds</h2>
              <button 
                onClick={() => setShowWithdrawalModal(false)}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Balance Info */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Available to Withdraw</span>
                  <span className="text-2xl font-bold text-primary">
                    ₵{balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  Minimum withdrawal: ₵{MINIMUM_WITHDRAWAL} • No additional fees
                </p>
              </div>
              
              {/* Amount Input */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Withdrawal Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">₵</span>
                  <input
                    type="number"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    placeholder="0.00"
                    min={MINIMUM_WITHDRAWAL}
                    max={balance}
                    step="0.01"
                    className="w-full pl-8 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                {withdrawalAmount && parseFloat(withdrawalAmount) > 0 && (
                  <p className="text-sm text-green-600 font-medium mt-2">
                    You will receive: ₵{parseFloat(withdrawalAmount).toFixed(2)}
                    <span className="text-xs ml-1 text-neutral-500">(subject to network charges)</span>
                  </p>
                )}
              </div>
              
              {/* Payment Method Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                {paymentMethods.length === 0 ? (
                  <div className="text-center p-4 border-2 border-dashed border-neutral-300 rounded-lg">
                    <p className="text-neutral-500 mb-2">No payment methods available</p>
                    <button
                      onClick={() => {
                        setShowWithdrawalModal(false);
                        setShowAddPaymentMethod(true);
                      }}
                      className="text-primary font-medium hover:underline cursor-pointer"
                    >
                      Add a payment method
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        onClick={() => setSelectedPaymentMethodId(method.id)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedPaymentMethodId === method.id
                            ? 'border-primary bg-primary/5'
                            : 'border-neutral-200 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded ${
                            selectedPaymentMethodId === method.id ? 'bg-primary/20' : 'bg-neutral-100'
                          }`}>
                            {method.method_type === 'bank_account' ? (
                              <Building2 className="h-5 w-5" />
                            ) : (
                              <Smartphone className="h-5 w-5" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium flex items-center gap-2">
                              {method.method_type === 'bank_account' ? 'Bank Account' : 'Mobile Money'}
                              {method.is_default && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-neutral-600">
                              {method.provider} •••• {method.account_number.slice(-4)}
                            </p>
                            <p className="text-xs text-neutral-500">{method.account_name}</p>
                          </div>
                          {method.is_default && (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Notes (Optional) */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={withdrawalNotes}
                  onChange={(e) => setWithdrawalNotes(e.target.value)}
                  placeholder="Add any additional notes..."
                  rows={3}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-neutral-200">
              <button
                onClick={() => setShowWithdrawalModal(false)}
                className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawal}
                disabled={withdrawalProcessing || !withdrawalAmount || parseFloat(withdrawalAmount) < MINIMUM_WITHDRAWAL || !selectedPaymentMethodId}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {withdrawalProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Request Withdrawal'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Payment Method Modal */}
      {showAddPaymentMethod && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-200">
              <h2 className="text-xl font-bold">{editingMethodId ? 'Edit Payment Method' : 'Add Payment Method'}</h2>
              <button 
                onClick={() => {
                  setShowAddPaymentMethod(false);
                  setEditingMethodId(null);
                  setNewPaymentMethod({
                    method_type: 'bank_account',
                    provider: '',
                    account_number: '',
                    account_name: '',
                    bank_name: ''
                  });
                  setVerifiedName(null);
                }}
                className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-6">
              {/* Method Type Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-3">
                  Payment Method Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={newPaymentMethod.method_type}
                    onChange={(e) => setNewPaymentMethod({ 
                      ...newPaymentMethod, 
                      method_type: e.target.value as 'bank_account' | 'mobile_money',
                      // Reset provider/bank specific fields when switching
                      provider: '',
                      bank_name: ''
                    })}
                    className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer bg-white"
                  >
                    <option value="bank_account">Bank Account</option>
                    <option value="mobile_money">Mobile Money</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-neutral-500">
                    {newPaymentMethod.method_type === 'bank_account' ? (
                      <Building2 className="h-5 w-5" />
                    ) : (
                      <Smartphone className="h-5 w-5" />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Bank Account Form */}
              {newPaymentMethod.method_type === 'bank_account' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newPaymentMethod.bank_name}
                      onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, bank_name: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Select a bank</option>
                      <option value="GCB Bank">GCB Bank</option>
                      <option value="Ecobank">Ecobank Ghana</option>
                      <option value="Absa Bank">Absa Bank</option>
                      <option value="Stanbic Bank">Stanbic Bank</option>
                      <option value="Fidelity Bank">Fidelity Bank</option>
                      <option value="Zenith Bank">Zenith Bank</option>
                      <option value="Access Bank">Access Bank</option>
                      <option value="Guaranty Trust Bank">Guaranty Trust Bank (GTBank)</option>
                      <option value="Standard Chartered">Standard Chartered</option>
                      <option value="Societe Generale">Societe Generale Ghana</option>
                      <option value="CalBank">CalBank</option>
                      <option value="Republic Bank">Republic Bank</option>
                      <option value="First National Bank">First National Bank</option>
                      <option value="Prudential Bank">Prudential Bank</option>
                      <option value="National Investment Bank">National Investment Bank (NIB)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Account Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                        type="text"
                        value={newPaymentMethod.account_number}
                        onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, account_number: e.target.value })}
                        placeholder="1234567890"
                        maxLength={15}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${verifiedName ? 'border-green-500 bg-green-50' : 'border-neutral-300'}`}
                        />
                        {isVerifying && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-white pl-2">
                                <span className="text-xs text-neutral-500 font-medium">Verifying...</span>
                                <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                            </div>
                        )}
                        {verifiedName && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            </div>
                        )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Account Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newPaymentMethod.account_name}
                      onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, account_name: e.target.value })}
                      placeholder="John Doe"
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${verifiedName ? 'border-green-500 bg-green-50' : 'bg-neutral-100 border-neutral-300'}`}
                      readOnly={true}
                    />
                  </div>
                </>
              )}
              
              {/* Mobile Money Form */}
              {newPaymentMethod.method_type === 'mobile_money' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Mobile Money Provider <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newPaymentMethod.provider}
                      onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, provider: e.target.value })}
                      className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Select a provider</option>
                      <option value="MTN Mobile Money">MTN Mobile Money</option>
                      <option value="Telecel Cash">Telecel Cash</option>
                      <option value="AirtelTigo Money">AirtelTigo Money</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                        type="tel"
                        value={newPaymentMethod.account_number}
                        onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, account_number: e.target.value })}
                        placeholder="0241234567"
                        maxLength={10}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${verifiedName ? 'border-green-500 bg-green-50' : 'border-neutral-300'}`}
                        />
                         {isVerifying && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-white pl-2">
                                <span className="text-xs text-neutral-500 font-medium">Verifying...</span>
                                <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                            </div>
                        )}
                        {verifiedName && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            </div>
                        )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Account Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newPaymentMethod.account_name}
                      onChange={(e) => setNewPaymentMethod({ ...newPaymentMethod, account_name: e.target.value })}
                      placeholder="John Doe"
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${verifiedName ? 'border-green-500 bg-green-50' : 'bg-neutral-100 border-neutral-300'}`}
                      readOnly={true}
                    />
                  </div>
                </>
              )}
              
            </div>
            
            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-neutral-200">
              <button
                onClick={() => setShowAddPaymentMethod(false)}
                className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePaymentMethod}
                disabled={isAddingPaymentMethod || !newPaymentMethod.account_name}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 flex items-center justify-center gap-2"
              >
                {isAddingPaymentMethod ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Delete Payment Method</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              <p className="text-neutral-700 dark:text-neutral-300 mb-6">
                Are you sure you want to delete this payment method? You'll need to add it again if you want to use it for future withdrawals.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setMethodToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 font-medium text-neutral-900 dark:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium cursor-pointer"
                >
                  Delete Method
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Set Default Confirmation Modal */}
      {showDefaultConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Set Default Payment Method</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    Update your preferred withdrawal method
                  </p>
                </div>
              </div>
              <p className="text-neutral-700 dark:text-neutral-300 mb-6">
                This payment method will be automatically selected for all future withdrawal requests. You can change it anytime.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDefaultConfirm(false);
                    setMethodToSetDefault(null);
                  }}
                  className="flex-1 px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 font-medium text-neutral-900 dark:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setSettingDefaultId(methodToSetDefault);
                    confirmSetDefault();
                  }}
                  disabled={!!settingDefaultId}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {settingDefaultId ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Setting Default...
                    </>
                  ) : (
                    'Set as Default'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
