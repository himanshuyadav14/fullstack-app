const mongoose = require("mongoose");

const InvitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      select: false,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "revoked", "expired"],
      default: "pending",
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);
// Find invitations for a particular organization
InvitationSchema.index({ organization: 1, status: 1 });

// Find invitations sent to a particular email
InvitationSchema.index({ email: 1, status: 1 });

InvitationSchema.index({ status: 1, expiresAt: 1 });

// Prevent duplicate pending invitations for the same
// email in the same organization
InvitationSchema.index(
  { email: 1, organization: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  },
);

const Invitation = mongoose.model("Invitation", InvitationSchema);
module.exports = Invitation;
