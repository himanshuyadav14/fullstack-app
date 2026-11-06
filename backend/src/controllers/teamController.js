const mongoose = require("mongoose");
const Team = require("../models/Team");
const Membership = require("../models/Membership");

/**
 * Escapes special regex characters to prevent ReDoS and unexpected query matching
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * 1. POST /api/organizations/:orgId/teams
 * Creates a new team in the organization
 */
const createTeam = async (req, res) => {
  try {
    const { name, description, leadId, memberIds } = req.body;

    // 1. Validate team name
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Team name is required",
      });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Team name must be between 2 and 100 characters",
      });
    }

    // 2. Validate description
    const trimmedDescription =
      typeof description === "string" ? description.trim() : "";
    if (trimmedDescription.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Description cannot exceed 500 characters",
      });
    }

    // 3. Check for unique team name within this organization (Case-insensitive via collation)
    const existingTeam = await Team.findOne({
      organization: req.organization._id,
      name: trimmedName,
    }).collation({ locale: "en", strength: 2 });

    if (existingTeam) {
      return res.status(409).json({
        success: false,
        message: "A team with this name already exists in this organization",
      });
    }

    // 4. Validate lead if provided
    let verifiedLeadId = null;
    if (leadId) {
      if (!mongoose.isValidObjectId(leadId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid team lead ID",
        });
      }

      const leadMembership = await Membership.findOne({
        organization: req.organization._id,
        user: leadId,
        status: "active",
      });

      if (!leadMembership) {
        return res.status(400).json({
          success: false,
          message: "Team lead must be an active member of this organization",
        });
      }

      verifiedLeadId = leadId;
    }

    // 5. Strict payload validation for initial memberIds
    let finalMemberIds = [];
    if (memberIds !== undefined) {
      if (!Array.isArray(memberIds)) {
        return res.status(400).json({
          success: false,
          message: "memberIds must be an array of user IDs",
        });
      }

      if (memberIds.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Cannot add more than 100 members in a single request",
        });
      }

      if (memberIds.length > 0) {
        // Deduplicate
        const uniqueIds = [...new Set(memberIds.map((id) => id.toString()))];

        for (const id of uniqueIds) {
          if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
              success: false,
              message: `Invalid member ID format: ${id}`,
            });
          }
        }

        const activeMemberships = await Membership.find({
          organization: req.organization._id,
          user: { $in: uniqueIds },
          status: "active",
        }).select("user");

        const activeUserIds = activeMemberships.map((m) => m.user.toString());
        const invalidUsers = uniqueIds.filter(
          (id) => !activeUserIds.includes(id),
        );

        if (invalidUsers.length > 0) {
          return res.status(400).json({
            success: false,
            message:
              "All team members must be active members of this organization",
            invalidUserIds: invalidUsers,
          });
        }

        finalMemberIds = activeUserIds;
      }
    }

    // Always include lead in team members list
    if (verifiedLeadId && !finalMemberIds.includes(verifiedLeadId.toString())) {
      finalMemberIds.push(verifiedLeadId.toString());
    }

    // Always include creator if they are an active org member
    if (!finalMemberIds.includes(req.user.id.toString())) {
      finalMemberIds.push(req.user.id.toString());
    }

    // 6. Create Team
    const newTeam = await Team.create({
      name: trimmedName,
      description: trimmedDescription,
      organization: req.organization._id,
      lead: verifiedLeadId,
      members: finalMemberIds,
      createdBy: req.user.id,
    });

    const populatedTeam = await Team.findOne({
      _id: newTeam._id,
      organization: req.organization._id,
    })
      .populate("lead", "name email avatar")
      .populate("members", "name email avatar")
      .populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Team created successfully",
      data: populatedTeam,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A team with this name already exists in this organization",
      });
    }

    console.error("createTeam Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 2. GET /api/organizations/:orgId/teams
 * Lists all teams in the organization with pagination and filters
 */
const getTeams = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );
    const skip = (page - 1) * limit;

    const filter = {
      organization: req.organization._id,
    };

    // Filter by search query (sanitized & length-capped)
    if (
      req.query.search &&
      typeof req.query.search === "string" &&
      req.query.search.trim()
    ) {
      const sanitizedSearch = req.query.search.trim().slice(0, 50);
      filter.name = { $regex: escapeRegex(sanitizedSearch), $options: "i" };
    }

    // Filter: only teams where current user is a member or lead
    if (req.query.myTeams === "true") {
      filter.$or = [{ members: req.user.id }, { lead: req.user.id }];
    }

    const [teams, total] = await Promise.all([
      Team.find(filter)
        .populate("lead", "name email avatar")
        .populate("createdBy", "name email")
        .select("-__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Team.countDocuments(filter),
    ]);

    const formattedTeams = teams.map((team) => ({
      _id: team._id,
      name: team.name,
      description: team.description,
      lead: team.lead,
      memberCount: team.members.length,
      createdBy: team.createdBy,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: formattedTeams,
    });
  } catch (error) {
    console.error("getTeams Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 3. GET /api/organizations/:orgId/teams/:teamId
 * Fetches single team details with populated members and lead
 */
const getTeamById = async (req, res) => {
  try {
    const { teamId } = req.params;

    if (!mongoose.isValidObjectId(teamId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid team ID",
      });
    }

    const team = await Team.findOne({
      _id: teamId,
      organization: req.organization._id,
    })
      .populate("lead", "name email avatar")
      .populate("members", "name email avatar isEmailVerified")
      .populate("createdBy", "name email");

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found in this organization",
      });
    }

    return res.status(200).json({
      success: true,
      data: team,
    });
  } catch (error) {
    console.error("getTeamById Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 4. PATCH /api/organizations/:orgId/teams/:teamId
 * Updates team info. Restricts lead reassignment to Owner/Admin only.
 */
const updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, description, leadId } = req.body;

    if (!mongoose.isValidObjectId(teamId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid team ID",
      });
    }

    const team = await Team.findOne({
      _id: teamId,
      organization: req.organization._id,
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found in this organization",
      });
    }

    // Check authority: Owner, Admin, team:update permission, OR Team Lead
    const isOwnerOrAdmin =
      req.orgRole.name === "owner" ||
      req.orgRole.name === "admin" ||
      req.orgRole.permissions?.includes("team:update");
    const isTeamLead =
      team.lead && team.lead.toString() === req.user.id.toString();

    if (!isOwnerOrAdmin && !isTeamLead) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this team",
      });
    }

    // Security Safeguard: Lead reassignment is restricted to Owner/Admin only
    if (leadId !== undefined && !isOwnerOrAdmin) {
      return res.status(403).json({
        success: false,
        message:
          "Only organization owners or administrators can assign or reassign team leads",
      });
    }

    // Update name
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Team name cannot be empty",
        });
      }

      const trimmedName = name.trim();
      if (trimmedName.length < 2 || trimmedName.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Team name must be between 2 and 100 characters",
        });
      }

      // Check collision using collation
      const duplicate = await Team.findOne({
        organization: req.organization._id,
        name: trimmedName,
        _id: { $ne: team._id },
      }).collation({ locale: "en", strength: 2 });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "A team with this name already exists in this organization",
        });
      }

      team.name = trimmedName;
    }

    // Update description with 500-character boundary validation
    if (description !== undefined) {
      if (typeof description !== "string") {
        return res.status(400).json({
          success: false,
          message: "Description must be a string",
        });
      }

      const trimmedDescription = description.trim();
      if (trimmedDescription.length > 500) {
        return res.status(400).json({
          success: false,
          message: "Description cannot exceed 500 characters",
        });
      }
      team.description = trimmedDescription;
    }

    // Update lead (Admin/Owner authorized)
    if (leadId !== undefined) {
      if (leadId === null || leadId === "") {
        team.lead = null;
      } else {
        if (!mongoose.isValidObjectId(leadId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid team lead ID",
          });
        }

        const leadMembership = await Membership.findOne({
          organization: req.organization._id,
          user: leadId,
          status: "active",
        });

        if (!leadMembership) {
          return res.status(400).json({
            success: false,
            message: "Team lead must be an active member of this organization",
          });
        }

        team.lead = leadId;

        // Ensure lead is in members array
        if (!team.members.some((m) => m.toString() === leadId.toString())) {
          team.members.push(leadId);
        }
      }
    }

    await team.save();

    const updatedTeam = await Team.findOne({
      _id: team._id,
      organization: req.organization._id,
    })
      .populate("lead", "name email avatar")
      .populate("members", "name email avatar");

    return res.status(200).json({
      success: true,
      message: "Team updated successfully",
      data: updatedTeam,
    });
  } catch (error) {
    console.error("updateTeam Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 5. POST /api/organizations/:orgId/teams/:teamId/members
 * Adds one or more members to the team with size limits and tenant-scoped updates
 */
const addTeamMembers = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { userIds, userId } = req.body;

    if (!mongoose.isValidObjectId(teamId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid team ID",
      });
    }

    const team = await Team.findOne({
      _id: teamId,
      organization: req.organization._id,
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found in this organization",
      });
    }

    // Check authority: Owner, Admin, team:update, or Team Lead
    const isOwnerOrAdmin =
      req.orgRole.name === "owner" ||
      req.orgRole.name === "admin" ||
      req.orgRole.permissions?.includes("team:update");
    const isTeamLead =
      team.lead && team.lead.toString() === req.user.id.toString();

    if (!isOwnerOrAdmin && !isTeamLead) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to add members to this team",
      });
    }

    // Strict payload validation
    let candidateIds = [];
    if (userIds !== undefined) {
      if (!Array.isArray(userIds)) {
        return res.status(400).json({
          success: false,
          message: "userIds must be an array of user IDs",
        });
      }
      candidateIds = userIds;
    } else if (userId !== undefined) {
      candidateIds = [userId];
    } else {
      return res.status(400).json({
        success: false,
        message: "userId or userIds array is required",
      });
    }

    if (candidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one user ID must be provided",
      });
    }

    if (candidateIds.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Cannot add more than 50 members in a single request",
      });
    }

    // Validate format
    for (const id of candidateIds) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: `Invalid user ID format: ${id}`,
        });
      }
    }

    // Filter out users already in the team
    const currentMemberIds = team.members.map((m) => m.toString());
    const newCandidateIds = candidateIds.filter(
      (id) => !currentMemberIds.includes(id.toString()),
    );

    if (newCandidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All specified users are already members of this team",
      });
    }

    // Verify all candidates are active members of this organization
    const activeMemberships = await Membership.find({
      organization: req.organization._id,
      user: { $in: newCandidateIds },
      status: "active",
    }).select("user");

    const verifiedUserIds = activeMemberships.map((m) => m.user.toString());
    const invalidUsers = newCandidateIds.filter(
      (id) => !verifiedUserIds.includes(id),
    );

    if (invalidUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "All team members must be active members of this organization",
        invalidUserIds: invalidUsers,
      });
    }

    // Atomic tenant-scoped update
    await Team.updateOne(
      { _id: team._id, organization: req.organization._id },
      { $addToSet: { members: { $each: verifiedUserIds } } },
    );

    const updatedTeam = await Team.findOne({
      _id: team._id,
      organization: req.organization._id,
    })
      .populate("lead", "name email avatar")
      .populate("members", "name email avatar");

    return res.status(200).json({
      success: true,
      message: `${verifiedUserIds.length} member(s) added to the team successfully`,
      data: {
        teamId: updatedTeam._id,
        teamName: updatedTeam.name,
        memberCount: updatedTeam.members.length,
        members: updatedTeam.members,
      },
    });
  } catch (error) {
    console.error("addTeamMembers Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 6. DELETE /api/organizations/:orgId/teams/:teamId/members/:userId
 * Removes a member from the team
 */
const removeTeamMember = async (req, res) => {
  try {
    const { teamId, userId } = req.params;

    if (
      !mongoose.isValidObjectId(teamId) ||
      !mongoose.isValidObjectId(userId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid team or user ID",
      });
    }

    const team = await Team.findOne({
      _id: teamId,
      organization: req.organization._id,
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found in this organization",
      });
    }

    // Permission check: Owner, Admin, Team Lead, OR self-removal (a user can leave a team)
    const isOwnerOrAdmin =
      req.orgRole.name === "owner" ||
      req.orgRole.name === "admin" ||
      req.orgRole.permissions?.includes("team:update");
    const isTeamLead =
      team.lead && team.lead.toString() === req.user.id.toString();
    const isSelfRemoval = req.user.id.toString() === userId.toString();

    if (!isOwnerOrAdmin && !isTeamLead && !isSelfRemoval) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to remove this member from the team",
      });
    }

    // Check if user is actually in the team
    const isMember = team.members.some(
      (m) => m.toString() === userId.toString(),
    );
    if (!isMember) {
      return res.status(404).json({
        success: false,
        message: "User is not a member of this team",
      });
    }

    // If removing the lead, clear lead field
    if (team.lead && team.lead.toString() === userId.toString()) {
      team.lead = null;
    }

    team.members = team.members.filter(
      (m) => m.toString() !== userId.toString(),
    );
    await team.save();

    return res.status(200).json({
      success: true,
      message: isSelfRemoval
        ? "You have left the team successfully"
        : "Member removed from the team successfully",
      data: {
        teamId: team._id,
        memberCount: team.members.length,
      },
    });
  } catch (error) {
    console.error("removeTeamMember Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 7. DELETE /api/organizations/:orgId/teams/:teamId
 * Deletes a team. Enforces strict Owner/Admin/team:delete authorization.
 */
const deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;

    if (!mongoose.isValidObjectId(teamId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid team ID",
      });
    }

    // Explicit controller-level authorization defense: Owner, Admin, or team:delete
    const isOwnerOrAdmin =
      req.orgRole.name === "owner" ||
      req.orgRole.name === "admin" ||
      req.orgRole.permissions?.includes("team:delete");

    if (!isOwnerOrAdmin) {
      return res.status(403).json({
        success: false,
        message:
          "Only organization owners or administrators have permission to delete teams",
      });
    }

    const team = await Team.findOne({
      _id: teamId,
      organization: req.organization._id,
    });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found in this organization",
      });
    }

    // Tenant-scoped deletion
    await Team.deleteOne({
      _id: team._id,
      organization: req.organization._id,
    });

    return res.status(200).json({
      success: true,
      message: `Team "${team.name}" deleted successfully`,
    });
  } catch (error) {
    console.error("deleteTeam Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  addTeamMembers,
  removeTeamMember,
  deleteTeam,
};
