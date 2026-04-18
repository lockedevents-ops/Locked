import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key } from 'lucide-react';

interface KeysNotificationProps {
  amount: number;
  message: string;
  onClose: () => void;
}

export function KeysNotification({ amount, message, onClose }: KeysNotificationProps) {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 500); // Give time for exit animation
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-white rounded-lg shadow-xl border border-primary/20 flex items-center p-4 min-w-[280px]"
        >
          <div className="bg-primary/10 rounded-full p-2 mr-4">
            <Key className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="font-bold text-lg">+{amount} KEYS</div>
            <div className="text-sm text-neutral-600">{message}</div>
          </div>
          <button
            onClick={() => {
              setVisible(false);
              setTimeout(onClose, 500);
            }}
            className="ml-auto text-neutral-400 hover:text-neutral-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}