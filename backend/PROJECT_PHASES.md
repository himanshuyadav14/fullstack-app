# TeamFlow Backend — Phase-Wise Development & Progress Tracker

> **Project:** TeamFlow (Full-Stack Team & Project Management System)  
> **Backend Tech Stack:** Node.js, Express.js (CommonJS), MongoDB, Mongoose, JWT, bcrypt, Socket.IO, Cloudinary  
> **Last Updated:** October 31, 2026

---

## 📌 Development Philosophy & Rules

1. **Incremental Development:** Build and verify one module and endpoint at a time.
2. **Quality Over Speed:** Understand schemas, relationships, validations, and edge cases before writing code.
3. **No Overwrites / Breaking Changes:** Always preserve existing working functionality and plan migrations safely.
4. **Postman Verifiable:** Every endpoint should be manually tested and verified before marking as complete.
5. **Security First:** Strict input validation, dynamic RBAC enforcement, no leaked sensitive data, prevent privilege escalation.

---

## 🗺️ Master Phase Overview

| Phase #      | Module / Feature                               |       Status       | Description                                                                            |
| :----------- | :--------------------------------------------- | :----------------: | :------------------------------------------------------------------------------------- |
| **Phase 1**  | **Core Setup & Authentication**                |  ✅ **Completed**  | Server setup, DB connection, JWT auth, signup/login/getMe, initial seed                |
| **Phase 2**  | **User Management CRUD**                       |  ✅ **Completed**  | Get users, update user role, update profile, delete/deactivate user                    |
| **Phase 3**  | **Dynamic RBAC & Role Migration**              |  ✅ **Completed**  | Full role CRUD, dynamic permissions registry, role safeguards & dynamic enums removed  |
| **Phase 4**  | **Organization & Membership**                  |  ✅ **Completed**  | Multi-tenancy, org CRUD, membership model, org-level role assignments                  |
| **Phase 5**  | **Team Management**                            |  ✅ **Completed**  | Teams under organizations, team managers, members, team scoping                        |
| **Phase 6**  | **Project Management**                         |  ✅ **Completed**  | Projects under organizations, project assignments, status tracking, filters            |
| **Phase 7**  | **Task Management & Assignments**              |  ✅ **Completed**  | Task CRUD, status/priority workflow, dates, assignments, pagination & search           |
| **Phase 8**  | **Comments Module**                            |  ✅ **Completed**  | Task comments, editing, deletion with ownership checks                                 |
| **Phase 9**  | **File Uploads (Cloudinary)**                  |  ✅ **Completed**  | Avatars, task attachments, file validation, storage metadata in DB                     |
| **Phase 10** | **Notifications System**                       |  ⏳ **Upcoming**   | In-app notification triggers, read status, pagination                                  |
| **Phase 11** | **Real-time WebSockets (Socket.IO)**           |  ⏳ **Upcoming**   | Authenticated socket connections, live updates for tasks/comments/notifications        |
| **Phase 12** | **Dashboard & Analytics**                      |  ⏳ **Upcoming**   | Org/team/user metrics, task status breakdown, overdue analytics                        |
| **Phase 13** | **Hardening, Indexing & Production Readiness** |  ⏳ **Upcoming**   | Rate limiting, CORS policies, Mongo indexes, centralized error handling                |

---

## 📂 Detailed Phase Breakdown

---

### Phase 1: Core Setup & Authentication

**Status:** ✅ Completed

#### 1. Components Implemented

- **Server & Database**:
  - Express server configured in `src/server.js`.
  - MongoDB connection via Mongoose in `src/config/db.js`.
  - Environment variables loaded via `dotenv`.
- **User Schema**:
  - `src/models/User.js` with `name`, `email`, `password` (bcrypt hash), and initial `role` string.
- **Authentication Routes & Controller**:
  - `POST /api/auth/signup`: Validates input, hashes password, prevents duplicates, returns status 201.
  - `POST /api/auth/login`: Validates credentials, checks bcrypt hash, issues JWT token.
  - `GET /api/auth/me`: Authenticated endpoint returning user profile.
- **Middleware**:
  - `src/middleware/authMiddleware.js`: Validates `Bearer <token>` and attaches decoded user to `req.user`.
