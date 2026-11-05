const crypto = require("crypto");
const mongoose = require("mongoose");
const Organization = require("../models/Organization");
const Membership = require("../models/Membership");
const Role = require("../models/Role");
const User = require("../models/User");
const Invitation = require("../models/Invitation");
const { isValidEmail } = require("../utils/validate");
const { sendInvitationEmail } = require("../services/emailService");

/**
 * 1. POST /api/organizations/:orgId/invitations
 * Sends an invitation to an email with privilege escalation checks and expired sweep
 */
const inviteMember = async (req, res) => {
  try {
    const { orgId } = req.params;
    const { email, roleId } = req.body;

    // 1. Validate IDs
    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ success: false, message: "Invalid organization ID" });
    }

    if (!roleId || !mongoose.isValidObjectId(roleId)) {
      return res.status(400).json({ success: false, message: "Valid role ID is required" });
    }

    // 2. Validate Email
    if (!email || typeof email !== "string" || !isValidEmail(email.trim())) {
      return res.status(400).json({ success: false, message: "Valid email address is required" });
    }
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Verify requester has active membership and permission
    const requesterMembership = await Membership.findOne({
      user: req.user.id,
      organization: orgId,
      status: "active",
    }).populate("role");

    if (!requesterMembership) {
      return res.status(403).json({
        success: false,
        message: "You are not an active member of this organization",
      });
    }

    const isRequesterOwner = requesterMembership.role?.name === "owner";
    const hasInvitePermission =
      isRequesterOwner || requesterMembership.role?.permissions?.includes("invitation:create");

    if (!hasInvitePermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to invite members",
      });
    }

    // 4. Verify organization is active
    const organization = await Organization.findById(orgId);
    if (!organization || organization.status !== "active") {
      return res.status(404).json({ success: false, message: "Active organization not found" });
    }

    // 5. Verify target role belongs to THIS organization
    const targetRole = await Role.findOne({ _id: roleId, organization: orgId });
    if (!targetRole) {
      return res.status(404).json({ success: false, message: "Role not found in this organization" });
    }

    // Privilege Escalation Prevention
    if (targetRole.name === "owner") {
      return res.status(400).json({
        success: false,
        message: "Cannot invite a member directly as Owner. Use ownership transfer instead.",
      });
    }

    if (!isRequesterOwner) {
      // Non-owners cannot assign Admin role
      if (targetRole.name === "admin") {
        return res.status(403).json({
          success: false,
          message: "Only the organization Owner can assign the Admin role",
        });
      }

      // Ensure target role permissions are a subset of inviter's permissions
      const inviterPermissions = requesterMembership.role?.permissions || [];
      const hasExceedingPermissions = targetRole.permissions.some(
        (permission) => !inviterPermissions.includes(permission),
      );

      if (hasExceedingPermissions) {
        return res.status(403).json({
          success: false,
          message: "Cannot assign a role with permissions exceeding your own authority",
        });
      }
    }

    // 6. Check if target user is already an active member
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const existingMembership = await Membership.findOne({
        user: existingUser._id,
        organization: orgId,
        status: "active",
      });

      if (existingMembership) {
        return res.status(409).json({
          success: false,
          message: "User is already an active member of this organization",
        });
      }
    }

    // Sweep Expired Pending Invites to avoid unique partial index collision
    await Invitation.updateMany(
      {
        organization: orgId,
        email: normalizedEmail,
        status: "pending",
        expiresAt: { $lte: new Date() },
      },
      { $set: { status: "expired" } },
    );

    // 7. Check if an active pending invite still exists
    const existingActivePending = await Invitation.findOne({
      organization: orgId,
      email: normalizedEmail,
      status: "pending",
    });

    if (existingActivePending) {
      return res.status(409).json({
        success: false,
        message: "A pending invitation already exists for this email in this organization",
      });
    }

    // 8. Fetch real Inviter Name for email
    const inviterUser = await User.findById(req.user.id).select("name email");
    const inviterDisplayName = inviterUser?.name || "A team administrator";

    // 9. Generate secure token and SHA-256 hash
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await Invitation.create({
      organization: orgId,
      email: normalizedEmail,
      invitedBy: req.user.id,
      role: targetRole._id,
      tokenHash,
      status: "pending",
      expiresAt,
    });

    // 10. Send Email
    const emailResult = await sendInvitationEmail({
      to: normalizedEmail,
      inviterName: inviterDisplayName,
      organizationName: organization.name,
      roleName: targetRole.name,
      invitationToken: rawToken,
    });

    if (!emailResult?.success) {
      console.warn("⚠️ Invitation saved, but email delivery encountered an issue.");
    }

    return res.status(201).json({
      success: true,
      message: "Invitation sent successfully via email",
      data: {
        invitationId: invitation._id,
        email: invitation.email,
        role: targetRole.name,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("inviteMember Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 2. POST /api/invitations/accept
 * Body: { "token": "..." }
 * Accepts an invitation using atomic conditional update and transaction
 */
const acceptInvitation = async (req, res) => {
  let session;

  try {
    const { token } = req.body;

    if (!token || typeof token !== "string" || !token.trim()) {
      return res.status(400).json({ success: false, message: "Valid invitation token is required" });
    }

    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

    session = await mongoose.startSession();
    session.startTransaction();

    // Atomic Conditional State Transition
    const invitation = await Invitation.findOneAndUpdate(
      {
        tokenHash,
        status: "pending",
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          status: "accepted",
          acceptedAt: new Date(),
        },
      },
      {
        new: true,
        session,
      },
    )
      .populate("organization")
      .populate("role");

    if (!invitation) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Invalid, expired, or already processed invitation token",
      });
    }

    // Verify organization is still active
    if (!invitation.organization || invitation.organization.status !== "active") {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "The organization is no longer active" });
    }

    // Verify role still exists
    if (!invitation.role) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Assigned invitation role no longer exists" });
    }

    // Verify email and account verification status
    const currentUser = await User.findById(req.user.id).session(session);

    if (
      !currentUser ||
      currentUser.status !== "active" ||
      !currentUser.isEmailVerified ||
      currentUser.email !== invitation.email
    ) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: "Account verification required or invitation email mismatch",
      });
    }

    // Rejoin & Suspension Handling
    let membership = await Membership.findOne({
      user: currentUser._id,
      organization: invitation.organization._id,
    }).session(session);

    if (membership) {
      if (membership.status === "suspended") {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          message: "Your membership in this organization is suspended. Please contact the administrator.",
        });
      }

      // Rejoin policy for previously left/removed members
      membership.status = "active";
      membership.role = invitation.role._id;
      membership.joinedAt = new Date();
      membership.leftAt = null;
      membership.removedAt = null;
      await membership.save({ session });
    } else {
      const [newMembership] = await Membership.create(
        [
          {
            user: currentUser._id,
            organization: invitation.organization._id,
            role: invitation.role._id,
            status: "active",
            joinedAt: new Date(),
          },
        ],
        { session },
      );
      membership = newMembership;
    }

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: `You have successfully joined ${invitation.organization.name}!`,
      data: {
        organization: {
          _id: invitation.organization._id,
          name: invitation.organization.name,
          slug: invitation.organization.slug,
        },
        role: invitation.role.name,
        membershipId: membership._id,
      },
    });
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }
    console.error("acceptInvitation Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

/**
 * 3. POST /api/invitations/reject
 * Body: { "token": "..." }
 * Rejects an invitation atomically (No membership created)
 */
const rejectInvitation = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== "string" || !token.trim()) {
      return res.status(400).json({ success: false, message: "Valid token is required" });
    }

    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

    // Check if invitation exists and handle expiry explicitly
    const existingInvitation = await Invitation.findOne({ tokenHash });
    if (!existingInvitation) {
      return res.status(404).json({
        success: false,
        message: "Invalid invitation token",
      });
    }

    if (existingInvitation.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Invitation is already ${existingInvitation.status}`,
      });
    }

    if (existingInvitation.expiresAt <= new Date()) {
      existingInvitation.status = "expired";
      await existingInvitation.save();
      return res.status(400).json({
        success: false,
        message: "Invitation has expired",
      });
    }

    // Atomic conditional rejection
    const invitation = await Invitation.findOneAndUpdate(
      {
        tokenHash,
        status: "pending",
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          status: "rejected",
          rejectedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!invitation) {
      return res.status(409).json({
        success: false,
        message: "Invitation was already processed by another concurrent request",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invitation rejected successfully",
    });
  } catch (error) {
    console.error("rejectInvitation Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 4. GET /api/invitations/my
 * Lists pending invitations sent to the currently authenticated user's email
 */
const getMyInvitations = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const invitations = await Invitation.find({
      email: currentUser.email,
      status: "pending",
      expiresAt: { $gt: new Date() },
    })
      .populate("organization", "name slug logo")
      .populate("role", "name description")
      .populate("invitedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: invitations.length,
      data: invitations,
    });
  } catch (error) {
    console.error("getMyInvitations Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 5. GET /api/organizations/:orgId/invitations
 * Paginated list of invitations for organization admin
 */
const getOrganizationInvitations = async (req, res) => {
  try {
    const { orgId } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({ success: false, message: "Invalid organization ID" });
    }

    // Verify active organization
    const organization = await Organization.findById(orgId);
    if (!organization || organization.status !== "active") {
      return res.status(404).json({ success: false, message: "Active organization not found" });
    }

    // Permission check
    const requesterMembership = await Membership.findOne({
      user: req.user.id,
      organization: orgId,
      status: "active",
    }).populate("role");

    const hasReadPermission =
      requesterMembership?.role?.name === "owner" ||
      requesterMembership?.role?.permissions?.includes("invitation:read");

    if (!hasReadPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view invitations",
      });
    }

    const [invitations, total] = await Promise.all([
      Invitation.find({ organization: orgId })
        .populate("role", "name description")
        .populate("invitedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Invitation.countDocuments({ organization: orgId }),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: invitations,
    });
  } catch (error) {
    console.error("getOrganizationInvitations Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 6. DELETE /api/organizations/:orgId/invitations/:invitationId
 * Atomically revokes a pending invitation
 */
const revokeInvitation = async (req, res) => {
  try {
    const { orgId, invitationId } = req.params;

    if (!mongoose.isValidObjectId(orgId) || !mongoose.isValidObjectId(invitationId)) {
      return res.status(400).json({ success: false, message: "Invalid ID parameters" });
    }

    const requesterMembership = await Membership.findOne({
      user: req.user.id,
      organization: orgId,
      status: "active",
    }).populate("role");

    const hasRevokePermission =
      requesterMembership?.role?.name === "owner" ||
      requesterMembership?.role?.permissions?.includes("invitation:revoke");

    if (!hasRevokePermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to revoke invitations",
      });
    }

    // Atomic conditional revoke
    const invitation = await Invitation.findOneAndUpdate(
      {
        _id: invitationId,
        organization: orgId,
        status: "pending",
      },
      {
        $set: {
          status: "revoked",
          revokedAt: new Date(),
          revokedBy: req.user.id,
        },
      },
      { new: true },
    );

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Pending invitation not found or already processed",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Invitation revoked successfully",
    });
  } catch (error) {
    console.error("revokeInvitation Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  inviteMember,
  acceptInvitation,
  rejectInvitation,
  getMyInvitations,
  getOrganizationInvitations,
  revokeInvitation,
};
