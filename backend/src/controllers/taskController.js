const mongoose = require("mongoose");
const Task = require("../models/Task");
const Project = require("../models/Project");
const Team = require("../models/Team");
const Membership = require("../models/Membership");
const Comment = require("../models/Comment");
const {
  uploadToCloudinary,
  deleteFromCloudinary,
} = require("../config/cloudinary");
const { createNotification } = require("../services/notificationService");
const { emitToProject, emitToTask } = require("../socket");

/**
 * Escapes special regex characters for safe search queries
 */
const escapeRegex = require("../utils/escapeRegex");

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

    // 1. Verify project belongs to THIS organization (counter is incremented
    // only after validation passes, so rejected requests don't burn task keys)
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

    // 8. Atomically reserve the next number and generate task key e.g. TF-1, TF-2
    const counter = await Project.findOneAndUpdate(
      { _id: project._id },
      { $inc: { taskCounter: 1 } },
      { new: true, projection: { taskCounter: 1 } },
    );
    const taskKey = `${project.key}-${counter.taskCounter}`;

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

    // Dispatch notification to assignee if assigned to someone else
    if (verifiedAssigneeId) {
      await createNotification({
        recipient: verifiedAssigneeId,
        sender: req.user.id,
        organization: req.organization._id,
        type: "task_assigned",
        title: "New Task Assigned",
        message: `${req.user.name || "A team member"} assigned you task ${taskKey}: "${trimmedTitle}"`,
        resourceType: "task",
        resourceId: task._id,
      });
    }

    // Broadcast real-time task creation to project Kanban board
    emitToProject(project._id, "task:created", populatedTask);

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

    // Attach commentsCount
    const taskIds = tasks.map((t) => t._id);
    const commentCounts = taskIds.length > 0
      ? await Comment.aggregate([
          { $match: { task: { $in: taskIds } } },
          { $group: { _id: "$task", count: { $sum: 1 } } },
        ])
      : [];

    const commentCountMap = {};
    commentCounts.forEach((c) => {
      commentCountMap[c._id.toString()] = c.count;
    });

    const tasksWithComments = tasks.map((t) => {
      const obj = t.toObject ? t.toObject() : { ...t };
      obj.commentsCount = commentCountMap[t._id.toString()] || 0;
      return obj;
    });

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: tasksWithComments,
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
      .populate("team", "name")
      .sort({ status: 1, order: 1, createdAt: -1 });

    // Aggregate comment counts for fetched tasks
    const taskIds = tasks.map((t) => t._id);
    const commentCounts = taskIds.length > 0
      ? await Comment.aggregate([
          { $match: { task: { $in: taskIds } } },
          { $group: { _id: "$task", count: { $sum: 1 } } },
        ])
      : [];

    const commentCountMap = {};
    commentCounts.forEach((c) => {
      commentCountMap[c._id.toString()] = c.count;
    });

    const tasksWithMeta = tasks.map((t) => {
      const obj = t.toObject ? t.toObject() : { ...t };
      obj.commentsCount = commentCountMap[t._id.toString()] || 0;
      return obj;
    });

    // Format tasks grouped by Kanban columns
    const columns = {
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
      cancelled: [],
    };

    for (const task of tasksWithMeta) {
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
      total: tasksWithMeta.length,
      columns,
      data: columns,
      tasks: tasksWithMeta,
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

    // Update dates (reject unparseable values with 400 instead of failing on save)
    for (const [field, value] of [["startDate", startDate], ["dueDate", dueDate]]) {
      if (value === undefined) continue;
      if (!value) {
        task[field] = null;
        continue;
      }
      const parsed = new Date(value);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ success: false, message: `Invalid ${field} format` });
      }
      task[field] = parsed;
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

    // Dispatch notification to task reporter and assignee
    const recipientsToNotify = new Set();
    if (task.reporter) {
      recipientsToNotify.add(task.reporter.toString());
    }
    if (task.assignee) {
      recipientsToNotify.add(task.assignee.toString());
    }

    for (const recipientId of recipientsToNotify) {
      await createNotification({
        recipient: recipientId,
        sender: req.user.id,
        organization: req.organization._id,
        type: "task_status_changed",
        title: `Task Status Changed: ${task.taskKey}`,
        message: `${req.user.name || "A team member"} updated ${task.taskKey} status to "${status}"`,
        resourceType: "task",
        resourceId: task._id,
      });
    }

    const statusPayload = {
      taskId: task._id,
      taskKey: task.taskKey,
      status: task.status,
      order: task.order,
    };

    // Broadcast real-time status change to project Kanban subscribers
    emitToProject(task.project, "task:status_changed", statusPayload);

    return res.status(200).json({
      success: true,
      message: `Task status updated to "${status}"`,
      data: statusPayload,
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

    const previousAssignee = task.assignee ? task.assignee.toString() : null;
    task.assignee = verifiedAssignee;
    await task.save();

    // Dispatch notification to previous assignee if unassigned or reassigned
    if (previousAssignee && previousAssignee !== (verifiedAssignee ? verifiedAssignee.toString() : null)) {
      await createNotification({
        recipient: previousAssignee,
        sender: req.user.id,
        organization: req.organization._id,
        type: "task_unassigned",
        title: "Task Unassigned",
        message: `${req.user.name || "A team member"} unassigned you from task ${task.taskKey}: "${task.title}"`,
        resourceType: "task",
        resourceId: task._id,
      });
    }

    // Dispatch notification to newly assigned user
    if (verifiedAssignee) {
      await createNotification({
        recipient: verifiedAssignee,
        sender: req.user.id,
        organization: req.organization._id,
        type: "task_assigned",
        title: "Task Assigned to You",
        message: `${req.user.name || "A team member"} assigned you task ${task.taskKey}: "${task.title}"`,
        resourceType: "task",
        resourceId: task._id,
      });
    }

    const updatedTask = await Task.findOne({
      _id: task._id,
      organization: req.organization._id,
    })
      .populate("assignee", "name email avatar")
      .select("taskKey title status priority assignee");

    // Broadcast real-time assignment update to project subscribers
    emitToProject(task.project, "task:assigned", updatedTask);

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

    // Broadcast real-time deletion to project subscribers
    emitToProject(task.project, "task:deleted", {
      taskId: task._id,
      taskKey: task.taskKey,
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

/**
 * 9. POST /api/organizations/:orgId/tasks/:taskId/attachments
 * Uploads a file attachment to the task via Cloudinary
 */
const uploadTaskAttachment = async (req, res) => {
  try {
    const { taskId } = req.params;

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({ success: false, message: "Invalid task ID" });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please select a file to upload",
      });
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
        message: "You do not have permission to attach files to this task",
      });
    }

    const isImage = req.file.mimetype.startsWith("image/");
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: `teamflow/tasks/${task.taskKey}`,
      resource_type: isImage ? "image" : "raw",
    });

    const newAttachment = {
      originalName: req.file.originalname,
      url: result.secure_url,
      publicId: result.public_id,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.user.id,
      uploadedAt: new Date(),
    };

    task.attachments.push(newAttachment);
    await task.save();

    // Dispatch notification to task reporter and assignee
    const recipientsToNotify = new Set();
    if (task.reporter) {
      recipientsToNotify.add(task.reporter.toString());
    }
    if (task.assignee) {
      recipientsToNotify.add(task.assignee.toString());
    }

    for (const recipientId of recipientsToNotify) {
      await createNotification({
        recipient: recipientId,
        sender: req.user.id,
        organization: req.organization._id,
        type: "attachment_uploaded",
        title: `New Attachment on ${task.taskKey}`,
        message: `${req.user.name || "A team member"} uploaded "${req.file.originalname}" on task ${task.taskKey}`,
        resourceType: "task",
        resourceId: task._id,
      });
    }

    const updatedTask = await Task.findById(task._id).populate(
      "attachments.uploadedBy",
      "name email avatar",
    );

    // Broadcast real-time attachment to subscribers of this task
    emitToTask(task._id, "task:attachment_uploaded", newAttachment);

    return res.status(201).json({
      success: true,
      message: "Attachment uploaded successfully",
      data: updatedTask.attachments,
    });
  } catch (error) {
    console.error("uploadTaskAttachment Error:", error);
    return res.status(500).json({ success: false, message: "Failed to upload attachment" });
  }
};

