'use client';

import { useRealtimeUserLocks } from '@/hooks/useRealtimeUserLocks';

export function UserLocksListener() {
  useRealtimeUserLocks();
  return null;
}
