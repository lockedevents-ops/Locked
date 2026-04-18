/**
 * Organizer Profile Page - Optimized Version
 * --------------------------------------------------------------
 * Performance optimizations applied:
 * - Request caching with deduplication
 * - React.memo on EventCard (already optimized)
 * - useMemo for expensive calculations
 * - useCallback for stable function references
 * - Memoized helper functions
 * - Loading skeleton instead of 3-dot loader
 * - Optimized re-renders on tab switching
 * - Image preloading
 * - Route prefetch on hover (EventCard)
 */

"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { organizerProfileService, type OrganizerProfile, type OrganizerProfileData } from '@/services/organizerProfileService';
import { followOrganizerService } from '@/services/followOrganizerService';
import { GalleryModal } from '@/components/events/GalleryModal';
import { EventCard } from '@/components/events/EventCard';
import { FeaturedCard } from '@/components/events/FeaturedCard';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { DefaultOrganizerIcon } from '@/components/ui/DefaultOrganizerIcon';
import { PillTabs } from '@/components/ui/PillTabs';
import { PageLoader } from '@/components/loaders/PageLoader';
import { requestCache } from '@/lib/requestCache';
import { preloadEventImages } from '@/lib/imagePreloader';
import { useLockStore } from '@/store/lockStore';
import { 
  Calendar, 
  MapPin, 
  User, 
  Mail, 
  Globe, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  MessageSquare,
  Star,
  Users,
  CalendarCheck,
  ExternalLink,
  Clock,
  FileText,
  Lock,
  Share2,
  X,
  Copy,
  Check,
  Youtube,
  Github,
  Twitch,
  Music,
  Crown,
  Trophy,
  Award
} from 'lucide-react';

// ✅ OPTIMIZATION: Memoized helper functions outside component
const socialIconMap: Record<string, React.ReactNode> = {
  facebook: <Facebook className="w-4 h-4" />,
  twitter: <Twitter className="w-4 h-4" />,
  x: <Twitter className="w-4 h-4" />,
  instagram: <Instagram className="w-4 h-4" />,
  linkedin: <Linkedin className="w-4 h-4" />,
  youtube: <Youtube className="w-4 h-4" />,
  github: <Github className="w-4 h-4" />,
  twitch: <Twitch className="w-4 h-4" />,
  tiktok: <Music className="w-4 h-4" />,
  website: <Globe className="w-4 h-4" />,
  threads: <MessageSquare className="w-4 h-4" />,
  default: <FileText className="w-4 h-4" />
};

const socialUrlPrefixMap: Record<string, string> = {
  facebook: 'https://facebook.com/',
  twitter: 'https://twitter.com/',
  x: 'https://x.com/',
  instagram: 'https://instagram.com/',
  linkedin: 'https://linkedin.com/in/',
  youtube: 'https://youtube.com/@',
  github: 'https://github.com/',
  twitch: 'https://twitch.tv/',
  tiktok: 'https://tiktok.com/@',
  threads: 'https://threads.net/@',
  website: 'https://',
  default: 'https://'
};

const getSocialIcon = (platform: string) => socialIconMap[platform] || socialIconMap.default;
const getSocialUrlPrefix = (platform: string) => socialUrlPrefixMap[platform] || socialUrlPrefixMap.default;

// Get ranking-based styling (matches OrganizerCard ranking colors)
const getRankingStyling = (rank?: number) => {
  if (!rank) return null;
  
  const rankingMap: Record<number, { ringColor: string; badgeGradient: string; badgeText: string; icon: string }> = {
    1: {
      ringColor: 'ring-indigo-400',
      badgeGradient: 'from-indigo-500 via-purple-500 to-pink-500',
      badgeText: 'Elite',
      icon: 'crown'
    },
    2: {
      ringColor: 'ring-cyan-300',
      badgeGradient: 'from-cyan-300 via-blue-400 to-indigo-400',
      badgeText: 'Platinum',
      icon: 'trophy'
    },
    3: {
      ringColor: 'ring-amber-300',
      badgeGradient: 'from-amber-300 via-yellow-400 to-amber-200',
      badgeText: 'Gold',
      icon: 'award'
    }
  };
  
  return rankingMap[rank] || null;
};

  const rankingIconComponentMap = {
    crown: Crown,
    trophy: Trophy,
    award: Award
  };

