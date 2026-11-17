const mongoose = require("mongoose");
const Membership = require("../models/Membership");
const Role = require("../models/Role");
const Organization = require("../models/Organization");
const User = require("../models/User");
const PERMISSIONS = require("../constants/permissions");
const { createNotification } = require("../services/notificationService");
const escapeRegex = require("../utils/escapeRegex");

/**
 * 0a. GET /api/organizations/:orgId/roles/permissions
 * Returns all system permissions for role builder UI
 */
const getPermissionsList = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: Object.values(PERMISSIONS),
  });
};

/**
 * 0b. GET /api/organizations/:orgId/roles
 * Lists all available roles within the organization
 */
const getOrganizationRoles = async (req, res) => {
  try {
    const roles = await Role.find({ organization: req.organization._id })
      .select("name description isSystemRole permissions")
      .sort({ isSystemRole: -1, name: 1 });

    return res.status(200).json({
      success: true,
      count: roles.length,
      data: roles,
    });
  } catch (error) {
    console.error("getOrganizationRoles Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 0c. POST /api/organizations/:orgId/roles
 * Creates a new custom role scoped to this organization
 */
const createOrganizationRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Role name is required" });
    }

    const normalizedName = name.trim().toLowerCase();
    const reservedNames = ["owner", "admin", "manager", "member"];
    if (reservedNames.includes(normalizedName)) {
      return res.status(400).json({
        success: false,
        message: `'${normalizedName}' is a reserved system role name`,
      });
    }

    // Check if role name already exists in this organization
    const existing = await Role.findOne({
      organization: req.organization._id,
      name: normalizedName,
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Role '${normalizedName}' already exists in this organization`,
      });
    }

    // Validate permissions array
    const allowed = Object.values(PERMISSIONS);
    const validPermissions = Array.isArray(permissions)
      ? permissions.filter((p) => allowed.includes(p))
      : [];

    // Privilege check: Non-owners cannot grant permissions exceeding their own
    if (req.orgRole.name !== "owner") {
      const myPermissions = req.orgRole.permissions || [];
      const exceeding = validPermissions.some((p) => !myPermissions.includes(p));
      if (exceeding) {
        return res.status(403).json({
          success: false,
          message: "Cannot grant permissions exceeding your own authority",
        });
      }
    }

    const newRole = await Role.create({
      name: normalizedName,
      description: description?.trim() || "",
      organization: req.organization._id,
      isSystemRole: false,
      permissions: [...new Set(validPermissions)],
    });

    return res.status(201).json({
      success: true,
      message: `Role '${newRole.name}' created successfully`,
      data: newRole,
    });
  } catch (error) {
    console.error("createOrganizationRole Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 0d. DELETE /api/organizations/:orgId/roles/:roleId
 * Deletes a custom role if no active members are assigned to it
 */
const deleteOrganizationRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const role = await Role.findOne({
      _id: roleId,
      organization: req.organization._id,
    });

    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found in this organization" });
    }

    if (role.isSystemRole) {
      return res.status(403).json({ success: false, message: "System roles cannot be deleted" });
    }

    // Check if active members have this role
    const assignedCount = await Membership.countDocuments({
      organization: req.organization._id,
      role: role._id,
      status: "active",
    });

    if (assignedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete role '${role.name}': ${assignedCount} active member(s) are currently assigned to this role`,
      });
    }

    await role.deleteOne();
    return res.status(200).json({
      success: true,
      message: `Role '${role.name}' deleted successfully`,
    });
  } catch (error) {
    console.error("deleteOrganizationRole Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 1. GET /api/organizations/:orgId/members
 * Lists all members of the organization with pagination and filters
 */
const getOrganizationMembers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const status = req.query.status || "active";

    const filter = {
      organization: req.organization._id,
    };

    if (status !== "all") {
      filter.status = status;
    }

    // Optional search by member name or email
    if (req.query.search && typeof req.query.search === "string" && req.query.search.trim()) {
      const searchRegex = new RegExp(escapeRegex(req.query.search.trim().slice(0, 100)), "i");
      const matchedUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      }).select("_id");

      filter.user = { $in: matchedUsers.map((u) => u._id) };
    }

    const [members, total] = await Promise.all([
      Membership.find(filter)
        .populate("user", "name email avatar isEmailVerified status")
        .populate("role", "name description isSystemRole")
        .sort({ joinedAt: 1 })
        .skip(skip)
        .limit(limit),
      Membership.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: members,
    });
  } catch (error) {
    console.error("getOrganizationMembers Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 2. PATCH /api/organizations/:orgId/members/:memberId/role
 * Updates a member's role with strict privilege escalation and owner safeguards
 */
const updateMemberRole = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { roleId } = req.body;

    if (!mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({ success: false, message: "Invalid member ID" });
    }

    if (!roleId || !mongoose.isValidObjectId(roleId)) {
      return res.status(400).json({ success: false, message: "Valid role ID is required" });
    }

    // 1. Find target membership in this organization
    const targetMembership = await Membership.findOne({
      _id: memberId,
      organization: req.organization._id,
      status: "active",
    }).populate("role");

    if (!targetMembership) {
      return res.status(404).json({
        success: false,
        message: "Active member not found in this organization",
      });
    }

    // Safeguard 1: Cannot change the role of the Owner
    if (targetMembership.role?.name === "owner") {
      return res.status(400).json({
        success: false,
        message: "Cannot change the role of the organization owner. Use ownership transfer instead.",
      });
    }

    // 2. Fetch requested target role in THIS organization
    const targetRole = await Role.findOne({
      _id: roleId,
      organization: req.organization._id,
    });

    if (!targetRole) {
      return res.status(404).json({
        success: false,
        message: "Target role not found in this organization",
      });
    }

    // Safeguard 2: Cannot assign Owner role directly
    if (targetRole.name === "owner") {
      return res.status(400).json({
        success: false,
        message: "Cannot assign owner role directly. Use ownership transfer instead.",
      });
    }

    // Safeguard 3: Non-owner authority checks
    const isRequesterOwner = req.orgRole.name === "owner";

    if (!isRequesterOwner) {
      // Non-owners cannot modify an existing Admin's role
      if (targetMembership.role?.name === "admin") {
        return res.status(403).json({
          success: false,
          message: "Only the organization owner can modify an Admin's role",
        });
      }

      // Non-owners cannot assign Admin role
      if (targetRole.name === "admin") {
        return res.status(403).json({
          success: false,
          message: "Only the organization owner can assign the Admin role",
        });
      }

      // Non-owners cannot promote someone above their own permissions
      const requesterPermissions = req.orgRole.permissions || [];
      const hasExceedingPermissions = targetRole.permissions.some(
        (permission) => !requesterPermissions.includes(permission),
      );

      if (hasExceedingPermissions) {
        return res.status(403).json({
          success: false,
          message: "Cannot assign a role with permissions exceeding your own authority",
        });
      }
    }

    // 3. Apply role update
    targetMembership.role = targetRole._id;
    await targetMembership.save();

    // Dispatch notification to member about role change
    await createNotification({
      recipient: targetMembership.user,
      sender: req.user.id,
      organization: req.organization._id,
      type: "role_updated",
      title: "Organization Role Updated",
      message: `Your role in "${req.organization.name}" was updated to "${targetRole.name}"`,
      resourceType: "organization",
      resourceId: req.organization._id,
    });

    const updatedMembership = await Membership.findById(targetMembership._id)
      .populate("user", "name email avatar")
      .populate("role", "name description");

    return res.status(200).json({
      success: true,
      message: "Member role updated successfully",
      data: updatedMembership,
    });
  } catch (error) {
    console.error("updateMemberRole Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 3. DELETE /api/organizations/:orgId/members/:memberId
 * Removes a member from the organization (kick)
 */
const removeMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    if (!mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({ success: false, message: "Invalid member ID" });
    }

    const targetMembership = await Membership.findOne({
      _id: memberId,
      organization: req.organization._id,
      status: "active",
    }).populate("role");

    if (!targetMembership) {
      return res.status(404).json({
        success: false,
        message: "Active member not found in this organization",
      });
    }

    // Safeguard 1: Cannot remove the Owner
    if (targetMembership.role?.name === "owner") {
      return res.status(400).json({
        success: false,
        message: "Cannot remove the organization owner",
      });
    }

    // Safeguard 2: Cannot remove yourself via remove endpoint (use /leave)
    if (targetMembership.user.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot remove yourself. Please use the leave organization endpoint.",
      });
    }

    // Safeguard 3: Only Owner can remove an Admin
    if (req.orgRole.name !== "owner" && targetMembership.role?.name === "admin") {
      return res.status(403).json({
        success: false,
        message: "Only the organization owner can remove an Admin",
      });
    }

    // Soft removal
    targetMembership.status = "removed";
    targetMembership.removedAt = new Date();
    await targetMembership.save();

    return res.status(200).json({
      success: true,
      message: "Member removed from organization successfully",
    });
  } catch (error) {
    console.error("removeMember Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 4. POST /api/organizations/:orgId/leave
 * Allows a member to voluntarily leave an organization
 */
const leaveOrganization = async (req, res) => {
  try {
    // Safeguard 1: Owner cannot leave without transferring ownership
    if (req.orgRole.name === "owner") {
      return res.status(400).json({
        success: false,
        message: "As the organization owner, you cannot leave. Transfer ownership first or archive the organization.",
      });
    }

    // Soft leave
    req.membership.status = "left";
    req.membership.leftAt = new Date();
    await req.membership.save();

    return res.status(200).json({
      success: true,
      message: `You have successfully left ${req.organization.name}`,
    });
  } catch (error) {
    console.error("leaveOrganization Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 5. POST /api/organizations/:orgId/transfer-ownership
 * Atomically transfers workspace ownership to another active member
 */
const transferOwnership = async (req, res) => {
  let session;

  try {
    const { targetUserId } = req.body;

    // Safeguard 1: Only the current Owner can transfer ownership
    if (req.orgRole.name !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Only the current organization owner can transfer ownership",
      });
    }

    if (!targetUserId || !mongoose.isValidObjectId(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Valid target user ID is required",
      });
    }

    if (targetUserId.toString() === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You are already the organization owner",
      });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    // 1. Verify target user is an active member
    const targetMembership = await Membership.findOne({
      user: targetUserId,
      organization: req.organization._id,
      status: "active",
    }).session(session);

    if (!targetMembership) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Target user is not an active member of this organization",
      });
    }

    // 2. Fetch Owner and Admin roles of this organization
    const [ownerRole, adminRole] = await Promise.all([
      Role.findOne({ organization: req.organization._id, name: "owner" }).session(session),
      Role.findOne({ organization: req.organization._id, name: "admin" }).session(session),
    ]);

    if (!ownerRole || !adminRole) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: "System roles configuration missing for this organization",
      });
    }

    // 3. Demote current owner to Admin
    await Membership.updateOne(
      { _id: req.membership._id },
      { $set: { role: adminRole._id } },
      { session },
    );

    // 4. Promote target member to Owner
    await Membership.updateOne(
      { _id: targetMembership._id },
      { $set: { role: ownerRole._id } },
      { session },
    );

    // 5. Update organization createdBy / owner pointer
    await Organization.updateOne(
      { _id: req.organization._id },
      { $set: { createdBy: targetUserId } },
      { session },
    );

    await session.commitTransaction();

    // Dispatch notification to the new owner
    await createNotification({
      recipient: targetUserId,
      sender: req.user.id,
      organization: req.organization._id,
      type: "ownership_transferred",
      title: "Organization Ownership Transferred",
      message: `${req.user.name || "The owner"} has transferred ownership of "${req.organization.name}" to you. You are now the Organization Owner.`,
      resourceType: "organization",
      resourceId: req.organization._id,
    });

    const newOwnerUser = await User.findById(targetUserId).select("name email");

    return res.status(200).json({
      success: true,
      message: `Ownership of ${req.organization.name} successfully transferred to ${newOwnerUser?.name || targetUserId}`,
      data: {
        organizationId: req.organization._id,
        newOwner: {
          id: targetUserId,
          name: newOwnerUser?.name,
          email: newOwnerUser?.email,
        },
        previousOwnerRole: "admin",
      },
    });
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("transferOwnership Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

/**
 * 0e. PATCH /api/organizations/:orgId/roles/:roleId
 * Updates permissions and description for an existing custom role
 */
const updateOrganizationRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { description, permissions } = req.body;

    const role = await Role.findOne({
      _id: roleId,
      organization: req.organization._id,
    });

    if (!role) {
      return res.status(404).json({ success: false, message: "Role not found in this organization" });
    }

    if (role.isSystemRole) {
      return res.status(403).json({
        success: false,
        message: "System roles (Owner, Admin, Manager, Member) permissions cannot be modified",
      });
    }

    if (typeof description === "string") {
      role.description = description.trim();
    }

    if (Array.isArray(permissions)) {
      const allowed = Object.values(PERMISSIONS);
      const validPermissions = permissions.filter((p) => allowed.includes(p));

      // Privilege check: Non-owners cannot grant permissions exceeding their own
      if (req.orgRole.name !== "owner") {
        const myPermissions = req.orgRole.permissions || [];
        const exceeding = validPermissions.some((p) => !myPermissions.includes(p));
        if (exceeding) {
          return res.status(403).json({
            success: false,
            message: "Cannot grant permissions exceeding your own authority",
          });
        }
      }

      role.permissions = [...new Set(validPermissions)];
    }

    await role.save();

    return res.status(200).json({
      success: true,
      message: `Role '${role.name}' permissions updated successfully`,
      data: role,
    });
  } catch (error) {
    console.error("updateOrganizationRole Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  getPermissionsList,
  getOrganizationRoles,
  createOrganizationRole,
  updateOrganizationRole,
  deleteOrganizationRole,
  getOrganizationMembers,
  updateMemberRole,
  removeMember,
  leaveOrganization,
  transferOwnership,
};