- **Initial Permissions & Seed**:
  - `src/constants/permissions.js`: Initial frozen permissions object.
  - `src/models/Role.js`: Role schema with `name` and `permissions` array.
  - `src/seed/seedRoles.js`: Upserts default roles (`admin`, `manager`, `member`).
  - `src/middleware/authorizePermission.js`: Middleware verifying dynamic permission in DB.

#### 2. Endpoints Summary

| Method | Endpoint           | Access / Permission | Description                        |
| :----- | :----------------- | :------------------ | :--------------------------------- |
| `POST` | `/api/auth/signup` | Public              | Register new user account          |
| `POST` | `/api/auth/login`  | Public              | Authenticate user & receive JWT    |
| `GET`  | `/api/auth/me`     | Authenticated       | Fetch current user session details |

---

### Phase 2: User Management CRUD

**Status:** ✅ Completed

#### 1. Scope & Goals

- Provide complete administrative and self-service user management.
- Ensure strict safeguards against unauthorized role assignment, self-demotion, or deletion of the last admin.

#### 2. Implementation Steps

- [x] `GET /api/users` — Fetch all users (excluding passwords) with permission `user:read`.
- [x] `GET /api/users/:userId` — Fetch specific user by ID with permission `user:read`.
- [x] `PATCH /api/users/:userId/role` — Complete role assignment with validation & admin safeguards.
- [x] `PATCH /api/users/profile` — Update logged-in user profile details (name).
- [x] `DELETE /api/users/:userId` — Soft delete or hard delete user with admin safeguard checks.

#### 3. Endpoints Summary

| Method   | Endpoint                  | Permission           |   Status   | Notes                                         |
| :------- | :------------------------ | :------------------- | :--------: | :-------------------------------------------- |
| `GET`    | `/api/users`              | `user:read`          |  ✅ Done   | Excludes sensitive fields (`password`, `__v`) |
| `GET`    | `/api/users/:userId`      | `user:read`          |  ✅ Done   | Validates ObjectId format                     |
| `PATCH`  | `/api/users/:userId/role` | `user:update`        |  ✅ Done   | Role existence & last-admin protection checks |
| `PATCH`  | `/api/users/profile`      | Authenticated (Self) |  ✅ Done   | Self-profile update directly via `req.user.id`|
| `DELETE` | `/api/users/:userId`      | `user:delete`        |  ✅ Done   | Self-delete & last-admin protection checks    |

---

### Phase 3: Dynamic RBAC & Role Migration

**Status:** ✅ Completed

#### 1. Scope & Goals

- Transform roles from static strings/enums into 100% dynamic MongoDB documents.
- Support creation of custom roles with custom permissions.
- Provide canonical permissions registry in code with validation.
- Safeguard system roles (`admin`, etc.) and prevent deletion of roles currently in use.
- Migrated `User.role` to MongoDB `ObjectId` reference (`ref: 'Role'`) with full `.populate()` support.

#### 2. Endpoints Summary

| Method   | Endpoint                        | Permission    |   Status   | Description / Protections                            |
| :------- | :------------------------------ | :------------ | :--------: | :--------------------------------------------------- |
| `GET`    | `/api/roles`                    | `role:read`   |  ✅ Done   | Fetch all available roles and their permissions      |
| `GET`    | `/api/roles/permissions`        | `role:read`   |  ✅ Done   | List all canonical system permissions available      |
| `POST`   | `/api/roles`                    | `role:create` |  ✅ Done   | Create new dynamic role with custom permissions      |
| `PATCH`  | `/api/roles/:roleName/permissions` | `role:update` |  ✅ Done   | Update role permissions dynamically                 |
| `DELETE` | `/api/roles/:roleName`          | `role:delete` |  ✅ Done   | Delete role (blocks system roles & assigned roles)   |

---

### Phase 4: Organization Management & Membership

**Status:** ✅ Completed

#### 1. Scope & Goals

