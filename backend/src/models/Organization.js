const mongoose = require("mongoose");

const OrganizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      minLength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Organization name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      required: [true, "Organization slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxLength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    logo: {
      type: String,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "archived"],
      default: "active",
      index: true,
    },
    settings: {
      allowMemberInvites: {
        type: Boolean,
        default: false,
      },
      defaultRole: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Role",
        default: null,
      },
    },
  },
  { timestamps: true },
);

const Organization = mongoose.model("Organization", OrganizationSchema);
module.exports = Organization;
