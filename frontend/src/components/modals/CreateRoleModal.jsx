import { useState } from "react";
import Modal from "../common/Modal";
import api from "../../services/api";
import { ENDPOINTS } from "../../services/urls";

const PERMISSION_GROUPS = [
  {
    category: "Tasks",
    description: "Manage issues, assignments, and Kanban workflows",
    permissions: [
      { key: "task:read", label: "View Tasks" },
      { key: "task:create", label: "Create Tasks" },
      { key: "task:update", label: "Edit & Move Tasks" },
      { key: "task:assign", label: "Assign Tasks" },
      { key: "task:delete", label: "Delete Tasks" },
    ],
  },
  {
    category: "Projects",
    description: "Manage projects and workspace repositories",
    permissions: [
      { key: "project:read", label: "View Projects" },
      { key: "project:create", label: "Create Projects" },
      { key: "project:update", label: "Edit Projects" },
      { key: "project:delete", label: "Delete Projects" },
    ],
  },
  {
    category: "Comments & Discussions",
    description: "Participate in task discussions and threads",
    permissions: [
      { key: "comment:read", label: "Read Comments" },
      { key: "comment:create", label: "Post Comments" },
      { key: "comment:update", label: "Edit Comments" },
      { key: "comment:delete", label: "Delete Comments" },
    ],
  },
  {
    category: "Teams",
    description: "Manage internal groups and teams",
    permissions: [
      { key: "team:read", label: "View Teams" },
      { key: "team:create", label: "Create Teams" },
      { key: "team:update", label: "Edit Teams" },
      { key: "team:delete", label: "Delete Teams" },
    ],
  },
  {
    category: "Members & Invitations",
    description: "Collaborator roster and invite links",
    permissions: [
      { key: "member:read", label: "View Members List" },
      { key: "member:update", label: "Change Member Roles" },
      { key: "member:remove", label: "Remove Members" },
      { key: "invitation:read", label: "View Invitations" },
      { key: "invitation:create", label: "Invite Collaborators" },
      { key: "invitation:revoke", label: "Revoke Invitations" },
    ],
  },
  {
    category: "Organization",
    description: "Workspace-level settings",
    permissions: [
      { key: "organization:read", label: "View Workspace Profile" },
      { key: "organization:update", label: "Update Workspace Settings" },
    ],
  },
];

const CreateRoleModal = ({
  orgId,
  roleToEdit = null,
  onClose,
  onRoleCreated,
  onRoleUpdated,
}) => {
  const isEditing = Boolean(roleToEdit);
  const [name, setName] = useState(roleToEdit?.name || "");
  const [description, setDescription] = useState(roleToEdit?.description || "");
  const [selectedPermissions, setSelectedPermissions] = useState(
    roleToEdit?.permissions || [
      "task:read",
      "task:create",
      "task:update",
      "comment:read",
      "comment:create",
      "project:read",
    ]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const togglePermission = (key) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const toggleGroup = (groupPermissions) => {
    const keys = groupPermissions.map((p) => p.key);
    const allSelected = keys.every((k) => selectedPermissions.includes(k));

    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !keys.includes(p)));
    } else {
      setSelectedPermissions((prev) => [...new Set([...prev, ...keys])]);
    }
  };

  const handleSelectAll = () => {
    const all = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));
    setSelectedPermissions(all);
  };

  const handleClearAll = () => {
    setSelectedPermissions([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");
    try {
      if (isEditing) {
        const res = await api.patch(
          ENDPOINTS.ORGANIZATIONS.UPDATE_ROLE(orgId, roleToEdit._id),
          {
            description: description.trim(),
            permissions: selectedPermissions,
          }
        );
        if (onRoleUpdated) onRoleUpdated(res.data.data);
      } else {
        const res = await api.post(ENDPOINTS.ORGANIZATIONS.CREATE_ROLE(orgId), {
          name: name.trim(),
          description: description.trim(),
          permissions: selectedPermissions,
        });
        if (onRoleCreated) onRoleCreated(res.data.data);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditing ? "update" : "create"} custom role`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isEditing ? `Edit Role: ${roleToEdit.name.toUpperCase()}` : "Create Custom Role"}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Role Name */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
            Role Title *
          </label>
          <input
            type="text"
            required
            disabled={isEditing}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. QA Engineer, Technical Lead, Designer"
            className={`w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 ${
              isEditing ? "opacity-60 cursor-not-allowed uppercase font-semibold" : ""
            }`}
          />
          {isEditing && (
            <p className="text-[11px] text-zinc-400 mt-1">Role identifier cannot be renamed.</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
            Description (Optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief explanation of responsibilities and scope..."
            className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100"
          />
        </div>

        {/* Permissions Matrix Header */}
        <div className="pt-2">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Granted Permissions
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">
                ({selectedPermissions.length} selected)
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={handleSelectAll}
                className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer"
              >
                Select All
              </button>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Permissions Accordion / Groups */}
          <div className="mt-3 max-h-72 overflow-y-auto space-y-4 pr-1">
            {PERMISSION_GROUPS.map((group) => {
              const groupKeys = group.permissions.map((p) => p.key);
              const allChecked = groupKeys.every((k) =>
                selectedPermissions.includes(k)
              );
              const someChecked =
                !allChecked && groupKeys.some((k) => selectedPermissions.includes(k));

              return (
                <div
                  key={group.category}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {group.category}
                      </span>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {group.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.permissions)}
                      className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                    >
                      {allChecked ? "Deselect Group" : "Select Group"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {group.permissions.map((p) => {
                      const isChecked = selectedPermissions.includes(p.key);
                      return (
                        <label
                          key={p.key}
                          className="flex items-center gap-2.5 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer text-xs transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(p.key)}
                            className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-950 focus:ring-0 cursor-pointer"
                          />
                          <span
                            className={
                              isChecked
                                ? "font-semibold text-zinc-900 dark:text-zinc-100"
                                : "text-zinc-600 dark:text-zinc-400"
                            }
                          >
                            {p.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white disabled:opacity-50 font-medium rounded-lg text-sm transition-colors shadow-xs cursor-pointer"
          >
            {loading
              ? isEditing
                ? "Saving Changes..."
                : "Creating Custom Role..."
              : isEditing
              ? "Save Permissions"
              : "Create Custom Role"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateRoleModal;
