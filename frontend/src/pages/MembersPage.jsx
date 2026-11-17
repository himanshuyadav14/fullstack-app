import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useOrgStore } from "../stores/orgStore";
import { useAuthStore } from "../stores/authStore";
import InviteMemberModal from "../components/modals/InviteMemberModal";
import CreateRoleModal from "../components/modals/CreateRoleModal";
import CustomSelect from "../components/common/CustomSelect";
import api from "../services/api";
import { ENDPOINTS } from "../services/urls";

const MembersPage = () => {
  const { currentOrg, currentRole, fetchMyOrgs } = useOrgStore();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState("members"); // "members" | "roles"
  const [members, setMembers] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingMemberId, setUpdatingMemberId] = useState(null);
  const [notification, setNotification] = useState("");
  const [search, setSearch] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

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
    try {
      await api.patch(
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

      toast.success(`Updated ${memberName}'s role to ${roleName.toUpperCase()}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update member role");
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
      toast.success(`Removed ${memberName} from workspace`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove member");
    }
  };

  const handleDeleteRole = async (roleId, roleName) => {
    if (
      !window.confirm(
        `Are you sure you want to delete custom role "${roleName.toUpperCase()}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await api.delete(ENDPOINTS.ORGANIZATIONS.DELETE_ROLE(currentOrg._id, roleId));
      setAvailableRoles((prev) => prev.filter((r) => r._id !== roleId));
      toast.success(`Custom role "${roleName.toUpperCase()}" deleted`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete role");
    }
  };

  const handleLeaveOrg = async () => {
    if (!window.confirm(`Are you sure you want to leave ${currentOrg.name}?`)) {
      return;
    }

    try {
      await api.post(ENDPOINTS.ORGANIZATIONS.LEAVE(currentOrg._id));
      toast.success("You have left the workspace.");
      fetchMyOrgs();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to leave organization");
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
          <h2 className="text-xl font-bold tracking-tight">Workspace Collaborators & Roles</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Manage members, custom roles, and fine-grained RBAC permissions in{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">
              {currentOrg?.name}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isOwnerOrAdmin && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingRole(null);
                  setShowCreateRoleModal(true);
                }}
                className="py-2 px-3.5 border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium rounded-lg text-sm transition-colors cursor-pointer"
                title="Create a new custom role with custom permissions"
              >
                + Create Role
              </button>

              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="py-2 px-4 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white font-medium rounded-lg text-sm transition-colors shadow-2xs cursor-pointer"
              >
                + Invite Member
              </button>
            </>
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

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "members"
              ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 shadow-2xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Team Members ({members.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("roles")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "roles"
              ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 shadow-2xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Roles & Permissions ({availableRoles.length})
        </button>
      </div>

      {/* TAB 1: MEMBERS LIST */}
      {activeTab === "members" && (
        <div className="space-y-4">
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
        </div>
      )}

      {/* TAB 2: ROLES & PERMISSIONS MATRIX */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {availableRoles.map((r) => {
              const isSystem = Boolean(r.isSystemRole);
              const perms = r.permissions || [];

              return (
                <div
                  key={r._id}
                  className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="text-base font-bold uppercase tracking-tight text-zinc-950 dark:text-zinc-50">
                          {r.name}
                        </h4>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            isSystem
                              ? "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          }`}
                        >
                          {isSystem ? "System Role" : "Custom Role"}
                        </span>
                        <span className="text-xs text-zinc-400 font-medium">
                          • {perms.length} {perms.length === 1 ? "permission" : "permissions"}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        {r.description || "Standard permissions profile for this workspace role."}
                      </p>
                    </div>

                    {/* Actions: Edit Permissions / Delete (Custom only) */}
                    <div className="flex items-center gap-2">
                      {!isSystem && isOwnerOrAdmin ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRole(r);
                              setShowCreateRoleModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 text-xs font-medium text-zinc-900 dark:text-zinc-100 transition-colors cursor-pointer"
                            title="Edit permissions for this role"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Edit Permissions</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRole(r._id, r.name)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                            title="Delete custom role"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 py-1 px-2.5 rounded bg-zinc-100/50 dark:bg-zinc-800/40">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span>System Protected</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Permissions Tag Cloud */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {perms.map((pKey) => (
                        <span
                          key={pKey}
                          className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60"
                        >
                          {pKey}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <InviteMemberModal
          orgId={currentOrg?._id}
          onClose={() => setShowInviteModal(false)}
          onMemberInvited={loadMembers}
        />
      )}

      {/* Create / Edit Custom Role Modal */}
      {showCreateRoleModal && (
        <CreateRoleModal
          orgId={currentOrg?._id}
          roleToEdit={editingRole}
          onClose={() => {
            setShowCreateRoleModal(false);
            setEditingRole(null);
          }}
          onRoleCreated={(newRole) => {
            loadRoles();
            toast.success(`Custom role "${newRole.name?.toUpperCase()}" created!`);
          }}
          onRoleUpdated={(updatedRole) => {
            loadRoles();
            loadMembers();
            toast.success(`Permissions for "${updatedRole.name?.toUpperCase()}" updated!`);
          }}
        />
      )}
    </div>
  );
};

export default MembersPage;
