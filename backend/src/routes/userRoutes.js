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
  deleteOwnAccount,
} = require("../controllers/userController");

// Get all users
router.get("/", authMiddleware, authorizePermission("user:read"), getAllUsers);

// Update logged-in user's own profile
router.patch("/profile", authMiddleware, updateUserProfile);

// Delete own account
router.delete("/profile", authMiddleware, deleteOwnAccount);

// Get user by ID
router.get(
  "/:userId",
  authMiddleware,
  authorizePermission("user:read"),
  getUserById,
);

// Update user's role
router.patch(
  "/:userId/role",
  authMiddleware,
  authorizePermission("user:update"),
  updateUserRole,
);

// Delete another user (admin permission)
router.delete(
  "/:userId",
  authMiddleware,
  authorizePermission("user:delete"),
  deleteUser,
);

module.exports = router;
