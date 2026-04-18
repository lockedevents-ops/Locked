"use client";

import React, { useEffect, useState } from 'react';
import { X, CreditCard, Loader2, Key, Ticket, Check, Users, MinusIcon, PlusIcon, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from "@/components/ui/switch";
import { createClient } from '@/lib/supabase/client/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { eventRegistrationService } from '@/services/eventRegistrationService';
import { RegistrationSuccessModal } from './RegistrationSuccessModal';
import { useCartStore } from '@/store/cartStore';
import { cartService } from '@/services/cartService';

interface UnifiedCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    title: string;
  };
  purchaseDetails: {
    tickets: Array<{ ticket: any; quantity: number; subtotal: number }>;
    total: number;
  } | null;
  isFree: boolean;
  cartItems?: any[];
}

export function UnifiedCheckoutModal({ isOpen, onClose, event, purchaseDetails, isFree, cartItems }: UnifiedCheckoutModalProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const { profile, loading: profileLoading } = useProfile();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { getItemsForEvent } = useCartStore();
  
  // State
  const [loading, setLoading] = useState(false);
  const [keyBalance, setKeyBalance] = useState(0);
  const [useKeys, setUseKeys] = useState(false);
  const [includeMerch, setIncludeMerch] = useState(false);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(true);
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);
  const [updatedTotalSpots, setUpdatedTotalSpots] = useState(0);
  
  // Determine if this is a direct merchandise checkout (e.g. from global cart)
  const isMerchCheckout = event.id === 'merchandise-cart';
  
  // Get relevant items: either passed directly or filtered by event
  const effectiveCartItems = isMerchCheckout 
    ? (cartItems || []) 
    : (event?.id ? getItemsForEvent(event.id) : []);
    
  // For event registration, we only care about merch if explicit switch is on.
  // For merch checkout, we always include "merch" (the main items).
  const hasMerchInCart = effectiveCartItems.length > 0 && !isFree;
  
  // Calculate merch total
  const merchTotal = effectiveCartItems.reduce(
    (sum: any, item: any) => sum + (item.product_price * item.quantity),
    0
  );
  
  // Extract first ticket for legacy free registration (free events typically have one ticket type)
  const firstTicket = purchaseDetails?.tickets[0]?.ticket;
  const totalQuantity = purchaseDetails?.tickets.reduce((sum, t) => sum + t.quantity, 0) || 0;
  
  // Get available spots for free events (use first ticket for free events since they typically have one type)
  const availableSpots = firstTicket?.quantity || 0;
  const maxSpots = isFree ? Math.min(5, availableSpots) : 5;
  
  useEffect(() => {
    if (isOpen) {
      if (user && !isFree) {
        fetchKeyBalance();
      }
      setIsItemsExpanded(false);
      // Check if user is already registered
      if (user?.email && isFree) {
        checkIfRegistered();
      } else {
        setCheckingRegistration(false);
      }
    }
  }, [isOpen, user, isFree]);

  const fetchKeyBalance = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_keys_balance')
      .select('current_balance')
      .eq('user_id', user.id)
      .single();
    setKeyBalance(data?.current_balance || 0);
  };

  const checkIfRegistered = async () => {
    if (!user?.email) {
      setCheckingRegistration(false);
      return;
    }
    setCheckingRegistration(true);
    try {
      const isRegistered = await eventRegistrationService.isUserRegistered(event.id, user.email);
      setIsAlreadyRegistered(isRegistered);
    } catch (error) {
      console.error('Error checking registration:', error);
      setIsAlreadyRegistered(false);
    } finally {
      setCheckingRegistration(false);
    }
  };

  if (!isOpen || !purchaseDetails) return null;
  
  const { tickets, total: originalTotal } = purchaseDetails;
  
  // Financial Calculations
  const ticketSubtotal = originalTotal;
  const merchSubtotal = (!isMerchCheckout && includeMerch) ? merchTotal : 0;
  const combinedSubtotal = ticketSubtotal + merchSubtotal;
  
  const FEES_PERCENTAGE = 0.0195;
  const processingFee = combinedSubtotal * FEES_PERCENTAGE;
  const subTotalWithFees = combinedSubtotal + processingFee;
  
  // Key Logic
  const KEY_VALUE_GHS = 0.10;
  const maxDiscountGHS = keyBalance * KEY_VALUE_GHS;
  const discountAmount = useKeys ? Math.min(subTotalWithFees, maxDiscountGHS) : 0;
  const keysToSpend = Math.ceil(discountAmount / KEY_VALUE_GHS);
  
  const finalTotal = Math.max(0, subTotalWithFees - discountAmount);
  const isFullyCoveredByKey = finalTotal === 0 && useKeys;

  const handlePayment = async () => {
    setLoading(true);
    try {
      if (useKeys && keysToSpend > 0) {
        const { error: spendError } = await supabase.rpc('spend_user_keys', {
          p_user_id: user?.id,
          p_amount: keysToSpend,
          p_desc: isMerchCheckout 
            ? `Merchandise Purchase (Cart)` 
            : `Ticket${includeMerch ? ' + Merchandise' : ''} Purchase: ${event.title}`,
          p_metadata: { 
             tickets: tickets.map(t => ({ id: t.ticket?.id, name: t.ticket?.name, quantity: t.quantity })),
             totalQuantity,
             includeMerch: isMerchCheckout ? true : includeMerch, 
             merchItems: effectiveCartItems.length 
          }
        });
        if (spendError) throw spendError;
      }

      if (finalTotal > 0) {
        // Initiate Hubtel Payment
        const response = await fetch('/api/payments/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: isMerchCheckout ? 'MERCH' : 'TICKET',
                amount: finalTotal,
                eventId: event.id,
                organizerId: null, // We might need to fetch this or pass it in props if available
                items: effectiveCartItems,
                description: isMerchCheckout 
                    ? `Merch Purchase: ${effectiveCartItems.length} items` 
                    : `Tickets for ${event.title}`,
                metadata: {
                    tickets: tickets.map(t => ({
                        ticket_id: t.ticket?.id,
                        ticket_name: t.ticket?.name,
                        quantity: t.quantity,
                        price: t.ticket?.price
                    })),
                    is_merch_checkout: isMerchCheckout,
                    include_merch: includeMerch,
                    cart_items: effectiveCartItems.map((item: any) => ({
                        id: item.id,
                        name: item.product_name,
                        quantity: item.quantity,
                        price: item.product_price
                    }))
                },
                returnUrl: window.location.href // Redirect back to current page? Or a success page?
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Payment initiation failed');
        }

        if (data.checkoutUrl) {
            // Redirect to Hubtel
            window.location.href = data.checkoutUrl;
            return; // Don't close modal, let redirect happen
        }
      } else {
          // Fully covered by keys or free (though free is handled by handleFreeRegistration)
          // Steps for 100% key discount
          
          // Clear relevant cart items
          const itemsToClear = isMerchCheckout ? effectiveCartItems : (includeMerch ? effectiveCartItems : []);
          
          if (itemsToClear.length > 0) {
            for (const item of itemsToClear) {
              await cartService.removeFromCart(item.id);
            }
          }

          toast.success("Payment successful!");
          onClose();
      }

    } catch (error: any) {
      console.error("Payment failed", error);
      toast.error(error.message || "Transaction failed");
      // TODO: If key spend succeeded but payment failed, we have a partial state. 
      // Ideally backend handles this electronically.
    } finally {
      if (finalTotal <= 0) {
          setLoading(false);
      }
      // If redirecting, we might leave loading true to prevent user interaction
    }
  };

  const handleFreeRegistration = async () => {
    setLoading(true);
    try {
        const formData = {
            attendee_name: profile?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || '',
            attendee_email: user?.email || '',
            attendee_phone: profile?.phone_number || user?.user_metadata?.phone || '',
            ticket_type: firstTicket?.name || 'General',
            quantity: totalQuantity,
        };
        const result = await eventRegistrationService.registerForEvent(event.id, formData);
        if (result.success) {
            // Update total spots count for success modal
            setUpdatedTotalSpots(result.registration?.quantity_registered || totalQuantity);
            setShowSuccessModal(true);
        } else {
            toast.error(result.error || 'Failed to register for event');
        }
    } catch (error: any) {
        console.error('Registration error:', error);
        toast.error('An unexpected error occurred');
    } finally {
        setLoading(false);
    }
  }

  const handleSubmit = isFree ? handleFreeRegistration : handlePayment;

  return (
    <>
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="relative pt-4 px-5 pb-3 bg-white border-b border-gray-100 flex-shrink-0 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{isFree ? 'Register for Event' : (isMerchCheckout ? 'Checkout' : 'Purchase Ticket')}</h2>
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

        {/* Body */}
        <div className="px-5 py-4 flex-1 overflow-y-auto custom-scrollbar">
          {/* Already Registered Message */}
          {checkingRegistration ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-neutral-600">Checking registration status...</span>
            </div>
          ) : (
          <>
          {/* Order Summary */}
          <div className="bg-neutral-50 rounded-xl p-3 mb-4 border border-neutral-100">
            <h3 className="font-semibold text-neutral-900 text-sm mb-2 flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5" />
              {isFree ? 'Registration Details' : 'Order Summary'}
            </h3>
            
            {/* Info msg for existing registration */}
            {isAlreadyRegistered && isFree && (
              <div className="mb-3 bg-blue-50 border border-blue-100 rounded-lg p-2.5 flex items-start gap-2">
                <div className="bg-blue-100 rounded-full p-1 flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-blue-700 font-medium">Update Registration</p>
                  <p className="text-[10px] text-blue-600 leading-tight mt-0.5">You are adding {totalQuantity} more {totalQuantity > 1 ? 'spots' : 'spot'} to your existing registration.</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              {/* Conditional Items Display for Global Merch Checkout */}
              {isMerchCheckout && effectiveCartItems.length > 0 ? (
                 <div className="mb-3 border-b border-dashed border-neutral-200 pb-2">
                    <div 
                       className="flex justify-between items-center cursor-pointer hover:bg-neutral-100 p-1 -mx-1 rounded" 
                       onClick={() => effectiveCartItems.length > 1 && setIsItemsExpanded(!isItemsExpanded)}
                    >
                       <span className="text-neutral-600">Items ({effectiveCartItems.length})</span>
                       {effectiveCartItems.length > 1 && (
                          isItemsExpanded ? <ChevronUp className="w-3 h-3 text-neutral-400" /> : <ChevronDown className="w-3 h-3 text-neutral-400" />
                       )}
                    </div>

                    {/* Collapsible List */}
                    {(effectiveCartItems.length === 1 || isItemsExpanded) && (
                       <div className="mt-1 space-y-1 animate-in slide-in-from-top-1 fade-in duration-200">
                          {effectiveCartItems.map((item: any, idx: number) => (
                             <div key={idx} className="flex justify-between pl-2 border-l-2 border-neutral-200">
                                <span className="text-neutral-700 truncate max-w-[160px]">{item.product_name} <span className="text-neutral-400">x{item.quantity}</span></span>
                                <span className="font-medium text-neutral-900">₵ {(item.product_price * item.quantity).toFixed(2)}</span>
                             </div>
                          ))}
                       </div>
                    )}
                 </div>
              ) : (
                  <>
                     {/* Multi-ticket display */}
                     {tickets.map((ticketItem, idx) => (
                       <div key={idx} className="flex justify-between border-l-2 border-primary/30 pl-2 py-0.5">
                         <span className="text-neutral-600">{ticketItem.ticket?.name} <span className="text-neutral-400">x{ticketItem.quantity}</span></span>
                         <span className="font-medium text-neutral-900">₵{ticketItem.subtotal.toFixed(2)}</span>
                       </div>
                     ))}
                     {tickets.length > 1 && (
                       <div className="flex justify-between border-t border-dashed border-neutral-200 pt-1 mt-1">
                         <span className="text-neutral-600 font-medium">Total Tickets</span>
                         <span className="font-medium text-neutral-900">{totalQuantity}</span>
                       </div>
                     )}
                  </>
              )}

              {!isFree && (
                <>
                  {!isMerchCheckout && <div className="border-t border-dashed border-neutral-200 my-1.5 pt-1.5"></div>}
                  <div className="flex justify-between text-neutral-500">
                    <span>{isMerchCheckout ? 'Subtotal' : (includeMerch ? 'Ticket Subtotal' : 'Subtotal')}</span>
                    <span>₵ {ticketSubtotal.toFixed(2)}</span>
                  </div>
                  {includeMerch && merchSubtotal > 0 && !isMerchCheckout && (
                    <div className="flex justify-between text-neutral-500">
                      <span>Merch Subtotal</span>
                      <span>₵ {merchSubtotal.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-neutral-500">
                    <span>Processing Fee (1.95%)</span>
                    <span>₵ {processingFee.toFixed(2)}</span>
                  </div>
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
                </>
              )}
            </div>
          </div>

          {isFree ? (
            <div>
                <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100 mb-2">
                    <h3 className="font-semibold text-neutral-900 text-sm mb-2 flex items-center gap-2">
                        Your Information
                    </h3>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-neutral-600">Name</span>
                            <span className="font-medium text-neutral-900">{profileLoading ? 'Loading...' : profile?.full_name || user?.email?.split('@')[0]}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-600">Email</span>
                            <span className="font-medium text-neutral-900">{user?.email}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-neutral-600">Phone</span>
                            <span className="font-medium text-neutral-900">{profileLoading ? 'Loading...' : profile?.phone_number || 'Not provided'}</span>
                        </div>
                    </div>
                </div>
                <p className="text-[10px] text-neutral-400 text-center">
                    Free Registration: No payment required. Just confirm your registration.
                </p>
            </div>
          ) : (
            <>
              {/* Merchandise Toggle */}
              {hasMerchInCart && !isMerchCheckout && (
                <div className="mb-3 border border-purple-200 bg-purple-50/50 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="bg-gradient-to-br from-purple-400 to-purple-600 w-7 h-7 rounded-full flex items-center justify-center text-white shadow-sm">
                        <ShoppingBag className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-gray-900 leading-tight">Include Merchandise</h4>
                        <p className="text-[10px] text-gray-600">
                          {effectiveCartItems.length} item{effectiveCartItems.length !== 1 ? 's' : ''} in cart from this event
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={includeMerch} 
                      onCheckedChange={setIncludeMerch}
                      className="scale-90 data-[state=checked]:bg-purple-500 cursor-pointer"
                    />
                  </div>
                  
                  {includeMerch && (
                    <div className="mt-3 pt-3 border-t border-purple-200 space-y-1 animate-in fade-in slide-in-from-top-2">
                      {effectiveCartItems.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-xs">
                          <span className="text-gray-600">
                            {item.product_name} × {item.quantity}
                          </span>
                          <span className="font-medium text-gray-900">
                            ₵{(item.product_price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-semibold pt-2 border-t border-purple-200">
                        <span className="text-purple-900">Merch Subtotal</span>
                        <span className="text-purple-900">₵{merchTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/*Keys Redemption */}
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
                {keyBalance <= 0 && <p className="text-[10px] text-amber-600 mt-1 ml-9">Insufficient keys.</p>}
              </div>

              {/* Payment Method */}
              {!isFullyCoveredByKey && (
                <div>
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
                  <p className="text-[10px] text-neutral-400 mt-2 text-center">Secure payment processing powered by Hubtel.</p>
                </div>
              )}

              {isFullyCoveredByKey && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3 text-green-800 animate-in fade-in zoom-in-95 text-xs">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="font-medium">Total covered by your keys!</span>
                  </div>
              )}
            </>
          )}
          </>
          )}
        </div>

        {/* Footer */}
        {/* Removed !isAlreadyRegistered check to allow updates */}
        {!checkingRegistration && (
        <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0 rounded-b-xl">
          <button
            onClick={handleSubmit}
            disabled={loading || (isFree && profileLoading)}
            className={`w-full py-2.5 text-white rounded-lg cursor-pointer font-bold text-sm shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                isFullyCoveredByKey && !isFree
                  ? "bg-amber-500 hover:bg-amber-600 shadow-amber-100" 
                  : "bg-primary hover:bg-primary-dark shadow-neutral-200"
            }`}
          >
            {loading ? (
                <> <Loader2 className="w-4 h-4 animate-spin" /> Processing... </>
            ) : isFree ? (
                isAlreadyRegistered ? (
                    <> <Users className="w-4 h-4" /> Update Registration ({totalQuantity} new spots) </>
                ) : (
                    <> <Users className="w-4 h-4" /> Register for {totalQuantity} {totalQuantity > 1 ? 'Spots' : 'Spot'} </>
                )
            ) : isFullyCoveredByKey ? (
                <> <Ticket className="w-4 h-4" /> Redeem Ticket </>
            ) : (
                <> Pay ₵ {finalTotal.toFixed(2)} </>
            )}
          </button>
        </div>
        )}
      </div>
    </div>
    {showSuccessModal && (
      <RegistrationSuccessModal
        isOpen={showSuccessModal}
        onClose={(navigating) => {
          setShowSuccessModal(false);
          onClose();
          // Only refresh if we're not navigating away
          if (navigating !== true) {
            setTimeout(() => window.location.reload(), 300);
          }
        }}
        eventTitle={event.title}
        spots={totalQuantity}
        attendeeEmail={user?.email || ''}
        isUpdate={isAlreadyRegistered}
        totalSpots={updatedTotalSpots}
      />
    )}
    </>
  );
}
