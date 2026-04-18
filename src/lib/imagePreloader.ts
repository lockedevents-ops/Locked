/**
 * Image Preloading Utility
 * --------------------------------------------------------------
 * Preloads critical images for instant display.
 * Prioritizes above-the-fold images to improve LCP.
 * 
 * ✅ PHASE 3 OPTIMIZATION: Improves perceived performance and LCP scores
 */

type PreloadOptions = {
  priority?: 'high' | 'low';
  fetchPriority?: 'high' | 'low' | 'auto';
  as?: 'image' | 'fetch';
};

class ImagePreloader {
  private preloadedUrls: Set<string> = new Set();
  private preloadQueue: string[] = [];
  private isProcessing = false;

  /**
   * Preload a single image
   * @param url - Image URL to preload
   * @param options - Preload options
   */
  preloadImage(url: string, options: PreloadOptions = {}): Promise<void> {
    // Skip if already preloaded
    if (this.preloadedUrls.has(url)) {
      console.log(`[ImagePreloader] Already preloaded: ${url}`);
      return Promise.resolve();
    }

    const { priority = 'high', fetchPriority = 'high', as = 'image' } = options;

    return new Promise((resolve, reject) => {
      // ✅ Method 1: Link preload (for modern browsers)
      if (typeof document !== 'undefined') {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = as;
        link.href = url;
        if (fetchPriority) {
          link.setAttribute('fetchpriority', fetchPriority);
        }

        link.onload = () => {
          this.preloadedUrls.add(url);
          console.log(`[ImagePreloader] Preloaded via link: ${url}`);
          resolve();
        };

        link.onerror = () => {
          console.warn(`[ImagePreloader] Failed to preload via link: ${url}`);
          // Fallback to Image object
          this.preloadViaImage(url).then(resolve).catch(reject);
        };

        document.head.appendChild(link);
      } else {
        reject(new Error('Document not available'));
      }
    });
  }

  /**
   * Fallback: Preload via Image object
   */
  private preloadViaImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.preloadedUrls.add(url);
        console.log(`[ImagePreloader] Preloaded via Image: ${url}`);
        resolve();
      };

      img.onerror = () => {
        console.error(`[ImagePreloader] Failed to preload: ${url}`);
        reject(new Error(`Failed to preload: ${url}`));
      };

      img.src = url;
    });
  }

  /**
   * Preload multiple images in sequence
   * @param urls - Array of image URLs
   * @param options - Preload options
   */
  async preloadImages(
    urls: string[],
    options: PreloadOptions = {}
  ): Promise<void> {
    const uniqueUrls = urls.filter(url => !this.preloadedUrls.has(url));
    
    if (uniqueUrls.length === 0) {
      console.log('[ImagePreloader] All images already preloaded');
      return;
    }

    console.log(`[ImagePreloader] Preloading ${uniqueUrls.length} images...`);

    // Preload in parallel (up to 3 at a time to avoid overwhelming)
    const batchSize = 3;
    for (let i = 0; i < uniqueUrls.length; i += batchSize) {
      const batch = uniqueUrls.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(url => this.preloadImage(url, options))
      );
    }

    console.log('[ImagePreloader] Batch preload complete');
  }

  /**
   * Preload images on idle
   * @param urls - Array of image URLs
   * @param options - Preload options
   */
  preloadOnIdle(urls: string[], options: PreloadOptions = {}): void {
    const uniqueUrls = urls.filter(url => !this.preloadedUrls.has(url));
    
    if (uniqueUrls.length === 0) return;

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(
        () => {
          this.preloadImages(uniqueUrls, { ...options, priority: 'low' });
        },
        { timeout: 2000 }
      );
    } else {
      // Fallback: setTimeout
      setTimeout(() => {
        this.preloadImages(uniqueUrls, { ...options, priority: 'low' });
      }, 1000);
    }
  }

  /**
   * Check if image is preloaded
   */
  isPreloaded(url: string): boolean {
    return this.preloadedUrls.has(url);
  }

  /**
   * Get preload stats
   */
  getStats() {
    return {
      preloadedCount: this.preloadedUrls.size,
      preloadedUrls: Array.from(this.preloadedUrls),
    };
  }

  /**
   * Clear preload cache
   */
  clear(): void {
    this.preloadedUrls.clear();
    this.preloadQueue = [];
    console.log('[ImagePreloader] Cleared all preloaded images');
  }
}

// ✅ Export singleton instance
export const imagePreloader = new ImagePreloader();

// ✅ Helper functions for common use cases

/**
 * Preload hero images (above-the-fold)
 */
export function preloadHeroImages(imageUrls: string[]): void {
  if (imageUrls.length === 0) return;
  
  console.log('[ImagePreloader] Preloading hero images...');
  imagePreloader.preloadImages(imageUrls, {
    priority: 'high',
    fetchPriority: 'high',
  });
}

/**
 * Preload event card images (below-the-fold, on idle)
 */
export function preloadEventImages(imageUrls: string[]): void {
  if (imageUrls.length === 0) return;
  
  console.log('[ImagePreloader] Queuing event images for idle preload...');
  imagePreloader.preloadOnIdle(imageUrls, {
    priority: 'low',
    fetchPriority: 'auto',
  });
}

/**
 * Preload images for a specific section
 */
export function preloadSectionImages(
  imageUrls: string[],
  immediate: boolean = false
): void {
  if (imageUrls.length === 0) return;

  if (immediate) {
    imagePreloader.preloadImages(imageUrls, {
      priority: 'high',
      fetchPriority: 'high',
    });
  } else {
    imagePreloader.preloadOnIdle(imageUrls, {
      priority: 'low',
      fetchPriority: 'auto',
    });
  }
}

// ✅ Export for debugging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__imagePreloader = imagePreloader;
}
