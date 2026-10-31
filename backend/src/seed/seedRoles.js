const Role = require("../models/Role");
const PERMISSIONS = require("../constants/permissions");

const defaultRoles = [
  {
    name: "admin",
    permissions: Object.values(PERMISSIONS),
  },
  {
    name: "manager",
    permissions: [
      PERMISSIONS.USER_READ,
      PERMISSIONS.TASK_READ,
      PERMISSIONS.TASK_CREATE,
      PERMISSIONS.TASK_UPDATE,
    ],
  },
  {
    name: "member",
    permissions: [
      PERMISSIONS.TASK_READ,
      PERMISSIONS.TASK_CREATE,
      PERMISSIONS.TASK_UPDATE,
    ],
  },
];

const seedRoles = async () => {
  for (const role of defaultRoles) {
    await Role.updateOne(
      { name: role.name },
      { $setOnInsert: role },
      { upsert: true },
    );
  }

  console.log("Default roles seeded successfully");
};

module.exports = seedRoles;
