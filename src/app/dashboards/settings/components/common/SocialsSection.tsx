"use client";

import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/useToast";
import { createClient } from '@/lib/supabase/client/client';
import {
  Globe,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Edit3,
  Check,
  X,
  ExternalLink,
  Trash2,
} from "lucide-react";

const SOCIAL_PLATFORMS = ['facebook', 'twitter', 'instagram', 'linkedin', 'website', 'youtube'] as const;
type SocialLinks = Record<(typeof SOCIAL_PLATFORMS)[number], string>;

const PLATFORM_URL_PREFIX: Record<keyof SocialLinks, string | null> = {
  facebook: 'https://www.facebook.com/',
  twitter: 'https://twitter.com/',
  instagram: 'https://www.instagram.com/',
  linkedin: 'https://www.linkedin.com/',
  youtube: 'https://www.youtube.com/',
  website: null,
};

const hasProtocol = (value: string) => /^https?:\/\//i.test(value);

const ensureWebsiteUrl = (value: string) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  return hasProtocol(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/,'')}`;
};

const toUrl = (value: string): URL | null => {
  try {
    return new URL(hasProtocol(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
};

const normalizePlatformInput = (platform: keyof SocialLinks, rawValue?: string) => {
  if (!rawValue) return '';
  const trimmed = rawValue.trim();
  if (!trimmed) return '';

  if (platform === 'website') {
    return ensureWebsiteUrl(trimmed);
  }

  const withoutAt = trimmed.replace(/^@/, '');
  const parsed = toUrl(withoutAt);
  if (parsed) {
    const pathname = parsed.pathname.replace(/^\/+/,'').replace(/\/+$/,'');
    const suffix = `${pathname}${parsed.search ?? ''}${parsed.hash ?? ''}`.trim();
    if (suffix) {
      return suffix;
    }
  }

  const prefix = PLATFORM_URL_PREFIX[platform] ?? '';
  if (prefix) {
    if (withoutAt.startsWith(prefix)) {
      return withoutAt.slice(prefix.length).replace(/^\/+/,'').replace(/\/+$/,'');
    }

    const protocolAgnostic = prefix.replace(/^https?:\/\//, '').replace(/^www\./, '');
    if (protocolAgnostic && withoutAt.startsWith(protocolAgnostic)) {
      return withoutAt.slice(protocolAgnostic.length).replace(/^\/+/,'').replace(/\/+$/,'');
    }
  }

  return withoutAt.replace(/^\/+/,'').replace(/\/+$/,'');
};

const buildPlatformHref = (platform: keyof SocialLinks, value: string) => {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (platform === 'website') {
    return ensureWebsiteUrl(trimmed);
  }

  if (hasProtocol(trimmed)) {
    return trimmed;
  }

  const prefix = PLATFORM_URL_PREFIX[platform];
  if (!prefix) {
    return trimmed;
  }

  return `${prefix}${trimmed.replace(/^@/, '')}`;
};

const SOCIALS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const buildCacheKey = (userId: string) => `locked:settings:socials:${userId}`;

const emptySocialLinks = (): SocialLinks => (
  SOCIAL_PLATFORMS.reduce((acc, platform) => {
    acc[platform] = '';
    return acc;
  }, {} as SocialLinks)
);

const normalizeLinks = (input?: Record<string, any>): SocialLinks => {
  const normalized = emptySocialLinks();
  SOCIAL_PLATFORMS.forEach((platform) => {
    const rawValue = input?.[platform];
    normalized[platform] = typeof rawValue === 'string' ? rawValue : '';
  });
  return normalized;
};

const sanitizeLinksForPersistence = (links: SocialLinks) => {
  const sanitized: Record<string, string> = {};
  SOCIAL_PLATFORMS.forEach((platform) => {
    const normalized = normalizePlatformInput(platform, links[platform]);
    if (normalized) {
      sanitized[platform] = normalized;
    }
  });
  return sanitized;
};

const cacheLinks = (userId: string, links: SocialLinks) => {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      expiresAt: Date.now() + SOCIALS_CACHE_TTL,
      data: links
    };
    sessionStorage.setItem(buildCacheKey(userId), JSON.stringify(payload));
  } catch (error) {
    console.warn('[SocialsSection] Failed to cache links', error);
  }
};

const restoreCachedLinks = (userId: string): SocialLinks | null => {
  if (typeof window === 'undefined') return null;
  try {
    const serialized = sessionStorage.getItem(buildCacheKey(userId));
    if (!serialized) return null;
    const payload = JSON.parse(serialized);
    if (!payload?.expiresAt || payload.expiresAt < Date.now()) {
      sessionStorage.removeItem(buildCacheKey(userId));
      return null;
    }
    if (!payload?.data) return null;
    return normalizeLinks(payload.data);
  } catch (error) {
    console.warn('[SocialsSection] Failed to restore cached links', error);
    return null;
  }
};

interface RoleContext {
  isOrganizer: boolean;
  isVenueOwner: boolean;
  roles: string[];
}

interface SocialsSectionProps {
  user: any;
  roleContext: RoleContext;
  isMobile?: boolean;
}

export function SocialsSection({ user, roleContext, isMobile }: SocialsSectionProps) {
  const toast = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(() => emptySocialLinks());
  const [editData, setEditData] = useState<SocialLinks>(() => emptySocialLinks());
  const [platformPendingDelete, setPlatformPendingDelete] = useState<keyof SocialLinks | null>(null);
  const isModalActive = Boolean(platformPendingDelete);

  // Load social links on mount with lightweight session caching
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const cachedLinks = restoreCachedLinks(user.id);
    if (cachedLinks) {
      setSocialLinks(cachedLinks);
      setEditData(cachedLinks);
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadFromDatabase = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('social_links')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        const normalized = normalizeLinks(data?.social_links || {});
        if (!isMounted) return;
        setSocialLinks(normalized);
        setEditData(normalized);
        cacheLinks(user.id, normalized);
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading social links:', error);
        toast.showError('Load Failed', 'Failed to load social links');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadFromDatabase();

    return () => {
      isMounted = false;
    };
  }, [supabase, toast, user?.id]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset edit data when canceling
      setEditData(socialLinks);
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (platform: keyof SocialLinks, value: string) => {
    setEditData(prev => ({
      ...prev,
      [platform]: value
    }));
  };

  const requestDeletePlatform = (platform: keyof SocialLinks) => {
    if (!editData[platform]) return;
    setPlatformPendingDelete(platform);
  };

  const handleDeleteCancel = () => setPlatformPendingDelete(null);

  const handleDeleteConfirm = () => {
    if (!platformPendingDelete) return;
    setEditData(prev => ({
      ...prev,
      [platformPendingDelete]: ''
    }));
    setPlatformPendingDelete(null);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const sanitized = sanitizeLinksForPersistence(editData);
      const updatePayload = Object.keys(sanitized).length > 0 ? sanitized : null;

      const { error } = await supabase
        .from('profiles')
        .update({ social_links: updatePayload })
        .eq('id', user.id);

      if (error) throw error;

      const normalized = normalizeLinks(sanitized);
      setSocialLinks(normalized);
      setEditData(normalized);
      cacheLinks(user.id, normalized);
      setIsEditing(false);
      toast.showSuccess('Saved', 'Social links updated successfully');
    } catch (error) {
      console.error('Error saving social links:', error);
      toast.showError('Error', 'Failed to save social links');
    } finally {
      setIsSaving(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch(platform) {
      case 'facebook':
        return <Facebook className="w-4 h-4" />;
      case 'twitter':
        return <Twitter className="w-4 h-4" />;
      case 'instagram':
        return <Instagram className="w-4 h-4" />;
      case 'linkedin':
        return <Linkedin className="w-4 h-4" />;
      case 'youtube':
        return <Youtube className="w-4 h-4" />;
      case 'website':
        return <Globe className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getPlatformLabel = (platform: string) => {
    switch(platform) {
      case 'website':
        return 'Personal Website';
      default:
        return platform.charAt(0).toUpperCase() + platform.slice(1);
    }
  };

  if (isLoading) {
    return (
      <div
        className={`p-4 sm:p-6 lg:p-8 transition filter ${isModalActive ? 'blur-sm pointer-events-none select-none' : ''}`}
        aria-hidden={isModalActive}
      >
        <div className="animate-pulse space-y-6">
          {/* Header skeleton */}
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
          
          {/* Social links grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Social Links</h2>
        <p className="text-gray-600">
          Connect your social media profiles to your account
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Adding social links helps others find and connect with you across different platforms.
        </p>
      </div>

      {/* Edit Button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={handleEditToggle}
          disabled={isSaving}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
            isEditing 
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          } disabled:opacity-50`}
        >
          {isEditing ? (
            <>
              <X className="w-4 h-4" />
              Cancel
            </>
          ) : (
            <>
              <Edit3 className="w-4 h-4" />
              Edit
            </>
          )}
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(Object.entries(editData) as Array<[keyof SocialLinks, string]>).map(([platform, value]) => {
              const previewUrl = buildPlatformHref(platform, value);
              const inputId = `social-${platform}`;
              return (
                <div key={platform}>
                  <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                    {getPlatformIcon(platform)}
                    {getPlatformLabel(platform)}
                  </label>
                  <input
                    id={inputId}
                    type="url"
                    value={value}
                    onChange={(e) => handleInputChange(platform, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Your ${getPlatformLabel(platform).toLowerCase()} ${platform === 'website' ? 'URL' : 'profile URL'}`}
                  />
                  <div className="flex items-center justify-between mt-2 text-xs">
                    {previewUrl ? (
                      <a 
                        href={previewUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                      >
                        Preview <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-gray-400">No link added yet</span>
                    )}
                    <button
                      type="button"
                      onClick={() => requestDeletePlatform(platform)}
                      disabled={!value}
                      className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-medium disabled:text-gray-300 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleEditToggle}
              disabled={isSaving}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(Object.entries(socialLinks) as Array<[keyof SocialLinks, string]>).map(([platform, value]) => {
            const displayUrl = buildPlatformHref(platform, value);
            return (
              <div key={platform} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-gray-500">
                    {getPlatformIcon(platform)}
                  </div>
                  <h3 className="font-medium text-gray-900">
                    {getPlatformLabel(platform)}
                  </h3>
                </div>
                
                {displayUrl ? (
                  <a
                    href={displayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-2 break-all"
                  >
                    {displayUrl}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                ) : (
                  <p className="text-gray-500 text-sm">Not added</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>

      {platformPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Remove {getPlatformLabel(platformPendingDelete)} link?</h3>
              <p className="text-sm text-gray-600 mt-1">
                This will clear the saved link for {getPlatformLabel(platformPendingDelete)}. You&apos;ll need to click &quot;Save Changes&quot; to apply it.
              </p>
              {editData[platformPendingDelete] && (
                <p className="mt-3 text-sm text-gray-500 break-all bg-gray-50 rounded-lg px-3 py-2">
                  {buildPlatformHref(platformPendingDelete, editData[platformPendingDelete]) || editData[platformPendingDelete]}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 rounded-lg border border-gray-200 bg-white transition-colors"
              >
                Keep Link
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Remove Link
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
