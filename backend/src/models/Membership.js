const mongoose = require("mongoose");

const MembershipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
    status: {
      type: String,
      enum: ["active", "suspended", "left", "removed"],
      default: "active",
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    removedAt: {
      type: Date,
      default: null,
    },
    leftAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// One user can have only one membership per organization
MembershipSchema.index({ user: 1, organization: 1 }, { unique: true });

// Useful for fetching all organizations a user belongs to
MembershipSchema.index({ user: 1, status: 1 });

// Useful when we have to fetch all active members of an organization
MembershipSchema.index({ organization: 1, status: 1 });

// Useful when checking which members have a particular role
MembershipSchema.index({ role: 1 });

const Membership = mongoose.model("Membership", MembershipSchema);

module.exports = Membership;
