require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const dbConnect = require("./config/db");
const { initSocket } = require("./socket");

// Routes Import
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const roleRoutes = require("./routes/roleRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
const invitationRoutes = require("./routes/invitationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();

// Middlewares
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date() });
});

const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

const startServer = async () => {
  try {
    await dbConnect();
    const PORT = process.env.PORT || 5001;
    server.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌Server startup failed", err.message);
    process.exit(1);
  }
};

startServer();
