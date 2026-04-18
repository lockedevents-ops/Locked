"use client";

import { useRouter } from 'next/navigation';
import { Home } from 'lucide-react';
import { SuccessInfoView } from '@/components/ui/SuccessInfoView';

export default function EmailConfirmError() {
  const router = useRouter();

  const handleResendEmail = () => {
    // Redirect to signup page with a message to resend
    router.push('/auth/signup?resend=true');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <SuccessInfoView
        variant="warning"
        title="Verification Failed"
        message="We couldn't verify your email. This link may have expired or already been used."
        ctaText="Request New Link"
        onCtaClick={handleResendEmail}
      >
        <button
          onClick={() => router.push('/')}
          className="w-full bg-gray-100 text-gray-900 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          Go to Homepage
        </button>
        
        <p className="text-sm text-gray-500 mt-6">
          Need help? Contact us at{' '}
          <a href="mailto:lockedeventsgh@gmail.com" className="text-black font-medium hover:underline">
            lockedeventsgh@gmail.com
          </a>
        </p>
      </SuccessInfoView>
    </div>
  );
}
