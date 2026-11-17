const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

const {
  acceptInvitation,
  acceptInvitationById,
  rejectInvitation,
  rejectInvitationById,
  getMyInvitations,
} = require("../controllers/invitationController");

// All routes require authentication
router.use(authMiddleware);

// Get pending invitations for logged-in user
router.get("/my", getMyInvitations);

// Invitee actions (token in request body: { "token": "..." })
router.post("/accept", acceptInvitation);
router.post("/reject", rejectInvitation);

// In-app actions from the pending list (matched against the caller's email)
router.post("/:invitationId/accept", acceptInvitationById);
router.post("/:invitationId/reject", rejectInvitationById);

module.exports = router;
