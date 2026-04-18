"use client";

import React, { useState, useEffect } from "react";
import { ModalBackdrop } from '@/components/ui/ModalBackdrop';
import { useAuth } from '@/contexts/AuthContext';
import { SignInModal } from '../ui/SignInModal';
import { useToast } from '@/hooks/useToast';
import { MinusIcon, PlusIcon, XIcon, CheckIcon, Key } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client/client';
import { Switch } from "@/components/ui/switch";
import { GalleryModal } from './GalleryModal';

interface VotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  contestant: {
    id: string;
    name: string;
    image: string;
    description?: string;
  } | null;
  voteCost?: number;
  onVote: (contestantId: string, votes: number) => void;
}

export function VotingModal({ isOpen, onClose, contestant, voteCost = 1, onVote }: VotingModalProps) {
  const [votes, setVotes] = useState<string>("1"); // Use string for input handling
  const toast = useToast();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [imgSrc, setImgSrc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Keys Payment Logic
  const [keyBalance, setKeyBalance] = useState(0);
  const [useKeys, setUseKeys] = useState(false);
  const supabase = createClient();
  const { user } = useAuth();
  const [showImageGallery, setShowImageGallery] = useState(false);
  
  // Ensure we reset the image source when contestant changes
  useEffect(() => {
    if (contestant?.image) {
      setImgSrc(contestant.image);
    }
  }, [contestant]);

  // Fetch Key Balance
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
  
  const isAuthenticated = !!user;

  if (!isOpen || !contestant) return null;

  const handleImageError = () => {
    const randomIndex = Math.floor(Math.random() * 4) + 1;
    setImgSrc(`/avatars/avatar-${randomIndex}.png`);
  };

  // Financial Calculations
  const getVoteCount = () => parseInt(votes || "0", 10);
  const numVotes = getVoteCount();
  const subTotal = numVotes * voteCost;
  const FEES_PERCENTAGE = 0.0195;
  const processingFee = subTotal * FEES_PERCENTAGE;
  const subTotalWithFees = subTotal + processingFee;

  // Key Logic: 1 Key = 0.10 GHS
  const KEY_VALUE_GHS = 0.10;
  const maxDiscountGHS = keyBalance * KEY_VALUE_GHS;
  
  // Calculate potential discount
  const discountAmount = useKeys ? Math.min(subTotalWithFees, maxDiscountGHS) : 0;
  const keysToSpend = Math.ceil(discountAmount / KEY_VALUE_GHS);
  const finalTotal = Math.max(0, subTotalWithFees - discountAmount);
  const isFullyCoveredByKey = finalTotal === 0 && useKeys;

  const handleVotesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow empty string or digits only
    const val = e.target.value;
    if (val === '' || /^\d+$/.test(val)) {
      setVotes(val);
    }
  };

  const handleIncrement = () => {
    const current = getVoteCount();
    setVotes((current + 1).toString());
  };

  const handleDecrement = () => {
    const current = getVoteCount();
    if (current > 1) {
      setVotes((current - 1).toString());
    }
  };

  const handleVoteClick = async () => {
    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }
    
    // Validate minimum votes
    if (numVotes < 1) {
      toast.showError("Invalid Votes", "Please enter at least 1 vote.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 1. Spend Keys if applicable
      if (useKeys && keysToSpend > 0) {
        const { data: spendData, error: spendError } = await supabase.rpc('spend_user_keys', {
          p_user_id: user?.id,
          p_amount: keysToSpend,
          p_desc: `Vote for ${contestant.name} (${numVotes} votes)`,
          p_metadata: { contestant_id: contestant.id, votes: numVotes }
        });

        if (spendError) throw spendError;
        if (spendData && !spendData.success) throw new Error(spendData.message);
      }

      // 2. Process Remaining Payment (Hubtel) if needed
      if (finalTotal > 0) {
        const response = await fetch('/api/payments/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'VOTE',
                amount: finalTotal,
                eventId: null, // Could look up event from contestant context if available
                organizerId: null,
                description: `Vote: ${numVotes} votes for ${contestant.name}`,
                metadata: {
                    contestant_id: contestant.id,
                    contestant_name: contestant.name,
                    votes: numVotes,
                    key_discount: discountAmount
                },
                returnUrl: window.location.href // Redirect back here?
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Payment initiation failed');
        }

        if (data.checkoutUrl) {
             toast.showSuccess('Redirecting to Payment', `Initiating payment of ₵${finalTotal.toFixed(2)}...`);
             window.location.href = data.checkoutUrl;
             return;
        }

      } else {
        // Fully covered by keys
        toast.showSuccess('Vote Submitted', `Used ${keysToSpend} keys for ${numVotes} votes!`);
        onVote(contestant.id, numVotes);
        onClose();
        setIsSubmitting(false);
      }
      
    } catch (err: any) {
      console.error(err);
      toast.showError('Transaction Failed', err.message || 'Failed to process transaction.');
      setIsSubmitting(false);
    }
  };

  return (
    <ModalBackdrop onClick={onClose}>
      {/* Animated Rainbow Border Container */}
      <div className="relative max-w-md w-full mx-4">
        {/* Rainbow border using filter animation */}
        <div 
          className="absolute -inset-[3px] rounded-2xl blur-[2px] opacity-60"
          style={{
            background: 'linear-gradient(45deg, #ff0000 0%, #ff7f00 12.5%, #ffff00 25%, #00ff00 37.5%, #00ffff 50%, #0000ff 62.5%, #ff00ff 75%, #ff0000 87.5%, #ff0000 100%)',
            backgroundSize: '400% 400%',
            animation: 'rainbow-border 4s ease infinite',
            boxShadow: '0 0 15px rgba(255, 0, 255, 0.3), 0 0 30px rgba(0, 255, 255, 0.2)',
          }}
        />
        
        {/* Inner white background to create border effect */}
        <div className="absolute inset-0 bg-white rounded-2xl" />
        
        {/* Modal content */}
        <div 
          className="relative bg-white rounded-2xl overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
        <style jsx>{`
          @keyframes rainbow-border {
            0%, 100% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
          }
        `}</style>
        {/* Header - More Compact */}
        <div className="relative pt-4 px-5 pb-3 bg-white border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="relative w-12 h-12 rounded-full overflow-hidden border border-gray-100 shadow-sm flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
              onClick={() => setShowImageGallery(true)}
              title="Click to view image"
            >
              <Image 
                src={imgSrc || "/placeholder-avatar.png"} 
                alt={contestant.name}
                fill
                className="object-cover"
                onError={handleImageError}
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">{contestant.name}</h2>
              <p className="text-gray-500 text-xs mt-0.5 line-clamp-1">
                {contestant.description || "Vote for your favorite contestant"}
              </p>
            </div>

            <button 
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 cursor-pointer"
              aria-label="Close modal"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Scrollable Content area */}
        <div className="px-5 py-2 flex-1 overflow-y-auto custom-scrollbar">
          {/* Vote counter - Compact */}
          <div className="bg-neutral-50 rounded-xl p-3 mb-3 border border-neutral-100">
            <div className="flex items-center justify-between gap-3 mb-3">
              <label className="text-neutral-700 font-semibold text-sm">
                Number of Votes
              </label>
            
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleDecrement}
                  disabled={getVoteCount() <= 1}
                  className={`flex items-center justify-center w-8 h-8 rounded-full border transition-colors cursor-pointer ${
                    getVoteCount() <= 1 
                      ? 'border-neutral-200 text-neutral-300 cursor-not-allowed bg-white' 
                      : 'border-neutral-300 text-neutral-600 hover:bg-white hover:border-neutral-400 bg-neutral-100'
                  }`}
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
                
                <div className="w-16">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={votes}
                    onChange={handleVotesChange}
                    className="w-full text-center text-xl font-bold text-primary bg-transparent border-b border-primary/20 focus:border-primary outline-none transition-colors"
                  />
                </div>
                
                <button
                  onClick={handleIncrement}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white hover:bg-primary-dark shadow-sm hover:shadow transition-all cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="pt-2 border-t border-neutral-200 grid gap-1.5">
              <div className="flex items-center justify-between text-xs text-neutral-600">
                <span>Cost per vote</span>
                <span className="font-medium">₵{voteCost.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-neutral-600">
                <span>Subtotal</span>
                <span className="font-medium">₵{subTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-neutral-600">
                <span>Processing Fee (1.95%)</span>
                <span className="font-medium">₵{processingFee.toFixed(2)}</span>
              </div>
              
              {/* Discount Row */}
              {useKeys && discountAmount > 0 && (
                 <div className="flex justify-between text-green-600 text-xs font-medium animate-in fade-in slide-in-from-right-4">
                    <span className="flex items-center gap-1"><Key className="w-3 h-3" /> Keys Discount ({keysToSpend})</span>
                    <span>- ₵ {discountAmount.toFixed(2)}</span>
                 </div>
              )}

              <div className="flex items-center justify-between font-bold text-sm pt-1 border-t border-dashed border-neutral-200 mt-1">
                <span>Total Cost</span>
                <span className="text-primary">₵{finalTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* Keys Redemption - Compact */}
          <div className="mb-3 border border-amber-200 bg-amber-50/50 rounded-lg p-3">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-amber-400 to-amber-600 w-7 h-7 rounded-full flex items-center justify-center text-white shadow-sm flex-shrink-0">
                       <Key className="w-3.5 h-3.5" />
                    </div>
                    <div>
                       <h4 className="font-semibold text-sm text-gray-900 leading-tight">Pay with Keys</h4>
                       <p className="text-[10px] text-gray-600">Bal: <span className="font-bold">{keyBalance}</span> (Val: ₵{(keyBalance * 0.10).toFixed(2)})</p>
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
          
          {/* Payment Method - Hide if Fully Covered */}
          {!isFullyCoveredByKey && (
            <div className="mb-2">
              <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-3 flex items-center gap-3 relative overflow-hidden group hover:border-blue-300 transition-colors cursor-pointer">
                <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center p-1.5 shadow-sm border border-blue-100 flex-shrink-0">
                  <img src="/logo/hubtel.png" alt="Hubtel" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-blue-900 truncate">Hubtel Pay</p>
                  <p className="text-[10px] text-blue-700/80 truncate">Mobile Money / Card</p>
                </div>
                <div className="bg-blue-500 text-white p-0.5 rounded-full">
                  <CheckIcon className="w-3 h-3" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleVoteClick}
            disabled={getVoteCount() < 1 || isSubmitting}
            className={`w-full py-2.5 rounded-lg font-bold ${
              isSubmitting 
                ? 'bg-neutral-300 cursor-wait text-neutral-500' 
                : 'bg-primary text-white hover:bg-primary-dark cursor-pointer'
            } transition shadow-sm hover:shadow text-sm`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              // If fully covered, show "Redeem X Keys"
              isFullyCoveredByKey 
                ? `Pay with ${keysToSpend} Keys`
                : `Pay ₵${finalTotal.toFixed(2)}`
            )}
          </button>
          
          <p className="text-center text-[10px] text-neutral-400 mt-2">
            Secure payments by Hubtel · Keys powered by Locked
          </p>
        </div>
      </div>
      {/* End of rainbow border container */}
      </div>
      
      <SignInModal isOpen={showSignInModal} onClose={() => setShowSignInModal(false)} action="vote" />
      
      {/* Image Gallery Modal */}
      <GalleryModal
        isOpen={showImageGallery}
        onClose={() => setShowImageGallery(false)}
        images={[imgSrc || "/placeholder-avatar.png"]}
        selectedIndex={0}
      />
    </ModalBackdrop>
  );
}
