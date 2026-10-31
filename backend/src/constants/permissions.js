const PERMISSIONS = Object.freeze({
  USER_READ: "user:read",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",

  TASK_READ: "task:read",
  TASK_CREATE: "task:create",
  TASK_UPDATE: "task:update",
  TASK_DELETE: "task:delete",

  ROLE_READ: "role:read",
  ROLE_UPDATE: "role:update",
});

module.exports = PERMISSIONS;
