# Diagnosis: Authentication Stalls & Zombie Sessions

## Root Cause Analysis

### 1. Zombie Sessions (Automatic Re-login)
**The Problem:** Users log out, but after refreshing the page, they are logged back in automatically.
**The Cause:**
- Your application uses `supabase-ssr` with `server.ts` to manage sessions.
- `server.ts` uses `cookies().set(...)`, which creates **HttpOnly** cookies by default in Next.js App Router.
- The `signOut` function in your `AuthContext.tsx` calls `supabase.auth.signOut()` directly on the client.
- The client-side Supabase client (`client.ts`) attempts to clear cookies using `document.cookie`.
- **CRITICAL FAILURE:** `document.cookie` cannot verify, access, or delete **HttpOnly** cookies.
- As a result, the session cookie remains in the browser even after the client thinks it has logged out. When the user refreshes, the server reads the persisting cookie and renders the page as "Logged In".

### 2. Intermittent Stalling (Logout & Loading)
**The Problem:** Logout takes several seconds or hangs. Pages display infinite loading spinners.
**The Cause:**
- `src/lib/supabase/client/client.ts` wraps the global `fetch` with a custom implementation that enforces a **15-second timeout** and performs **2 retries** with exponential backoff.
- `AuthContext.tsx` performs `supabase.auth.getUser()` with a custom **30-second timeout** during initialization.
- When `signOut()` is called, it triggers a network request to Supabase. If this request faces any latency (or if the browser connection pool is saturated, e.g., by other queries or real-time subscriptions), the client waits for the full timeout duration (15s+) before failing.
- Because there is no Server-Side Logout route, the client acts as the single point of failure for clearing the session.

### 3. Middleware vs. Proxy vs. Server Components
- You mentioned using "proxy and not middleware".
- **Findings:** There is no `middleware.ts` in your project, which is correct for your "no middleware" approach. However, the `server.ts` client is designed to work *best* with middleware for session refreshing.
- Without middleware, session tokens (JWTs) are not automatically refreshed on the server side when they near expiry. This can lead to "intermittent" issues where a user is technically logged in (cookie exists), but the access token inside the cookie is expired, causing data fetches to fail (401 Unauthorized) until the client-side code happens to refresh it.

---

## The Solution Plan

We need to move the Logout logic to the **Server** to guarantee cookie removal and unblock the Client.

### Step 1: Create a Server-Side Logout Route
**File:** `src/app/api/auth/signout/route.ts`
- This route will use `createClient()` from `server.ts`.
- It will call `supabase.auth.signOut()`.
- **Crucially**, running in a Route Handler allows `supabase-ssr` to successfully execute `cookies().delete()`, removing the HttpOnly cookies.

### Step 2: Update AuthContext to use the Server Route
**File:** `src/contexts/AuthContext.tsx`
- logic will be changed to `fetch('/api/auth/signout', { method: 'POST' })`.
- This ensures that even if Supabase is slow, the *local* app session (cookies) is destroyed immediately.
- We will set a short timeout (e.g., 2 seconds) for this request. If it hangs, we force a local state cleanup immediately, ensuring the UI never stalls.

### Step 3: Optimization (Optional but Recommended)
- Review `useSupabaseQuery` usage to ensure it gracefully handles the "Expired Token" state by triggering a refresh if the server returns 401.

## Required Action
Please approve this plan. Upon approval, I will:
1. Create the `src/app/api/auth/signout/route.ts` file.
2. Update `src/contexts/AuthContext.tsx` to implement the robust logout flow.
