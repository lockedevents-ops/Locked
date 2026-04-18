"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  Flag, 
  FlagOff, 
  AlertTriangle, 
  Clock, 
  User, 
  Mail, 
  Search, 
  Filter,
  RefreshCw,
  ChevronDown,
  Shield,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { RefreshButton } from '@/components/admin/RefreshButton';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/useToast';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { formatDistanceToNow, format } from 'date-fns';

interface DeletedAccount {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  deleted_at: string;
  deletion_reason: string | null;
  deletion_flagged: boolean;
  deletion_flagged_by: string | null;
  deletion_flag_reason: string | null;
  scheduled_purge_at: string | null;
  created_at: string;
  daysUntilPurge: number | null;
}

type FilterType = 'all' | 'flagged' | 'unflagged';

export default function DeletedAccountsPage() {
  const { user } = useAuth();
  const toast = useToast();
  
  const [accounts, setAccounts] = useState<DeletedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<DeletedAccount | null>(null);
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    action: 'restore' | 'permanent_delete' | 'flag' | 'unflag' | null;
    account: DeletedAccount | null;
  }>({ isOpen: false, action: null, account: null });
  const [actionReason, setActionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewReasonModal, setViewReasonModal] = useState<{
    isOpen: boolean;
    reason: string | null;
    accountName: string | null;
  }>({ isOpen: false, reason: null, accountName: null });

  // Fetch deleted accounts
  const fetchAccounts = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/deleted-accounts?adminUserId=${user.id}&filter=${filter}`
      );
      const data = await response.json();
      
      if (data.success) {
        setAccounts(data.accounts);
      } else {
        toast.showError('Failed to load', data.error || 'Could not fetch deleted accounts');
      }
    } catch (error) {
      console.error('Failed to fetch deleted accounts:', error);
      toast.showError('Error', 'Failed to load deleted accounts');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, filter, toast]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Handle account action
  const handleAction = async () => {
    if (!actionModal.account || !actionModal.action || !user?.id) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/deleted-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionModal.action,
          accountId: actionModal.account.id,
          adminUserId: user.id,
          reason: actionReason || undefined
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.showSuccess('Success', data.message);
        setActionModal({ isOpen: false, action: null, account: null });
        setActionReason('');
        // Refresh the list
        await fetchAccounts();
      } else {
        toast.showError('Failed', data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Action failed:', error);
      toast.showError('Error', 'Failed to perform action');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter accounts by search
  const filteredAccounts = accounts.filter(account => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      account.email?.toLowerCase().includes(query) ||
      account.full_name?.toLowerCase().includes(query)
    );
  });

  // Stats
  const stats = {
    total: accounts.length,
    flagged: accounts.filter(a => a.deletion_flagged).length,
    pendingPurge: accounts.filter(a => !a.deletion_flagged && a.daysUntilPurge !== null && a.daysUntilPurge <= 7).length
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'restore': return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30';
      case 'permanent_delete': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30';
      case 'flag': return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30';
      case 'unflag': return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30';
      default: return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'restore': return <RotateCcw className="w-4 h-4" />;
      case 'permanent_delete': return <Trash2 className="w-4 h-4" />;
      case 'flag': return <Flag className="w-4 h-4" />;
      case 'unflag': return <FlagOff className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Deleted Accounts</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage soft-deleted accounts. Review, restore, or permanently delete user data.
          </p>
        </div>
        <RefreshButton 
          onRefresh={fetchAccounts}
          isLoading={isLoading}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-neutral-800 rounded-lg">
              <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Deleted</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Flag className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.flagged}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Under Investigation</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.pendingPurge}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Purging Soon (≤7 days)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        {/* Filter dropdown */}
        <div className="relative">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="appearance-none pl-10 pr-10 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer"
          >
            <option value="all">All Accounts</option>
            <option value="flagged">Flagged Only</option>
            <option value="unflagged">Unflagged Only</option>
          </select>
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading deleted accounts...</p>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="p-8 text-center">
            <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Deleted Accounts</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery 
                ? 'No accounts match your search criteria.' 
                : 'There are no soft-deleted accounts to manage.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deleted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reason</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Auto-Purge</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800">
                    {/* User */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center overflow-hidden">
                          {account.avatar_url ? (
                            <Image
                              src={account.avatar_url}
                              alt={account.full_name || 'User'}
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{account.full_name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{account.email}</p>
                        </div>
                      </div>
                    </td>
                    
                    {/* Deleted date */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-gray-100">
                          {format(new Date(account.deleted_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(account.deleted_at), { addSuffix: true })}
                      </p>
                    </td>
                    
                    {/* Reason */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 max-w-xs">
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate flex-1">
                          {account.deletion_reason || 'Not specified'}
                        </p>
                        {account.deletion_reason && account.deletion_reason.length > 30 && (
                          <button
                            onClick={() => setViewReasonModal({ 
                              isOpen: true, 
                              reason: account.deletion_reason,
                              accountName: account.full_name
                            })}
                            className="text-xs font-semibold text-primary hover:underline cursor-pointer flex-shrink-0"
                          >
                            View
                          </button>
                        )}
                      </div>
                    </td>
                    
                    {/* Status */}
                    <td className="px-4 py-4">
                      {account.deletion_flagged ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full">
                          <Flag className="w-3 h-3" />
                          Under Investigation
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 rounded-full">
                          <Clock className="w-3 h-3" />
                          Pending Purge
                        </span>
                      )}
                    </td>
                    
                    {/* Auto-purge */}
                    <td className="px-4 py-4">
                      {account.deletion_flagged ? (
                        <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">Paused</span>
                      ) : account.daysUntilPurge !== null ? (
                        <div>
                          <span className={`text-sm font-medium ${
                            account.daysUntilPurge <= 7 ? 'text-red-600 dark:text-red-400' : 
                            account.daysUntilPurge <= 14 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {account.daysUntilPurge} days
                          </span>
                          {account.scheduled_purge_at && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {format(new Date(account.scheduled_purge_at), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    
                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Restore */}
                        <button
                          onClick={() => setActionModal({ isOpen: true, action: 'restore', account })}
                          className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors cursor-pointer"
                          title="Restore Account"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        
                        {/* Flag/Unflag */}
                        {account.deletion_flagged ? (
                          <button
                            onClick={() => setActionModal({ isOpen: true, action: 'unflag', account })}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors cursor-pointer"
                            title="Remove Flag"
                          >
                            <FlagOff className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setActionModal({ isOpen: true, action: 'flag', account })}
                            className="p-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors cursor-pointer"
                            title="Flag for Investigation"
                          >
                            <Flag className="w-4 h-4" />
                          </button>
                        )}
                        
                        {/* Permanent Delete */}
                        <button
                          onClick={() => setActionModal({ isOpen: true, action: 'permanent_delete', account })}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                          title="Permanently Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Confirmation Modal */}
      {actionModal.isOpen && actionModal.account && actionModal.action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-neutral-800 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${
                actionModal.action === 'flag' || actionModal.action === 'unflag'
                  ? 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/30' 
                  : getActionColor(actionModal.action)
              }`}>
                {getActionIcon(actionModal.action)}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {actionModal.action === 'restore' && 'Restore Account'}
                {actionModal.action === 'permanent_delete' && 'Permanently Delete Account'}
                {actionModal.action === 'flag' && 'Flag for Investigation'}
                {actionModal.action === 'unflag' && 'Remove Investigation Flag'}
              </h3>
            </div>

            {/* Account info */}
            <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <ProfileAvatar 
                  avatarUrl={actionModal.account.avatar_url}
                  name={actionModal.account.full_name || 'User'}
                  size="medium"
                  className="bg-gray-200 dark:bg-neutral-700"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {actionModal.account.full_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {actionModal.account.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Warning for permanent delete */}
            {actionModal.action === 'permanent_delete' && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg p-4 mb-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-300">This action cannot be undone</p>
                    <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                      All user data will be permanently deleted including profile, roles, activity history, and authentication credentials.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Reason input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason {actionModal.action === 'flag' ? '(required)' : '(optional)'}
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={
                  actionModal.action === 'restore' ? 'e.g., User contacted support to restore account' :
                  actionModal.action === 'permanent_delete' ? 'e.g., User confirmed permanent deletion request' :
                  actionModal.action === 'flag' ? 'e.g., Account under fraud investigation' :
                  'e.g., Investigation complete, no issues found'
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setActionModal({ isOpen: false, action: null, account: null });
                  setActionReason('');
                }}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-800 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700 font-medium disabled:opacity-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={isProcessing || (actionModal.action === 'flag' && !actionReason.trim())}
                className={`flex-1 px-4 py-2 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  actionModal.action === 'permanent_delete' 
                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-md active:scale-[0.98]' 
                    : actionModal.action === 'restore'
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-md active:scale-[0.98]'
                    : (actionModal.action === 'flag' || actionModal.action === 'unflag')
                    ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-md active:scale-[0.98]'
                    : 'bg-primary text-white hover:bg-primary/90 shadow-md active:scale-[0.98]'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {getActionIcon(actionModal.action)}
                    {actionModal.action === 'restore' && 'Restore'}
                    {actionModal.action === 'permanent_delete' && 'Delete Permanently'}
                    {actionModal.action === 'flag' && 'Flag Account'}
                    {actionModal.action === 'unflag' && 'Remove Flag'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Full Reason Modal */}
      {viewReasonModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-neutral-800">
            <div className="p-6 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Deletion Reason</h3>
              <button 
                onClick={() => setViewReasonModal({ isOpen: false, reason: null, accountName: null })}
                className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-8">
              <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-xl p-6 border border-gray-100 dark:border-neutral-800">
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Account: {viewReasonModal.accountName}</p>
                <p className="text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {viewReasonModal.reason}
                </p>
              </div>
            </div>
            <div className="p-6 bg-gray-50/50 dark:bg-neutral-800/30 border-t border-gray-100 dark:border-neutral-800 flex justify-end">
              <button
                onClick={() => setViewReasonModal({ isOpen: false, reason: null, accountName: null })}
                className="px-6 py-2 bg-gray-900 dark:bg-neutral-700 text-white rounded-lg font-bold hover:bg-black dark:hover:bg-neutral-600 transition-all cursor-pointer shadow-lg"
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
