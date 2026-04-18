import { useState } from 'react';
import { useKeysStore } from '@/store/keysStore';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/useToast';
import { X } from 'lucide-react';

interface RedeemCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RedeemCodeModal({ isOpen, onClose }: RedeemCodeModalProps) {
  const [code, setCode] = useState('');
  const { addKeys } = useKeysStore();
  const toast = useToast();
  
  const handleRedeemCode = () => {
    if (!code.trim()) {
      toast.showError('Invalid Code', 'Please enter a valid code');
      return;
    }
    
    // In a real app, this would validate the code against your backend
    // Here we'll just simulate success and add some KEYS
    
    // This simulates the codes we created in the Organizer's KEYS management page
    if (code.toUpperCase().startsWith('KEYS-')) {
      const amount = Math.floor(Math.random() * 50) + 10; // Random amount between 10-60 KEYS
      addKeys(amount, `Redeemed promo code: ${code}`);
      toast.showSuccess('Success!', `You've earned ${amount} KEYS`);
      setCode('');
      onClose();
    } else {
      toast.showError('Invalid Code', 'Invalid or expired code');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="absolute -inset-[3px] rounded-2xl blur-[2px] opacity-60"
          style={{
            background: 'linear-gradient(45deg, #ff0000 0%, #ff7f00 12.5%, #ffff00 25%, #00ff00 37.5%, #00ffff 50%, #0000ff 62.5%, #ff00ff 75%, #ff0000 87.5%, #ff0000 100%)',
            backgroundSize: '400% 400%',
            animation: 'rainbow-border 4s ease infinite',
            boxShadow: '0 0 15px rgba(255, 0, 255, 0.3), 0 0 30px rgba(0, 255, 255, 0.2)',
          }}
        />
        <div className="absolute inset-0 bg-white rounded-2xl" />
        <div className="relative bg-white rounded-2xl p-6 shadow-xl overflow-hidden">
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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Redeem Promo Code</h2>
            <button 
              onClick={onClose}
              className="rounded-full w-8 h-8 flex items-center justify-center hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>
          
          <p className="text-neutral-600 mb-6">
            Enter your promo code to receive KEYS. Promo codes can be obtained from event organizers or through special promotions.
          </p>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="promo-code" className="text-sm font-medium">
                Promo Code
              </label>
              <input
                id="promo-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter code (e.g. KEYS-12AB34)"
                className="w-full p-3 border border-neutral-200 rounded-md"
              />
            </div>
            
            <button
              onClick={handleRedeemCode}
              className="w-full bg-primary text-white py-3 rounded-md font-medium hover:bg-primary-dark transition-colors cursor-pointer"
            >
              Redeem Code
            </button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-neutral-200">
            <h3 className="text-sm font-medium mb-2">Where to get KEYS codes?</h3>
            <p className="text-neutral-500 text-sm">
              KEYS codes are typically given out during events, webinars, or as part of promotional campaigns. Make sure to follow our official channels to get the latest codes!
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}