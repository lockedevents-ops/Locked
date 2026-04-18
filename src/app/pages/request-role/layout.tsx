"use client";

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function RequestRoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-friendly header with back button */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </Link>
        </div>
      </div>

      {/* Main content with responsive padding */}
      <main className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 max-w-4xl mx-auto">
        {children}
      </main>
    </div>
  );
}