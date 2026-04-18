"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCheck,
  Trash2,
  Bell,
  Shield,
  UserCheck,
  MoreVertical,
  Check,
  X,
  CircleDot,
  FileText,
  Inbox,
  AlertTriangle,
  ExternalLink,
  ArrowLeft
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNotificationStore } from "@/store/notificationStore";

type FilterKey = "all" | "unread" | "role_request" | "system_message";

interface Notification {
  id: string;
  title?: string;
  message?: string;
  read?: boolean;
  createdAt?: string;
  type?: string;
  link?: string;
  metadata?: any;
}

// Hoisted variant styles & helper so they are accessible in ViewModal
type VariantKey = "danger" | "success" | "info" | "neutral";

const variantStyles: Record<
  VariantKey,
  {
    container: string;
    iconWrap: string;
    iconColor: string;
    accent: string;
    newBadge: string;
    title: string;
    headerBg: string;
    headerIconWrap: string;
  }
> = {
  danger: {
    container: "border-red-200 bg-red-50/70",
    iconWrap: "bg-red-100",
    iconColor: "text-red-600",
    accent: "bg-red-500",
    newBadge: "bg-red-600 text-white",
    title: "text-red-700",
    headerBg: "bg-red-50",
    headerIconWrap: "bg-red-100 text-red-600"
  },
  success: {
    container: "border-green-200 bg-green-50/70",
    iconWrap: "bg-green-100",
    iconColor: "text-green-600",
    accent: "bg-green-500",
    newBadge: "bg-green-600 text-white",
    title: "text-green-700",
    headerBg: "bg-green-50",
    headerIconWrap: "bg-green-100 text-green-600"
  },
  info: {
    container: "border-blue-200 bg-blue-50/70",
    iconWrap: "bg-blue-100",
    iconColor: "text-blue-600",
    accent: "bg-blue-500",
    newBadge: "bg-blue-600 text-white",
    title: "text-blue-700",
    headerBg: "bg-blue-50",
    headerIconWrap: "bg-blue-100 text-blue-600"
  },
  neutral: {
    container: "border-neutral-200 bg-white",
    iconWrap: "bg-neutral-100",
    iconColor: "text-neutral-600",
    accent: "bg-primary",
    newBadge: "bg-primary text-white",
    title: "text-neutral-800",
    headerBg: "bg-neutral-50",
    headerIconWrap: "bg-neutral-200 text-neutral-600"
  }
};

function deriveVariant(n: Notification): VariantKey {
  const t = (n.title || "").toLowerCase();
  const m = (n.message || "").toLowerCase();
  if (t.includes("reject") || m.includes("reject") || t.includes("error") || m.includes("error") || t.includes("urgent") || m.includes("urgent")) {
    return "danger";
  }
  if (t.includes("approve") || m.includes("approve") || t.includes("success") || m.includes("success")) {
    return "success";
  }
  if (n.type === "system_message") return "info";
  if (n.type === "role_request") return "info";
  return "neutral";
}

/**
 * Unified Notifications Page
 * --------------------------------------------------------------
 * Shared notification center for all roles: user, organizer, venue_owner
 * Displays all notifications in one centralized location
 */
