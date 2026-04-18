import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AdminToast, AdminToastProps, ToastType } from './AdminToast';
import { motion, AnimatePresence } from 'framer-motion';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  pauseOnHover?: boolean;
}

interface AdminToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showSuccess: (title: string, description?: string, duration?: number) => void;
  showError: (title: string, description?: string, duration?: number) => void;
  showWarning: (title: string, description?: string, duration?: number) => void;
  showInfo: (title: string, description?: string, duration?: number) => void;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}

const AdminToastContext = createContext<AdminToastContextType | undefined>(undefined);

export function useAdminToast() {
  const context = useContext(AdminToastContext);
  if (!context) {
    throw new Error('useAdminToast must be used within an AdminToastProvider');
  }
  return context;
}

interface AdminToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export function AdminToastProvider({ children, maxToasts = 5 }: AdminToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    const newToast: Toast = {
      id,
      duration: 3000,
      pauseOnHover: true,
      ...toast,
    };

    setToasts(prev => {
      const updated = [newToast, ...prev];
      // Limit the number of toasts
      return updated.slice(0, maxToasts);
    });
  }, [generateId, maxToasts]);

  const showSuccess = useCallback((title: string, description?: string, duration?: number) => {
    showToast({ type: 'success', title, description, duration });
  }, [showToast]);

  const showError = useCallback((title: string, description?: string, duration?: number) => {
    showToast({ type: 'error', title, description, duration });
  }, [showToast]);

  const showWarning = useCallback((title: string, description?: string, duration?: number) => {
    showToast({ type: 'warning', title, description, duration });
  }, [showToast]);

  const showInfo = useCallback((title: string, description?: string, duration?: number) => {
    showToast({ type: 'info', title, description, duration });
  }, [showToast]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue: AdminToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismissToast,
    dismissAll,
  };

  return (
    <AdminToastContext.Provider value={contextValue}>
      {children}
      <AdminToastContainer toasts={toasts} onDismiss={dismissToast} />
    </AdminToastContext.Provider>
  );
}

interface AdminToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function AdminToastContainer({ toasts, onDismiss }: AdminToastContainerProps) {
  return (
    <div
      className="fixed bottom-4 left-0 right-0 md:left-auto md:right-4 z-50 flex flex-col-reverse items-center md:items-end gap-3 pointer-events-none px-4 md:px-0"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div 
            key={toast.id} 
            className="pointer-events-auto w-full max-w-sm md:w-auto"
            layout
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
          >
            <AdminToast
              id={toast.id}
              type={toast.type}
              title={toast.title}
              description={toast.description}
              duration={toast.duration}
              pauseOnHover={toast.pauseOnHover}
              onClose={onDismiss}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default AdminToastProvider;
