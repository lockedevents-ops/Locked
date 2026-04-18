"use client";

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { adminFinanceService, PayoutRequest } from '@/services/adminFinanceService';
import { useToast } from '@/hooks/useToast';


// Extended interface for UI display (adds computed fields)
interface PayoutRequestExtended extends PayoutRequest {
  payoutId: string; // Display ID (same as id or formatted)
  organizerEmail?: string; // Optional, may not be in base interface
  platformFee?: number; // Computed: 5% of amount
  netAmount?: number; // Computed: amount - platformFee
  payoutMethod?: string; // e.g., 'Bank Account', 'Mobile Money'
  accountDetails?: string; // Masked account info
  completedAt?: string;
  hubtelTransactionId?: string;
}

export default function PayoutsPage() {
  const toast = useToast();
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequestExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequestExtended | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const payoutsPerPage = 10;

  // Load payout requests from database
  useEffect(() => {
    loadPayouts();
  }, [statusFilter]);

  const loadPayouts = async () => {
    setIsLoading(true);
    try {
      const status = statusFilter === 'all' ? undefined : statusFilter as 'pending' | 'processing' | 'completed' | 'failed';
      const payouts = await adminFinanceService.getPayoutRequests(status);
      
      // Transform payouts to extended format with computed fields
      const extendedPayouts: PayoutRequestExtended[] = payouts.map(payout => {
        const platformFee = payout.amount * 0.05; // 5% platform fee
        const netAmount = payout.amount - platformFee;
        
        return {
          ...payout,
          payoutId: payout.id, // Use ID as display ID
          organizerEmail: '', // TODO: Fetch from organizer table if needed
          platformFee,
          netAmount,
          payoutMethod: payout.bankCode ? 'Bank Account' : 'Mobile Money',
          accountDetails: payout.accountNumber ? `•••• ${payout.accountNumber.slice(-4)}` : 'N/A',
          hubtelTransactionId: payout.hubtelReference,
        };
      });
      
      setPayoutRequests(extendedPayouts);
    } catch (error) {
      console.error('Failed to load payouts:', error);
      toast.showError('Load Failed', 'Failed to load payout requests');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter payouts
  const filteredPayouts = payoutRequests.filter(payout => {
    const matchesSearch = 
      payout.payoutId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payout.organizerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payout.organizerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === 'all' || payout.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPayouts.length / payoutsPerPage);
  const indexOfLastPayout = currentPage * payoutsPerPage;
  const indexOfFirstPayout = indexOfLastPayout - payoutsPerPage;
  const currentPayouts = filteredPayouts.slice(indexOfFirstPayout, indexOfLastPayout);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const handleRetry = async (payoutId: string) => {
    // Admin can manually trigger retry for failed payouts via Hubtel API
    try {
      toast.showInfo('Retrying Payout', 'Initiating payout via Hubtel...');
      
      const response = await fetch('/api/payouts/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payoutRequestId: payoutId })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        toast.showSuccess('Payout Initiated', 'Payout has been sent to Hubtel successfully');
        await loadPayouts(); // Refresh the list
      } else {
        toast.showError('Payout Failed', result.error || result.details || 'Failed to initiate payout');
      }
    } catch (error) {
      console.error('Retry error:', error);
      toast.showError('Retry Failed', 'Failed to initiate payout');
    }
  };


  const handleViewDetails = (payout: PayoutRequestExtended) => {
    setSelectedPayout(payout);
    setShowDetailsModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Payout Monitoring</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Monitor automated payouts processed via Hubtel API</p>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-gray-500 dark:text-gray-400">Loading payouts...</span>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by payout ID, organizer name, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {/* Export */}
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-neutral-800 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-neutral-700 transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>

              {/* Refresh */}
              <button 
                onClick={loadPayouts}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-100 dark:border-neutral-800 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {payoutRequests.filter(p => p.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Pending</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-100 dark:border-neutral-800 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {payoutRequests.filter(p => p.status === 'processing').length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Processing</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-100 dark:border-neutral-800 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {payoutRequests.filter(p => p.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Completed</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-100 dark:border-neutral-800 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {payoutRequests.filter(p => p.status === 'failed').length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Failed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
            {currentPayouts.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Payouts Found</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No payouts match your search criteria.' 
                    : 'No payout requests have been made yet.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-neutral-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payout ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Organizer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Requested</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                  {currentPayouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800">
                      <td className="px-6 py-4 font-medium text-primary">{payout.payoutId}</td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{payout.organizerName}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{payout.organizerEmail}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">₵{(payout.netAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Fee: ₵{(payout.platformFee ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                        <div>{payout.payoutMethod ?? 'N/A'}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">{payout.accountDetails ?? 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(payout.status)}`}>
                          {getStatusIcon(payout.status)}
                          {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(payout.requestedAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetails(payout)}
                            className="text-primary hover:text-primary-dark"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {payout.status === 'failed' && (
                            <button
                              onClick={() => handleRetry(payout.id)}
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Retry via Hubtel"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 dark:border-neutral-800 flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {indexOfFirstPayout + 1} to {Math.min(indexOfLastPayout, filteredPayouts.length)} of {filteredPayouts.length} payouts
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded border ${
                      currentPage === 1
                        ? 'text-gray-300 dark:text-gray-600 border-gray-200 dark:border-neutral-700 cursor-not-allowed'
                        : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => handlePageChange(i + 1)}
                      className={`px-3 py-1 rounded ${
                        currentPage === i + 1
                          ? 'bg-primary text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded border ${
                      currentPage === totalPages
                        ? 'text-gray-300 dark:text-gray-600 border-gray-200 dark:border-neutral-700 cursor-not-allowed'
                        : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPayout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-neutral-800">
            <div className="p-6 border-b border-gray-200 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Payout Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Payout ID</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{selectedPayout.payoutId}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(selectedPayout.status)}`}>
                    {getStatusIcon(selectedPayout.status)}
                    {selectedPayout.status.charAt(0).toUpperCase() + selectedPayout.status.slice(1)}
                  </span>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Organizer</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{selectedPayout.organizerName}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{selectedPayout.organizerEmail}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Payout Method</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{selectedPayout.payoutMethod ?? 'N/A'}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{selectedPayout.accountDetails ?? 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Gross Amount</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">₵{selectedPayout.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Platform Fee (5%)</div>
                  <div className="font-medium text-green-600 dark:text-green-400">₵{(selectedPayout.platformFee ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Net Amount</div>
                  <div className="font-bold text-lg text-gray-900 dark:text-gray-100">₵{(selectedPayout.netAmount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Requested At</div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(selectedPayout.requestedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                {selectedPayout.hubtelTransactionId && (
                  <div className="col-span-2">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Hubtel Transaction ID</div>
                    <div className="font-mono text-sm text-gray-900 dark:text-gray-100">{selectedPayout.hubtelTransactionId}</div>
                  </div>
                )}
                {selectedPayout.failureReason && (
                  <div className="col-span-2">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Failure Reason</div>
                    <div className="text-red-600 dark:text-red-400">{selectedPayout.failureReason}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-neutral-800 flex justify-end gap-3">
              {selectedPayout.status === 'failed' && (
                <button
                  onClick={() => {
                    handleRetry(selectedPayout.id);
                    setShowDetailsModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Retry via Hubtel
                </button>
              )}
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
