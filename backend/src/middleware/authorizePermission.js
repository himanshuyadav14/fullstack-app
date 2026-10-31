const Role = require("../models/Role");

const authorizePermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      //Fetch current role permissions from mongoDB
      const role = await Role.findOne({ name: req.user.role }).select(
        "permissions",
      );

      if (!role) {
        return res.status(403).json({
          message: "Role configuration could not found.",
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
