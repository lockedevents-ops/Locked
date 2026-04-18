/**
 * Unified Toast Service
 * 
 * Centralized service for all toast notifications in the application.
 * Now uses UniversalToast system instead of react-toastify.
 * 
 * Usage:
 * import { toastService } from '@/services/toastService';
 * toastService.success('Operation completed successfully!');
 */

// This service now wraps the UniversalToast system
// Note: This requires the component to be inside UniversalToastProvider

export interface ToastOptions {
  duration?: number;
  description?: string;
}

class ToastService {
  private toastInstance: any = null;

  // Set the toast instance (called by the provider)
  setToast(toast: any) {
    this.toastInstance = toast;
  }

  /**
   * Show success toast
   */
  success(title: string, options?: ToastOptions) {
    if (!this.toastInstance) {
      console.warn('Toast not initialized yet');
      return;
    }
    this.toastInstance.showSuccess(title, options?.description, options?.duration);
  }

  /**
   * Show error toast
   */
  error(title: string, options?: ToastOptions) {
    if (!this.toastInstance) {
      console.warn('Toast not initialized yet');
      return;
    }
    this.toastInstance.showError(title, options?.description, options?.duration);
  }

  /**
   * Show info toast
   */
  info(title: string, options?: ToastOptions) {
    if (!this.toastInstance) {
      console.warn('Toast not initialized yet');
      return;
    }
    this.toastInstance.showInfo(title, options?.description, options?.duration);
  }

  /**
   * Show warning toast
   */
  warning(title: string, options?: ToastOptions) {
    if (!this.toastInstance) {
      console.warn('Toast not initialized yet');
      return;
    }
    this.toastInstance.showWarning(title, options?.description, options?.duration);
  }

  /**
   * Show generic toast (defaults to info)
   */
  show(title: string, options?: ToastOptions) {
    this.info(title, options);
  }

  /**
   * Dismiss a specific toast
   */
  dismiss(toastId?: string) {
    if (!this.toastInstance) return;
    if (toastId) {
      this.toastInstance.dismissToast(toastId);
    }
  }

  /**
   * Dismiss all toasts
   */
  dismissAll() {
    if (!this.toastInstance) return;
    this.toastInstance.dismissAll();
  }
}

export const toastService = new ToastService();
