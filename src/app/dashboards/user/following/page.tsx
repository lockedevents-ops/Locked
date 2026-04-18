"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, UserX } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { followOrganizerService } from '@/services/followOrganizerService';
import { useToast } from '@/hooks/useToast';
import { PageLoader } from '@/components/loaders/PageLoader';

interface FollowedOrganizer {
  id: string;
  name: string;
  profile_image: string | null;
  cover_image?: string | null;
  bio: string | null;
  total_events: number;
  status: string;
  followedAt: string;
}

export default function FollowingPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [following, setFollowing] = useState<FollowedOrganizer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFollowing = useCallback(async () => {
    if (!user?.id) {
      setFollowing([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const organizers = await followOrganizerService.getUserFollowedOrganizersDetailed(user.id);
      setFollowing(organizers);
    } catch (error) {
      console.error('Error fetching followed organizers:', error);
      toast.showError('Loading Failed', 'Failed to load followed organizers');
      setFollowing([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  const unfollowOrganizer = async (e: React.MouseEvent, organizerId: string, organizerName: string) => {
    e.preventDefault(); // Prevent navigation if button is inside a Link
    e.stopPropagation();
    
    if (!user?.id) return;

    try {
      // Optimistically update UI
      setFollowing(prev => prev.filter(f => f.id !== organizerId));

      // Call database
      const result = await followOrganizerService.trackFollow(organizerId, user.id, 'unfollow');

      if (result.success) {
        toast.showSuccess('Unfollowed', `You've unfollowed ${organizerName}`);
      } else {
        // Revert on error
        await fetchFollowing();
        toast.showError('Unfollow Failed', 'Failed to unfollow organizer');
      }
    } catch (error) {
      console.error('Error unfollowing organizer:', error);
      await fetchFollowing();
      toast.showError('Unfollow Failed', 'Failed to unfollow organizer');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Following</h1>
        <p className="text-neutral-600 mt-2">Event organizers you're following</p>
      </div>

      {/* Loading State */}
      {loading && (
        <PageLoader message="Loading followed organizers..." />
      )}

      {/* Organizers Grid */}
      {!loading && (
        <div className="grid auto-rows-fr gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {following.map(org => (
            <Link 
              key={org.id}
              href={`/profiles/${org.id}`}
              className="group block h-full"
            >
              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col relative">
                
                {/* Card Header: Cover Image or Fallback */}
                <div className="h-24 bg-neutral-100 relative">
                  {org.cover_image ? (
                    <Image
                      src={org.cover_image}
                      alt={`${org.name} cover`}
                      fill
                      className="object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-neutral-200 to-neutral-300" />
                  )}
                  
                  {/* Status Badge */}
                  {org.status === 'active' && (
                     <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 uppercase tracking-wide">
                       <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                       Active
                     </div>
                  )}
                </div>

                {/* Profile Avatar - Overlapping Header */}
                <div className="px-5 -mt-10 mb-3 flex justify-between items-end relative">
                  <div className="relative w-20 h-20 rounded-full border-4 border-white shadow-sm bg-white overflow-hidden flex-shrink-0">
                    {org.profile_image ? (
                      <Image
                        src={org.profile_image}
                        alt={org.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-neutral-100 flex items-center justify-center">
                        <span className="text-neutral-500 font-bold text-2xl">
                          {org.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Unfollow Button */}
                  <div className="mb-1 pointer-events-auto">
                    <button
                      onClick={(e) => unfollowOrganizer(e, org.id, org.name)}
                      className="text-xs font-medium text-neutral-500 hover:text-red-600 bg-neutral-50 hover:bg-red-50 border border-neutral-200 hover:border-red-100 px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Unfollow
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="px-5 pb-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg text-neutral-900 group-hover:text-primary transition-colors line-clamp-1 mb-1">
                    {org.name}
                  </h3>
                  
                  {/* Bio */}
                  {org.bio ? (
                    <p className="text-xs text-neutral-500 line-clamp-2 mb-4 flex-1">
                      {org.bio}
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-400 italic mb-4 flex-1">
                      No bio available
                    </p>
                  )}

                  {/* Footer Stats - Separator */}
                  <div className="border-t border-neutral-100 pt-3 flex items-center justify-between text-xs text-neutral-500 mt-auto">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{org.total_events} Events</span>
                    </div>
                    <div>
                      Joined {new Date(org.followedAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && following.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-neutral-200 mt-8">
          <div className="mb-4">
            <UserX className="w-12 h-12 text-neutral-300 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-neutral-900">
            {user ? 'Not following any organizers' : 'Sign in to view following'}
          </h3>
          <p className="mt-2 text-neutral-600">
            {user
              ? 'Start following event organizers to stay updated with their latest events.'
              : 'You need to be signed in to see who you follow.'}
          </p>
          <Link
            href="/pages/organizers"
            className="mt-6 inline-block bg-primary text-white px-6 py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Discover Organizers
          </Link>
        </div>
      )}
    </div>
  );
}
