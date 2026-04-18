/**
 * STORAGE LAYER: events.ts
 * -------------------------------------------------------------
 * Current Role:
 *  - Local client event bus wrapping BroadcastChannel for multi-tab sync and
 *    an in-memory pub/sub for intra-tab updates.
 *  - Emits synthetic domain events after repository mutations to keep UI reactive.
 * Migration Guidance (Real DB / API):
 *  - Replace or augment with real-time transport (WebSocket, SSE, Pusher, etc.).
 *  - Map incoming server events to the same event names OR directly to query cache
 *    invalidations (if using TanStack Query/SWR) instead of manual listeners.
 *  - After full migration, only keep this file if you still need a lightweight
 *    local bus for UI state events decoupled from network.
 *  - 'BATCH' logic may be unnecessary once server push naturally batches events; delete if unused.
 */

export type StorageEventType =
  | 'ROLE_REQUEST_CREATED'
  | 'ROLE_REQUEST_UPDATED'
  | 'ADMIN_NOTIFICATION_CREATED'
  | 'ADMIN_NOTIFICATION_UPDATED'
  | 'USER_UPDATED'
  | 'EVENT_SAVED'
  | 'VENUE_SAVED'
  | 'PREFERENCES_UPDATED'
  | 'BATCH';

export interface StorageEventPayload<T = any> { type: StorageEventType; data?: T; timestamp: number; }

type Listener = (evt: StorageEventPayload) => void;

class StorageEventsClass {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<Listener> = new Set();
  // batching support
  private batchQueue: StorageEventPayload[] = [];
  private batchTimer: any = null;
  private batchingWindow = 40; // ms debounce window

  constructor() {
    if (typeof window !== 'undefined') {
      if ('BroadcastChannel' in window) {
        try {
          this.channel = new BroadcastChannel('locked_storage_events');
          this.channel.onmessage = (e) => { if (e?.data?.type) this.handleIncoming(e.data); };
        } catch {}
      } else {
        (window as unknown as Window & typeof globalThis).addEventListener('storage', () => { /* fallback */ });
      }
    }
  }

  private flushBatch() {
    const queued = this.batchQueue;
    this.batchQueue = [];
    this.batchTimer = null;
  if (!queued.length) return;
  if (queued.length === 1) {
      this.emitLocal(queued[0]);
    } else {
      const composite: StorageEventPayload = {
    type: 'BATCH',
        data: queued,
        timestamp: Date.now()
      };
      // emit each individually first for simple listeners
      queued.forEach(evt => this.emitLocal(evt));
      // then emit composite for batch listeners marked with flag
      this.listeners.forEach(l => {
        try { (l as any).__acceptsBatch && l(composite); } catch {}
      });
    }
  }

  private schedule(evt: StorageEventPayload) {
    this.batchQueue.push(evt);
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flushBatch(), this.batchingWindow);
    }
  }

  private handleIncoming(evt: StorageEventPayload) {
    // push into batching pipeline
    this.schedule(evt);
  }

  private emitLocal(evt: StorageEventPayload) {
    this.listeners.forEach(l => { try { if (!(l as any).__acceptsBatch) l(evt); } catch {} });
  }

  dispatch<T = any>(type: StorageEventType, data?: T) {
    const payload: StorageEventPayload<T> = { type, data, timestamp: Date.now() };
    this.handleIncoming(payload);
    try { this.channel?.postMessage(payload); } catch {}
  }

  subscribe(listener: Listener, opts?: { batched?: boolean }) {
    if (opts?.batched) (listener as any).__acceptsBatch = true;
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const StorageEvents = new StorageEventsClass();

// Optional React hook for convenience
export function useStorageEvents(handler: Listener, deps: any[] = []) {
  if (typeof window === 'undefined') return;
  const { useEffect } = require('react');
  useEffect(() => StorageEvents.subscribe(handler), deps);
}

// Batched hook (listener receives individual events as usual plus one synthetic composite containing array in data)
export function useBatchedStorageEvents(handler: Listener, deps: any[] = []) {
  if (typeof window === 'undefined') return;
  const { useEffect } = require('react');
  useEffect(() => StorageEvents.subscribe(handler, { batched: true }), deps);
}

// Helper: subscribe to a subset of event types
export function useFilteredStorageEvents(types: StorageEventType[], handler: Listener, deps: any[] = []) {
  useStorageEvents((evt) => { if (types.includes(evt.type)) handler(evt); }, deps);
}
