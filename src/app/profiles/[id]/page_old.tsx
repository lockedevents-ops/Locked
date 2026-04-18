"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { organizerProfileService, type OrganizerProfile, type OrganizerProfileData } from '@/services/organizerProfileService';
import { followOrganizerService } from '@/services/followOrganizerService';
import { EventCard } from '@/components/events/EventCard';
import { FeaturedCard } from '@/components/events/FeaturedCard';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { DefaultOrganizerIcon } from '@/components/ui/DefaultOrganizerIcon';
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
  Music
} from 'lucide-react';

export default function OrganizerPublicProfile() {
  const { id } = useParams();
  const toast = useToast();
  const [organizer, setOrganizer] = useState<OrganizerProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'today' | 'past' | 'about'>('upcoming');
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [todayEvents, setTodayEvents] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const { isAuthenticated, user } = useAuth();
  
  // Pagination state
  const [upcomingEventsToShow, setUpcomingEventsToShow] = useState(8);
  const [todayEventsToShow, setTodayEventsToShow] = useState(8);
  const [pastEventsToShow, setPastEventsToShow] = useState(8);
  const eventsPerPage = 8;

  // Calculate total event locks across all events
  const totalEventLocks = 
    upcomingEvents.reduce((sum, event) => sum + (event.lockCount || 0), 0) +
    todayEvents.reduce((sum, event) => sum + (event.lockCount || 0), 0) +
    pastEvents.reduce((sum, event) => sum + (event.lockCount || 0), 0);

  // Fetch organizer and their events
  useEffect(() => {
    const fetchOrganizerData = async () => {
      setIsLoading(true);
      try {
        const profileData = await organizerProfileService.getOrganizerProfile(id as string);
        if (!profileData.organizer) {
          toast.showError("Organizer Not Found", "The organizer you're looking for could not be found");
          setIsLoading(false);
          return;
        }
        setOrganizer(profileData.organizer);
        setUpcomingEvents(profileData.upcomingEvents);
        setTodayEvents(profileData.todayEvents);
        setPastEvents(profileData.pastEvents);
        
        // Fetch follower count from database
        const count = await followOrganizerService.getOrganizerFollowerCount(id as string);
        setFollowerCount(count);
        
        // Check if current user is following (only if authenticated)
        if (user?.id) {
          const following = await followOrganizerService.isFollowingOrganizer(id as string, user.id);
          setIsFollowing(following);
        }
      } catch (e) {
        console.error('Error loading organizer profile', e);
        toast.showError('Load Failed', 'Failed to load organizer information');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchOrganizerData();
  }, [id, user?.id]);
  
  // Handle load more for upcoming events
  const handleLoadMoreUpcoming = () => {
    setUpcomingEventsToShow(prev => prev + eventsPerPage);
  };
  
  // Handle load more for today events
  const handleLoadMoreToday = () => {
    setTodayEventsToShow(prev => prev + eventsPerPage);
  };
  
  // Handle load more for past events
  const handleLoadMorePast = () => {
    setPastEventsToShow(prev => prev + eventsPerPage);
  };
  
  // Reset pagination when switching tabs
  useEffect(() => {
    setUpcomingEventsToShow(eventsPerPage);
    setTodayEventsToShow(eventsPerPage);
    setPastEventsToShow(eventsPerPage);
  }, [activeTab]);
  
  // Handle follow/unfollow
  const toggleFollow = async () => {
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
  };

  // Helper function to get the social media icon
  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return <Facebook className="w-4 h-4" />;
      case 'twitter': return <Twitter className="w-4 h-4" />;
      case 'x': return <Twitter className="w-4 h-4" />;
      case 'instagram': return <Instagram className="w-4 h-4" />;
      case 'linkedin': return <Linkedin className="w-4 h-4" />;
      case 'youtube': return <Youtube className="w-4 h-4" />;
      case 'github': return <Github className="w-4 h-4" />;
      case 'twitch': return <Twitch className="w-4 h-4" />;
      case 'tiktok': return <Music className="w-4 h-4" />;
      case 'website': return <Globe className="w-4 h-4" />;
      case 'threads': return <MessageSquare className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Helper function to get the social media URL prefix
  const getSocialUrlPrefix = (platform: string) => {
    switch (platform) {
      case 'facebook': return 'https://facebook.com/';
      case 'twitter': return 'https://twitter.com/';
      case 'x': return 'https://x.com/';
      case 'instagram': return 'https://instagram.com/';
      case 'linkedin': return 'https://linkedin.com/in/';
      case 'youtube': return 'https://youtube.com/@';
      case 'github': return 'https://github.com/';
      case 'twitch': return 'https://twitch.tv/';
      case 'tiktok': return 'https://tiktok.com/@';
      case 'threads': return 'https://threads.net/@';
      case 'website': return 'https://';
      default: return 'https://';
    }
  };

  // Share handler
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${organizer?.name} - Organizer Profile`,
        url: window.location.href,
      });
    } else {
      // Show our custom modal
      setShowShareModal(true);
    }
  };

  // Handle copying within the modal
  const handleCopyLink = () => {
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
      // For browsers without clipboard support
      const inputElement = document.getElementById('share-url-input');
      if (inputElement) {
        (inputElement as HTMLInputElement).select();
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-primary animate-pulse"></div>
          <div className="w-4 h-4 rounded-full bg-primary animate-pulse delay-100"></div>
          <div className="w-4 h-4 rounded-full bg-primary animate-pulse delay-200"></div>
        </div>
      </div>
    );
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
        <div className="relative bg-white rounded-xl shadow-sm -mt-20 mb-8 p-6 flex flex-col md:flex-row gap-6 items-center md:items-start">
          {/* Profile Image */}
          <div className="relative -mt-16 md:mt-0">
            <div className="w-28 h-28 relative rounded-full border-4 border-white overflow-hidden bg-white shadow-md">
              {organizer.image ? (
                <Image
                  src={organizer.image}
                  alt={organizer.name}
                  fill
                  sizes="112px" /* w-28 */
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
            
            {/* Premium Badge */}
            {organizer.premiumTier && (
              <div className="absolute -right-2 -bottom-2">
                <PremiumBadge tier={organizer.premiumTier} size="md" />
              </div>
            )}
          </div>
          
          {/* Organizer Details */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{organizer.name}</h1>
                <p className="text-neutral-600 mt-1">
                  {organizer.location && (
                    <span className="flex items-center gap-1 justify-center md:justify-start">
                      <MapPin className="w-3 h-3" />
                      {organizer.location}
                    </span>
                  )}
                </p>
              </div>
              
              <div className="flex flex-row items-center gap-3 w-full sm:w-auto">
                {/* Follow Button */}
                <button
                  onClick={toggleFollow}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-full font-medium flex items-center justify-center gap-2 cursor-pointer ${
                    isFollowing
                      ? "bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200"
                      : "bg-primary text-white hover:bg-primary-dark"
                  } transition-colors`}
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">{isFollowing ? "Following" : "Follow"}</span>
                </button>
                
                {/* Contact Button */}
                <Link
                  href={`mailto:${organizer.contactEmail}`}
                  className="flex-1 sm:flex-none px-6 py-2 rounded-full font-medium bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  <span className="hidden sm:inline">Contact</span>
                </Link>

                {/* Share Button */}
                <button
                  onClick={handleShare}
                  className="flex-1 sm:flex-none px-6 py-2 rounded-full font-medium bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  title="Share Profile"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Share</span>
                </button>
              </div>
            </div>
            
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
        
        {/* Featured Event Section - Shown if organizer has a featured event */}
        {organizer.featuredEvent && (
          <div className="mb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Featured Event</h2>
            </div>
            <div className="max-w-sm mx-auto md:mx-0">
              <FeaturedCard {...organizer.featuredEvent} />
            </div>
          </div>
        )}
        
        {/* Tabs Navigation */}
        <div className="border-b border-neutral-200 mb-8">
          <div className="flex overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-6 py-4 font-medium relative cursor-pointer whitespace-nowrap ${
          activeTab === 'upcoming' 
            ? 'text-primary' 
            : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Upcoming Events
              {activeTab === 'upcoming' && (
          <motion.div 
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
            layoutId="tabIndicator"
          />
              )}
            </button>
            <button
              onClick={() => setActiveTab('today')}
              className={`px-6 py-4 font-medium relative cursor-pointer whitespace-nowrap ${
          activeTab === 'today' 
            ? 'text-primary' 
            : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Happening Today
              {activeTab === 'today' && (
          <motion.div 
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
            layoutId="tabIndicator"
          />
              )}
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-6 py-4 font-medium relative cursor-pointer whitespace-nowrap ${
          activeTab === 'past' 
            ? 'text-primary' 
            : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Past Events
              {activeTab === 'past' && (
          <motion.div 
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
            layoutId="tabIndicator"
          />
              )}
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-6 py-4 font-medium relative cursor-pointer whitespace-nowrap ${
          activeTab === 'about' 
            ? 'text-primary' 
            : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              About
              {activeTab === 'about' && (
          <motion.div 
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
            layoutId="tabIndicator"
          />
              )}
            </button>
          </div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
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
    </div>
  );
}