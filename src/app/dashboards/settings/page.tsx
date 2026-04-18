"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "next/navigation";
import { useSessionManagement } from "@/hooks/useSessionManagement";
import { PageLoader } from '@/components/loaders/PageLoader';
import { 
  User, 
  Shield, 
  Bell, 
  Building, 
  CreditCard, 
  Users, 
  Eye, 
  Settings as SettingsIcon,
  AlertTriangle,
  Globe,
} from "lucide-react";

// Import settings components
import { PersonalInformationSection } from "./components/PersonalInformationSection";
import { DangerZoneSection } from "./components/DangerZoneSection";
import {
  SecuritySection,
  SocialsSection,
  // NotificationsSection,
  OrganizationSection,
  VenueSettingsSection,
  TeamManagementSection,
  PaymentSettingsSection,
  // PrivacySection,
  // PreferencesSection
} from "./components/index";

interface SettingsSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  roles: string[]; // Which roles can see this section
  component: React.ComponentType<any>;
}

// Settings Content Component that uses searchParams
function SettingsContent() {
  useSessionManagement();

  const { user, loading: authLoading, rolesLoading, hasRole } = useAuth();
  const hasOrganizerRole = hasRole('organizer');
  const hasVenueOwnerRole = hasRole('venue_owner');
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || "personal");
  const [isLoading, setIsLoading] = useState(true);

  // Define all possible settings tabs with role requirements
  const allTabs: SettingsSection[] = [
    {
      id: "personal",
      title: "Personal",
      icon: <User className="w-4 h-4" />,
      description: "Personal details",
      roles: ["user"],
      component: PersonalInformationSection
    },
    {
      id: "security", 
      title: "Security",
      icon: <Shield className="w-4 h-4" />,
      description: "Account security & management",
      roles: ["user"],
      component: SecuritySection
    },
    {
      id: "socials",
      title: "Socials",
      icon: <Globe className="w-4 h-4" />,
      description: "Social media profiles",
      roles: ["user"],
      component: SocialsSection
    },
    // {\n    //   id: "notifications",
    //   title: "Notifications", 
    //   icon: <Bell className="w-4 h-4" />,
    //   description: "Notification preferences",
    //   roles: ["user"],
    //   component: NotificationsSection
    // },
    // {\n    //   id: "privacy",
    //   title: "Privacy",
    //   icon: <Eye className="w-4 h-4" />,
    //   description: "Privacy settings",
    //   roles: ["user"],
    //   component: PrivacySection
    // },
    {
      id: "organization",
      title: "Organization",
      icon: <Building className="w-4 h-4" />,
      description: "Organization info",
      roles: ["organizer", "venue_owner"],
      component: OrganizationSection
    },
    {
      id: "venue-settings",
      title: "Venue",
      icon: <Building className="w-4 h-4" />,
      description: "Venue preferences",
      roles: ["venue_owner"],
      component: VenueSettingsSection
    },
    {
      id: "team",
      title: "Team",
      icon: <Users className="w-4 h-4" />,
      description: "Team management", 
      roles: ["organizer", "venue_owner"],
      component: TeamManagementSection
    },
    {
      id: "payment-settings",
      title: "Payments",
      icon: <CreditCard className="w-4 h-4" />,
      description: "Payment methods",
      roles: ["organizer", "venue_owner"],
      component: PaymentSettingsSection
    },
    // {\n    //   id: "preferences",
    //   title: "Preferences",
    //   icon: <SettingsIcon className="w-4 h-4" />,
    //   description: "Display settings", 
    //   roles: ["user"],
    //   component: PreferencesSection
    // },
    // Note: Account/DangerZone settings are now part of Security tab
    // {\n    //   id: "danger-zone",
    //   title: "Account",
    //   icon: <AlertTriangle className="w-4 h-4" />,
    //   description: "Account management",
    //   roles: ["user"],
    //   component: DangerZoneSection
    // }
  ];

  // Filter tabs based on user's roles
  const availableTabs = allTabs.filter(tab => {
    return tab.roles.some(role => {
      switch(role) {
        case "user": 
          return true;
        case "organizer":
          return hasOrganizerRole;
        case "venue_owner": 
          return hasVenueOwnerRole;
        default:
          return false;
      }
    });
  });

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.find(t => t.id === activeTab)) {
      setActiveTab(availableTabs[0].id);
    }
    setIsLoading(false);
  }, [availableTabs, activeTab]);

  const handleTabChange = (tabId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    window.history.pushState({}, '', url.toString());
    setActiveTab(tabId);
  };

  // Show loading spinner while auth is loading or tabs are being prepared
  if (isLoading || authLoading || rolesLoading) {
    return <PageLoader message="Loading settings..." fullHeight />;
  }

  // Only show access denied after auth has fully loaded
  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">Please log in to access settings</p>
        </div>
      </div>
    );
  }

  // Get current active tab
  const currentTab = availableTabs.find(tab => tab.id === activeTab);
  const CurrentComponent = currentTab?.component;

  // Get user's role context
  const roleContext = {
    isOrganizer: hasOrganizerRole,
    isVenueOwner: hasVenueOwnerRole,
    roles: [
      "user",
      ...(hasOrganizerRole ? ["organizer"] : []),
      ...(hasVenueOwnerRole ? ["venue_owner"] : [])
    ]
  };

  return (
    <div className="space-y-6 pt-6 px-4 md:px-6 lg:px-40 pb-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account preferences and settings</p>
        </div>
        <div className="flex items-center gap-2">
          {roleContext.roles.map(role => (
            <span 
              key={role}
              className={`px-3 py-1 text-xs font-medium rounded-full ${
                role === 'organizer' ? 'bg-blue-100 text-blue-800' :
                role === 'venue_owner' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}
            >
              {role === 'venue_owner' ? 'Venue Owner' : 
               role.charAt(0).toUpperCase() + role.slice(1)}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs Navigation - Horizontal */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-2 md:px-6 overflow-x-auto md:overflow-x-visible">
          <div className="flex gap-1 border-b border-gray-200 md:flex-nowrap">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center justify-center md:justify-start gap-2 px-2 md:px-3 py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer flex-1 md:flex-none ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
                title={tab.title}
              >
                {tab.icon}
                <span>{tab.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {CurrentComponent ? (
          <CurrentComponent 
            user={user}
            roleContext={roleContext}
            isMobile={false}
          />
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500">Tab not found</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Main export with Suspense wrapper
export default function UnifiedSettingsPage() {
  return (
    <Suspense fallback={
      <PageLoader message="Loading settings..." fullHeight />
    }>
      <SettingsContent />
    </Suspense>
  );
}
