"use client";

import { useState, useEffect } from "react";
import { UnifiedDashboardSidebar } from "@/components/layouts/UnifiedDashboardSidebar";
import { DashboardHeader } from '@/components/layouts/DashboardHeader';
// import { ProtectedRoute } from "@/contexts/AuthContext";
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { createClient as createSupabaseClient } from '@/lib/supabase/client/client';
import { PageLoader } from '@/components/loaders/PageLoader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [authLoadTimedOut, setAuthLoadTimedOut] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Get from localStorage, default to false
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('userSidebarCollapsed');
      return saved === 'true';
    }
    return false;
  });
  
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('userSidebarCollapsed', isSidebarCollapsed.toString());
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

  // ⚡️ PERFORMANCE: We trust the Server Guard (layout.tsx) has already verified our session.
  // We only show a spinner if the generic AuthContext is still initialising its global state.
  useEffect(() => {
    if (!authLoading) {
      setAuthLoadTimedOut(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setAuthLoadTimedOut(true);
    }, 8000);

    return () => clearTimeout(timeoutId);
  }, [authLoading]);

  if (authLoading) {
    if (authLoadTimedOut) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
          <div className="bg-white border border-neutral-200 rounded-lg p-6 text-center max-w-md w-full">
            <h2 className="text-lg font-semibold text-neutral-900 mb-2">Dashboard Is Taking Too Long</h2>
            <p className="text-sm text-neutral-600 mb-4">
              Authentication is taking longer than expected. Refresh to retry.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors cursor-pointer"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return (
      <PageLoader message="Loading dashboard..." fullHeight />
    );
  }

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
      
      {/* Mobile Overlay - placed after sidebar so it doesn't block interaction */}
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
        <main className="flex-1 overflow-y-auto px-6 py-8 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
