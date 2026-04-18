"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { HelpDropdown } from './HelpDropdown';
import { Search, Menu, LogOut, ChevronDown, ChevronRight, ChevronUp, LayoutDashboard, HelpCircle, BookOpen, Gift, ExternalLink } from 'lucide-react';
import { SearchSidebar } from '@/components/ui/SearchSidebar';
import { NotificationSidebar } from '@/components/ui/NotificationSidebar';
import { KeysBalance } from '@/components/keys/KeysBalance';
import { NotificationIcon } from '@/components/nav/NotificationIcon';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { CartIcon } from '@/components/cart/CartIcon';
import { CartModal } from '@/components/cart/CartModal';
import { isVenuesEnabled } from '@/lib/network';

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isNotificationSidebarOpen, setIsNotificationSidebarOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [expandedMobileSection, setExpandedMobileSection] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, signOut, roles, isOrganizer, isVenueOwner } = useAuth();
  const isAuthenticated = !!user; 
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const venuesEnabled = isVenuesEnabled();
  
  // Check if current page is homepage
  const isHomepage = pathname === '/';

  // Handle scroll for navbar transparency on homepage
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial scroll position
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isActive = (path: string) => pathname === path;

  const toggleMobileSection = (sectionName: string) => {
    setExpandedMobileSection(prev => (prev === sectionName ? null : sectionName));
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setIsMenuOpen(false);
    }
  };

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleProfileMouseEnter = () => {
    if (profileTimeoutRef.current) {
      clearTimeout(profileTimeoutRef.current);
      profileTimeoutRef.current = null;
    }
    setIsProfileDropdownOpen(true);
  };
  
  const handleProfileMouseLeave = () => {
    profileTimeoutRef.current = setTimeout(() => {
      setIsProfileDropdownOpen(false);
    }, 300); // 300ms delay before closing
  };

  // Clear timeout when component unmounts
  useEffect(() => {
    return () => {
      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current);
      }
    };
  }, []);

  // Auto-collapse mobile menu on outside click and significant scroll
  useEffect(() => {
    if (!isMenuOpen) return;

    let initialScrollY = window.scrollY;
    
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      // Check if click is outside both the mobile menu and the menu button
      const isOutsideMenu = mobileMenuRef.current && !mobileMenuRef.current.contains(target);
      const isOutsideButton = mobileMenuButtonRef.current && !mobileMenuButtonRef.current.contains(target);
      
      if (isOutsideMenu && isOutsideButton) {
        setIsMenuOpen(false);
        setExpandedMobileSection(null); // Also collapse any expanded sections
      }
    }

    function handleScroll() {
      const currentScrollY = window.scrollY;
      const scrollDifference = Math.abs(currentScrollY - initialScrollY);
      
      // Only close menu if user has scrolled significantly (more than 100px)
      if (scrollDifference > 100) {
        setIsMenuOpen(false);
        setExpandedMobileSection(null);
      }
    }

    // Add a small delay to prevent immediate closure when menu is opened
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, { passive: true });
    }, 150); // Slightly longer delay to ensure menu is fully rendered

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isMenuOpen]);

  // Determine navbar background based on page and scroll state
  // On mobile: always black with border
  // On desktop homepage: transparent at top, black on scroll
  // On other pages: always black with border
  const navbarBg = isHomepage && !isScrolled 
    ? 'bg-black lg:bg-transparent' 
    : 'bg-black';
  
  const navbarBorder = isHomepage && !isScrolled
    ? 'border-b border-neutral-800 lg:border-transparent'
    : 'border-b border-neutral-800';

  return (
    <>
      {/* SearchSidebar and CartModal rendered outside navbar to avoid z-index and positioning issues */}
      <SearchSidebar isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} />
      <NotificationSidebar isOpen={isNotificationSidebarOpen} onClose={() => setIsNotificationSidebarOpen(false)} />
      <CartModal />

      
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-14 lg:h-16 ${navbarBg} ${navbarBorder}`}
      >
        <div className="container mx-auto px-4 h-full">
        <nav className="flex items-center justify-between h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2" onClick={handleLogoClick}>
            <img
              src="/locked-logo-text-white.png"
              alt="Locked Logo"
              className="h-3.5 w-auto object-contain"
              style={{ maxWidth: '125px' }}
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {/* Search button */}
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900/70 px-4 py-2 text-sm text-white transition-colors hover:border-neutral-500 hover:bg-neutral-800 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
              aria-label="Open search"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
            <Link 
              href="/pages/discover"
              className={`text-sm ${isActive('/pages/discover') ? 'text-accent font-medium' : 'text-white hover:text-accent'}`}
            >
              Discover Events
            </Link>
            <Link 
              href="/pages/discover?hasVoting=true"
              className={`text-sm ${isActive('/pages/discover') && searchParams?.get('hasVoting') === 'true' ? 'text-accent font-medium' : 'text-white hover:text-accent'}`}
            >
              Vote Now
            </Link>
            {venuesEnabled && (
              <Link 
                href="/pages/venues"
                className={`text-sm ${isActive('/pages/venues') ? 'text-accent font-medium' : 'text-white hover:text-accent'}`}
              >
                Find Venues
              </Link>
            )}
            <Link 
              href="/pages/platform_merch"
              className={`text-sm ${isActive('/pages/platform_merch') ? 'text-accent font-medium' : 'text-white hover:text-accent'}`}
            >
              Locked Store
            </Link>
            
            {/* Help Dropdown - now includes Voting Guide */}
            <HelpDropdown />
          </div>

          {/* Authentication */}
          <div className="hidden lg:flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                {/* Add KeysBalance component */}
                <div className="hidden lg:flex items-center border-r border-neutral-700 pr-4 mr-4">
                  <Link 
                    href="/pages/rewards" 
                    className="flex items-center gap-2 text-white hover:text-accent transition-colors"
                  >
                    <KeysBalance size="small" />
                  </Link>
                </div>
                
                {/* Notifications & Cart */}
                <div className="flex items-center gap-1">
                  <CartIcon />
                  <NotificationIcon onClick={() => setIsNotificationSidebarOpen(true)} />
                </div>
                
                {/* Profile dropdown - UPDATED */}
                <div 
                  className="relative"
                  onMouseEnter={handleProfileMouseEnter}
                  onMouseLeave={handleProfileMouseLeave}
                  ref={dropdownRef}
                >
                  <div
                    className="flex items-center justify-center hover:bg-neutral-800 transition-colors cursor-pointer rounded-full p-1"
                    title="Your Profile"
                  >
                    <ProfileAvatar 
                      avatarUrl={user?.avatar_url}
                      name={user?.name || user?.user_metadata?.full_name}
                      size="small"
                    />
                  </div>
                  
                  {/* Profile Dropdown Menu */}
                  {isProfileDropdownOpen && (
                    <div className="absolute right-0 mt-1 w-64 bg-black rounded-lg shadow-lg py-2 z-50 border border-neutral-800 animate-in fade-in slide-in-from-top-2 duration-150">
                      {/* User info section */}
                      <div className="px-4 py-2 border-b border-neutral-800">
                        <div className="flex items-center gap-2">
                          <ProfileAvatar 
                            avatarUrl={user?.avatar_url}
                            name={user?.name || user?.user_metadata?.full_name}
                            size="small"
                            className="border border-neutral-700"
                          />
                          <div>
                            <p className="text-sm font-medium text-white">{user?.name || user?.user_metadata?.full_name || 'User'}</p>
                            <p className="text-xs text-neutral-400">{user?.email || ''}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Dashboards Section */}
                      <div className="px-4 py-2">
                        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Dashboards</span>
                        <ul className="mt-2 space-y-1">
                          <li>
                            <Link 
                              href="/dashboards/user" 
                              className="block px-2 py-1 text-sm text-white hover:bg-neutral-800 hover:text-accent rounded-md"
                            >
                              User Dashboard
                            </Link>
                          </li>
                          <li>
                            <Link 
                              href="/dashboards/organizer/" 
                              className="block px-2 py-1 text-sm text-white hover:bg-neutral-800 hover:text-accent rounded-md"
                            >
                              Organizer Dashboard
                            </Link>
                          </li>
                          {venuesEnabled && (
                            <li>
                              <Link 
                                href="/dashboards/venue-owner" 
                                className="block px-2 py-1 text-sm text-white hover:bg-neutral-800 hover:text-accent rounded-md"
                              >
                                Venue Owner Dashboard
                              </Link>
                            </li>
                          )}
                        </ul>
                      </div>
                      
                      <div className="border-t border-neutral-800 my-1"></div>
                      
                      {/* Quick Actions Section */}
                      <div className="px-4 py-2">
                        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Quick Actions</span>
                        <ul className="mt-2 space-y-1">
                          <li>
                            <Link 
                              href="/dashboards/user/tickets" 
                              className="block px-2 py-1 text-sm text-white hover:bg-neutral-800 hover:text-accent rounded-md"
                            >
                              My Tickets
                            </Link>
                          </li>
                          <li>
                            <Link 
                              href="/dashboards/user/locked-events" 
                              className="block px-2 py-1 text-sm text-white hover:bg-neutral-800 hover:text-accent rounded-md"
                            >
                              Locked Events
                            </Link>
                          </li>
                          {isOrganizer && (
                            <>
                              <li>
                                <Link 
                                  href="/dashboards/organizer/create-event" 
                                  className="block px-2 py-1 text-sm text-white hover:bg-neutral-800 hover:text-accent rounded-md"
                                >
                                  Create Event
                                </Link>
                              </li>
                              <li>
                                <Link 
                                  href="/dashboards/organizer/events" 
                                  className="block px-2 py-1 text-sm text-white hover:bg-neutral-800 hover:text-accent rounded-md"
                                >
                                  My Events
                                </Link>
                              </li>
                              <li>
                                <Link 
                                  href="/dashboards/organizer/keys" 
                                  className="block px-2 py-1 text-sm text-white hover:bg-neutral-800 hover:text-accent rounded-md"
                                >
                                  Keys Management
                                </Link>
                              </li>
                            </>
                          )}
                        </ul>
                      </div>
                      
                      <div className="border-t border-neutral-800 my-1"></div>
                      
                      {/* Account Section */}
                      <div className="px-4 py-2">
                        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Account</span>
                        <ul className="mt-2 space-y-1">
                          <li>
                            <Link 
                              href="/dashboards/settings" 
                              className="block px-2 py-1 text-sm text-white hover:bg-neutral-800 hover:text-accent rounded-md"
                            >
                              Profile Settings
                            </Link>
                          </li>
                          <li>
                            <button 
                              onClick={() => signOut()}
                              className="block w-full text-left px-2 py-1 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 rounded-md cursor-pointer"
                            >
                              Sign Out
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link 
                  href={`/auth/signin?returnUrl=${pathname}`} 
                  className="text-sm text-white hover:text-accent"
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/signup" 
                  className="bg-accent text-black px-4 py-2 rounded-md text-sm font-medium hover:bg-accent/90 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Right side elements for mobile */}
          <div className="lg:hidden flex items-center gap-3">
            {/* Mobile search */}
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/70 text-white transition-all duration-200 hover:border-neutral-500 hover:bg-neutral-800 active:scale-95"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Mobile cart & notifications for authenticated users */}
            {isAuthenticated && (
              <>
                <CartIcon />
                <NotificationIcon onClick={() => setIsNotificationSidebarOpen(true)} />
              </>
            )}

            {/* Mobile Menu Button */}
            <button 
              ref={mobileMenuButtonRef}
              className="lg:hidden text-white"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                className="w-6 h-6"
              >
                {isMenuOpen ? (
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                ) : (
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 6h16M4 12h16M4 18h16" 
                  />
                )}
              </svg>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Menu - Full Screen */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="lg:hidden fixed top-14 left-0 right-0 bottom-0 bg-black overflow-y-auto z-40"
          >
            <div ref={mobileMenuRef} className="container mx-auto px-6 py-4">
              {/* ... existing content ... */}
              <div className="flex flex-col items-center">

                {/* Navigation Section */}
                <div className="w-full text-center mb-4">
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Navigation</h3>
                  <div className="space-y-2">
                    <Link 
                      href="/pages/discover"
                      className={`block text-lg ${isActive('/pages/discover') ? 'text-accent font-semibold' : 'text-white'} hover:text-accent transition-colors py-1`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Discover Events
                    </Link>
                    <Link 
                      href="/pages/discover?hasVoting=true"
                      className={`block text-lg ${isActive('/pages/discover') && searchParams?.get('hasVoting') === 'true' ? 'text-accent font-semibold' : 'text-white'} hover:text-accent transition-colors py-1`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Vote Now
                    </Link>
                    {venuesEnabled && (
                      <Link 
                        href="/pages/venues"
                        className={`block text-lg ${isActive('/pages/venues') ? 'text-accent font-semibold' : 'text-white'} hover:text-accent transition-colors py-1`}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Find Venues
                      </Link>
                    )}
                    <Link 
                      href="/pages/platform_merch"
                      className={`block text-lg ${isActive('/pages/platform_merch') ? 'text-accent font-semibold' : 'text-white'} hover:text-accent transition-colors py-1`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Locked Store
                    </Link>
                  </div>
                </div>

                {/* User Navigation - Only show if authenticated */}
                {isAuthenticated && (
                  <div className="pt-4 mt-4 border-t border-neutral-800 w-full text-center">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">Quick Access</h3>
                    {/* Quick Actions for all users */}
                    <div className="space-y-2 mb-4">
                      <Link 
                        href="/dashboards/user/tickets" 
                        className="block text-lg text-white hover:text-accent transition-colors py-0.5"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        My Tickets
                      </Link>
                      <Link 
                        href="/dashboards/user/locked-events" 
                        className="block text-lg text-white hover:text-accent transition-colors py-0.5"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Locked Events
                      </Link>
                      {isOrganizer && (
                        <>
                          <Link 
                            href="/dashboards/organizer/create-event" 
                            className="block text-lg text-white hover:text-accent transition-colors py-0.5"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            Create Event
                          </Link>
                          <Link 
                            href="/dashboards/organizer/events" 
                            className="block text-lg text-white hover:text-accent transition-colors py-0.5"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            My Events
                          </Link>
                          <Link 
                            href="/dashboards/organizer/keys" 
                            className="block text-lg text-white hover:text-accent transition-colors py-0.5"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            Keys Management
                          </Link>
                        </>
                      )}
                    </div>

                    {/* For standard users only - show additional links */}
                    {!isOrganizer && !isVenueOwner && (
                      <div className="space-y-2">
                        <Link 
                          href="/dashboards/user?section=locked-events" 
                          className="block text-lg text-white hover:text-accent transition-colors py-0.5"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Locked Events
                        </Link>
                        {venuesEnabled && (
                          <Link 
                            href="/dashboards/user?section=locked-venues" 
                            className="block text-lg text-white hover:text-accent transition-colors py-0.5"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            Locked Venues
                          </Link>
                        )}
                      </div>
                    )}

                    {/* For users with multiple roles - group dashboards */}
                    {(isOrganizer || isVenueOwner) && (
                      <>
                        <button
                          onClick={() => toggleMobileSection('dashboards')}
                          className="flex items-center justify-center gap-3 w-full text-lg font-semibold text-white py-2 hover:bg-neutral-800 rounded-lg transition-colors"
                        >
                          <LayoutDashboard className="w-5 h-5" />
                          <span>My Dashboards</span>
                          {expandedMobileSection === 'dashboards' ? (
                            <ChevronUp className="w-5 h-5 transition-transform duration-200" />
                          ) : (
                            <ChevronDown className="w-5 h-5 transition-transform duration-200" />
                          )}
                        </button>
                        {expandedMobileSection === 'dashboards' && (
                          <div className="mt-2 space-y-2">
                            <Link 
                              href="/dashboards/user" 
                              className="block text-lg text-neutral-300 hover:text-accent transition-colors py-0.5"
                              onClick={() => setIsMenuOpen(false)}
                            >
                              User Dashboard
                            </Link>
                            {isOrganizer && (
                              <Link 
                                href="/dashboards/organizer" 
                                className="block text-lg text-neutral-300 hover:text-accent transition-colors py-0.5"
                                onClick={() => setIsMenuOpen(false)}
                              >
                                Organizer Dashboard
                              </Link>
                            )}
                            {venuesEnabled && isVenueOwner && (
                              <Link 
                                href="/dashboards/venue-owner" 
                                className="block text-lg text-neutral-300 hover:text-accent transition-colors py-0.5"
                                onClick={() => setIsMenuOpen(false)}
                              >
                                Venue Owner Dashboard
                              </Link>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Rewards Section - Only show if authenticated */}
                {isAuthenticated && (
                  <div className="pt-4 mt-4 border-t border-neutral-800 w-full text-center">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Rewards</h3>
                    <button
                      onClick={() => toggleMobileSection('rewards')}
                      className="flex items-center justify-center gap-3 w-full text-lg font-semibold text-white py-2 hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                      <Gift className="w-5 h-5" />
                      <span>Rewards</span>
                      {expandedMobileSection === 'rewards' ? (
                        <ChevronUp className="w-5 h-5 transition-transform duration-200" />
                      ) : (
                        <ChevronDown className="w-5 h-5 transition-transform duration-200" />
                      )}
                    </button>
                    {expandedMobileSection === 'rewards' && (
                      <div className="mt-2 space-y-2">
                        <Link 
                          href="/pages/rewards"
                          className="block text-lg text-neutral-300 hover:text-accent transition-colors py-0.5"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Earn Keys
                        </Link>
                        <Link 
                          href="/pages/rewards"
                          className="block text-lg text-neutral-300 hover:text-accent transition-colors py-0.5"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Redeem Keys
                        </Link>
                        <Link 
                          href="/pages/rewards"
                          className="block text-lg text-neutral-300 hover:text-accent transition-colors py-0.5"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          History
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* Collapsible Help Section */}
                <div className="pt-4 mt-4 border-t border-neutral-800 w-full text-center">
                  <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Help & Support</h3>
                  {/* Support Section */}
                  <button
                    onClick={() => toggleMobileSection('support')}
                    className="flex items-center justify-center gap-3 w-full text-lg font-semibold text-white py-2 hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span>Support</span>
                    {expandedMobileSection === 'support' ? (
                      <ChevronUp className="w-5 h-5 transition-transform duration-200" />
                    ) : (
                      <ChevronDown className="w-5 h-5 transition-transform duration-200" />
                    )}
                  </button>
                  {expandedMobileSection === 'support' && (
                    <div className="mt-2 space-y-2">
                      <Link 
                        href="/pages/help/faqs"
                        className="block text-lg text-neutral-300 hover:text-accent transition-colors py-0.5"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        FAQs
                      </Link>
                      <Link 
                        href="/pages/help/contact"
                        className="block text-lg text-neutral-300 hover:text-accent transition-colors py-0.5"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Contact Us
                      </Link>
                      <Link 
                        href="/pages/help/account"
                        className="block text-lg text-neutral-300 hover:text-accent transition-colors py-0.5"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Account Help
                      </Link>
                    </div>
                  )}

                  {/* Guides Section */}
                  <div className="mt-2">
                    <button
                      onClick={() => toggleMobileSection('guides')}
                      className="flex items-center justify-center gap-3 w-full text-lg font-semibold text-white py-2 hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                    <BookOpen className="w-5 h-5" />
                    <span>Guides</span>
                    {expandedMobileSection === 'guides' ? (
                      <ChevronUp className="w-5 h-5 transition-transform duration-200" />
                    ) : (
                      <ChevronDown className="w-5 h-5 transition-transform duration-200" />
                    )}
                  </button>
                  {expandedMobileSection === 'guides' && (
                    <div className="mt-2 space-y-2">
                      <Link 
                        href="/pages/guides/booking"
                        className="block text-lg text-neutral-300 hover:text-accent transition-colors py-0.5"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Booking
                      </Link>
                      <Link 
                        href="/pages/guides/hosting"
                        className="block text-lg text-neutral-300 hover:text-accent transition-colors py-0.5"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Event Hosting
                      </Link>
                      <Link 
                        href="/pages/guides/voting"
                        className="block text-lg text-neutral-300 hover:text-accent transition-colors py-0.5"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Voting Guide
                      </Link>
                    </div>
                  )}
                  </div>
                </div>

                {/* User Profile & Sign Out - Bottom Section */}
                <div className="pt-4 mt-4 border-t border-neutral-800 w-full">
                  {isAuthenticated ? (
                    <div className="flex flex-col gap-6">
                      {/* Profile and Sign Out - Horizontal */}
                      <div className="flex items-center justify-between px-4">
                        <Link 
                          href="/dashboards/settings"
                          className="flex items-center gap-3 hover:bg-neutral-800 rounded-lg p-2 transition-colors"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <ProfileAvatar 
                            avatarUrl={user?.avatar_url}
                            name={user?.name || user?.user_metadata?.full_name}
                            size="medium"
                          />
                          <div className="text-base font-medium text-white">
                            {user?.name || user?.user_metadata?.full_name || 'User'}
                          </div>
                        </Link>
                        
                        <button 
                          onClick={() => {
                            signOut();
                            setIsMenuOpen(false);
                          }}
                          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-900/20 hover:bg-red-900/40 transition-colors text-sm text-red-400"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col space-y-4 w-full">
                      <Link 
                        href={`/auth/signin?returnUrl=${pathname}`} 
                        className="text-base border border-accent text-white px-6 py-3 rounded-md font-medium text-center hover:bg-neutral-800 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                      <Link 
                        href="/auth/signup" 
                        className="bg-accent text-black px-6 py-3 rounded-md text-base font-medium text-center hover:bg-accent/90 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign Up
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </header>
    </>
  );
}
