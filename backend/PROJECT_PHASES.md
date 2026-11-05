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
| **Phase 4**  | **Organization & Membership**                  |  ⏳ **Upcoming**   | Multi-tenancy, org CRUD, membership model, org-level role assignments                  |
| **Phase 5**  | **Team Management**                            |  ⏳ **Upcoming**   | Teams under organizations, team managers, members, team scoping                        |
| **Phase 6**  | **Project Management**                         |  ⏳ **Upcoming**   | Projects under organizations, project assignments, status tracking, filters            |
| **Phase 7**  | **Task Management & Assignments**              |  ⏳ **Upcoming**   | Task CRUD, status/priority workflow, dates, assignments, pagination & search           |
| **Phase 8**  | **Comments Module**                            |  ⏳ **Upcoming**   | Task comments, editing, deletion with ownership checks                                 |
| **Phase 9**  | **File Uploads (Cloudinary)**                  |  ⏳ **Upcoming**   | Avatars, task attachments, file validation, storage metadata in DB                     |
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

**Status:** 🟡 In Progress

#### 1. Scope & Goals

- Introduce multi-tenancy: users can create or join organizations.
- Data isolation: all subsequent resources (teams, projects, tasks) belong to an organization.
- Membership model (`User` <-> `Organization`) holding organization-scoped roles.
- Atomic Organization creation with 4 seeded system roles (`owner`, `admin`, `manager`, `member`).

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

**Status:** ⏳ Upcoming

#### 1. Scope & Goals

- Teams organized within organizations (e.g., Engineering, Marketing, Design).
- Team leaders/managers and member associations.

#### 2. Key Models

- `Team.js`: `name`, `description`, `organizationId`, `managerId`, `members: [userId]`, `timestamps`.

#### 3. Planned Endpoints

- `POST /api/organizations/:orgId/teams` — Create team.
- `GET /api/organizations/:orgId/teams` — List teams for organization.
- `GET /api/organizations/:orgId/teams/:teamId` — Team details with members.
- `PATCH /api/organizations/:orgId/teams/:teamId` — Update team info/manager.
- `POST /api/organizations/:orgId/teams/:teamId/members` — Add members to team.
- `DELETE /api/organizations/:orgId/teams/:teamId/members/:userId` — Remove member.
- `DELETE /api/organizations/:orgId/teams/:teamId` — Delete team.

---

### Phase 6: Project Management

**Status:** ⏳ Upcoming

#### 1. Scope & Goals

- Projects scoped to organizations and linked to teams.
- Project status (`planning`, `active`, `completed`, `on_hold`).
- Date tracking (start date, due date).

#### 2. Key Models

- `Project.js`: `name`, `key`, `description`, `organizationId`, `teamId`, `members: [userId]`, `status`, `startDate`, `dueDate`, `timestamps`.

#### 3. Planned Endpoints

- `POST /api/organizations/:orgId/projects` — Create project.
- `GET /api/organizations/:orgId/projects` — List projects (with search, pagination, status filters).
- `GET /api/organizations/:orgId/projects/:projectId` — Project details.
- `PATCH /api/organizations/:orgId/projects/:projectId` — Update project.
- `DELETE /api/organizations/:orgId/projects/:projectId` — Delete project.

---

### Phase 7: Task Management & Assignments

**Status:** ⏳ Upcoming

#### 1. Scope & Goals

- Core work unit: tasks associated with projects and teams.
- Attributes: Title, description, status (`todo`, `in_progress`, `in_review`, `completed`), priority (`low`, `medium`, `high`, `urgent`), assignee, reporter, due date.
- Advanced querying: filtering by assignee, status, priority, due date; pagination; sorting.

#### 2. Key Models

- `Task.js`: `title`, `description`, `projectId`, `teamId`, `organizationId`, `status`, `priority`, `assigneeId`, `reporterId`, `dueDate`, `startDate`, `attachments`, `timestamps`.

#### 3. Planned Endpoints

- `POST /api/projects/:projectId/tasks` — Create task.
- `GET /api/projects/:projectId/tasks` — List tasks with filters & pagination.
- `GET /api/tasks/:taskId` — Get single task details.
- `PATCH /api/tasks/:taskId` — Update task details / status.
- `PATCH /api/tasks/:taskId/assign` — Assign or reassign task.
- `DELETE /api/tasks/:taskId` — Delete task.

---

### Phase 8: Comments Module

**Status:** ⏳ Upcoming

#### 1. Scope & Goals

- Discussions on tasks with author attribution, timestamps, edit history.
- Authorization: only author or authorized admin can edit/delete comments.

#### 2. Key Models

- `Comment.js`: `taskId`, `authorId`, `content`, `isEdited`, `timestamps`.

#### 3. Planned Endpoints

- `POST /api/tasks/:taskId/comments` — Add comment.
- `GET /api/tasks/:taskId/comments` — List comments for task.
- `PATCH /api/comments/:commentId` — Edit own comment.
- `DELETE /api/comments/:commentId` — Delete comment.

---

### Phase 9: File Upload (Cloudinary)

**Status:** ⏳ Upcoming

#### 1. Scope & Goals

- User avatars and task attachments.
- Secure upload handling, validation of file size and MIME types.
- Cloudinary asset cleanup on resource deletion.

#### 2. Planned Endpoints

- `POST /api/users/avatar` — Upload and update user profile picture.
- `POST /api/tasks/:taskId/attachments` — Upload attachments to a task.
- `DELETE /api/tasks/:taskId/attachments/:attachmentId` — Remove attachment.

---

### Phase 10: Notifications System

**Status:** ⏳ Upcoming

#### 1. Scope & Goals

- Trigger notifications on task assignment, task status updates, and mentions/comments.
- Persistent notifications in MongoDB with read/unread tracking and pagination.

#### 2. Key Models

- `Notification.js`: `recipientId`, `senderId`, `type`, `title`, `message`, `resourceId`, `resourceType`, `isRead`, `timestamps`.

#### 3. Planned Endpoints

- `GET /api/notifications` — Fetch user notifications (paginated, unread filter).
- `PATCH /api/notifications/:notificationId/read` — Mark single notification as read.
- `PATCH /api/notifications/mark-all-read` — Mark all as read.

---

### Phase 11: Real-time Communication (Socket.IO)

**Status:** ⏳ Upcoming

#### 1. Scope & Goals

- Real-time updates delivered instantly to connected clients.
- JWT-authenticated socket handshakes.
- Rooms partitioned by user ID (`user:<id>`), organization (`org:<id>`), and project (`project:<id>`).
- Events: `task:created`, `task:updated`, `task:assigned`, `comment:added`, `notification:received`.

---

### Phase 12: Dashboard & Analytics APIs

**Status:** ⏳ Upcoming

#### 1. Scope & Goals

- High-level overview metrics for managers and admins.
- Scoped to the requesting user's organization and permissions.

#### 2. Metrics Provided

- Overall counts (users, teams, projects, tasks).
- Task status breakdown (`todo`, `in_progress`, `completed`, `overdue`).
- Team workload and user performance stats.

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
