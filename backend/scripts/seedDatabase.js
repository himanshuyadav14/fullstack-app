require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const User = require("../src/models/User");
const Organization = require("../src/models/Organization");
const Role = require("../src/models/Role");
const Membership = require("../src/models/Membership");
const Team = require("../src/models/Team");
const Project = require("../src/models/Project");
const Task = require("../src/models/Task");
const Comment = require("../src/models/Comment");
const Notification = require("../src/models/Notification");
const Invitation = require("../src/models/Invitation");
const PERMISSIONS = require("../src/constants/permissions");

async function seed() {
  const mongoUri = process.env.MONGO_URL;
  if (!mongoUri) {
    throw new Error("MONGO_URL not found in .env");
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB successfully.");

  console.log("\n--- STEP 1: CLEANING PREVIOUS DATABASE ---");
  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    Role.deleteMany({}),
    Membership.deleteMany({}),
    Team.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    Comment.deleteMany({}),
    Notification.deleteMany({}),
    Invitation.deleteMany({}),
  ]);
  console.log("All collections wiped clean.");

  console.log("\n--- STEP 2: SEEDING USERS ---");
  const hashedPassword = await bcrypt.hash("Password123!", 10);

  const usersData = [
    {
      name: "Himanshu Yadav",
      email: "himyadav.yh@gmail.com",
      password: hashedPassword,
      isEmailVerified: true,
      status: "active",
      authProvider: "local",
    },
    {
      name: "Aarav Sharma",
      email: "aarav.sharma@example.com",
      password: hashedPassword,
      isEmailVerified: true,
      status: "active",
      authProvider: "local",
    },
    {
      name: "Priya Patel",
      email: "priya.patel@example.com",
      password: hashedPassword,
      isEmailVerified: true,
      status: "active",
      authProvider: "local",
    },
    {
      name: "Rohan Verma",
      email: "rohan.verma@example.com",
      password: hashedPassword,
      isEmailVerified: true,
      status: "active",
      authProvider: "local",
    },
    {
      name: "Neha Gupta",
      email: "neha.gupta@example.com",
      password: hashedPassword,
      isEmailVerified: true,
      status: "active",
      authProvider: "local",
    },
    {
      name: "Kabir Mehta",
      email: "kabir.mehta@example.com",
      password: hashedPassword,
      isEmailVerified: true,
      status: "active",
      authProvider: "local",
    },
  ];

  const createdUsers = await User.insertMany(usersData);
  const userMap = {};
  createdUsers.forEach((u) => {
    userMap[u.email] = u;
    console.log(`  User: ${u.name} <${u.email}> (ID: ${u._id})`);
  });

  const himanshu = userMap["himyadav.yh@gmail.com"];
  const aarav = userMap["aarav.sharma@example.com"];
  const priya = userMap["priya.patel@example.com"];
  const rohan = userMap["rohan.verma@example.com"];
  const neha = userMap["neha.gupta@example.com"];
  const kabir = userMap["kabir.mehta@example.com"];

  // Helper to create standard system roles + custom roles for an organization
  async function setupRoles(orgId, customRoles = []) {
    const systemRoles = [
      {
        organization: orgId,
        name: "owner",
        description: "Organization Owner with unrestricted administrative rights",
        isSystemRole: true,
        permissions: Object.values(PERMISSIONS),
      },
      {
        organization: orgId,
        name: "admin",
        description: "Organization Administrator",
        isSystemRole: true,
        permissions: [
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
        organization: orgId,
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
        organization: orgId,
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

    const allRolesToInsert = [
      ...systemRoles,
      ...customRoles.map((r) => ({
        organization: orgId,
        name: r.name.toLowerCase(),
        description: r.description,
        isSystemRole: false,
        permissions: r.permissions,
      })),
    ];

    const insertedRoles = await Role.insertMany(allRolesToInsert);
    const roleMap = {};
    insertedRoles.forEach((r) => {
      roleMap[r.name] = r;
    });
    return roleMap;
  }

  console.log("\n--- STEP 3: SEEDING ORGANIZATIONS & ROLES ---");

  // ==========================================
  // ORG 1: QUANTARA AI
  // ==========================================
  const quantaraOrg = await Organization.create({
    name: "Quantara AI",
    slug: "quantara-ai",
    description: "Agentic Cyber Range & Autonomous Threat Defense Platform",
    industry: "Software & Technology",
    teamSize: "11-50",
    createdBy: himanshu._id,
    status: "active",
  });
  console.log(`Created Organization: ${quantaraOrg.name} (${quantaraOrg._id})`);

  const quantaraRoles = await setupRoles(quantaraOrg._id, [
    {
      name: "security lead",
      description: "Oversees threat intel, vulnerability response and compliance",
      permissions: [
        PERMISSIONS.ORGANIZATION_READ,
        PERMISSIONS.PROJECT_READ,
        PERMISSIONS.PROJECT_UPDATE,
        PERMISSIONS.TASK_READ,
        PERMISSIONS.TASK_CREATE,
        PERMISSIONS.TASK_UPDATE,
        PERMISSIONS.TASK_ASSIGN,
        PERMISSIONS.COMMENT_READ,
        PERMISSIONS.COMMENT_CREATE,
        PERMISSIONS.TEAM_READ,
        PERMISSIONS.MEMBER_READ,
      ],
    },
    {
      name: "design specialist",
      description: "Owns visual hierarchy, brand components, and design systems",
      permissions: [
        PERMISSIONS.ORGANIZATION_READ,
        PERMISSIONS.PROJECT_READ,
        PERMISSIONS.TASK_READ,
        PERMISSIONS.TASK_CREATE,
        PERMISSIONS.TASK_UPDATE,
        PERMISSIONS.COMMENT_READ,
        PERMISSIONS.COMMENT_CREATE,
      ],
    },
    {
      name: "qa specialist",
      description: "Executes test matrices, end-to-end verification, and regression benchmarks",
      permissions: [
        PERMISSIONS.ORGANIZATION_READ,
        PERMISSIONS.PROJECT_READ,
        PERMISSIONS.TASK_READ,
        PERMISSIONS.TASK_CREATE,
        PERMISSIONS.TASK_UPDATE,
        PERMISSIONS.COMMENT_READ,
        PERMISSIONS.COMMENT_CREATE,
      ],
    },
  ]);

  quantaraOrg.settings.defaultRole = quantaraRoles["member"]._id;
  await quantaraOrg.save();

  // Quantara Memberships
  await Membership.insertMany([
    {
      user: himanshu._id,
      organization: quantaraOrg._id,
      role: quantaraRoles["owner"]._id,
      status: "active",
    },
    {
      user: aarav._id,
      organization: quantaraOrg._id,
      role: quantaraRoles["admin"]._id,
      status: "active",
    },
    {
      user: rohan._id,
      organization: quantaraOrg._id,
      role: quantaraRoles["manager"]._id,
      status: "active",
    },
    {
      user: priya._id,
      organization: quantaraOrg._id,
      role: quantaraRoles["design specialist"]._id,
      status: "active",
    },
    {
      user: kabir._id,
      organization: quantaraOrg._id,
      role: quantaraRoles["security lead"]._id,
      status: "active",
    },
    {
      user: neha._id,
      organization: quantaraOrg._id,
      role: quantaraRoles["qa specialist"]._id,
      status: "active",
    },
  ]);

  // Quantara Teams
  const quantaraTeams = await Team.insertMany([
    {
      name: "Core Engineering",
      description: "Distributed backends, consensus protocols, and query optimization",
      organization: quantaraOrg._id,
      lead: himanshu._id,
      members: [himanshu._id, aarav._id, neha._id],
      createdBy: himanshu._id,
    },
    {
      name: "AI Platform & Inference",
      description: "LLM agents, vector embeddings, and real-time streaming runtime",
      organization: quantaraOrg._id,
      lead: aarav._id,
      members: [aarav._id, kabir._id],
      createdBy: himanshu._id,
    },
    {
      name: "Product & Design",
      description: "Human-AI interaction patterns, component libraries, and visual hierarchy",
      organization: quantaraOrg._id,
      lead: priya._id,
      members: [priya._id, himanshu._id],
      createdBy: himanshu._id,
    },
    {
      name: "Cloud & SecOps",
      description: "Multi-cluster Kubernetes mesh, container security, and CI/CD pipelines",
      organization: quantaraOrg._id,
      lead: rohan._id,
      members: [rohan._id, kabir._id],
      createdBy: himanshu._id,
    },
  ]);
  const teamCoreEng = quantaraTeams[0];
  const teamAiPlatform = quantaraTeams[1];
  const teamProductDesign = quantaraTeams[2];
  const teamCloudSecOps = quantaraTeams[3];

  // Quantara Projects
  const crqProject = await Project.create({
    name: "CRQ Engine",
    key: "CRQ",
    description: "Cyber Range Quorum core orchestration engine and telemetry bus",
    organization: quantaraOrg._id,
    team: teamCoreEng._id,
    lead: himanshu._id,
    members: [himanshu._id, aarav._id, neha._id],
    status: "active",
    priority: "urgent",
    taskCounter: 5,
    createdBy: himanshu._id,
  });

  const nsaProject = await Project.create({
    name: "Neural Shield Agent",
    key: "NSA",
    description: "Autonomous agent for prompt injection detection and zero-day guardrails",
    organization: quantaraOrg._id,
    team: teamAiPlatform._id,
    lead: aarav._id,
    members: [aarav._id, kabir._id],
    status: "active",
    priority: "high",
    taskCounter: 4,
    createdBy: aarav._id,
  });

  const dsvProject = await Project.create({
    name: "Design System V2",
    key: "DSV",
    description: "Tokenized monochrome interface system and accessible UI primitives",
    organization: quantaraOrg._id,
    team: teamProductDesign._id,
    lead: priya._id,
    members: [priya._id, himanshu._id],
    status: "active",
    priority: "medium",
    taskCounter: 4,
    createdBy: priya._id,
  });

  const infraProject = await Project.create({
    name: "Cloud Infrastructure",
    key: "INFRA",
    description: "High-availability multi-region cluster architecture and zero-trust mesh",
    organization: quantaraOrg._id,
    team: teamCloudSecOps._id,
    lead: rohan._id,
    members: [rohan._id, kabir._id],
    status: "active",
    priority: "high",
    taskCounter: 3,
    createdBy: rohan._id,
  });

  // Quantara Tasks
  const quantaraTasksData = [
    // CRQ Tasks
    {
      title: "Implement JWT Token rotation & revocation cache",
      taskKey: "CRQ-1",
      description: "Ensure short-lived access tokens rotate smoothly with Redis token blacklist checks upon logout.",
      organization: quantaraOrg._id,
      project: crqProject._id,
      team: teamCoreEng._id,
      status: "done",
      priority: "high",
      assignee: aarav._id,
      reporter: himanshu._id,
      dueDate: new Date(Date.now() - 2 * 86400000),
      order: 0,
      attachments: [
        {
          originalName: "jwt-rotation-architecture.pdf",
          url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800",
          publicId: "seed-att-1",
          fileSize: 1048576,
          fileType: "application/pdf",
          uploadedBy: himanshu._id,
        },
      ],
    },
    {
      title: "Build AST parser for multi-tenant telemetry pipeline",
      taskKey: "CRQ-2",
      description: "Parse incoming agent telemetry streams into validated abstract syntax nodes before passing to ingestion sinks.",
      organization: quantaraOrg._id,
      project: crqProject._id,
      team: teamCoreEng._id,
      status: "in_progress",
      priority: "urgent",
      assignee: himanshu._id,
      reporter: aarav._id,
      dueDate: new Date(Date.now() + 3 * 86400000),
      order: 1,
    },
    {
      title: "Integrate Redis BullMQ queue for async webhook dispatcher",
      taskKey: "CRQ-3",
      description: "Buffer webhook events in durable BullMQ redis queues with exponential backoff retry policies.",
      organization: quantaraOrg._id,
      project: crqProject._id,
      team: teamCoreEng._id,
      status: "in_progress",
      priority: "high",
      assignee: aarav._id,
      reporter: himanshu._id,
      dueDate: new Date(Date.now() + 5 * 86400000),
      order: 2,
    },
    {
      title: "Optimize MongoDB composite indexes for team queries",
      taskKey: "CRQ-4",
      description: "Review query explain plans on large collections to ensure prefix index matching on { organization, team, status }.",
      organization: quantaraOrg._id,
      project: crqProject._id,
      team: teamCoreEng._id,
      status: "in_review",
      priority: "medium",
      assignee: rohan._id,
      reporter: himanshu._id,
      dueDate: new Date(Date.now() + 1 * 86400000),
      order: 3,
    },
    {
      title: "Write end-to-end integration test suite with Jest",
      taskKey: "CRQ-5",
      description: "Cover all project creation and RBAC permission gate paths using mock database transactions.",
      organization: quantaraOrg._id,
      project: crqProject._id,
      team: teamCoreEng._id,
      status: "todo",
      priority: "medium",
      assignee: neha._id,
      reporter: himanshu._id,
      dueDate: new Date(Date.now() + 7 * 86400000),
      order: 4,
    },

    // NSA Tasks
    {
      title: "Fine-tune prompt defense model for injection attacks",
      taskKey: "NSA-1",
      description: "Collect synthetic jailbreak datasets and train a compact classifier to flag adversarial system prompts.",
      organization: quantaraOrg._id,
      project: nsaProject._id,
      team: teamAiPlatform._id,
      status: "done",
      priority: "high",
      assignee: kabir._id,
      reporter: aarav._id,
      dueDate: new Date(Date.now() - 1 * 86400000),
      order: 0,
    },
    {
      title: "Stream LLM reasoning tokens with Server-Sent Events",
      taskKey: "NSA-2",
      description: "Expose an SSE stream endpoint that yields reasoning deltas directly into the React UI.",
      organization: quantaraOrg._id,
      project: nsaProject._id,
      team: teamAiPlatform._id,
      status: "in_progress",
      priority: "urgent",
      assignee: aarav._id,
      reporter: kabir._id,
      dueDate: new Date(Date.now() + 2 * 86400000),
      order: 1,
    },
    {
      title: "Implement semantic guardrails & regex filters",
      taskKey: "NSA-3",
      description: "Filter PII and credential patterns before prompts are transmitted to remote inference endpoints.",
      organization: quantaraOrg._id,
      project: nsaProject._id,
      team: teamAiPlatform._id,
      status: "in_review",
      priority: "high",
      assignee: kabir._id,
      reporter: aarav._id,
      dueDate: new Date(Date.now() + 4 * 86400000),
      order: 2,
    },
    {
      title: "Benchmark inference latency across edge workers",
      taskKey: "NSA-4",
      description: "Run latency probes across 3 regional edge workers to choose optimal routing destinations.",
      organization: quantaraOrg._id,
      project: nsaProject._id,
      team: teamAiPlatform._id,
      status: "todo",
      priority: "low",
      assignee: aarav._id,
      reporter: kabir._id,
      dueDate: new Date(Date.now() + 10 * 86400000),
      order: 3,
    },

    // DSV Tasks
    {
      title: "Create tokenized monochrome Tailwind palette",
      taskKey: "DSV-1",
      description: "Define strict zinc/neutral scale with accessible contrast levels in both light and dark modes.",
      organization: quantaraOrg._id,
      project: dsvProject._id,
      team: teamProductDesign._id,
      status: "done",
      priority: "medium",
      assignee: priya._id,
      reporter: himanshu._id,
      dueDate: new Date(Date.now() - 3 * 86400000),
      order: 0,
    },
    {
      title: "Build accessible CustomSelect component with keyboard nav",
      taskKey: "DSV-2",
      description: "Add full ARIA attributes, keydown traversal (ArrowUp, ArrowDown, Enter, Escape) and custom search filter.",
      organization: quantaraOrg._id,
      project: dsvProject._id,
      team: teamProductDesign._id,
      status: "done",
      priority: "high",
      assignee: priya._id,
      reporter: himanshu._id,
      dueDate: new Date(Date.now() - 1 * 86400000),
      order: 1,
    },
    {
      title: "Design responsive squad analytics dashboard cards",
      taskKey: "DSV-3",
      description: "Create modern KPI stat widgets with workload progress bars and active sprint burn-down visuals.",
      organization: quantaraOrg._id,
      project: dsvProject._id,
      team: teamProductDesign._id,
      status: "in_progress",
      priority: "medium",
      assignee: priya._id,
      reporter: himanshu._id,
      dueDate: new Date(Date.now() + 3 * 86400000),
      order: 2,
    },
    {
      title: "Audit contrast ratios for WCAG 2.1 AA compliance",
      taskKey: "DSV-4",
      description: "Verify all text elements maintain at least 4.5:1 contrast against dark backgrounds.",
      organization: quantaraOrg._id,
      project: dsvProject._id,
      team: teamProductDesign._id,
      status: "todo",
      priority: "low",
      assignee: priya._id,
      reporter: himanshu._id,
      dueDate: new Date(Date.now() + 8 * 86400000),
      order: 3,
    },

    // INFRA Tasks
    {
      title: "Provision Terraform multi-region Kubernetes clusters",
      taskKey: "INFRA-1",
      description: "Deploy infrastructure as code with automatic state locking on S3/DynamoDB.",
      organization: quantaraOrg._id,
      project: infraProject._id,
      team: teamCloudSecOps._id,
      status: "done",
      priority: "high",
      assignee: rohan._id,
      reporter: himanshu._id,
      dueDate: new Date(Date.now() - 4 * 86400000),
      order: 0,
    },
    {
      title: "Configure Grafana alerts for microservice error rates",
      taskKey: "INFRA-2",
      description: "Send instant notifications whenever 5xx HTTP rate exceeds 1% over a 5-minute rolling window.",
      organization: quantaraOrg._id,
      project: infraProject._id,
      team: teamCloudSecOps._id,
      status: "in_progress",
      priority: "medium",
      assignee: rohan._id,
      reporter: kabir._id,
      dueDate: new Date(Date.now() + 2 * 86400000),
      order: 1,
    },
    {
      title: "Automate daily encrypted database snapshots",
      taskKey: "INFRA-3",
      description: "Schedule automated mongodump snapshots with KMS envelope encryption.",
      organization: quantaraOrg._id,
      project: infraProject._id,
      team: teamCloudSecOps._id,
      status: "todo",
      priority: "high",
      assignee: rohan._id,
      reporter: himanshu._id,
      dueDate: new Date(Date.now() + 6 * 86400000),
      order: 2,
    },
  ];

  const createdQuantaraTasks = await Task.insertMany(quantaraTasksData);
  console.log(`Created ${createdQuantaraTasks.length} tasks in Quantara AI.`);

  // Find CRQ-2 and NSA-2 for comments
  const taskCrq2 = createdQuantaraTasks.find((t) => t.taskKey === "CRQ-2");
  const taskNsa2 = createdQuantaraTasks.find((t) => t.taskKey === "NSA-2");

  if (taskCrq2) {
    await Comment.insertMany([
      {
        content: "Profiling indicates serialization overhead on payloads > 5MB. Let's benchmark Protocol Buffers.",
        task: taskCrq2._id,
        organization: quantaraOrg._id,
        author: aarav._id,
      },
      {
        content: "Agreed. Added benchmark script in scratch, looking at 3x throughput improvement on synthetic workloads.",
        task: taskCrq2._id,
        organization: quantaraOrg._id,
        author: himanshu._id,
      },
    ]);
  }

  if (taskNsa2) {
    await Comment.insertMany([
      {
        content: "SSE connection heartbeat should ping every 15s to prevent proxy timeouts on production load balancers.",
        task: taskNsa2._id,
        organization: quantaraOrg._id,
        author: kabir._id,
      },
      {
        content: "Implemented heartbeat ping deltas and verified with 30-minute stress tests.",
        task: taskNsa2._id,
        organization: quantaraOrg._id,
        author: aarav._id,
      },
    ]);
  }

  // ==========================================
  // ORG 2: ORBIT STUDIO
  // ==========================================
  const orbitOrg = await Organization.create({
    name: "Orbit Studio",
    slug: "orbit-studio",
    description: "Modern SaaS design engineering & full-stack development studio",
    industry: "Design & Creative Agency",
    teamSize: "2-10",
    createdBy: himanshu._id,
    status: "active",
  });
  console.log(`Created Organization: ${orbitOrg.name} (${orbitOrg._id})`);

  const orbitRoles = await setupRoles(orbitOrg._id, [
    {
      name: "freelance contributor",
      description: "External contractor with scoped task view and update access",
      permissions: [
        PERMISSIONS.ORGANIZATION_READ,
        PERMISSIONS.PROJECT_READ,
        PERMISSIONS.TASK_READ,
        PERMISSIONS.TASK_UPDATE,
        PERMISSIONS.COMMENT_READ,
        PERMISSIONS.COMMENT_CREATE,
      ],
    },
  ]);

  orbitOrg.settings.defaultRole = orbitRoles["member"]._id;
  await orbitOrg.save();

  // Orbit Memberships
  await Membership.insertMany([
    {
      user: himanshu._id,
      organization: orbitOrg._id,
      role: orbitRoles["owner"]._id,
      status: "active",
    },
    {
      user: priya._id,
      organization: orbitOrg._id,
      role: orbitRoles["admin"]._id,
      status: "active",
    },
    {
      user: aarav._id,
      organization: orbitOrg._id,
      role: orbitRoles["member"]._id,
      status: "active",
    },
  ]);

  // Orbit Teams
  const orbitTeams = await Team.insertMany([
    {
      name: "Client Delivery Squad",
      description: "Full-stack web applications and client production releases",
      organization: orbitOrg._id,
      lead: himanshu._id,
      members: [himanshu._id, aarav._id],
      createdBy: himanshu._id,
    },
    {
      name: "Brand & Visuals Squad",
      description: "Vector iconography, marketing web layouts, and interactive media",
      organization: orbitOrg._id,
      lead: priya._id,
      members: [priya._id],
      createdBy: himanshu._id,
    },
  ]);
  const teamDelivery = orbitTeams[0];
  const teamBrand = orbitTeams[1];

  // Orbit Projects
  const fmaProject = await Project.create({
    name: "Fintech Mobile App",
    key: "FMA",
    description: "Cross-platform mobile wallet and high-yield savings interface",
    organization: orbitOrg._id,
    team: teamDelivery._id,
    lead: himanshu._id,
    members: [himanshu._id, aarav._id, priya._id],
    status: "active",
    priority: "urgent",
    taskCounter: 3,
    createdBy: himanshu._id,
  });

  const bidProject = await Project.create({
    name: "Brand Identity 2026",
    key: "BID",
    description: "Comprehensive visual overhaul, typeface guidelines, and 3D assets",
    organization: orbitOrg._id,
    team: teamBrand._id,
    lead: priya._id,
    members: [priya._id],
    status: "active",
    priority: "medium",
    taskCounter: 2,
    createdBy: priya._id,
  });

  // Orbit Tasks
  await Task.insertMany([
    {
      title: "Wireframe biometric login and wallet balance screen",
      taskKey: "FMA-1",
      description: "High-fidelity Figma wireframes for FaceID auth and animated portfolio chart.",
      organization: orbitOrg._id,
      project: fmaProject._id,
      team: teamDelivery._id,
      status: "done",
      priority: "high",
      assignee: priya._id,
      reporter: himanshu._id,
      dueDate: new Date(Date.now() - 2 * 86400000),
      order: 0,
    },
    {
      title: "Implement dark mode transaction feed with virtual scroll",
      taskKey: "FMA-2",
      description: "Support rendering 10,000+ transaction ledger items at 60 FPS using TanStack Virtual.",
      organization: orbitOrg._id,
      project: fmaProject._id,
      team: teamDelivery._id,
      status: "in_progress",
      priority: "urgent",
      assignee: himanshu._id,
      reporter: priya._id,
      dueDate: new Date(Date.now() + 2 * 86400000),
      order: 1,
    },
    {
      title: "Setup Stripe billing & subscription webhooks",
      taskKey: "FMA-3",
      description: "Handle customer.subscription.created, invoice.payment_succeeded, and payment_failed events.",
      organization: orbitOrg._id,
      project: fmaProject._id,
      team: teamDelivery._id,
      status: "todo",
      priority: "high",
      assignee: aarav._id,
      reporter: himanshu._id,
      dueDate: new Date(Date.now() + 5 * 86400000),
      order: 2,
    },
    {
      title: "Export SVG glyphs and typography guidelines",
      taskKey: "BID-1",
      description: "Export full set of 24x24 icons in clean optimized SVGs.",
      organization: orbitOrg._id,
      project: bidProject._id,
      team: teamBrand._id,
      status: "done",
      priority: "low",
      assignee: priya._id,
      reporter: himanshu._id,
      dueDate: new Date(Date.now() - 1 * 86400000),
      order: 0,
    },
    {
      title: "Create dark mode marketing landing page illustrations",
      taskKey: "BID-2",
      description: "Render high-contrast isometric isometric illustrations for SaaS hero section.",
      organization: orbitOrg._id,
      project: bidProject._id,
      team: teamBrand._id,
      status: "in_progress",
      priority: "medium",
      assignee: priya._id,
      reporter: himanshu._id,
      dueDate: new Date(Date.now() + 4 * 86400000),
      order: 1,
    },
  ]);

  // ==========================================
  // ORG 3: APEX CLOUD LABS (Rohan is Owner, Himanshu is Admin!)
  // ==========================================
  const apexOrg = await Organization.create({
    name: "Apex Cloud Labs",
    slug: "apex-cloud-labs",
    description: "Enterprise SRE, observability, and container orchestration labs",
    industry: "DevOps & Cloud",
    teamSize: "11-50",
    createdBy: rohan._id,
    status: "active",
  });
  console.log(`Created Organization: ${apexOrg.name} (${apexOrg._id})`);

  const apexRoles = await setupRoles(apexOrg._id, [
    {
      name: "devops specialist",
      description: "Full control over infrastructure projects, pipelines, and squad tasks",
      permissions: [
        PERMISSIONS.ORGANIZATION_READ,
        PERMISSIONS.TEAM_READ,
        PERMISSIONS.PROJECT_READ,
        PERMISSIONS.PROJECT_CREATE,
        PERMISSIONS.PROJECT_UPDATE,
        PERMISSIONS.TASK_READ,
        PERMISSIONS.TASK_CREATE,
        PERMISSIONS.TASK_UPDATE,
        PERMISSIONS.TASK_DELETE,
        PERMISSIONS.TASK_ASSIGN,
        PERMISSIONS.COMMENT_READ,
        PERMISSIONS.COMMENT_CREATE,
      ],
    },
  ]);

  apexOrg.settings.defaultRole = apexRoles["member"]._id;
  await apexOrg.save();

  // Apex Memberships (Himanshu is Admin here!)
  await Membership.insertMany([
    {
      user: rohan._id,
      organization: apexOrg._id,
      role: apexRoles["owner"]._id,
      status: "active",
    },
    {
      user: himanshu._id,
      organization: apexOrg._id,
      role: apexRoles["admin"]._id,
      status: "active",
    },
    {
      user: kabir._id,
      organization: apexOrg._id,
      role: apexRoles["devops specialist"]._id,
      status: "active",
    },
  ]);

  // Apex Teams
  const apexTeams = await Team.insertMany([
    {
      name: "SRE & Platform Squad",
      description: "Cluster reliability, load shedding, and latency SLOs",
      organization: apexOrg._id,
      lead: rohan._id,
      members: [rohan._id, himanshu._id, kabir._id],
      createdBy: rohan._id,
    },
  ]);
  const teamSre = apexTeams[0];

  // Apex Projects
  const k8sProject = await Project.create({
    name: "Kubernetes Autoscaler",
    key: "K8S",
    description: "Custom Horizontal Pod Autoscaler driven by Prometheus p99 latency metrics",
    organization: apexOrg._id,
    team: teamSre._id,
    lead: rohan._id,
    members: [rohan._id, himanshu._id, kabir._id],
    status: "active",
    priority: "urgent",
    taskCounter: 3,
    createdBy: rohan._id,
  });

  // Apex Tasks
  await Task.insertMany([
    {
      title: "Deploy Prometheus alertmanager for cluster OOM spikes",
      taskKey: "K8S-1",
      description: "Set alert threshold at 85% memory watermark with Slack and PagerDuty routing.",
      organization: apexOrg._id,
      project: k8sProject._id,
      team: teamSre._id,
      status: "done",
      priority: "urgent",
      assignee: rohan._id,
      reporter: himanshu._id,
      dueDate: new Date(Date.now() - 3 * 86400000),
      order: 0,
    },
    {
      title: "Configure zero-downtime Blue/Green deployments",
      taskKey: "K8S-2",
      description: "Implement Argo Rollouts for automated canary analysis with synthetic health traffic.",
      organization: apexOrg._id,
      project: k8sProject._id,
      team: teamSre._id,
      status: "in_progress",
      priority: "high",
      assignee: himanshu._id,
      reporter: rohan._id,
      dueDate: new Date(Date.now() + 3 * 86400000),
      order: 1,
    },
    {
      title: "Enforce mTLS mesh authentication via Istio",
      taskKey: "K8S-3",
      description: "Enable STRICT mutual TLS mode across all namespaces with automatic cert renewal.",
      organization: apexOrg._id,
      project: k8sProject._id,
      team: teamSre._id,
      status: "todo",
      priority: "high",
      assignee: kabir._id,
      reporter: rohan._id,
      dueDate: new Date(Date.now() + 7 * 86400000),
      order: 2,
    },
  ]);

  console.log("\n--- STEP 4: SEEDING NOTIFICATIONS FOR HIMANSHU ---");
  await Notification.insertMany([
    {
      recipient: himanshu._id,
      sender: aarav._id,
      organization: quantaraOrg._id,
      type: "task_assigned",
      title: "New Task Assigned",
      message: "Aarav Sharma assigned task CRQ-2 (Build AST parser for multi-tenant telemetry pipeline) to you.",
      resourceType: "task",
      resourceId: taskCrq2 ? taskCrq2._id : crqProject._id,
      isRead: false,
    },
    {
      recipient: himanshu._id,
      sender: priya._id,
      organization: quantaraOrg._id,
      type: "comment_added",
      title: "New Comment on Design System",
      message: "Priya Patel mentioned you in a comment on Design System V2.",
      resourceType: "task",
      resourceId: crqProject._id,
      isRead: false,
    },
    {
      recipient: himanshu._id,
      sender: rohan._id,
      organization: apexOrg._id,
      type: "team_member_added",
      title: "Added to SRE & Platform Squad",
      message: "Rohan Verma added you as Admin to Apex Cloud Labs & SRE Squad.",
      resourceType: "team",
      resourceId: teamSre._id,
      isRead: true,
      readAt: new Date(Date.now() - 3600000),
    },
  ]);
  console.log("Seeded notifications for Himanshu Yadav.");

  console.log("\n==========================================");
  console.log("DATABASE SEEDING COMPLETED SUCCESSFULLY!");
  console.log("==========================================");
  console.log("Summary of Seeded Data:");
  console.log(`- 6 Users (all password: Password123!)`);
  console.log(`- 3 Organizations (Quantara AI, Orbit Studio, Apex Cloud Labs)`);
  console.log(`- 7 Teams across orgs`);
  console.log(`- 7 Projects strictly linked to Teams`);
  console.log(`- 24 Realistic Tasks with priorities, assignees, dates & attachments`);
  console.log(`- Multiple Custom Roles with fine-grained RBAC permissions:`);
  console.log(`    * Security Lead (Quantara AI)`);
  console.log(`    * Design Specialist (Quantara AI)`);
  console.log(`    * QA Specialist (Quantara AI)`);
  console.log(`    * Freelance Contributor (Orbit Studio)`);
  console.log(`    * DevOps Specialist (Apex Cloud Labs)`);
  console.log(`- Comments & Discussions`);
  console.log(`- Notifications for Himanshu Yadav`);
  console.log("==========================================\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
