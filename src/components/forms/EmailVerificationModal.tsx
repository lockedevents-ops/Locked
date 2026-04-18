"use client";

import { useState, useRef, useEffect } from 'react';
import { ModalBackdrop } from '@/components/ui/ModalBackdrop';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';

interface EmailVerificationModalProps {
  email: string;
  isOpen: boolean;
  onVerify: (code: string) => Promise<void>;
  onResend?: () => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function EmailVerificationModal({
  email,
  isOpen,
  onVerify,
  onResend,
  onClose,
  isLoading = false,
  error
}: EmailVerificationModalProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input when modal opens
  useEffect(() => {
    if (isOpen && inputRefs.current[0]) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (newCode.every(digit => digit !== '') && !isLoading) {
      handleSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    
    // Handle paste
    if (e.key === 'v' && e.ctrlKey) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, 6);
        if (digits.length === 6) {
          const newCode = digits.split('');
          setCode(newCode);
          // Auto-submit pasted code
          setTimeout(() => handleSubmit(digits), 100);
        }
      });
    }
  };

  const handleSubmit = async (codeString?: string) => {
    const finalCode = codeString || code.join('');
    if (finalCode.length !== 6) return;

    try {
      await onVerify(finalCode);
    } catch (error) {
      // Error handling is managed by parent component
      console.error('Verification failed:', error);
    }
  };

  const handleResend = async () => {
    if (!onResend || isResending) return;

    setIsResending(true);
    try {
      await onResend();
    } catch (error) {
      console.error('Resend failed:', error);
    } finally {
      setIsResending(false);
    }
  };

  const clearCode = () => {
    setCode(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };

  if (!isOpen) return null;

  return (
    <ModalBackdrop onClick={() => {}}>
      <div 
        className="bg-white rounded-xl p-6 sm:p-8 max-w-md w-full mx-4 sm:mx-auto shadow-xl animate-fade-in" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-gray-700" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2 text-black">Verify Your Email</h2>
          <p className="text-gray-600 text-sm">
            We've sent a verification code to
          </p>
          <p className="text-black font-medium text-sm sm:text-base">{email}</p>
        </div>

        {/* Code Input */}
        <div className="mb-6">
          <div className="flex justify-center space-x-2 sm:space-x-3 mb-4">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-10 h-10 sm:w-12 sm:h-12 text-center text-lg sm:text-xl font-semibold border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none transition-colors disabled:bg-gray-50"
                disabled={isLoading}
              />
            ))}
          </div>
          
          {error && (
            <p className="text-red-600 text-sm text-center mb-4">{error}</p>
          )}

          {/* Email verification info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-blue-700 text-xs sm:text-sm text-center">
              A verification link has been sent to your email. Click the link to verify your account.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 sm:space-y-4">
          <button
            onClick={() => handleSubmit()}
            disabled={code.join('').length !== 6 || isLoading}
            className="w-full bg-black text-white py-3 px-4 rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-sm sm:text-base"
          >
            {isLoading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              'Verify Email'
            )}
          </button>

            <div className="flex items-center justify-between text-xs sm:text-sm">
            <button
              onClick={clearCode}
              disabled={isLoading}
              className="text-gray-600 hover:text-black disabled:text-gray-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Clear Code
            </button>

            <button
              onClick={handleResend}
              disabled={isResending || isLoading}
              className="text-gray-600 hover:text-black disabled:text-gray-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              {isResending ? (
              <span className="flex items-center">
                <Loader2 className="animate-spin h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Sending...
              </span>
              ) : (
              'Resend Code'
              )}
            </button>
            </div>

            <button
            onClick={onClose}
            disabled={isLoading}
            className="w-full text-gray-600 hover:text-black py-2 flex items-center justify-center disabled:text-gray-400 transition-colors text-sm sm:text-base cursor-pointer disabled:cursor-not-allowed"
            >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign Up
            </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
