"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client/client';
import { Button } from "@/components/ui/button";
import { Plus, CreditCard, History, Key, Lock, AlertCircle, Building2, Gift } from 'lucide-react';
import { BuyKeysModal } from '@/components/dashboards/organizer/keys/BuyKeysModal';
import { GenerateKeysModal } from '@/components/dashboards/organizer/keys/GenerateKeysModal';
import { format } from 'date-fns';
import { useToast } from "@/hooks/useToast";
import { PageLoader } from '@/components/loaders/PageLoader';

const ORGANIZER_LOOKUP_TIMEOUT_MS = 10000;
const KEYS_QUERY_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race<T>([
    Promise.resolve(promise),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

export default function KeysManagerPage() {
  const { user, loading: authLoading, refreshSession, hasRole } = useAuth();
  const [balance, setBalance] = useState(0);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const supabase = createClient();
  const toast = useToast();

  useEffect(() => {
    if (authLoading) return;

    if (user && hasRole('organizer')) {
      fetchOrgData();
    } else if (user && !hasRole('organizer')) {
      setLoading(false);
      setError("ROLE_REQUIRED");
    } else {
      setLoading(false);
      setError("AUTH_REQUIRED");
    }
  }, [user, authLoading, hasRole]);

  const lookupOrganizer = async (userId: string) => {
    return withTimeout<any>(
      supabase
        .from('organizers')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle(),
      ORGANIZER_LOOKUP_TIMEOUT_MS,
      'organizer lookup'
    );
  };

  const fetchOrgData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Get Org ID from 'organizers'
      let orgResult = await lookupOrganizer(user.id);

      // If lookup timed out, force a session refresh and retry once.
      if (orgResult.error && String(orgResult.error.message || '').includes('timed out')) {
        await refreshSession();
        orgResult = await lookupOrganizer(user.id);
      }

      const { data: org, error: orgError } = orgResult;

      if (orgError) {
        throw orgError;
      }

      if (!org) {
        setError("NO_ORG");
        return;
      }

      if (org.id) {
        setOrgId(org.id);

        // Fetch sub-data in parallel
        await Promise.all([
            fetchBalance(org.id),
            fetchCoupons(org.id)
        ]);
      }
    } catch (err: any) {
        console.error("Error loading keys manager:", err);
        setError(err.message || "Failed to load organization data");
        toast.showError("Failed to load dashboard data");
    } finally {
        setLoading(false);
    }
  };

  const fetchBalance = async (id: string) => {
    const { data } = await withTimeout<any>(
      supabase
        .from('organization_keys_balance')
        .select('current_balance')
        .eq('organization_id', id)
        .single(),
      KEYS_QUERY_TIMEOUT_MS,
      'keys balance lookup'
    );
    setBalance(data?.current_balance || 0);
  };

  const fetchCoupons = async (id: string) => {
    const { data } = await withTimeout<any>(
      supabase
        .from('keys_coupons')
        .select('*')
        .eq('organization_id', id)
        .order('created_at', { ascending: false }),
      KEYS_QUERY_TIMEOUT_MS,
      'keys coupons lookup'
    );
    setCoupons(data || []);
  };

  if (loading) {
      return <PageLoader message="Loading keys dashboard..." fullHeight />;
  }

  if (error === "NO_ORG") {
      return (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center max-w-lg mx-auto">
              <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                  <Building2 className="w-10 h-10 text-neutral-400" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">Organizer Profile Required</h2>
              <p className="text-neutral-500 mb-8">
                  You need to create an organization profile before you can manage marketing keys.
              </p>
              <Button onClick={() => window.location.href = "/dashboards/organizer/settings"}>
                  Create Organization Profile
              </Button>
          </div>
      );
  }

  if (error === "AUTH_REQUIRED") {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Sign In Required</h2>
        <p className="text-neutral-500 mb-8">
          Please sign in again to access keys management.
        </p>
        <Button onClick={() => window.location.href = "/login"}>
          Go to Login
        </Button>
      </div>
    );
  }

  if (error === "ROLE_REQUIRED") {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Organizer Role Required</h2>
        <p className="text-neutral-500 mb-8">
          Your account does not currently have organizer access.
        </p>
        <Button onClick={() => window.location.href = "/dashboards/user"}>
          Go to User Dashboard
        </Button>
      </div>
    );
  }

  if (error) {
    return (
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl m-6">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-medium">Error: {error}</p>
            <Button variant="outline" onClick={fetchOrgData} className="mt-4 border-red-200 hover:bg-red-100 text-red-700">
                Retry
            </Button>
        </div>
    );
  }

  // Safe to assert orgId is present here
  const safeOrgId = orgId!;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Keys Management</h1>
          <p className="text-neutral-500">Manage your marketing budget and generate reward codes.</p>
        </div>
        
        <div className="flex gap-3">
          <Button 
             variant="outline" 
             onClick={() => setIsBuyModalOpen(true)}
             className="gap-2 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" /> Buy Keys
          </Button>
          <Button 
            onClick={() => setIsGenerateModalOpen(true)}
            className="gap-2 bg-neutral-900 hover:bg-black text-white cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Generate Code
          </Button>
          <Button
            variant="secondary"
            onClick={() => (window.location.href = "/pages/rewards")}
            className="gap-2 cursor-pointer"
          >
            <Gift className="w-4 h-4" />Rewards
          </Button>
        </div>
      </div>

      {/* Balance Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-neutral-400 font-medium mb-1">Marketing Balance</h3>
            <div className="text-4xl font-bold flex items-center gap-2">
              <Key className="w-8 h-8 text-yellow-500" />
              {balance.toLocaleString()}
            </div>
            <p className="text-sm text-neutral-400 mt-4">
              Approx. Value: GHS {(balance * 0.10).toFixed(2)}
            </p>
          </div>
          {/* Background decoration */}
          <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-1/3 -translate-y-1/3">
             <Key className="w-48 h-48" />
          </div>
        </div>

        {/* Quick Stats or Tips */}
        <div className="md:col-span-2 bg-white border border-neutral-200 rounded-2xl p-6 flex items-center shadow-sm">
           <div>
             <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" /> Pro Tip
             </h3>
             <p className="text-neutral-600">
               Use keys to reward early birds! Generating a code for "First 50 Ticket Buyers" 
               is a great way to drive initial sales momentum.
             </p>
           </div>
        </div>
      </div>

      {/* Active Coupons List */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <History className="w-4 h-4 text-neutral-500" />
            Active Campaigns
          </h3>
        </div>
        
        <div className="divide-y divide-neutral-100">
          {coupons.length === 0 ? (
            <div className="p-12 text-center text-neutral-500">
              No active coupon codes. Generate one to get started!
            </div>
          ) : (
            coupons.map((coupon) => (
              <div key={coupon.id} className="p-6 flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-neutral-50 transition-colors">
                <div className="flex-1">
                   <div className="flex items-center gap-3 mb-1">
                     <span className="font-mono font-bold text-lg text-neutral-900 bg-neutral-100 px-3 py-1 rounded-md border border-neutral-200">
                       {coupon.code}
                     </span>
                     <span className={`text-xs px-2 py-0.5 rounded-full ${coupon.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                       {coupon.is_active ? 'Active' : 'Inactive'}
                     </span>
                   </div>
                   <div className="text-sm text-neutral-500">
                     Created on {format(new Date(coupon.created_at), 'MMM d, yyyy')}
                   </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <div className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Value</div>
                    <div className="font-semibold text-neutral-900">{coupon.amount} Keys</div>
                  </div>
                  <div className="text-center">
                     <div className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Redeemed</div>
                     <div className="font-semibold text-neutral-900">
                       {coupon.uses_count} <span className="text-neutral-400">/ {coupon.max_uses}</span>
                     </div>
                  </div>
                  <div className="text-center">
                     <div className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Expires</div>
                     <div className="text-sm text-neutral-900">
                       {coupon.expires_at ? format(new Date(coupon.expires_at), 'MMM d') : 'Never'}
                     </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <BuyKeysModal 
        isOpen={isBuyModalOpen} 
        onClose={() => setIsBuyModalOpen(false)} 
        organizationId={safeOrgId}
        onSuccess={() => fetchBalance(safeOrgId)}
      />

      <GenerateKeysModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        organizationId={safeOrgId}
        onSuccess={() => {
          fetchBalance(safeOrgId); 
          fetchCoupons(safeOrgId);
        }}
      />
    </div>
  );
}
