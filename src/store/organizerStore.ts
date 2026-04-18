/**
 * organizerStore – Consolidated Organizer Profile & Premium Management
 * --------------------------------------------------------------
 * CURRENT ROLE:
 *  - Stores organizer profile & qualification metrics for premium eligibility UI.
 *  - Consolidated from organizerStore and premiumOrganizerStore to reduce duplication.
 *  - Not multi-user aware; assumes single active organizer context.
 *
 * MIGRATION PLAN:
 *  - Source profile from GET /api/organizers/:id ; metrics from analytics endpoint.
 *  - Update functions become PATCH /api/organizers/:id (profile) and server-side metric jobs.
 *  - Replace manual qualificationMetrics updates with server-provided computed values.
 *
 * DEPRECATE:
 *  - Local metric mutation, placeholder seed values.
 *
 * KEEPING:
 *  - premiumStatus concept but driven by server flags (tier, expiry).
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Consolidated metrics interface
interface QualificationMetrics {
  eventLocks: number;
  attendanceRate: number;
  eventRatings: number;
  reviewCount: number;
  recentEvents: number;
  mediaEngagement: number;
  // Additional premium metrics
  eventsLockedCount: number;
  averageTicketFulfillment: number;
  averageRating: number;
  eventsHostedLast90Days: number;
  mediaEngagementScore: number;
}

interface OrganizerState {
  name: string;
  bio: string;
  location: string;
  website: string;
  socialLinks: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
    linkedin?: string;
  };
  // Premium status fields
  premiumStatus: 'platinum' | 'elite' | null;
  isPremium: boolean;
  premiumTier: 'none' | 'platinum' | 'elite';
  expiryDate: string | null;
  
  qualificationMetrics: QualificationMetrics | null;
  
  // Actions
  setPremiumStatus: (status: 'platinum' | 'elite' | null) => void;
  updateProfile: (profile: Partial<OrganizerState>) => void;
  updateQualificationMetrics: (metrics: Partial<QualificationMetrics>) => void;
  // Premium actions
  checkPremiumQualification: () => void;
  setPremiumStatusDetailed: (status: boolean, tier: 'platinum' | 'elite' | 'none') => void;
}

export const useOrganizerStore = create<OrganizerState>()(
  persist(
    (set, get) => ({
      name: 'Ghana Events Co.',
      bio: 'We organize premier cultural and entertainment events across Ghana, focusing on delivering unforgettable experiences.',
      location: 'Accra, Ghana',
      website: 'https://example.com',
      socialLinks: {
        instagram: 'ghana_events',
        facebook: 'GhanaEvents',
        twitter: 'GhanaEvents',
      },
      // Premium status fields (consolidated)
      premiumStatus: null, // 'platinum', 'elite' or null (legacy)
      isPremium: false,
      premiumTier: 'none',
      expiryDate: null,
      
      qualificationMetrics: {
        eventLocks: 76,
        attendanceRate: 72,
        eventRatings: 4.2,
        reviewCount: 38,
        recentEvents: 2,
        mediaEngagement: 45,
        // Premium metrics (consolidated)
        eventsLockedCount: 76,
        averageTicketFulfillment: 72,
        averageRating: 4.2,
        eventsHostedLast90Days: 2,
        mediaEngagementScore: 45
      },
      
      setPremiumStatus: (status) => set({ premiumStatus: status }),
      updateProfile: (profile) => set((state) => ({ ...state, ...profile })),
      updateQualificationMetrics: (metrics) => {
        set((state) => ({
          qualificationMetrics: state.qualificationMetrics
            ? { ...state.qualificationMetrics, ...metrics }
            : {
                eventLocks: 0,
                attendanceRate: 0,
                eventRatings: 0,
                reviewCount: 0,
                recentEvents: 0,
                mediaEngagement: 0,
                eventsLockedCount: 0,
                averageTicketFulfillment: 0,
                averageRating: 0,
                eventsHostedLast90Days: 0,
                mediaEngagementScore: 0,
                ...metrics
              }
        }));
        // Auto-check qualification after metrics update
        get().checkPremiumQualification();
      },
      
      // Premium qualification logic (from premiumOrganizerStore)
      checkPremiumQualification: () => {
        const { qualificationMetrics } = get();
        if (!qualificationMetrics) return;
        
        // Platinum tier qualification logic
        const qualifiesForPlatinum = 
          qualificationMetrics.eventsLockedCount >= 100 &&
          qualificationMetrics.averageTicketFulfillment >= 80 &&
          qualificationMetrics.averageRating >= 4.5 &&
          qualificationMetrics.reviewCount >= 50;
          
        // Elite tier qualification logic (stricter criteria)
        const qualifiesForElite = 
          qualificationMetrics.eventsLockedCount >= 250 &&
          qualificationMetrics.averageTicketFulfillment >= 90 &&
          qualificationMetrics.averageRating >= 4.8 &&
          qualificationMetrics.reviewCount >= 100 &&
          qualificationMetrics.eventsHostedLast90Days >= 5;
          
        if (qualifiesForElite) {
          set({ 
            isPremium: true, 
            premiumTier: 'elite',
            premiumStatus: 'elite', // sync legacy field
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
          });
        } else if (qualifiesForPlatinum) {
          set({ 
            isPremium: true, 
            premiumTier: 'platinum',
            premiumStatus: 'platinum', // sync legacy field
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
          });
        } else {
          set({ 
            isPremium: false, 
            premiumTier: 'none', 
            premiumStatus: null, // sync legacy field
            expiryDate: null 
          });
        }
      },
      
      setPremiumStatusDetailed: (status, tier) => {
        set({ 
          isPremium: status, 
          premiumTier: tier,
          premiumStatus: tier === 'none' ? null : tier, // sync legacy field
          expiryDate: status ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null
        });
      }
    }),
    {
      name: 'locked-organizer-storage'
    }
  )
);

// Export consolidated types for backward compatibility
export type { QualificationMetrics, OrganizerState };

// Legacy export alias for components that might still import premiumOrganizerStore
export const usePremiumOrganizerStore = useOrganizerStore;
