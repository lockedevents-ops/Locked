"use client";

import { ResetPasswordForm } from '@/components/forms/ResetPasswordForm';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  return (
    <div className="w-full flex items-center justify-center px-4">
      <ResetPasswordForm token={token} />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="w-full flex items-center justify-center"><span className="text-sm text-neutral-400">Loading reset form...</span></div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
