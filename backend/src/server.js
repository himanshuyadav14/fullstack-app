require("dotenv").config();

const http = require("http");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const dbConnect = require("./config/db");
const { initSocket } = require("./socket");
const { authLimiter, apiLimiter } = require("./middleware/rateLimiter");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

// Routes Import
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
const invitationRoutes = require("./routes/invitationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json({ limit: "1mb" }));

// Rate Limiting
app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

// Health check endpoint (for load balancers & monitoring)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/notifications", notificationRoutes);

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

const startServer = async () => {
  try {
    await dbConnect();
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => {
      console.log(`🚀 Server listening on port ${PORT} [Mode: ${process.env.NODE_ENV || "development"}]`);
    });
  } catch (err) {
    console.error("❌ Server startup failed:", err.message);
    process.exit(1);
  }
};

// Process-level unhandled exception safety
process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("🔥 Uncaught Exception thrown:", error);
  process.exit(1);
});

// Graceful termination handling
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received. Gracefully shutting down...");
  server.close(() => {
    console.log("Server closed successfully.");
    process.exit(0);
  });
});

startServer();
