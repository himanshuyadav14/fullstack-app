const mongoose = require("mongoose");

const Organization = require("../models/Organization");
const Membership = require("../models/Membership");
const Role = require("../models/Role");
const PERMISSIONS = require("../constants/permissions");
const { slugify, generateSlugWithSuffix } = require("../utils/slugify");

// @desc    Create a new organization
// @route   POST /api/organizations
// @access  Private

const createMyOrganization = async (req, res) => {
  let session;

  try {
    const { name, description } = req.body;

    // 1. Validate organization name
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Organization name is required",
      });
    }

    const trimmedName = name.trim();

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Organization name must be between 2 and 100 characters",
      });
    }

    // 2. Validate description
    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Description must be a string",
      });
    }

    const trimmedDescription = description?.trim() || "";

    if (trimmedDescription.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Description cannot exceed 500 characters",
      });
    }

    // 3. Generate base slug
    const baseSlug = slugify(trimmedName);

    if (!baseSlug) {
      return res.status(400).json({
        success: false,
        message: "Organization name cannot generate a valid slug",
      });
    }

    // 4. Start MongoDB transaction
    session = await mongoose.startSession();
    session.startTransaction();

    // 5. Generate unique slug
    let slug = baseSlug;

    const existingOrganization = await Organization.findOne({
      slug,
    }).session(session);

    if (existingOrganization) {
      slug = generateSlugWithSuffix(trimmedName);
    }

    // 6. Create Organization
    const [organization] = await Organization.create(
      [
        {
          name: trimmedName,
          slug,
          description: trimmedDescription,
          createdBy: req.user.id,
          status: "active",
        },
      ],
      { session },
    );

    // 7. Define organization-scoped system roles
    const defaultRolesToSeed = [
      {
        organization: organization._id,
        name: "owner",
        description: "Organization Owner with full administrative control",
        isSystemRole: true,
        permissions: Object.values(PERMISSIONS),
      },
      {
        organization: organization._id,
        name: "admin",
        description: "Organization Administrator",
        isSystemRole: true,
        permissions: [
          PERMISSIONS.USER_READ,

          PERMISSIONS.MEMBER_READ,
          PERMISSIONS.MEMBER_UPDATE,
          PERMISSIONS.MEMBER_REMOVE,

          PERMISSIONS.ORGANIZATION_READ,
          PERMISSIONS.ORGANIZATION_UPDATE,

          PERMISSIONS.INVITATION_READ,
          PERMISSIONS.INVITATION_CREATE,
          PERMISSIONS.INVITATION_REVOKE,

          PERMISSIONS.ROLE_READ,
          PERMISSIONS.ROLE_CREATE,
          PERMISSIONS.ROLE_UPDATE,
          PERMISSIONS.ROLE_DELETE,

          PERMISSIONS.TEAM_READ,
          PERMISSIONS.TEAM_CREATE,
          PERMISSIONS.TEAM_UPDATE,
          PERMISSIONS.TEAM_DELETE,

          PERMISSIONS.PROJECT_READ,
          PERMISSIONS.PROJECT_CREATE,
          PERMISSIONS.PROJECT_UPDATE,
          PERMISSIONS.PROJECT_DELETE,

          PERMISSIONS.TASK_READ,
          PERMISSIONS.TASK_CREATE,
          PERMISSIONS.TASK_UPDATE,
          PERMISSIONS.TASK_DELETE,
          PERMISSIONS.TASK_ASSIGN,

          PERMISSIONS.COMMENT_READ,
          PERMISSIONS.COMMENT_CREATE,
          PERMISSIONS.COMMENT_UPDATE,
          PERMISSIONS.COMMENT_DELETE,
        ],
      },
      {
        organization: organization._id,
        name: "manager",
        description: "Team and Project Manager",
        isSystemRole: true,
        permissions: [
          PERMISSIONS.ORGANIZATION_READ,

          PERMISSIONS.TEAM_READ,
          PERMISSIONS.TEAM_CREATE,
          PERMISSIONS.TEAM_UPDATE,

          PERMISSIONS.PROJECT_READ,
          PERMISSIONS.PROJECT_CREATE,
          PERMISSIONS.PROJECT_UPDATE,

          PERMISSIONS.TASK_READ,
          PERMISSIONS.TASK_CREATE,
          PERMISSIONS.TASK_UPDATE,
          PERMISSIONS.TASK_ASSIGN,

          PERMISSIONS.COMMENT_READ,
          PERMISSIONS.COMMENT_CREATE,
          PERMISSIONS.COMMENT_UPDATE,
          PERMISSIONS.COMMENT_DELETE,
        ],
      },
      {
        organization: organization._id,
        name: "member",
        description: "Standard Organization Member",
        isSystemRole: true,
        permissions: [
          PERMISSIONS.ORGANIZATION_READ,

          PERMISSIONS.TEAM_READ,
          PERMISSIONS.PROJECT_READ,

          PERMISSIONS.TASK_READ,
          PERMISSIONS.TASK_CREATE,
          PERMISSIONS.TASK_UPDATE,

          PERMISSIONS.COMMENT_READ,
          PERMISSIONS.COMMENT_CREATE,
          PERMISSIONS.COMMENT_UPDATE,
        ],
      },
    ];

    // 8. Insert all four roles
    const seededRoles = await Role.insertMany(defaultRolesToSeed, {
      session,
    });

    // 9. Find owner and member roles
    const ownerRole = seededRoles.find((role) => role.name === "owner");

    const memberRole = seededRoles.find((role) => role.name === "member");

    if (!ownerRole || !memberRole) {
      throw new Error("Failed to create default organization roles");
    }

    // 10. Set default organization role
    organization.settings.defaultRole = memberRole._id;

    await organization.save({ session });

    // 11. Create initial owner membership
    const [membership] = await Membership.create(
      [
        {
          user: req.user.id,
          organization: organization._id,
          role: ownerRole._id,
          status: "active",
          joinedAt: new Date(),
        },
      ],
      { session },
    );

    // 12. Commit transaction
    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message: "Organization created successfully",

      data: {
        organization: {
          _id: organization._id,
          name: organization.name,
          slug: organization.slug,
          description: organization.description,
          status: organization.status,
          createdAt: organization.createdAt,
        },

        membership: {
          _id: membership._id,
          role: {
            _id: ownerRole._id,
            name: ownerRole.name,
          },
          status: membership.status,
          joinedAt: membership.joinedAt,
        },
      },
    });
  } catch (error) {
    // 13. Rollback transaction on failure
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("createMyOrganization Error:", error);

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Organization slug already exists. Please try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create organization",
    });
  } finally {
    // 14. Always close session
    if (session) {
      await session.endSession();
    }
  }
};

