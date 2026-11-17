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
      {/* Left: Brand & Navigation */}
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

        {/* Navigation Tabs */}
        {currentOrg && (
          <nav className="flex items-center gap-1">
            <Link to="/" className={getNavLinkClass("/")}>
              Dashboard
            </Link>
            <Link to="/board" className={getNavLinkClass("/board")}>
              Board
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
        <ThemeToggle />

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
