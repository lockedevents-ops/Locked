/**
 * Domain Type: Organizer (Public Profile Summary)
 * --------------------------------------------------------------
 * CURRENT ROLE:
 *  - Represents an event organizer's public profile metadata surfaced on event pages
 *    and search results.
 *  - Distinct from any internal admin organizer management record.
 *
 * MIGRATION PLAN:
 *  - Backend to supply this via /api/organizers endpoints.
 *  - badge field to map to server-driven reputation/tier logic.
 *  - totalAttendees likely derived (aggregate) – could be omitted from write payloads.
 *
 * FUTURE:
 *  - Add metrics (followerCount, upcomingEventsCount) as read-only fields.
 *  - Potential split into OrganizerPublic vs OrganizerPrivate for dashboards.
 */
export interface Organizer {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  website?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
  };
  badge?: 'gold' | 'platinum' | 'elite' | 'diamond';
  totalAttendees?: number; // aggregated metric
  createdAt: string;
}
