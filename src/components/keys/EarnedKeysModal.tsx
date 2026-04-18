"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key } from 'lucide-react';
import confetti from 'canvas-confetti';

interface EarnedKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  reason: string;
}

export function EarnedKeysModal({ isOpen, onClose, amount, reason }: EarnedKeysModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Trigger confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const colors = ['#FFD700', '#FFA500', '#FF4500'];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          />
          
          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden pointer-events-auto relative">
              {/* Close Button */}
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-white to-neutral-50">
                {/* Floating Key Animation */}
                <motion.div
                  initial={{ y: 0 }}
                  animate={{ y: [-10, 10, -10] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="mb-6 relative"
                >
                  <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center shadow-inner">
                    <Key className="w-12 h-12 text-yellow-600" />
                  </div>
                  {/* Sparkles */}
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full blur-sm opacity-50"
                  />
                  <motion.div 
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.8, 0.3] }}
                    transition={{ repeat: Infinity, duration: 3, delay: 1 }}
                    className="absolute -bottom-1 -left-2 w-4 h-4 bg-orange-400 rounded-full blur-sm opacity-40"
                  />
                </motion.div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-2">You Earned Keys!</h2>
                
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600">
                    +{amount}
                  </span>
                  <span className="text-xl font-bold text-gray-600">KEYS</span>
                </div>
                
                <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-medium mb-6 flex items-center gap-2 border border-green-100">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  {reason}
                </div>
                
                <button
                  onClick={onClose}
                  className="w-full bg-neutral-900 text-white font-medium py-3 rounded-xl hover:bg-neutral-800 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-neutral-200 cursor-pointer"
                >
                  Awesome!
                </button>
              </div>
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
}
