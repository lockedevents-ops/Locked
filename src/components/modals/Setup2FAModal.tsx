"use client";

import { useState, useEffect } from 'react';
import { X, Shield, Copy, Check, AlertCircle, Loader2, Smartphone, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client/client';
import QRCode from 'qrcode';

interface Setup2FAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type TwoFactorMethod = 'totp' | 'email';
type SetupStep = 'method' | 'qr' | 'verify' | 'email-verify';

export default function Setup2FAModal({ isOpen, onClose, onSuccess }: Setup2FAModalProps) {
  const [step, setStep] = useState<SetupStep>('method');
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethod | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [factorId, setFactorId] = useState<string>('');
  const [emailSent, setEmailSent] = useState(false);

  const supabase = createClient();

  // Generate QR code when user selects TOTP method
  useEffect(() => {
    if (isOpen && step === 'qr' && selectedMethod === 'totp') {
      enrollMFA();
    }
  }, [isOpen, step, selectedMethod]);

  const enrollMFA = async () => {
    try {
      setIsLoading(true);
      setError('');

      // First, check for existing unverified factors and remove them
      const { data: existingFactors } = await supabase.auth.mfa.listFactors();
      if (existingFactors && existingFactors.totp && existingFactors.totp.length > 0) {
        // Remove any unverified factors (status !== 'verified')
        for (const factor of existingFactors.totp) {
          if (factor.status !== 'verified') {
            await supabase.auth.mfa.unenroll({ factorId: factor.id });
          }
        }
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });

      if (enrollError) throw enrollError;

      if (data) {
        setFactorId(data.id);
        setSecret(data.totp.secret);
        
        // Generate QR code from the URI
        const qrCode = await QRCode.toDataURL(data.totp.uri);
        setQrCodeUrl(qrCode);
      }
    } catch (err: any) {
      console.error('MFA enrollment error:', err);
      setError(err.message || 'Failed to set up 2FA. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sendEmailOTP = async () => {
    try {
      setIsLoading(true);
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
      setStep('email-verify');
    } catch (err: any) {
      console.error('Error sending email OTP:', err);
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmailOTP = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/auth/2fa/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      // Update security settings to enable email 2FA
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: updateError } = await supabase
          .from('security_settings')
          .upsert({
            user_id: user.id,
            two_factor_enabled: true,
            two_factor_method: 'email',
            two_factor_methods: ['email']
          }, {
            onConflict: 'user_id'
          });

        if (updateError) throw updateError;
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Email OTP verification error:', err);
      setError(err.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const { data, error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: verificationCode
      });

      if (verifyError) throw verifyError;

      if (data) {
        // Success! 2FA is now enabled
        onSuccess();
        handleClose();
      }
    } catch (err: any) {
      console.error('MFA verification error:', err);
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Clean up any unverified factors when closing
    if (factorId && step === 'qr') {
      // If user closes before verification, unenroll the factor
      supabase.auth.mfa.unenroll({ factorId }).catch(console.error);
    }
    
    setStep('method');
    setSelectedMethod(null);
    setQrCodeUrl('');
    setSecret('');
    setVerificationCode('');
    setError('');
    setCopied(false);
    setFactorId('');
    setEmailSent(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Enable Two-Factor Authentication
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Method Selection Step */}
          {step === 'method' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Choose Your 2FA Method
                </h3>
                <p className="text-sm text-gray-600">
                  Select how you want to secure your account
                </p>
              </div>

              <div className="space-y-3">
                {/* Authenticator App Option */}
                <button
                  onClick={() => {
                    setSelectedMethod('totp');
                    setStep('qr');
                  }}
                  className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-black hover:bg-gray-50 transition-all group text-left cursor-pointer"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-black group-hover:text-white transition-colors">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-1">Authenticator App</h4>
                      <p className="text-sm text-gray-600">
                        Use Google Authenticator, Authy, or any TOTP app to generate codes
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        ✓ Works offline · ✓ More secure
                      </p>
                    </div>
                  </div>
                </button>

                {/* Email Option - Disabled (Requires Domain) */}
                <div className="relative group/tooltip">
                  <button
                    disabled
                    className="w-full p-4 border-2 border-gray-200 rounded-lg opacity-50 cursor-not-allowed text-left"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Mail className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">Email Code</h4>
                        <p className="text-sm text-gray-600">
                          Receive a 6-digit code via email each time you sign in
                        </p>
                        <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                          <span>⚠️</span> Requires domain verification
                        </p>
                      </div>
                    </div>
                  </button>
                  
                  {/* Tooltip */}
                  <div className="absolute left-0 right-0 top-full mt-2 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 shadow-lg">
                    <p className="font-medium mb-1">Domain Verification Required</p>
                    <p className="text-gray-300">
                      Email 2FA requires domain verification at <span className="text-blue-300">resend.com/domains</span>. 
                      Use <strong>Authenticator App</strong> for immediate 2FA protection.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TOTP QR Code Step */}
          {step === 'qr' && selectedMethod === 'totp' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Step 1: Scan QR Code
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Use Google Authenticator, Authy, or any TOTP app to scan this QR code
                </p>

                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 text-black animate-spin" />
                  </div>
                ) : qrCodeUrl ? (
                  <div className="flex justify-center mb-6">
                    <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                      <img src={qrCodeUrl} alt="2FA QR Code" className="w-64 h-64" />
                    </div>
                  </div>
                ) : null}

                <div className="mt-6">
                  <p className="text-sm text-gray-600 mb-2">Or enter this code manually:</p>
                  <div className="flex items-center gap-2 justify-center">
                    <code className="px-4 py-2 bg-gray-100 rounded text-sm font-mono text-gray-800">
                      {secret}
                    </code>
                    <button
                      onClick={handleCopySecret}
                      className="p-2 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                      title="Copy secret"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep('verify')}
                disabled={isLoading || !qrCodeUrl}
                className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer"
              >
                Next: Verify Code
              </button>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Step 2: Verify Setup
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Enter the 6-digit code from your authenticator app
                </p>

                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setVerificationCode(value);
                    setError('');
                  }}
                  placeholder="000000"
                  className="w-full text-center text-2xl font-mono tracking-wider px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('qr')}
                  disabled={isLoading}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleVerify}
                  disabled={isLoading || verificationCode.length !== 6}
                  className="flex-1 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? 'Verifying...' : 'Enable 2FA'}
                </button>
              </div>
            </div>
          )}

          {/* Email OTP Verification Step */}
          {step === 'email-verify' && selectedMethod === 'email' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Verify Email Code
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  We sent a 6-digit code to your email. Enter it below to complete setup.
                </p>

                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setVerificationCode(value);
                    setError('');
                  }}
                  placeholder="000000"
                  className="w-full text-center text-2xl font-mono tracking-wider px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none"
                  autoFocus
                  disabled={isLoading}
                />

                <button
                  onClick={sendEmailOTP}
                  disabled={isLoading}
                  className="mt-4 text-sm text-gray-600 hover:text-black underline disabled:opacity-50 cursor-pointer"
                >
                  Didn't receive the code? Send again
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('method');
                    setVerificationCode('');
                    setError('');
                  }}
                  disabled={isLoading}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={verifyEmailOTP}
                  disabled={isLoading || verificationCode.length !== 6}
                  className="flex-1 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isLoading ? 'Verifying...' : 'Enable 2FA'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <p className="text-xs text-gray-600">
            <strong>Note:</strong> After enabling 2FA, you&apos;ll need to enter a code from your authenticator app each time you sign in.
          </p>
        </div>
      </div>
    </div>
  );
}
