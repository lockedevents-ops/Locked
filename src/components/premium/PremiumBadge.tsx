import React from 'react';
import { motion } from 'framer-motion';

interface PremiumBadgeProps {
  tier: 'platinum' | 'elite';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function PremiumBadge({ 
  tier, 
  size = 'md',
  showLabel = false,
  className = '' 
}: PremiumBadgeProps) {
  const sizeClasses = {
    'sm': 'w-4 h-4',
    'md': 'w-6 h-6',
    'lg': 'w-8 h-8'
  };
  
  const labelSizes = {
    'sm': 'text-xs',
    'md': 'text-sm',
    'lg': 'text-base'
  };
  
  const badgeColors = {
    'platinum': {
      bg: 'bg-slate-200',
      border: 'border-slate-300',
      text: 'text-slate-700',
      icon: 'text-slate-500',
      label: 'Platinum'
    },
    'elite': {
      bg: 'bg-purple-500',
      border: 'border-purple-300',
      text: 'text-purple-700',
      icon: 'text-purple-500',
      label: 'Elite'
    }
  };
  
  const colors = badgeColors[tier];
  const sizeClass = sizeClasses[size];
  const labelSize = labelSizes[size];
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className={`relative flex-shrink-0 ${sizeClass}`}>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={`absolute inset-0 rounded-full ${colors.bg} opacity-20`}
          style={{ transform: 'scale(1.2)' }}
        />
        <svg 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          className={`${sizeClass} ${colors.icon}`}
        >
          {tier === 'platinum' ? (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          ) : (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          )}
        </svg>
      </div>
      
      {showLabel && (
        <span className={`font-medium ${colors.text} ${labelSize}`}>{colors.label}</span>
      )}
    </div>
  );
}