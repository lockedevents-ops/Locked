import React from 'react';
import { Radio } from 'lucide-react';

interface LiveBadgeProps {
  className?: string;
}

export function LiveBadge({ className = '' }: LiveBadgeProps) {
  return (
    <div className={`bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg ${className}`}>
      <Radio className="h-3 w-3 animate-pulse" />
      Started
    </div>
  );
}
