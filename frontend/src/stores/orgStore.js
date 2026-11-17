import { create } from "zustand";
import api from "../services/api";
import { ENDPOINTS } from "../services/urls";

const getSavedOrg = () => {
  try {
    const saved = localStorage.getItem("currentOrg");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export const useOrgStore = create((set, get) => ({
  userOrgs: [],
  currentOrg: getSavedOrg(),
  currentRole: null,
  loading: false,
  error: null,

  /**
   * Fetch all organizations the logged-in user belongs to
   */
  fetchMyOrgs: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(ENDPOINTS.ORGANIZATIONS.MY);
      const orgs = res.data.data || res.data.organizations || [];

      set({ userOrgs: orgs, loading: false });

      // If no currentOrg is selected, default to the first organization
      const current = get().currentOrg;
      if (!current && orgs.length > 0) {
        get().setCurrentOrg(orgs[0]);
      } else if (current) {
        // Sync currentOrg with fresh data
        const freshCurrent = orgs.find((o) => o._id === current._id);
        if (freshCurrent) {
          get().setCurrentOrg(freshCurrent);
        }
      }

      return { success: true, data: orgs };
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to load organizations.";
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  /**
   * Create a new organization
   */
  createOrg: async ({ name, description }) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post(ENDPOINTS.ORGANIZATIONS.CREATE, {
        name,
        description,
      });

      const newOrg = res.data.data || res.data.organization;
      await get().fetchMyOrgs();
      if (newOrg) {
        get().setCurrentOrg(newOrg);
      }

      set({ loading: false });
      return { success: true, data: newOrg };
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to create organization.";
      set({ loading: false, error: message });
      return { success: false, message };
    }
  },

  /**
   * Set active organization / workspace
   */
  setCurrentOrg: (org) => {
    if (!org) {
      localStorage.removeItem("currentOrg");
      set({ currentOrg: null, currentRole: null });
      return;
    }

    localStorage.setItem("currentOrg", JSON.stringify(org));
    set({
      currentOrg: org,
      currentRole: org.role?.name || org.role || "member",
    });
  },

  /**
   * Reset store (used on logout)
   */
  clearOrg: () => {
    localStorage.removeItem("currentOrg");
    set({
      userOrgs: [],
      currentOrg: null,
      currentRole: null,
      error: null,
    });
  },
}));
