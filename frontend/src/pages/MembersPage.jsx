import { useState, useEffect } from "react";
import { useOrgStore } from "../stores/orgStore";
import { useAuthStore } from "../stores/authStore";
import InviteMemberModal from "../components/modals/InviteMemberModal";
import CustomSelect from "../components/common/CustomSelect";
import api from "../services/api";
import { ENDPOINTS } from "../services/urls";

const MembersPage = () => {
  const { currentOrg, currentRole, fetchMyOrgs } = useOrgStore();
  const { user } = useAuthStore();

  const [members, setMembers] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState(null);
  const [notification, setNotification] = useState("");
  const [search, setSearch] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);

  const loadMembers = async () => {
    if (!currentOrg?._id) return;
    setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.ORGANIZATIONS.MEMBERS(currentOrg._id), {
        params: { search: search.trim() || undefined, limit: 50 },
      });
      setMembers(res.data.data || []);
    } catch (err) {
      console.error("Failed to load members:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    if (!currentOrg?._id) return;
    try {
      const res = await api.get(ENDPOINTS.ORGANIZATIONS.ROLES(currentOrg._id));
      setAvailableRoles(res.data.data || []);
    } catch (err) {
      console.error("Failed to load roles:", err);
    }
  };

  useEffect(() => {
    loadMembers();
    loadRoles();
  }, [currentOrg?._id]);

  const handleRoleChange = async (memberId, newRoleId, memberName) => {
    setUpdatingMemberId(memberId);
    setNotification("");
    try {
      const res = await api.patch(
        ENDPOINTS.ORGANIZATIONS.UPDATE_MEMBER_ROLE(currentOrg._id, memberId),
        { roleId: newRoleId }
      );

      const targetRole = availableRoles.find((r) => r._id === newRoleId);
      const roleName = targetRole?.name || "Updated";

      // Update members state locally
      setMembers((prev) =>
        prev.map((m) =>
          m._id === memberId
            ? {
                ...m,
                role: {
                  ...m.role,
                  _id: newRoleId,
                  name: targetRole?.name || m.role?.name,
                  description: targetRole?.description || m.role?.description,
                },
              }
            : m
        )
      );

      setNotification(`Successfully updated ${memberName}'s role to ${roleName.toUpperCase()}`);
      setTimeout(() => setNotification(""), 4000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update member role");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) {
      return;
    }

    try {
      await api.delete(ENDPOINTS.ORGANIZATIONS.REMOVE_MEMBER(currentOrg._id, memberId));
      setMembers((prev) => prev.filter((m) => m._id !== memberId));
      setNotification(`Removed ${memberName} from workspace`);
      setTimeout(() => setNotification(""), 3000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove member");
    }
  };

  const handleLeaveOrg = async () => {
    if (!window.confirm(`Are you sure you want to leave ${currentOrg.name}?`)) {
      return;
    }

    try {
      await api.post(ENDPOINTS.ORGANIZATIONS.LEAVE(currentOrg._id));
      alert("You have left the organization.");
      fetchMyOrgs();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to leave organization");
    }
  };

  const isOwnerOrAdmin = currentRole === "owner" || currentRole === "admin";

  const filteredMembers = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.user?.name?.toLowerCase().includes(q) ||
      m.user?.email?.toLowerCase().includes(q) ||
      m.role?.name?.toLowerCase().includes(q)
    );
  });

  const getRoleBadgeClass = (roleName) => {
    switch (roleName?.toLowerCase()) {
      case "owner":
        return "bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 border border-zinc-800 dark:border-zinc-200";
      case "admin":
        return "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 font-medium";
      case "manager":
        return "bg-zinc-100 text-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-300";
      default:
        return "bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Workspace Members</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Manage collaborators, roles, and RBAC permissions in{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">
              {currentOrg?.name}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isOwnerOrAdmin && (
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="py-2 px-4 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white font-medium rounded-lg text-sm transition-colors shadow-2xs cursor-pointer"
            >
              + Invite Member
            </button>
          )}

          {currentRole !== "owner" && (
            <button
              type="button"
              onClick={handleLeaveOrg}
              className="py-2 px-3.5 border border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              Leave Workspace
            </button>
          )}
        </div>
      </div>

      {/* Role Update Toast / Alert */}
      {notification && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 text-xs font-medium shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification("")}
            className="text-zinc-400 hover:text-zinc-100 dark:hover:text-zinc-900 text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search Input */}
      <div>
        <input
          type="text"
          placeholder="Search members by name, email, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 shadow-2xs"
        />
      </div>

      {/* Members List */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-500">
            Loading team members...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400 dark:text-zinc-500">
            No matching members found.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {filteredMembers.map((m) => {
              const isSelf = m.user?._id === user?._id;
              const targetRoleName = m.role?.name?.toLowerCase() || "member";
              const isTargetOwner = targetRoleName === "owner";
              const isTargetAdmin = targetRoleName === "admin";

              // Privilege checks for changing role
              const canChangeRole =
                !isSelf &&
                !isTargetOwner &&
                (currentRole === "owner" || (currentRole === "admin" && !isTargetAdmin));

              // Available options based on requester authority
              const allowedRoleOptions = availableRoles
                .filter((r) => {
                  const rName = r.name?.toLowerCase();
                  if (rName === "owner") return false; // cannot assign owner
                  if (currentRole === "admin" && rName === "admin") return false; // admins cannot assign admin
                  return true;
                })
                .map((r) => ({
                  value: r._id,
                  label: r.name.charAt(0).toUpperCase() + r.name.slice(1),
                }));

              return (
                <div
                  key={m._id}
                  className="flex flex-wrap items-center justify-between p-4 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold flex items-center justify-center text-sm shadow-2xs">
                      {m.user?.name?.slice(0, 2).toUpperCase() || "U"}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                        {m.user?.name}
                        {isSelf && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {m.user?.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Inline Role Changer (When allowed) or Role Badge */}
                    {canChangeRole ? (
                      <div className="flex items-center gap-2">
                        <CustomSelect
                          size="sm"
                          value={m.role?._id}
                          disabled={updatingMemberId === m._id}
                          onChange={(newRoleId) =>
                            handleRoleChange(m._id, newRoleId, m.user?.name)
                          }
                          options={allowedRoleOptions}
                          className="min-w-[130px]"
                        />
                      </div>
                    ) : (
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${getRoleBadgeClass(
                          m.role?.name
                        )}`}
                      >
                        {m.role?.name || "Member"}
                      </span>
                    )}

                    {/* Remove Action */}
                    {isOwnerOrAdmin && !isTargetOwner && !isSelf && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m._id, m.user?.name)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="Remove from organization"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <InviteMemberModal
          orgId={currentOrg?._id}
          onClose={() => setShowInviteModal(false)}
          onMemberInvited={loadMembers}
        />
      )}
    </div>
  );
};

export default MembersPage;
