import { useState, useEffect } from "react";
import Modal from "../common/Modal";
import CustomSelect from "../common/CustomSelect";
import api from "../../services/api";
import { ENDPOINTS } from "../../services/urls";

/**
 * Task Detail Modal (Tailwind CSS)
 */
const TaskDetailModal = ({
  task,
  orgId,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const [attachments, setAttachments] = useState(task?.attachments || []);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [members, setMembers] = useState([]);
  const [currentAssignee, setCurrentAssignee] = useState(
    task?.assignee?._id || task?.assignee || "",
  );
  const [assigning, setAssigning] = useState(false);
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
  );
  const [updatingDueDate, setUpdatingDueDate] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);

  useEffect(() => {
    if (!task?._id || !orgId) return;

    const loadData = async () => {
      setLoadingComments(true);
      try {
        const [commentsRes, membersRes] = await Promise.all([
          api.get(ENDPOINTS.COMMENTS.LIST_CREATE(orgId, task._id)),
          api.get(ENDPOINTS.ORGANIZATIONS.MEMBERS(orgId)),
        ]);
        setComments(commentsRes.data.data || []);
        setMembers(membersRes.data.data || []);
      } catch (err) {
        console.error("Failed to load task modal data:", err);
      } finally {
        setLoadingComments(false);
      }
    };

    loadData();
  }, [task?._id, orgId]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await api.post(
        ENDPOINTS.COMMENTS.LIST_CREATE(orgId, task._id),
        { content: newComment.trim() },
      );
      setComments((prev) => [...prev, res.data.data]);
      setNewComment("");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadingFile(true);
    try {
      const res = await api.post(
        ENDPOINTS.TASKS.ATTACHMENTS(orgId, task._id),
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setAttachments(res.data.data || []);
      if (onTaskUpdated) onTaskUpdated({ ...task, attachments: res.data.data });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm("Remove this attachment?")) return;

    try {
      const res = await api.delete(
        ENDPOINTS.TASKS.DELETE_ATTACHMENT(orgId, task._id, attachmentId),
      );
      setAttachments(res.data.data || []);
      if (onTaskUpdated) onTaskUpdated({ ...task, attachments: res.data.data });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete attachment");
    }
  };

  const handleAssignChange = async (e) => {
    const newUserId = e.target.value;
    setCurrentAssignee(newUserId);
    setAssigning(true);

    try {
      const res = await api.put(ENDPOINTS.TASKS.ASSIGN(orgId, task._id), {
        assigneeId: newUserId || null,
      });
      if (onTaskUpdated) onTaskUpdated(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update assignment");
    } finally {
      setAssigning(false);
    }
  };

  const handleDueDateChange = async (e) => {
    const val = e.target.value;
    setDueDate(val);
    setUpdatingDueDate(true);
    try {
      const res = await api.patch(ENDPOINTS.TASKS.UPDATE(orgId, task._id), {
        dueDate: val ? new Date(val).toISOString() : null,
      });
      if (onTaskUpdated) onTaskUpdated(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update target date");
    } finally {
      setUpdatingDueDate(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm(`Are you sure you want to delete task ${task.taskKey}?`)) return;

    setDeletingTask(true);
    try {
      await api.delete(ENDPOINTS.TASKS.DELETE(orgId, task._id));
      if (onTaskDeleted) onTaskDeleted(task._id);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete task");
      setDeletingTask(false);
    }
  };

  return (
    <Modal
      title={`${task.taskKey}: ${task.title}`}
      onClose={onClose}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5 text-sm">
        {/* Meta Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold uppercase bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
              {task.status?.replace("_", " ")}
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold capitalize bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
              {task.priority} Priority
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Target Date Picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                Target:
              </span>
              <input
                type="date"
                value={dueDate}
                disabled={updatingDueDate}
                onChange={handleDueDateChange}
                className="text-xs px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer"
              />
            </div>

            {/* Assignee */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                Assignee:
              </span>
              <CustomSelect
                size="sm"
                value={currentAssignee}
                disabled={assigning}
                onChange={(val) => handleAssignChange({ target: { value: val } })}
                options={[
                  { value: "", label: "Unassigned" },
                  ...members.map((m) => ({
                    value: m.user?._id,
                    label: m.user?.name || "Unknown",
                    avatar: m.user?.name?.charAt(0) || "U",
                  })),
                ]}
                className="min-w-[150px]"
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
            Description
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/30 text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {task.description || "No description provided."}
          </div>
        </div>

        {/* Attachments Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Attachments ({attachments.length})
            </div>
            <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>{uploadingFile ? "Uploading..." : "Upload File"}</span>
              <input
                type="file"
                disabled={uploadingFile}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {attachments.length === 0 ? (
            <div className="text-xs text-slate-400 dark:text-zinc-500 italic">
              No files attached yet.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {attachments.map((att) => (
                <div
                  key={att._id || att.url}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-800 text-xs"
                >
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-zinc-400 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                      />
                    </svg>
                    <span>{att.originalName}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteAttachment(att._id)}
                    className="p-0.5 text-zinc-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                    title="Delete attachment"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discussion / Comments */}
        <div className="pt-4 border-t border-slate-200 dark:border-zinc-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2">
            Comments & Discussion
          </div>

          <div className="max-h-56 overflow-y-auto space-y-2.5 mb-3 pr-1">
            {loadingComments ? (
              <div className="text-xs text-slate-400">Loading discussion...</div>
            ) : comments.length === 0 ? (
              <div className="text-xs text-slate-400 dark:text-zinc-500 py-2">
                No comments yet. Start the conversation!
              </div>
            ) : (
              comments.map((c) => (
                <div
                  key={c._id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/40"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1">
                    <span className="font-semibold text-slate-800 dark:text-zinc-200">
                      {c.author?.name || "User"}
                    </span>
                    <span className="text-[11px]">
                      {new Date(c.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">
                    {c.content}
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
            <button
              type="submit"
              disabled={submittingComment || !newComment.trim()}
              className="px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white disabled:opacity-50 font-medium rounded-lg text-xs cursor-pointer shadow-2xs transition-colors"
            >
              {submittingComment ? "Posting..." : "Send"}
            </button>
          </form>
        </div>

        {/* Delete Task Option */}
        <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex justify-end">
          <button
            type="button"
            disabled={deletingTask}
            onClick={handleDeleteTask}
            className="text-xs text-red-500 hover:text-red-700 hover:underline cursor-pointer"
          >
            {deletingTask ? "Deleting..." : "Delete this task"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TaskDetailModal;
