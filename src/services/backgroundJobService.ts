/**
 * Background Job Service
 * --------------------------------------------------------------
 * Handles scheduled tasks for engagement calculations and 
 * automatic featured event updates.
 */

import { engagementService } from './engagementService';

class BackgroundJobService {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes

  /**
   * Start the background job scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log('Background job service is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting background job service...');

    // Run immediately on start
    this.runEngagementUpdate();

    // Schedule regular updates
    this.intervalId = setInterval(() => {
      this.runEngagementUpdate();
    }, this.UPDATE_INTERVAL);

    console.log(`Background job service started. Updates every ${this.UPDATE_INTERVAL / 1000 / 60} minutes.`);
  }

  /**
   * Stop the background job scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Background job service is not running');
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('Background job service stopped');
  }

  /**
   * Get the current status of the background job service
   */
  getStatus(): { isRunning: boolean; updateInterval: number; lastUpdate?: Date } {
    return {
      isRunning: this.isRunning,
      updateInterval: this.UPDATE_INTERVAL,
      lastUpdate: this.lastUpdateTime
    };
  }

  private lastUpdateTime?: Date;

  /**
   * Run the engagement calculation and auto-featuring update
   */
  private async runEngagementUpdate(): Promise<void> {
    const startTime = Date.now();
    console.log('Running engagement update job...');

    try {
      // 1. Clean up expired manual featured events
      const expiredCount = await engagementService.cleanupExpiredFeaturedEvents();
      if (expiredCount > 0) {
        console.log(`Cleaned up ${expiredCount} expired featured events`);
      }

      // 2. Update all engagement scores and auto-feature top events
      const updatedCount = await engagementService.updateAllEngagementScores();
      console.log(`Updated engagement scores for ${updatedCount} events`);

      this.lastUpdateTime = new Date();
      const duration = Date.now() - startTime;
      console.log(`Engagement update job completed in ${duration}ms`);

    } catch (error) {
      console.error('Error in engagement update job:', error);
    }
  }

  /**
   * Manually trigger an engagement update (useful for testing or admin actions)
   */
  async triggerEngagementUpdate(): Promise<{ success: boolean; message: string; updatedCount?: number }> {
    if (!this.isRunning) {
      return {
        success: false,
        message: 'Background job service is not running'
      };
    }

    try {
      const startTime = Date.now();
      console.log('Manually triggering engagement update...');

      // Clean up expired events
      const expiredCount = await engagementService.cleanupExpiredFeaturedEvents();
      
      // Update engagement scores
      const updatedCount = await engagementService.updateAllEngagementScores();

      this.lastUpdateTime = new Date();
      const duration = Date.now() - startTime;

      const message = `Updated ${updatedCount} events and cleaned ${expiredCount} expired promotions in ${duration}ms`;
      console.log(message);

      return {
        success: true,
        message,
        updatedCount
      };

    } catch (error) {
      const errorMessage = `Failed to update engagement scores: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage, error);

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Get featured events statistics
   */
  async getFeaturedEventsStats(): Promise<{
    total: number;
    autoFeatured: number;
    manualFeatured: number;
    topPerformers: Array<{ id: string; title: string; score: number; type: string }>;
  }> {
    try {
      const [featuredEvents, topPerformers] = await Promise.all([
        engagementService.getFeaturedEvents(),
        engagementService.getTopPerformingEvents(10)
      ]);

      const autoFeatured = featuredEvents.filter(e => e.featuredType === 'auto').length;
      const manualFeatured = featuredEvents.filter(e => e.featuredType === 'manual').length;

      return {
        total: featuredEvents.length,
        autoFeatured,
        manualFeatured,
        topPerformers: topPerformers.slice(0, 5).map(event => ({
          id: event.id,
          title: event.title,
          score: event.featuredScore,
          type: event.featuredType
        }))
      };

    } catch (error) {
      console.error('Error getting featured events stats:', error);
      return {
        total: 0,
        autoFeatured: 0,
        manualFeatured: 0,
        topPerformers: []
      };
    }
  }

  /**
   * Check if a specific event should be auto-featured based on current rankings
   */
  async checkEventAutoFeatureEligibility(eventId: string): Promise<{
    eligible: boolean;
    currentRank?: number;
    score?: number;
    message: string;
  }> {
    try {
      const topPerformers = await engagementService.getTopPerformingEvents(10);
      const eventIndex = topPerformers.findIndex(event => event.id === eventId);
      
      if (eventIndex === -1) {
        return {
          eligible: false,
          message: 'Event not found in top performers'
        };
      }

      const event = topPerformers[eventIndex];
      const rank = eventIndex + 1;
      const isEligible = rank <= 4; // Top 4 are auto-featured

      return {
        eligible: isEligible,
        currentRank: rank,
        score: event.featuredScore,
        message: isEligible 
          ? `Event ranks #${rank} and is eligible for auto-featuring` 
          : `Event ranks #${rank}, needs to be in top 4 for auto-featuring`
      };

    } catch (error) {
      console.error('Error checking event eligibility:', error);
      return {
        eligible: false,
        message: `Error checking eligibility: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Export singleton instance
export const backgroundJobService = new BackgroundJobService();

// Auto-start in browser environment (not in server-side rendering)
if (typeof window !== 'undefined') {
  // Start the service when the module is imported
  setTimeout(() => {
    backgroundJobService.start();
  }, 5000); // Wait 5 seconds after page load
  
  // Stop the service when the page is unloaded
  window.addEventListener('beforeunload', () => {
    backgroundJobService.stop();
  });
}

export default backgroundJobService;
