/**
 * Domain Type: User (End-User / Public Profile)
 * --------------------------------------------------------------
 * CURRENT ROLE:
 *  - Represents the public-facing application user (non-admin) used in event
 *    listings, organizers' follower lists, and profile pages.
 *  - Narrower than admin/auth internal records (those live in storage layer).
 *
 * MIGRATION PLAN:
 *  - Backend contract: align with GET /api/users/:id & list endpoints.
 *  - Extend with status flags (suspended, verified) returned from server.
 *  - Remove any optional fields no longer present in API responses.
 *
 * FUTURE:
 *  - Consider separating PublicUser vs PrivateUser (email/phone only in private scope).
 *  - Add audit metadata (updatedAt) when server provides it.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  image?: string;
  bio?: string;
  location?: string;
  website?: string;
  role: 'user' | 'organizer';
  createdAt: string;
}
