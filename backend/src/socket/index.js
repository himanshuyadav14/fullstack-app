const { Server } = require("socket.io");
const socketAuth = require("./socketAuth");
const Membership = require("../models/Membership");
const Project = require("../models/Project");
const Task = require("../models/Task");
const mongoose = require("mongoose");

let io = null;

/**
 * Initializes the Socket.IO server attached to the HTTP server
 * @param {import('http').Server} httpServer
 */
const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Apply JWT authentication middleware
  io.use(socketAuth);

  io.on("connection", (socket) => {
    const userId = socket.user.id;
    console.log(`🔌 [Socket Connected] User: ${socket.user.name} (${userId}) | SocketId: ${socket.id}`);

    // 1. Auto-join personal user room for direct alerts & notifications
    socket.join(`user:${userId}`);

    // 2. Join Project Room (for real-time Kanban updates)
    socket.on("join:project", async (projectId, callback) => {
      try {
        if (!projectId || !mongoose.isValidObjectId(projectId)) {
          if (callback) callback({ success: false, message: "Invalid project ID" });
          return;
        }

        const project = await Project.findById(projectId).select("organization");
        if (!project) {
          if (callback) callback({ success: false, message: "Project not found" });
          return;
        }

        const isMember = await Membership.exists({
          user: userId,
          organization: project.organization,
          status: "active",
        });

        if (!isMember) {
          if (callback) callback({ success: false, message: "Access denied to project" });
          return;
        }

        socket.join(`project:${projectId}`);
        if (callback) callback({ success: true, message: `Joined project room project:${projectId}` });
      } catch (err) {
        if (callback) callback({ success: false, message: "Failed to join project room" });
      }
    });

    // 3. Leave Project Room
    socket.on("leave:project", (projectId) => {
      if (projectId) {
        socket.leave(`project:${projectId}`);
      }
    });

    // 4. Join Task Room (for live comments & discussions)
    socket.on("join:task", async (taskId, callback) => {
      try {
        if (!taskId || !mongoose.isValidObjectId(taskId)) {
          if (callback) callback({ success: false, message: "Invalid task ID" });
          return;
        }

        const task = await Task.findById(taskId).select("organization");
        if (!task) {
          if (callback) callback({ success: false, message: "Task not found" });
          return;
        }

        const isMember = await Membership.exists({
          user: userId,
          organization: task.organization,
          status: "active",
        });

        if (!isMember) {
          if (callback) callback({ success: false, message: "Access denied to task" });
          return;
        }

        socket.join(`task:${taskId}`);
        if (callback) callback({ success: true, message: `Joined task room task:${taskId}` });
      } catch (err) {
        if (callback) callback({ success: false, message: "Failed to join task room" });
      }
    });

    // 5. Leave Task Room
    socket.on("leave:task", (taskId) => {
      if (taskId) {
        socket.leave(`task:${taskId}`);
      }
    });

    // 6. Collaborative Typing Indicator for Task Comments
    socket.on("task:typing", ({ taskId, isTyping }) => {
      if (taskId) {
        socket.to(`task:${taskId}`).emit("task:user_typing", {
          userId,
          userName: socket.user.name,
          taskId,
          isTyping: !!isTyping,
        });
      }
    });

    // Handle Disconnect
    socket.on("disconnect", (reason) => {
      console.log(`❌ [Socket Disconnected] User: ${socket.user.name} (${userId}) | Reason: ${reason}`);
    });
  });

  return io;
};

/**
 * Emit event to a specific user's private room
 * @param {string|ObjectId} userId
 * @param {string} event
 * @param {Object} data
 */
const emitToUser = (userId, event, data) => {
  if (!io || !userId) return;
  io.to(`user:${userId.toString()}`).emit(event, data);
};

/**
 * Emit event to all subscribers of a project (e.g. Kanban board)
 * @param {string|ObjectId} projectId
 * @param {string} event
 * @param {Object} data
 */
const emitToProject = (projectId, event, data) => {
  if (!io || !projectId) return;
  io.to(`project:${projectId.toString()}`).emit(event, data);
};

/**
 * Emit event to all subscribers of a task (e.g. discussion modal)
 * @param {string|ObjectId} taskId
 * @param {string} event
 * @param {Object} data
 */
const emitToTask = (taskId, event, data) => {
  if (!io || !taskId) return;
  io.to(`task:${taskId.toString()}`).emit(event, data);
};

module.exports = {
  initSocket,
  emitToUser,
  emitToProject,
  emitToTask,
};
