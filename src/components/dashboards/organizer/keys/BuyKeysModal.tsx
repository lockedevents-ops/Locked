"use client";

import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Loader2, CreditCard, Lock, CheckCircle2, X, Plus } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { createClient } from "@/lib/supabase/client/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BuyKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onSuccess: () => void;
}

const PACKS = [
  { 
    id: "bronze",
    keys: 100, 
    price: 10, 
    label: "Starter", 
    color: "from-orange-100 to-orange-50", 
    borderColor: "border-orange-200",
    textColor: "text-orange-900",
    iconColor: "text-orange-600"
  },
  { 
    id: "silver",
    keys: 500, 
    price: 50, 
    label: "Growth", 
    color: "from-slate-100 to-slate-50", 
    borderColor: "border-slate-200",
    textColor: "text-slate-900",
    iconColor: "text-slate-600"
  },
  { 
    id: "gold",
    keys: 1000, 
    price: 100, 
    label: "Pro", 
    color: "from-yellow-100 to-yellow-50", 
    borderColor: "border-yellow-200",
    textColor: "text-yellow-900",
    iconColor: "text-yellow-600"
  },
  { 
    id: "platinum",
    keys: 5000, 
    price: 500, 
    label: "Enterprise", 
    color: "from-violet-100 to-violet-50", 
    borderColor: "border-violet-200",
    textColor: "text-violet-900",
    iconColor: "text-violet-600"
  },
];

