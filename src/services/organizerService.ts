/**
 * Organizer Service (Aggregate Composition)
 * --------------------------------------------------------------
 * CURRENT ROLE:
 *  - Builds an OrganizerAggregate (profile + events + follower count) using repositories.
 *  - Performs a one-time legacy merge for old localStorage followed-organizers key.
 *  - Exposes follow/unfollow convenience wrappers updating preferencesRepo.
 *
 * MIGRATION PLAN:
 *  - Replace fetchOrganizerAggregate with API composition endpoint:
 *      GET /api/organizers/:id/aggregate
 *      { organizer, upcomingEvents, pastEvents, followerCount }
 *  - Remove legacy merge (server migration script handles once).
 *  - Follow operations → POST /api/organizers/:id/follow & DELETE /api/organizers/:id/follow
 *
 * POST-MIGRATION SIMPLIFICATIONS:
 *  - Follower count delivered directly; client stops counting duplicates.
 *  - Remove image path fallbacks (server sets canonical media URLs).
 *
 * KEEPING:
 *  - Type OrganizerAggregate (shared contract for UI components).
 */
import { eventRepo, organizerProfileRepo, preferencesRepo, followService } from '@/storage/repositories';

// Phase 2 cleanup: remove direct localStorage interaction for following organizers.
// We retain a silent legacy sync pass to avoid orphaned old data (one-time on first access).
let legacyMerged = false;
function mergeLegacyOnce() {
  if (legacyMerged || typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('followed-organizers');
    if (!raw) { legacyMerged = true; return; }
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length) {
      preferencesRepo.update(p => {
        const existing = new Set(p.followedOrganizers || []);
        arr.forEach((id: string) => existing.add(id));
        return { ...p, followedOrganizers: Array.from(existing) };
      });
    }
  } catch {}
  legacyMerged = true;
}

export interface OrganizerAggregate {
  organizer: any | null;
  upcomingEvents: any[];
  pastEvents: any[];
  followerCount: number;
}

export function fetchOrganizerAggregate(id: string): OrganizerAggregate {
  // Profiles (object map)
  const profile = organizerProfileRepo.get(id);
  // Events (array) filter by organizer.id === id
  const events = eventRepo.list().filter(e => e?.organizer?.id === id);
  const now = new Date();
  const upcomingEvents = events.filter(ev => {
    const d = new Date(ev.startDate || ev.date);
    return d >= now && ev.status === 'published';
  });
  const pastEvents = events.filter(ev => {
    const d = new Date(ev.startDate || ev.date);
    return d < now && ev.status === 'published';
  });
  // Build organizer base from first event if no profile
  const base = events.length ? events[0].organizer : { id };
  mergeLegacyOnce();
  const followed = preferencesRepo.get().followedOrganizers || [];
  const followerCount = followed.filter(fid => fid === id).length; // duplicates kept for legacy parity

  const organizer = (profile || base) ? {
    ...base,
    // profile precedence
    name: profile?.organizationName || base.name || 'Unnamed Organizer',
    bio: profile?.description || base.bio || "A verified organizer on the Locked platform.",
    contactEmail: profile?.email || base.contactEmail || 'contact@example.com',
    phoneNumber: profile?.phoneNumber || base.phoneNumber,
    address: profile?.address || base.address,
    city: profile?.city || base.city,
    country: profile?.country || base.country,
    location: profile ? `${profile.city || ''}${profile.city && profile.country ? ', ' : ''}${profile.country || ''}` : (base.location || ''),
    website: profile?.website || base.website || '',
    socials: profile?.socials || base.socials || [],
    followers: followerCount,
    image: profile?.profileImage || base.image,
    coverImage: profile?.bannerImage || base.coverImage,
    featuredEvent: events.find(ev => ev.isFeatured === true)
  } : null;

  return { organizer, upcomingEvents, pastEvents, followerCount };
}

export function isFollowingOrganizer(organizerId: string): boolean {
  mergeLegacyOnce();
  return followService.isFollowing(organizerId);
}

export function followOrganizer(organizerId: string): number {
  mergeLegacyOnce();
  preferencesRepo.update(p => {
    const list = new Set(p.followedOrganizers || []);
    list.add(organizerId);
    return { ...p, followedOrganizers: Array.from(list) };
  });
  const cnt = (preferencesRepo.get().followedOrganizers || []).filter(id => id === organizerId).length;
  return cnt;
}

export function unfollowOrganizer(organizerId: string): number {
  mergeLegacyOnce();
  preferencesRepo.update(p => {
    const list = new Set(p.followedOrganizers || []);
    list.delete(organizerId);
    return { ...p, followedOrganizers: Array.from(list) };
  });
  const cnt = (preferencesRepo.get().followedOrganizers || []).filter(id => id === organizerId).length;
  return cnt;
}
