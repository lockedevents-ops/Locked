"use client";

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, LayoutDashboard, ClipboardList, Users, Shield, Calendar, Building, TrendingUp, Bell, Settings, LifeBuoy, MessageSquare, Clock, Database, Flag, DollarSign, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { isVenuesEnabled } from '@/lib/network';

interface AdminSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSearchModal({ isOpen, onClose }: AdminSearchModalProps) {
  const router = useRouter();
  const venuesEnabled = isVenuesEnabled();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);
  const lastKeyPressTime = useRef<number>(0);
  const KEY_PRESS_THROTTLE = 50; // milliseconds between key presses - reduced for more natural feel

  // Ensure component is mounted before using portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Admin search options - comprehensive list including sidebar and settings
  const searchOptions = [
    // Main Pages
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, category: 'Main' },
    { label: 'Role Requests', href: '/admin/role-requests', icon: ClipboardList, category: 'Main' },
    { label: 'Users', href: '/admin/users', icon: Users, category: 'Main' },
    { label: 'Admins', href: '/admin/admins', icon: Shield, category: 'Main' },
    { label: 'Events', href: '/admin/events', icon: Calendar, category: 'Main' },
    ...(venuesEnabled ? [{ label: 'Venues', href: '/admin/venues', icon: Building, category: 'Main' }] : []),
    { label: 'Reports', href: '/admin/reports', icon: TrendingUp, category: 'Main' },
    // Additional Pages
    { label: 'Support Center', href: '/admin/support', icon: LifeBuoy, category: 'Support' },
    { label: 'Feedback', href: '/admin/feedback', icon: MessageSquare, category: 'Support' },
    { label: 'Activity Log', href: '/admin/activity-log', icon: Clock, category: 'System' },
    { label: 'Database', href: '/admin/database', icon: Database, category: 'System' },
    { label: 'Feature Flags', href: '/admin/feature-flags', icon: Flag, category: 'System' },
    { label: 'Billing', href: '/admin/billing', icon: DollarSign, category: 'System' },
    // Settings
    { label: 'Notifications', href: '/admin/notifications', icon: Bell, category: 'Settings' },
    { label: 'Settings', href: '/admin/settings', icon: Settings, category: 'Settings' },
    { label: 'Profile Settings', href: '/dashboards/settings', icon: User, category: 'Settings' },
  ];

  // Filter options based on search query
  const filteredOptions = searchQuery.trim()
    ? searchOptions.filter(option => 
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : searchOptions;

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
      setSelectedIndex(0);
    } else {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Reset selected index when search results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  // Scroll selected item into view when selectedIndex changes
  useEffect(() => {
    if (selectedItemRef.current && scrollContainerRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [selectedIndex]);

  // Handle keyboard navigation with throttling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        // Throttle arrow key navigation to prevent too-fast scrolling
        const now = Date.now();
        if (now - lastKeyPressTime.current < KEY_PRESS_THROTTLE) {
          e.preventDefault();
          return;
        }
        lastKeyPressTime.current = now;
        
        e.preventDefault();
        if (e.key === 'ArrowDown') {
          setSelectedIndex(prev => (prev + 1) % filteredOptions.length);
        } else {
          setSelectedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
        }
      } else if (e.key === 'Enter' && filteredOptions.length > 0) {
        e.preventDefault();
        handleSearchOptionClick(filteredOptions[selectedIndex].href);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, filteredOptions, selectedIndex]);

  // Handle search option click
  const handleSearchOptionClick = (href: string) => {
    router.push(href);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  // Render modal using portal to ensure it's at the root level (like role request modal)
  return createPortal(
    <>
      <style jsx global>{`
        .admin-search-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .admin-search-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .admin-search-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgb(156 163 175);
          border-radius: 4px;
        }
        .admin-search-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgb(107 114 128);
        }
        .dark .admin-search-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgb(75 85 99);
        }
        .dark .admin-search-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgb(107 114 128);
        }
      `}</style>
      <div 
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm px-4 pt-[15vh]"
        onClick={(e) => {
          // Close when clicking on backdrop (not on modal content)
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
      <div 
        ref={modalRef}
        className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-gray-200 dark:border-neutral-800 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-neutral-800">
            <Search className="h-5 w-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search pages and settings..."
              className="flex-1 bg-transparent focus:outline-none text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              autoComplete="off"
            />
            <button
              onClick={onClose}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1 rounded border border-gray-200 dark:border-neutral-700"
            >
              ESC
            </button>
          </div>

          {/* Search Results */}
          <div 
            ref={scrollContainerRef}
            className="max-h-[60vh] overflow-y-auto admin-search-scrollbar"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgb(156 163 175) transparent'
            }}
          >
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <div className="text-gray-400 dark:text-gray-500 mb-2">
                  <Search className="h-8 w-8 mx-auto opacity-30" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No results found for "{searchQuery}"
                </p>
              </div>
            ) : (
              <div className="py-2">
                {['Main', 'Support', 'System', 'Settings'].map(category => {
                  const categoryOptions = filteredOptions.filter(opt => opt.category === category);
                  if (categoryOptions.length === 0) return null;
                  
                  return (
                    <div key={category}>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {category}
                      </div>
                      <div className="px-2">
                        {categoryOptions.map((option) => {
                          const IconComponent = option.icon;
                          const globalIndex = filteredOptions.indexOf(option);
                          const isSelected = globalIndex === selectedIndex;
                          return (
                            <button
                              key={`${category}-${globalIndex}`}
                              ref={isSelected ? selectedItemRef : null}
                              onClick={() => handleSearchOptionClick(option.href)}
                              onMouseEnter={() => setSelectedIndex(globalIndex)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-left cursor-pointer group ${
                                isSelected ? 'bg-gray-100 dark:bg-neutral-800' : 'hover:bg-gray-50 dark:hover:bg-neutral-800'
                              }`}
                            >
                              <div className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
                                isSelected 
                                  ? 'bg-gray-200 dark:bg-neutral-700' 
                                  : 'bg-gray-100 dark:bg-neutral-800 group-hover:bg-gray-200 dark:group-hover:bg-neutral-700'
                              }`}>
                                <IconComponent className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              </div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/50">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Use ↑↓ to navigate</span>
              <span>↵ to select</span>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
