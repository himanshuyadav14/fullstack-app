import { useSyncExternalStore } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "./urls";

let socket = null;

// Components subscribe so they re-run their effects when the socket instance is
// created or replaced, instead of grabbing whatever getSocket() returned on mount.
const subscribers = new Set();
const notifySubscribers = () => subscribers.forEach((cb) => cb());

const subscribeSocket = (cb) => {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
};

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

  notifySubscribers();
  return socket;
};

/**
 * Returns current socket instance
 */
export const getSocket = () => socket;

/**
 * React hook: current socket instance (or null), re-renders when it changes
 */
export const useSocket = () => useSyncExternalStore(subscribeSocket, getSocket);

/**
 * Joins a server room now (if connected) and again after every reconnect,
 * since the server forgets room membership when a connection drops.
 * Returns a cleanup function.
 */
export const joinRoomWhileConnected = (sock, event, id, leaveEvent) => {
  const join = () => sock.emit(event, id);
  if (sock.connected) join();
  sock.on("connect", join);

  return () => {
    sock.off("connect", join);
    if (leaveEvent && sock.connected) sock.emit(leaveEvent, id);
  };
};

/**
 * Disconnects socket cleanly
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    notifySubscribers();
  }
};
