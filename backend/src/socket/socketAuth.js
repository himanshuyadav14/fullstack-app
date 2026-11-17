const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Socket.IO Authentication Middleware
 * Validates JWT during the WebSocket handshake
 */
const socketAuth = async (socket, next) => {
  try {
    // 1. Extract token from auth payload, headers, or query params
    let token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization ||
      socket.handshake.query?.token;

    if (!token) {
      return next(new Error("Authentication error: Token is required"));
    }

    if (token.startsWith("Bearer ")) {
      token = token.slice(7).trim();
    }

    // 2. Verify JWT signature & expiration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      return next(new Error("Authentication error: Invalid token payload"));
    }

    // 3. Optional DB verification to ensure user still exists & active
    const user = await User.findById(decoded.id).select("_id name email status");
    if (!user || user.status !== "active") {
      return next(new Error("Authentication error: User not found or suspended"));
    }

    // 4. Attach authenticated user object to socket instance
    socket.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };

    next();
  } catch (error) {
    console.error("Socket authentication failed:", error.message);
    return next(new Error("Authentication error: Invalid or expired token"));
  }
};

module.exports = socketAuth;
