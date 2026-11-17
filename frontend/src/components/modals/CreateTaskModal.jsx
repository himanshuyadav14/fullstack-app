import { useState } from "react";
import Modal from "../common/Modal";
import CustomSelect from "../common/CustomSelect";
import api from "../../services/api";
import { ENDPOINTS } from "../../services/urls";

const CreateTaskModal = ({
  orgId,
  selectedProjectId,
  projects = [],
  onClose,
  onTaskCreated,
}) => {
  const [projectId, setProjectId] = useState(
    selectedProjectId || projects[0]?._id || "",
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    setLoading(true);
    setError("");
    try {
      const res = await api.post(ENDPOINTS.TASKS.CREATE(orgId, projectId), {
        title: title.trim(),
        description: description.trim(),
        priority,
      });

      if (onTaskCreated) onTaskCreated(res.data.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create New Task" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <CustomSelect
          label="Target Project *"
          value={projectId}
          onChange={(val) => setProjectId(val)}
          options={projects.map((p) => ({
            value: p._id,
            label: `${p.name} (${p.key})`,
          }))}
          placeholder="Select project"
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
            Task Title *
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement OAuth Flow"
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100"
          />
        </div>

        <CustomSelect
          label="Priority"
          value={priority}
          onChange={(val) => setPriority(val)}
          options={[
            { value: "low", label: "Low Priority" },
            { value: "medium", label: "Medium Priority" },
            { value: "high", label: "High Priority" },
            { value: "urgent", label: "Urgent Priority" },
          ]}
        />

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Technical specs, steps to reproduce, or acceptance criteria..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !title.trim() || !projectId}
          className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white disabled:opacity-50 font-medium rounded-lg text-sm transition-colors shadow-xs cursor-pointer"
        >
          {loading ? "Creating..." : "Create Task"}
        </button>
      </form>
    </Modal>
  );
};

export default CreateTaskModal;
