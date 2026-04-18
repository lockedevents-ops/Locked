import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client/client';

export interface KeysTransaction {
  id: string;
  amount: number;
  activity_type: string;
  description: string;
  created_at: string;
  is_read: boolean;
}

interface KeysState {
  balance: number;
  history: KeysTransaction[];
  isLoading: boolean;
  unseenEarnings: KeysTransaction | null;
  streaks?: {
    eventAttendance: number;
  };
  status?: 'standard' | 'gold' | 'platinum';
  
  // Actions
  fetchKeys: (userId: string) => Promise<void>;
  subscribeToKeys: (userId: string) => () => void;
  markEarningsAsSeen: () => void;
  setUnseenEarnings: (earning: KeysTransaction | null) => void;
  addKeys: (amount: number, description: string, eventId?: string) => void;
  updateStreak: (date: string) => void;
}

export const useKeysStore = create<KeysState>((set, get) => ({
  balance: 0,
  history: [],
  isLoading: false,
  unseenEarnings: null,
  // streaks and status will be undefined until backend supports them

  fetchKeys: async (userId: string) => {
    const supabase = createClient();
    set({ isLoading: true });

    try {
      // 1. Fetch Balance
      const { data: balanceData } = await supabase
        .from('user_keys_balance')
        .select('current_balance')
        .eq('user_id', userId)
        .maybeSingle();
      
      // 2. Fetch History
      const { data: historyData } = await supabase
        .from('user_keys_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      // 3. Check for unread earnings (most recent unread positive transaction)
      const unreadEarning = historyData?.find(
        (tx: KeysTransaction) => !tx.is_read && tx.amount > 0
      );

      // Fetch real data only - no mocks
      set({ 
        balance: balanceData?.current_balance || 0,
        history: historyData || [],
        unseenEarnings: unreadEarning || null,
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching keys:', error);
      set({ isLoading: false });
    }
  },

  subscribeToKeys: (userId: string) => {
    const supabase = createClient();
    
    // Initial fetch
    get().fetchKeys(userId);

    const subscription = supabase
      .channel(`keys-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_keys_ledger',
          filter: `user_id=eq.${userId}`
        },
        (payload: any) => {
          const newTransaction = payload.new as KeysTransaction;
          
          // Only show modal for earnings (positive amounts)
          if (newTransaction.amount > 0) {
            set((state) => ({
              balance: state.balance + newTransaction.amount,
              history: [newTransaction, ...state.history],
              unseenEarnings: newTransaction
            }));
          } else {
            // Just update balance for spends
            set((state) => ({
              balance: state.balance + newTransaction.amount,
              history: [newTransaction, ...state.history],
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  },

  markEarningsAsSeen: async () => {
    const unseenEarnings = get().unseenEarnings;
    if (unseenEarnings?.id) {
      const supabase = createClient();
      // Mark as read in database
      const { error } = await supabase
        .from('user_keys_ledger')
        .update({ is_read: true })
        .eq('id', unseenEarnings.id);
      
      if (error) {
        console.error('Error marking earnings as read:', error);
      } else {
        console.log('Successfully marked earning as read:', unseenEarnings.id);
      }
    }
    set({ unseenEarnings: null });
  },

  setUnseenEarnings: (earning: KeysTransaction | null) => {
    set({ unseenEarnings: earning });
  },

  addKeys: (amount: number, description: string, eventId?: string) => {
    // Optimistically update the balance
    set((state) => ({
      balance: state.balance + amount,
      history: [
        {
          id: `temp-${Date.now()}`,
          amount,
          activity_type: eventId ? 'event_checkin' : 'promo_code',
          description,
          created_at: new Date().toISOString(),
          is_read: false
        },
        ...state.history
      ]
    }));
    // Note: In production, this should call a backend API to persist the transaction
  },

  updateStreak: (date: string) => {
    // Update the attendance streak
    set((state) => ({
      streaks: {
        eventAttendance: (state.streaks?.eventAttendance || 0) + 1
      }
    }));
    // Note: In production, this should call a backend API to update streaks
  }
}));
