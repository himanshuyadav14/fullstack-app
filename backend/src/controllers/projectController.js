const mongoose = require("mongoose");
const Project = require("../models/Project");
const Team = require("../models/Team");
const Membership = require("../models/Membership");

/**
 * Escapes special regex characters to prevent ReDoS and unexpected query matching
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * 1. POST /api/organizations/:orgId/projects
 * Creates a new project scoped to the organization
 */
const createProject = async (req, res) => {
  try {
    const {
      name,
      key,
      description,
      teamId,
      leadId,
      memberIds,
      status,
      priority,
      startDate,
      dueDate,
    } = req.body;

    // 1. Validate name
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Project name must be between 2 and 100 characters",
      });
    }

    // 2. Validate key
    if (typeof key !== "string" || !key.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project key is required (e.g. TF, PROJ)",
      });
    }

    const normalizedKey = key.trim().toUpperCase();
    if (normalizedKey.length < 2 || normalizedKey.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Project key must be between 2 and 10 characters",
      });
    }

    if (!/^[A-Z0-9]+$/.test(normalizedKey)) {
      return res.status(400).json({
        success: false,
        message: "Project key must contain only uppercase alphanumeric characters",
      });
    }

    // 3. Check for unique key & name in this organization using collation
    const [existingKey, existingName] = await Promise.all([
      Project.findOne({
        organization: req.organization._id,
        key: normalizedKey,
      }).collation({ locale: "en", strength: 2 }),
      Project.findOne({
        organization: req.organization._id,
        name: trimmedName,
      }).collation({ locale: "en", strength: 2 }),
    ]);

    if (existingKey) {
      return res.status(409).json({
        success: false,
        message: `Project key "${normalizedKey}" is already in use in this organization`,
      });
    }

    if (existingName) {
      return res.status(409).json({
        success: false,
        message: `A project named "${trimmedName}" already exists in this organization`,
      });
    }

    // 4. Validate team if provided
    let verifiedTeamId = null;
    if (teamId) {
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

      verifiedTeamId = teamId;
    }

    // 5. Validate lead if provided
    let verifiedLeadId = null;
    if (leadId) {
      if (!mongoose.isValidObjectId(leadId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid project lead ID",
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
          message: "Project lead must be an active member of this organization",
        });
      }

      verifiedLeadId = leadId;
    }

    // 6. Strict payload validation for initial memberIds
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
        const invalidUsers = uniqueIds.filter((id) => !activeUserIds.includes(id));

        if (invalidUsers.length > 0) {
          return res.status(400).json({
            success: false,
            message: "All project members must be active members of this organization",
            invalidUserIds: invalidUsers,
          });
        }

        finalMemberIds = activeUserIds;
      }
    }

    // Ensure lead & creator are in members list
    if (verifiedLeadId && !finalMemberIds.includes(verifiedLeadId.toString())) {
      finalMemberIds.push(verifiedLeadId.toString());
    }

    if (!finalMemberIds.includes(req.user.id.toString())) {
      finalMemberIds.push(req.user.id.toString());
    }

    // 7. Validate dates
    let parsedStartDate = null;
    let parsedDueDate = null;

    if (startDate) {
      parsedStartDate = new Date(startDate);
      if (isNaN(parsedStartDate.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid start date format" });
      }
    }

    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid due date format" });
      }
    }

    if (parsedStartDate && parsedDueDate && parsedDueDate < parsedStartDate) {
      return res.status(400).json({
        success: false,
        message: "Due date cannot be earlier than start date",
      });
    }

    // 8. Validate description
    const trimmedDescription =
      typeof description === "string" ? description.trim() : "";
    if (trimmedDescription.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Description cannot exceed 1000 characters",
      });
    }

    // 9. Validate status & priority
    const allowedStatuses = ["planning", "active", "on_hold", "completed", "cancelled"];
    const allowedPriorities = ["low", "medium", "high", "urgent"];

    const finalStatus = allowedStatuses.includes(status) ? status : "planning";
    const finalPriority = allowedPriorities.includes(priority) ? priority : "medium";

    // 10. Create Project
    const project = await Project.create({
      name: trimmedName,
      key: normalizedKey,
      description: trimmedDescription,
      organization: req.organization._id,
      team: verifiedTeamId,
      lead: verifiedLeadId,
      members: finalMemberIds,
      status: finalStatus,
      priority: finalPriority,
      startDate: parsedStartDate,
      dueDate: parsedDueDate,
      createdBy: req.user.id,
    });

    const populatedProject = await Project.findOne({
      _id: project._id,
      organization: req.organization._id,
    })
      .populate("team", "name description")
      .populate("lead", "name email avatar")
      .populate("members", "name email avatar")
      .populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: populatedProject,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Project with this key or name already exists in this organization",
      });
    }
    console.error("createProject Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 2. GET /api/organizations/:orgId/projects
 * Lists projects in the organization with pagination and filters
 */
const getProjects = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {
      organization: req.organization._id,
    };

    // Filter by team
    if (req.query.teamId) {
      if (mongoose.isValidObjectId(req.query.teamId)) {
        filter.team = req.query.teamId;
      }
    }

    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Filter by priority
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    // Filter by search (name, key, description) sanitized and capped
    if (req.query.search && typeof req.query.search === "string" && req.query.search.trim()) {
      const sanitizedSearch = req.query.search.trim().slice(0, 50);
      const safeRegex = new RegExp(escapeRegex(sanitizedSearch), "i");
      filter.$or = [{ name: safeRegex }, { key: safeRegex }, { description: safeRegex }];
    }

    // Filter: only user's projects
    if (req.query.myProjects === "true") {
      filter.$or = [{ members: req.user.id }, { lead: req.user.id }];
    }

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .populate("team", "name")
        .populate("lead", "name email avatar")
        .populate("createdBy", "name email")
        .select("-__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Project.countDocuments(filter),
    ]);

    const formattedProjects = projects.map((p) => ({
      _id: p._id,
      name: p.name,
      key: p.key,
      description: p.description,
      status: p.status,
      priority: p.priority,
      team: p.team,
      lead: p.lead,
      memberCount: p.members.length,
      startDate: p.startDate,
      dueDate: p.dueDate,
      createdBy: p.createdBy,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: formattedProjects,
    });
  } catch (error) {
    console.error("getProjects Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 3. GET /api/organizations/:orgId/projects/:projectId
 * Fetches single project details with populated team, lead, and members
 */
const getProjectById = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }

    const project = await Project.findOne({
      _id: projectId,
      organization: req.organization._id,
    })
      .populate("team", "name description lead")
      .populate("lead", "name email avatar")
      .populate("members", "name email avatar isEmailVerified")
      .populate("createdBy", "name email");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found in this organization",
      });
    }

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("getProjectById Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 4. PATCH /api/organizations/:orgId/projects/:projectId
 * Updates project metadata. Restricts lead reassignment to Owner/Admin only.
 */
const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      name,
      description,
      status,
      priority,
      startDate,
      dueDate,
      teamId,
      leadId,
    } = req.body;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }

    const project = await Project.findOne({
      _id: projectId,
      organization: req.organization._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found in this organization",
      });
    }

    // Permission check: Owner, Admin, project:update, or Project Lead
    const isOwnerOrAdmin =
      req.orgRole.name === "owner" ||
      req.orgRole.name === "admin" ||
      req.orgRole.permissions?.includes("project:update");
    const isProjectLead = project.lead && project.lead.toString() === req.user.id.toString();

    if (!isOwnerOrAdmin && !isProjectLead) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this project",
      });
    }

    // Security Safeguard: Lead reassignment is restricted to Owner/Admin only
    if (leadId !== undefined && !isOwnerOrAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only organization owners or administrators can reassign project leads",
      });
    }

    // Name update
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ success: false, message: "Project name cannot be empty" });
      }

      const trimmedName = name.trim();
      if (trimmedName.length < 2 || trimmedName.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Project name must be between 2 and 100 characters",
        });
      }

      const duplicate = await Project.findOne({
        organization: req.organization._id,
        name: trimmedName,
        _id: { $ne: project._id },
      }).collation({ locale: "en", strength: 2 });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `A project named "${trimmedName}" already exists in this organization`,
        });
      }

      project.name = trimmedName;
    }

    // Description update with 1000-char boundary check
    if (description !== undefined) {
      if (typeof description !== "string") {
        return res.status(400).json({ success: false, message: "Description must be a string" });
      }
      if (description.trim().length > 1000) {
        return res.status(400).json({
          success: false,
          message: "Description cannot exceed 1000 characters",
        });
      }
      project.description = description.trim();
    }

    // Status update
    if (status !== undefined) {
      const allowedStatuses = ["planning", "active", "on_hold", "completed", "cancelled"];
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed values: ${allowedStatuses.join(", ")}`,
        });
      }
      project.status = status;
    }

    // Priority update
    if (priority !== undefined) {
      const allowedPriorities = ["low", "medium", "high", "urgent"];
      if (!allowedPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: `Invalid priority. Allowed values: ${allowedPriorities.join(", ")}`,
        });
      }
      project.priority = priority;
    }

    // Team update
    if (teamId !== undefined) {
      if (teamId === null || teamId === "") {
        project.team = null;
      } else {
        if (!mongoose.isValidObjectId(teamId)) {
          return res.status(400).json({ success: false, message: "Invalid team ID" });
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

        project.team = teamId;
      }
    }

    // Lead update (Admin/Owner authorized)
    if (leadId !== undefined) {
      if (leadId === null || leadId === "") {
        project.lead = null;
      } else {
        if (!mongoose.isValidObjectId(leadId)) {
          return res.status(400).json({ success: false, message: "Invalid lead ID" });
        }

        const leadMembership = await Membership.findOne({
          organization: req.organization._id,
          user: leadId,
          status: "active",
        });

        if (!leadMembership) {
          return res.status(400).json({
            success: false,
            message: "Project lead must be an active member of this organization",
          });
        }

        project.lead = leadId;

        // Ensure lead is in members list
        if (!project.members.some((m) => m.toString() === leadId.toString())) {
          project.members.push(leadId);
        }
      }
    }

    // Dates update
    if (startDate !== undefined) {
      project.startDate = startDate ? new Date(startDate) : null;
    }

    if (dueDate !== undefined) {
      project.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (project.startDate && project.dueDate && project.dueDate < project.startDate) {
      return res.status(400).json({
        success: false,
        message: "Due date cannot be earlier than start date",
      });
    }

    await project.save();

    const updatedProject = await Project.findOne({
      _id: project._id,
      organization: req.organization._id,
    })
      .populate("team", "name description")
      .populate("lead", "name email avatar")
      .populate("members", "name email avatar");

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: updatedProject,
    });
  } catch (error) {
    console.error("updateProject Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 5. POST /api/organizations/:orgId/projects/:projectId/members
 * Adds members to the project with size limits and tenant-scoped updates
 */
const addProjectMembers = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userIds, userId } = req.body;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }

    const project = await Project.findOne({
      _id: projectId,
      organization: req.organization._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found in this organization",
      });
    }

    // Permission check
    const isOwnerOrAdmin =
      req.orgRole.name === "owner" ||
      req.orgRole.name === "admin" ||
      req.orgRole.permissions?.includes("project:update");
    const isProjectLead = project.lead && project.lead.toString() === req.user.id.toString();

    if (!isOwnerOrAdmin && !isProjectLead) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to add members to this project",
      });
    }

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

    for (const id of candidateIds) {
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ success: false, message: `Invalid user ID format: ${id}` });
      }
    }

    const currentMemberIds = project.members.map((m) => m.toString());
    const newCandidateIds = candidateIds.filter((id) => !currentMemberIds.includes(id.toString()));

    if (newCandidateIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "All specified users are already members of this project",
      });
    }

    // Verify active org membership
    const activeMemberships = await Membership.find({
      organization: req.organization._id,
      user: { $in: newCandidateIds },
      status: "active",
    }).select("user");

    const verifiedUserIds = activeMemberships.map((m) => m.user.toString());
    const invalidUsers = newCandidateIds.filter((id) => !verifiedUserIds.includes(id));

    if (invalidUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "All project members must be active members of this organization",
        invalidUserIds: invalidUsers,
      });
    }

    // Atomic tenant-scoped update
    await Project.updateOne(
      { _id: project._id, organization: req.organization._id },
      { $addToSet: { members: { $each: verifiedUserIds } } },
    );

    const updatedProject = await Project.findOne({
      _id: project._id,
      organization: req.organization._id,
    })
      .populate("lead", "name email avatar")
      .populate("members", "name email avatar");

    return res.status(200).json({
      success: true,
      message: `${verifiedUserIds.length} member(s) added to project successfully`,
      data: {
        projectId: updatedProject._id,
        projectName: updatedProject.name,
        memberCount: updatedProject.members.length,
        members: updatedProject.members,
      },
    });
  } catch (error) {
    console.error("addProjectMembers Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 6. DELETE /api/organizations/:orgId/projects/:projectId/members/:userId
 * Removes a member from the project (or self-leave)
 */
const removeProjectMember = async (req, res) => {
  try {
    const { projectId, userId } = req.params;

    if (!mongoose.isValidObjectId(projectId) || !mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid ID parameters" });
    }

    const project = await Project.findOne({
      _id: projectId,
      organization: req.organization._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found in this organization",
      });
    }

    const isOwnerOrAdmin =
      req.orgRole.name === "owner" ||
      req.orgRole.name === "admin" ||
      req.orgRole.permissions?.includes("project:update");
    const isProjectLead = project.lead && project.lead.toString() === req.user.id.toString();
    const isSelfRemoval = req.user.id.toString() === userId.toString();

    if (!isOwnerOrAdmin && !isProjectLead && !isSelfRemoval) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to remove this member from the project",
      });
    }

    const isMember = project.members.some((m) => m.toString() === userId.toString());
    if (!isMember) {
      return res.status(404).json({
        success: false,
        message: "User is not a member of this project",
      });
    }

    // If removing the lead, clear lead field
    if (project.lead && project.lead.toString() === userId.toString()) {
      project.lead = null;
    }

    project.members = project.members.filter((m) => m.toString() !== userId.toString());
    await project.save();

    return res.status(200).json({
      success: true,
      message: isSelfRemoval
        ? "You have left the project successfully"
        : "Member removed from the project successfully",
      data: {
        projectId: project._id,
        memberCount: project.members.length,
      },
    });
  } catch (error) {
    console.error("removeProjectMember Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 7. DELETE /api/organizations/:orgId/projects/:projectId
 * Deletes a project. Enforces strict Owner/Admin/project:delete authorization.
 */
const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }

    // Explicit controller-level authorization defense: Owner, Admin, or project:delete
    const isOwnerOrAdmin =
      req.orgRole.name === "owner" ||
      req.orgRole.name === "admin" ||
      req.orgRole.permissions?.includes("project:delete");

    if (!isOwnerOrAdmin) {
      return res.status(403).json({
        success: false,
        message: "Only organization owners or administrators have permission to delete projects",
      });
    }

    const project = await Project.findOne({
      _id: projectId,
      organization: req.organization._id,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found in this organization",
      });
    }

    // Tenant-scoped deletion
    await Project.deleteOne({
      _id: project._id,
      organization: req.organization._id,
    });

    return res.status(200).json({
      success: true,
      message: `Project "${project.name}" (${project.key}) deleted successfully`,
    });
  } catch (error) {
    console.error("deleteProject Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  addProjectMembers,
  removeProjectMember,
  deleteProject,
};
