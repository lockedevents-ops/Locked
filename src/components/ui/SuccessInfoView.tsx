import { Mail, CheckCircle, ArrowRight, AlertCircle, Info, XCircle } from 'lucide-react';
import Link from 'next/link';

type AuthCardVariant = 'success' | 'error' | 'warning' | 'info' | 'email';

interface SuccessInfoViewProps {
  title: string;
  message: string;
  variant?: AuthCardVariant;
  nextSteps?: {
    title: string;
    steps: string[];
  };
  ctaText?: string;
  ctaHref?: string;
  onCtaClick?: () => void;
  isModal?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
  noBackground?: boolean;
}

export function SuccessInfoView({
  title,
  message,
  variant = 'success',
  nextSteps,
  ctaText,
  ctaHref,
  onCtaClick,
  isModal = false,
  onClose,
  children,
  noBackground = false
}: SuccessInfoViewProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'email':
        return {
          icon: <Mail className="h-8 w-8 text-white" strokeWidth={2.5} />,
          bg: 'bg-blue-100',
          gradient: 'from-blue-500 to-indigo-600',
          ring: 'bg-blue-50'
        };
      case 'error':
        return {
          icon: <XCircle className="h-8 w-8 text-white" strokeWidth={3} />,
          bg: 'bg-red-100',
          gradient: 'from-red-500 to-red-600',
          ring: 'bg-red-50'
        };
      case 'warning':
        return {
          icon: <AlertCircle className="h-8 w-8 text-white" strokeWidth={3} />,
          bg: 'bg-amber-100',
          gradient: 'from-amber-500 to-amber-600',
          ring: 'bg-amber-50'
        };
      case 'info':
        return {
          icon: <Info className="h-8 w-8 text-white" strokeWidth={3} />,
          bg: 'bg-blue-100',
          gradient: 'from-blue-500 to-blue-600',
          ring: 'bg-blue-50'
        };
      default:
        return {
          icon: <CheckCircle className="h-8 w-8 text-white" strokeWidth={3} />,
          bg: 'bg-green-100',
          gradient: 'from-green-500 to-green-600',
          ring: 'bg-green-50'
        };
    }
  };

  const styles = getVariantStyles();

  const content = (
    <div className={`p-8 md:p-10 max-w-lg w-full text-center relative ${
      noBackground 
        ? 'bg-transparent' 
        : 'bg-white rounded-2xl shadow-2xl border border-gray-100'
    } ${isModal ? 'animate-in zoom-in-95 duration-300' : ''}`}>
      {isModal && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Icon Area */}
      <div className="relative inline-flex items-center justify-center mb-6">
        <div className={`absolute w-20 h-20 ${styles.ring} rounded-full animate-ping opacity-75`}></div>
        <div className={`absolute w-20 h-20 ${styles.ring} rounded-full`}></div>
        <div className={`relative inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${styles.gradient} rounded-full shadow-lg`}>
          {styles.icon}
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl md:text-3xl font-bold mb-3 text-gray-900">
        {title}
      </h2>

      {/* Message */}
      <p className="text-gray-600 mb-6 leading-relaxed">
        {message}
      </p>

      {/* Next Steps / Info Box */}
      {nextSteps && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-5 mb-6 text-left border border-blue-100/50">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-600" />
            {nextSteps.title}
          </h3>
          <ol className="space-y-2 text-sm text-gray-700">
            {nextSteps.steps.map((step, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex-shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Children Content (Optional extra buttons/links) */}
      <div className="space-y-3">
        {ctaText && (
          onCtaClick ? (
            <button
              onClick={onCtaClick}
              className="w-full bg-gradient-to-r from-black to-gray-800 text-white py-4 px-6 rounded-xl font-semibold hover:from-gray-800 hover:to-gray-900 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              {ctaText}
              <ArrowRight className="h-5 w-5" />
            </button>
          ) : (
            ctaHref && (
              <Link
                href={ctaHref}
                className="w-full bg-gradient-to-r from-black to-gray-800 text-white py-4 px-6 rounded-xl font-semibold hover:from-gray-800 hover:to-gray-900 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {ctaText}
                <ArrowRight className="h-5 w-5" />
              </Link>
            )
          )
        )}
        {children}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 px-4 animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  return content;
}