/**
 * 10. DELETE /api/organizations/:orgId/tasks/:taskId/attachments/:attachmentId
 * Deletes an attachment from task and Cloudinary
 */
const deleteTaskAttachment = async (req, res) => {
  try {
    const { taskId, attachmentId } = req.params;

    if (!mongoose.isValidObjectId(taskId) || !mongoose.isValidObjectId(attachmentId)) {
      return res.status(400).json({ success: false, message: "Invalid ID parameters" });
    }

    const task = await Task.findOne({
      _id: taskId,
      organization: req.organization._id,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found in this organization" });
    }

    const attachment = task.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ success: false, message: "Attachment not found" });
    }

    // Permission check: Owner, Admin, or user who uploaded the attachment
    const isOwnerOrAdmin =
      req.orgRole.name === "owner" ||
      req.orgRole.name === "admin" ||
      req.orgRole.permissions?.includes("task:delete");
    const isUploader = attachment.uploadedBy.toString() === req.user.id.toString();

    if (!isOwnerOrAdmin && !isUploader) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this attachment",
      });
    }

    // Delete from Cloudinary
    const isImage = attachment.fileType.startsWith("image/");
    await deleteFromCloudinary(attachment.publicId, isImage ? "image" : "raw");

    // Remove from task document
    task.attachments.pull({ _id: attachmentId });
    await task.save();

    return res.status(200).json({
      success: true,
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    console.error("deleteTaskAttachment Error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete attachment" });
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
  uploadTaskAttachment,
  deleteTaskAttachment,
};

