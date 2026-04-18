"use client";

import React, { useEffect, useState } from 'react';
import { X, CreditCard, Loader2, Key, Ticket, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from "@/components/ui/switch";
import { createClient } from '@/lib/supabase/client/client';
import { useAuth } from '@/contexts/AuthContext';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    title: string;
  };
  purchaseDetails: {
    ticket: any;
    quantity: number;
    total: number;
  } | null;
}

export function CheckoutModal({ isOpen, onClose, event, purchaseDetails }: CheckoutModalProps) {
  const { user } = useAuth();
  const supabase = createClient();
  
  // State
  const [loading, setLoading] = useState(false);
  const [keyBalance, setKeyBalance] = useState(0);
  const [useKeys, setUseKeys] = useState(false);
  
  // Load Balance on Open
  useEffect(() => {
    if (isOpen && user) {
      fetchKeyBalance();
    }
  }, [isOpen, user]);

  const fetchKeyBalance = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_keys_balance')
      .select('current_balance')
      .eq('user_id', user.id)
      .single();
    setKeyBalance(data?.current_balance || 0);
  };

  if (!isOpen || !purchaseDetails) return null;
  
  const { ticket, quantity, total: originalTotal } = purchaseDetails;
  
  // Financial Calculations
  const FEES_PERCENTAGE = 0.0195;
  const processingFee = originalTotal * FEES_PERCENTAGE;
  const subTotalWithFees = originalTotal + processingFee;
  
  // Key Logic: 1 Key = 0.10 GHS
  const KEY_VALUE_GHS = 0.10;
  const maxDiscountGHS = keyBalance * KEY_VALUE_GHS;
  
  // If using keys, how much can we cover?
  // We can cover up to the full amount (including fees? usually yes, let's say keys cover total bill)
  const discountAmount = useKeys ? Math.min(subTotalWithFees, maxDiscountGHS) : 0;
  const keysToSpend = Math.ceil(discountAmount / KEY_VALUE_GHS);
  
  const finalTotal = Math.max(0, subTotalWithFees - discountAmount);
  const isFullyCoveredByKey = finalTotal === 0 && useKeys;

  const handlePayment = async () => {
    setLoading(true);
    try {
      // 1. Spend Keys if applicable
      if (useKeys && keysToSpend > 0) {
        const { data: spendData, error: spendError } = await supabase.rpc('spend_user_keys', {
          p_user_id: user?.id,
          p_amount: keysToSpend,
          p_desc: `Ticket Purchase: ${event.title}`,
          p_metadata: { ticket_id: ticket.id, quantity }
        });

        if (spendError) throw spendError;
        if (spendData && !spendData.success) throw new Error(spendData.message);
      }

      // 2. Process Remaining Payment (if any)
      if (finalTotal > 0) {
        // Simulate Hubtel
         await new Promise(resolve => setTimeout(resolve, 2000));
      }

      toast.success("Ticket purchased successfully!");
      onClose();
      // In a real app, you'd refresh the ticket list or redirect to ticket page
    } catch (error: any) {
      console.error("Payment failed", error);
      toast.error(error.message || "Transaction failed");
      // TODO: If split payment failed, we might need to rollback keys? 
      // Ideally this is one atomic backend transaction or we have a refund mechanism.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="relative pt-4 px-5 pb-3 bg-white border-b border-gray-100 flex-shrink-0 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Purchase Ticket</h2>
              <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{event.title}</p>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 py-2 flex-1 overflow-y-auto custom-scrollbar">
          {/* Order Summary - Compact */}
          <div className="bg-neutral-50 rounded-xl p-3 mb-3 border border-neutral-100">
            <h3 className="font-semibold text-neutral-900 text-sm mb-2 flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5" />
              Order Summary
            </h3>
            
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-600">Ticket Type</span>
                <span className="font-medium text-neutral-900">{ticket?.name || 'Standard'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600">Quantity</span>
                <span className="font-medium text-neutral-900">{quantity}</span>
              </div>
              
              <div className="border-t border-dashed border-neutral-200 my-1.5 pt-1.5"></div>
              
               <div className="flex justify-between text-neutral-500">
                 <span>Subtotal</span>
                 <span>₵ {originalTotal.toFixed(2)}</span>
               </div>
              <div className="flex justify-between text-neutral-500">
                <span>Processing Fee (1.95%)</span>
                <span>₵ {processingFee.toFixed(2)}</span>
              </div>
              
              {/* Discount Row */}
              {useKeys && discountAmount > 0 && (
                 <div className="flex justify-between text-green-600 font-medium animate-in fade-in slide-in-from-right-4">
                    <span className="flex items-center gap-1"><Key className="w-3 h-3" /> Keys Discount ({keysToSpend})</span>
                    <span>- ₵ {discountAmount.toFixed(2)}</span>
                 </div>
              )}

              <div className="border-t border-neutral-200 my-1.5 pt-1.5 flex justify-between text-base font-bold text-gray-900">
                <span>Total</span>
                <span>₵ {finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* Keys Redemption - Compact */}
          <div className="mb-3 border border-amber-200 bg-amber-50/50 rounded-lg p-3">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-amber-400 to-amber-600 w-7 h-7 rounded-full flex items-center justify-center text-white shadow-sm">
                       <Key className="w-3.5 h-3.5" />
                    </div>
                    <div>
                       <h4 className="font-semibold text-sm text-gray-900 leading-tight">Pay with Keys</h4>
                       <p className="text-[10px] text-gray-600">Bal: <span className="font-bold">{keyBalance}</span> (Val: ₵ {(keyBalance * 0.10).toFixed(2)})</p>
                    </div>
                </div>
                <Switch 
                   checked={useKeys} 
                   onCheckedChange={setUseKeys}
                   disabled={keyBalance <= 0}
                   className="scale-90 data-[state=checked]:bg-amber-500 cursor-pointer"
                />
             </div>
             {keyBalance <= 0 && (
                <p className="text-[10px] text-amber-600 mt-1 ml-9">Insufficient keys.</p>
             )}
          </div>

          {/* Payment Method - Hide if fully covered */}
          {!isFullyCoveredByKey && (
             <div className="mb-2">
               <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3 flex items-center gap-3 cursor-pointer ring-1 ring-blue-200/50 hover:ring-blue-300 transition-all">
                 <div className="w-9 h-9 bg-white rounded-md flex items-center justify-center p-1.5 shadow-sm overflow-hidden border border-blue-100 flex-shrink-0">
                   <img src="/logo/hubtel.png" alt="Hubtel" className="w-full h-full object-contain" />
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="font-bold text-sm text-blue-900 truncate">Hubtel Pay</p>
                   <p className="text-[10px] text-blue-700/80 truncate">Mobile Money & Cards</p>
                 </div>
                 <div className="bg-blue-500 text-white p-0.5 rounded-full">
                   <Check className="w-3 h-3" />
                 </div>
               </div>
               
               <p className="text-[10px] text-neutral-400 mt-2 text-center">
                 Secure payment processing powered by Hubtel.
               </p>
             </div>
          )}

          {isFullyCoveredByKey && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3 text-green-800 animate-in fade-in zoom-in-95 text-xs">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Total covered by your keys!</span>
              </div>
          )}
        </div>

        <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0 rounded-b-xl">
          <button
            onClick={handlePayment}
            disabled={loading}
            className={`w-full py-2.5 text-white rounded-lg cursor-pointer font-bold text-sm shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isFullyCoveredByKey 
                  ? "bg-amber-500 hover:bg-amber-600 shadow-amber-100" 
                  : "bg-primary hover:bg-primary-dark shadow-neutral-200"
            }`}
          >
            {loading ? (
                <> <Loader2 className="w-4 h-4 animate-spin" /> Processing... </>
            ) : isFullyCoveredByKey ? (
                <> <Ticket className="w-4 h-4" /> Redeem Ticket </>
            ) : (
                <> Pay ₵ {finalTotal.toFixed(2)} </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
