/**
 * CURRENT ROLE: Taxonomy migration utility.
 * MIGRATION PLAN: Collapse legacy `eventType` into canonical `category` + optional `format`.
 *  - `category` remains the broad, user-facing grouping (Music, Business, Technology, etc.)
 *  - `format` (new) captures structural style (Conference, Workshop, Concert, Gala, etc.)
 *  - Legacy events that only have `eventType` are migrated:
 *      format = eventType
 *      category inferred via mapping if absent
 *  - Legacy code reading `event.eventType` should be updated to `event.format` (with fallback if needed during transition).
 * FUTURE: When backend/API introduced, perform this mapping server-side once; remove fallback + localStorage flag.
 * DEPRECATE: Remove any remaining direct usages of `eventType` after confirming no old events remain.
 */

const CATEGORY_INFERENCE: Record<string, string> = {
  // Entertainment / Music
  'Concert': 'Music',
  'Festival': 'Music',
  'Performance': 'Arts & Culture',
  'Comedy Show': 'Entertainment',
  'DJ Night': 'Music',
  'Screening': 'Film',
  // Professional / Learning
  'Conference': 'Business',
  'Workshop': 'Education',
  'Seminar': 'Education',
  'Webinar': 'Education',
  'Training': 'Education',
  'Networking': 'Business',
  // Exhibitions / Launches
  'Exhibition': 'Arts & Culture',
  'Trade Show': 'Business',
  'Art Show': 'Arts & Culture',
  'Product Launch': 'Business',
  // Competitions & Ceremonies
  'Competition': 'Competition',
  'Award Ceremony': 'Competition',
  'Beauty Pageant': 'Competition',
  'Contest': 'Competition',
  // Social / Gatherings
  'Party': 'Entertainment',
  'Wedding': 'Social',
  'Gala': 'Social',
  'Meetup': 'Community',
  // Other / Thematic
  'Retreat': 'Community',
  'Fundraiser': 'Charity',
  'Religious Event': 'Religious',
  'Other': 'Other'
};

const MIGRATION_FLAG_KEY = 'events-taxonomy-migrated-v1';

export function migrateEventsTaxonomy(): void {
  if (typeof window === 'undefined') return; // SSR guard
  try {
    if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'true') return;
    const raw = localStorage.getItem('events');
    if (!raw) {
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      return;
    }
    const events = JSON.parse(raw);
    if (!Array.isArray(events)) {
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      return;
    }
    let mutated = false;
    const updated = events.map((evt: any) => {
      if (!evt || typeof evt !== 'object') return evt;
      let changed = false;
      // Promote legacy eventType to format
      if (!evt.format && evt.eventType) {
        evt.format = evt.eventType;
        changed = true;
      }
      // Infer category if missing
      if (!evt.category && evt.format && CATEGORY_INFERENCE[evt.format]) {
        evt.category = CATEGORY_INFERENCE[evt.format];
        changed = true;
      }
      // Remove legacy eventType
      if (Object.prototype.hasOwnProperty.call(evt, 'eventType')) {
        delete evt.eventType;
        changed = true;
      }
      if (changed) mutated = true;
      return evt;
    });
    if (mutated) {
      localStorage.setItem('events', JSON.stringify(updated));
    }
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
  } catch (e) {
    // Fail silently; migration is best-effort
    console.warn('[taxonomy migration] failed:', e);
  }
}

export function legacyFormatFallback(evt: any): string | undefined {
  return evt?.format || evt?.eventType; // temporary dual support
}
