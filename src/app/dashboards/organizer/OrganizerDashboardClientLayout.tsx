"use client";

import React, { useState, useEffect } from 'react';
import { UnifiedDashboardSidebar } from '@/components/layouts/UnifiedDashboardSidebar';
import { DashboardHeader } from '@/components/layouts/DashboardHeader';
// import { ProtectedRoute } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { useRoleRevocationListener } from '@/hooks/useRoleRevocationListener';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('organizerSidebarCollapsed');
      return saved === 'true';
    }
    return false;
  });
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  // ⚡️ PERFORMANCE: We trust the Server Guard (layout.tsx) has already verified our access.
  const hasRequiredRole = true;
  
  // 🚨 Listen for role revocation events - will auto-redirect if role is revoked
  useRoleRevocationListener('organizer');

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('organizerSidebarCollapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

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
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        {/* Sidebar */}
        <div 
          className={`fixed inset-y-0 z-30 bg-white overflow-y-auto transform transition-all duration-500 ease-in-out lg:translate-x-0 lg:relative lg:block ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          } ${
            isSidebarCollapsed && isDesktop ? 'lg:w-16' : 'lg:w-64'
          }`}
        >
          <UnifiedDashboardSidebar 
            role="organizer"
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
          <DashboardHeader role="organizer" onToggleSidebar={() => setIsOpen(!isOpen)} hasRequiredRole={hasRequiredRole} />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto px-6 py-8 bg-gray-50">
            {children}
          </main>
        </div>
      </div>
  );
}
