const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: [2, "Project name must be at least 2 characters"],
      maxlength: [100, "Project name cannot exceed 100 characters"],
    },
    key: {
      type: String,
      required: [true, "Project key is required"],
      trim: true,
      uppercase: true,
      minlength: [2, "Project key must be at least 2 characters"],
      maxlength: [10, "Project key cannot exceed 10 characters"],
      match: [
        /^[A-Z0-9]+$/,
        "Project key must contain only uppercase alphanumeric characters",
      ],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization reference is required"],
      index: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      default: null,
      index: true,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["planning", "active", "on_hold", "completed", "cancelled"],
      default: "planning",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    startDate: {
      type: Date,
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique indexes per organization (case-insensitive)
ProjectSchema.index(
  { organization: 1, key: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);
ProjectSchema.index(
  { organization: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);

// Performance indexes for common queries
ProjectSchema.index({ organization: 1, status: 1 });
ProjectSchema.index({ organization: 1, members: 1 });
ProjectSchema.index({ organization: 1, team: 1 });

const Project = mongoose.model("Project", ProjectSchema);
module.exports = Project;
