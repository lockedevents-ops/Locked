/**
 * Price formatting utilities for consistent price display across the application
 */

export type PriceValue = string | number | null | undefined;

/**
 * Formats a price value for display
 * @param price - The price value (string, number, null, or undefined)
 * @returns Formatted price string
 */
export function formatPrice(price: PriceValue): string {
  // Handle null or undefined
  if (price == null) {
    return 'Free';
  }
  
  // Handle string prices (like "Free", "Contact for pricing", etc.)
  if (typeof price === 'string') {
    return price.trim() || 'Free';
  }
  
  // Handle numeric prices
  if (typeof price === 'number') {
    // If price is 0, it's free
    if (price === 0) {
      return 'Free';
    }
    
    // Format with currency symbol
    return `₵${price}`;
  }
  
  // Fallback
  return 'Free';
}

/**
 * Checks if a price represents a free event
 * @param price - The price value
 * @returns true if the event is free
 */
export function isFreePrice(price: PriceValue): boolean {
  if (price == null) return true;
  if (typeof price === 'number') return price === 0;
  if (typeof price === 'string') {
    const normalized = price.trim().toLowerCase();
    return normalized === '' || normalized === 'free' || normalized === '0';
  }
  return true;
}

/**
 * Gets the numeric value of a price
 * @param price - The price value
 * @returns numeric value or 0 for free events
 */
export function getPriceValue(price: PriceValue): number {
  if (price == null) return 0;
  if (typeof price === 'number') return price;
  if (typeof price === 'string') {
    // Try to extract numeric value from string
    const match = price.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }
  return 0;
}
