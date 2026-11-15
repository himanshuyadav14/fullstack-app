const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient reference is required"],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender reference is required"],
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization reference is required"],
      index: true,
    },
    type: {
      type: String,
      enum: [
        // Tasks
        "task_assigned",
        "task_unassigned",
        "task_status_changed",
        "task_priority_changed",
        "task_due_soon",
        // Comments & Collaboration
        "comment_added",
        "mention",
        "attachment_uploaded",
        // Org & Teams
        "invitation_received",
        "role_updated",
        "team_member_added",
        "team_member_removed",
        "ownership_transferred",
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    resourceType: {
      type: String,
      enum: ["task", "project", "comment", "team", "organization"],
      default: "task",
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for instant notification list loading and badge counter
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Tenant isolation index
NotificationSchema.index({ organization: 1, recipient: 1 });

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;
