const Notification = require("../models/Notification");
const { emitToUser } = require("../socket");

/**
 * Creates an in-app notification with anti-self-notification safeguard
 * and dispatches instant WebSocket event to recipient's private room
 * @param {Object} params
 * @param {string|ObjectId} params.recipient - Target user receiving the alert
 * @param {string|ObjectId} params.sender - User who performed the action
 * @param {string|ObjectId} params.organization - Organization ID
 * @param {string} params.type - Notification type enum
 * @param {string} params.title - Notification headline
 * @param {string} params.message - Descriptive alert message
 * @param {string} [params.resourceType='task'] - 'task', 'project', etc.
 * @param {string|ObjectId} params.resourceId - ID of the target resource
 * @returns {Promise<Object|null>}
 */
const createNotification = async ({
  recipient,
  sender,
  organization,
  type,
  title,
  message,
  resourceType = "task",
  resourceId,
}) => {
  try {
    if (!recipient || !sender || !organization) {
      return null;
    }

    // Anti-self-notification safeguard: Never notify a user for their own actions
    if (recipient.toString() === sender.toString()) {
      return null;
    }

    const notification = await Notification.create({
      recipient,
      sender,
      organization,
      type,
      title: title.trim().slice(0, 150),
      message: message.trim().slice(0, 500),
      resourceType,
      resourceId,
    });

    // Populate sender and organization info for immediate UI rendering
    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name email avatar")
      .populate("organization", "name")
      .lean();

    // Instant WebSocket dispatch to recipient's private room
    emitToUser(recipient, "notification:new", populatedNotification);

    return notification;
  } catch (error) {
    console.error("createNotification Error (silent failure):", error.message);
    return null;
  }
};

module.exports = {
  createNotification,
};
