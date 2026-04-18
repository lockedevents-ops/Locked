"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminFlaggedItems, useAdminFlaggedItemsStats, type AdminFlaggedItem, type FlaggedItemFilters } from '@/hooks/adminQueries';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshButton } from '@/components/admin/RefreshButton';
import {
  Flag,
  Calendar,
  Building,
  AlertTriangle,
  CheckCircle,
  Eye,
  Filter,
  Search,
  RefreshCcw,
  Trash2,
  MessageSquare,
  Clock,
  LayoutGrid,
  List,
  ExternalLink,
  UserX,
  Shield,
  RotateCcw,
  TrendingUp,
  History
} from 'lucide-react';
import Link from 'next/link';
import { PageLoader } from '@/components/loaders/PageLoader';

// (stats interface also exported by hook file; local lightweight shape here for TS context)
interface FlaggedItemsStats { total: number; pending: number; resolved: number; events: number; venues: number; by_severity: Record<string, number>; }

type FilterType = 'all' | 'event' | 'venue';
type StatusFilter = 'all' | 'pending' | 'resolved';
type SeverityFilter = 'all' | 'low' | 'medium' | 'high' | 'critical';

export default function FlaggedItemsPage() {
  const { user, isAdmin, isReady } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    // Load saved view preference from localStorage if available
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('flaggedItemsViewMode');
      return (savedView === 'grid' ? 'grid' : 'list');
    }
    return 'list';
  });

  // Modal states
  const [selectedItem, setSelectedItem] = useState<AdminFlaggedItem | null>(null);
  const [showUnflagModal, setShowUnflagModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showOffenseHistoryModal, setShowOffenseHistoryModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [userOffenseData, setUserOffenseData] = useState<Record<string, any>>({});
  // Build filter object for query key
  const apiFilters = useMemo<FlaggedItemFilters>(() => {
    const f: FlaggedItemFilters = {};
    if (typeFilter !== 'all') f.item_type = typeFilter;
    if (statusFilter === 'pending') f.resolution = 'pending';
    else if (statusFilter === 'resolved') f.reviewed = true;
    if (severityFilter !== 'all') f.severity = severityFilter;
    return f;
  }, [typeFilter, statusFilter, severityFilter]);

  const { data: rawItems, isLoading: itemsLoading, refetch: refetchItems, isFetching: itemsFetching } = useAdminFlaggedItems(apiFilters, { enabled: isReady && !!isAdmin });
  const { data: stats, isLoading: statsLoading, refetch: refetchStats, isFetching: statsFetching } = useAdminFlaggedItemsStats({ enabled: isReady && !!isAdmin });

  const flaggedItems = useMemo(() => {
    if (!rawItems) return [] as AdminFlaggedItem[];
    
    // Load user offense data for all items
    rawItems.forEach(item => {
      const ownerId = item.item_details?.organizer_id || item.item_details?.user_id;
      if (ownerId && !userOffenseData[ownerId]) {
        loadUserOffenseData(ownerId);
      }
    });
    
    if (!searchQuery) return rawItems;
    const q = searchQuery.toLowerCase();
    return rawItems.filter(item => (
      (item.item_details?.title || item.item_details?.name || '').toLowerCase().includes(q) ||
      item.policy_violation.toLowerCase().includes(q) ||
      item.violation_details.toLowerCase().includes(q)
    ));
  }, [rawItems, searchQuery, userOffenseData]);

  const loading = itemsLoading || statsLoading || itemsFetching || statsFetching;

  useEffect(() => {
    if (isReady && !isAdmin) setError('Access denied: Admin privileges required');
    else setError(null);
  }, [isReady, isAdmin]);

  const forceRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin','flaggedItems'] }),
      queryClient.invalidateQueries({ queryKey: ['admin','flaggedItems','stats'] }),
    ]);
    refetchItems();
    refetchStats();
  };

  const handleUnflag = async () => {
    if (!selectedItem || !user || !isAdmin) return;
    try {
      setActionLoading(true);
      const { policyService } = await import('@/services/policyService');
      await policyService.unflagItem(selectedItem.id, user.id, adminNotes);
      setShowUnflagModal(false);
      setSelectedItem(null);
      setAdminNotes('');
      await forceRefresh();
    } catch (err) {
      console.error('Error unflagging item:', err);
      setError('Failed to unflag item');
    } finally { setActionLoading(false); }
  };

  const handleRemove = async () => {
    if (!selectedItem || !user || !isAdmin) return;
    try {
      setActionLoading(true);
      const { policyService } = await import('@/services/policyService');
      await policyService.removeItem(selectedItem.id, user.id, adminNotes);
      setShowRemoveModal(false);
      setSelectedItem(null);
      setAdminNotes('');
      await forceRefresh();
    } catch (err) {
      console.error('Error removing item:', err);
      setError('Failed to remove item');
    } finally { setActionLoading(false); }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getItemIcon = (itemType: string) => {
    return itemType === 'event' ? Calendar : Building;
  };
  
  // Load user offense data for repeat offender detection
  const loadUserOffenseData = async (userId: string) => {
    if (userOffenseData[userId]) return userOffenseData[userId]; // Already loaded
    
    try {
      const { userOffenseService } = await import('@/services/userOffenseService');
      const stats = await userOffenseService.getUserOffenseStats(userId);
      
      setUserOffenseData(prev => ({
        ...prev,
        [userId]: stats
      }));
      
      return stats;
    } catch (error) {
      console.error('Error loading user offense data:', error);
      return null;
    }
  };
  
  // Check if user is a repeat offender
  const isRepeatOffender = (userId: string) => {
    const stats = userOffenseData[userId];
    return stats && (stats.totalOffenses > 1 || stats.recentOffenses > 0 || stats.currentEscalationLevel > 1);
  };
  
  // Get repeat offender severity level
  const getRepeatOffenderLevel = (userId: string): 'low' | 'medium' | 'high' | 'critical' => {
    const stats = userOffenseData[userId];
    if (!stats) return 'low';
    
    if (stats.currentEscalationLevel >= 4) return 'critical';
    if (stats.currentEscalationLevel >= 3) return 'high';
    if (stats.totalOffenses >= 3 || stats.recentOffenses >= 2) return 'medium';
    return 'low';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Flagged Items</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review and manage events and venues flagged for policy violations
          </p>
        </div>
        <RefreshButton 
          onRefresh={forceRefresh}
          isLoading={loading}
          label="Refresh flagged items"
          className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {loading && !stats ? (
        <PageLoader message="Loading moderation stats..." />
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg border border-gray-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Flagged</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <Flag className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg border border-gray-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Review</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-400" />
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg border border-gray-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg border border-gray-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Events</p>
                <p className="text-2xl font-bold text-blue-600">{stats.events}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg border border-gray-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Venues</p>
                <p className="text-2xl font-bold text-purple-600">{stats.venues}</p>
              </div>
              <Building className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>
      ) : null}

      {/* Filters */}
      {loading ? (
        <PageLoader message="Loading filters..." />
      ) : (
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg border border-gray-200 dark:border-neutral-800">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as FilterType)}
              className="border border-gray-300 dark:border-neutral-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-neutral-700 text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="event">Events</option>
              <option value="venue">Venues</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="border border-gray-300 dark:border-neutral-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-neutral-700 text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
              className="border border-gray-300 dark:border-neutral-600 rounded-md px-3 py-1 text-sm bg-white dark:bg-neutral-700 text-gray-900 dark:text-white cursor-pointer"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <div className="flex items-center gap-4">
              <div className="flex items-center border border-gray-300 dark:border-neutral-600 rounded-md overflow-hidden">
                <button
                  onClick={() => {
                    setViewMode('list');
                    localStorage.setItem('flaggedItemsViewMode', 'list');
                  }}
                  className={`px-3 py-1 text-sm transition-colors duration-200 cursor-pointer ${viewMode === 'list' 
                    ? 'bg-primary/10 text-primary dark:bg-primary/20' 
                    : 'bg-white dark:bg-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-600'}`}
                >
                  <span className="flex items-center gap-1">
                    <List className="h-4 w-4" />
                    List
                  </span>
                </button>
                <button
                  onClick={() => {
                    setViewMode('grid');
                    localStorage.setItem('flaggedItemsViewMode', 'grid');
                  }}
                  className={`px-3 py-1 text-sm transition-colors duration-200 cursor-pointer ${viewMode === 'grid' 
                    ? 'bg-primary/10 text-primary dark:bg-primary/20' 
                    : 'bg-white dark:bg-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-600'}`}
                >
                  <span className="flex items-center gap-1">
                    <LayoutGrid className="h-4 w-4" />
                    Grid
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search flagged items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border border-gray-300 dark:border-neutral-600 rounded-md px-3 py-1 text-sm w-64 bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Flagged Items */}
      {loading ? (
        <PageLoader message="Loading flagged items..." fullHeight />
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden transition-all duration-300">
          {flaggedItems.length === 0 ? (
            <div className="p-12 text-center">
              <Flag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No flagged items found</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery || typeFilter !== 'all' || statusFilter !== 'all' || severityFilter !== 'all'
                  ? 'Try adjusting your filters or search terms.'
                  : 'All items are compliant with platform policies.'}
              </p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="divide-y divide-gray-200 dark:divide-neutral-700 transition-all duration-300">
              {flaggedItems.map((item) => {
              const ItemIcon = getItemIcon(item.item_type);
              const itemName = item.item_details?.title || item.item_details?.name || 'Unknown Item';
              const ownerId = item.item_details?.organizer_id || item.item_details?.user_id;
              const isRepeatOffenderUser = ownerId ? isRepeatOffender(ownerId) : false;
              const repeatOffenderLevel = ownerId ? getRepeatOffenderLevel(ownerId) : 'low';
              const userStats = ownerId ? userOffenseData[ownerId] : null;
              
              return (
                <div key={item.id} className={`py-4 px-5 hover:bg-gray-50 dark:hover:bg-neutral-700/50 ${isRepeatOffenderUser ? 'border-l-4 border-l-orange-500' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg ${item.item_type === 'event' ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-purple-100 dark:bg-purple-900/20'}`}>
                        <ItemIcon className={`h-4 w-4 ${item.item_type === 'event' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1.5">
                          <h3 className="text-base font-medium text-gray-900 dark:text-white">
                            {itemName}
                          </h3>
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(item.severity)}`}>
                            {item.severity.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {item.item_type}
                          </span>
                          {isRepeatOffenderUser && (
                            <div className="flex items-center gap-1">
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                repeatOffenderLevel === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                                repeatOffenderLevel === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                                repeatOffenderLevel === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                              }`}>
                                <UserX className="w-3 h-3" />
                                Repeat Offender
                              </div>
                              {userStats && userStats.totalOffenses > 1 && (
                                <div className="bg-gray-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded text-xs text-gray-600 dark:text-gray-400">
                                  {userStats.totalOffenses} violations
                                </div>
                              )}
                              {userStats && userStats.currentEscalationLevel > 1 && (
                                <div className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  userStats.currentEscalationLevel >= 4 ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                                  userStats.currentEscalationLevel >= 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                }`}>
                                  <TrendingUp className="w-3 h-3 inline mr-1" />
                                  Level {userStats.currentEscalationLevel}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-1 mb-2">
                          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                            <AlertTriangle className="inline w-3.5 h-3.5 mr-1" />
                            {item.policy_violation}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                            {item.violation_details}
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-1 mb-1">
                          <div className="text-xs text-gray-600 dark:text-gray-300">
                            <span className="font-medium">Organizer:</span> {item.item_details?.organizer_name || 'Unknown'} 
                            {item.item_details?.organizer_email && (
                              <span className="ml-1">({item.item_details?.organizer_email})</span>
                            )}
                            {isRepeatOffenderUser && userStats && (
                              <div className="mt-1 flex items-center gap-2 text-xs">
                                <span className="text-orange-600 dark:text-orange-400 font-medium">
                                  ⚠️ {userStats.totalOffenses} total violations
                                </span>
                                {userStats.recentOffenses > 0 && (
                                  <span className="text-red-600 dark:text-red-400">
                                    ({userStats.recentOffenses} recent)
                                  </span>
                                )}
                                {userStats.isRestricted && (
                                  <span className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 px-1.5 py-0.5 rounded">
                                    <Shield className="w-3 h-3 inline mr-1" />
                                    Restricted
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            Flagged {new Date(item.flagged_at).toLocaleDateString()}
                          </span>
                          {item.auto_generated && (
                            <span className="bg-gray-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded">
                              Auto-detected
                            </span>
                          )}
                          {item.reviewed && (
                            <span className="text-green-600 dark:text-green-400">
                              ✓ Reviewed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 ml-2">
                      {item.item_details && (
                        <>
                          <Link
                            href={item.item_type === 'event' 
                              ? `/admin/events/${item.item_id}` 
                              : `/admin/venues/${item.item_id}`
                            }
                            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Admin
                          </Link>
                          <a
                            href={item.item_type === 'event' 
                              ? `/events/${item.item_id}` 
                              : `/venues/${item.item_id}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View Live
                          </a>
                        </>
                      )}
                      
                      {isRepeatOffenderUser && ownerId && (
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setShowOffenseHistoryModal(true);
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/40 rounded-md text-xs cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                          History
                        </button>
                      )}
                      
                      {!item.reviewed && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setShowUnflagModal(true);
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40 rounded-md text-xs cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Unflag
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setShowRemoveModal(true);
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40 rounded-md text-xs cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {item.admin_notes && (
                    <div className="mt-2.5 p-2 bg-gray-50 dark:bg-neutral-700 rounded-md">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-gray-900 dark:text-white">Admin Notes:</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2" title={item.admin_notes}>{item.admin_notes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4 transition-all duration-300">
              {flaggedItems.map((item) => {
                const ItemIcon = getItemIcon(item.item_type);
                const itemName = item.item_details?.title || item.item_details?.name || 'Unknown Item';
                
                return (
                  <div key={item.id} className="border border-gray-200 dark:border-neutral-700 rounded-lg hover:shadow-md transition-shadow duration-200 flex flex-col h-full">
                    <div className="p-2 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 rounded-t-lg flex items-center justify-between">
                      <div className="flex items-center gap-1.5 max-w-[75%]">
                        <div className={`p-1.5 rounded-md ${item.item_type === 'event' ? 'bg-blue-100 dark:bg-blue-900/20' : 'bg-purple-100 dark:bg-purple-900/20'}`}>
                          <ItemIcon className={`h-4 w-4 ${item.item_type === 'event' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`} />
                        </div>
                        <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate" title={itemName}>
                          {itemName.length > 20 ? `${itemName.substring(0, 20)}...` : itemName}
                        </h3>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(item.severity)}`}>
                        {item.severity.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex-grow p-2.5">
                      <div className="space-y-1.5">
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium flex items-start">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-1">{item.policy_violation}</span>
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2" title={item.violation_details}>
                          {item.violation_details}
                        </p>
                      </div>
                      
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 mb-1.5">
                        <span className="font-medium">Organizer:</span> {item.item_details?.organizer_name || 'Unknown'} 
                        {item.item_details?.organizer_email && (
                          <span className="ml-1 block truncate" title={item.item_details?.organizer_email}>
                            ({item.item_details?.organizer_email})
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <span className="whitespace-nowrap">
                          {new Date(item.flagged_at).toLocaleDateString()}
                        </span>
                        {item.auto_generated && (
                          <span className="bg-gray-100 dark:bg-neutral-700 px-1.5 py-0.5 rounded whitespace-nowrap">
                            Auto
                          </span>
                        )}
                        {item.reviewed && (
                          <span className="text-green-600 dark:text-green-400 whitespace-nowrap">
                            ✓ Reviewed
                          </span>
                        )}
                      </div>
                      
                      {item.admin_notes && (
                        <div className="mt-2 p-1.5 bg-gray-50 dark:bg-neutral-700 rounded-md">
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1" title={item.admin_notes}>
                            <MessageSquare className="inline-block w-3 h-3 mr-1" />
                            {item.admin_notes}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="py-1.5 px-2 border-t border-gray-200 dark:border-neutral-700 flex gap-1.5 justify-end">
                      {item.item_details && (
                        <>
                          <Link
                            href={item.item_type === 'event' 
                              ? `/admin/events/${item.item_id}` 
                              : `/admin/venues/${item.item_id}`
                            }
                            className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Admin
                          </Link>
                          <a
                            href={item.item_type === 'event' 
                              ? `/events/${item.item_id}` 
                              : `/venues/${item.item_id}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Live
                          </a>
                        </>
                      )}
                      
                      {!item.reviewed && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setShowUnflagModal(true);
                            }}
                            className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40 rounded-md text-xs cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Unflag
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setShowRemoveModal(true);
                            }}
                            className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40 rounded-md text-xs cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Unflag Modal */}
      {showUnflagModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Unflag Item</h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to unflag "{selectedItem.item_details?.title || selectedItem.item_details?.name || 'this item'}"? 
              This will mark it as compliant and remove the flag.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Admin Notes (optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 dark:border-neutral-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                placeholder="Add any notes about why this item was unflagged..."
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowUnflagModal(false);
                  setSelectedItem(null);
                  setAdminNotes('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUnflag}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Unflag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Modal */}
      {showRemoveModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-2 mb-4">
              <Trash2 className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Remove Item</h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to remove "{selectedItem.item_details?.title || selectedItem.item_details?.name || 'this item'}"? 
              This will cancel/deactivate the item and mark the flag as resolved.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Admin Notes (optional)
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 dark:border-neutral-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-neutral-700 text-gray-900 dark:text-white"
                placeholder="Add any notes about why this item was removed..."
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRemoveModal(false);
                  setSelectedItem(null);
                  setAdminNotes('');
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Offense History Modal */}
      {showOffenseHistoryModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg max-w-4xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Offense History</h3>
              <button
                onClick={() => {
                  setShowOffenseHistoryModal(false);
                  setSelectedItem(null);
                }}
                className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            
            {(() => {
              const ownerId = selectedItem.item_details?.organizer_id || selectedItem.item_details?.user_id;
              const userStats = ownerId ? userOffenseData[ownerId] : null;
              
              if (!userStats) {
                return (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">Loading user offense history...</p>
                  </div>
                );
              }
              
              return (
                <div className="space-y-6">
                  {/* User Overview */}
                  <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Offenses</p>
                        <p className="text-2xl font-bold text-red-600">{userStats.totalOffenses}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Recent (30 days)</p>
                        <p className="text-2xl font-bold text-orange-600">{userStats.recentOffenses}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Escalation Level</p>
                        <p className={`text-2xl font-bold ${
                          userStats.currentEscalationLevel >= 4 ? 'text-red-600' :
                          userStats.currentEscalationLevel >= 3 ? 'text-orange-600' :
                          userStats.currentEscalationLevel >= 2 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          Level {userStats.currentEscalationLevel}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</p>
                        <div className="flex items-center gap-1">
                          {userStats.isRestricted ? (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
                              <Shield className="w-4 h-4" />
                              Restricted
                            </span>
                          ) : (
                            <span className="text-sm font-medium text-green-600">Active</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Offense Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">By Type</h4>
                      <div className="space-y-2">
                        {Object.entries(userStats.offensesByType).map(([type, count]) => (
                          (count as number) > 0 && (
                            <div key={type} className="flex justify-between items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                {type.replace('_', ' ')}
                              </span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{count as number}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">By Severity</h4>
                      <div className="space-y-2">
                        {Object.entries(userStats.offensesBySeverity).map(([severity, count]) => (
                          (count as number) > 0 && (
                            <div key={severity} className="flex justify-between items-center">
                              <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                {severity}
                              </span>
                              <span className={`text-sm font-medium ${
                                severity === 'critical' ? 'text-red-600' :
                                severity === 'high' ? 'text-orange-600' :
                                severity === 'medium' ? 'text-yellow-600' :
                                'text-blue-600'
                              }`}>
                                {count as number}
                              </span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 dark:border-neutral-700 pt-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      User: <span className="font-medium">{selectedItem.item_details?.organizer_name || 'Unknown'}</span>
                    </p>
                    {selectedItem.item_details?.organizer_email && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Email: <span className="font-medium">{selectedItem.item_details.organizer_email}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      This user has shown a pattern of policy violations. Consider additional restrictions or account review.
                    </p>
                  </div>
                </div>
              );
            })()}
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowOffenseHistoryModal(false);
                  setSelectedItem(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 cursor-pointer"
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
