const mongoose = require("mongoose");

const TeamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Team name is required"],
      trim: true,
      minlength: [2, "Team name must be at least 2 characters"],
      maxlength: [100, "Team name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization reference is required"],
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

// Compound unique index: Team names must be case-insensitively unique within an organization
TeamSchema.index(
  { organization: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);

// Index for searching teams where a user is a member
TeamSchema.index({ organization: 1, members: 1 });

// Index for finding teams led by a user
TeamSchema.index({ organization: 1, lead: 1 });

const Team = mongoose.model("Team", TeamSchema);

module.exports = Team;

