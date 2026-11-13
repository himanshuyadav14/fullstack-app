const mongoose = require("mongoose");
const Comment = require("../models/Comment");
const Task = require("../models/Task");

/**
 * 1. POST /api/organizations/:orgId/tasks/:taskId/comments
 * Adds a new comment to a task
 */
const createComment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    // 1. Validate content
    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment content is required",
      });
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 5000 characters",
      });
    }

    // 2. Verify task belongs to this organization
    const task = await Task.findOne({
      _id: taskId,
      organization: req.organization._id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found in this organization",
      });
    }

    // 3. Create comment
    const comment = await Comment.create({
      content: trimmedContent,
      task: task._id,
      organization: req.organization._id,
      author: req.user.id,
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      "author",
      "name email avatar",
    );

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      data: populatedComment,
    });
  } catch (error) {
    console.error("createComment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 2. GET /api/organizations/:orgId/tasks/:taskId/comments
 * Fetches all comments for a task in chronological order
 */
const getTaskComments = async (req, res) => {
  try {
    const { taskId } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID",
      });
    }

    // Verify task exists in this organization
    const task = await Task.findOne({
      _id: taskId,
      organization: req.organization._id,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found in this organization",
      });
    }

    const [comments, total] = await Promise.all([
      Comment.find({
        task: taskId,
        organization: req.organization._id,
      })
        .populate("author", "name email avatar")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit),
      Comment.countDocuments({
        task: taskId,
        organization: req.organization._id,
      }),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: comments,
    });
  } catch (error) {
    console.error("getTaskComments Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 3. PATCH /api/organizations/:orgId/tasks/:taskId/comments/:commentId
 * Edits an existing comment (Author only)
 */
const updateComment = async (req, res) => {
  try {
    const { taskId, commentId } = req.params;
    const { content } = req.body;

    if (!mongoose.isValidObjectId(taskId) || !mongoose.isValidObjectId(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID parameters",
      });
    }

    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment content cannot be empty",
      });
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length > 5000) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 5000 characters",
      });
    }

    const comment = await Comment.findOne({
      _id: commentId,
      task: taskId,
      organization: req.organization._id,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Authorship Safeguard: Only the original author can edit the comment
    if (comment.author.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own comments",
      });
    }

    // Update content and mark as edited
    comment.content = trimmedContent;
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();

    const updatedComment = await Comment.findById(comment._id).populate(
      "author",
      "name email avatar",
    );

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      data: updatedComment,
    });
  } catch (error) {
    console.error("updateComment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 4. DELETE /api/organizations/:orgId/tasks/:taskId/comments/:commentId
 * Deletes a comment (Author, Owner, Admin, or comment:delete permission)
 */
const deleteComment = async (req, res) => {
  try {
    const { taskId, commentId } = req.params;

    if (!mongoose.isValidObjectId(taskId) || !mongoose.isValidObjectId(commentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID parameters",
      });
    }

    const comment = await Comment.findOne({
      _id: commentId,
      task: taskId,
      organization: req.organization._id,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    // Authorization Safeguard: Author, Owner, Admin, or user with comment:delete
    const isAuthor = comment.author.toString() === req.user.id.toString();
    const isOwnerOrAdmin =
      req.orgRole.name === "owner" ||
      req.orgRole.name === "admin" ||
      req.orgRole.permissions?.includes("comment:delete");

    if (!isAuthor && !isOwnerOrAdmin) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this comment",
      });
    }

    await Comment.deleteOne({
      _id: comment._id,
      organization: req.organization._id,
    });

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("deleteComment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  createComment,
  getTaskComments,
  updateComment,
  deleteComment,
};

