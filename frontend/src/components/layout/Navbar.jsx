import { Link, useLocation } from "react-router-dom";
import OrbitLogo from "../common/OrbitLogo";
import { useAuthStore } from "../../stores/authStore";
import { useOrgStore } from "../../stores/orgStore";
import { useNotificationStore } from "../../stores/notificationStore";
import { useThemeStore } from "../../stores/themeStore";

const Navbar = ({ onOpenCreateOrg }) => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { userOrgs, currentOrg, currentRole, setCurrentOrg, clearOrg } = useOrgStore();
  const { unreadCount } = useNotificationStore();
  const { theme, toggleTheme } = useThemeStore();

  const getNavLinkClass = (path) => {
    const isActive = location.pathname === path;
    return `px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs"
        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60"
    }`;
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-3 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100">
      {/* Left: Brand & Navigation */}
      <div className="flex items-center gap-6">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-zinc-900 dark:text-white"
        >
          <OrbitLogo className="w-6 h-6" />
          <span className="font-bold tracking-tight">
            OrbitHQ
          </span>
        </Link>

        {/* Workspace Switcher */}
        {userOrgs.length > 0 && (
          <div className="flex items-center gap-2">
            {currentOrg?.logo ? (
              <img
                src={currentOrg.logo}
                alt={currentOrg.name}
                className="w-6 h-6 rounded-md object-cover border border-zinc-200 dark:border-zinc-700 shadow-2xs"
              />
            ) : (
              <div className="w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold text-[11px] flex items-center justify-center uppercase shadow-2xs">
                {currentOrg?.name?.charAt(0) || "W"}
              </div>
            )}

            <select
              value={currentOrg?._id || ""}
              onChange={(e) => {
                const selected = userOrgs.find((o) => o._id === e.target.value);
                if (selected) setCurrentOrg(selected);
              }}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 cursor-pointer"
            >
              {userOrgs.map((org) => (
                <option key={org._id} value={org._id}>
                  {org.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onOpenCreateOrg}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors cursor-pointer"
              title="Create another organization"
            >
              + New
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        {currentOrg && (
          <nav className="flex items-center gap-1">
            <Link to="/" className={getNavLinkClass("/")}>
              Dashboard
            </Link>
            <Link to="/kanban" className={getNavLinkClass("/kanban")}>
              Kanban
            </Link>
            <Link to="/members" className={getNavLinkClass("/members")}>
              Members
            </Link>
            <Link to="/teams" className={getNavLinkClass("/teams")}>
              Teams
            </Link>
            <Link to="/notifications" className={getNavLinkClass("/notifications")}>
              Alerts {unreadCount > 0 && `(${unreadCount})`}
            </Link>
          </nav>
        )}
      </div>

      {/* Right: User Profile, Theme Switcher & Logout */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/80 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-2xs cursor-pointer"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? "Light" : "Dark"}
        </button>

        {/* User Badge */}
        <div className="text-right text-xs">
          <div className="font-semibold">{user?.name}</div>
          {currentOrg && currentRole ? (
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Role: <span className="text-zinc-900 dark:text-zinc-100 font-medium capitalize">{currentRole}</span>
            </div>
          ) : (
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500">
              No Workspace
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={() => {
            clearOrg();
            logout();
          }}
          className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-medium transition-colors cursor-pointer"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;
