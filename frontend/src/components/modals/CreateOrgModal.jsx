import { useState } from "react";
import Modal from "../common/Modal";
import { useOrgStore } from "../../stores/orgStore";

const CreateOrgModal = ({ onClose }) => {
  const [name, setName] = useState("");
  const { createOrg, loading } = useOrgStore();
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setError("");
    const res = await createOrg(name.trim());
    if (res.success) {
      onClose();
    } else {
      setError(res.message);
    }
  };

  return (
    <Modal title="Create New Workspace" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
            Workspace Name *
          </label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Corp or Engineering"
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors shadow-xs cursor-pointer"
        >
          {loading ? "Creating..." : "Create Workspace"}
        </button>
      </form>
    </Modal>
  );
};

export default CreateOrgModal;
