"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/useToast";
import {
  Palette,
  Globe,
  Volume2
} from "lucide-react";

export function PreferencesSection({ user, roleContext, isMobile }: any) {
  const toast = useToast();
  const [preferences, setPreferences] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;
      
      try {
        // Simulate loading preferences
        setPreferences({
          theme: 'system',
          language: 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          currency: 'GHS', // Default to Ghanaian Cedis
          soundEnabled: true,
          compactMode: false,
          showAnimations: true,
          dashboardLayout: 'default',
          eventCardStyle: 'detailed',
          defaultView: roleContext.isOrganizer ? 'events' : 
                      roleContext.isVenueOwner ? 'venues' : 'discover'
        });
      } catch (error) {
        console.error('Error loading preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPreferences();
  }, [user, roleContext]);

  const updatePreference = async (key: string, value: any) => {
    if (!user?.id || !preferences) return;
    
    setIsSaving(true);
    try {
      const updated = {
        ...preferences,
        [key]: value
      };
      
      setPreferences(updated);
      toast.showSuccess('Preferences Updated', 'Preferences updated successfully');
    } catch (error) {
      toast.showError('Update Failed', 'Failed to update preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      disabled={isSaving}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-gray-200'
      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Preferences</h2>
        <p className="text-gray-600">Customize your experience with theme, language, and display settings.</p>
      </div>
      
      <div className="space-y-8">
        {/* Appearance - Coming Soon */}
        <div className="bg-gray-50 rounded-lg p-6 opacity-50 pointer-events-none">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Appearance
          </h3>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <p className="text-sm text-blue-800">
              <strong>Coming Soon:</strong> Theme customization and display options will be available in a future update.
            </p>
          </div>
          <div className="space-y-6">
            {/* Theme Selection - Disabled */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Theme (Currently Light Only)
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  disabled
                  className="p-4 text-center rounded-lg border-2 border-primary bg-primary/5 text-primary cursor-not-allowed"
                >
                  <div className="h-12 w-full rounded mb-2 bg-white border-2"></div>
                  <span className="font-medium text-sm">Light</span>
                </button>
                <button
                  disabled
                  className="p-4 text-center rounded-lg border-2 border-gray-300 cursor-not-allowed opacity-50"
                >
                  <div className="h-12 w-full rounded mb-2 bg-gray-900 border-2"></div>
                  <span className="font-medium text-sm">Dark</span>
                </button>
                <button
                  disabled
                  className="p-4 text-center rounded-lg border-2 border-gray-300 cursor-not-allowed opacity-50"
                >
                  <div className="h-12 w-full rounded mb-2 bg-gradient-to-r from-white to-gray-900 border-2"></div>
                  <span className="font-medium text-sm">System</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Language & Currency */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Language & Currency
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Language - Currently English Only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value="en"
                disabled={true}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
              >
                <option value="en">English (Only)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                More languages will be available in future updates
              </p>
            </div>
            
            {/* Currency - West African Focus */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Currency
              </label>
              <select
                value={preferences?.currency || 'GHS'}
                onChange={(e) => updatePreference('currency', e.target.value)}
                disabled={isSaving}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="GHS">Ghanaian Cedi (₵)</option>
                <option value="XOF">West African CFA Franc (CFA)</option>
                <option value="NGN">Nigerian Naira (₦)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="EUR">Euro (€)</option>
                <option value="GBP">British Pound (£)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Removed Date & Time and Dashboard Layout sections for MVP */}

        {/* System */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            System
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Sound Notifications</p>
                <p className="text-sm text-gray-600">Play sounds for notifications and alerts</p>
              </div>
              <ToggleSwitch
                checked={preferences?.soundEnabled || false}
                onChange={() => updatePreference('soundEnabled', !preferences?.soundEnabled)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
