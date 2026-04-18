"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { isVenuesEnabled } from '@/lib/network';

export function MainNavigation() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const isAuthenticated = !!user;
  const venuesEnabled = isVenuesEnabled();
  
  const publicNavItems = [
    { label: 'Home', href: '/' },
    { label: 'Discover', href: '/pages/discover' },
    ...(venuesEnabled ? [{ label: 'Venues', href: '/pages/venues' }] : []),
    { label: 'Voting', href: '/voting' },
    { label: 'About', href: '/about' },
    { label: 'Team', href: '/team' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Contact', href: '/contact' },
  ];
  
  // Helper function to determine if a nav item is active
  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {publicNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            isActive(item.href)
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
      
      {isAuthenticated ? (
        <div className="flex items-center space-x-4">
          <Link 
            href={user?.role === 'organizer' ? '/organizer' : '/dashboard'} 
            className="text-sm font-medium text-primary"
          >
            {user?.role === 'organizer' ? 'Organizer Dashboard' : 'Dashboard'}
          </Link>
          <button 
            onClick={() => signOut()} 
            className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="flex items-center space-x-4">
          <Link 
            href="/auth/signin" 
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Sign In
          </Link>
          <Link 
            href="/auth/signup" 
            className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Sign Up
          </Link>
        </div>
      )}
    </nav>
  );
}
