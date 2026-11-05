const express = require("express");
const {
  createMyOrganization,
  getMyOrganizations,
  getOrganizationById,
} = require("../controllers/organizationController");

const {
  inviteMember,
  getOrganizationInvitations,
  revokeInvitation,
} = require("../controllers/invitationController");

const {
  getOrganizationMembers,
  updateMemberRole,
  removeMember,
  leaveOrganization,
  transferOwnership,
} = require("../controllers/memberController");

const authMiddleware = require("../middleware/authMiddleware");
const {
  requireOrgPermission,
  requireMembership,
} = require("../middleware/requireMembership");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Organization Core
router.get("/my", getMyOrganizations);
router.post("/", createMyOrganization);
router.get("/:orgId", getOrganizationById);

// Member Management
router.get("/:orgId/members", requireOrgPermission("member:read"), getOrganizationMembers);
router.patch("/:orgId/members/:memberId/role", requireOrgPermission("member:update"), updateMemberRole);
router.delete("/:orgId/members/:memberId", requireOrgPermission("member:remove"), removeMember);
router.post("/:orgId/leave", requireMembership, leaveOrganization);
router.post("/:orgId/transfer-ownership", requireMembership, transferOwnership);

// Organization Invitations
router.post("/:orgId/invitations", inviteMember);
router.get("/:orgId/invitations", getOrganizationInvitations);
router.delete("/:orgId/invitations/:invitationId", revokeInvitation);

module.exports = router;