- Introduce multi-tenancy: users can create or join organizations.
- Data isolation: all subsequent resources (teams, projects, tasks) belong to an organization.
- Membership model (`User` <-> `Organization`) holding organization-scoped roles.
- Atomic Organization creation with 4 seeded system roles (`owner`, `admin`, `manager`, `member`).
- Complete Member Management: Listing members, role updates with privilege safeguards, kicks, voluntary leaves, and atomic ownership transfers.

#### 2. Key Models

- `Organization.js`: `name`, `slug`, `description`, `createdBy`, `status`, `settings`, `timestamps`.
- `Membership.js`: `user`, `organization`, `role`, `status` (`active`, `suspended`, `left`, `removed`), `joinedAt`, `timestamps`.
- `Invitation.js`: `email`, `organization`, `role`, `invitedBy`, `tokenHash`, `status`, `expiresAt`, `timestamps`.

#### 3. Endpoints Summary

| Method | Endpoint | Permission | Status | Description |
| :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/organizations` | Authenticated | ✅ Done | Atomic Transaction (Org + 4 Roles + Owner Membership) |
| `GET` | `/api/organizations/my` | Authenticated | ✅ Done | List active organizations for logged-in user |
| `GET` | `/api/organizations/:orgId` | Active Member | ✅ Done | Get single organization details & user membership |
| `GET` | `/api/organizations/:orgId/members` | `member:read` | ✅ Done | Paginated list of members with search & role info |
| `PATCH` | `/api/organizations/:orgId/members/:memberId/role` | `member:update` | ✅ Done | Role update with privilege escalation & owner safeguards |
| `DELETE` | `/api/organizations/:orgId/members/:memberId` | `member:remove` | ✅ Done | Kick member (Owner/Admin protection safeguards) |
| `POST` | `/api/organizations/:orgId/leave` | Active Member | ✅ Done | Voluntarily leave organization (Owner prevented) |
| `POST` | `/api/organizations/:orgId/transfer-ownership` | Owner Only | ✅ Done | Atomic transaction transferring ownership to active member |
| `POST` | `/api/organizations/:orgId/invitations` | `invitation:create` | ✅ Done | Sends invitation email with SHA-256 hashed token & 7d expiry |
| `GET` | `/api/organizations/:orgId/invitations` | `invitation:read` | ✅ Done | Paginated list of invitations for admin |
| `DELETE` | `/api/organizations/:orgId/invitations/:invitationId` | `invitation:revoke` | ✅ Done | Atomically revokes a pending invitation |
| `GET` | `/api/invitations/my` | Authenticated | ✅ Done | Lists pending invitations sent to authenticated user's email |
| `POST` | `/api/invitations/accept` | Authenticated | ✅ Done | Body token acceptance via atomic state transition & transaction |
| `POST` | `/api/invitations/reject` | Authenticated | ✅ Done | Body token rejection with expiry validation & atomic update |
| `POST` | `/api/auth/verify-email` | Public | ✅ Done | Verifies user email via token or developer bypass |
| `POST` | `/api/auth/resend-verification` | Authenticated/Public | ✅ Done | Resends email verification link via Gmail SMTP |

---

### Phase 5: Team Management

**Status:** ✅ Completed

#### 1. Scope & Goals

- Teams organized within organizations (e.g., Engineering, Marketing, Design).
- Team leaders/managers and member associations with strict organization-membership checks.
- Compound unique index (`{ organization: 1, name: 1 }`) ensuring unique team names within an organization.
- Dedicated member management: adding members, self-leaving, removal, and lead transfer.

#### 2. Key Models

- `Team.js`: `name`, `description`, `organization`, `lead`, `members: [userId]`, `createdBy`, `timestamps`.

#### 3. Endpoints Summary

| Method | Endpoint | Permission | Status | Description |
| :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/organizations/:orgId/teams` | `team:create` | ✅ Done | Create new team with optional lead and member list |
| `GET` | `/api/organizations/:orgId/teams` | `team:read` | ✅ Done | Paginated list of teams with member count, lead, and filters |
| `GET` | `/api/organizations/:orgId/teams/:teamId` | `team:read` | ✅ Done | Detailed team view with populated lead and full members |
| `PATCH` | `/api/organizations/:orgId/teams/:teamId` | `team:update` / Lead | ✅ Done | Update team info (name, description, lead assignment) |
| `POST` | `/api/organizations/:orgId/teams/:teamId/members` | `team:update` / Lead | ✅ Done | Add active organization members to team |
| `DELETE` | `/api/organizations/:orgId/teams/:teamId/members/:userId` | `team:update` / Lead / Self | ✅ Done | Remove member from team or voluntary team leave |
| `DELETE` | `/api/organizations/:orgId/teams/:teamId` | `team:delete` | ✅ Done | Delete team from organization |

