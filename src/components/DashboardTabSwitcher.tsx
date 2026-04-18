"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Lock } from 'lucide-react';
import { isVenuesEnabled } from '@/lib/network';

export default function DashboardTabSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, roles } = useAuth();
  const [isTripleBadge, setIsTripleBadge] = useState(false);
  const venuesEnabled = isVenuesEnabled();
  
  useEffect(() => {
    // Check if user has multiple roles (triple badge)
    const hasMultipleRoles = roles.length > 1;
    setIsTripleBadge(hasMultipleRoles);
  }, [roles]);
  
  const tabs = [
    { name: 'User', href: '/dashboards/user', role: 'User' },
    { name: 'Organizer', href: '/dashboards/organizer', role: 'Organizer' },
    ...(venuesEnabled ? [{ name: 'Venue Owner', href: '/dashboards/venue-owner', role: 'VenueOwner' }] : []),
  ];
  
  return (
    <div className="bg-white shadow-sm rounded-lg mb-6 overflow-hidden">
      <nav className="flex border-b border-neutral-200">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const hasAccess = roles.includes(tab.role);
          
          return (
            <div
              key={tab.name}
              className={`
                inline-flex items-center py-4 px-6 text-sm font-medium relative cursor-pointer
                ${isActive
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'}
                ${!hasAccess ? 'opacity-70' : ''}
              `}
              onClick={() => {
                // Always navigate to the tab's href, regardless of access
                // The page will handle showing the request form if needed
                router.push(tab.href);
              }}
            >
              {tab.name}
              {!hasAccess && tab.role !== 'User' && (
                <Lock className="ml-2 h-4 w-4" />
              )}
            </div>
          );
        })}
        
        {isTripleBadge && (
          <div className="ml-auto flex items-center px-4">
            <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full">
              Triple Badge
            </span>
          </div>
        )}
      </nav>
    </div>
  );
}