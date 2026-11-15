const express = require("express");
const {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// All notification routes require authentication
router.use(authMiddleware);

router.get("/", getMyNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:notificationId/read", markAsRead);
router.delete("/:notificationId", deleteNotification);

module.exports = router;
