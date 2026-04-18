"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext'; 
import { useToast } from '@/hooks/useToast';
import { Eye, EyeOff } from 'lucide-react';
import { Mail, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client/client';

// Define form schema using Zod
const signInSchema = z.object({
  identifier: z.string().min(1, 'Please enter your email or phone number'),
  password: z.string().min(1, 'Password is required'),
});

type SignInFormValues = z.infer<typeof signInSchema>;

interface SignInFormSimpleProps {
  returnUrl?: string;
  onSuccess?: () => void;
}

export function SignInFormSimple({ returnUrl, onSuccess }: SignInFormSimpleProps) {
  const { signIn } = useAuth();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
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
      const result = await signIn(data.identifier, data.password);
      
      if (result?.error) {
        // Handle Supabase error
        setError(result.error.message);
        toast.showError('Sign In Failed', result.error.message);
      } else {
        // Success - no error
        toast.showSuccess('Welcome Back!');
        
        // Send security alert email (await with timeout so it actually sends)
        try {
          await Promise.race([
            fetch('/api/auth/security-alert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: result?.email || data.identifier,
                customerName: result?.name || data.identifier,
                browser: window.navigator.userAgent,
                time: new Date().toLocaleString(),
              }),
            }),
            new Promise(resolve => setTimeout(resolve, 3000)) // 3s max wait
          ]);
        } catch (e) {
          // Silent fail - don't block user
        }
        
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(returnUrl || '/');
        }
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

  const handleSocialAuth = async (provider: 'google' | 'facebook') => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`,
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
        toast.showError('Authentication Failed', err.message);
      } else {
        setError('Authentication failed. Please try again.');
        toast.showError('Authentication Failed', 'Please try again.');
      }
      console.error(err);
    }
  };


  return (
    <div className="w-full max-w-md mx-auto">
      {/* Social Authentication Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={() => handleSocialAuth('google')}
          className="h-11 flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium cursor-pointer text-sm"
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
          Google
        </button>
        <button
          type="button"
          onClick={() => handleSocialAuth('facebook')}
          className="h-11 flex items-center justify-center gap-2 bg-[#1877F2] border border-[#1877F2] rounded-lg hover:bg-[#166fe5] transition-colors text-white font-medium cursor-pointer text-sm"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.248h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </button>
      </div>

      {/* Divider */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Or continue with email</span>
        </div>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
            {error.includes("No account found") && (
              <p className="mt-1">
                Don't have an account yet?{" "}
                <Link href="/auth/signup" className="text-primary font-medium hover:underline">
                  Sign up here
                </Link>
              </p>
            )}
          </div>
        )}
        
        <div className="space-y-1">
          <label htmlFor="identifier" className="text-sm font-medium">Email</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-gray-400" />
            </div>
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              className="block w-full h-10 pl-10 pr-3 border border-neutral-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
              placeholder="you@example.com"
              {...register('identifier')}
            />
          </div>
          {errors.identifier && (
            <p className="text-xs text-red-600">{errors.identifier.message}</p>
          )}
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-gray-400" />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="block w-full h-10 pl-10 pr-10 border border-neutral-200 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
              placeholder="••••••••"
              {...register('password')}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full h-10 px-4 rounded-md font-medium transition-colors cursor-pointer ${
            isSubmitting
              ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
              : 'bg-primary text-white hover:bg-primary-dark'
          }`}
        >
          {isSubmitting ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
      
      <div className="text-center text-sm mt-4">
        <span className="text-neutral-600">Don't have an account? </span>
        <Link href="/auth/signup" className="text-primary hover:underline font-medium">
          Sign Up
        </Link>
      </div>
      
      <div className="text-xs text-neutral-500 mt-3 text-center">
        By continuing, you agree to Locked's{' '}
        <Link href="/pages/legal/terms-of-service" className="underline text-primary">Terms</Link> and{' '}
        <Link href="/pages/legal/privacy-policy" className="underline text-primary">Privacy Policy</Link>
      </div>
    </div>
  );
}
