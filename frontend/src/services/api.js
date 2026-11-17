import axios from "axios";
import { BASE_URL } from "./urls";

/**
 * Centralized Axios instance for TeamFlow API calls
 */
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

/**
 * Request Interceptor:
 * Automatically injects the JWT Bearer token into outgoing HTTP requests
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/**
 * Response Interceptor:
 * Handles token expiration or authorization failures globally
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response ? error.response.status : null;
    const url = error.config ? error.config.url : "";

    // Ignore 401 on login and signup attempts so error messages reach the component
    const isAuthRoute =
      url.includes("/auth/login") || url.includes("/auth/signup");

    if (status === 401 && !isAuthRoute) {
      console.warn("🔒 Session expired or unauthorized. Clearing credentials.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Optional: Redirect to login if in browser environment
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
