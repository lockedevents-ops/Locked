/**
 * Domain Type: Event
 * --------------------------------------------------------------
 * CURRENT ROLE:
 *  - Core event entity used across listings, detail pages, and organizer dashboards.
 *  - Includes nested location + organizer summary + ticket type definitions.
 *
 * MIGRATION PLAN:
 *  - Align with backend /api/events schema; expect server to be source of truth for
 *    availableQuantity (computed) and timestamps (createdAt/updatedAt).
 *  - Remove client-maintained date/time strings in favor of ISO datetimes or start/end fields.
 *
 * FUTURE:
 *  - Introduce separate TicketInventory object if granular seat management appears.
 *  - Add status (draft/published/cancelled) and visibility flags.
 */
export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;            // TODO: migrate to startDate (ISO)
  time: string;            // TODO: merge into startDate
  location: {
    name: string;
    address: string;
    city: string;
    region?: string;            // Region for Ghana events (16 regions)
    coordinates?: { lat: number; lng: number };
  };
  organizer: {
    id: string;
    name: string;
    image?: string;
  };
  category: string;
  ticketTypes: TicketType[];
  coverImage: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketType {
  id: string;
  name: string;
  price: number;
  description?: string;
  quantity: number;            // total issued
  availableQuantity: number;   // remaining (computed server-side later)
  saleStartDate?: string;      // ISO string
  saleEndDate?: string;        // ISO string
}
