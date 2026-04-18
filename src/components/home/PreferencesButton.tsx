"use client";

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SignInModal } from '@/components/ui/SignInModal';

export function PreferencesButton() {
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const [showSignInModal, setShowSignInModal] = useState(false);
  
  const handleClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      setShowSignInModal(true);
    }
  };
  
  return (
    <>
      <Link 
        href="/dashboards/user?tab=preferences" 
        onClick={handleClick}
        className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors"
      >
        Customize Your Preferences
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
      
      <SignInModal 
        isOpen={showSignInModal} 
        onClose={() => setShowSignInModal(false)} 
        action="lock"
        returnUrl="/dashboards/user?tab=preferences"
      />
    </>
  );
}