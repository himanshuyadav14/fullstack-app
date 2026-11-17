import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Modal from "../common/Modal";
import CustomSelect from "../common/CustomSelect";
import MemberManager from "../common/MemberManager";
import api from "../../services/api";
import { ENDPOINTS } from "../../services/urls";
import { useOrgStore } from "../../stores/orgStore";
import { useAuthStore } from "../../stores/authStore";
import useOrgMembers from "../../hooks/useOrgMembers";
import { confirm } from "../../stores/confirmStore";

const input =
  "w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100";
const sectionLabel = "text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5";

/**
 * View and manage one team: details, lead, members, delete.
 * Managers = team:update permission or the team's lead (same rule as the backend).
 */
const TeamDetailModal = ({ orgId, teamId, onClose, onChanged, onDeleted }) => {
  const { can } = useOrgStore();
  const { user } = useAuthStore();
  const { members: orgMembers } = useOrgMembers(orgId);

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", description: "", leadId: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const applyTeam = (t) => {
    setTeam(t);
    setForm({ name: t.name || "", description: t.description || "", leadId: t.lead?._id || "" });
  };

  const reload = async () => {
    const res = await api.get(ENDPOINTS.TEAMS.GET_BY_ID(orgId, teamId));
    applyTeam(res.data.data);
    return res.data.data;
  };

  useEffect(() => {
    setLoading(true);
    reload()
      .catch((err) => {
        toast.error(err.response?.data?.message || "Failed to load team");
        onClose();
      })
      .finally(() => setLoading(false));
  }, [orgId, teamId]);

  const isLead = team?.lead?._id === user?._id;
  const canManage = can("team:update") || isLead;
  const canDelete = can("team:delete");

  const dirty =
    team &&
    (form.name.trim() !== team.name ||
      form.description.trim() !== (team.description || "") ||
      form.leadId !== (team.lead?._id || ""));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!dirty || !form.name.trim()) return;
    setSaving(true);
    try {
      await api.patch(ENDPOINTS.TEAMS.GET_BY_ID(orgId, teamId), {
        name: form.name.trim(),
        description: form.description.trim(),
        leadId: form.leadId || null,
      });
      const updated = await reload();
      onChanged?.(updated);
      toast.success("Team updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update team");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      await api.post(ENDPOINTS.TEAMS.ADD_MEMBERS(orgId, teamId), { userIds: [userId] });
      const updated = await reload();
      onChanged?.(updated);
      toast.success("Member added");
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add member");
      return false;
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await api.delete(ENDPOINTS.TEAMS.REMOVE_MEMBER(orgId, teamId, userId));
      const updated = await reload();
      onChanged?.(updated);
      toast.success(userId === user?._id ? "You left the team" : "Member removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove member");
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Delete team "${team.name}"?`,
      message: "Members stay in the workspace. This cannot be undone.",
      confirmLabel: "Delete Team",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete(ENDPOINTS.TEAMS.GET_BY_ID(orgId, teamId));
      toast.success(`Team "${team.name}" deleted`);
      onDeleted?.(teamId);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete team");
      setDeleting(false);
    }
  };

  return (
    <Modal title={team ? team.name : "Team"} onClose={onClose} maxWidth="max-w-xl">
      {loading || !team ? (
        <div className="py-10 text-center text-sm text-zinc-500">Loading team...</div>
      ) : (
        <div className="space-y-5 text-sm">
          {canManage ? (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <div className={sectionLabel}>Name</div>
                <input
                  className={input}
                  value={form.name}
                  maxLength={100}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <div className={sectionLabel}>Description</div>
                <textarea
                  className={`${input} min-h-20`}
                  value={form.description}
                  maxLength={500}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <div className={sectionLabel}>Team lead</div>
                <CustomSelect
                  value={form.leadId}
                  onChange={(v) => setForm((f) => ({ ...f, leadId: v }))}
                  options={[
                    { value: "", label: "No lead" },
                    ...orgMembers.map((u) => ({ value: u._id, label: u.name, avatar: u.name?.charAt(0) })),
                  ]}
                />
                <p className="text-[11px] text-zinc-400 mt-1">The lead is added to the team automatically.</p>
              </div>
              <button
                type="submit"
                disabled={!dirty || !form.name.trim() || saving}
                className="py-2 px-4 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white font-medium rounded-lg text-xs disabled:opacity-40 cursor-pointer"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          ) : (
            <div className="space-y-1">
              <p className="text-zinc-600 dark:text-zinc-300">{team.description || "No description provided."}</p>
              <p className="text-xs text-zinc-500">
                Lead: <strong className="text-zinc-800 dark:text-zinc-200">{team.lead?.name || "None"}</strong>
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className={sectionLabel}>Members ({team.members?.length || 0})</div>
            <MemberManager
              members={team.members || []}
              leadId={team.lead?._id}
              candidates={orgMembers}
              canManage={canManage}
              currentUserId={user?._id}
              onAdd={handleAddMember}
              onRemove={handleRemoveMember}
              emptyText="No one is in this team yet."
            />
          </div>

          {canDelete && (
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="text-xs text-red-500 hover:text-red-700 hover:underline cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete this team"}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default TeamDetailModal;
