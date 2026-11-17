import { useState, useEffect } from "react";
import { useOrgStore } from "../stores/orgStore";
import { useAuthStore } from "../stores/authStore";
import InviteMemberModal from "../components/modals/InviteMemberModal";
import api from "../services/api";
import { ENDPOINTS } from "../services/urls";

const MembersPage = () => {
  const { currentOrg, currentRole, fetchMyOrgs } = useOrgStore();
  const { user } = useAuthStore();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    loadMembers();
  }, [currentOrg?._id]);

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) {
      return;
    }

    try {
      await api.delete(ENDPOINTS.ORGANIZATIONS.REMOVE_MEMBER(currentOrg._id, memberId));
      setMembers((prev) => prev.filter((m) => m._id !== memberId));
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

  const getRoleBadge = (roleName) => {
    switch (roleName?.toLowerCase()) {
      case "owner":
        return "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300";
      case "admin":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Workspace Members</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            Manage collaborators, roles, and permissions in{" "}
            <strong className="text-blue-600 dark:text-blue-400">
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

      {/* Search Input */}
      <div>
        <input
          type="text"
          placeholder="Search members by name, email, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
        />
      </div>

      {/* Members List */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">
            Loading team members...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400 dark:text-zinc-500">
            No matching members found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
            {filteredMembers.map((m) => {
              const isSelf = m.user?._id === user?._id;
              const isTargetOwner = m.role?.name?.toLowerCase() === "owner";

              return (
                <div
                  key={m._id}
                  className="flex flex-wrap items-center justify-between p-4 hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold flex items-center justify-center text-sm shadow-2xs">
                      {m.user?.name?.slice(0, 2).toUpperCase() || "U"}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                        {m.user?.name}
                        {isSelf && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400">
                        {m.user?.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${getRoleBadge(
                        m.role?.name,
                      )}`}
                    >
                      {m.role?.name || "Member"}
                    </span>

                    {/* Remove Action */}
                    {isOwnerOrAdmin && !isTargetOwner && !isSelf && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m._id, m.user?.name)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
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
