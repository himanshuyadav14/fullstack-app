const mongoose = require("mongoose");
const Task = require("../models/Task");
const Project = require("../models/Project");
const Team = require("../models/Team");
const Membership = require("../models/Membership");

/**
 * Escapes special regex characters for safe search queries
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * 1. POST /api/organizations/:orgId/projects/:projectId/tasks
 * Creates a new task with atomic auto-incrementing task key (e.g., TF-1, TF-2)
 */
const createTask = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      title,
      description,
      assigneeId,
      teamId,
      status,
      priority,
      startDate,
      dueDate,
      estimatedHours,
      tags,
    } = req.body;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // 1. Verify project belongs to THIS organization and atomically increment counter
    const project = await Project.findOneAndUpdate(
      {
        _id: projectId,
        organization: req.organization._id,
      },
      {
        $inc: { taskCounter: 1 },
      },
      {
        new: true,
      },
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found in this organization",
      });
    }

    // 2. Validate title
    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2 || trimmedTitle.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Task title must be between 2 and 200 characters",
      });
    }

    // 3. Validate description (max 10000 chars)
    const trimmedDescription =
      typeof description === "string" ? description.trim() : "";
    if (trimmedDescription.length > 10000) {
      return res.status(400).json({
        success: false,
        message: "Description cannot exceed 10000 characters",
      });
    }

    // 4. Validate assignee if provided
    let verifiedAssigneeId = null;
    if (assigneeId) {
      if (!mongoose.isValidObjectId(assigneeId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid assignee user ID",
        });
      }

      const assigneeMembership = await Membership.findOne({
        organization: req.organization._id,
        user: assigneeId,
        status: "active",
      });

      if (!assigneeMembership) {
        return res.status(400).json({
          success: false,
          message: "Assignee must be an active member of this organization",
        });
      }

      verifiedAssigneeId = assigneeId;
    }

    // 5. Validate team if provided (defaults to project's team)
    let verifiedTeamId = project.team || null;
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

    // 6. Validate dates
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

    // 7. Validate status & priority
    const allowedStatuses = ["todo", "in_progress", "in_review", "done", "cancelled"];
    const allowedPriorities = ["low", "medium", "high", "urgent"];

    const finalStatus = allowedStatuses.includes(status) ? status : "todo";
    const finalPriority = allowedPriorities.includes(priority) ? priority : "medium";

    // 8. Generate task key e.g. TF-1, TF-2
    const taskKey = `${project.key}-${project.taskCounter}`;

    // 9. Calculate initial column order (highest current order + 1)
    const lastTask = await Task.findOne({
      project: project._id,
      status: finalStatus,
    }).sort({ order: -1 });

    const newOrder = lastTask && typeof lastTask.order === "number" ? lastTask.order + 1 : 0;

    // 10. Validate tags
    let formattedTags = [];
    if (Array.isArray(tags)) {
      formattedTags = tags
        .filter((t) => typeof t === "string" && t.trim())
        .map((t) => t.trim().toLowerCase().slice(0, 30))
        .slice(0, 10);
    }

    // 11. Create Task
    const task = await Task.create({
      title: trimmedTitle,
      taskKey,
      description: trimmedDescription,
      organization: req.organization._id,
      project: project._id,
      team: verifiedTeamId,
      status: finalStatus,
      priority: finalPriority,
      assignee: verifiedAssigneeId,
      reporter: req.user.id,
      startDate: parsedStartDate,
      dueDate: parsedDueDate,
      estimatedHours: typeof estimatedHours === "number" && estimatedHours >= 0 ? estimatedHours : null,
      order: newOrder,
      tags: formattedTags,
    });

    const populatedTask = await Task.findOne({
      _id: task._id,
      organization: req.organization._id,
    })
      .populate("project", "name key")
      .populate("team", "name")
      .populate("assignee", "name email avatar")
      .populate("reporter", "name email avatar");

    return res.status(201).json({
      success: true,
      message: `Task ${taskKey} created successfully`,
      data: populatedTask,
    });
  } catch (error) {
    console.error("createTask Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 2. GET /api/organizations/:orgId/tasks
 * Organization-wide task list with comprehensive filters & pagination
 */
const getOrganizationTasks = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {
      organization: req.organization._id,
    };

    // Filter by project
    if (req.query.projectId && mongoose.isValidObjectId(req.query.projectId)) {
      filter.project = req.query.projectId;
    }

    // Filter by team
    if (req.query.teamId && mongoose.isValidObjectId(req.query.teamId)) {
      filter.team = req.query.teamId;
    }

    // Filter by assignee
    if (req.query.assigneeId) {
      if (req.query.assigneeId === "unassigned") {
        filter.assignee = null;
      } else if (mongoose.isValidObjectId(req.query.assigneeId)) {
        filter.assignee = req.query.assigneeId;
      }
    }

    // Filter: "My Tasks"
    if (req.query.myTasks === "true") {
      filter.assignee = req.user.id;
    }

    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Filter by priority
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    // Filter by search query (sanitized & length capped)
    if (req.query.search && typeof req.query.search === "string" && req.query.search.trim()) {
      const sanitized = req.query.search.trim().slice(0, 50);
      const safeRegex = new RegExp(escapeRegex(sanitized), "i");
      filter.$or = [{ title: safeRegex }, { taskKey: safeRegex }, { description: safeRegex }];
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate("project", "name key")
        .populate("team", "name")
        .populate("assignee", "name email avatar")
        .populate("reporter", "name email avatar")
        .select("-__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: tasks,
    });
  } catch (error) {
    console.error("getOrganizationTasks Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 3. GET /api/organizations/:orgId/projects/:projectId/tasks
 * Fetches all tasks for a specific project formatted for Kanban boards
 */
const getProjectKanbanTasks = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, message: "Invalid project ID" });
    }

    const project = await Project.findOne({
      _id: projectId,
      organization: req.organization._id,
    });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found in this organization" });
    }

    const filter = {
      organization: req.organization._id,
      project: project._id,
    };

    if (req.query.assigneeId && mongoose.isValidObjectId(req.query.assigneeId)) {
      filter.assignee = req.query.assigneeId;
    }

    if (req.query.priority) {
      filter.priority = req.query.priority;
    }

    const tasks = await Task.find(filter)
      .populate("assignee", "name email avatar")
      .populate("reporter", "name email avatar")
      .sort({ status: 1, order: 1, createdAt: -1 });

    // Format tasks grouped by Kanban columns
    const columns = {
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
      cancelled: [],
    };

    for (const task of tasks) {
      if (columns[task.status]) {
        columns[task.status].push(task);
      }
    }

    return res.status(200).json({
      success: true,
      project: {
        _id: project._id,
        name: project.name,
        key: project.key,
      },
      total: tasks.length,
      columns,
      data: tasks,
    });
  } catch (error) {
    console.error("getProjectKanbanTasks Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 4. GET /api/organizations/:orgId/tasks/:taskId
 * Fetches single task details
 */
const getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({ success: false, message: "Invalid task ID" });
    }

    const task = await Task.findOne({
      _id: taskId,
      organization: req.organization._id,
    })
      .populate("project", "name key description lead")
      .populate("team", "name description")
      .populate("assignee", "name email avatar")
      .populate("reporter", "name email avatar");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found in this organization",
      });
    }

    return res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    console.error("getTaskById Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 5. PATCH /api/organizations/:orgId/tasks/:taskId
 * Updates task fields (title, description, priority, dates, tags)
 */
const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const {
      title,
      description,
      priority,
      startDate,
      dueDate,
      estimatedHours,
      tags,
    } = req.body;

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({ success: false, message: "Invalid task ID" });
    }

    const task = await Task.findOne({
      _id: taskId,
      organization: req.organization._id,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found in this organization" });
    }

    // Permission check: Owner, Admin, task:update, Assignee, OR Reporter
    const isOwnerOrAdmin =
      req.orgRole.name === "owner" ||
      req.orgRole.name === "admin" ||
      req.orgRole.permissions?.includes("task:update");
    const isAssignee = task.assignee && task.assignee.toString() === req.user.id.toString();
    const isReporter = task.reporter.toString() === req.user.id.toString();

    if (!isOwnerOrAdmin && !isAssignee && !isReporter) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update this task",
      });
    }

    // Update title
    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({ success: false, message: "Task title cannot be empty" });
      }
      const trimmedTitle = title.trim();
      if (trimmedTitle.length < 2 || trimmedTitle.length > 200) {
        return res.status(400).json({ success: false, message: "Title must be between 2 and 200 characters" });
      }
      task.title = trimmedTitle;
    }

    // Update description
    if (description !== undefined) {
      if (typeof description !== "string") {
        return res.status(400).json({ success: false, message: "Description must be a string" });
      }
      if (description.trim().length > 10000) {
        return res.status(400).json({ success: false, message: "Description cannot exceed 10000 characters" });
      }
      task.description = description.trim();
    }

    // Update priority
    if (priority !== undefined) {
      const allowedPriorities = ["low", "medium", "high", "urgent"];
      if (!allowedPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: `Invalid priority. Allowed values: ${allowedPriorities.join(", ")}`,
        });
      }
      task.priority = priority;
    }

    // Update dates
    if (startDate !== undefined) {
      task.startDate = startDate ? new Date(startDate) : null;
    }

    if (dueDate !== undefined) {
      task.dueDate = dueDate ? new Date(dueDate) : null;
    }

    if (task.startDate && task.dueDate && task.dueDate < task.startDate) {
      return res.status(400).json({
        success: false,
        message: "Due date cannot be earlier than start date",
      });
    }

    // Update estimated hours
    if (estimatedHours !== undefined) {
      if (estimatedHours !== null && (typeof estimatedHours !== "number" || estimatedHours < 0)) {
        return res.status(400).json({ success: false, message: "Estimated hours must be a positive number" });
      }
      task.estimatedHours = estimatedHours;
    }

    // Update tags
    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return res.status(400).json({ success: false, message: "Tags must be an array of strings" });
      }
      task.tags = tags
        .filter((t) => typeof t === "string" && t.trim())
        .map((t) => t.trim().toLowerCase().slice(0, 30))
        .slice(0, 10);
    }

    await task.save();

    const updatedTask = await Task.findOne({
      _id: task._id,
      organization: req.organization._id,
    })
      .populate("project", "name key")
      .populate("assignee", "name email avatar")
      .populate("reporter", "name email avatar");

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    console.error("updateTask Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 6. PATCH /api/organizations/:orgId/tasks/:taskId/status
 * Quick status workflow update (e.g. todo -> in_progress -> done)
 */
const updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, order } = req.body;

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({ success: false, message: "Invalid task ID" });
    }

    const allowedStatuses = ["todo", "in_progress", "in_review", "done", "cancelled"];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Valid status is required. Allowed values: ${allowedStatuses.join(", ")}`,
      });
    }

    const task = await Task.findOne({
      _id: taskId,
      organization: req.organization._id,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found in this organization" });
    }

    // Permission check: Owner, Admin, task:update, OR Assignee
    const isOwnerOrAdmin =
      req.orgRole.name === "owner" ||
      req.orgRole.name === "admin" ||
      req.orgRole.permissions?.includes("task:update");
    const isAssignee = task.assignee && task.assignee.toString() === req.user.id.toString();

    if (!isOwnerOrAdmin && !isAssignee) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to change this task status",
      });
    }

    task.status = status;

    if (typeof order === "number") {
      task.order = order;
    }

    await task.save();

    return res.status(200).json({
      success: true,
      message: `Task status updated to "${status}"`,
      data: {
        taskId: task._id,
        taskKey: task.taskKey,
        status: task.status,
        order: task.order,
      },
    });
  } catch (error) {
    console.error("updateTaskStatus Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 7. PATCH /api/organizations/:orgId/tasks/:taskId/assign
 * Reassigns task to an active organization member
 */
const assignTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { assigneeId } = req.body;

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({ success: false, message: "Invalid task ID" });
    }

    const task = await Task.findOne({
      _id: taskId,
      organization: req.organization._id,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found in this organization" });
    }

    // Permission check: Owner, Admin, task:assign, or task:update
    const isAuthorized =
      req.orgRole.name === "owner" ||
      req.orgRole.name === "admin" ||
      req.orgRole.permissions?.includes("task:assign") ||
      req.orgRole.permissions?.includes("task:update");

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to assign tasks",
      });
    }

    let verifiedAssignee = null;
    if (assigneeId) {
      if (!mongoose.isValidObjectId(assigneeId)) {
        return res.status(400).json({ success: false, message: "Invalid assignee user ID" });
      }

      const activeMembership = await Membership.findOne({
        organization: req.organization._id,
        user: assigneeId,
        status: "active",
      }).populate("user", "name email");

      if (!activeMembership) {
        return res.status(400).json({
          success: false,
          message: "Assignee must be an active member of this organization",
        });
      }

      verifiedAssignee = assigneeId;
    }

    task.assignee = verifiedAssignee;
    await task.save();

    const updatedTask = await Task.findOne({
      _id: task._id,
      organization: req.organization._id,
    })
      .populate("assignee", "name email avatar")
      .select("taskKey title status priority assignee");

    return res.status(200).json({
      success: true,
      message: verifiedAssignee
        ? "Task assigned successfully"
        : "Task unassigned successfully",
      data: updatedTask,
    });
  } catch (error) {
    console.error("assignTask Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

/**
 * 8. DELETE /api/organizations/:orgId/tasks/:taskId
 * Deletes a task from the organization
 */
const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({ success: false, message: "Invalid task ID" });
    }

    const task = await Task.findOne({
      _id: taskId,
      organization: req.organization._id,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found in this organization" });
    }

    // Permission check: Owner, Admin, task:delete, OR task reporter
    const isOwnerOrAdmin =
      req.orgRole.name === "owner" ||
      req.orgRole.name === "admin" ||
      req.orgRole.permissions?.includes("task:delete");
    const isReporter = task.reporter.toString() === req.user.id.toString();

    if (!isOwnerOrAdmin && !isReporter) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this task",
      });
    }

    await Task.deleteOne({
      _id: task._id,
      organization: req.organization._id,
    });

    return res.status(200).json({
      success: true,
      message: `Task ${task.taskKey} deleted successfully`,
    });
  } catch (error) {
    console.error("deleteTask Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = {
  createTask,
  getOrganizationTasks,
  getProjectKanbanTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  assignTask,
  deleteTask,
};