---

### Phase 6: Project Management

**Status:** ✅ Completed

#### 1. Scope & Goals

- Projects scoped to organizations and linked to teams.
- Project status (`planning`, `active`, `on_hold`, `completed`, `cancelled`) and priority (`low`, `medium`, `high`, `urgent`).
- Unique uppercase project key per organization (e.g., `TF`, `PROJ`) with compound unique index `{ organization: 1, key: 1 }`.
- Date tracking (start date, due date) with boundary validation (`dueDate >= startDate`).
- Dedicated project member management: assigning team, lead, contributors, and self-leave.

#### 2. Key Models

- `Project.js`: `name`, `key`, `description`, `organization`, `team`, `lead`, `members: [userId]`, `status`, `priority`, `startDate`, `dueDate`, `createdBy`, `timestamps`.

#### 3. Endpoints Summary

| Method | Endpoint | Permission | Status | Description |
| :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/organizations/:orgId/projects` | `project:create` | ✅ Done | Create project with key, optional team, lead, members, dates |
| `GET` | `/api/organizations/:orgId/projects` | `project:read` | ✅ Done | List projects with filters (team, status, priority, search, myProjects) |
| `GET` | `/api/organizations/:orgId/projects/:projectId` | `project:read` | ✅ Done | Project details with populated team, lead, and contributors |
| `PATCH` | `/api/organizations/:orgId/projects/:projectId` | `project:update` / Lead | ✅ Done | Update project info, dates, status, priority, team, lead |
| `POST` | `/api/organizations/:orgId/projects/:projectId/members` | `project:update` / Lead | ✅ Done | Add active organization members to project |
| `DELETE` | `/api/organizations/:orgId/projects/:projectId/members/:userId` | `project:update` / Lead / Self | ✅ Done | Remove contributor or self-leave from project |
| `DELETE` | `/api/organizations/:orgId/projects/:projectId` | `project:delete` | ✅ Done | Delete project from organization |

---

### Phase 7: Task Management & Assignments

**Status:** ✅ Completed

#### 1. Scope & Goals

- Core work unit: tasks associated with projects and teams with auto-incrementing task keys (e.g. `TF-1`, `TF-2`).
- Attributes: Title, description (Markdown), status (`todo`, `in_progress`, `in_review`, `done`, `cancelled`), priority (`low`, `medium`, `high`, `urgent`), assignee, reporter, start date, due date, estimated hours, order, tags.
- Advanced querying: filtering by assignee, status, priority, search; pagination; Kanban column grouping.
- Concurrency protection: Atomic `$inc: { taskCounter: 1 }` on Project to guarantee unique sequential task keys under heavy load.

#### 2. Key Models

- `Task.js`: `title`, `taskKey`, `description`, `organization`, `project`, `team`, `status`, `priority`, `assignee`, `reporter`, `startDate`, `dueDate`, `estimatedHours`, `order`, `tags`, `timestamps`.

#### 3. Endpoints Summary

| Method | Endpoint | Permission | Status | Description |
| :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/organizations/:orgId/projects/:projectId/tasks` | `task:create` | ✅ Done | Create task with auto-generated atomic `TF-1` sequential key |
| `GET` | `/api/organizations/:orgId/projects/:projectId/tasks` | `task:read` | ✅ Done | Project Kanban board grouped by column status and order |
| `GET` | `/api/organizations/:orgId/tasks` | `task:read` | ✅ Done | Organization-wide task list with filters (assignee, status, priority, search) |
| `GET` | `/api/organizations/:orgId/tasks/:taskId` | `task:read` | ✅ Done | Single task detailed view with populated project, team, assignee, reporter |
| `PATCH` | `/api/organizations/:orgId/tasks/:taskId` | `task:update` / Assignee | ✅ Done | Update task metadata, description, dates, priority, tags |
| `PATCH` | `/api/organizations/:orgId/tasks/:taskId/status` | `task:update` / Assignee | ✅ Done | Fast status workflow transition (`todo` -> `in_progress` -> `done`) |
| `PATCH` | `/api/organizations/:orgId/tasks/:taskId/assign` | `task:assign` | ✅ Done | Reassign task to verified active organization member |
| `DELETE` | `/api/organizations/:orgId/tasks/:taskId` | `task:delete` / Reporter | ✅ Done | Delete task from organization |

