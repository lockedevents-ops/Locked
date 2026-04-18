/**
 * CENTRALIZED SESSION & AUTH TIMING CONFIGURATION
 * ===================================================================
 * Single source of truth for all session-related timing constants.
 * All timing values are in milliseconds (ms).
 *
 * IMPORTANT: Update these values in ONE PLACE ONLY.
 * All authentication services reference this config.
 *
 * USED BY:
 * - AuthContext.tsx: Role cache TTL, background refresh
 * - middleware.ts: Token expiry check window
 * - sessionManager.ts: Session refresh interval
 * - useSessionManagement.ts: Background monitoring intervals
 * - useAdminAuth.ts: Session timeout for admin pages
 */

export const SESSION_CONFIG = {
  // ====================================================================
  // INACTIVITY & IDLE LOGOUT
  // ====================================================================
  
  /** 
   * How long a user can be idle before automatic logout
   * Default: 300,000 ms = 5 minutes
   * Used by: Admin idle logout component, session monitoring hooks
   * Rationale: 5 minutes is standard for sensitive admin operations
   */
  IDLE_LOGOUT_MS: 300_000, // 5 minutes

  // ====================================================================
  // ROLE & PERMISSION CACHING
  // ====================================================================

  /**
   * How long to cache user roles before refetching from database
   * Default: 10,000 ms = 10 seconds
   * Used by: AuthContext.refreshRoles()
   * Rationale: 10s balances freshness with DB load. Adjust 5-15s as needed
   *            based on how often role changes occur
   */
  ROLE_CACHE_TTL_MS: 10_000,

  // ====================================================================
  // SESSION TOKEN MANAGEMENT
  // ====================================================================

  /**
   * How many seconds before token expiry to trigger refresh in middleware
   * Default: 300 seconds = 5 minutes
   * Used by: middleware.ts (checks expiresIn < 300)
   * Rationale: 5 minutes gives buffer time to refresh before expiry
   *            Supabase tokens typically last ~1 hour
   */
  TOKEN_EXPIRY_WARNING_SECONDS: 300,

  // ====================================================================
  // BACKGROUND SESSION MONITORING
  // ====================================================================

  /**
   * Interval for background session refresh in AuthContext
   * Default: 300,000 ms = 5 minutes
   * Used by: AuthContext (automatic background refresh)
   * Rationale: Keeps token fresh without aggressive polling
   *            Runs in background during active usage
   */
  SESSION_REFRESH_INTERVAL_MS: 5 * 60 * 1000,

  /**
   * Default interval for session management hooks monitoring
   * Default: 600,000 ms = 10 minutes
   * Used by: useSessionManagement() hook with long forms
   * Rationale: Less frequent than background (allows manual interval override)
   *            Suitable for pages with extended user input (forms, editors)
   */
  SESSION_MONITOR_INTERVAL_MS: 10 * 60 * 1000,

  /**
   * Server-side session manager default refresh interval
   * Default: 300,000 ms = 5 minutes
   * Used by: sessionManager.ts createSessionMonitor()
   * Rationale: Matches client-side refresh to stay in sync
   */
  SERVER_REFRESH_INTERVAL_MS: 5 * 60 * 1000,

  // ====================================================================
  // AUTH INITIALIZATION TIMEOUT
  // ====================================================================

  /**
   * Maximum time to wait for initial auth check before showing error
   * Default: 10,000 ms = 10 seconds
   * Used by: AuthContext initialization
   * Rationale: Prevents infinite loading if Supabase is unavailable
   *            User gets error UI rather than blank screen
   */
  AUTH_INIT_TIMEOUT_MS: 10_000,

  // ====================================================================
  // CONVENIENCE EXPORTS FOR READABILITY
  // ====================================================================

  // Convert common intervals to minutes for readability
  get IDLE_LOGOUT_MINUTES() {
    return Math.round(this.IDLE_LOGOUT_MS / 60_000);
  },
  get SESSION_REFRESH_MINUTES() {
    return Math.round(this.SESSION_REFRESH_INTERVAL_MS / 60_000);
  },
  get SESSION_MONITOR_MINUTES() {
    return Math.round(this.SESSION_MONITOR_INTERVAL_MS / 60_000);
  },
} as const;

export type SessionConfig = typeof SESSION_CONFIG;

