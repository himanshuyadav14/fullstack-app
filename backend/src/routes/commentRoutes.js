const express = require("express");
const {
  createComment,
  getTaskComments,
  updateComment,
  deleteComment,
} = require("../controllers/commentController");

const {
  requireOrgPermission,
  requireMembership,
} = require("../middleware/requireMembership");

// mergeParams: true to inherit :orgId and :taskId from parent router
const router = express.Router({ mergeParams: true });

// All comment operations require active membership in the organization
router.use(requireMembership);

// Comment CRUD
router.post("/", requireOrgPermission("comment:create"), createComment);
router.get("/", requireOrgPermission("comment:read"), getTaskComments);
router.patch("/:commentId", updateComment);
router.delete("/:commentId", deleteComment);

module.exports = router;

