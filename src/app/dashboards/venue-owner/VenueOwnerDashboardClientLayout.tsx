"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';

import { preferencesRepo } from '@/storage/repositories';
import { useFilteredStorageEvents } from '@/storage/events';
import { useBoolViewMode } from '@/hooks/useViewMode';
import { usePathname } from 'next/navigation';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { UnifiedDashboardSidebar } from '@/components/layouts/UnifiedDashboardSidebar';
import { DashboardHeader } from '@/components/layouts/DashboardHeader';
import { Menu, X } from 'lucide-react';
import { useRoleRevocationListener } from '@/hooks/useRoleRevocationListener';

export default function VenueOwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useBoolViewMode('venueOwnerSidebarCollapsed', false);
  
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  // ⚡️ PERFORMANCE: We trust the Server Guard (layout.tsx) has already verified our access.
  const hasRequiredRole = true;
  
  // 🚨 Listen for role revocation events - will auto-redirect if role is revoked
  useRoleRevocationListener('venue_owner');

  // (hydration & sync handled by hook)

  // Close sidebar when changing routes on mobile
  useEffect(() => {
    if (!isDesktop) {
      setIsOpen(false);
    }
  }, [pathname, isDesktop]);

  // Always show sidebar on desktop
  useEffect(() => {
    if (isDesktop) {
      setIsOpen(true);
    }
  }, [isDesktop]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-neutral-50 overflow-hidden">
        {/* Sidebar */}
        <div 
          className={`fixed inset-y-0 z-30 bg-white overflow-y-auto transform transition-all duration-500 ease-in-out lg:translate-x-0 lg:relative lg:block ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          } ${
            isSidebarCollapsed && isDesktop ? 'lg:w-16' : 'lg:w-64'
          }`}
        >
          <UnifiedDashboardSidebar 
            role="venue_owner"
            onNavigate={() => !isDesktop && setIsOpen(false)} 
            isCollapsed={isSidebarCollapsed && isDesktop}
            onToggleCollapse={toggleSidebar}
            hasRequiredRole={hasRequiredRole}
          />
        </div>
        
        {/* Mobile Overlay */}
        {isOpen && !isDesktop && (
          <div 
            className="fixed inset-0 z-20 bg-black/50 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Dashboard Header */}
          <DashboardHeader role="venue_owner" onToggleSidebar={() => setIsOpen(!isOpen)} hasRequiredRole={hasRequiredRole} />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto px-6 py-8 bg-neutral-50">
            {children}
          </main>
        </div>
              </div>
    );
}