"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Lock } from 'lucide-react';
import Image from 'next/image';
import { SuccessInfoView } from '@/components/ui/SuccessInfoView';

// Define form schema using Zod
const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const { updatePassword } = useAuth();
  
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
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const { error } = await updatePassword(data.password);
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // Trigger notification
        fetch('/api/auth/password-updated', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            browser: window.navigator.userAgent,
            time: new Date().toLocaleString()
          })
        }).catch(err => console.error('Silent notification error:', err));
      }
    } catch (err) {
      setError('Unable to reset your password. The link may have expired.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col md:flex-row bg-white rounded-3xl shadow-lg overflow-hidden md:max-w-5xl mx-auto md:min-h-[650px] max-h-[90vh]">
      {/* Left column: Form/Success */}
      <div className="flex-1 flex flex-col justify-center px-6 py-8 md:px-12 md:py-12 overflow-y-auto">
        {success ? (
          <SuccessInfoView
            noBackground={true}
            title="Password Reset Complete"
            message="Your password has been successfully reset. You can now sign in with your new password and continue exploring Locked."
            ctaText="Return to Sign In"
            ctaHref="/auth/signin"
          />
        ) : (
          <div className="max-w-md w-full mx-auto">
            <div className="text-left mb-8">
              <h1 className="text-3xl font-bold">Reset Your Password</h1>
              <p className="text-md text-neutral-500 mt-2">Enter your new secure password below to regain access.</p>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              {/* New Password Field */}
              <div className="space-y-1">
                <label htmlFor="password" className="text-sm font-medium">New Password</label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="block w-full h-12 pl-11 pr-11 border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="••••••••"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-error">{errors.password.message}</p>
                )}
              </div>
              
              {/* Confirm Password Field */}
              <div className="space-y-1">
                <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</label>
                <div className="relative rounded-lg">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="block w-full h-12 pl-11 pr-11 border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm"
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-error">{errors.confirmPassword.message}</p>
                )}
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full h-12 py-2 px-4 rounded-md mt-2 transition-all ${
                  isSubmitting
                    ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary-dark cursor-pointer'
                }`}
              >
                {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </form>
            
            <div className="text-center text-sm mt-8">
              <span>Remember your password? </span>
              <Link href="/auth/signin" className="text-primary font-medium hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Right column: Banner/Info */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-neutral-50 relative p-3">
        <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg">
          <Image 
            src="/images/forgot-password-1.jpg" 
            alt="Security reset"
            fill
            className="absolute inset-0 w-full h-full object-cover object-center z-0"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-neutral-100/50 z-10" />
          <div className="relative z-20 flex flex-col items-center justify-center h-full w-full px-8">
          </div>
        </div>
      </div>
    </div>
  );
}

