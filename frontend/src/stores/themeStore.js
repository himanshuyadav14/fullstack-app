import { create } from "zustand";

const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem("teamflow_theme");
    if (saved === "light" || saved === "dark") return saved;
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    }
  } catch {
    // localStorage might be unavailable
  }
  return "dark";
};

const applyTheme = (theme) => {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
};

const initial = getInitialTheme();
applyTheme(initial);

export const useThemeStore = create((set, get) => ({
  theme: initial,
  toggleTheme: () => {
    const nextTheme = get().theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem("teamflow_theme", nextTheme);
    } catch {}
    applyTheme(nextTheme);
    set({ theme: nextTheme });
  },
  setTheme: (theme) => {
    try {
      localStorage.setItem("teamflow_theme", theme);
    } catch {}
    applyTheme(theme);
    set({ theme });
  },
}));
