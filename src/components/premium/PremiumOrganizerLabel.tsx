import React from 'react';
import { PremiumBadge } from './PremiumBadge';

interface PremiumOrganizerLabelProps {
  premiumTier: 'platinum' | 'elite' | null;
  size?: 'sm' | 'md' | 'lg';
}

export function PremiumOrganizerLabel({ premiumTier, size = 'md' }: PremiumOrganizerLabelProps) {
  if (!premiumTier) return null;
  
  return (
    <div className="flex items-center gap-2">
      <PremiumBadge size={size} showLabel={true} tier={premiumTier} />
      <span className="text-sm text-neutral-600">Premium Organizer</span>
    </div>
  );
}