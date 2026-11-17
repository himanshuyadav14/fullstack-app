import { create } from "zustand";
import api from "../services/api";
import { ENDPOINTS } from "../services/urls";

const getSavedUser = () => {
  try {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export const useAuthStore = create((set, get) => ({
  user: getSavedUser(),
  token: localStorage.getItem("token") || null,
  isAuthenticated: !!localStorage.getItem("token"),
  loading: false,
  error: null,

  /**
   * User Signup
   */
  signup: async ({ name, email, password }) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post(ENDPOINTS.AUTH.SIGNUP, {
        name,
        email,
        password,
      });

      set({ loading: false });
      return {
        success: true,
        message: res.data.message || "Registration successful! Verification code sent to email.",
        email: res.data.email || email,
      };
    } catch (err) {
      const message =
        err.response?.data?.message || "Registration failed. Please try again.";
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  /**
   * Verify 6-digit OTP
   */
  verifyOtp: async ({ email, otp }) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post(ENDPOINTS.AUTH.VERIFY_EMAIL, { email, otp });
      const { token, user } = res.data;

      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        set({
          user,
          token,
          isAuthenticated: true,
          loading: false,
          error: null,
        });
      }

      return {
        success: true,
        message: res.data.message || "Email verified successfully!",
        user,
      };
    } catch (err) {
      const message =
        err.response?.data?.message || "Invalid or expired verification code.";
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  /**
   * Resend 6-digit OTP
   */
  resendOtp: async (email) => {
    try {
      const res = await api.post(ENDPOINTS.AUTH.RESEND_VERIFICATION, { email });
      return {
        success: true,
        message: res.data.message || "New verification code sent to your email.",
      };
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to resend verification code.";
      return { success: false, message };
    }
  },

  /**
   * User Login
   */
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post(ENDPOINTS.AUTH.LOGIN, { email, password });
      const { token, user } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      set({
        user,
        token,
        isAuthenticated: true,
        loading: false,
        error: null,
      });

      return { success: true, user };
    } catch (err) {
      const message =
        err.response?.data?.message || "Invalid email or password.";
      set({ loading: false, error: message });
      return {
        success: false,
        message,
        code: err.response?.data?.code,
        email: err.response?.data?.email,
      };
    }
  },

  /**
   * Fetch current user profile from backend (validates session on app start)
   */
  fetchMe: async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    try {
      const res = await api.get(ENDPOINTS.AUTH.GET_ME);
      const user = res.data.user || res.data.data;
      localStorage.setItem("user", JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } catch (err) {
      // If token is invalid or expired, clear session
      if (err.response?.status === 401) {
        get().logout();
      }
    }
  },

  /**
   * Update profile fields locally
   */
  updateUser: (updatedFields) => {
    const currentUser = get().user;
    const newUser = { ...currentUser, ...updatedFields };
    localStorage.setItem("user", JSON.stringify(newUser));
    set({ user: newUser });
  },

  /**
   * Logout user
   */
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // Preserve selectedOrgId and currentOrg across sessions so the user returns to their selected workspace
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },
}));
