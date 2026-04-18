/**
 * utils.ts – Generic UI Utilities
 * --------------------------------------------------------------
 * CURRENT ROLE:
 *  - Exposes cn() to merge Tailwind className strings (clsx + tailwind-merge).
 *
 * MIGRATION / FUTURE:
 *  - Central place to add other generic helpers (formatters, guard functions) but keep focused.
 *  - If file grows too large, split into domain-specific util modules.
 */
import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
