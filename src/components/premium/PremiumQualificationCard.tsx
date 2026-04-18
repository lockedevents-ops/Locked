import React from 'react';
import { motion } from 'framer-motion';

interface PremiumQualificationCardProps {
  title: string;
  value: number;
  target: number;
  description: string;
  icon: React.ReactNode;
  progress: number;
  suffix?: string;
}

export function PremiumQualificationCard({
  title,
  value,
  target,
  description,
  icon,
  progress,
  suffix = '',
}: PremiumQualificationCardProps) {
  const isComplete = progress >= 100;
  
  return (
    <div className="bg-white p-6 rounded-xl border border-neutral-200">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-primary/10 text-primary rounded-lg">
          {icon}
        </div>
        
        {isComplete ? (
          <div className="p-1.5 rounded-full bg-success/20">
            <svg className="w-4 h-4 text-success" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        ) : (
          <div className="text-xs font-medium px-2 py-1 bg-neutral-100 rounded-full">
            {Math.round(progress)}%
          </div>
        )}
      </div>
      
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      <p className="text-sm text-neutral-600 mb-4">{description}</p>
      
      <div className="flex items-end justify-between mb-2">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{value}</span>
          {suffix && <span className="text-sm text-neutral-500">{suffix}</span>}
        </div>
        
        <div className="flex items-baseline gap-1">
          <span className="text-sm text-neutral-500">Target:</span>
          <span className="font-medium">{target}{suffix}</span>
        </div>
      </div>
      
      <div className="w-full bg-neutral-100 rounded-full h-2">
        <motion.div 
          className={`h-2 rounded-full ${isComplete ? 'bg-success' : 'bg-primary'}`}
          style={{ width: '0%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, delay: 0.2 }}
        />
      </div>
    </div>
  );
}