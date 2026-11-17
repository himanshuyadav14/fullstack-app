import { io } from "socket.io-client";
import { SOCKET_URL } from "./urls";

let socket = null;

/**
 * Initializes and connects the Socket.IO client with JWT authentication
 * @param {string} token
 * @returns {Socket}
 */
export const connectSocket = (token) => {
  if (socket) {
    if (socket.connected) return socket;
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    console.log("🔌 Connected to TeamFlow real-time WebSocket:", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.warn("⚠️ WebSocket connection failed:", err.message);
  });

  return socket;
};

/**
 * Returns current socket instance
 */
export const getSocket = () => socket;

/**
 * Disconnects socket cleanly
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
