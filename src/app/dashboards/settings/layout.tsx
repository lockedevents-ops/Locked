"use client";

import { useState, useEffect } from 'react';
import { UnifiedDashboardSidebar } from '@/components/layouts/UnifiedDashboardSidebar';
import { DashboardHeader } from '@/components/layouts/DashboardHeader';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('settingsSidebarCollapsed');
      return saved === 'true';
    }
    return false;
  });
  
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('settingsSidebarCollapsed', isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

  // Close sidebar when changing routes on mobile
  useEffect(() => {
    if (!isDesktop) {
      setIsOpen(false);
    }
  }, [isDesktop]);

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
          role="user"
          onNavigate={() => !isDesktop && setIsOpen(false)}
          isCollapsed={isSidebarCollapsed && isDesktop}
          onToggleCollapse={toggleSidebar}
          className=""
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
        <DashboardHeader role="user" onToggleSidebar={() => setIsOpen(!isOpen)} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
