"use client";

// Rebuilt clean file with redesigned RequestDetailModal
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
// import { toast } from 'react-toastify'; // Replaced with admin toast system
import { useToast } from '@/hooks/useToast';
import {
  Filter, ChevronDown, Search, Clock, Check, X, FileCheck, Calendar, User, Briefcase, Phone, Mail, ArrowLeft, Info, ExternalLink,
  RefreshCcw, Ban, Eye
} from 'lucide-react';
import { RefreshButton } from '@/components/admin/RefreshButton';
import { createClient } from '@/lib/supabase/client/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRoleRequests } from '@/hooks/adminQueries';
import { useQueryClient } from '@tanstack/react-query';
import { eventDatabaseService } from '@/services/eventDatabaseService';

import { notificationDatabaseService } from '@/services/supabase/notificationDatabaseService';
import { adminNotificationService } from '@/services/notificationService';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import { getSignedUrl } from '@/lib/signedUrlCache';
import { isVenuesEnabled } from '@/lib/network';
import { PageLoader } from '@/components/loaders/PageLoader';

// Type definition for role requestsr
interface RoleRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userImage?: string; // Add user profile image
  requestType: 'organizer' | 'venue_owner';
  companyName: string;
  businessEmail?: string;
  businessPhone?: string;
  idType: string;
  idNumber?: string;
  idImage?: string;
  selfieWithId?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  rejectionNote?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  // Reinstatement tracking
  reinstatedAt?: string | null;
  reinstatementCount?: number;
}

