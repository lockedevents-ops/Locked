/**
 * eventStore – UI Filter State (Client Only)
 * --------------------------------------------------------------
 * CURRENT ROLE:
 *  - Stores ephemeral EventFilters and (currently unused) events array (placeholder).
 *  - Not persisted; resets on reload (good for transient filter state).
 *
 * MIGRATION PLAN:
 *  - Remove events array once data fetching moves to query hooks (e.g., useEventsQuery(filters)).
 *  - Keep only filters OR migrate filters to URL query parameters for shareable state.
 *  - Introduce canonical filter serialization util for building API query strings.
 *
 * DEPRECATE:
 *  - Direct events storage; rely on server pagination & caching.
 */
import { create } from 'zustand';

// Define event filter options
export interface EventFilters {
  category?: string;
  date?: string;
  price?: [number, number];
  location?: string;
  searchQuery?: string;
}

// Define the store's state type
import { Event } from "@/types";

interface EventStore {
  events: Event[];
  filters: EventFilters;
  
  // Actions
  setFilters: (filters: Partial<EventFilters>) => void;
  resetFilters: () => void;
}

// Create the store
export const useEventStore = create<EventStore>((set) => ({
  events: [],
  filters: {},
  setFilters: (filters: Partial<EventFilters>) =>
    set((state: EventStore) => ({
      filters: { ...state.filters, ...filters }
    })),
  resetFilters: () => set(() => ({ filters: {} })),
}));
