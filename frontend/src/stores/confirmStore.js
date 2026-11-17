import { create } from "zustand";

/**
 * Promise-based confirmation dialog, rendered once by <ConfirmDialog /> in App.
 *
 *   const ok = await confirm({
 *     title: "Delete task?",
 *     message: "This cannot be undone.",
 *     confirmLabel: "Delete",
 *     tone: "danger", // "danger" | "default"
 *   });
 */
export const useConfirmStore = create((set, get) => ({
  request: null,

  open: (options) =>
    new Promise((resolve) => {
      // Only one dialog at a time: a new request cancels the previous one
      get().request?.resolve(false);
      set({ request: { tone: "danger", confirmLabel: "Confirm", cancelLabel: "Cancel", ...options, resolve } });
    }),

  close: (result) => {
    get().request?.resolve(result);
    set({ request: null });
  },
}));

export const confirm = (options) => useConfirmStore.getState().open(options);