// Status badge component (kept lightweight)
const StatusBadge = ({ status }: { status: RoleRequest['status'] }) => {
  const cfg: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
    pending: { cls: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300', label: 'Pending', icon: <Clock className="w-3 h-3 mr-1" /> },
    approved: { cls: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300', label: 'Approved', icon: <Check className="w-3 h-3 mr-1" /> },
    rejected: { cls: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300', label: 'Rejected', icon: <X className="w-3 h-3 mr-1" /> },
    cancelled: { cls: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300', label: 'Revoked', icon: <Ban className="w-3 h-3 mr-1" /> }
  };
  const { cls, label, icon } = cfg[status] || { cls: 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200', label: status, icon: <Info className="w-3 h-3 mr-1" /> };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{icon}{label}</span>;
};

// Empty state
const EmptyState = ({ onClearFilters, hasFilters }: { onClearFilters: () => void; hasFilters: boolean }) => (
  <div className="text-center py-12">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-neutral-900 mb-4">
      <FileCheck className="w-8 h-8 text-gray-400 dark:text-gray-500" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No requests found</h3>
    {hasFilters ? (
      <>
        <p className="text-gray-500 dark:text-gray-400 mb-4">Try adjusting your search or filter parameters</p>
        <button onClick={onClearFilters} className="text-primary hover:text-primary-dark font-medium cursor-pointer">Clear all filters</button>
      </>
    ) : <p className="text-gray-500 dark:text-gray-400">No role requests have been submitted yet.</p>}
  </div>
);

// Redesigned detail modal
const RequestDetailModal = ({ request, onClose, onApprove, onReject, onRevoke, onReinstate }: {
  request: RoleRequest; onClose: () => void; onApprove: (id: string) => void; onReject: (id: string, note: string) => void; onRevoke: (id: string, note: string) => void; onReinstate: (id: string, note: string) => void;
}) => {
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [revocationNote, setRevocationNote] = useState('');
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [isReinstating, setIsReinstating] = useState(false);
  const [reinstatementNote, setReinstatementNote] = useState('');
  const [showReinstateConfirm, setShowReinstateConfirm] = useState(false);
  // ✨ ADD LOADING STATES
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(true); // Track signed URL generation
  const modalRef = useRef<HTMLDivElement>(null);
  const [signedIdUrl, setSignedIdUrl] = useState<string | null>(null);
  const [signedSelfieUrl, setSignedSelfieUrl] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Ensure images load from private buckets by generating signed URLs
  useEffect(() => {
    let isMounted = true;
    setIsLoadingImages(true); // Start loading
    
    const generateSigned = async () => {
      try {
        const toPath = (urlOrPath?: string) => {
          if (!urlOrPath) return null;
          try {
            if (urlOrPath.startsWith('http')) {
              const u = new URL(urlOrPath);
              // Expect pattern: /storage/v1/object/(public|sign)/role-requests/<path>
              const parts = u.pathname.split('/');
              const idx = parts.findIndex(p => p === 'role-requests');
              if (idx !== -1 && parts.length > idx + 1) {
                return parts.slice(idx + 1).join('/');
              }
              return null;
            }
          } catch {}
          // assume it's already a storage path (relative to bucket)
          return urlOrPath.replace(/^\/?role-requests\//, '');
        };

        const idPath = toPath(request.idImage);
        const selfiePath = toPath(request.selfieWithId);

        // Generate both signed URLs in parallel
        const [idResult, selfieResult] = await Promise.allSettled([
          idPath ? getSignedUrl(idPath, 'role-requests', async () => {
            const { data, error } = await supabase.storage.from('role-requests').createSignedUrl(idPath, 60 * 60);
            if (!error && data?.signedUrl) return data.signedUrl;
            return '';
          }) : Promise.resolve(null),
          selfiePath ? getSignedUrl(selfiePath, 'role-requests', async () => {
            const { data, error } = await supabase.storage.from('role-requests').createSignedUrl(selfiePath, 60 * 60);
            if (!error && data?.signedUrl) return data.signedUrl;
            return '';
          }) : Promise.resolve(null)
        ]);

        if (isMounted) {
          // Set ID URL
          if (idResult.status === 'fulfilled' && idResult.value) {
            setSignedIdUrl(idResult.value);
          } else {
            setSignedIdUrl(request.idImage || null);
          }

          // Set Selfie URL
          if (selfieResult.status === 'fulfilled' && selfieResult.value) {
            setSignedSelfieUrl(selfieResult.value);
          } else {
            setSignedSelfieUrl(request.selfieWithId || null);
          }

          setIsLoadingImages(false); // Done loading
        }
      } catch {
        // Non-fatal; fall back to the stored URLs
        if (isMounted) {
          setSignedIdUrl(request.idImage || null);
          setSignedSelfieUrl(request.selfieWithId || null);
          setIsLoadingImages(false);
        }
      }
    };

    generateSigned();
    
    return () => {
      isMounted = false;
    };
  }, [request.idImage, request.selfieWithId, supabase]);

  const formattedSubmitDate = new Date(request.submittedAt).toLocaleString();
  const formattedReviewDate = request.reviewedAt ? new Date(request.reviewedAt).toLocaleString() : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-gray-200 dark:border-neutral-800 flex items-start justify-between">
          <div>
            <button
              onClick={onClose}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {request.requestType === 'organizer' ? 'Organizer' : 'Venue Owner'} Role Request
            </h3>
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4" /> Submitted {formattedSubmitDate}
              {formattedReviewDate && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <Calendar className="h-4 w-4" /> Reviewed {formattedReviewDate}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={request.status} />
            {request.reinstatementCount && request.reinstatementCount > 0 && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-full">
                <RefreshCcw className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  Reinstated {request.reinstatementCount}x
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                {request.userImage ? (
                  <Image
                    src={request.userImage}
                    alt={request.userName || 'User'}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling;
                      if (fallback) fallback.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <span className={`text-lg font-semibold text-primary ${request.userImage ? 'hidden' : ''}`}>
                  {request.userName?.[0] || 'U'}
                </span>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-base text-gray-900 dark:text-gray-100">{request.userName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Mail className="h-4 w-4" /> {request.userEmail}
                </p>
                {request.companyName && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Briefcase className="h-4 w-4" /> {request.companyName}
                  </p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 items-stretch">
              <div className="space-y-3 flex flex-col">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Business Info</h4>
                <div className="bg-gray-50 dark:bg-neutral-900 rounded-lg p-4 space-y-2 text-sm flex-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" /> {request.businessEmail || '—'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500" /> {request.businessPhone || '—'}
                  </div>
                </div>
              </div>

              <div className="space-y-3 flex flex-col">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">Request Details</h4>
                <div className="bg-gray-50 dark:bg-neutral-900 rounded-lg p-4 space-y-2 text-sm flex-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" /> Submitted {formattedSubmitDate}
                  </div>
                  {formattedReviewDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400 dark:text-gray-500" /> Reviewed {formattedReviewDate}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400 dark:text-gray-500" /> Type: {request.requestType === 'organizer' ? 'Event Organizer' : 'Venue Owner'}
                  </div>
                  <div className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-gray-400 dark:text-gray-500" /> ID Type: {request.idType || '—'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-gray-400 dark:text-gray-500" /> ID Number: {request.idNumber || '—'}
                  </div>
                </div>
              </div>
            </div>

            {request.reason && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-gray-900 dark:text-gray-100">Additional Information</h4>
                <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-800 rounded-lg p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words break-all overflow-hidden max-w-full min-h-24">
                  {request.reason}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium mb-3 text-gray-900 dark:text-gray-100">Verification Documents</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">ID Document</h4>
                  {request.idImage ? (
                    <div className="relative group border border-gray-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-gray-50 dark:bg-neutral-800 aspect-video flex items-center justify-center">
                      {isLoadingImages ? (
                        <div className="flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                          <RefreshCcw className="h-6 w-6 animate-spin" />
                          <span className="text-xs">Loading secure image...</span>
                        </div>
                      ) : signedIdUrl ? (
                        <>
                          <Image
                            src={signedIdUrl}
                            alt="ID Document"
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'text-center text-red-500 dark:text-red-400 text-sm p-4';
                              errorDiv.innerHTML = `
                                <div class="mb-2">⚠️ Image failed to load</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">Check storage permissions</div>
                              `;
                              target.parentElement?.appendChild(errorDiv);
                            }}
                          />
                          <button
                            onClick={() => window.open(signedIdUrl, '_blank')}
                            className="absolute top-2 right-2 bg-white/80 dark:bg-neutral-900/80 hover:bg-white dark:hover:bg-neutral-700 text-xs px-2 py-1 rounded-md shadow cursor-pointer text-gray-900 dark:text-gray-100"
                          >
                            Open
                          </button>
                        </>
                      ) : (
                        <div className="text-center text-amber-500 dark:text-amber-400 text-sm p-4">
                          <div className="mb-2">⚠️ Could not generate secure URL</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Image may not be accessible</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border border-gray-200 dark:border-neutral-800 rounded-lg bg-gray-50 dark:bg-neutral-800 h-40 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                      No ID provided
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Selfie with ID</h4>
                  {request.selfieWithId ? (
                    <div className="relative group border border-gray-200 dark:border-neutral-800 rounded-lg overflow-hidden bg-gray-50 dark:bg-neutral-800 aspect-video flex items-center justify-center">
                      {isLoadingImages ? (
                        <div className="flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                          <RefreshCcw className="h-6 w-6 animate-spin" />
                          <span className="text-xs">Loading secure image...</span>
                        </div>
                      ) : signedSelfieUrl ? (
                        <>
                          <Image
                            src={signedSelfieUrl}
                            alt="Selfie with ID"
                            fill
                            sizes="(max-width: 768px) 100vw, 50vw"
                            className="object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'text-center text-red-500 dark:text-red-400 text-sm p-4';
                              errorDiv.innerHTML = `
                                <div class="mb-2">⚠️ Image failed to load</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">Check storage permissions</div>
                              `;
                              target.parentElement?.appendChild(errorDiv);
                            }}
                          />
                          <button
                            onClick={() => window.open(signedSelfieUrl, '_blank')}
                            className="absolute top-2 right-2 bg-white/80 dark:bg-neutral-900/80 hover:bg-white dark:hover:bg-neutral-700 text-xs px-2 py-1 rounded-md shadow cursor-pointer text-gray-900 dark:text-gray-100"
                          >
                            Open
                          </button>
                        </>
                      ) : (
                        <div className="text-center text-amber-500 dark:text-amber-400 text-sm p-4">
                          <div className="mb-2">⚠️ Could not generate secure URL</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Image may not be accessible</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border border-gray-200 dark:border-neutral-800 rounded-lg bg-gray-50 dark:bg-neutral-800 h-40 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
                      No selfie provided
                    </div>
                  )}
                </div>
              </div>
            </div>

            {request.rejectionNote && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-red-600 dark:text-red-400">Rejection Reason</h4>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap break-words break-all overflow-hidden max-w-full">
                  {request.rejectionNote}
                </div>
              </div>
            )}
          </div>
        </div>

        {(request.status === 'pending' || request.status === 'approved' || request.status === 'cancelled') && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-900 flex flex-col gap-4">
            {isRejecting && (
              <div className="w-full space-y-3">
                <p className="text-xs font-medium text-red-600 dark:text-red-400">Rejecting this request</p>
                <textarea
                  value={rejectionNote}
                  onChange={(e) => setRejectionNote(e.target.value)}
                  placeholder="Reason for rejection (optional)"
                  rows={3}
                  disabled={isProcessing}
                  className="w-full text-sm border border-gray-300 dark:border-neutral-800 rounded-md p-2 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setIsRejecting(false)}
                    disabled={isProcessing}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setIsProcessing(true);
                      await onReject(request.id, rejectionNote);
                      setIsProcessing(false);
                      setIsRejecting(false);
                    }}
                    disabled={isProcessing}
                    className="px-3 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isProcessing && (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                </div>
              </div>
            )}

            {isRevoking && (
              <div className="w-full space-y-3">
                <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Revoking this approved request</p>
                <textarea
                  value={revocationNote}
                  onChange={(e) => setRevocationNote(e.target.value)}
                  placeholder="Reason for revocation (optional)"
                  rows={3}
                  disabled={isProcessing}
                  className="w-full text-sm border border-gray-300 dark:border-neutral-800 rounded-md p-2 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setIsRevoking(false)}
                    disabled={isProcessing}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setIsProcessing(true);
                      await onRevoke(request.id, revocationNote);
                      setIsProcessing(false);
                      setIsRevoking(false);
                    }}
                    disabled={isProcessing}
                    className="px-3 py-2 text-sm rounded-md bg-orange-600 text-white hover:bg-orange-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isProcessing && (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isProcessing ? 'Revoking...' : 'Confirm Revocation'}
                  </button>
                </div>
              </div>
            )}

            {isReinstating && (
              <div className="w-full space-y-3">
                <p className="text-xs font-medium text-green-600 dark:text-green-400">Reinstating this revoked request</p>
                <textarea
                  value={reinstatementNote}
                  onChange={(e) => setReinstatementNote(e.target.value)}
                  placeholder="Reason for reinstatement (optional)"
                  rows={3}
                  disabled={isProcessing}
                  className="w-full text-sm border border-gray-300 dark:border-neutral-800 rounded-md p-2 bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setIsReinstating(false)}
                    disabled={isProcessing}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setIsProcessing(true);
                      await onReinstate(request.id, reinstatementNote);
                      setIsProcessing(false);
                      setIsReinstating(false);
                    }}
                    disabled={isProcessing}
                    className="px-3 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isProcessing && (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isProcessing ? 'Reinstating...' : 'Confirm Reinstatement'}
                  </button>
                </div>
              </div>
            )}

            {showApproveConfirm && !isRejecting && !isRevoking && (
              <div className="w-full space-y-3">
                <p className="text-xs font-medium text-green-700 dark:text-green-400">Approve this request?</p>
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-md p-3">
                  This will grant <span className="font-medium">{request.userName}</span>{' '}
                  {request.requestType === 'organizer' ? 'Organizer' : 'Venue Owner'} capabilities.
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowApproveConfirm(false)}
                    disabled={isProcessing}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setIsProcessing(true);
                      await onApprove(request.id);
                      setIsProcessing(false);
                      setShowApproveConfirm(false);
                    }}
                    disabled={isProcessing}
                    className="px-3 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isProcessing && (
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isProcessing ? 'Approving...' : 'Confirm Approval'}
                  </button>
                </div>
              </div>
            )}

            {showRevokeConfirm && !isRejecting && !isRevoking && !isReinstating && (
              <div className="w-full space-y-3">
                <p className="text-xs font-medium text-orange-700 dark:text-orange-400">Revoke this approved request?</p>
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-md p-3">
                  This will remove <span className="font-medium">{request.userName}</span>'s{' '}
                  {request.requestType === 'organizer' ? 'Organizer' : 'Venue Owner'} role and capabilities.
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowRevokeConfirm(false)}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowRevokeConfirm(false);
                      setIsRevoking(true);
                    }}
                    className="px-3 py-2 text-sm rounded-md bg-orange-600 text-white hover:bg-orange-700 cursor-pointer"
                  >
                    Revoke Role
                  </button>
                </div>
              </div>
            )}

            {showReinstateConfirm && !isRejecting && !isRevoking && !isReinstating && (
              <div className="w-full space-y-3">
                <p className="text-xs font-medium text-green-700 dark:text-green-400">Reinstate this revoked request?</p>
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-md p-3">
                  This will re-grant <span className="font-medium">{request.userName}</span>'s{' '}
                  {request.requestType === 'organizer' ? 'Organizer' : 'Venue Owner'} role and capabilities.
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setShowReinstateConfirm(false)}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-neutral-800 rounded-md bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowReinstateConfirm(false);
                      setIsReinstating(true);
                    }}
                    className="px-3 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                  >
                    Reinstate Role
                  </button>
                </div>
              </div>
            )}

            {!isRejecting && !showApproveConfirm && !isRevoking && !showRevokeConfirm && !isReinstating && !showReinstateConfirm && (
              <div className="flex w-full items-center justify-between">
                <p className="text-xs text-gray-500 dark:text-gray-400">Actions are recorded and cannot be undone.</p>
                <div className="flex gap-2">
                  {request.status === 'pending' && (
                    <>
                      <button
                        onClick={() => setIsRejecting(true)}
                        className="px-3 py-2 text-sm rounded-md border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 bg-white dark:bg-neutral-900 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => setShowApproveConfirm(true)}
                        className="px-3 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                      >
                        Approve
                      </button>
                    </>
                  )}
                  {request.status === 'approved' && (
                    <button
                      onClick={() => setShowRevokeConfirm(true)}
                      className="px-3 py-2 text-sm rounded-md border border-orange-300 dark:border-orange-600 text-orange-600 dark:text-orange-400 bg-white dark:bg-neutral-900 hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer"
                    >
                      Revoke Role
                    </button>
                  )}
                  {/* Show reinstate for 'cancelled' status (revoked requests use cancelled due to DB constraint) */}
                  {request.status === 'cancelled' && (
                    <button
                      onClick={() => setShowReinstateConfirm(true)}
                      className="px-3 py-2 text-sm rounded-md border border-green-300 dark:border-green-600 text-green-600 dark:text-green-400 bg-white dark:bg-neutral-900 hover:bg-green-50 dark:hover:bg-green-900/20 cursor-pointer"
                    >
                      Reinstate Role
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Database functions (fetch removed -> replaced by React Query hook)

const updateRoleRequestStatus = async (id: string, status: 'approved' | 'rejected' | 'cancelled', adminName: string, rejectionNote?: string, adminUserId?: string): Promise<RoleRequest> => {
  try {
    const supabase = createClient();
    
    const updateData: any = {
      status,
      reviewed_at: new Date().toISOString()
    };

    // Only add reviewed_by if it's a UUID (user ID), not an email
    if (adminUserId && adminUserId.length === 36) {
      updateData.reviewed_by = adminUserId;
    }

    if ((status === 'rejected' || status === 'cancelled') && rejectionNote) {
      updateData.rejection_reason = rejectionNote; // Use 'rejection_reason' for both rejection and revocation reasons
    }

    const { data, error } = await supabase
      .from('role_requests')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        user_id,
        request_type,
        company_name,
        business_email,
        business_phone,
        id_type,
        id_number,
        id_image_url,
        selfie_with_id_url,
        organization_description,
        status,
        rejection_reason,
        submitted_at,
        reviewed_at,
        reviewed_by
      `)
      .single();

    if (error) {
      console.error('Error updating role request:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from update');
    }

    // Fetch user profile info separately (since user_name, user_email don't exist in role_requests)
    let userName = 'Unknown';
    let userEmail = '';
    if (data.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', data.user_id)
        .maybeSingle();
      
      if (profile) {
        userName = profile.full_name || 'Unknown';
        userEmail = profile.email || '';
      }
    }

    // Transform response with fallback values for missing columns
    const updatedRequest: RoleRequest = {
      id: data.id,
      userId: data.user_id,
      userName: userName,
      userEmail: userEmail,
      requestType: data.request_type,
      companyName: data.company_name,
      businessEmail: data.business_email || '',
      businessPhone: data.business_phone || '',
      idType: data.id_type || '',
      idNumber: data.id_number || '',
      idImage: data.id_image_url || '',
      selfieWithId: data.selfie_with_id_url || '',
      reason: data.organization_description || '',
      status: data.status,
      rejectionNote: data.rejection_reason || '', 
      submittedAt: data.submitted_at,
      reviewedAt: data.reviewed_at || '',
      reviewedBy: data.reviewed_by || '',
      createdAt: data.submitted_at, 
      
    };

    // Create notifications for user and admin via SECURITY DEFINER RPCs (bypass RLS safely)
    try {
      const isApproved = status === 'approved';
      const roleLabel = data.request_type === 'organizer' ? 'Event Organizer' : 'Venue Owner';

      // Notify the requester
      await supabase.rpc('create_user_notification', {
        p_user_id: data.user_id,
        p_title: `Role Request ${isApproved ? 'Approved' : 'Rejected'}`,
        p_message: isApproved
          ? `Congratulations! Your ${roleLabel} role request has been approved. You now have ${roleLabel} permissions.`
          : `Your ${roleLabel} role request has been rejected.${rejectionNote ? ` Reason: ${rejectionNote}` : ''}`,
        p_type: 'role_request',
        p_link: '/dashboards/user',
        p_metadata: {
          requestId: id,
          requestType: data.request_type,
          status: status,
          reviewed_by: adminName
        },
        p_priority: 'normal',
        p_created_by: adminUserId,
        p_is_admin_notification: false
      });

      // Broadcast to admins
      await supabase.rpc('broadcast_admin_notification', {
        p_title: `Role Request ${isApproved ? 'Approved' : 'Rejected'}`,
        p_message: `${roleLabel} role request for ${userName} (${userEmail}) was ${status} by ${adminName}.`,
        p_type: 'role_request',
        p_link: `/admin/role-requests?requestId=${id}`,
        p_metadata: {
          requestId: id,
          userId: data.user_id,
          userName: userName,
          userEmail: userEmail,
          requestType: data.request_type,
          status: status,
          reviewed_by: adminName
        },
        p_priority: 'normal',
        p_created_by: adminUserId
      });
    } catch (notificationError) {
      console.error('Failed to create notifications via RPC:', notificationError);
      // Don't fail the main operation if notification creation fails
    }
   
    
    // 🚨 HANDLE ROLE REVOCATION - Remove role and broadcast logout signal
    // Note: 'cancelled' is used because database constraint doesn't allow 'revoked'
    if (status === 'cancelled') {
      try {
        const roleType = data.request_type === 'organizer' ? 'organizer' : 'venue_owner';
        
        console.log('🚨 [ROLE REVOCATION] Starting role revocation process...');
        console.log('🚨 [ROLE REVOCATION] User ID:', data.user_id);
        console.log('🚨 [ROLE REVOCATION] Role Type to remove:', roleType);
        
        // Delete the role from user_roles table
        const { error: roleDeleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', data.user_id)
          .eq('role', roleType);

        if (roleDeleteError) {
          console.error('❌ [ROLE REVOCATION] Failed to delete user role:', roleDeleteError);
        } else {
          console.log('✅ [ROLE REVOCATION] Successfully removed user role from database');
          
          // 🔔 BROADCAST REAL-TIME LOGOUT SIGNAL
          // This will force the user out of their dashboard immediately
          const channel = supabase.channel(`role-revocation-${data.user_id}`);
          await channel.send({
            type: 'broadcast',
            event: 'role_revoked',
            payload: {
              userId: data.user_id,
              revokedRole: roleType,
              timestamp: new Date().toISOString(),
              reason: rejectionNote || 'Role access revoked by administrator'
            }
          });
          
          console.log('✅ [ROLE REVOCATION] Broadcast logout signal sent to user');
          
          // Clean up channel
          await supabase.removeChannel(channel);
        }
      } catch (roleError) {
        console.error('❌ [ROLE REVOCATION] Exception during role revocation:', roleError);
      }
    }
    
    // If approved, update user role in user_roles table AND create profile
    if (status === 'approved') {
      try {
        const roleType = data.request_type === 'organizer' ? 'organizer' : 'venue_owner';
        
        console.log('🔐 [ROLE UPDATE] Starting role update process...');
        console.log('🔐 [ROLE UPDATE] User ID:', data.user_id);
        console.log('🔐 [ROLE UPDATE] Request Type:', data.request_type);
        console.log('🔐 [ROLE UPDATE] Role Type to insert:', roleType);
        console.log('🔐 [ROLE UPDATE] Admin User ID:', adminUserId);
        
        // Insert the new role into user_roles table
        const { error: roleUpdateError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user_id,
            role: roleType,
            granted_by: adminUserId,
            granted_at: new Date().toISOString()
          });

        if (roleUpdateError) {
          console.error('❌ [ROLE UPDATE] Failed to update user role:', roleUpdateError);
          // Don't fail the main operation if role update fails
        } else {
          console.log('✅ [ROLE UPDATE] Successfully updated user role in database');
          console.log('✅ [ROLE UPDATE] User ID:', data.user_id);
          console.log('✅ [ROLE UPDATE] Role inserted:', roleType);
          
          // Verify the role was actually inserted
          const { data: verifyData, error: verifyError } = await supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', data.user_id)
            .eq('role', roleType);
            
          if (verifyError) {
            console.error('❌ [ROLE UPDATE] Failed to verify role insertion:', verifyError);
          } else {
            console.log('✅ [ROLE UPDATE] Role verification successful:', verifyData);
          }

          // 🎯 CREATE ORGANIZER/VENUE OWNER PROFILE
          if (data.request_type === 'organizer') {
            console.log('📝 [ORGANIZER PROFILE] Creating organizer profile...');
            
            const { error: organizerError } = await supabase
              .from('organizers')
              .insert({
                user_id: data.user_id,
                name: data.company_name,
                email: data.business_email || userEmail,
                phone: data.business_phone || '',
                bio: data.organization_description || '',
                status: 'active',
                created_at: new Date().toISOString()
              });

            if (organizerError) {
              console.error('❌ [ORGANIZER PROFILE] Failed to create organizer profile:', organizerError);
            } else {
              console.log('✅ [ORGANIZER PROFILE] Successfully created organizer profile');
            }
          } else if (data.request_type === 'venue_owner') {
            console.log('📝 [VENUE OWNER PROFILE] Creating venue owner profile...');
            
            const { error: venueOwnerError } = await supabase
              .from('venue_owners')
              .insert({
                user_id: data.user_id,
                name: data.company_name,
                email: data.business_email || userEmail,
                phone: data.business_phone || '',
                bio: data.organization_description || '',
                status: 'active',
                created_at: new Date().toISOString()
              });

            if (venueOwnerError) {
              console.error('❌ [VENUE OWNER PROFILE] Failed to create venue owner profile:', venueOwnerError);
            } else {
              console.log('✅ [VENUE OWNER PROFILE] Successfully created venue owner profile');
            }
          }
        }
      } catch (roleError) {
        console.error('❌ [ROLE UPDATE] Exception during role update:', roleError);
        // Don't fail the main operation if role update fails
      }
    }

    return updatedRequest;
  } catch (error) {
    console.error('Failed to update role request status:', error);
    throw error;
  }
};

export default function RoleRequestsPage() {
  // ✅ SESSION MANAGEMENT: Prevent session expiration on role requests page
  useSessionManagement();
  const venuesEnabled = isVenuesEnabled();
  
  const { data: roleRequests, isLoading, isFetching, refetch } = useAdminRoleRequests();
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<RoleRequest | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const { refreshRoles, user: authUser } = useAuth();
  const queryClient = useQueryClient();
  
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get current user session and profile
  useEffect(() => {
    const getUserSession = async () => {
      try {
        // ✅ SECURITY: Verify user authentication
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        if (error || !authUser) {
          router.replace('/admin/login');
          return;
        }

        // Get user profile to get the name
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profileError || !profile) {
          console.warn('Could not fetch profile, using auth user data:', profileError);
          setUser({
            id: authUser.id,
            name: authUser.user_metadata?.name || authUser.email,
            email: authUser.email
          });
        } else {
          setUser({
            id: authUser.id,
            name: profile.full_name || authUser.user_metadata?.name || authUser.email,
            email: profile.email || authUser.email
          });
        }
      } catch (error) {
        console.error('Error getting user session:', error);
        router.replace('/admin/login');
      }
    };

    getUserSession();
  }, [supabase, router]);

  // Apply URL params on initial data load
  useEffect(() => {
    if (!isLoading) {
      const statusParam = searchParams.get('status');
      const typeParam = searchParams.get('type');
      const searchParam = searchParams.get('search');
      if (statusParam && ['pending','approved','rejected','cancelled','all'].includes(statusParam)) setStatusFilter(statusParam);
  if (typeParam && ['organizer','venue_owner','all'].includes(typeParam)) setTypeFilter(typeParam as any);
      if (searchParam) setSearchTerm(searchParam);
    }
  }, [isLoading, searchParams]);

  // When requests loaded or searchParams change, auto-open modal if requestId present
  useEffect(() => {
    if (!isLoading && roleRequests?.length) {
      const requestId = searchParams.get('requestId');
      if (requestId) {
        const target = roleRequests.find(r => r.id === requestId);
        if (target) setSelectedRequest(target as any);
      }
    }
  }, [isLoading, searchParams, roleRequests]);
  
  // ✅ SYNC: Keep selectedRequest in sync with latest React Query data
  // This prevents showing stale reinstatement counts when modal reopens
  useEffect(() => {
    if (selectedRequest && roleRequests?.length) {
      const updatedRequest = roleRequests.find(r => r.id === selectedRequest.id);
      if (updatedRequest) {
        // Only update if data actually changed to avoid infinite loops
        if (
          updatedRequest.reinstatementCount !== selectedRequest.reinstatementCount ||
          updatedRequest.reinstatedAt !== selectedRequest.reinstatedAt ||
          updatedRequest.status !== selectedRequest.status
        ) {
          console.log('[RoleRequests] Syncing selectedRequest with fresh data:', {
            old: { count: selectedRequest.reinstatementCount, at: selectedRequest.reinstatedAt },
            new: { count: updatedRequest.reinstatementCount, at: updatedRequest.reinstatedAt }
          });
          setSelectedRequest(updatedRequest as any);
        }
      }
    }
  }, [roleRequests, selectedRequest]);
  
  // Handle filter changes
  const filteredRequests = useMemo(() => {
    const source = roleRequests || [];
    return source.filter(r => {
      if (!venuesEnabled && r.requestType === 'venue_owner') return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (typeFilter !== 'all' && r.requestType !== typeFilter) return false;
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        if (!(
          r.userName?.toLowerCase().includes(lower) ||
          r.userEmail?.toLowerCase().includes(lower) ||
          r.companyName?.toLowerCase().includes(lower) ||
          r.businessEmail?.toLowerCase().includes(lower)
        )) return false;
      }
      return true;
    }) as RoleRequest[];
  }, [roleRequests, statusFilter, typeFilter, searchTerm, venuesEnabled]);
  
  // Handle request approval - use API route to bypass RLS
  const handleApproveRequest = async (id: string) => {
    if (!user) { 
      toast.showError('Authentication Required', 'You must be logged in to perform this action'); 
      return; 
    }

    const targetRequest = (roleRequests || []).find(r => r.id === id);
    if (targetRequest?.requestType === 'venue_owner' && !venuesEnabled) {
      toast.showInfo('Temporarily Unavailable', 'Venue owner approvals are currently disabled.');
      return;
    }

    try {
      // Call the API route instead of client-side logic
      const response = await fetch(`/api/admin/role-requests/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        const detail = typeof errorData?.details === 'string'
          ? errorData.details
          : errorData?.details?.message;
        throw new Error(detail || errorData.error || 'Failed to approve request');
      }

      const result = await response.json();
      const updatedRequest = result.request;
      
      // Invalidate event queries so updated organizer name appears
      if (updatedRequest.requestType === 'organizer') {
        queryClient.invalidateQueries({ queryKey: ['admin','events','detailed'] });
      }
      
      setSelectedRequest(null);
      // Manually update cache for immediate UI response
      refetch();
      // If the approving admin is the same as the requester (self-upgrade), force refresh roles
      if (authUser?.id && authUser.id === updatedRequest.userId) {
        refreshRoles(true); // force bypass TTL for immediate UI capability update
      }
      toast.showSuccess('Request Approved', 'The role request has been approved successfully');
    } catch (error) {
      console.error('Failed to approve request:', error);
      toast.showError('Approval Failed', error instanceof Error ? error.message : 'Failed to approve request. Please try again.');
    }
  };
  
  // Handle request rejection
  const handleRejectRequest = async (id: string, note: string) => {
    if (!user) { 
      toast.showError('Authentication Required', 'You must be logged in to perform this action'); 
      return; 
    }

    try {
      // Use the reject API endpoint for proper audit logging
      const response = await fetch(`/api/admin/role-requests/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to reject request');
      }
      
      setSelectedRequest(null);
      refetch();
      toast.showSuccess('Request Rejected', 'The role request has been rejected');
    } catch (error) {
      console.error('Failed to reject request:', error);
      toast.showError('Rejection Failed', 'Failed to reject request. Please try again.');
    }
  };
  
  // Handle request revocation
  const handleRevokeRequest = async (id: string, note: string) => {
    if (!user) { 
      toast.showError('Authentication Required', 'You must be logged in to perform this action'); 
      return; 
    }

    const targetRequest = (roleRequests || []).find(r => r.id === id);
    if (targetRequest?.requestType === 'venue_owner' && !venuesEnabled) {
      toast.showInfo('Temporarily Unavailable', 'Venue owner role workflow is currently disabled.');
      return;
    }

    try {
      // Use the revoke API endpoint
      const response = await fetch(`/api/admin/role-requests/${id}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to revoke request');
      }
      
      setSelectedRequest(null);
      refetch();
      // If the revoking admin is the same as the requester, force refresh roles
      if (authUser?.id && authUser.id === result.request.userId) {
        refreshRoles(true); // force bypass TTL for immediate UI capability update
      }
      toast.showSuccess('Request Revoked', 'The role request has been revoked successfully');
    } catch (error) {
      console.error('Failed to revoke request:', error);
      toast.showError('Revocation Failed', 'Failed to revoke request. Please try again.');
    }
  };
  
  // Handle request reinstatement
  const handleReinstateRequest = async (id: string, note: string) => {
    if (!user) { 
      toast.showError('Authentication Required', 'You must be logged in to perform this action'); 
      return; 
    }

    const targetRequest = (roleRequests || []).find(r => r.id === id);
    if (targetRequest?.requestType === 'venue_owner' && !venuesEnabled) {
      toast.showInfo('Temporarily Unavailable', 'Venue owner reinstatements are currently disabled.');
      return;
    }

    try {
      // Use the reinstate API endpoint
      const response = await fetch(`/api/admin/role-requests/${id}/reinstate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to reinstate request');
      }
      
      // ✅ Update the selected request immediately to show badge without refetch delay
      if (selectedRequest && result.request) {
        setSelectedRequest({
          ...selectedRequest,
          status: result.request.status,
          reviewedAt: result.request.reviewedAt,
          reviewedBy: result.request.reviewedBy,
          reinstatedAt: result.request.reinstatedAt,
          reinstatementCount: result.request.reinstatementCount,
        });
      }
      
      // Refetch to update the list
      refetch();
      
      // If the reinstating admin is the same as the requester, force refresh roles
      if (authUser?.id && authUser.id === result.request.userId) {
        refreshRoles(true); // force bypass TTL for immediate UI capability update
      }
      toast.showSuccess('Request Reinstated', 'The role request has been reinstated successfully');
    } catch (error) {
      console.error('Failed to reinstate request:', error);
      toast.showError('Reinstatement Failed', 'Failed to reinstate request. Please try again.');
    }
  };
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Update URL with search params for shareable links
    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    
    const url = `/admin/role-requests${params.toString() ? `?${params.toString()}` : ''}`;
    router.replace(url);
  };
  
  // Clear all filters
  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setSearchTerm('');
    router.replace('/admin/role-requests');
  };
  
  // Calculate stats
  const pendingCount = (roleRequests||[]).filter(r => r.status === 'pending').length;
  const approvedCount = (roleRequests||[]).filter(r => r.status === 'approved').length;
  const rejectedCount = (roleRequests||[]).filter(r => r.status === 'rejected').length;
  const revokedCount = (roleRequests||[]).filter(r => r.status === 'cancelled').length;
  
  // Check if any filters are applied
  const hasFilters = statusFilter !== 'all' || typeFilter !== 'all' || searchTerm !== '';
  
  // Loading state
  if (isLoading) {
    return <PageLoader message="Loading role requests..." fullHeight />;
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Role Requests</h1>
        <div className="flex gap-2">
          <RefreshButton 
             queryKeys={[['admin', 'roleRequests', 'normalized']]}
             isLoading={isFetching}
          />
        </div>
      </div>
      
      {/* Filters and search */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-2 lg:mr-4">
            <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Filter by:</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-grow gap-3">
            {/* Status filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full appearance-none bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-800 rounded-lg py-2 pl-3 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Revoked</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 dark:text-gray-500">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
            
            {/* Type filter */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="block w-full appearance-none bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-800 rounded-lg py-2 pl-3 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary focus:border-primary"
              >
                <option value="all">All Request Types</option>
                <option value="organizer">Organizer</option>
                {venuesEnabled && <option value="venue_owner">Venue Owner</option>}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400 dark:text-gray-500">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
            
            {/* Search input */}
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search by name, email, or company"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-lg text-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          
            <div className="flex gap-2">
            {hasFilters && (
              <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2 border border-gray-300 dark:border-neutral-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-600 cursor-pointer"
              >
              Clear
              </button>
            )}
            <button
              type="submit"
              className="px-3 py-2 bg-black dark:bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-black focus:ring-offset-2 cursor-pointer"
            >
              Search
            </button>
            </div>
        </form>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-full">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Pending</div>
              <div className="text-xl font-bold mt-0.5 text-gray-900 dark:text-gray-100">{pendingCount}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Approved</div>
              <div className="text-xl font-bold mt-0.5 text-gray-900 dark:text-gray-100">{approvedCount}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
              <X className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Rejected</div>
              <div className="text-xl font-bold mt-0.5 text-gray-900 dark:text-gray-100">{rejectedCount}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-neutral-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full">
              <Ban className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">Revoked</div>
              <div className="text-xl font-bold mt-0.5 text-gray-900 dark:text-gray-100">{revokedCount}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Requests Table */}
      <div className="bg-white dark:bg-neutral-900 shadow rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-gray-100 dark:[&::-webkit-scrollbar-track]:bg-neutral-800 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600 [&::-webkit-scrollbar-thumb]:rounded-full">
          {(isLoading || isFetching) ? (
             <div className="p-12 text-center">
               <RefreshCcw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
               <p className="text-gray-500 dark:text-gray-400">Loading role requests...</p>
             </div>
          ) : filteredRequests.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
        <thead className="bg-gray-50 dark:bg-neutral-800">
                <tr>
          <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
          <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
          <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date Requested
                  </th>
          <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
          <th scope="col" className="px-6 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-800">
                {filteredRequests.map((request) => (
          <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800">
          <td className="px-6 py-2 whitespace-nowrap">
                      <div className="flex items-center">
            {/* User avatar with profile image support */}
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 dark:bg-neutral-600 flex items-center justify-center overflow-hidden">
                          {request.userImage ? (
                            <Image 
                              src={request.userImage} 
                              alt={request.userName || 'User'} 
                              width={32}
                              height={32}
                              className="h-8 w-8 rounded-full object-cover" 
                              onError={(e) => {
                                // Hide image and show fallback on error
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling;
                                if (fallback) fallback.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <span className={`text-gray-600 dark:text-gray-400 font-medium text-sm ${request.userImage ? 'hidden' : ''}`}>
                            {request.userName?.charAt(0) || 'U'}
                          </span>
                        </div>
            <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{request.userName || 'N/A'}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                            {request.companyName}
                          </div>
                        </div>
                      </div>
                    </td>
          <td className="px-6 py-2 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.requestType === 'organizer' 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' 
                          : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                      }`}>
                        {request.requestType === 'organizer' ? 'Organizer' : 'Venue Owner'}
                      </span>
                    </td>
          <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(request.submittedAt).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
          <td className="px-6 py-2 whitespace-nowrap">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-50 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white cursor-pointer"
                          aria-label="View role request details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-6">
              <EmptyState onClearFilters={clearFilters} hasFilters={hasFilters} />
            </div>
          )}
        </div>
        
        {/* Pagination placeholder */}
        {filteredRequests.length > 0 && (
          <div className="bg-white dark:bg-neutral-900 px-4 py-3 border-t border-gray-200 dark:border-neutral-800 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing <span className="font-medium">{filteredRequests.length}</span> of{" "}
                <span className="font-medium">{roleRequests?.length || 0}</span> results
              </div>
              
              {/* Pagination placeholder - implement if needed */}
              {filteredRequests.length < (roleRequests?.length || 0) && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Use filters to narrow your results
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Request Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={handleApproveRequest}
          onReject={handleRejectRequest}
          onRevoke={handleRevokeRequest}
          onReinstate={handleReinstateRequest}
        />
      )}
    </div>
  );
}