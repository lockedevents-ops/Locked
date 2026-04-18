"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ShieldCheck, Lock, User, Mail, AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/contexts/AuthContext';
import { loginAdminAction } from '@/actions/adminAuth';
import { createClient } from '@/lib/supabase/client/client';

export default function AdminLogin() {
  // Use HTML form state for Server Actions compatibility
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // State for lockout implementation
  const [lockoutEndTime, setLockoutEndTime] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string | null>(null); // formatted HH:MM:SS
  
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  // We still use useAuth for post-login state sync, but NOT for the login action itself
  const { isAuthenticated, isAdmin, refreshSession, setIsLoggingIn } = useAuth();

  // If already authenticated and has admin role, redirect to /admin
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      router.replace('/admin');
    }
  }, [isAuthenticated, isAdmin, router]);

  // Handle countdown timer for locked out users
  useEffect(() => {
    if (!lockoutEndTime) return;
    
    const interval = setInterval(() => {
      const end = new Date(lockoutEndTime).getTime();
      const now = new Date().getTime();
      const diff = end - now;

      if (diff <= 0) {
        setLockoutEndTime(null);
        setTimeLeft(null);
        clearInterval(interval);
        return;
      }

      // Format diff (ms) to HH:MM:SS
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours > 0 ? hours.toString().padStart(2, '0') + ':' : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [lockoutEndTime]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (lockoutEndTime) return;
    
    setIsLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const result = await loginAdminAction(formData);
      
      if (!result.success) {
        // Handle Lockout
        if (result.lockout) {
          if (result.lockout.lockedUntil) {
            setLockoutEndTime(result.lockout.lockedUntil);
          } else {
             // Fallback if timestamp missing (legacy/race condition)
             const fallbackDate = new Date();
             fallbackDate.setMinutes(fallbackDate.getMinutes() + result.lockout.remainingMinutes);
             setLockoutEndTime(fallbackDate.toISOString());
          }
          showError('Account Locked', `Too many failed attempts. Access temporarily suspended.`);
          return;
        }
        
        // Handle Generic Error (Sanitized)
        showError('Authentication Failed', result.error || 'Invalid email or password.');
        return;
      }

      // RACE CONDITION FIX: Set isLoggingIn flag to prevent layout from redirecting
      // while we're setting up the session on the browser client
      setIsLoggingIn(true);
      
      // CRITICAL FIX: Set the session on the browser client before refreshing state
      // The server action authenticated the user and set HttpOnly cookies, but
      // the browser Supabase client doesn't see them until a page refresh.
      // By calling setSession() with the tokens, we immediately sync the browser client.
      if (result.session) {
        const supabase = createClient();
        await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });
      }
      
      // Sync client-side auth state (refreshSession now fetches roles and profile immediately)
      await refreshSession({ isLogin: true });
      // Note: isAuthenticated/isAdmin here are stale closure values, not the new state
      
      showSuccess('Login Successful', 'Welcome to the admin dashboard');
      
      // Small delay to ensure React state batching completes before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Force router refresh to ensure cookies are seen by server components
      router.refresh();
      
      // Explicitly navigate instead of waiting for useEffect (safeguard)
      router.replace('/admin');
      
    } catch (error: any) {
      console.error('[AdminLogin] Login error:', error);
      showError('System Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
      // Clear the logging in flag (navigation should have happened by now)
      // Small delay to ensure navigation has started
      setTimeout(() => setIsLoggingIn(false), 500);
    }
  };
  
  return (
      <div className="w-full min-h-screen flex items-center justify-center bg-neutral-100 dark:bg-black px-4">
      <div className="w-full flex flex-col md:flex-row bg-white dark:bg-neutral-900 rounded-3xl shadow-lg overflow-hidden md:max-w-5xl mx-auto min-h-[650px]">
        
        {/* Left column: Form */}
        <div className="flex-1 flex flex-col justify-center items-center px-8 py-14 md:px-8 md:py-20 min-h-[650px]">
          <div className="w-full max-w-md flex flex-col justify-center">
            <div className="text-left mb-10">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center rounded-full bg-primary/10 p-2">
                  <ShieldCheck className="h-7 w-7 text-primary" />
                </span>
                <h1 className="text-3xl font-extrabold text-primary tracking-tight">Admin Login</h1>
              </div>
              <p className="text-base text-neutral-600 dark:text-neutral-400 mt-3">Sign in to access the admin dashboard</p>
            </div>

            {lockoutEndTime ? (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/10 p-8 border border-red-100 dark:border-red-900/20 text-center animate-in fade-in zoom-in duration-300">
                <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-4">Security Lockout</h3>
                <p className="text-sm text-red-600 dark:text-red-300 mb-6">
                  Too many failed attempts. Access to this resource has been temporarily suspended.
                </p>
                <div className="inline-block px-6 py-3 bg-white dark:bg-neutral-900 rounded-md border border-red-200 dark:border-red-800 font-mono text-xl font-medium text-red-600 dark:text-red-400 mb-2">
                   {timeLeft || '...'}
                </div>
                <div className="mt-6 pt-6 border-t border-red-100 dark:border-red-900/20">
                  <p className="text-xs text-red-500 dark:text-red-400">
                    Need immediate access? <a href="#" className="underline font-medium hover:text-red-700">Contact Support</a>
                  </p>
                  <p className="text-[10px] text-red-400/40 dark:text-red-500/30 mt-4 italic select-none">
                    (Locked out of Locked... ironic, isn&apos;t it?)
                  </p>
                </div>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* ... existing form code ... */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="block w-full h-12 pl-11 pr-4 border border-gray-300 dark:border-neutral-800 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="admin@locked.gh"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Password
                    </label>
                    <Link
                      href="/admin/forgot-password"
                      className="text-xs text-primary hover:text-primary/80 cursor-pointer"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      className="block w-full h-12 pl-11 pr-11 border border-gray-300 dark:border-neutral-800 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="cursor-pointer w-full flex justify-center items-center h-12 px-4 rounded-md shadow-sm text-base font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all disabled:cursor-not-allowed disabled:hover:bg-black overflow-hidden relative"
                  >
                    {isLoading ? (
                      <>
                        {/* Modern animated gradient background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                        
                        {/* Loading dots animation */}
                        <div className="relative flex items-center gap-1.5">
                          <div className="flex gap-1.5">
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                          <span className="ml-2 font-medium text-sm tracking-wide">Verifying</span>
                        </div>
                      </>
                    ) : (
                      'Sign in'
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center">
              <Link
                href="/"
                className="text-sm font-medium text-primary hover:text-primary/80"
              >
                Return to main site
              </Link>
            </div>

            {/* Security note */}
            <span className="block mt-4 px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2 border-t border-gray-100 dark:border-gray-800 pt-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Protected System. All activities are monitored.
            </span>
          </div>
        </div>

      
        {/* Right column: Banner/Info */}
        <div className="hidden md:flex flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-900 relative p-3">
          <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg">
            <Image 
              src={lockoutEndTime ? "/images/failed-login-2.jpg" : "/images/admin.jpg"} 
              alt="Admin login banner"
              fill
              className="absolute inset-0 w-full h-full object-cover object-center z-0"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-neutral-100 dark:from-primary/10 dark:to-neutral-900 z-10" />
            <div className="absolute bottom-0 left-0 w-full px-8 pb-8 z-20 flex flex-col items-center">
              <div className="max-w-sm w-full bg-gradient-to-br from-primary/10 to-white/70 dark:from-primary/10 dark:to-neutral-900/70 rounded-3xl p-6 shadow-lg backdrop-blur-md min-h-[140px] flex flex-col justify-center border border-primary/20">
                <div className="flex items-center gap-3 mb-2">
                  <span className="inline-flex items-center justify-center rounded-full bg-primary/10 p-2">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </span>
                  <h2 className="text-base font-semibold text-primary">Secure Access</h2>
                </div>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 mb-2">
                  Manage events, venues, users, and platform settings securely.<br />
                  <span className="font-medium text-primary">Access is restricted to authorized personnel only.</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

