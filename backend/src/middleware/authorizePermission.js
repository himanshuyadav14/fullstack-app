const Role = require("../models/Role");
const mongoose = require("mongoose");

const authorizePermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // check auth
      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      // 2. Validate role ObjectId from JWT
      if (!mongoose.isValidObjectId(req.user.role)) {
        return res.status(403).json({
          message: "Invalid role reference",
        });
      }

      // 3. Fetch latest role permissions from MongoDB
      const role = await Role.findById(req.user.role).select("permissions");

      if (!role) {
        return res.status(403).json({
          message: "Role configuration could not be found.",
        });
      }

      if (!role.permissions.includes(requiredPermission)) {
        return res.status(403).json({
          message: "You do not have permission to perform this action",
        });
      }

      next();
    } catch (err) {
      console.error("authorizePermission error:", err.message);

      return res.status(500).json({
        message: "Internal Server Error",
      });
    }
  };
};

module.exports = authorizePermission;
