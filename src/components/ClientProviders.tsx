"use client";

/**
 * ClientProviders Component
 * ✅ PHASE 1 OPTIMIZATION: Client-side wrapper for providers that need client context
 * This allows us to lazy load StorageBootstrap without blocking server-side rendering
 */

import { AppProviders } from '@/contexts/AppProviders';
import dynamic from 'next/dynamic';
import { ReactNode } from 'react';
import { KeysListener } from './keys/KeysListener';

import { UserLocksListener } from './locks/UserLocksListener';

// ✅ Lazy load StorageBootstrap to avoid blocking render
const StorageBootstrap = dynamic(
  () => import('@/storage/bootstrap').then(mod => ({ default: mod.StorageBootstrap })),
  { ssr: false }
);

interface ClientProvidersProps {
  children: ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AppProviders>
      <StorageBootstrap />
      <KeysListener />
      <UserLocksListener />
      {children}
    </AppProviders>
  );
}
