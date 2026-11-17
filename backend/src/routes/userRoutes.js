const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { uploadAvatarMiddleware } = require("../middleware/uploadMiddleware");
const { fileUploadLimiter } = require("../middleware/rateLimiter");

const {
  updateUserProfile,
  deleteOwnAccount,
  uploadUserAvatar,
  deleteUserAvatar,
} = require("../controllers/userController");

// Self-service profile management (org-scoped member management lives under /api/organizations)
router.use(authMiddleware);

router.patch("/profile", updateUserProfile);
router.delete("/profile", deleteOwnAccount);
router.post("/profile/avatar", fileUploadLimiter, uploadAvatarMiddleware, uploadUserAvatar);
router.delete("/profile/avatar", deleteUserAvatar);

module.exports = router;
