const mongoose = require("mongoose");
const Notification = require("../models/Notification");

/**
 * 1. GET /api/notifications
 * Get logged-in user's notifications (paginated, unread filter, optional org filter)
 */
const getMyNotifications = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {
      recipient: req.user.id,
    };

    if (req.query.unreadOnly === "true") {
      filter.isRead = false;
    }

    if (req.query.organization) {
      if (!mongoose.isValidObjectId(req.query.organization)) {
        return res.status(400).json({
          success: false,
          message: "Invalid organization ID in query filter",
        });
      }
      filter.organization = req.query.organization;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate("sender", "name email avatar")
        .populate("organization", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user.id, isRead: false }),
    ]);

    return res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        unreadCount,
      },
    });
  } catch (error) {
    console.error("getMyNotifications Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 2. GET /api/notifications/unread-count
 * Quick lightweight query for the notification bell badge icon
 */
const getUnreadCount = async (req, res) => {
  try {
    const filter = {
      recipient: req.user.id,
      isRead: false,
    };

    if (req.query.organization) {
      if (!mongoose.isValidObjectId(req.query.organization)) {
        return res.status(400).json({
          success: false,
          message: "Invalid organization ID in query filter",
        });
      }
      filter.organization = req.query.organization;
    }

    const count = await Notification.countDocuments(filter);

    return res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    console.error("getUnreadCount Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 3. PATCH /api/notifications/:notificationId/read
 * Mark a single notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!mongoose.isValidObjectId(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or access denied",
      });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    console.error("markAsRead Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 4. PATCH /api/notifications/read-all
 * Mark all notifications as read for current user
 */
const markAllAsRead = async (req, res) => {
  try {
    const filter = {
      recipient: req.user.id,
      isRead: false,
    };

    if (req.query.organization) {
      if (!mongoose.isValidObjectId(req.query.organization)) {
        return res.status(400).json({
          success: false,
          message: "Invalid organization ID in query filter",
        });
      }
      filter.organization = req.query.organization;
    }

    const result = await Notification.updateMany(filter, {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("markAllAsRead Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 5. DELETE /api/notifications/:notificationId
 * Dismiss / delete a notification
 */
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!mongoose.isValidObjectId(notificationId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or access denied",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("deleteNotification Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
