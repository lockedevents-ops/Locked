import React from 'react';
import { motion } from 'framer-motion';

interface PremiumFeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlightColor: string;
}

export function PremiumFeatureCard({
  icon,
  title,
  description,
  highlightColor = 'bg-primary',
}: PremiumFeatureCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white p-6 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-md transition-all relative overflow-hidden"
    >
      <div className={`absolute top-0 left-0 w-2 h-full ${highlightColor}`} />
      
      <div className={`p-3 ${highlightColor} bg-opacity-10 rounded-lg inline-block mb-4`}>
        {icon}
      </div>
      
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-neutral-600">{description}</p>
    </motion.div>
  );
}