---

### Phase 8: Comments Module

**Status:** ✅ Completed

#### 1. Scope & Goals

- Discussions on tasks with author attribution, timestamps, and edit history tracking (`isEdited`, `editedAt`).
- Authorization & Security: only the original author can edit their comment; author, organization owner, or administrator can delete comments.
- Multi-tenant data isolation: Compound indexes on `{ task: 1, createdAt: 1 }` and `{ organization: 1, task: 1 }`.

#### 2. Key Models

- `Comment.js`: `content`, `task`, `organization`, `author`, `isEdited`, `editedAt`, `timestamps`.

#### 3. Endpoints Summary

| Method | Endpoint | Permission | Status | Description |
| :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/organizations/:orgId/tasks/:taskId/comments` | `comment:create` | ✅ Done | Add comment to a task (up to 5,000 characters) |
| `GET` | `/api/organizations/:orgId/tasks/:taskId/comments` | `comment:read` | ✅ Done | Chronological list of task comments with author details |
| `PATCH` | `/api/organizations/:orgId/tasks/:taskId/comments/:commentId` | Author Only | ✅ Done | Edit own comment (marks `isEdited: true` and updates `editedAt`) |
| `DELETE` | `/api/organizations/:orgId/tasks/:taskId/comments/:commentId` | Author / Admin / Owner | ✅ Done | Delete comment from task discussion |

---

### Phase 9: File Upload (Cloudinary)

**Status:** ✅ Completed

#### 1. Scope & Goals

- User avatars and task attachments with direct streaming from memory buffers to Cloudinary CDN (no local disk storage).
- Security & Validation: 5MB file size limit, strict MIME type filtering (JPEG/PNG/WEBP for avatars, images + documents/ZIP for task attachments).
- Automatic asset cleanup: Deleting or replacing avatars/attachments destroys the previous asset in Cloudinary to avoid orphaned storage.

#### 2. Key Models

- `User.js`: `avatar` (URL), `avatarPublicId` (Cloudinary public ID).
- `Task.js`: `attachments: [{ originalName, url, publicId, fileType, fileSize, uploadedBy, uploadedAt }]`.

#### 3. Endpoints Summary

| Method | Endpoint | Permission | Status | Description |
| :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/users/profile/avatar` | Authenticated | ✅ Done | Upload/replace user avatar image on Cloudinary |
| `DELETE` | `/api/users/profile/avatar` | Authenticated | ✅ Done | Remove user avatar and destroy asset from Cloudinary |
| `POST` | `/api/organizations/:orgId/tasks/:taskId/attachments` | `task:update` / Assignee | ✅ Done | Upload file attachment to task via Cloudinary |
| `DELETE` | `/api/organizations/:orgId/tasks/:taskId/attachments/:attachmentId` | Uploader / Admin / Owner | ✅ Done | Delete attachment from task and destroy asset from Cloudinary |

---

### Phase 10: In-App Notifications System

**Status:** ✅ Completed

#### 1. Scope & Goals

- Persistent in-app notifications model with recipient, sender, organization isolation, and read/unread tracking.
- Anti-self-notification safeguard (never sends notification if recipient == sender).
- Compound indexes for high-speed badge counters (`unreadCount`) and chronological list fetching.
- Automatic event triggers integrated into Task Management (task assignment, status transitions) and Discussions (comments).
- Full user notification lifecycle (fetch paginated, filter unread, get badge count, mark single/all as read, dismiss/delete).

#### 2. Key Models & Services

