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
            className="px-3.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-semibold transition-colors cursor-pointer"
          >
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      {/* Notifications Feed */}
      {loading && notifications.length === 0 ? (
        <div className="py-20 text-center text-sm text-slate-500">
          Loading notification feed...
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="text-4xl mb-3">🔔</div>
          <h3 className="text-base font-bold mb-1">No Notifications Yet</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
            You are all caught up! When you get assigned tasks or someone comments on your work, you will see real-time updates here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => !n.isRead && markAsRead(n._id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 shadow-xs ${
                n.isRead
                  ? "bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300"
                  : "bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 text-slate-900 dark:text-zinc-100"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5">
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
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
                <div className="pt-2 text-[11px] text-blue-600 dark:text-blue-400 font-semibold">
                  Click to mark as read ✓
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
