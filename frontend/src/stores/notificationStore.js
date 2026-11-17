import { create } from "zustand";
import api from "../services/api";
import { ENDPOINTS } from "../services/urls";

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  /**
   * Fetch paginated notifications
   */
  fetchNotifications: async (page = 1, unreadOnly = false) => {
    set({ loading: true });
    try {
      const res = await api.get(ENDPOINTS.NOTIFICATIONS.LIST, {
        params: { page, limit: 20, unreadOnly: unreadOnly ? "true" : undefined },
      });

      const list = res.data.data || [];
      const unreadCount = res.data.pagination?.unreadCount ?? get().unreadCount;

      set({
        notifications: list,
        unreadCount,
        loading: false,
      });

      return { success: true, data: list };
    } catch (err) {
      set({ loading: false });
      return { success: false, message: err.message };
    }
  },

  /**
   * Fetch badge counter for navbar bell icon
   */
  fetchUnreadCount: async () => {
    try {
      const res = await api.get(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
      const count = res.data.unreadCount || 0;
      set({ unreadCount: count });
      return count;
    } catch {
      return 0;
    }
  },

  /**
   * Mark a single notification as read
   */
  markAsRead: async (notificationId) => {
    try {
      await api.patch(ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId));

      set((state) => ({
        notifications: state.notifications.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async () => {
    try {
      await api.patch(ENDPOINTS.NOTIFICATIONS.READ_ALL);

      set((state) => ({
        notifications: state.notifications.map((n) => ({
          ...n,
          isRead: true,
        })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  },

  /**
   * Delete a single notification
   */
  deleteNotification: async (notificationId) => {
    try {
      await api.delete(ENDPOINTS.NOTIFICATIONS.DELETE(notificationId));
      set((state) => {
        const removed = state.notifications.find((n) => n._id === notificationId);
        return {
          notifications: state.notifications.filter((n) => n._id !== notificationId),
          unreadCount:
            removed && !removed.isRead ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        };
      });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || "Failed to delete notification",
      };
    }
  },

  /**
   * Real-time incoming event from Socket.IO:
   * Prepends new alert to top of list and increments unread count badge
   */
  addLiveNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));
