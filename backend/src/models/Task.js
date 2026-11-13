const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [2, "Task title must be at least 2 characters"],
      maxlength: [200, "Task title cannot exceed 200 characters"],
    },
    taskKey: {
      type: String,
      required: [true, "Task key is required"],
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [10000, "Description cannot exceed 10000 characters"],
      default: "",
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization reference is required"],
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project reference is required"],
      index: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ["todo", "in_progress", "in_review", "done", "cancelled"],
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    estimatedHours: {
      type: Number,
      min: [0, "Estimated hours cannot be negative"],
      default: null,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Compound unique index: Task keys are unique within an organization
TaskSchema.index({ organization: 1, taskKey: 1 }, { unique: true });

// Compound index for Kanban board views: grouped by project, status, and sorted by order
TaskSchema.index({ project: 1, status: 1, order: 1 });

// Compound index for user workload & "My Tasks"
TaskSchema.index({ organization: 1, assignee: 1, status: 1 });

// Text search on title and description
TaskSchema.index({ title: "text", description: "text" });

const Task = mongoose.model("Task", TaskSchema);

module.exports = Task;

