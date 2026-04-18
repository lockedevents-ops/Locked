import { SignInForm } from '@/components/forms/SignInForm';
import { Suspense } from 'react';
import { PageLoader } from '@/components/loaders/PageLoader';

export default function SignInPage() {
  return (
    <Suspense fallback={<PageLoader message="Loading sign-in..." fullHeight />}>
      <SignInForm />
    </Suspense>
  );
}
