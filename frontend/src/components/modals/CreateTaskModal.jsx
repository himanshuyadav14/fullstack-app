import { useState, useEffect } from "react";
import toast from "react-hot-toast";
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
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load organization members for assignee dropdown
  useEffect(() => {
    if (!orgId) return;

    const fetchMembers = async () => {
      setLoadingMembers(true);
      try {
        const res = await api.get(ENDPOINTS.ORGANIZATIONS.MEMBERS(orgId), {
          params: { limit: 50 },
        });
        setMembers(res.data.data || []);
      } catch (err) {
        console.error("Failed to load members for assignment:", err);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [orgId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;

    setLoading(true);
    setError("");
    try {
      // 1. Create the task with assignee and due date
      const payload = {
        title: title.trim(),
        description: description.trim(),
        priority,
      };

      if (assigneeId) {
        payload.assigneeId = assigneeId;
      }

      if (dueDate) {
        payload.dueDate = new Date(dueDate).toISOString();
      }

      const res = await api.post(ENDPOINTS.TASKS.CREATE(orgId, projectId), payload);
      let createdTask = res.data.data;

      // 2. If an initial attachment file is selected, upload it
      if (attachmentFile && createdTask?._id) {
        try {
          const formData = new FormData();
          formData.append("file", attachmentFile);
          const attRes = await api.post(
            ENDPOINTS.TASKS.ATTACHMENTS(orgId, createdTask._id),
            formData,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
          createdTask = { ...createdTask, attachments: attRes.data.data };
        } catch (attErr) {
          console.warn("Task created, but attachment upload failed:", attErr);
        }
      }

      if (onTaskCreated) onTaskCreated(createdTask);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to create task";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const assigneeOptions = [
    { value: "", label: "Unassigned" },
    ...members.map((m) => ({
      value: m.user?._id,
      label: m.user?.name || "Unknown Member",
      avatar: m.user?.name?.charAt(0) || "U",
    })),
  ];

  return (
    <Modal title="Create New Task" onClose={onClose} maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Project Selector */}
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

        {/* Title */}
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

        {/* 2-Column: Priority & Assignee */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <CustomSelect
            label="Assignee"
            value={assigneeId}
            disabled={loadingMembers}
            onChange={(val) => setAssigneeId(val)}
            options={assigneeOptions}
            placeholder={loadingMembers ? "Loading members..." : "Unassigned"}
          />
        </div>

        {/* 2-Column: Target Date & Initial Attachment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
              Target / Due Date (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
              Attachment (Optional)
            </label>
            {attachmentFile ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs">
                <span className="truncate max-w-[150px] font-medium text-zinc-800 dark:text-zinc-200">
                  {attachmentFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => setAttachmentFile(null)}
                  className="text-zinc-400 hover:text-red-500 cursor-pointer ml-2"
                  title="Remove attachment"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-xs font-medium cursor-pointer transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span>Choose File (Max 5MB)</span>
                <input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error("File size exceeds 5MB limit");
                        return;
                      }
                      setAttachmentFile(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Technical specs, acceptance criteria, or context..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white disabled:opacity-50 font-medium rounded-lg text-sm transition-colors shadow-xs cursor-pointer"
        >
          {loading ? "Creating Task..." : "Create Task"}
        </button>
      </form>
    </Modal>
  );
};

export default CreateTaskModal;
