/**
 * ✅ PHASE 3 OPTIMIZATION: Image Blur Placeholder Generator
 * 
 * Generates minimal blur data URLs for images to improve perceived performance.
 * Uses a simple color sampling approach to create a low-quality image preview.
 * 
 * Benefits:
 * - Faster perceived page load time
 * - Better visual experience while images load
 * - No additional network requests
 * - SEO friendly (reduces CLS/LCP)
 */

/**
 * Generate a blur placeholder data URL (single averaged color)
 * This is a lightweight approach that works well for Next.js Image component
 * 
 * @param color - RGB color as string (e.g., "219, 112, 147" for pale violet red)
 * @returns Data URL for the blur placeholder
 */
export function generateColorBlur(color: string): string {
  // Create a minimal 1x1 pixel SVG with the specified color
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">
      <rect width="1" height="1" fill="rgb(${color})"/>
    </svg>
  `;
  
  const encoded = btoa(svg).replace(/\+/g, '-').replace(/\//g, '_');
  return `data:image/svg+xml;base64,${encoded}`;
}

/**
 * Blur placeholders for different image categories
 * Use these as `blurDataURL` prop in Next.js Image component
 */
export const blurPlaceholders = {
  // Hero sections & banners
  hero: generateColorBlur('26, 39, 94'),           // Dark blue
  banner: generateColorBlur('245, 245, 245'),      // Light gray
  signIn: generateColorBlur('219, 112, 147'),      // Pale violet red
  signUp: generateColorBlur('66, 135, 245'),       // Cornflower blue
  
  // User content
  avatar: generateColorBlur('200, 200, 200'),      // Light gray
  profileImage: generateColorBlur('220, 220, 220'), // Very light gray
  
  // Organizer content
  organizerLogo: generateColorBlur('245, 245, 245'), // Light gray (for logos)
  organizerBanner: generateColorBlur('250, 250, 250'), // Almost white
  
  // Event content
  eventImage: generateColorBlur('235, 235, 235'),  // Very light gray
  eventHero: generateColorBlur('52, 73, 94'),      // Dark blue-gray
  
  // Gallery & media
  gallery: generateColorBlur('240, 240, 240'),     // Off-white
  thumbnail: generateColorBlur('220, 220, 220'),   // Light gray
  
  // Partner logos & trust section
  partner: generateColorBlur('255, 255, 255'),     // White (for logos on dark bg)
};

/**
 * Generate blur for images with custom dimensions
 * Creates a slightly larger placeholder for better visual quality
 * 
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @param dominantColor - RGB color string
 * @returns Data URL for the blur placeholder
 */
export function generateDimensionalBlur(
  width: number,
  height: number,
  dominantColor: string
): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="rgb(${dominantColor})"/>
    </svg>
  `;
  
  const encoded = btoa(svg).replace(/\+/g, '-').replace(/\//g, '_');
  return `data:image/svg+xml;base64,${encoded}`;
}

/**
 * Usage example:
 * 
 * import { blurPlaceholders } from '@/lib/imageBlurs';
 * import Image from 'next/image';
 * 
 * export function HeroSection() {
 *   return (
 *     <Image
 *       src="/images/hero.jpg"
 *       alt="Hero banner"
 *       fill
 *       priority // Critical image - load eagerly
 *       placeholder="blur"
 *       blurDataURL={blurPlaceholders.hero}
 *       sizes="(max-width: 768px) 100vw, 100vw"
 *       className="object-cover"
 *     />
 *   );
 * }
 */
