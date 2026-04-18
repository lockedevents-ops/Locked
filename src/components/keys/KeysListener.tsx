"use client";

import { useEffect } from 'react';
import { useKeysStore } from '@/store/keysStore';
import { useAuth } from '@/contexts/AuthContext';
import { EarnedKeysModal } from './EarnedKeysModal';

export function KeysListener() {
  const { user } = useAuth();
  const { subscribeToKeys, unseenEarnings, markEarningsAsSeen } = useKeysStore();

  useEffect(() => {
    if (user?.id) {
      // Start listening for key updates
      const unsubscribe = subscribeToKeys(user.id);
      return () => unsubscribe();
    }
  }, [user?.id, subscribeToKeys]);

  return (
    <EarnedKeysModal 
      isOpen={!!unseenEarnings}
      onClose={markEarningsAsSeen}
      amount={unseenEarnings?.amount || 0}
      reason={unseenEarnings?.description || 'You earned keys!'}
    />
  );
}
