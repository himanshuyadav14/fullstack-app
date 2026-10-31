const Role = require("../models/Role");
const User = require("../models/User");
const PERMISSIONS = require("../constants/permissions");

// GET /api/roles/permissions
const getAllPermissions = async (req, res) => {
  try {
    const permissions = Object.values(PERMISSIONS);

    return res.status(200).json({
      message: "Permissions fetched successfully",
      count: permissions.length,
      permissions,
    });
  } catch (err) {
    console.error("getAllPermissions error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// GET /api/roles
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

// POST /api/roles
const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Role name is required and must be a valid string",
      });
    }

    const normalizedName = name.trim().toLowerCase();

    // Check if role already exists
    const existingRole = await Role.findOne({ name: normalizedName });
    if (existingRole) {
      return res.status(409).json({
        message: `Role '${normalizedName}' already exists`,
      });
    }

    // Validate permissions array if provided
    let validatedPermissions = [];
    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        return res.status(400).json({
          message: "Permissions must be an array of strings",
        });
      }

      const allowedPermissions = Object.values(PERMISSIONS);
      const invalidPermissions = permissions.filter(
        (p) => !allowedPermissions.includes(p),
      );

      if (invalidPermissions.length > 0) {
        return res.status(400).json({
          message: "One or more permissions are invalid",
          invalidPermissions,
          allowedPermissions,
        });
      }

      validatedPermissions = [...new Set(permissions)];
    }

    const newRole = new Role({
      name: normalizedName,
      description: typeof description === "string" ? description.trim() : "",
      permissions: validatedPermissions,
      isSystemRole: false,
    });

    await newRole.save();

    return res.status(201).json({
      message: "Role created successfully",
      role: {
        _id: newRole._id,
        name: newRole.name,
        description: newRole.description,
        isSystemRole: newRole.isSystemRole,
        permissions: newRole.permissions,
        createdAt: newRole.createdAt,
      },
    });
  } catch (err) {
    console.error("createRole error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// PATCH /api/roles/:roleName/permissions
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
        message: "One or more permissions are invalid",
        allowedPermissions,
      });
    }

    const uniquePermissions = [...new Set(permissions)];

    const role = await Role.findOneAndUpdate(
      { name: roleName.trim().toLowerCase() },
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

// DELETE /api/roles/:roleName
const deleteRole = async (req, res) => {
  try {
    const { roleName } = req.params;
    const normalizedName = roleName.trim().toLowerCase();

    const role = await Role.findOne({ name: normalizedName });
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Safeguard: Cannot delete system roles (admin, etc.)
    if (role.isSystemRole) {
      return res.status(403).json({
        message: "System roles cannot be deleted",
      });
    }

    // Safeguard: Cannot delete role if users are currently assigned to it
    const assignedUsersCount = await User.countDocuments({ role: normalizedName });
    if (assignedUsersCount > 0) {
      return res.status(400).json({
        message: `Cannot delete role '${normalizedName}': ${assignedUsersCount} user(s) are currently assigned this role`,
      });
    }

    await Role.findOneAndDelete({ name: normalizedName });

    return res.status(200).json({
      message: `Role '${normalizedName}' deleted successfully`,
    });
  } catch (err) {
    console.error("deleteRole error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getAllPermissions,
  getRoles,
  createRole,
  updateRolePermission,
  deleteRole,
};
