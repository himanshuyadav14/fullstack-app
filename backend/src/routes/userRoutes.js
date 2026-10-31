const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorizePermission = require("../middleware/authorizePermission");
const {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  updateUserProfile,
} = require("../controllers/userController");

router.get("/", authMiddleware, authorizePermission("user:read"), getAllUsers);
router.patch("/profile", authMiddleware, updateUserProfile);
router.get(
  "/:userId",
  authMiddleware,
  authorizePermission("user:read"),
  getUserById,
);
router.patch(
  "/:userId/role",
  authMiddleware,
  authorizePermission("user:update"),
  updateUserRole,
);
router.delete(
  "/:userId",
  authMiddleware,
  authorizePermission("user:delete"),
  deleteUser,
);

module.exports = router;
