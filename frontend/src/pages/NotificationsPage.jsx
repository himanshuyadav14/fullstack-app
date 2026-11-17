import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useNotificationStore } from "../stores/notificationStore";
import { useOrgStore } from "../stores/orgStore";
import PendingInvitations from "../components/invitations/PendingInvitations";
import { confirm } from "../stores/confirmStore";

// Where a notification leads when clicked
const ROUTE_FOR_RESOURCE = {
  task: (id) => `/tasks?task=${id}`,
  team: () => "/teams",
  organization: () => "/settings",
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loading,
  } = useNotificationStore();
  const { userOrgs, currentOrg, setCurrentOrg } = useOrgStore();

  useEffect(() => {
    fetchNotifications(1, false);
  }, []);

  const handleOpen = (n) => {
    if (!n.isRead) markAsRead(n._id);

    const route = ROUTE_FOR_RESOURCE[n.resourceType];
    if (!route || !n.resourceId) return;

    // Resources live inside a workspace; switch to it first if needed
    const notifOrgId = n.organization?._id || n.organization;
    if (notifOrgId && notifOrgId !== currentOrg?._id) {
      const org = userOrgs.find((o) => o._id === notifOrgId);
      if (!org) {
        toast.error("You're no longer a member of that workspace");
        return;
      }
      setCurrentOrg(org);
    }
    navigate(route(n.resourceId));
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // don't also open the notification
    const ok = await confirm({
      title: "Delete notification?",
      message: "It will be removed from your feed.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    const res = await deleteNotification(id);
    if (!res.success) toast.error(res.message);
  };

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
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

      <PendingInvitations />

      {/* Notifications Feed */}
      {loading && notifications.length === 0 ? (
        <div className="py-20 text-center text-sm text-zinc-500">Loading notification feed...</div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <h3 className="text-base font-bold mb-1">No Notifications Yet</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            You are all caught up! When you get assigned tasks or someone comments on your work, you will see real-time updates here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const isLink = Boolean(ROUTE_FOR_RESOURCE[n.resourceType] && n.resourceId);
            return (
              <div
                key={n._id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpen(n)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleOpen(n);
                }}
                className={`group p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 shadow-2xs ${
                  n.isRead
                    ? "bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                    : "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold flex items-center gap-2">
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100 inline-block" />
                    )}
                    {n.title}
                  </span>
                  <span className="flex items-center gap-2 text-slate-400 dark:text-zinc-500 shrink-0">
                    {new Date(n.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, n._id)}
                      title="Delete notification"
                      aria-label="Delete notification"
                      className="p-1 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">{n.message}</div>

                {isLink && (
                  <div className="pt-1 text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
                    Open {n.resourceType} →
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
