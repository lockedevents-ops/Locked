"use client";
import React from 'react';
import clsx from 'clsx';

/**
 * ActionIconButton – Unified compact icon-only button for admin tables/actions
 * --------------------------------------------------------------
 * Size: 32x32 (h-8 w-8) for density consistency.
 * Variants provide semantic coloring while retaining accessible labels.
 */
export type ActionIconButtonVariant =
  | 'neutral'
  | 'view'
  | 'edit'
  | 'suspend'
  | 'reactivate'
  | 'delete';

interface ActionIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string; // accessible label (required)
  variant?: ActionIconButtonVariant;
  children: React.ReactNode; // usually an icon
}

const baseClasses =
  'h-8 w-8 inline-flex items-center justify-center rounded-md border text-sm transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';

const variantClasses: Record<ActionIconButtonVariant, string> = {
  neutral:
    'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800',
  view:
    'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-primary hover:bg-gray-50 dark:hover:bg-neutral-800',
  edit:
    'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200/70 dark:border-blue-800/50 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40',
  suspend:
    'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-800/50 text-amber-600 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40',
  reactivate:
    'bg-green-50/70 dark:bg-green-950/30 border-green-200/70 dark:border-green-800/50 text-green-600 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40',
  delete:
    'bg-red-50/70 dark:bg-red-950/30 border-red-200/70 dark:border-red-800/50 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40',
};

export function ActionIconButton({
  label,
  variant = 'neutral',
  className,
  children,
  ...rest
}: ActionIconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={clsx(baseClasses, variantClasses[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export default ActionIconButton;
