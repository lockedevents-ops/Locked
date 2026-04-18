"use client";

import { Navbar } from "@/components/layouts/Navbar";
import { Footer } from "@/components/layouts/Footer";
import { usePathname } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { HelpChatButton } from '@/components/help';

export function MainSiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Check if the current path is part of the admin section
  const isAdminPage = pathname?.startsWith('/admin');

  // Check for dashboard pages (user, organizer, venue owner)
  const isDashboardPage = pathname?.startsWith('/dashboards/');

  // Check for auth pages (sign in, sign up, forgot password, reset password, etc.)
  const isAuthPage = pathname?.startsWith('/auth');

  useEffect(() => {
    // Keep platform light-only, but don't override auth/admin themed surfaces.
    const onAuthPage = pathname?.startsWith('/auth');
    const onAdminPage = pathname?.startsWith('/admin');
    if (onAuthPage || onAdminPage) return;
    document.documentElement.classList.remove('dark');
  }, [pathname]);

  // Check if we're on the homepage (has hero section that should go under navbar)
  const isHomepage = pathname === '/';

  // Check if we're on a legal page with hero section
  const isLegalPageWithHero = pathname?.startsWith('/pages/legal/');

  const shouldShowHelpChat = false; // Hide chatbot from the platform for now

  const bypassLayout = isAdminPage || isDashboardPage || isAuthPage;

  // For admin, dashboard, or auth pages, don't show the main site layout (no navbar/footer)
  if (bypassLayout) {
    return (
      <>
        {children}
        {shouldShowHelpChat && <HelpChatButton />}
      </>
    );
  }

  // For regular pages, show the complete layout
  // Homepage and legal pages: no padding-top (hero goes full-screen behind navbar)
  // Other pages: add padding-top to prevent navbar overlap
  return (
    <div className="flex flex-col min-h-screen">
      <Suspense fallback={<div className="h-14 md:h-16 bg-black" />}>
        <Navbar />
      </Suspense>
      <main className={`flex-grow ${!isHomepage && !isLegalPageWithHero ? 'pt-14 md:pt-16' : ''}`}>
        {children}
      </main>
      <Footer />
      {shouldShowHelpChat && <HelpChatButton />}
    </div>
  );
}