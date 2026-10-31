const Role = require("../models/Role");
const PERMISSIONS = require("../constants/permissions");

const getRoles = async (req, res) => {
  try {
    const roles = await Role.find({}).select("-__v").sort({ name: 1 });

    return res.status(200).json({
      message: "Roles fetched successfully",
      count: roles.length,
      roles,
    });
  } catch (err) {
    console.error("getRoles error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const updateRolePermission = async (req, res) => {
  try {
    const { roleName } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        message: "Permissions must be an array",
      });
    }

    const allowedPermissions = Object.values(PERMISSIONS);

    const hasInvalidPermission = permissions.some(
      (permission) => !allowedPermissions.includes(permission),
    );

    if (hasInvalidPermission) {
      return res.status(400).json({
        message: "one or more permissions are invalid",
        allowedPermissions,
      });
    }

    const uniquePermissions = [...new Set(permissions)];

    const role = await Role.findOneAndUpdate(
      { name: roleName },
      {
        $set: { permissions: uniquePermissions },
      },
      { new: true, runValidators: true },
    ).select("-__v");

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    return res
      .status(200)
      .json({ message: "Role permissions updated successfully!", role });
  } catch (err) {
    console.error("updateRolePermissions error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports = { getRoles, updateRolePermission };