- `Notification.js`: `recipient`, `sender`, `organization`, `type` (`task_assigned`, `task_status_changed`, `comment_added`, `mention`), `title`, `message`, `resourceType` (`task`, `project`, `comment`), `resourceId`, `isRead`, `readAt`, `timestamps`.
- `src/services/notificationService.js`: `createNotification` with input validation, payload truncation, and silent error trapping.

#### 3. Endpoints Summary

| Method | Endpoint | Permission | Status | Description |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/notifications` | Authenticated | ✅ Done | Get user notifications (paginated, `unreadOnly=true`, optional `organization` filter) |
| `GET` | `/api/notifications/unread-count` | Authenticated | ✅ Done | Get unread count for bell icon badge |
| `PATCH` | `/api/notifications/:notificationId/read` | Authenticated | ✅ Done | Mark a specific notification as read |
| `PATCH` | `/api/notifications/read-all` | Authenticated | ✅ Done | Mark all notifications as read for current user |
| `DELETE` | `/api/notifications/:notificationId` | Authenticated | ✅ Done | Delete/dismiss a notification document |

---

### Phase 11: Real-time Communication (Socket.IO)

**Status:** ✅ Completed

#### 1. Scope & Goals

- Instant real-time WebSocket communication integrated into Express HTTP server via Socket.IO.
- Handshake JWT authentication (`socketAuth.js`) preventing unauthorized WebSocket connections.
- Multi-tenant room partitioning with access control guards (`user:<id>`, `org:<id>`, `project:<id>`, `task:<id>`).
- Live event delivery for In-App notifications, Kanban boards, and task discussions.

#### 2. Architecture & Modules

- `src/socket/socketAuth.js`: Validates JWT token from `auth.token`, `headers.authorization`, or `query.token`. Verifies user active status.
- `src/socket/index.js`: Socket server initializer, connection lifecycle management, room joins with authorization checks, and reusable emitter helpers:
  - `emitToUser(userId, event, payload)`
  - `emitToOrg(orgId, event, payload)`
  - `emitToProject(projectId, event, payload)`
  - `emitToTask(taskId, event, payload)`

#### 3. Real-Time Events Summary

| Event Name | Room Scope | Triggered In | Description |
| :--- | :--- | :--- | :--- |
| `notification:new` | `user:<id>` | `notificationService.js` | Direct alert pushed to user's screen live |
| `task:created` | `project:<id>` | `taskController.js` | New task added to project Kanban board |
| `task:status_changed` | `project:<id>` | `taskController.js` | Instant card movement across Kanban columns |
| `task:assigned` | `project:<id>` | `taskController.js` | Live assignee change on Kanban cards |
| `task:deleted` | `project:<id>` | `taskController.js` | Live removal of deleted card |
| `comment:new` | `task:<id>` | `commentController.js` | Instant message in task discussion modal |
| `task:attachment_uploaded` | `task:<id>` | `taskController.js` | Live file attachment sync in task view |
| `task:typing` / `task:user_typing` | `task:<id>` | Socket client | Collaborative typing indicators |

---

### Phase 12: Dashboard & Analytics APIs

**Status:** ✅ Completed

#### 1. Scope & Goals

- High-performance, single-pass MongoDB `$facet` aggregation pipelines.
- Executive workspace overview metrics (KPIs, status & priority distributions, overdue tracking, unassigned task monitoring).
- Project-wise progress tracking (completion percentages, active tasks, overdue counts).
- Team & member workload capacity analysis (active, overdue, and urgent load distribution).
- Personal contributor dashboard (`my-summary`) for individual contributors.

#### 2. Endpoints Summary

| Method | Endpoint | Permission | Status | Description |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/api/organizations/:orgId/analytics/dashboard` | Active Member | ✅ Done | Executive workspace overview KPIs, status/priority breakdown & recent activity |
| `GET` | `/api/organizations/:orgId/analytics/projects` | Active Member | ✅ Done | Project health, completion percentages & task metrics |
| `GET` | `/api/organizations/:orgId/analytics/workload` | Active Member | ✅ Done | Member workload distribution, active vs completed capacity |
| `GET` | `/api/organizations/:orgId/analytics/my-summary` | Active Member | ✅ Done | Personal contributor dashboard (my active tasks, overdue, due soon) |

