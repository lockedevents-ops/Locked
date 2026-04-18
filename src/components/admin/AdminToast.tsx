import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Bell } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'default';

export interface AdminToastProps {
  id: string;
  type?: ToastType;
  title: string;
  description?: string;
  duration?: number;
  onClose: (id: string) => void;
  pauseOnHover?: boolean;
}

const toastStyles = {
  success: {
  bg: 'bg-green-50/90 dark:bg-green-900/40 border-green-200 dark:border-green-700',
    icon: 'text-green-500 dark:text-green-400',
    title: 'text-green-800 dark:text-green-200',
    description: 'text-green-700 dark:text-green-300',
    progress: 'bg-green-500 dark:bg-green-400',
  },
  error: {
  bg: 'bg-red-50/90 dark:bg-red-900/40 border-red-200 dark:border-red-700',
    icon: 'text-red-500 dark:text-red-400',
    title: 'text-red-800 dark:text-red-200',
    description: 'text-red-700 dark:text-red-300',
    progress: 'bg-red-500 dark:bg-red-400',
  },
  warning: {
  bg: 'bg-amber-50/90 dark:bg-amber-900/40 border-amber-200 dark:border-amber-700',
    icon: 'text-amber-500 dark:text-amber-400',
    title: 'text-amber-800 dark:text-amber-200',
    description: 'text-amber-700 dark:text-amber-300',
    progress: 'bg-amber-500 dark:bg-amber-400',
  },
  info: {
  bg: 'bg-blue-50/90 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700',
    icon: 'text-blue-500 dark:text-blue-400',
    title: 'text-blue-800 dark:text-blue-200',
    description: 'text-blue-700 dark:text-blue-300',
    progress: 'bg-blue-500 dark:bg-blue-400',
  },
  default: {
  bg: 'bg-white/90 dark:bg-neutral-800/85 border-gray-200/80 dark:border-neutral-700/70',
    icon: 'text-gray-500 dark:text-gray-400',
    title: 'text-gray-800 dark:text-gray-200',
    description: 'text-gray-600 dark:text-gray-300',
    progress: 'bg-gray-500 dark:bg-gray-400',
  },
};

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  default: Bell,
};

export function AdminToast({
  id,
  type = 'default',
  title,
  description,
  duration = 3000,
  onClose,
  pauseOnHover = true,
}: AdminToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const styles = toastStyles[type];
  const Icon = iconMap[type];

  useEffect(() => {
    if (!isVisible || isPaused) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300); // Wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose, isVisible, isPaused]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  const handleMouseEnter = () => {
    if (pauseOnHover) setIsPaused(true);
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) setIsPaused(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          layout
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ 
            type: "spring", 
            damping: 30, 
            stiffness: 400,
            mass: 0.8
          }}
          className={`
            relative w-96 max-w-sm rounded-lg border shadow-md
            backdrop-blur-md backdrop-saturate-150
            ring-1 ring-black/5 dark:ring-white/10
            ${styles.bg}
          `}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start gap-3 p-4">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">
              <Icon className={`h-5 w-5 ${styles.icon}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-semibold ${styles.title} leading-5`}>
                {title}
              </h4>
              {description && (
                <p className={`text-sm ${styles.description} mt-1 leading-5`}>
                  {description}
                </p>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className={`
                flex-shrink-0 rounded-md p-1.5 inline-flex 
                ${styles.icon} hover:bg-black/5 dark:hover:bg-white/5 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                transition-colors cursor-pointer
              `}
              aria-label="Close notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
