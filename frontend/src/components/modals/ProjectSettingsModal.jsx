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

const STATUS_OPTIONS = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];
const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"].map((p) => ({
  value: p,
  label: p.charAt(0).toUpperCase() + p.slice(1),
}));

const toDateInput = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");

const formFromProject = (p) => ({
  name: p.name || "",
  description: p.description || "",
  status: p.status || "planning",
  priority: p.priority || "medium",
  startDate: toDateInput(p.startDate),
  dueDate: toDateInput(p.dueDate),
  teamId: p.team?._id || p.team || "",
  leadId: p.lead?._id || "",
});

/**
 * View and manage one project: details, team, lead, members, delete.
 * Managers = project:update permission or the project's lead (backend rule).
 */
const ProjectSettingsModal = ({ orgId, projectId, onClose, onChanged, onDeleted }) => {
  const { can } = useOrgStore();
  const { user } = useAuthStore();
  const { members: orgMembers } = useOrgMembers(orgId);

  const [project, setProject] = useState(null);
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const reload = async () => {
    const res = await api.get(ENDPOINTS.PROJECTS.GET_BY_ID(orgId, projectId));
    setProject(res.data.data);
    setForm(formFromProject(res.data.data));
    return res.data.data;
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([reload(), api.get(ENDPOINTS.TEAMS.LIST_CREATE(orgId), { params: { limit: 50 } })])
      .then(([, teamsRes]) => setTeams(teamsRes.data.data || []))
      .catch((err) => {
        toast.error(err.response?.data?.message || "Failed to load project");
        onClose();
      })
      .finally(() => setLoading(false));
  }, [orgId, projectId]);

  const isLead = project?.lead?._id === user?._id;
  const canManage = can("project:update") || isLead;
  const canDelete = can("project:delete");

  const original = project ? formFromProject(project) : null;
  const changedFields = form && original
    ? Object.keys(form).filter((k) => (k === "name" || k === "description" ? form[k].trim() : form[k]) !== original[k])
    : [];

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (changedFields.length === 0 || !form.name.trim()) return;

    if (form.startDate && form.dueDate && form.dueDate < form.startDate) {
      toast.error("Due date cannot be before the start date");
      return;
    }

    // Send only what changed; dates as ISO or null to clear
    const payload = {};
    for (const key of changedFields) {
      if (key === "startDate" || key === "dueDate") {
        payload[key] = form[key] ? new Date(form[key]).toISOString() : null;
      } else if (key === "leadId") {
        payload.leadId = form.leadId || null;
      } else if (key === "name" || key === "description") {
        payload[key] = form[key].trim();
      } else {
        payload[key] = form[key];
      }
    }

    setSaving(true);
    try {
      await api.patch(ENDPOINTS.PROJECTS.GET_BY_ID(orgId, projectId), payload);
      const updated = await reload();
      onChanged?.(updated);
      toast.success("Project updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update project");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (userId) => {
    try {
      await api.post(ENDPOINTS.PROJECTS.ADD_MEMBERS(orgId, projectId), { userIds: [userId] });
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
      await api.delete(ENDPOINTS.PROJECTS.REMOVE_MEMBER(orgId, projectId, userId));
      const updated = await reload();
      onChanged?.(updated);
      toast.success(userId === user?._id ? "You left the project" : "Member removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove member");
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Delete project "${project.name}"?`,
      message: `All tasks and comments in ${project.key} will be deleted too. This cannot be undone.`,
      confirmLabel: "Delete Project",
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.delete(ENDPOINTS.PROJECTS.GET_BY_ID(orgId, projectId));
      toast.success(`Project "${project.name}" deleted`);
      onDeleted?.(projectId);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete project");
      setDeleting(false);
    }
  };

  return (
    <Modal
      title={project ? `${project.name} · ${project.key}` : "Project"}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      {loading || !project || !form ? (
        <div className="py-10 text-center text-sm text-zinc-500">Loading project...</div>
      ) : (
        <div className="space-y-5 text-sm">
          {canManage ? (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <div className={sectionLabel}>Name</div>
                <input className={input} value={form.name} maxLength={100} onChange={(e) => set("name")(e.target.value)} />
              </div>
              <div>
                <div className={sectionLabel}>Description</div>
                <textarea
                  className={`${input} min-h-20`}
                  value={form.description}
                  maxLength={1000}
                  onChange={(e) => set("description")(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className={sectionLabel}>Status</div>
                  <CustomSelect value={form.status} onChange={set("status")} options={STATUS_OPTIONS} />
                </div>
                <div>
                  <div className={sectionLabel}>Priority</div>
                  <CustomSelect value={form.priority} onChange={set("priority")} options={PRIORITY_OPTIONS} />
                </div>
                <div>
                  <div className={sectionLabel}>Start date</div>
                  <input type="date" className={input} value={form.startDate} onChange={(e) => set("startDate")(e.target.value)} />
                </div>
                <div>
                  <div className={sectionLabel}>Due date</div>
                  <input type="date" className={input} value={form.dueDate} onChange={(e) => set("dueDate")(e.target.value)} />
                </div>
                <div>
                  <div className={sectionLabel}>Team</div>
                  <CustomSelect
                    value={form.teamId}
                    onChange={set("teamId")}
                    options={teams.map((t) => ({ value: t._id, label: t.name }))}
                  />
                </div>
                <div>
                  <div className={sectionLabel}>Project lead</div>
                  <CustomSelect
                    value={form.leadId}
                    onChange={set("leadId")}
                    options={[
                      { value: "", label: "No lead" },
                      ...orgMembers.map((u) => ({ value: u._id, label: u.name, avatar: u.name?.charAt(0) })),
                    ]}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={changedFields.length === 0 || !form.name.trim() || saving}
                className="py-2 px-4 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white font-medium rounded-lg text-xs disabled:opacity-40 cursor-pointer"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          ) : (
            <div className="space-y-2">
              <p className="text-zinc-600 dark:text-zinc-300">{project.description || "No description provided."}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                <span>Status: <strong className="capitalize">{project.status?.replace("_", " ")}</strong></span>
                <span>Priority: <strong className="capitalize">{project.priority}</strong></span>
                <span>Team: <strong>{project.team?.name || "—"}</strong></span>
                <span>Lead: <strong>{project.lead?.name || "None"}</strong></span>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className={sectionLabel}>Members ({project.members?.length || 0})</div>
            <MemberManager
              members={project.members || []}
              leadId={project.lead?._id}
              candidates={orgMembers}
              canManage={canManage}
              currentUserId={user?._id}
              onAdd={handleAddMember}
              onRemove={handleRemoveMember}
              emptyText="No one is on this project yet."
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
                {deleting ? "Deleting..." : "Delete this project"}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ProjectSettingsModal;
