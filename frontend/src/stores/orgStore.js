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

const savedOrg = getSavedOrg();

export const useOrgStore = create((set, get) => ({
  userOrgs: [],
  currentOrg: savedOrg,
  currentRole: savedOrg?.role?.name || savedOrg?.role || null,
  loading: false,
  initialLoaded: false,
  error: null,

  /**
   * Fetch all organizations the logged-in user belongs to
   */
  fetchMyOrgs: async () => {
    set({ loading: true, error: null });
    try {
      const res = await api.get(ENDPOINTS.ORGANIZATIONS.MY);
      const rawData = res.data.data || res.data.organizations || [];

      // Flatten membership objects so organization properties sit at top-level
      const orgs = rawData.map((item) => {
        if (item.organization && item.organization._id) {
          return {
            ...item.organization,
            role: item.role,
            membershipId: item.membershipId || item._id,
          };
        }
        return item;
      });

      set({ userOrgs: orgs, loading: false, initialLoaded: true });

      // If user has zero organizations, clear any stale selected org
      if (orgs.length === 0) {
        get().setCurrentOrg(null);
        return { success: true, data: [] };
      }

      // If no currentOrg is selected, default to the first organization
      const current = get().currentOrg;
      if (!current) {
        get().setCurrentOrg(orgs[0]);
      } else {
        // Sync currentOrg with fresh data
        const freshCurrent = orgs.find((o) => o._id === current._id);
        if (freshCurrent) {
          get().setCurrentOrg(freshCurrent);
        } else {
          get().setCurrentOrg(orgs[0]);
        }
      }

      return { success: true, data: orgs };
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to load organizations.";
      set({ loading: false, error: message, initialLoaded: true });
      return { success: false, message };
    }
  },

  /**
   * Create a new organization
   */
  createOrg: async (payload) => {
    set({ loading: true, error: null });
    try {
      const orgData = typeof payload === "string" ? { name: payload } : payload;
      const res = await api.post(ENDPOINTS.ORGANIZATIONS.CREATE, orgData);

      const created =
        res.data.data?.organization || res.data.data || res.data.organization;
      await get().fetchMyOrgs();
      if (created) {
        const match = get().userOrgs.find((o) => o._id === created._id);
        get().setCurrentOrg(match || created);
      }

      set({ loading: false });
      return { success: true, data: created };
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
      initialLoaded: false,
    });
  },
}));
