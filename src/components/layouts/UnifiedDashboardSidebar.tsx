"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from '@/components/ui/AppImage';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizerStore } from '@/store/organizerStore';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { isVenuesEnabled } from '@/lib/network';
import { 
  Building2, 
  LayoutDashboard, 
  Calendar,
  PlusCircle,
  Users, 
  BarChart4, 
  DollarSign, 
  Key, 
  Home,
  Crown, 
  Settings,
  User,
  LogOut,
  FileText,
  Bookmark,
  Ticket,
  MapPin,
  Clock,
  MessageSquare,
  Bell,
  CheckCircle,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

// Types
export type DashboardRole = 'user' | 'organizer' | 'venue_owner';

export interface SidebarLink {
  href: string;
  icon: React.ReactNode;
  label: string;
}

export interface SidebarSection {
  title?: string;
  links: SidebarLink[];
}

export interface SidebarConfig {
  role: DashboardRole;
  displayName: string;
  sections: SidebarSection[];
  switchViewLinks: SidebarLink[];
}

// Sidebar configurations for each role
const SIDEBAR_CONFIGS: Record<DashboardRole, SidebarConfig> = {
  user: {
    role: 'user',
    displayName: 'User',
    sections: [
      {
        links: [
          { href: '/dashboards/user', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
          { href: '/dashboards/user/tickets', icon: <Ticket className="w-5 h-5" />, label: 'My Tickets' },
          { href: '/dashboards/user/orders', icon: <Package className="w-5 h-5" />, label: 'My Orders' },
          { href: '/dashboards/user/locked-events', icon: <Bookmark className="w-5 h-5" />, label: 'Locked Events' },
          { href: '/dashboards/user/attended-events', icon: <CheckCircle className="w-5 h-5" />, label: 'Attended Events' },
          { href: '/dashboards/user/locked-venues', icon: <Building2 className="w-5 h-5" />, label: 'Locked Venues' },
          { href: '/dashboards/user/following', icon: <Users className="w-5 h-5" />, label: 'Following' },
          { href: '/dashboards/user/notifications', icon: <Bell className="w-5 h-5" />, label: 'Notifications' },
          { href: '/dashboards/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
        ]
      }
    ],
    switchViewLinks: [
      { href: '/dashboards/organizer', icon: <FileText className="w-5 h-5" />, label: 'Organizer' },
      { href: '/dashboards/venue-owner/', icon: <Building2 className="w-5 h-5" />, label: 'Venue' },
    ]
  },
  
  organizer: {
    role: 'organizer',
    displayName: 'Organizer',
    sections: [
      {
        links: [
          { href: '/dashboards/organizer', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
          { href: '/dashboards/organizer/events', icon: <Calendar className="w-5 h-5" />, label: 'My Events' },
          { href: '/dashboards/organizer/draft-events', icon: <FileText className="w-5 h-5" />, label: 'Draft Events' },
          { href: '/dashboards/organizer/create-event', icon: <PlusCircle className="w-5 h-5" />, label: 'Create Event' },
          { href: '/dashboards/organizer/analytics', icon: <BarChart4 className="w-5 h-5" />, label: 'Analytics' },
          { href: '/dashboards/organizer/finances', icon: <DollarSign className="w-5 h-5" />, label: 'Finances' },
          { href: '/dashboards/organizer/keys', icon: <Key className="w-5 h-5" />, label: 'KEYS Management' },
          { href: '/dashboards/organizer/premium', icon: <Crown className="w-5 h-5" />, label: 'Premium Status' },
          { href: '/dashboards/organizer/notifications', icon: <Bell className="w-5 h-5" />, label: 'Notifications' },
        ]
      },
      {
        title: 'Settings',
        links: [
          { href: '/dashboards/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
        ]
      }
    ],
    switchViewLinks: [
      { href: '/dashboards/user', icon: <User className="w-5 h-5" />, label: 'User' },
      { href: '/dashboards/venue-owner', icon: <Building2 className="w-5 h-5" />, label: 'Venue' },
    ]
  },
  
  'venue_owner': {
    role: 'venue_owner',
    displayName: 'Venue',
    sections: [
      {
        links: [
          { href: '/dashboards/venue-owner', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard' },
          { href: '/dashboards/venue-owner/venues', icon: <Building2 className="w-5 h-5" />, label: 'My Venues' },
          { href: '/dashboards/venue-owner/draft-venues', icon: <FileText className="w-5 h-5" />, label: 'Draft Venues' },
          { href: '/dashboards/venue-owner/venues/add', icon: <PlusCircle className="w-5 h-5" />, label: 'Add Venue' },
          { href: '/dashboards/venue-owner/bookings/', icon: <Clock className="w-5 h-5" />, label: 'Bookings' },
          { href: '/dashboards/venue-owner/availability', icon: <Clock className="w-5 h-5" />, label: 'Availability' },
          { href: '/dashboards/venue-owner/locations', icon: <MapPin className="w-5 h-5" />, label: 'Locations' },
          { href: '/dashboards/venue-owner/analytics', icon: <BarChart4 className="w-5 h-5" />, label: 'Analytics' },
          { href: '/dashboards/venue-owner/reviews', icon: <MessageSquare className="w-5 h-5" />, label: 'Reviews' },
          { href: '/dashboards/venue-owner/finances', icon: <DollarSign className="w-5 h-5" />, label: 'Finances' },
          { href: '/dashboards/venue-owner/keys', icon: <Key className="w-5 h-5" />, label: 'Keys Rewards' },
          { href: '/dashboards/venue-owner/notifications', icon: <Bell className="w-5 h-5" />, label: 'Notifications' },
        ]
      },
      {
        title: 'Settings',
        links: [
          { href: '/dashboards/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings' },
        ]
      }
    ],
    switchViewLinks: [
      { href: '/dashboards/user', icon: <User className="w-5 h-5" />, label: 'User' },
      { href: '/dashboards/organizer', icon: <FileText className="w-5 h-5" />, label: 'Organizer' },
    ]
  }
};

// Components
interface SidebarLinkProps extends SidebarLink {
  onNavigate?: () => void;
  isCollapsed?: boolean;
  disabled?: boolean;
  currentHash?: string;
}

function SidebarLinkComponent({ href, icon, label, onNavigate, isCollapsed = false, disabled = false, currentHash = '' }: SidebarLinkProps) {
  const pathname = usePathname();
  const hrefString = typeof href === 'string' ? href : '';
  const [baseHref, hashTargetRaw] = hrefString.split('#');
  const normalizedHref = baseHref?.replace(/[?#].*$/, '') || hrefString;
  const hashTarget = hashTargetRaw ? `#${hashTargetRaw}` : '';
  const matchesPath = pathname === normalizedHref;
  const isActive = hashTarget ? matchesPath && currentHash === hashTarget : matchesPath;
  
  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (onNavigate) onNavigate();
  };
  
  // Special handling for premium status with badge
  const displayIcon = href.includes('/premium') && !isCollapsed ? (
    (() => {
      const { premiumStatus } = useOrganizerStore();
      return premiumStatus ? (
        <PremiumBadge tier={premiumStatus} size="sm" />
      ) : icon;
    })()
  ) : icon;
  
  // Render as disabled element if user doesn't have access
  if (disabled) {
    return (
      <div
        className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-md opacity-50 cursor-not-allowed`}
        title={isCollapsed ? `${label} (Access Required)` : undefined}
      >
        <span>
          {displayIcon}
        </span>
        {!isCollapsed && (
          <div className="flex flex-col">
            <span>{label}</span>
            <span className="text-xs text-neutral-500">Access Required</span>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} py-2 rounded-md transition-colors ${
        isActive
          ? 'bg-primary text-white'
          : 'text-neutral-700 hover:bg-neutral-100'
      }`}
      title={isCollapsed ? label : undefined}
    >
      <span>
        {displayIcon}
      </span>
      {!isCollapsed && <span>{label}</span>}
    </Link>
  );
}

// Main component
interface UnifiedDashboardSidebarProps {
  role: DashboardRole;
  className?: string;
  onNavigate?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  hasRequiredRole?: boolean; // Whether user has the required role for this dashboard
}

export function UnifiedDashboardSidebar({ 
  role,
  className = "", 
  onNavigate, 
  isCollapsed = false,
  onToggleCollapse,
  hasRequiredRole = true // Default to true for user dashboard and when not specified
}: UnifiedDashboardSidebarProps) {
  const { signOut, roles: userRoles } = useAuth();
  const venuesEnabled = isVenuesEnabled();
  const [currentHash, setCurrentHash] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateHash = () => setCurrentHash(window.location.hash || '');
    updateHash();
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
  }, []);
  
  const config = SIDEBAR_CONFIGS[role];

  const isVenueLink = (href: string, label: string) => {
    const text = `${href} ${label}`.toLowerCase();
    return text.includes('venue') || text.includes('locked-venues');
  };

  const visibleSections = config.sections.map((section) => ({
    ...section,
    links: venuesEnabled
      ? section.links
      : section.links.filter((link) => !isVenueLink(link.href, link.label)),
  }));

  const visibleSwitchViewLinks = venuesEnabled
    ? config.switchViewLinks
    : config.switchViewLinks.filter((link) => !isVenueLink(link.href, link.label));
  
  // For organizer and venue_owner roles, disable navigation if user doesn't have required role
  const shouldDisableLinks = (role === 'organizer' || role === 'venue_owner') && !hasRequiredRole;
  
  // Check if user has specific roles for switch view links
  const hasOrganizerRole = userRoles?.includes('organizer') || false;
  const hasVenueOwnerRole = userRoles?.includes('venue_owner') || false;
  
  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} h-full flex flex-col border-r border-neutral-200 py-6 ${isCollapsed ? 'px-1' : 'px-3'} transition-all duration-300 ${className}`}>
      {/* Header with brand and standard sidebar toggle icon */}
      {isCollapsed ? (
        <div className="flex justify-center mb-6">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-md hover:bg-neutral-100 text-neutral-600 cursor-pointer"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="flex justify-between items-center px-3 mb-6">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative h-8 w-8 flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Locked Logo"
                fill
                className="object-contain"
                sizes="32px"
              />
            </div>
            <span className="text-xl font-bold text-primary truncate">{config.displayName}</span>
          </div>

          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-md hover:bg-neutral-100 text-neutral-600 cursor-pointer"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
      {/* Main sections */}
      {visibleSections.map((section, sectionIndex) => (
        <div key={sectionIndex} className={sectionIndex > 0 ? "mt-6 pt-6 border-t border-neutral-200" : ""}>
          {section.title && !isCollapsed && (
            <h3 className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              {section.title}
            </h3>
          )}
          <div className={`${sectionIndex > 0 ? 'mt-1' : ''} space-y-1`}>
            {section.links.map((link, linkIndex) => {
              // Don't disable certain links that should always be accessible
              const isBackToMainSite = link.href === '/';
              const isSettings = link.href === '/dashboards/settings';
              const isNotifications = link.href.includes('/notifications');
              const shouldNotDisable = isBackToMainSite || isSettings || isNotifications;
              
              return (
                <SidebarLinkComponent
                  key={linkIndex}
                  {...link}
                  onNavigate={onNavigate}
                  isCollapsed={isCollapsed}
                  currentHash={currentHash}
                  disabled={shouldDisableLinks && !shouldNotDisable}
                />
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Switch View Section */}
      <div className="mt-6 pt-6 border-t border-neutral-200">
        {!isCollapsed && (
          <h3 className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Switch View
          </h3>
        )}
        <div className="mt-1 space-y-1">
          {visibleSwitchViewLinks.map((link, linkIndex) => (
            <SidebarLinkComponent
              key={linkIndex}
              {...link}
              onNavigate={onNavigate}
              isCollapsed={isCollapsed}
              currentHash={currentHash}
            />
          ))}
        </div>
      </div>
      </div>
      
      {/* Sign Out Button */}
      <div className="flex-shrink-0 pt-8 px-3">
        <button
          onClick={async () => await signOut()} 
          className={`flex ${isCollapsed ? 'justify-center' : 'items-center gap-3'} text-red-500 hover:text-red-600 transition-colors cursor-pointer`}
          title={isCollapsed ? "Sign Out" : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
