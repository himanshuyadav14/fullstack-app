import { useEffect } from "react";
import { useNotificationStore } from "../stores/notificationStore";

const NotificationsPage = () => {
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    loading,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(1, false);
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Notifications & Alerts</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            Real-time activity across your assigned tasks, mentions, and workspaces.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      {/* Notifications Feed */}
      {loading && notifications.length === 0 ? (
        <div className="py-20 text-center text-sm text-zinc-500">
          Loading notification feed...
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <h3 className="text-base font-bold mb-1">No Notifications Yet</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            You are all caught up! When you get assigned tasks or someone comments on your work, you will see real-time updates here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => !n.isRead && markAsRead(n._id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 shadow-2xs ${
                n.isRead
                  ? "bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                  : "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold flex items-center gap-2">
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100 inline-block" />
                  )}
                  {n.title}
                </span>
                <span className="text-slate-400 dark:text-zinc-500">
                  {new Date(n.createdAt).toLocaleDateString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                {n.message}
              </div>

              {!n.isRead && (
                <div className="flex items-center gap-1.5 pt-2 text-[11px] text-zinc-900 dark:text-zinc-100 font-semibold">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Click to mark as read</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
