const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const authorizePermission = require("../middleware/authorizePermission");
const { uploadAvatarMiddleware } = require("../middleware/uploadMiddleware");

const {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  updateUserProfile,
  deleteOwnAccount,
  uploadUserAvatar,
  deleteUserAvatar,
} = require("../controllers/userController");

// Get all users
router.get("/", authMiddleware, authorizePermission("user:read"), getAllUsers);

// Profile Management
router.patch("/profile", authMiddleware, updateUserProfile);
router.delete("/profile", authMiddleware, deleteOwnAccount);
router.post("/profile/avatar", authMiddleware, uploadAvatarMiddleware, uploadUserAvatar);
router.delete("/profile/avatar", authMiddleware, deleteUserAvatar);

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