---

### Phase 13: Hardening, Security & Production Readiness

**Status:** ⏳ Upcoming

#### 1. Scope & Goals

- Centralized error handling middleware.
- Input validation layer (e.g. Joi or custom validator middleware).
- Rate limiting on sensitive routes (auth, password reset).
- MongoDB index optimization for fast queries and uniqueness constraints.
- CORS hardening and security headers.

---

## 📝 Activity & Changelog Log

| Date             |    Phase    | Action / Changes Made                                                                            | Verified By      |
| :--------------- | :---------: | :----------------------------------------------------------------------------------------------- | :--------------- |
| **Oct 31, 2026** | **Phase 1** | Auth signup, login, getMe, bcrypt, JWT, initial role seeding & permissions middleware completed. | Postman verified |
| **Oct 31, 2026** | **Phase 2** | User list (`GET /api/users`) and user by ID (`GET /api/users/:userId`) implemented.              | Postman verified |
| **Oct 31, 2026** | **Phase 2** | `PROJECT_PHASES.md` created to track step-by-step progress.                                      | Documentation    |
| **Nov 01, 2026** | **Phase 2** | `PATCH /api/users/:userId/role` with last-admin safeguard & DB role verification completed.      | Code verified    |
| **Nov 01, 2026** | **Phase 2** | `DELETE /api/users/:userId` with self-delete & last-admin safeguard completed.                   | Code verified    |
| **Nov 01, 2026** | **Phase 2** | `PATCH /api/users/profile` self profile update via authenticated `req.user.id` completed.        | Code verified    |
| **Nov 01, 2026** | **Phase 3** | Dynamic RBAC completed: permissions registry expanded, hardcoded enums removed, role CRUD (`POST /api/roles`, `GET /api/roles/permissions`, `DELETE /api/roles/:roleName` with system & user-assignment protections) implemented. | Code verified    |
| **Nov 01, 2026** | **Phase 3** | Migrated `User.role` to MongoDB `ObjectId` (`ref: "Role"`), updated `signup` (first user becomes admin, subsequent become member), `login` (JWT token includes `role` and `roleId`), `getMe`, and user controllers with `.populate()`. | Code verified    |
| **Nov 05, 2026** | **Phase 4** | Organizations & Membership: multi-tenancy, seeded roles (`owner`, `admin`, `manager`, `member`), invitations via SMTP & hashed tokens, membership updates, voluntary leave, and atomic ownership transfer. | Postman verified |
| **Nov 08, 2026** | **Phase 5** | Teams management: team CRUD, team lead validation, member assignment/removal, collation index for case-insensitive team names. | Postman verified |
| **Nov 10, 2026** | **Phase 6** | Projects management: project CRUD, atomic auto-incrementing key generation, contributors management, date ranges. | Postman verified |
| **Nov 11, 2026** | **Phase 7** | Tasks & Kanban board: atomic sequential task keys (`TF-1`), status workflows, Kanban views, assignees, reporters, priorities. | Postman verified |
| **Nov 12, 2026** | **Phase 8** | Comments & Discussions: chronological discussion thread per task, author edit restriction, author/admin deletion. | Postman verified |
| **Nov 13, 2026** | **Phase 9** | Cloudinary file uploads: memory storage streaming, profile avatar upload/remove, task attachments upload/delete with MIME validation. | Postman verified |
| **Nov 14, 2026** | **Phase 10**| In-App Notifications: schema & compound index, notificationService with anti-self-notification guard, task & comment triggers, CRUD endpoints, and Postman folder 11. | Code verified    |
| **Nov 15, 2026** | **Phase 11**| Real-Time WebSockets: Socket.IO setup on HTTP server, JWT handshake auth (`socketAuth.js`), scoped room partitioning (`user`, `org`, `project`, `task`), live triggers for notifications, Kanban updates, and discussions. | Live Test verified |
| **Nov 15, 2026** | **Phase 12**| Dashboard & Analytics APIs: MongoDB single-pass `$facet` aggregation pipelines, executive dashboard KPIs, project completion metrics, member workload capacity, personal summary, and Postman folder 12. | Live Test verified |
