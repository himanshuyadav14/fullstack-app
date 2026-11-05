const PERMISSIONS = Object.freeze({
  // Users / Organization Members
  USER_READ: "user:read",
  USER_CREATE: "user:create",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",

  // Memberships
  MEMBER_READ: "member:read",
  MEMBER_UPDATE: "member:update",
  MEMBER_REMOVE: "member:remove",

  // Roles
  ROLE_READ: "role:read",
  ROLE_CREATE: "role:create",
  ROLE_UPDATE: "role:update",
  ROLE_DELETE: "role:delete",

  // Teams
  TEAM_READ: "team:read",
  TEAM_CREATE: "team:create",
  TEAM_UPDATE: "team:update",
  TEAM_DELETE: "team:delete",

  // Projects
  PROJECT_READ: "project:read",
  PROJECT_CREATE: "project:create",
  PROJECT_UPDATE: "project:update",
  PROJECT_DELETE: "project:delete",

  // Tasks
  TASK_READ: "task:read",
  TASK_CREATE: "task:create",
  TASK_UPDATE: "task:update",
  TASK_DELETE: "task:delete",
  TASK_ASSIGN: "task:assign",

  // Comments
  COMMENT_READ: "comment:read",
  COMMENT_CREATE: "comment:create",
  COMMENT_UPDATE: "comment:update",
  COMMENT_DELETE: "comment:delete",

  // Organization
  ORGANIZATION_READ: "organization:read",
  ORGANIZATION_UPDATE: "organization:update",
  ORGANIZATION_DELETE: "organization:delete",

  // Invitations
  INVITATION_READ: "invitation:read",
  INVITATION_CREATE: "invitation:create",
  INVITATION_REVOKE: "invitation:revoke",
});

module.exports = PERMISSIONS;
