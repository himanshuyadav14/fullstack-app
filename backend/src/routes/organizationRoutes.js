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

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all organizations where the logged-in user is an active member
router.get("/my", getMyOrganizations);

// Create a new organization (User becomes initial Owner)
router.post("/", createMyOrganization);

// Get single organization by ID (Must be an active member)
router.get("/:orgId", getOrganizationById);

// Organization Invitations (Owner / Admin with invitation permissions)
router.post("/:orgId/invitations", inviteMember);
router.get("/:orgId/invitations", getOrganizationInvitations);
router.delete("/:orgId/invitations/:invitationId", revokeInvitation);

module.exports = router;
