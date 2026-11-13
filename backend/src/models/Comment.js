const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      minlength: [1, "Comment cannot be empty"],
      maxlength: [5000, "Comment cannot exceed 5000 characters"],
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: [true, "Task reference is required"],
      index: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization reference is required"],
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for fast chronological fetching of task discussion
CommentSchema.index({ task: 1, createdAt: 1 });

// Tenant isolation index
CommentSchema.index({ organization: 1, task: 1 });

const Comment = mongoose.model("Comment", CommentSchema);

module.exports = Comment;

