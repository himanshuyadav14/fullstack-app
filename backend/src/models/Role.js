const mongoose = require("mongoose");
const PERMISSIONS = require("../constants/permissions");

const RoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
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

const Role = mongoose.model("Role", RoleSchema);
module.exports = Role;