const getMyOrganizations = async (req, res) => {
  try {
    const memberships = await Membership.find({
      user: req.user.id,
      status: "active",
    })
      .populate("organization", "name slug description logo status createdAt")
      .populate("role", "name description isSystemRole")
      .sort({ createdAt: -1 });

    const organizations = memberships
      .filter(
        (membership) =>
          membership.organization &&
          membership.organization.status === "active",
      )
      .map((membership) => ({
        membershipId: membership._id,
        role: membership.role,
        status: membership.status,
        organization: membership.organization,
      }));

    return res.status(200).json({
      success: true,
      message: "Organizations fetched successfully",
      count: organizations.length,
      data: organizations,
    });
  } catch (error) {
    console.error("Get organizations error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch organizations",
    });
  }
};

const getOrganizationById = async (req, res) => {
  try {
    const { orgId } = req.params;

    // Validate organization ID
    if (!mongoose.isValidObjectId(orgId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID",
      });
    }

    // Verify active membership and fetch organization
    const membership = await Membership.findOne({
      user: req.user.id,
      organization: orgId,
      status: "active",
    })
      .populate("organization", "name slug description logo status createdAt")
      .populate("role", "name description isSystemRole");

    // Check membership
    if (!membership || !membership.organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const organization = membership.organization;

    // Check organization status
    if (organization.status !== "active") {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    // Check role
    if (!membership.role) {
      return res.status(403).json({
        success: false,
        message: "Valid organization role not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Organization fetched successfully",
      data: {
        organization,
        currentUserMembership: {
          membershipId: membership._id,
          role: membership.role,
          joinedAt: membership.joinedAt,
          status: membership.status,
        },
      },
    });
  } catch (error) {
    console.error("getOrganizationById Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  createMyOrganization,
  getMyOrganizations,
  getOrganizationById,
};
