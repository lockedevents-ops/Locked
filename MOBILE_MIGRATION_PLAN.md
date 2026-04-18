# Mobile App Migration Plan & API Reference

## 1. Executive Summary
**Goal**: Launch a dedicated attendee-mobile app (iOS & Android) using Flutter.
**Scope**: Attendee-facing features only (Discovery, Booking, Engagement, Profile). Organizer features remain web-only.
**Architecture**: 
- **Frontend**: Flutter (Cross-platform)
- **Backend**: Existing Supabase (Database, Auth, Storage, Edge Functions)
- **Payments**: Hubtel (via WebView/Redirects)

## 2. Core Navigation Structure (Mobile)
Suggested Bottom Navigation Bar:
1.  **Discover**: Home feed of events (Featured, Trending, Nearby).
2.  **Search**: Search events, organizers, and map view.
3.  **Tickets**: User's active and past tickets (QR Codes).
4.  **Wallet/Keys**: Key balance, rewards, and transaction history.
5.  **Profile**: User settings, edit profile, support.

## 3. Feature Mapping & Implementation Guide

### A. Authentication
- **Source**: `src/services/authService.ts`
- **Logic**: 
  - Use `supabase_flutter` package.
  - Social Auth (Google) and Email/Password.
  - **Critical**: Mobile app must handle deep linking for email confirmation and password resets.
- **Data Models**: `UserProfile` (table: `profiles`, `user_profiles`).

### B. Event Discovery & Browsing
- **Source**: `src/services/eventDatabaseService.ts`
- **Supabase Query**: 
  - `events` table. 
  - Filters: `status='published'`, `start_date >= now()`.
  - Location: Use `location_latitude` / `location_longitude` for map plotting.
- **UI Components to Port**:
  - `EventCard`: Image, Title, Date, Venue, Price ("Free" or starts from X).
  - `FeatureBadge`: "Live", "Selling Fast".

### C. Event Details
- **Source**: `src/app/event/[slug]/page.tsx`, `EventDetails.tsx`
- **Key Data**:
  - Hero Image / Gallery (`gallery_images`).
  - Organizer Details (`organizers` table relation).
  - Ticket Types (`tickets` JSONB column in `events`).
- **Actions**:
  - "Get Tickets" -> Opens Booking Sheet.
  - "Vote" -> Opens Voting Sheet.
  - "Key/Lock" -> Bookmark event.

### D. Booking & Ticketing
- **Source**: `src/components/events/UnifiedCheckoutModal.tsx`
- **Flow**:
  1.  **Selection**: User selects ticket types and quantities.
  2.  **Merch Upsell**: If `has_merch` is true, show `merch_products` selection.
  3.  **Registration Check**: Call `eventRegistrationService.isUserRegistered`.
  4.  **Payment Calculation**:
      - Subtotal + Processing Fee (1.95%).
      - Logic: `src/components/events/UnifiedCheckoutModal.tsx` (lines 120-136).
  5.  **Discount**: Apply Keys balance if user chooses.
  6.  **Payment Execution**:
      - **Free**: Direct RPC/Insert to `event_registrations`.
      - **Paid**: Call API `/api/payments/initiate` (Mobile needs to handle this via HTTP Post).
      - **Redirect**: API returns `checkoutUrl`. Open in **In-App WebView** or default browser. Handle `returnUrl` via deep link (e.g., `locked://payment-success`).

### E. In-App Voting & Engagement
- **Source**: `src/components/events/Voting.tsx`, `VotingModal.tsx`
- **Logic**:
  - Check `keyBalance` (`user_keys_balance` table).
  - **Voting with Keys**: Call Supabase RPC `spend_user_keys`.
  - **Voting with Cash**: If insufficient keys, calculate remaining cost and initiate Hubtel payment (same as ticketing flow).
- **VFX**: The "Rainbow Border" effect on the modal is a signature UI element; replicate using Flutter `ShaderMask` or `CustomPainter`.

### F. Merchandise (Platform Store)
- **Source**: `src/app/pages/platform_merch/page.tsx`
- **Status**: Currently "Coming Soon". 
- **Mobile Strategy**: Implement a placeholder "Waitlist" screen matching the web UI, or hide tab until launch.

### G. User Profile & Settings
- **Source**: `src/services/userSettingsService.ts`
- **Features**:
  - Edit Profile (Avatar, Bio).
  - Security (Change Password, 2FA toggle - might need web redirect for complex flows).
  - Notification Preferences.

## 4. API & Data Reference

### Critical Supabase Tables
| Table Name | Access Mode | Purpose |
| :--- | :--- | :--- |
| `events` | Read-Only | Event details, tickets (JSON), merch (JSON). |
| `profiles` | Read/Write | Core user data (RLS protected). |
| `user_profiles` | Read/Write | Extended profile data. |
| `user_keys_balance` | Read-Only | Current key balance (view/table). |
| `event_registrations` | Write | Ticket bookings. |
| `cart_items` | Read/Write | Temporary cart storage. |

### Critical RPCs (Remote Procedure Calls)
- `spend_user_keys(p_user_id, p_amount, p_desc, p_metadata)`: Handles secure key deduction.
- `update_all_engagement_scores`: (Backend job, mobile just reads scores).

### API Endpoints (Custom Next.js API)
*Mobile app will call these via HTTP*
- `POST /api/payments/initiate`: Start Hubtel transaction.
- `POST /api/role-requests/submit`: If implementing role request on mobile (unlikely for attendee app).

## 5. Development Roadmap (Phased)

### Phase 1: Foundation
- [ ] Setup Flutter Project with Supabase Auth.
- [ ] Implement Bottom Navigation & basic layout.
- [ ] Implement Splash Screen (Logo + Auth Check).
- [ ] Implement Home Feed (Reading `events`).

### Phase 2: Engagement
- [ ] Implement "Keys" balance view.
- [ ] Implement Voting UI & RPC integration.
- [ ] Implement "Lock/Bookmark" feature.

### Phase 3: Commerce
- [ ] Implement Ticket Selection UI.
- [ ] Integrate Hubtel WebView flow.
- [ ] Deep link handling for payment callbacks.

### Phase 4: Polish
- [ ] Profile Management.
- [ ] Push Notifications (integrate with Supabase Realtime or FCM).
