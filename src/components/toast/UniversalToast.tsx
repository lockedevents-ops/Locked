import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Bell } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'default';

export interface UniversalToastProps {
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
    bg: 'bg-black/90 dark:bg-neutral-900/90 border-neutral-700 dark:border-neutral-700',
    icon: 'text-white',
    title: 'text-white',
    description: 'text-neutral-200',
    progress: 'bg-white',
  },
  error: {
    bg: 'bg-red-600/95 dark:bg-red-600/90 border-red-500 dark:border-red-500',
    icon: 'text-white',
    title: 'text-white',
    description: 'text-red-100',
    progress: 'bg-white',
  },
  warning: {
    bg: 'bg-black/90 dark:bg-neutral-900/90 border-neutral-700 dark:border-neutral-700',
    icon: 'text-white',
    title: 'text-white',
    description: 'text-neutral-200',
    progress: 'bg-white',
  },
  info: {
    bg: 'bg-black/90 dark:bg-neutral-900/90 border-neutral-700 dark:border-neutral-700',
    icon: 'text-white',
    title: 'text-white',
    description: 'text-neutral-200',
    progress: 'bg-white',
  },
  default: {
    bg: 'bg-black/90 dark:bg-neutral-900/90 border-neutral-700 dark:border-neutral-700',
    icon: 'text-white',
    title: 'text-white',
    description: 'text-neutral-200',
    progress: 'bg-white',
  },
};

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  default: Bell,
};

export function UniversalToast({
  id,
  type = 'default',
  title,
  description,
  duration = 3000,
  onClose,
  pauseOnHover = true,
}: UniversalToastProps) {
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
            relative w-full md:w-96 md:max-w-sm rounded-lg border shadow-md
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
                ${styles.icon} hover:bg-white/10 dark:hover:bg-white/10 
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