const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export default function OrganizerPublicProfile() {
  const { id } = useParams();
  const toast = useToast();
  const [organizer, setOrganizer] = useState<OrganizerProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'today' | 'past' | 'about'>('upcoming');
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [organizerRank, setOrganizerRank] = useState<number | undefined>(undefined);
  const [showProfileImageModal, setShowProfileImageModal] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const lockCounts = useLockStore(state => state.lockCounts);
  const initializeCounts = useLockStore(state => state.initializeCounts);
  
  // Pagination state
  const [upcomingEventsToShow, setUpcomingEventsToShow] = useState(8);
  const [todayEventsToShow, setTodayEventsToShow] = useState(8);
  const [pastEventsToShow, setPastEventsToShow] = useState(8);
  const eventsPerPage = 8;

  const hydrateProfileData = useCallback((profileData: OrganizerProfileData) => {
    if (!profileData?.organizer) {
      return;
    }

    setOrganizer(profileData.organizer);
    setUpcomingEvents(profileData.upcomingEvents);
    setTodayEvents(profileData.todayEvents);
    setPastEvents(profileData.pastEvents);

    const allEvents = [
      ...profileData.upcomingEvents,
      ...profileData.todayEvents,
      ...profileData.pastEvents
    ];

    // Hydrate the global lock store with initial counts
    const initialCounts = allEvents.reduce((acc, event) => {
      acc[event.id] = event.lockCount || 0;
      return acc;
    }, {} as { [key: string]: number });
    initializeCounts(initialCounts);

    if (allEvents.length > 0) {
      const eventImages = allEvents
        .slice(0, 6)
        .map(e => e.image)
        .filter(Boolean);

      if (eventImages.length > 0) {
        preloadEventImages(eventImages);
      }
    }
  }, [initializeCounts]);

  // ✅ OPTIMIZATION: Memoize total event locks calculation
  // This now depends on the global lockCounts store for real-time updates
  const totalEventLocks = useMemo(() => {
    const allEvents = [...upcomingEvents, ...todayEvents, ...pastEvents];
    return allEvents.reduce((sum, event) => {
      // Use the count from the store if available, otherwise fallback to the event's initial count
      const currentCount = lockCounts[event.id] ?? event.lockCount ?? 0;
      return sum + currentCount;
    }, 0);
  }, [upcomingEvents, todayEvents, pastEvents, lockCounts]);

  // This effect fetches the main organizer profile data.
  useEffect(() => {
    if (!id) return;

    const organizerId = id as string;
    const cacheKey = `profile:${organizerId}`;
    const cachedProfile = requestCache.getCachedValue<OrganizerProfileData>(cacheKey, PROFILE_CACHE_TTL);

    if (cachedProfile?.organizer) {
      hydrateProfileData(cachedProfile);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    const fetchOrganizerData = async () => {
      try {
        const { topOrganizersService } = await import('@/services/topOrganizersService');
        const topOrganizers = await topOrganizersService.getTopOrganizers({
          limit: 100,
          includeUnverified: true,
          weights: { events: 0.7, locked: 0.0, bookings: 0.3 }
        });
        
        const organizerIndex = topOrganizers.findIndex(org => org.organizer_id === organizerId);
        setOrganizerRank(organizerIndex !== -1 ? organizerIndex + 1 : undefined);
      } catch (error) {
        console.error('Error fetching organizer rank:', error);
      }
      
      try {
        const profileData = await requestCache.fetch(
          cacheKey,
          async () => organizerProfileService.getOrganizerProfile(organizerId),
          { ttl: PROFILE_CACHE_TTL, staleWhileRevalidate: true }
        );
        
        if (!profileData.organizer) {
          toast.showError("Organizer Not Found", "The organizer you're looking for could not be found");
          return;
        }
        
        hydrateProfileData(profileData);
        
        const count = await followOrganizerService.getOrganizerFollowerCount(organizerId);
        setFollowerCount(count);
        
      } catch (e) {
        console.error('Error loading organizer profile', e);
        toast.showError('Load Failed', 'Failed to load organizer information');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrganizerData();
  }, [id, hydrateProfileData]);
  
  // This effect specifically handles the follow status check.
  useEffect(() => {
    if (!id) return;
    const organizerId = id as string;

    const checkFollowStatus = async () => {
      // We must have an authenticated user to check the follow status.
      if (isAuthenticated && user?.id) {
        try {
          const following = await followOrganizerService.isFollowingOrganizer(organizerId, user.id);
          setIsFollowing(following);
        } catch (e) {
          console.error('Failed to check follow status:', e);
          setIsFollowing(false); // Default to not following on error.
        }
      } else {
        // If not authenticated, the user cannot be following.
        setIsFollowing(false);
      }
    };

    // Show loading state for the button only when we know the user is authenticated but we haven't checked the status yet.
    if (isAuthenticated) {
      setIsFollowing(null);
    }
    
    checkFollowStatus();
  }, [id, user?.id, isAuthenticated]);
  
  // ✅ OPTIMIZATION: Memoized load more handlers
  const handleLoadMoreUpcoming = useCallback(() => {
    setUpcomingEventsToShow(prev => prev + eventsPerPage);
  }, []);
  
  const handleLoadMoreToday = useCallback(() => {
    setTodayEventsToShow(prev => prev + eventsPerPage);
  }, []);
  
  const handleLoadMorePast = useCallback(() => {
    setPastEventsToShow(prev => prev + eventsPerPage);
  }, []);
  
  // Reset pagination when switching tabs
  useEffect(() => {
    setUpcomingEventsToShow(eventsPerPage);
    setTodayEventsToShow(eventsPerPage);
    setPastEventsToShow(eventsPerPage);
  }, [activeTab]);
  
  // ✅ OPTIMIZATION: Memoized follow/unfollow handler
  const toggleFollow = useCallback(async () => {
    if (isFollowing === null) return; // Do not run if status is not determined

    if (!isAuthenticated || !user?.id) {
      toast.showError("Sign In Required", "Please sign in to follow organizers");
      return;
    }
    
    try {
      // Prevent organizers from following themselves
      if (user.id === id) {
        toast.showError("Cannot Follow Yourself", "You cannot follow your own profile");
        return;
      }

      // Optimistic update
      const previousFollowing = isFollowing;
      const previousCount = followerCount;
      
      if (isFollowing) {
        // Optimistically update UI
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        
        // Call database
        const result = await followOrganizerService.trackFollow(id as string, user.id, 'unfollow');
        
        if (result.success) {
          // Update with actual count from database
          if (result.newCount !== undefined) {
            setFollowerCount(result.newCount);
          }
          toast.showSuccess('Unfollowed', `You've unfollowed ${organizer?.name ?? 'the organizer'}`);
        } else {
          // Revert on error
          setIsFollowing(previousFollowing);
          setFollowerCount(previousCount);
          toast.showError("Unfollow Failed", "Failed to unfollow organizer");
        }
      } else {
        // Optimistically update UI
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        
        // Call database
        const result = await followOrganizerService.trackFollow(id as string, user.id, 'follow');
        
        if (result.success) {
          // Update with actual count from database
          if (result.newCount !== undefined) {
            setFollowerCount(result.newCount);
          }
          toast.showSuccess('Following', `You're now following ${organizer?.name ?? 'the organizer'}`);
        } else {
          // Revert on error
          setIsFollowing(previousFollowing);
          setFollowerCount(previousCount);
          toast.showError("Follow Failed", "Failed to follow organizer");
        }
      }
    } catch (error) {
      console.error("Error updating follow status:", error);
      toast.showError("Update Failed", "Failed to update follow status");
    }
  }, [isAuthenticated, user?.id, isFollowing, followerCount, id, organizer?.name, toast]);

  // ✅ OPTIMIZATION: Memoized share handler
  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({
        title: `${organizer?.name} - Organizer Profile`,
        url: window.location.href,
      });
    } else {
      setShowShareModal(true);
    }
  }, [organizer?.name]);

  // ✅ OPTIMIZATION: Memoized copy link handler
  const handleCopyLink = useCallback(() => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
        });
    } else {
      const inputElement = document.getElementById('share-url-input');
      if (inputElement) {
        (inputElement as HTMLInputElement).select();
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    }
  }, []);

  // ✅ OPTIMIZATION: Memoized tab change handler
  const handleTabChange = useCallback((tab: 'upcoming' | 'today' | 'past' | 'about') => {
    setActiveTab(tab);
  }, []);

  // ✅ OPTIMIZATION: Show skeleton during loading
  if (isLoading) {
    return <PageLoader message="Loading organizer profile..." fullHeight />;
  }

  if (!organizer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-sm max-w-md">
          <User className="w-16 h-16 mx-auto text-neutral-300 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Organizer Not Found</h1>
          <p className="text-neutral-600 mb-6">The organizer you're looking for doesn't exist or has been removed.</p>
          <Link 
            href="/pages/discover" 
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg"
          >
            Discover Events
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const rankingStyles = organizerRank && organizerRank <= 3 ? getRankingStyling(organizerRank) : null;
  const RankingIcon = rankingStyles ? rankingIconComponentMap[rankingStyles.icon as keyof typeof rankingIconComponentMap] : null;

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Cover Image */}
      <div className="relative h-64 sm:h-80 md:h-96 bg-neutral-200">
        {organizer.coverImage ? (
          <Image
            src={organizer.coverImage}
            alt={`${organizer.name} cover`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-dark" />
        )}
        <div className="absolute inset-0 bg-black/30" />
      </div>
      
      {/* Organizer Info Section */}
      <div className="container mx-auto px-4">
        {/* Profile Header */}
        <div className={`relative rounded-xl shadow-sm -mt-20 mb-8 p-6 flex flex-col md:flex-row gap-6 items-center md:items-start ${
          organizerRank === 1 
            ? 'bg-gradient-to-br from-indigo-50 via-purple-100 to-white ring-2 ring-indigo-300/50 border border-indigo-200'
            : organizerRank === 2
            ? 'bg-gradient-to-br from-cyan-50 via-blue-100 to-white ring-2 ring-cyan-300/50 border border-cyan-200'
            : organizerRank === 3
            ? 'bg-gradient-to-br from-amber-50 via-yellow-100 to-white ring-2 ring-amber-300/50 border border-amber-200'
            : 'bg-white'
        }`}>
          {rankingStyles && RankingIcon && (
            <div className="absolute top-4 right-4">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${rankingStyles.badgeGradient} shadow-lg border border-white/70`}> 
                <RankingIcon className="w-3.5 h-3.5 text-white drop-shadow-sm" />
                <span className="text-xs font-semibold uppercase tracking-wide text-white">{rankingStyles.badgeText}</span>
              </div>
            </div>
          )}
          {/* Profile Image with Ranking Badge */}
          <div className="relative -mt-16 md:mt-0 flex flex-col items-center gap-3">
            <button
              onClick={() => setShowProfileImageModal(true)}
              className="relative cursor-pointer hover:opacity-90 transition-opacity group"
              aria-label={`View ${organizer.name} profile image`}
            >
              <div className={`w-28 h-28 relative rounded-full border-4 border-white overflow-hidden bg-white shadow-md ${rankingStyles ? `ring-4 ${rankingStyles.ringColor}` : ''}`}>
                {organizer.image ? (
                  <Image
                    src={organizer.image}
                    alt={organizer.name}
                    fill
                    sizes="112px"
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const defaultIcon = document.createElement('div');
                        defaultIcon.className = 'w-full h-full flex items-center justify-center';
                        parent.appendChild(defaultIcon);
                      }
                    }}
                  />
                ) : (
                  <DefaultOrganizerIcon size="xl" className="w-full h-full border-0" />
                )}
              </div>
              
              {rankingStyles && RankingIcon && (
                <div className="absolute -bottom-1 -right-1 z-10">
                  <div className={`h-8 w-8 rounded-full bg-gradient-to-r ${rankingStyles.badgeGradient} shadow-lg ring-2 ring-white flex items-center justify-center`}>
                    <RankingIcon className="w-4 h-4 text-white drop-shadow-sm" />
                  </div>
                </div>
              )}

              {/* Premium Badge */}
              {organizer.premiumTier && (
                <div className={`absolute ${rankingStyles ? '-left-2 -bottom-2' : '-right-2 -bottom-2'}`}>
                  <PremiumBadge tier={organizer.premiumTier} size="md" />
                </div>
              )}
            </button>
          </div>
          
          {/* Organizer Details */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-3">
              <h1 className="text-2xl font-bold">{organizer.name}</h1>
              <div className="flex flex-row items-center gap-2 w-full justify-center md:justify-start">
                {/* Follow Button */}
                <button
                  onClick={toggleFollow}
                  disabled={isFollowing === null}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-full font-medium flex items-center justify-center gap-1.5 text-xs cursor-pointer transition-colors ${
                    isFollowing
                      ? "bg-black text-white hover:bg-neutral-800"
                      : isFollowing === false
                      ? "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                      : "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-wait"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {isFollowing ? "Following" : (isFollowing === false ? "Follow" : "...")}
                  </span>
                </button>
                
                {/* Contact Button */}
                <Link
                  href={`mailto:${organizer.contactEmail}`}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-full font-medium bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-1.5 text-xs"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Contact</span>
                </Link>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-full font-medium bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer"
                  title="Share Profile"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>
            </div>
            <p className="text-neutral-600 mt-2">
              {organizer.location && (
                <span className="flex items-center gap-1 justify-center md:justify-start">
                  <MapPin className="w-3 h-3" />
                  {organizer.location}
                </span>
              )}
            </p>
            
            {/* Stats Row */}
            <div className="flex flex-wrap justify-center md:justify-start gap-6 mt-4">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-neutral-500" />
                <span className="text-sm">
                  <strong className="font-semibold">{followerCount}</strong> {followerCount === 1 ? 'follower' : 'followers'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-neutral-500" />
                <span className="text-sm">
                  <strong className="font-semibold">{upcomingEvents.length + todayEvents.length + pastEvents.length}</strong> events hosted
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-neutral-500" />
                <span className="text-sm">
                  <strong className="font-semibold">{totalEventLocks}</strong> total event locks
                </span>
              </div>
              
              {organizer.premiumTier && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold">
                    {organizer.premiumTier === 'platinum' ? 'Platinum' : 'Elite'} Organizer
                  </span>
                </div>
              )}
            </div>

            
            {/* Social Links - Display below stats on mobile, inline on desktop */}
            {organizer.socials && organizer.socials.length > 0 && (
              <div className="flex items-center justify-center md:hidden gap-3 mt-6 pt-4 border-t border-neutral-200">
                {organizer.socials.map((social: any, index: number) => (
                  <a 
                    key={index}
                    href={`${getSocialUrlPrefix(social.platform)}${social.username}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                    aria-label={`Visit ${social.platform}`}
                    title={`${social.platform}`}
                  >
                    {getSocialIcon(social.platform)}
                  </a>
                ))}
                
                {/* Website link (if not included in socials) */}
                {organizer.website && !organizer.socials?.some((s: any) => s.platform === 'website') && (
                  <a 
                    href={`https://${organizer.website}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                    aria-label="Visit website"
                    title="Website"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
            
            {/* Social Links - Desktop version (inline with stats) */}
            <div className="hidden md:flex items-center justify-center md:justify-start gap-3 mt-4">
              {/* Display socials from profile data */}
              {organizer.socials && organizer.socials.map((social: any, index: number) => (
                <a 
                  key={index}
                  href={`${getSocialUrlPrefix(social.platform)}${social.username}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                  aria-label={`Visit ${social.platform}`}
                  title={`${social.platform}`}
                >
                  {getSocialIcon(social.platform)}
                </a>
              ))}
              
              {/* Website link (if not included in socials) */}
              {organizer.website && !organizer.socials?.some((s: any) => s.platform === 'website') && (
                <a 
                  href={`https://${organizer.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                  aria-label="Visit website"
                  title="Website"
                >
                  <Globe className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
        

        
        {/* Tabs Navigation */}
        <div className="mb-8 overflow-x-auto hide-scrollbar">
          <PillTabs
            tabs={[
              { id: 'upcoming', label: 'Upcoming Events' },
              { id: 'today', label: 'Happening Today' },
              { id: 'past', label: 'Past Events' },
              { id: 'about', label: 'About' },
            ]}
            activeTab={activeTab}
            onTabChange={(tabId) => handleTabChange(tabId as 'upcoming' | 'today' | 'past' | 'about')}
            size="md"
          />
        </div>
        
        {/* Tab Content with Animation */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="pb-12"
          >
            {/* Upcoming Events Tab */}
            {activeTab === 'upcoming' && (
              <>
                {upcomingEvents.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                      {upcomingEvents.slice(0, upcomingEventsToShow).map(event => (
                        <EventCard key={event.id} {...event} />
                      ))}
                    </div>
                    
                    {/* Load More Button */}
                    {upcomingEvents.length > upcomingEventsToShow && (
                      <div className="mt-8 text-center">
                        <button
                          onClick={handleLoadMoreUpcoming}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium cursor-pointer"
                        >
                          Load More Events
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <p className="text-sm text-neutral-500 mt-2">
                          Showing {upcomingEventsToShow} of {upcomingEvents.length} events
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <Calendar className="mx-auto h-16 w-16 text-neutral-300 mb-4" />
                    <h3 className="text-xl font-medium mb-2">No Upcoming Events</h3>
                    <p className="text-neutral-600">
                      This organizer doesn't have any upcoming events at the moment.
                    </p>
                  </div>
                )}
              </>
            )}
            
            {/* Happening Today Tab */}
            {activeTab === 'today' && (
              <>
                {todayEvents.length > 0 ? (
                  <>
                    <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-blue-800">
                        <Clock className="w-5 h-5" />
                        <span className="font-medium">Events happening today</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                      {todayEvents.slice(0, todayEventsToShow).map(event => (
                        <EventCard key={event.id} {...event} />
                      ))}
                    </div>
                    
                    {/* Load More Button */}
                    {todayEvents.length > todayEventsToShow && (
                      <div className="mt-8 text-center">
                        <button
                          onClick={handleLoadMoreToday}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium cursor-pointer"
                        >
                          Load More Events
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <p className="text-sm text-neutral-500 mt-2">
                          Showing {todayEventsToShow} of {todayEvents.length} events
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <Calendar className="mx-auto h-16 w-16 text-neutral-300 mb-4" />
                    <h3 className="text-xl font-medium mb-2">No Events Today</h3>
                    <p className="text-neutral-600">
                      This organizer doesn't have any events happening today.
                    </p>
                  </div>
                )}
              </>
            )}
            
            {/* Past Events Tab */}
            {activeTab === 'past' && (
              <>
                {pastEvents.length > 0 ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                      {pastEvents.slice(0, pastEventsToShow).map(event => (
                        <EventCard key={event.id} {...event} isPastEvent={true} />
                      ))}
                    </div>
                    
                    {/* Load More Button */}
                    {pastEvents.length > pastEventsToShow && (
                      <div className="mt-8 text-center">
                        <button
                          onClick={handleLoadMorePast}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium cursor-pointer"
                        >
                          Load More Events
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <p className="text-sm text-neutral-500 mt-2">
                          Showing {pastEventsToShow} of {pastEvents.length} events
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <Clock className="mx-auto h-16 w-16 text-neutral-300 mb-4" />
                    <h3 className="text-xl font-medium mb-2">No Past Events</h3>
                    <p className="text-neutral-600">
                      This organizer doesn't have any past events.
                    </p>
                  </div>
                )}
              </>
            )}
            
            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
                <h2 className="text-xl font-semibold mb-6">About {organizer.name}</h2>
                <div className="space-y-6">
                  {/* Full bio from the profile */}
                  <p className="text-neutral-700 leading-relaxed">
                    {organizer.bio}
                  </p>
                  
                  {/* Contact Information */}
                  <div className="border-t border-neutral-100 pt-6">
                    <h3 className="font-semibold mb-3">Contact Information</h3>
                    <div className="space-y-3">
                      {organizer.contactEmail && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-5 h-5 text-neutral-500" />
                          <a href={`mailto:${organizer.contactEmail}`} className="text-primary hover:underline">
                            {organizer.contactEmail}
                          </a>
                        </div>
                      )}
                      
                      {organizer.phoneNumber && (
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-neutral-500">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                          </svg>
                          <span className="text-neutral-700">{organizer.phoneNumber}</span>
                        </div>
                      )}
                      
                      {(organizer.address || organizer.city || organizer.country) && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-5 h-5 text-neutral-500 mt-0.5" />
                          <div>
                            {organizer.address && <div className="text-neutral-700">{organizer.address}</div>}
                            {(organizer.city || organizer.country) && (
                              <div className="text-neutral-700">
                                {organizer.city}{organizer.city && organizer.country ? ', ' : ''}{organizer.country}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {organizer.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="w-5 h-5 text-neutral-500" />
                          <a 
                            href={`https://${organizer.website.replace(/^https?:\/\//, '')}`} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {organizer.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" 
          onClick={() => setShowShareModal(false)}
        >
          <div 
            className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl animate-scaleIn" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Share Organizer Profile</h3>
              <button 
                className="text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full p-1 transition-colors"
                onClick={() => setShowShareModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-sm text-neutral-600 mb-6">
              Share this organizer profile with your friends and community.
            </p>
            
            <button 
              onClick={handleCopyLink}
              className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all duration-300 ${
                copySuccess 
                  ? 'bg-neutral-700 text-white' 
                  : 'bg-neutral-800 text-white hover:bg-black'
              }`}
            >
              {copySuccess ? (
                <>
                  <Check className="w-5 h-5" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
            
            <input
              id="share-url-input"
              type="text"
              readOnly
              value={typeof window !== 'undefined' ? window.location.href : ''}
              className="sr-only"
              aria-hidden="true"
            />
            
            <div className="mt-8 mb-2">
              <p className="text-sm text-center text-neutral-600 mb-4">
                Or share directly on social media:
              </p>
              <div className="flex justify-center gap-4">
                {/* WhatsApp */}
                <a 
                  href={`https://wa.me/?text=${encodeURIComponent(`Check out ${organizer?.name}'s profile: ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-[#25D366] text-white hover:opacity-90 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
                  aria-label="Share on WhatsApp"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.091 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345z"/>
                  </svg>
                </a>
                
                {/* Telegram */}
                <a 
                  href={`https://t.me/share/url?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(`Check out ${organizer?.name}'s profile!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-[#0088cc] text-white hover:opacity-90 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
                  aria-label="Share on Telegram"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M19.2,4.4L2.9,10.7c-1.1,0.4-1.1,1.1-0.2,1.3l4.1,1.3l1.6,4.8c0.2,0.5,0.1,0.7,0.6,0.7c0.4,0,0.6-0.2,0.8-0.4 c0.1-0.1,1-1,2-2l4.2,3.1c0.8,0.4,1.3,0.2,1.5-0.7l2.8-13.1C20.6,4.6,19.9,4,19.2,4.4z"/>
                  </svg>
                </a>
                
                {/* Twitter/X */}
                <a 
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${organizer?.name}'s profile: ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-[#000000] text-white hover:opacity-90 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
                  aria-label="Share on Twitter/X"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                
                {/* Facebook */}
                <a 
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-[#1877F2] text-white hover:opacity-90 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-1"
                  aria-label="Share on Facebook"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Profile Image Modal */}
      {organizer?.image && (
        <GalleryModal
          isOpen={showProfileImageModal}
          onClose={() => setShowProfileImageModal(false)}
          images={[organizer.image]}
          selectedIndex={0}
        />
      )}
    </div>
  );
}
