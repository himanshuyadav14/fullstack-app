const Role = require("../models/Role");
const PERMISSIONS = require("../constants/permissions");

const defaultRoles = [
  {
    name: "admin",
    description: "System Administrator with full system access",
    isSystemRole: true,
    permissions: Object.values(PERMISSIONS),
  },
  {
    name: "manager",
    description: "Project and Team Manager",
    isSystemRole: true,
    permissions: [
      PERMISSIONS.USER_READ,
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
      PERMISSIONS.COMMENT_CREATE,
      PERMISSIONS.COMMENT_UPDATE,
      PERMISSIONS.COMMENT_DELETE,
    ],
  },
  {
    name: "member",
    description: "Standard Team Member",
    isSystemRole: true,
    permissions: [
      PERMISSIONS.TEAM_READ,
      PERMISSIONS.PROJECT_READ,
      PERMISSIONS.TASK_READ,
      PERMISSIONS.TASK_CREATE,
      PERMISSIONS.TASK_UPDATE,
      PERMISSIONS.COMMENT_CREATE,
      PERMISSIONS.COMMENT_UPDATE,
    ],
  },
];

const seedRoles = async () => {
  for (const role of defaultRoles) {
    if (role.name === "admin") {
      // Ensure admin always has all permissions and is marked as system role
      await Role.updateOne(
        { name: role.name },
        {
          $set: {
            description: role.description,
            isSystemRole: true,
            permissions: Object.values(PERMISSIONS),
          },
        },
        { upsert: true },
      );
    } else {
      await Role.updateOne(
        { name: role.name },
        {
          $setOnInsert: {
            name: role.name,
            description: role.description,
            isSystemRole: true,
            permissions: role.permissions,
          },
        },
        { upsert: true },
      );
    }
  }

  console.log("Default roles seeded successfully");
};

module.exports = seedRoles;
