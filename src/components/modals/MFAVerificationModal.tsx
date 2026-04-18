"use client";

import { useState } from 'react';
import { X, Shield, AlertCircle, Loader2, Smartphone, Mail } from 'lucide-react';

interface MFAVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string, method?: 'totp' | 'email') => Promise<void>;
  email?: string;
  availableMethods?: Array<'totp' | 'email'>; // Which 2FA methods user has enabled
}

export default function MFAVerificationModal({ 
  isOpen, 
  onClose, 
  onVerify,
  email,
  availableMethods = ['totp'] // Default to TOTP for backward compatibility
}: MFAVerificationModalProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<'totp' | 'email'>(
    availableMethods[0] || 'totp'
  );
  const [emailSent, setEmailSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const sendEmailCode = async () => {
    try {
      setSendingEmail(true);
      setError('');

      const response = await fetch('/api/auth/2fa/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send code');
      }

      setEmailSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      await onVerify(verificationCode, selectedMethod);
      // Success handled by parent component
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && verificationCode.length === 6) {
      handleVerify();
    }
  };

  const handleMethodChange = (method: 'totp' | 'email') => {
    setSelectedMethod(method);
    setVerificationCode('');
    setError('');
    setEmailSent(false);
    
    // Auto-send email when switching to email method
    if (method === 'email') {
      sendEmailCode();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Two-Factor Authentication
              </h2>
              {email && (
                <p className="text-sm text-gray-600 mt-0.5">
                  Signing in as {email}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            disabled={isVerifying}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Method Selection (if multiple methods available) */}
          {availableMethods.length > 1 && (
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                onClick={() => handleMethodChange('totp')}
                disabled={isVerifying}
                className={`flex-1 py-2 px-3 rounded-md transition-colors font-medium text-sm flex items-center justify-center gap-2 cursor-pointer ${
                  selectedMethod === 'totp'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                Authenticator App
              </button>
              <button
                onClick={() => handleMethodChange('email')}
                disabled={isVerifying}
                className={`flex-1 py-2 px-3 rounded-md transition-colors font-medium text-sm flex items-center justify-center gap-2 cursor-pointer ${
                  selectedMethod === 'email'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-600 hover:text-black'
                }`}
              >
                <Mail className="w-4 h-4" />
                Email Code
              </button>
            </div>
          )}

          <div className="text-center space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {selectedMethod === 'totp' ? 'Enter Authenticator Code' : 'Enter Email Code'}
              </h3>
              <p className="text-sm text-gray-600">
                {selectedMethod === 'totp'
                  ? 'Open your authenticator app and enter the 6-digit code'
                  : emailSent
                  ? 'We sent a 6-digit code to your email'
                  : 'Sending verification code to your email...'}
              </p>
            </div>

            <input
              type="text"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setVerificationCode(value);
                setError('');
              }}
              onKeyPress={handleKeyPress}
              placeholder="000000"
              className="w-full text-center text-2xl font-mono tracking-wider px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none"
              autoFocus
              disabled={isVerifying}
            />

            {/* Resend email button for email method */}
            {selectedMethod === 'email' && (
              <button
                onClick={sendEmailCode}
                disabled={sendingEmail}
                className="mt-4 text-sm text-gray-600 hover:text-black underline disabled:opacity-50 cursor-pointer"
              >
                {sendingEmail ? 'Sending...' : "Didn't receive the code? Send again"}
              </button>
            )}
          </div>

          <button
            onClick={handleVerify}
            disabled={isVerifying || verificationCode.length !== 6}
            className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2 cursor-pointer"
          >
            {isVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
            {isVerifying ? 'Verifying...' : 'Verify & Sign In'}
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <p className="text-xs text-gray-600 text-center">
            Can&apos;t access your authenticator app? Contact support for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}
