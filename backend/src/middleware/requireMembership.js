const mongoose = require("mongoose");
const Organization = require("../models/Organization");
const Membership = require("../models/Membership");

/**
 * Middleware that extracts orgId, validates organization status,
 * verifies user's active membership, and optionally checks required permission.
 *
 * Attaches to req:
 * - req.organization (Organization document)
 * - req.membership (Membership document with populated role)
 * - req.orgRole (Role document)
 *
 * @param {string} [requiredPermission] - Optional permission string e.g. "member:read"
 */
const requireOrgPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const orgId = req.params.orgId || req.headers["x-organization-id"];

      if (!orgId || !mongoose.isValidObjectId(orgId)) {
        return res.status(400).json({
          success: false,
          message: "Valid organization ID is required",
        });
      }

      // 1. Verify organization exists and is active
      const organization = await Organization.findById(orgId);
      if (!organization || organization.status !== "active") {
        return res.status(404).json({
          success: false,
          message: "Active organization not found",
        });
      }

      // 2. Verify logged-in user has active membership
      const membership = await Membership.findOne({
        user: req.user.id,
        organization: orgId,
        status: "active",
      }).populate("role");

      if (!membership || !membership.role) {
        return res.status(403).json({
          success: false,
          message: "You are not an active member of this organization",
        });
      }

      // 3. Attach organization context to request
      req.organization = organization;
      req.membership = membership;
      req.orgRole = membership.role;

      // 4. If a specific permission is required, verify authority
      if (requiredPermission) {
        const isOwner = membership.role.name === "owner";
        const hasPermission =
          isOwner || membership.role.permissions?.includes(requiredPermission);

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: `You do not have required permission: ${requiredPermission}`,
          });
        }
      }

      next();
    } catch (error) {
      console.error("requireOrgPermission error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  };
};

/**
 * Shorthand for routes that simply require active membership
 */
const requireMembership = requireOrgPermission();

module.exports = {
  requireOrgPermission,
  requireMembership,
};
