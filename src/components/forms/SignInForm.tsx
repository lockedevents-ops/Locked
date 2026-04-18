"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext'; 
import { useToast } from '@/hooks/useToast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Lock, Mail } from 'lucide-react';
import MFAVerificationModal from '@/components/modals/MFAVerificationModal';
import { createClient } from '@/lib/supabase/client/client';
import { SuccessInfoView } from '@/components/ui/SuccessInfoView';

// Define form schema using Zod
const signInSchema = z.object({
  identifier: z.string().min(1, 'Please enter your email or phone number'),
  password: z.string().min(1, 'Password is required'),
});

type SignInFormValues = z.infer<typeof signInSchema>;

interface SignInFormProps {
  returnUrl?: string;
  onSuccess?: () => void;
}

export function SignInForm({ returnUrl, onSuccess }: SignInFormProps) {
  const { signIn, verifyMFA } = useAuth();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  const [mfaData, setMfaData] = useState<{ factorId: string; email: string; availableMethods?: Array<'totp' | 'email'> } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check for verified parameter on load
  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setShowVerifiedModal(true);
      // Clean up the URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams]);

  // ✅ FIX: Clear any stale sessions when sign-in page loads
  useEffect(() => {
    const clearStaleSession = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        // If there's an error about user not existing, clear the session
        if (error && (error.message.includes('does not exist') || error.message.includes('JWT'))) {
          console.log('[SignInForm] Clearing stale session on mount');
          await supabase.auth.signOut({ scope: 'local' });
        }
      } catch (err) {
        console.error('[SignInForm] Error checking session:', err);
      }
    };
    
    clearStaleSession();
  }, []);

  // Auto-hide password after 3 seconds
  useEffect(() => {
    if (showPassword) {
      const timer = setTimeout(() => {
        setShowPassword(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showPassword]);

  const handleSocialAuth = async (provider: 'google' | 'apple' | 'facebook') => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please try again.');
      }
      console.error(err);
    }
  };
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignInFormValues) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Handle Password Sign In
      const result = await signIn(data.identifier, data.password);
      
      // Check if MFA is required
      if (result?.mfaRequired) {
        // Show MFA verification modal
        setMfaData({
          factorId: result.factors[0]?.id || '',
          email: result.email,
          availableMethods: result.availableMethods || ['totp']
        });
        setShowMFAModal(true);
        setIsSubmitting(false);
        return;
      }
      
      // Success - route based on role
      toast.showSuccess('Welcome Back!');
      
      // Send security alert email (await with timeout so it actually sends)
      try {
        await Promise.race([
          fetch('/api/auth/security-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: result?.email,
              customerName: result?.name || result?.email,
              browser: window.navigator.userAgent,
              time: new Date().toLocaleString(),
            }),
          }),
          new Promise(resolve => setTimeout(resolve, 3000)) // 3s max wait
        ]);
      } catch (e) {
        // Silent fail - don't block user
      }
      
      const userRoles = result?.roles || [];
      const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');
      
      if (onSuccess) {
        onSuccess();
      } else if (isAdmin) {
        router.push(returnUrl || '/admin');
      } else {
        router.push(returnUrl || '/');
      }
    } catch (err) {
      // Handle unexpected errors
      if (err instanceof Error) {
        setError(err.message);
        toast.showError('Sign In Error', err.message);
      } else {
        setError('Failed to sign in. Please check your credentials and try again.');
        toast.showError('Sign In Failed', 'Please check your credentials and try again.');
      }
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMFAVerify = async (code: string, method?: 'totp' | 'email') => {
    if (!mfaData) return;

    try {
      const userData = await verifyMFA(mfaData.factorId, code, method);
      
      // Success - route based on role
      toast.showSuccess('Welcome Back!');
      setShowMFAModal(false);
      
      const userRoles = userData?.roles || [];
      const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');
      
      if (onSuccess) {
        onSuccess();
      } else if (isAdmin) {
        router.push(returnUrl || '/admin');
      } else {
        router.push(returnUrl || '/');
      }
    } catch (err: any) {
      // Error will be handled by the modal
      throw err;
    }
  };


  return (
  <div className="w-full max-w-md">
      <div className="px-5 py-7 sm:px-8 sm:py-9">
        <div className="mb-7 flex flex-col items-start">
          <h1 className="text-3xl font-semibold tracking-tight text-left text-neutral-900 dark:text-white">Welcome Back</h1>
          <p className="text-sm text-neutral-600 mt-2 text-left dark:text-neutral-400">
            Sign in to unlock exclusive experiences.
          </p>
        </div>
        
        {!showEmailForm && (
        <div className="grid grid-cols-1 gap-3 mb-4">
          <button
            type="button"
            onClick={() => handleSocialAuth('google')}
            className="h-12 flex items-center justify-center gap-2 rounded-lg border border-neutral-900 bg-black text-white font-medium cursor-pointer text-sm transition-colors hover:bg-neutral-800 dark:border-neutral-200 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => handleSocialAuth('facebook')}
            className="h-12 flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white text-neutral-900 font-medium cursor-pointer text-sm transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.248h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Continue with Facebook
          </button>
          {/* 
          <button
            type="button"
            onClick={() => handleSocialAuth('apple')}
            className="h-12 flex items-center justify-center gap-2 bg-black border border-black rounded-lg hover:bg-neutral-800 transition-colors text-white font-medium cursor-pointer text-sm"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05 1.78-3.3 1.78-1.2 0-1.58-.75-3.23-.75-1.63 0-2.1.72-3.23.75-1.18.03-2.18-.83-3.2-1.78-2.1-1.95-3.65-5.55-3.65-8.83 0-5.18 3.33-7.9 6.5-7.9 1.68 0 2.88.93 3.85.93.93 0 2.45-.93 4.45-.93 1.73 0 4.15.83 5.48 2.85-3.48 1.93-2.93 6.13-.15 7.4-1.23 2.83-2.83 5.35-3.52 6.3zM15.35 1.4c0 1.25-.8 3.55-3.2 3.55-.18-2-.03-3.7 1.25-5.05 1.33-1.4 3.48-1.5 3.48-1.5-.05.5-.33 1.55-1.53 3z" />
            </svg>
            Apple
          </button>
          */}
        </div>
        )}

        {!showEmailForm && (
          <button
            type="button"
            onClick={() => setShowEmailForm(true)}
            className="mb-4 h-12 w-full rounded-lg border border-neutral-300 bg-white text-neutral-900 font-medium text-sm cursor-pointer transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center gap-2"
          >
            <Mail className="h-5 w-5" />
            Continue with email
          </button>
        )}
        
        {showEmailForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-700 rounded-md text-sm dark:text-red-300">
              {error}
              {error.includes("No account found") && (
                <p className="mt-1">
                  Don't have an account yet?{" "}
                  <Link href="/auth/signup" className="text-neutral-900 font-medium hover:underline dark:text-white">
                    Sign up here
                  </Link>
                </p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="identifier" className="text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-200">Email</label>
            <div className="relative rounded-lg">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
              </div>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                className="block w-full h-12 pl-11 pr-4 border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500"
                placeholder="you@example.com"
                {...register('identifier')}
              />
            </div>
            {errors.identifier && (
              <p className="text-xs text-red-600 dark:text-red-300">{errors.identifier.message}</p>
            )}
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Password</label>
              <Link href="/auth/forgot-password" className="text-xs text-neutral-600 hover:text-neutral-900 hover:underline dark:text-neutral-400 dark:hover:text-white">Forgot password?</Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="block w-full h-12 pl-11 pr-11 border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500"
                placeholder="••••••••"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 hover:text-neutral-800 cursor-pointer dark:text-neutral-500 dark:hover:text-neutral-200"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-600 dark:text-red-300">{errors.password.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full h-11 py-2 px-4 rounded-md mt-2 font-medium ${
              isSubmitting
                ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-500'
                : 'bg-neutral-900 text-white hover:bg-neutral-800 cursor-pointer dark:bg-white dark:text-black dark:hover:bg-neutral-200'
            }`}
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        )}
        
        <div className="text-center text-sm mt-7 text-neutral-600 dark:text-neutral-400">
          <span>Don't have an account? </span>
          <Link href="/auth/signup" className="text-neutral-900 hover:underline dark:text-white">Sign Up</Link>
        </div>
        <div className="text-xs text-neutral-600 mt-4 text-center leading-6 dark:text-neutral-500">
          By continuing, you agree to Locked's{' '}
          <Link href="/pages/legal/terms-of-service" className="underline text-neutral-700 dark:text-neutral-300">Terms of Service</Link> and{' '}
          <Link href="/pages/legal/privacy-policy" className="underline text-neutral-700 dark:text-neutral-300">Privacy Policy</Link>.
        </div>
      </div>

      {/* MFA Verification Modal */}
      <MFAVerificationModal
        isOpen={showMFAModal}
        onClose={() => {
          setShowMFAModal(false);
          setMfaData(null);
        }}
        onVerify={handleMFAVerify}
        email={mfaData?.email}
        availableMethods={mfaData?.availableMethods}
      />

      {/* Email Verification Success Modal */}
      {showVerifiedModal && (
        <SuccessInfoView
          isModal={true}
          onClose={() => setShowVerifiedModal(false)}
          title="Email Verified Successfully!"
          message="Your email has been confirmed. You can now sign in to your account and explore Locked."
          ctaText="Continue to Sign In"
          ctaHref="#"
          onCtaClick={() => setShowVerifiedModal(false)}
        />
      )}
    </div>
  );
}
