const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorizePermission = require("../middleware/authorizePermission");

const {
  getRoles,
  updateRolePermission,
} = require("../controllers/roleController");

router.get("/", authMiddleware, authorizePermission("role:read"), getRoles);
router.patch(
  "/:roleName/permissions",
  authMiddleware,
  authorizePermission("role:update"),
  updateRolePermission,
);

module.exports = router;
