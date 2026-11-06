const express = require("express");
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  addProjectMembers,
  removeProjectMember,
  deleteProject,
} = require("../controllers/projectController");

const {
  requireOrgPermission,
  requireMembership,
} = require("../middleware/requireMembership");

const router = express.Router({ mergeParams: true });

// All project routes require active organization membership
router.use(requireMembership);

// Project CRUD
router.post("/", requireOrgPermission("project:create"), createProject);
router.get("/", requireOrgPermission("project:read"), getProjects);
router.get("/:projectId", requireOrgPermission("project:read"), getProjectById);
router.patch("/:projectId", updateProject);
router.delete("/:projectId", requireOrgPermission("project:delete"), deleteProject);

// Project Members Management
router.post("/:projectId/members", addProjectMembers);
router.delete("/:projectId/members/:userId", removeProjectMember);

module.exports = router;

