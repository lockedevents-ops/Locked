"use client";

import { useState, useEffect } from 'react';
import { SimpleLoadingSpinner } from '@/components/ui/SimpleLoadingSpinner';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Eye, EyeOff } from 'lucide-react';
// Replaced react-toastify with custom Admin Toast system
import { useToast } from '@/hooks/useToast';
import { createClient } from '@/lib/supabase/client/client';
import { Suspense } from 'react';

function AdminResetPasswordContent() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { showError, showSuccess } = useToast();


  useEffect(() => {
    // Handle the reset password flow from Supabase
    const handleAuthStateChange = async () => {
      // ✅ SECURITY: Verify user authentication
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        // If no valid user, check for tokens in URL
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const type = searchParams.get('type');
        
        if (type === 'recovery' && accessToken && refreshToken) {
          // Set the session from the recovery link
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('Error setting session:', error);
            showError('Invalid reset link', 'Please request a new password reset link.');
            router.push('/admin/forgot-password');
          }
        }
      }
    };

    handleAuthStateChange();
  }, [searchParams, router, supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      showError('Missing fields', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      showError('Weak password', 'Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        showError('Update failed', error.message);
      } else {
        setSuccess(true);
        showSuccess('Password updated', 'You can now log in with your new password.');

        // Redirect to admin login after a short delay
        setTimeout(() => {
          router.push('/admin/login');
        }, 2000);
      }
    } catch (error) {
      console.error('Reset password error:', error);
      showError('Reset failed', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-black dark:to-neutral-900 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-neutral-900 shadow-xl rounded-2xl overflow-hidden">
            <div className="p-8 text-center">
              <div className="flex items-center justify-center mb-6">
                <div className="relative h-12 w-12 mr-3">
                  <Image src="/logo.png" alt="Locked Logo" fill className="object-contain" sizes="48px" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Password Reset Complete</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your admin password has been successfully updated. You can now sign in with your new password.
              </p>
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mx-auto flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <Link href="/admin/login" className="inline-block py-3 px-6 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors">
                Go to Admin Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-black dark:to-neutral-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-neutral-900 shadow-xl rounded-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="flex items-center mb-4">
                <div className="relative h-12 w-12 mr-3">
                  <Image src="/logo.png" alt="Locked Logo" fill className="object-contain" sizes="48px" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Reset Admin Password</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                Enter your new admin password below.
              </p>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-11 py-3 border border-gray-300 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="••••••••"
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-11 pr-11 py-3 border border-gray-300 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="••••••••"
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center items-center py-3 px-4 rounded-lg text-white bg-black hover:bg-gray-800 font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/admin/login" className="text-sm font-medium text-primary hover:text-primary/80">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
  <SimpleLoadingSpinner message="Loading reset form" />
      </div>
    }>
      <AdminResetPasswordContent />
    </Suspense>
  );
}
