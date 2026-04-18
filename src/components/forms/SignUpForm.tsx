"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { User, Lock, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client/client';
import { SuccessInfoView } from '@/components/ui/SuccessInfoView';

// Updated schema for Supabase auth
// Note: Supabase has additional password requirements at the database level
const signUpSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string()
    .email('Invalid email address')
    .min(5, 'Email is too short')
    .max(100, 'Email is too long')
    .refine(
      (email) => {
        // Check for valid email structure
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
      },
      'Please enter a valid email address'
    )
    .refine(
      (email) => {
        // Block common disposable/temporary email domains
        const domain = email.split('@')[1]?.toLowerCase();
        const blockedDomains = [
          'tempmail.com', 'throwaway.email', '10minutemail.com',
          'guerrillamail.com', 'mailinator.com', 'trashmail.com'
        ];
        return !blockedDomains.includes(domain);
      },
      'Temporary email addresses are not allowed'
    ),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .refine(
      (password) => /[A-Z]/.test(password),
      'Password must contain at least one uppercase letter'
    )
    .refine(
      (password) => /[0-9]/.test(password),
      'Password must contain at least one number'
    )
    .refine(
      (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
      'Password must contain at least one special character (!@#$%^&*...)'
    ),
  confirmPassword: z.string(),
  termsAccepted: z.boolean()
    .refine(val => val === true, {
      message: 'You must accept the terms and conditions',
    }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

interface SignUpFormProps {
  onSuccess?: () => void;
}

export function SignUpForm({ onSuccess }: SignUpFormProps) {
  const { signUp } = useAuth();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  
  // ✅ FIX: Clear any stale sessions when sign-up page loads
  useEffect(() => {
    const clearStaleSession = async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        
        // If there's an error about user not existing, clear the session
        if (error && (error.message.includes('does not exist') || error.message.includes('JWT'))) {
          console.log('[SignUpForm] Clearing stale session on mount');
          await supabase.auth.signOut({ scope: 'local' });
        }
      } catch (err) {
        console.error('[SignUpForm] Error checking session:', err);
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
  
  // Auto-hide confirm password after 3 seconds
  useEffect(() => {
    if (showConfirmPassword) {
      const timer = setTimeout(() => {
        setShowConfirmPassword(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showConfirmPassword]);
  
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
    watch,
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      termsAccepted: false,
    },
    mode: "onChange",
  });
  
  const onSubmit = async (data: SignUpFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Use custom API for signup to ensure Nodemailer template is used
      // and Supabase default email is suppressed (handled by server-side logic)
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.name,
              terms_accepted: data.termsAccepted,
            }
          }
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create account');
      }
      
      if (result.success) {
        toast.showSuccess('Account Created!', 'Please check your email for verification.');
        setShowSuccessModal(true);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        toast.showError('Sign Up Failed', err.message);
      } else {
        setError('Failed to create account. Please try again.');
        toast.showError('Sign Up Failed', 'Failed to create account. Please try again.');
      }
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
    router.push('/auth/signin');
  };

  return (
    <div className="w-full max-w-md">
      <div className="px-5 py-7 sm:px-8 sm:py-9">
        <div className="mb-7 flex flex-col items-start">
          <h1 className="text-3xl font-semibold tracking-tight text-left text-neutral-900 dark:text-white">Create your account</h1>
          <p className="text-sm text-neutral-600 mt-2 text-left dark:text-neutral-400">
            Your adventure starts here. Sign up and get the party started!
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-700 rounded-md text-sm dark:text-red-300">
              {error}
            </div>
          )}

          {/* Name field */}
          <div>
        <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">Name</label>
        <div className="relative rounded-lg">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <User className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
          </div>
          <input
            type="text"
            id="name"
            {...register("name")}
            className={`block w-full h-12 pl-11 pr-4 border rounded-md bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 ${
          errors.name ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-800'
            }`}
            placeholder="Enter your name"
            disabled={isSubmitting}
          />
        </div>
        {errors.name && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-300">{errors.name.message}</p>
        )}
          </div>

          {/* Email field */}
          <div>
        <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">Email</label>
        <div className="relative rounded-lg">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Mail className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
          </div>
          <input
            type="email"
            id="email"
            autoComplete="username"
            {...register("email")}
            className={`block w-full h-12 pl-11 pr-4 border rounded-md bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 ${
          errors.email ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-800'
            }`}
            placeholder="Enter your email"
            disabled={isSubmitting}
          />
        </div>
        {errors.email && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-300">{errors.email.message}</p>
        )}
          </div>

          {/* Password fields */}
          <div className="flex flex-col gap-4">
        <div className="flex-1">
          <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Lock className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
            </div>
            <input
          type={showPassword ? "text" : "password"}
          id="password"
          autoComplete="new-password"
          {...register("password")}
          className={`block w-full h-12 pl-11 pr-11 border rounded-md bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 ${
            errors.password ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-800'
          }`}
          placeholder="Enter your password"
          disabled={isSubmitting}
            />
            <button
          type="button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 hover:text-neutral-800 cursor-pointer dark:text-neutral-500 dark:hover:text-neutral-200"
          onClick={() => setShowPassword((prev) => !prev)}
          tabIndex={0}
            >
          {showPassword ? (
            <EyeOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Eye className="h-5 w-5" aria-hidden="true" />
          )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-300">{errors.password.message}</p>
          )}
        </div>

        <div className="flex-1">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1">Confirm Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Lock className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
            </div>
            <input
          type={showConfirmPassword ? "text" : "password"}
          id="confirmPassword"
          autoComplete="new-password"
          {...register("confirmPassword")}
          className={`block w-full h-12 pl-11 pr-11 border rounded-md bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500 ${
            errors.confirmPassword ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-800'
          }`}
          placeholder="Confirm password"
          disabled={isSubmitting}
            />
            <button
          type="button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 hover:text-neutral-800 cursor-pointer dark:text-neutral-500 dark:hover:text-neutral-200"
          onClick={() => setShowConfirmPassword((prev) => !prev)}
          tabIndex={0}
            >
          {showConfirmPassword ? (
            <EyeOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Eye className="h-5 w-5" aria-hidden="true" />
          )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-300">{errors.confirmPassword.message}</p>
          )}
        </div>
          </div>

          {/* Terms checkbox */}
          <div className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          id="termsAccepted"
          {...register("termsAccepted")}
          className={`h-4 w-4 text-primary border-neutral-300 rounded bg-white focus:ring-primary cursor-pointer dark:border-neutral-700 dark:bg-neutral-900 ${
            errors.termsAccepted ? 'border-red-500' : ''
          }`}
          disabled={isSubmitting}
        />
        <label
          htmlFor="termsAccepted"
          className="ml-2 block text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer"
        >
          I accept the{" "}
          <Link href="/pages/legal/terms-of-service" className="text-neutral-900 hover:underline cursor-pointer dark:text-neutral-100">
            terms and conditions
          </Link>
        </label>
          </div>
          {errors.termsAccepted && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-300">{errors.termsAccepted.message}</p>
          )}

          {/* Submit button */}
          <div>
        <button
          type="submit"
          className="w-full h-11 bg-neutral-900 text-white py-3 px-4 rounded-md hover:bg-neutral-800 transition-colors flex items-center justify-center cursor-pointer font-medium dark:bg-white dark:text-black dark:hover:bg-neutral-200"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin h-5 w-5 mr-2" />
          ) : (
            'Sign Up'
          )}
        </button>
          </div>
        </form>
        )}

          {/* Sign in link */}
          <div className="text-center text-sm mt-7 text-neutral-600 dark:text-neutral-400">
        <span>Already have an account? </span>
        <Link href="/auth/signin" className="text-neutral-900 hover:underline dark:text-white">
          Sign In
        </Link>
          </div>

          {/* Legal text */}
          <div className="text-xs text-neutral-600 mt-4 text-center leading-6 dark:text-neutral-500">
        By continuing, you agree to Locked's{' '}
        <Link href="/pages/legal/terms-of-service" className="underline text-neutral-700 dark:text-neutral-300">Terms of Service</Link> and{' '}
        <Link href="/pages/legal/privacy-policy" className="underline text-neutral-700 dark:text-neutral-300">Privacy Policy</Link>.
          </div>

        {/* Success Modal - Standardized Design */}
        {showSuccessModal && (
          <SuccessInfoView
            isModal={true}
            variant="email"
            onClose={handleCloseModal}
            title="Account Created Successfully!"
            message="We've sent a verification link to your email address. Please check your inbox (and spam folder) to activate your account."
            nextSteps={{
              title: "Next Steps:",
              steps: [
                "Check your email inbox for our verification message",
                "Click the verification link to activate your account",
                "Sign in and start discovering amazing events!"
              ]
            }}
            ctaText="Continue to Sign In"
            ctaHref="#"
            onCtaClick={handleCloseModal}
          />
        )}

      </div>
    </div>
  );
}