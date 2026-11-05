const mongoose = require("mongoose");
const PERMISSIONS = require("../constants/permissions");

const RoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: [50, "Role name cannot exceed 50 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
      default: "",
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    isSystemRole: {
      type: Boolean,
      default: false,
    },
    permissions: {
      type: [
        {
          type: String,
          enum: Object.values(PERMISSIONS),
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

// Role names must be unique within an organization
RoleSchema.index({ organization: 1, name: 1 }, { unique: true });

// Useful for fetching system roles within an organization
RoleSchema.index({ organization: 1, isSystemRole: 1 });

const Role = mongoose.model("Role", RoleSchema);
module.exports = Role;
