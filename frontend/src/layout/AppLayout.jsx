import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import CreateOrgModal from "../components/modals/CreateOrgModal";
import { useAuthStore } from "../stores/authStore";
import { useOrgStore } from "../stores/orgStore";
import { useNotificationStore } from "../stores/notificationStore";
import { connectSocket, disconnectSocket } from "../services/socket";

const AppLayout = () => {
  const { token } = useAuthStore();
  const { userOrgs, currentOrg, fetchMyOrgs, loading: orgLoading } = useOrgStore();
  const { fetchUnreadCount, addLiveNotification } = useNotificationStore();
  const [showCreateOrg, setShowCreateOrg] = useState(false);

  // 1. Initial Load: Organizations & Unread Notifications
  useEffect(() => {
    fetchMyOrgs();
    fetchUnreadCount();
  }, []);

  // 2. Real-time WebSocket connection
  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);

    // Listen for live alerts
    socket.on("notification:new", (newAlert) => {
      console.log("🔔 Real-time alert received:", newAlert);
      addLiveNotification(newAlert);
    });

    if (currentOrg?._id) {
      socket.emit("join:org", currentOrg._id);
    }

    return () => {
      disconnectSocket();
    };
  }, [token, currentOrg?._id]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col">
      <Navbar onOpenCreateOrg={() => setShowCreateOrg(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        {/* If user has no workspaces */}
        {!orgLoading && userOrgs.length === 0 ? (
          <div className="max-w-lg mx-auto my-16 text-center p-8 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl">
            <div className="text-4xl mb-3">🏢</div>
            <h2 className="text-xl font-bold mb-2">Welcome to TeamFlow!</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6 leading-relaxed">
              To start creating projects, managing Kanban tasks, and collaborating with your team, please create your first workspace.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateOrg(true)}
              className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm cursor-pointer"
            >
              + Create First Workspace
            </button>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      {/* Global Create Workspace Modal */}
      {showCreateOrg && <CreateOrgModal onClose={() => setShowCreateOrg(false)} />}
    </div>
  );
};

export default AppLayout;
