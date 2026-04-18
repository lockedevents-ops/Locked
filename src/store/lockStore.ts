/**
 * lockStore – Local Lock Flags (UI Draft)
 * --------------------------------------------------------------
 * CURRENT ROLE:
 *  - Tracks locally 'locked' event/venue items (possibly to prevent edits or signal premium usage).
 *  - Purely cosmetic / client authoritative at present.
 *
 * MIGRATION PLAN:
 *  - Define precise semantics (reservation? moderation lock? premium feature?).
 *  - Replace with server endpoints:
 *      POST /api/locks { resourceType, resourceId }
 *      DELETE /api/locks/:id
 *      GET /api/locks?resourceType=event&ids=...
 *  - Include owner/admin attribution & expiry timestamps (server enforces).
 *
 * DEPRECATE:
 *  - toggleLock local mutation if actual locking has business impact (server authoritative).
 *
 * KEEPING (OPTIONAL):
 *  - getLockedItems as selector wrapper if a real-time subscription feeds state.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LockedItem {
  id: string;
  type: 'event' | 'venue';
  data: any; 
  timestamp: number;
}

interface LockState {
  lockedItems: LockedItem[];
  lockCounts: { [eventId: string]: number };
  isItemLocked: (id: string, type: 'event' | 'venue') => boolean;
  toggleLock: (id: string, type: 'event' | 'venue', data?: any) => void;
  setLockState: (id: string, type: 'event' | 'venue', isLocked: boolean, data?: any) => void;
  getLockedItems: (type?: 'event' | 'venue') => LockedItem[];
  setLockCount: (eventId: string, count: number) => void;
  initializeCounts: (initialCounts: { [eventId:string]: number }) => void;
  clearLocks: () => void;
}

export const useLockStore = create<LockState>()(
  persist(
    (set, get) => ({
      lockedItems: [],
      lockCounts: {},
      
      isItemLocked: (id, type) => {
        return get().lockedItems.some(item => item.id === id && item.type === type);
      },
      
      toggleLock: (id, type, data) => {
        const { lockedItems } = get();
        const isLocked = get().isItemLocked(id, type);
        
        if (isLocked) {
          set({
            lockedItems: lockedItems.filter(
              item => !(item.id === id && item.type === type)
            ),
          });
        } else {
          set({
            lockedItems: [
              ...lockedItems,
              {
                id,
                type,
                data,
                timestamp: Date.now(),
              },
            ],
          });
        }
      },

      setLockState: (id, type, isLocked, data) => {
        const { lockedItems } = get();
        const currentlyLocked = get().isItemLocked(id, type);

        if (isLocked && !currentlyLocked) {
          // Add lock
          set({
            lockedItems: [
              ...lockedItems,
              {
                id,
                type,
                data,
                timestamp: Date.now(),
              },
            ],
          });
        } else if (!isLocked && currentlyLocked) {
          // Remove lock
          set({
            lockedItems: lockedItems.filter(
              item => !(item.id === id && item.type === type)
            ),
          });
        }
      },
      
      getLockedItems: (type) => {
        const { lockedItems } = get();
        if (type) {
          return lockedItems.filter(item => item.type === type);
        }
        return lockedItems;
      },

      setLockCount: (eventId, count) => {
        set(state => ({
          lockCounts: {
            ...state.lockCounts,
            [eventId]: count,
          }
        }));
      },

      initializeCounts: (initialCounts) => {
        set(state => ({
          lockCounts: {
            ...state.lockCounts,
            ...initialCounts,
          }
        }));
      },
      
      clearLocks: () => set({ lockedItems: [], lockCounts: {} }),
    }),
    {
      name: 'locked-items-storage', 
    }
  )
);