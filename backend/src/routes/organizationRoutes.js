const express = require("express");
const {
  createMyOrganization,
  getMyOrganizations,
  getOrganizationById,
} = require("../controllers/organizationController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);
// Get all organizations where the logged-in user is a member
router.get("/my", getMyOrganizations);
// Create a new organization (User becomes initial Owner)
router.post("/", createMyOrganization);
// Get single organization by ID (Must be an active member)
router.get("/:orgId", getOrganizationById);

module.exports = router;
