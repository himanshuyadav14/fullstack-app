import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import OrbitLogo from "../common/OrbitLogo";
import ThemeToggle from "../common/ThemeToggle";
import CustomSelect from "../common/CustomSelect";
import { useAuthStore } from "../../stores/authStore";
import { useOrgStore } from "../../stores/orgStore";
import { useNotificationStore } from "../../stores/notificationStore";

const Navbar = ({ onOpenCreateOrg }) => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { userOrgs, currentOrg, currentRole, setCurrentOrg, clearOrg } = useOrgStore();
  const { unreadCount } = useNotificationStore();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close user menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Close user menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isUserMenuOpen) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isUserMenuOpen]);

  const getNavLinkClass = (path) => {
    const isActive =
      path === "/board"
        ? location.pathname === "/board" || location.pathname === "/kanban"
        : location.pathname === path;
    return `px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs"
        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
    }`;
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
      {/* Left: Brand, Workspace Switcher & Primary Nav */}
      <div className="flex items-center gap-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-base font-bold tracking-tight text-zinc-900 dark:text-white"
        >
          <div className="w-7 h-7 rounded-lg bg-zinc-950 dark:bg-zinc-800 border border-zinc-800 dark:border-zinc-700 flex items-center justify-center text-zinc-100 shadow-2xs">
            <OrbitLogo className="w-4 h-4" />
          </div>
          <span className="font-bold tracking-tight">
            OrbitHQ
          </span>
        </Link>

        {/* Workspace Switcher */}
        {userOrgs.length > 0 && (
          <div className="flex items-center gap-2">
            <CustomSelect
              size="sm"
              value={currentOrg?._id || ""}
              onChange={(orgId) => {
                const selected = userOrgs.find((o) => o._id === orgId);
                if (selected) setCurrentOrg(selected);
              }}
              options={userOrgs.map((org) => ({
                value: org._id,
                label: org.name,
                avatar: org.logo || org.name?.charAt(0) || "W",
                isAvatarUrl: Boolean(org.logo),
              }))}
              headerTitle="Workspaces"
              footerAction={{
                label: "Create New Workspace",
                onClick: onOpenCreateOrg,
              }}
              className="min-w-[170px]"
              buttonClassName="bg-zinc-50/80 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              menuClassName="min-w-[230px]"
            />

            <button
              type="button"
              onClick={onOpenCreateOrg}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors cursor-pointer shrink-0"
              title="Create another organization"
            >
              + New
            </button>
          </div>
        )}

        {/* Primary Navigation: Daily Core Work */}
        {currentOrg && (
          <nav className="flex items-center gap-1">
            <Link to="/" className={getNavLinkClass("/")}>
              Dashboard
            </Link>
            <Link to="/board" className={getNavLinkClass("/board")}>
              Board
            </Link>
          </nav>
        )}
      </div>

      {/* Right: Notifications Bell, Theme Switcher & User Profile Popover */}
      <div className="flex items-center gap-2.5">
        {/* Notifications / Alerts Bell Icon */}
        <Link
          to="/notifications"
          className={`relative p-2 rounded-lg text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors cursor-pointer ${
            location.pathname === "/notifications"
              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
              : ""
          }`}
          title="Alerts & Notifications"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-900 dark:bg-zinc-100 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-950 dark:bg-zinc-100"></span>
            </span>
          )}
        </Link>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Profile Popover (Standard Modern SaaS Pattern) */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/60 dark:bg-zinc-900/60 transition-colors cursor-pointer"
            title="User account & workspace settings"
          >
            <div className="w-6 h-6 rounded-md bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold text-[11px] flex items-center justify-center uppercase shadow-2xs">
              {user?.name?.charAt(0) || "U"}
            </div>
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 max-w-[110px] truncate">
              {user?.name}
            </span>
            <svg
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                isUserMenuOpen ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Popover Dropdown */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-60 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl shadow-black/10 dark:shadow-black/50 z-50 animate-in fade-in zoom-in-95 duration-100">
              {/* User Header */}
              <div className="px-3.5 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                <div className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                  {user?.name}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mb-1.5">
                  {user?.email}
                </div>
                {currentRole && (
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    Role: {currentRole}
                  </span>
                )}
              </div>

              {/* Workspace Navigation Links */}
              <div className="py-1">
                <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Workspace
                </div>
                <Link
                  to="/members"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                >
                  <svg
                    className="w-4 h-4 text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  <span>Members & Roles</span>
                </Link>

                <Link
                  to="/teams"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                >
                  <svg
                    className="w-4 h-4 text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span>Teams & Squads</span>
                </Link>
              </div>

              {/* Divider */}
              <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

              {/* Logout Button */}
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false);
                  clearOrg();
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer text-left"
              >
                <svg
                  className="w-4 h-4 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
