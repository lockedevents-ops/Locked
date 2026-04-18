"use client";

import React from 'react';
import { motion } from 'framer-motion';

export interface PillTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface PillTabsProps {
  tabs: PillTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * PillTabs Component
 * --------------------------------------------------------------
 * A modern, pill-shaped tab navigation component with smooth animations.
 * Features a sliding background indicator for the active tab.
 * 
 * Usage:
 * ```tsx
 * <PillTabs
 *   tabs={[
 *     { id: 'upcoming', label: 'Upcoming Events' },
 *     { id: 'past', label: 'Past Events' },
 *   ]}
 *   activeTab={activeTab}
 *   onTabChange={setActiveTab}
 * />
 * ```
 */
export function PillTabs({ 
  tabs, 
  activeTab, 
  onTabChange, 
  className = '',
  size = 'md'
}: PillTabsProps) {
  // Size variants
  const sizeClasses = {
    sm: {
      container: 'p-1 rounded-full gap-1',
      tab: 'px-3 py-1.5 text-xs',
      iconSize: 'w-3 h-3'
    },
    md: {
      container: 'p-1.5 rounded-full gap-1',
      tab: 'px-4 py-2 text-sm',
      iconSize: 'w-4 h-4'
    },
    lg: {
      container: 'p-2 rounded-full gap-1.5',
      tab: 'px-6 py-2.5 text-base',
      iconSize: 'w-5 h-5'
    }
  };

  const sizeConfig = sizeClasses[size];

  return (
    <div 
      className={`inline-flex items-center bg-neutral-200/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] ${sizeConfig.container} ${className}`}
      role="tablist"
      style={{
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06), inset 0 1px 2px rgba(0,0,0,0.04)'
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative ${sizeConfig.tab} font-medium rounded-full
              transition-colors duration-200 cursor-pointer
              whitespace-nowrap flex items-center gap-2
              ${isActive 
                ? 'text-neutral-900' 
                : 'text-neutral-500 hover:text-neutral-700'
              }
            `}
          >
            {/* Animated background pill for active state */}
            {isActive && (
              <motion.div
                layoutId="pillTabIndicator"
                className="absolute inset-0 bg-white rounded-full shadow-md"
                initial={false}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 35
                }}
                style={{
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)'
                }}
              />
            )}
            
            {/* Tab content */}
            <span className="relative z-10 flex items-center gap-2">
              {tab.icon && (
                <span className={sizeConfig.iconSize}>
                  {tab.icon}
                </span>
              )}
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default PillTabs;
