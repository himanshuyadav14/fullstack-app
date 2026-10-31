const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorizePermission = require("../middleware/authorizePermission");

const {
  getAllPermissions,
  getRoles,
  createRole,
  updateRolePermission,
  deleteRole,
} = require("../controllers/roleController");

// Static routes first
router.get(
  "/permissions",
  authMiddleware,
  authorizePermission("role:read"),
  getAllPermissions,
);

router.get("/", authMiddleware, authorizePermission("role:read"), getRoles);

router.post("/", authMiddleware, authorizePermission("role:create"), createRole);

// Parameterized routes
router.patch(
  "/:roleName/permissions",
  authMiddleware,
  authorizePermission("role:update"),
  updateRolePermission,
);

router.delete(
  "/:roleName",
  authMiddleware,
  authorizePermission("role:delete"),
  deleteRole,
);

module.exports = router;
