const Role = require("../models/Role");
const User = require("../models/User");

const mongoose = require("mongoose");
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

    // 1. Validate role name
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        message: "Role name is required and must be a valid string",
      });
    }

    const normalizedName = name.trim().toLowerCase();

    if (normalizedName.length > 50) {
      return res.status(400).json({
        message: "Role name cannot exceed 50 characters",
      });
    }

    // 2. Validate description
    if (
      description !== undefined &&
      (typeof description !== "string" || description.length > 200)
    ) {
      return res.status(400).json({
        message: "Description must be a string with maximum 200 characters",
      });
    }

    // 3. Validate permissions
    let validatedPermissions = [];

    if (permissions !== undefined) {
      if (
        !Array.isArray(permissions) ||
        !permissions.every((permission) => typeof permission === "string")
      ) {
        return res.status(400).json({
          message: "Permissions must be an array of strings",
        });
      }

      const allowedPermissions = Object.values(PERMISSIONS);

      const invalidPermissions = permissions.filter(
        (permission) => !allowedPermissions.includes(permission),
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

    // 4. Check if role already exists
    const existingRole = await Role.findOne({
      name: normalizedName,
    });

    if (existingRole) {
      return res.status(409).json({
        message: `Role '${normalizedName}' already exists`,
      });
    }

    // 5. Create new role
    const newRole = new Role({
      name: normalizedName,
      description: description?.trim() || "",
      permissions: validatedPermissions,
      isSystemRole: false,
    });

    await newRole.save();

    // 6. Send response
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
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Role already exists",
      });
    }

    console.error("createRole error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// PATCH /api/roles/:roleId/permissions
const updateRolePermission = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body;

    // 1. Validate Role ID
    if (!mongoose.isValidObjectId(roleId)) {
      return res.status(400).json({
        message: "Invalid role ID",
      });
    }

    // 2. Validate permissions array
    if (
      !Array.isArray(permissions) ||
      !permissions.every((permission) => typeof permission === "string")
    ) {
      return res.status(400).json({
        message: "Permissions must be an array of strings",
      });
    }

    // 3. Validate permission values
    const allowedPermissions = Object.values(PERMISSIONS);

    const invalidPermissions = permissions.filter(
      (permission) => !allowedPermissions.includes(permission),
    );

    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        message: "One or more permissions are invalid",
        invalidPermissions,
        allowedPermissions,
      });
    }

    // 4. Find role
    const role = await Role.findById(roleId);

    if (!role) {
      return res.status(404).json({
        message: "Role not found",
      });
    }

    // 5. Protect admin system role
    if (role.isSystemRole) {
      return res.status(403).json({
        message: "Admin system role permissions cannot be modified",
      });
    }

    // 6. Remove duplicate permissions
    role.permissions = [...new Set(permissions)];

    await role.save();

    // 7. Response
    return res.status(200).json({
      message: "Role permissions updated successfully",
      role: {
        _id: role._id,
        name: role.name,
        description: role.description,
        isSystemRole: role.isSystemRole,
        permissions: role.permissions,
        updatedAt: role.updatedAt,
      },
    });
  } catch (err) {
    console.error("updateRolePermission error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

// DELETE /api/roles/:roleId
const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;

    // 1. Validate Role ID
    if (!mongoose.isValidObjectId(roleId)) {
      return res.status(400).json({
        message: "Invalid role ID",
      });
    }

    // 2. Find role
    const role = await Role.findById(roleId);

    if (!role) {
      return res.status(404).json({
        message: "Role not found",
      });
    }

    // 3. Protect system roles
    if (role.isSystemRole) {
      return res.status(403).json({
        message: "System roles cannot be deleted",
      });
    }

    // 4. Check assigned users
    const assignedUsersCount = await User.countDocuments({
      role: role._id,
    });

    if (assignedUsersCount > 0) {
      return res.status(400).json({
        message: `Cannot delete role '${role.name}': ${assignedUsersCount} user(s) are currently assigned this role`,
      });
    }

    // 5. Delete role
    await role.deleteOne();

    return res.status(200).json({
      message: `Role '${role.name}' deleted successfully`,
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
