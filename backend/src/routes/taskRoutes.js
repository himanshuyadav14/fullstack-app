const express = require("express");
const {
  getOrganizationTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  assignTask,
  deleteTask,
  uploadTaskAttachment,
  deleteTaskAttachment,
} = require("../controllers/taskController");

const {
  requireOrgPermission,
  requireMembership,
} = require("../middleware/requireMembership");
const { uploadAttachmentMiddleware } = require("../middleware/uploadMiddleware");
const { fileUploadLimiter } = require("../middleware/rateLimiter");

const commentRoutes = require("./commentRoutes");

const router = express.Router({ mergeParams: true });

// All task operations require active membership in the organization
router.use(requireMembership);

// Organization-wide Tasks
router.get("/", requireOrgPermission("task:read"), getOrganizationTasks);
router.get("/:taskId", requireOrgPermission("task:read"), getTaskById);
router.patch("/:taskId", updateTask);
router.put("/:taskId", updateTask);
router.patch("/:taskId/status", updateTaskStatus);
router.put("/:taskId/status", updateTaskStatus);
router.patch("/:taskId/assign", assignTask);
router.put("/:taskId/assign", assignTask);
router.delete("/:taskId", deleteTask);

// Task Attachments (Phase 9)
router.post("/:taskId/attachments", fileUploadLimiter, uploadAttachmentMiddleware, uploadTaskAttachment);
router.delete("/:taskId/attachments/:attachmentId", deleteTaskAttachment);

// Task Comments (Phase 8)
router.use("/:taskId/comments", commentRoutes);

module.exports = router;

