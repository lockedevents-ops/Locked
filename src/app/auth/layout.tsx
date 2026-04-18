import Link from 'next/link';
import { ReactNode } from 'react';
import { ThemeToggleButton } from '@/components/theme/ThemeToggleButton';
import { ThemeProvider } from '@/contexts/ThemeContext';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <ThemeProvider>
    <div className="fixed inset-0 overflow-y-auto bg-neutral-50 text-neutral-900 dark:bg-black dark:text-white transition-colors">
      <header className="absolute top-0 left-0 z-10 w-full px-4 pt-[max(env(safe-area-inset-top),1rem)] sm:px-8">
        <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-100 cursor-pointer dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900"
          aria-label="Back to homepage"
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.5 15l-5-5 5-5" />
          </svg>
          <span>Home</span>
        </Link>
        <ThemeToggleButton className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 bg-white text-neutral-800 transition-colors hover:bg-neutral-100 cursor-pointer dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900" />
        </div>
      </header>
      <main className="min-h-[100dvh] px-4 py-6 pb-[max(env(safe-area-inset-bottom),1rem)] sm:py-10 flex items-center justify-center">
        {children}
      </main>
    </div>
    </ThemeProvider>
  );
}