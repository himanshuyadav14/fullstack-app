export const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "http://localhost:5001";

export const ENDPOINTS = {
  // 1. Authentication
  AUTH: {
    SIGNUP: "/auth/signup",
    LOGIN: "/auth/login",
    GET_ME: "/auth/me",
    VERIFY_EMAIL: "/auth/verify-email",
    RESEND_VERIFICATION: "/auth/resend-verification",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
  },

  // 2. User Profile
  USERS: {
    PROFILE: "/users/profile",
    AVATAR: "/users/profile/avatar",
    GET_BY_ID: (userId) => `/users/${userId}`,
  },

  // 3. Organizations & Members
  ORGANIZATIONS: {
    MY: "/organizations/my",
    CREATE: "/organizations",
    GET_BY_ID: (orgId) => `/organizations/${orgId}`,
    ROLES: (orgId) => `/organizations/${orgId}/roles`,
    MEMBERS: (orgId) => `/organizations/${orgId}/members`,
    UPDATE_MEMBER_ROLE: (orgId, memberId) =>
      `/organizations/${orgId}/members/${memberId}/role`,
    REMOVE_MEMBER: (orgId, memberId) =>
      `/organizations/${orgId}/members/${memberId}`,
    LEAVE: (orgId) => `/organizations/${orgId}/leave`,
    TRANSFER_OWNERSHIP: (orgId) =>
      `/organizations/${orgId}/transfer-ownership`,
    INVITATIONS: (orgId) => `/organizations/${orgId}/invitations`,
  },

  // 4. Teams
  TEAMS: {
    LIST_CREATE: (orgId) => `/organizations/${orgId}/teams`,
    GET_BY_ID: (orgId, teamId) => `/organizations/${orgId}/teams/${teamId}`,
    ADD_MEMBERS: (orgId, teamId) =>
      `/organizations/${orgId}/teams/${teamId}/members`,
    REMOVE_MEMBER: (orgId, teamId, userId) =>
      `/organizations/${orgId}/teams/${teamId}/members/${userId}`,
  },

  // 5. Projects
  PROJECTS: {
    LIST_CREATE: (orgId) => `/organizations/${orgId}/projects`,
    GET_BY_ID: (orgId, projectId) =>
      `/organizations/${orgId}/projects/${projectId}`,
    KANBAN_TASKS: (orgId, projectId) =>
      `/organizations/${orgId}/projects/${projectId}/tasks/kanban`,
  },

  // 6. Tasks & Attachments
  TASKS: {
    LIST: (orgId) => `/organizations/${orgId}/tasks`,
    CREATE: (orgId, projectId) =>
      `/organizations/${orgId}/projects/${projectId}/tasks`,
    GET_BY_ID: (orgId, taskId) => `/organizations/${orgId}/tasks/${taskId}`,
    UPDATE: (orgId, taskId) => `/organizations/${orgId}/tasks/${taskId}`,
    UPDATE_STATUS: (orgId, taskId) =>
      `/organizations/${orgId}/tasks/${taskId}/status`,
    ASSIGN: (orgId, taskId) => `/organizations/${orgId}/tasks/${taskId}/assign`,
    DELETE: (orgId, taskId) => `/organizations/${orgId}/tasks/${taskId}`,
    ATTACHMENTS: (orgId, taskId) =>
      `/organizations/${orgId}/tasks/${taskId}/attachments`,
    DELETE_ATTACHMENT: (orgId, taskId, attachmentId) =>
      `/organizations/${orgId}/tasks/${taskId}/attachments/${attachmentId}`,
  },

  // 7. Comments
  COMMENTS: {
    LIST_CREATE: (orgId, taskId) =>
      `/organizations/${orgId}/tasks/${taskId}/comments`,
    UPDATE_DELETE: (orgId, taskId, commentId) =>
      `/organizations/${orgId}/tasks/${taskId}/comments/${commentId}`,
  },

  // 8. Notifications
  NOTIFICATIONS: {
    LIST: "/notifications",
    UNREAD_COUNT: "/notifications/unread-count",
    READ_ALL: "/notifications/read-all",
    MARK_READ: (notificationId) => `/notifications/${notificationId}/read`,
    DELETE: (notificationId) => `/notifications/${notificationId}`,
  },

  // 9. Dashboard Analytics
  ANALYTICS: {
    DASHBOARD: (orgId) => `/organizations/${orgId}/analytics/dashboard`,
    PROJECTS: (orgId) => `/organizations/${orgId}/analytics/projects`,
    WORKLOAD: (orgId) => `/organizations/${orgId}/analytics/workload`,
    MY_SUMMARY: (orgId) => `/organizations/${orgId}/analytics/my-summary`,
  },
};