export function BuyKeysModal({ isOpen, onClose, organizationId, onSuccess }: BuyKeysModalProps) {
  // Selection State
  const [selectedPackId, setSelectedPackId] = useState<string | "custom">(PACKS[1].id);
  const [customKeyAmount, setCustomKeyAmount] = useState<number>(100);
  
  // Computed values
  const [finalKeys, setFinalKeys] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const supabase = createClient();

  // Recalculate totals whenever selection changes
  useEffect(() => {
    if (selectedPackId === "custom") {
      const keys = customKeyAmount > 0 ? customKeyAmount : 0;
      setFinalKeys(keys);
      setFinalPrice(keys * 0.10); // 0.10 GHS per Key
    } else {
      const pack = PACKS.find(p => p.id === selectedPackId);
      if (pack) {
        setFinalKeys(pack.keys);
        setFinalPrice(pack.price);
      }
    }
  }, [selectedPackId, customKeyAmount]);

  const handlePurchase = async () => {
    if (finalKeys < 1) {
       toast.showError("Please enter a valid amount of keys.");
       return;
    }

    setLoading(true);
    try {
      // 1. Calculate Fees (Client-side display only, backend should verify)
      const amount = finalPrice;
      const processingFee = amount * 0.0195; 
      
      // 2. Simulate Hubtel Payment
      await new Promise(resolve => setTimeout(resolve, 2000)); 

      // 3. Call Server Function
      const { data, error } = await supabase.rpc('purchase_org_keys', {
        p_org_id: organizationId,
        p_amount: finalKeys,
        p_payment_ref: `sim_${Date.now()}`,
        p_desc: `${selectedPackId === "custom" ? "Custom" : PACKS.find(p => p.id === selectedPackId)?.label} Purchase`
      });

      if (error) throw error;

      toast.showSuccess(`Purchased ${finalKeys} Keys successfully!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Purchase failed:', error);
      toast.showError(error.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const fees = finalPrice * 0.0195;
  const total = finalPrice + fees;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-neutral-100 flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Buy Marketing Keys</h3>
            <p className="text-xs text-gray-500 mt-1">
              Purchase keys to generate coupon codes. <br/>
              <span className="font-medium text-neutral-900">Rate: 1 Key = 0.10 GHS</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Pack Selection */}
          <div className="grid grid-cols-2 gap-3">
            {PACKS.map((pack) => {
               const isSelected = selectedPackId === pack.id;
               return (
                <button
                  key={pack.id}
                  onClick={() => setSelectedPackId(pack.id)}
                  className={`relative p-3 rounded-xl border-2 text-left transition-all cursor-pointer group ${
                    isSelected
                      ? `${pack.borderColor} bg-gradient-to-br ${pack.color} ring-1 ring-offset-2 ring-neutral-900`
                      : "border-neutral-100 hover:border-neutral-200 hover:bg-neutral-50"
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                       <CheckCircle2 className={`w-4 h-4 ${pack.textColor}`} />
                    </div>
                  )}
                  <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${pack.iconColor}`}>
                    {pack.label}
                  </div>
                  <div className={`font-bold text-xl mb-0.5 ${pack.textColor}`}>{pack.keys}</div>
                  <div className="text-neutral-500 text-xs font-medium">GHS {pack.price.toFixed(0)}</div>
                </button>
               );
            })}
          </div>

          {/* Custom Amount Option */}
          <div className={`rounded-xl border-2 p-3 transition-all ${
             selectedPackId === "custom" 
               ? "border-black bg-neutral-50 ring-1 ring-offset-2 ring-neutral-900" 
               : "border-neutral-100"
          }`}>
             <div className="flex items-center gap-2 mb-2 cursor-pointer" onClick={() => setSelectedPackId("custom")}>
                 <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                     selectedPackId === "custom" ? "border-black bg-black" : "border-neutral-300"
                 }`}>
                     {selectedPackId === "custom" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                 </div>
                 <span className="font-bold text-sm text-neutral-900">Custom Amount</span>
             </div>

             {selectedPackId === "custom" && (
                 <div className="pl-8 animate-in fade-in slide-in-from-top-2">
                    <div className="relative">
                       <Input 
                          type="number"
                          min="10"
                          value={customKeyAmount}
                          onChange={(e) => setCustomKeyAmount(parseInt(e.target.value) || 0)}
                          className="pl-20 h-10 text-lg font-bold"
                       />
                       <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-medium">
                          KEYS:
                       </div>
                    </div>
                    <p className="text-xs text-neutral-500 mt-2 text-right">
                       = GHS {(customKeyAmount * 0.10).toFixed(2)}
                    </p>
                 </div>
             )}
          </div>

          {/* Pricing Summary */}
          <div className="bg-neutral-50 p-4 rounded-xl space-y-2 border border-neutral-100">
             <div className="flex justify-between text-xs">
                <span className="text-neutral-600">Subtotal</span>
                <span className="font-medium text-neutral-900">GHS {finalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-600">Processing Fee (1.95%)</span>
                <span className="font-medium text-neutral-900">GHS {fees.toFixed(2)}</span>
              </div>
              <div className="h-px bg-neutral-200 my-1" />
              <div className="flex justify-between items-end">
                <span className="font-bold text-base text-neutral-900">Total</span>
                <span className="font-bold text-xl text-neutral-900">GHS {total.toFixed(2)}</span>
              </div>
          </div>

          {/* Payment Method */}
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <h3 className="font-semibold text-sm text-neutral-900 mb-2">Payment Method</h3>
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-3 flex items-center gap-3 cursor-pointer ring-2 ring-blue-500 ring-offset-1">
              <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center p-1 shadow-sm overflow-hidden">
                <img src="/logo/hubtel.png" alt="Hubtel" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="font-medium text-sm text-blue-900">Hubtel Pay</p>
                <p className="text-[10px] text-blue-700">Mobile Money & Cards</p>
              </div>
              <div className="ml-auto w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            </div>
            
            <p className="text-[10px] text-neutral-500 mt-2 text-center">
              Secure payment processing powered by Hubtel.
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-3 flex justify-end gap-2 z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer font-medium text-neutral-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePurchase}
            disabled={loading || finalKeys < 1}
            className="px-4 py-2 text-sm text-white rounded-lg cursor-pointer font-medium shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-neutral-900 hover:bg-neutral-800 shadow-neutral-200"
          >
            {loading ? (
                <> <Loader2 className="w-3 h-3 animate-spin" /> Processing... </>
            ) : (
                <> Pay GHS {total.toFixed(2)} </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
