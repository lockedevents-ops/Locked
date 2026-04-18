"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { SuccessInfoView } from '@/components/ui/SuccessInfoView';
import Link from 'next/link';
import { Mail } from 'lucide-react';

// Define form schema using Zod
const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Use our custom API to send the reset email
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });
      
      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Failed to send reset email');
      }
      
      setSuccess(true);
    } catch (err) {
      setError('Unable to process your request. Please try again later.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="px-5 py-7 sm:px-8 sm:py-9">
        {success ? (
          <SuccessInfoView
            variant="email"
            noBackground={true}
            title="Check Your Email"
            message="We've sent a password reset link to your email address. Please check your inbox (and spam folder) to reset your password."
            nextSteps={{
              title: "What's next?",
              steps: [
                "Open the email from Locked",
                "Click the password reset link",
                "Set your new secure password"
              ]
            }}
            ctaText="Return to Sign In"
            ctaHref="/auth/signin"
          />
        ) : (
          <div className="max-w-md w-full mx-auto">
            <div className="mb-7 flex flex-col items-start">
              <h1 className="text-3xl font-semibold tracking-tight text-left text-neutral-900 dark:text-white">Trouble signing in?</h1>
              <p className="text-sm text-neutral-600 mt-2 text-left dark:text-neutral-400">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-700 rounded-md text-sm dark:text-red-300">
                  {error}
                </div>
              )}
              <div className="space-y-1">
                <label htmlFor="email" className="text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-200">Email</label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    className="block w-full h-12 pl-11 pr-4 border border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-500"
                    placeholder="you@example.com"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-600 dark:text-red-300">{errors.email.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full h-11 py-2 px-4 rounded-md mt-2 transition-all font-medium ${
                  isSubmitting
                    ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-500'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800 cursor-pointer dark:bg-white dark:text-black dark:hover:bg-neutral-200'
                }`}
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            <div className="text-center text-sm mt-7 text-neutral-600 dark:text-neutral-400">
              <span>Remember your password? </span>
              <Link href="/auth/signin" className="text-neutral-900 font-medium hover:underline dark:text-white">
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