export default function UnifiedNotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    markAllAsRead,
    markAsRead,
    removeNotification,
    clearAll
  } = useNotificationStore();

  const [filter, setFilter] = useState<FilterKey>("all");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // NEW: modal state
  const [activeNotification, setActiveNotification] = useState<Notification | null>(null);

  const openNotification = (n: Notification) => {
    setActiveNotification(n);
    if (!n.read) markAsRead(n.id);
  };

  const closeModal = () => setActiveNotification(null);

  const handleNavigateToLink = (link: string) => {
    router.push(link);
  };

  const filtered = useMemo(() => {
    switch (filter) {
      case "unread":
        return notifications.filter(n => !n.read);
      case "role_request":
        return notifications.filter(n => n.type === "role_request");
      case "system_message":
        return notifications.filter(n => n.type === "system_message");
      default:
        return notifications;
    }
  }, [notifications, filter]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const roleReqCount = notifications.filter(n => n.type === "role_request" && !n.read).length;

  const formatDate = (d: string) =>
    formatDistanceToNow(new Date(d), { addSuffix: true });

  const getBaseIcon = (type: string) => {
    switch (type) {
      case "role_request":
        return <FileText className="h-5 w-5" />;
      case "system_message":
        return <Shield className="h-5 w-5" />;
      case "general":
        return <UserCheck className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const openLink = (n: Notification) => {
    if (n.link) window.location.href = n.link;
  };

  const confirmDelete = (id: string) => {
    setPendingDeleteId(id);
  };

  const executeDelete = () => {
    if (pendingDeleteId) removeNotification(pendingDeleteId);
    setPendingDeleteId(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold mt-16">Notifications</h1>
          <p className="text-sm text-neutral-500">
            All your notifications from across the platform in one place.
          </p>
        </div>

        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-3 shrink-0 mt-16">
          <button
            onClick={() => markAllAsRead()}
            disabled={notifications.length === 0 || !notifications.some(n => !n.read)}
            className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </button>
          <button
            onClick={() => setConfirmClearAll(true)}
            disabled={notifications.length === 0}
            className="cursor-pointer inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="h-4 w-4" />
            Clear all
          </button>
        </div>

        {/* Mobile Actions */}
        <div className="relative sm:hidden self-end">
          <button
            onClick={() => setActionsOpen(o => !o)}
            className="cursor-pointer inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white p-2 text-neutral-600 hover:bg-neutral-50"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {actionsOpen && (
            <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl">
              <button
                onClick={() => {
                  markAllAsRead();
                  setActionsOpen(false);
                }}
                disabled={!notifications.some(n => !n.read)}
                className="cursor-pointer flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Check className="h-4 w-4" /> Mark all as read
              </button>
              <button
                onClick={() => {
                  setConfirmClearAll(true);
                  setActionsOpen(false);
                }}
                disabled={notifications.length === 0}
                className="cursor-pointer flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" /> Clear all
              </button>
              <button
                onClick={() => setActionsOpen(false)}
                className="cursor-pointer flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50"
              >
                <X className="h-4 w-4" /> Close
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={filter}
        onValueChange={(v: string) => setFilter(v as FilterKey)}
        className="w-full"
      >
        <TabsList className="flex w-full justify-start gap-2 overflow-x-auto rounded-lg border bg-neutral-50 p-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-300">
          <ResponsiveTab value="all" label="All" count={notifications.length} />
          <ResponsiveTab value="unread" label="Unread" count={notifications.filter(n => !n.read).length} />
          <ResponsiveTab value="role_request" label="Role Requests" mobileLabel="Requests" count={notifications.filter(n => n.type === 'role_request' && !n.read).length} />
          <ResponsiveTab value="system_message" label="System" />
        </TabsList>

          <TabsContent value={filter} className="mt-4">
            <NotificationList
              notifications={filtered}
              formatDate={(d) => formatDistanceToNow(new Date(d), { addSuffix: true })}
              getBaseIcon={getBaseIcon}
              getVariant={deriveVariant}
              variantStyles={variantStyles}
              onOpen={(n) => openNotification(n)}
              onDelete={(id) => setPendingDeleteId(id)}
            />
          </TabsContent>
      </Tabs>

      {/* Confirm Clear All */}
      {confirmClearAll && (
        <ConfirmModal
          title="Clear all notifications?"
          description="This permanently removes all notifications."
          confirmLabel="Clear All"
          tone="danger"
          onCancel={() => setConfirmClearAll(false)}
          onConfirm={() => {
            clearAll();
            setConfirmClearAll(false);
          }}
        />
      )}

      {/* Confirm Single Delete */}
      {pendingDeleteId && (
        <ConfirmModal
          title="Delete notification?"
          description="This action cannot be undone."
          confirmLabel="Delete"
          tone="danger"
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={() => {
            removeNotification(pendingDeleteId);
            setPendingDeleteId(null);
          }}
        />
      )}

      {/* View Modal */}
      {activeNotification && (
        <ViewModal
          notification={activeNotification}
          onClose={closeModal}
          formatDate={(d) => formatDistanceToNow(new Date(d), { addSuffix: true })}
          onDelete={() => {
            removeNotification(activeNotification.id);
            closeModal();
          }}
          onNavigate={handleNavigateToLink}
        />
      )}
    </div>
  );
}

/* ---------- Sub Components ---------- */

function ResponsiveTab({
  value,
  label,
  mobileLabel,
  count
}: {
  value: string;
  label: string;
  mobileLabel?: string;
  count?: number;
}) {
  return (
    <TabsTrigger
      value={value}
      className="cursor-pointer relative whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow-sm px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1"
    >
      <span className="hidden xs:inline">{label}</span>
      <span className="xs:hidden">{mobileLabel || label}</span>
      {typeof count === "number" && (
        <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-neutral-200 px-1 text-[10px] font-semibold text-neutral-700">
          {count}
        </span>
      )}
    </TabsTrigger>
  );
}

function NotificationList({
  notifications,
  formatDate,
  getBaseIcon,
  getVariant,
  variantStyles,
  onOpen,
  onDelete
}: {
  notifications: Notification[];
  formatDate: (d: string) => string;
  getBaseIcon: (t: string) => React.ReactNode;
  getVariant: (n: Notification) => string;
  variantStyles: any;
  onOpen: (n: Notification) => void;
  onDelete: (id: string) => void;
}) {
  if (!notifications.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-white py-14 text-center">
        <div className="mb-4 rounded-full bg-primary/10 p-4">
          <Inbox className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm font-medium text-neutral-700">No notifications</p>
        <p className="mt-1 max-w-xs text-xs text-neutral-500">
          You are all caught up.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {notifications.map(n => {
        const variant = getVariant(n);
        const styles = variantStyles[variant];
        const unread = !n.read;
        return (
          <li
            key={n.id}
            onClick={() => onOpen(n)}
            className={`group relative overflow-hidden rounded-lg border p-4 transition-shadow hover:shadow-sm ${styles.container} ${
              unread ? "ring-1 ring-offset-0 ring-black/5" : ""
            } cursor-pointer`}
          >
            <span className={`absolute left-0 top-0 h-full w-1 ${styles.accent}`} />
            <div className="flex items-start gap-4">
              <div className="relative">
                <div className={`flex h-10 w-10 items-center justify-center rounded-md ${styles.iconWrap}`}>
                  <span className={styles.iconColor}>{getBaseIcon(n.type || "")}</span>
                </div>
                {unread && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-red-500">
                    <CircleDot className="h-3 w-3 text-white" />
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-neutral-800 truncate">
                    {n.title || "Notification"}
                  </p>
                  {unread && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles.newBadge}`}>
                      NEW
                    </span>
                  )}
                </div>
                {n.message && (
                  <p
                    className="text-xs text-neutral-700 leading-relaxed break-words
                               max-sm:line-clamp-2"
                  >
                    {n.message}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-3 text-[11px] text-neutral-500">
                  <span className="uppercase tracking-wide">
                    {n.createdAt
                      ? formatDate(n.createdAt)
                      : (n as any).date
                      ? formatDate((n as any).date)
                      : "Just now"}
                  </span>
                </div>
              </div>

              <div
                className="flex flex-col items-end gap-2 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => onDelete(n.id)}
                  className="cursor-pointer rounded-md border border-neutral-300 bg-white p-1 text-neutral-500 hover:bg-neutral-100"
                  aria-label="Delete notification"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function ConfirmModal({
  title,
  description,
  confirmLabel,
  tone = "danger",
  onCancel,
  onConfirm
}: {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const toneClasses =
    tone === "danger"
      ? {
          btn: "bg-red-600 hover:bg-red-700",
          iconWrap: "bg-red-100 text-red-600"
        }
      : {
          btn: "bg-primary hover:bg-primary/90",
          iconWrap: "bg-primary/10 text-primary"
        };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-lg">
        <div className="flex items-start gap-3">
          <div className={`rounded-md p-2 ${toneClasses.iconWrap}`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-neutral-800">{title}</h2>
            <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-2">
            <button
              onClick={onCancel}
              className="cursor-pointer rounded-md border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`cursor-pointer rounded-md px-4 py-2 text-xs font-semibold text-white ${toneClasses.btn}`}
            >
              {confirmLabel}
            </button>
        </div>
      </div>
    </div>
  );
}

/* ---- View Modal ---- */
function ViewModal({
  notification,
  onClose,
  formatDate,
  onDelete,
  onNavigate
}: {
  notification: Notification;
  onClose: () => void;
  formatDate: (d: string) => string;
  onDelete: () => void;
  onNavigate?: (link: string) => void;
}) {
  const dateString =
    notification.createdAt ||
    (notification as any).date ||
    new Date().toISOString();

  // Derive variant (mirror list logic)
  const variant = deriveVariant(notification);
  const styles = variantStyles[variant];

  const iconForModal = () => {
    switch (notification.type) {
      case "role_request":
        return <FileText className="h-5 w-5" />;
      case "system_message":
        return <Shield className="h-5 w-5" />;
      case "general":
        return <UserCheck className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative w-full sm:max-w-lg bg-white rounded-xl shadow-xl border ${styles.container.includes('border-') ? styles.container.split(' ').find(c=>c.startsWith('border-')) : 'border-neutral-200'} max-h-[90vh] flex flex-col`}>
        <span className={`absolute top-0 left-0 h-1 w-full ${styles.accent}`} />
        <div className={`flex items-start gap-3 px-5 pt-4 pb-3 border-b border-neutral-100 ${styles.headerBg} rounded-t-xl`}>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md p-2 hover:bg-white/60 text-neutral-600 shrink-0"
            aria-label="Close"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-start gap-3 min-w-0">
            <div className={`mt-0.5 rounded-md p-2 ${styles.headerIconWrap}`}>
              {iconForModal()}
            </div>
            <div className="min-w-0">
              <h2 className={`text-sm font-semibold truncate ${styles.title}`}>
                {notification.title || "Notification"}
              </h2>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-neutral-400">
                {formatDate(dateString)}
              </div>
            </div>
          </div>
        </div>
        <div className="px-5 py-4 overflow-y-auto space-y-4">
          {notification.message && (
            <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
              {notification.message}
            </p>
          )}
          {notification.link && onNavigate && (
            <button
              onClick={() => {
                onNavigate(notification.link!);
                onClose();
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline cursor-pointer"
            >
              Open related item
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mt-auto flex items-center justify-end gap-2 px-5 py-4 border-t border-neutral-100 bg-neutral-50 rounded-b-xl">
          <button
            onClick={onDelete}
            className="cursor-pointer rounded-md border border-red-300 bg-white px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
