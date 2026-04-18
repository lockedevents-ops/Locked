// Lightweight admin notification service placeholder for legacy flows.
// The build requires this module, but in this environment we no-op.

export interface AdminNotificationPayload {
  title: string;
  message: string;
  type: string;
  link?: string;
  meta?: any;
}

export const adminNotificationService = {
  create: (_payload: AdminNotificationPayload) => {
    try {
      // Intentionally a no-op; integrate with real admin notifications if needed.
      return true;
    } catch {
      return false;
    }
  },
};
