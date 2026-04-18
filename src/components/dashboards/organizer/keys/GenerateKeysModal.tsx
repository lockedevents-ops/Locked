"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Loader2, Sparkles, Copy, X } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { createClient } from "@/lib/supabase/client/client";
import { useAuth } from "@/contexts/AuthContext";

interface GenerateKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onSuccess: () => void;
}

export function GenerateKeysModal({ isOpen, onClose, organizationId, onSuccess }: GenerateKeysModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: "",
    amount: 10,
    maxUses: 100,
  });
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const toast = useToast();
  const supabase = createClient();

  // Auto-generate a random code
  const generateRandomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "KEY-";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code: result }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // 1. Calculate Cost
      const totalCost = formData.amount * formData.maxUses;

      // 2. Call Server Function
      const { data, error } = await supabase.rpc('generate_org_coupon', {
        p_org_id: organizationId,
        p_code: formData.code,
        p_amount: formData.amount,
        p_max_uses: formData.maxUses,
        p_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 Days Expiry Default
        p_creator_id: user.id
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.message);

      toast.showSuccess(`Code ${formData.code} generated! deducted ${totalCost} keys.`);
      setGeneratedCode(formData.code);
      onSuccess();
    } catch (error: any) {
      console.error('Generation failed:', error);
      toast.showError(error.message || 'Failed to generate code');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      toast.showSuccess("Code copied to clipboard");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-neutral-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-gray-900">Generate Keys Code</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-gray-600">
            Create a redeemable code for your marketing campaigns.
            <br />
            <span className="text-amber-600 font-medium text-xs">
              Note: Keys are deducted from your balance immediately.
            </span>
          </p>
        </div>

        <div className="p-6">
        {generatedCode ? (
           <div className="flex flex-col items-center justify-center py-6 space-y-4">
             <div className="bg-green-50 text-green-700 px-6 py-4 rounded-xl text-2xl font-mono font-bold border border-green-200 tracking-wider select-all cursor-text">
               {generatedCode}
             </div>
             <Button variant="outline" onClick={copyCode} className="gap-2 cursor-pointer w-full border-neutral-200 hover:bg-neutral-50">
               <Copy className="w-4 h-4" /> Copy Code
             </Button>
             <Button onClick={onClose} className="w-full cursor-pointer bg-neutral-900 hover:bg-black text-white">Done</Button>
           </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Coupon Code</Label>
              <div className="flex gap-2">
                <Input 
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="e.g. SUMMER-VIBES"
                  required
                  className="font-mono uppercase"
                />
                <Button type="button" variant="outline" onClick={generateRandomCode} className="cursor-pointer">
                  Auto
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Value per Claim (Keys)</Label>
                <Input 
                  type="number"
                  min="1"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: parseInt(e.target.value)})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Max Claims</Label>
                <Input 
                  type="number"
                  min="1"
                  value={formData.maxUses}
                  onChange={e => setFormData({...formData, maxUses: parseInt(e.target.value)})}
                  required
                />
              </div>
            </div>

            <div className="bg-neutral-50 p-4 rounded-lg mt-4 border border-neutral-100">
               <div className="flex justify-between items-center">
                 <span className="text-sm text-gray-600">Total Deduction</span>
                 <span className="font-bold text-lg text-neutral-900">
                   {formData.amount * formData.maxUses} Keys
                 </span>
               </div>
            </div>

            <Button type="submit" className="w-full bg-black text-white cursor-pointer hover:bg-neutral-800" disabled={loading || !formData.code}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate Code
            </Button>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}
