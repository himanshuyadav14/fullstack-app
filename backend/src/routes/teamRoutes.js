const express = require("express");
const {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  addTeamMembers,
  removeTeamMember,
  deleteTeam,
} = require("../controllers/teamController");

const {
  requireOrgPermission,
  requireMembership,
} = require("../middleware/requireMembership");

// mergeParams allows access to :orgId from parent router
const router = express.Router({ mergeParams: true });

// All team operations require active membership in the organization
router.use(requireMembership);

// Team CRUD
router.post("/", requireOrgPermission("team:create"), createTeam);
router.get("/", requireOrgPermission("team:read"), getTeams);
router.get("/:teamId", requireOrgPermission("team:read"), getTeamById);
router.patch("/:teamId", updateTeam);
router.delete("/:teamId", requireOrgPermission("team:delete"), deleteTeam);

// Team Members Management
router.post("/:teamId/members", addTeamMembers);
router.delete("/:teamId/members/:userId", removeTeamMember);

module.exports = router;

