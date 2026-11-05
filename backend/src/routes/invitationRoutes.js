const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  acceptInvitation,
  rejectInvitation,
  getMyInvitations,
} = require("../controllers/invitationController");

// All routes require authentication
router.use(authMiddleware);

// Get pending invitations for logged-in user
router.get("/my", getMyInvitations);

// Invitee actions (token in request body: { "token": "..." })
router.post("/accept", acceptInvitation);
router.post("/reject", rejectInvitation);

module.exports = router;
