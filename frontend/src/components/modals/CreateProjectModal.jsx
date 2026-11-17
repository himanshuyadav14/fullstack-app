import { useState } from "react";
import Modal from "../common/Modal";
import api from "../../services/api";
import { ENDPOINTS } from "../../services/urls";

const CreateProjectModal = ({ orgId, onClose, onProjectCreated }) => {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !key.trim()) return;

    setLoading(true);
    setError("");
    try {
      const res = await api.post(ENDPOINTS.PROJECTS.LIST_CREATE(orgId), {
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description: description.trim(),
      });

      if (onProjectCreated) {
        onProjectCreated(res.data.data);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Create New Project" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
            Project Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!key) {
                // Auto-suggest 2-3 char key from name
                const suggested = e.target.value
                  .replace(/[^a-zA-Z]/g, "")
                  .slice(0, 3)
                  .toUpperCase();
                setKey(suggested);
              }
            }}
            placeholder="e.g. Website Redesign"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
            Project Key * (2-6 letters, e.g. "TF", "WEB")
          </label>
          <input
            type="text"
            required
            maxLength={6}
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            placeholder="TF"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Scope, objectives, and goals..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim() || !key.trim()}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors shadow-xs cursor-pointer"
        >
          {loading ? "Creating..." : "Create Project"}
        </button>
      </form>
    </Modal>
  );
};

export default CreateProjectModal;
