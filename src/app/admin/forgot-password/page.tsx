"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Mail } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { createClient } from '@/lib/supabase/client/client';

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { showError, showSuccess, showInfo } = useToast();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/reset-password`,
      });
      
      if (error) {
        showError('Reset failed', error.message);
      } else {
        setSent(true);
        showSuccess('Reset link sent', 'If that admin account exists, a reset link has been emailed.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      showError('Failed to send reset email', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Reset Password</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                {sent ? 'Check your email for a password reset link.' : 'Enter your admin email to receive a reset link.'}
              </p>
            </div>

            {!sent ? (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Admin Email</label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-neutral-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="admin@locked.gh"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex justify-center items-center py-3 px-4 rounded-lg text-white bg-black hover:bg-gray-800 font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            ) : (
              <div className="space-y-6">
                <button
                  onClick={() => router.push('/admin/login')}
                  className="w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Return to Login
                </button>
                <button
                  onClick={() => {
                    const existing = sessionStorage.getItem('admin_reset_token') || (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
                    router.push(`/admin/reset-password?token=${encodeURIComponent(existing)}`);
                  }}
                  className="w-full py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Go to Reset Form Now
                </button>
              </div>
            )}

            <div className="mt-6 text-center">
              <Link href="/" className="text-sm font-medium text-primary hover:text-primary/80">Return to main site</Link>
            </div>
          </div>
        </div>
        {!sent && (
          <div className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
            Remembered your password?{' '}
            <Link href="/admin/login" className="text-primary hover:text-primary/80 font-medium">Sign in</Link>
          </div>
        )}
      </div>
    </div>
  );
}
