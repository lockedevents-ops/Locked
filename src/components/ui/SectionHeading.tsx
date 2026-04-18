"use client";

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface SectionHeadingProps {
  title: string;
  id?: string;
  eyebrow?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  hideActionOnMobile?: boolean;
  className?: string;
  spaced?: boolean;
}

export function SectionHeading({
  title,
  id,
  eyebrow,
  description,
  actionHref,
  actionLabel = 'View All',
  hideActionOnMobile = true,
  className = '',
  spaced = true,
}: SectionHeadingProps) {
  const showAction = !!actionHref;
  return (
    <div className={`${spaced ? 'mb-6 md:mb-8' : ''} ${className}`} id={id}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          {eyebrow && (
            <div className="text-xs font-medium tracking-wide uppercase text-primary/80 mb-1 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
              {eyebrow}
            </div>
          )}
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl flex items-center gap-3">
            <span className="inline-block w-1.5 md:w-2 h-6 md:h-8 rounded-full bg-gradient-to-b from-primary to-primary/40" aria-hidden="true" />
            <span>{title}</span>
          </h2>
          {description && (
            <p className="mt-2 text-sm md:text-base text-neutral-600 leading-relaxed">{description}</p>
          )}
        </div>
        {showAction && (
          <div className={`${hideActionOnMobile ? 'hidden sm:block' : ''}`}>
            <Link
              href={actionHref!}
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md px-2 py-1"
            >
              <span>{actionLabel}</span>
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}
      </div>
      {showAction && hideActionOnMobile && (
        <div className="mt-3 sm:hidden">
          <Link
            href={actionHref!}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/90"
          >
            <span>{actionLabel}</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default SectionHeading;
