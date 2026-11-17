import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import Modal from "../common/Modal";
import CustomSelect from "../common/CustomSelect";
import UserAvatar from "../common/UserAvatar";
import { useOrgStore } from "../../stores/orgStore";
import { useAuthStore } from "../../stores/authStore";
import api from "../../services/api";
import { ENDPOINTS } from "../../services/urls";
import { confirm } from "../../stores/confirmStore";
import { getSocket, joinRoomWhileConnected, useSocket } from "../../services/socket";

const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"].map((p) => ({
  value: p,
  label: `${p.charAt(0).toUpperCase() + p.slice(1)} Priority`,
}));

const idOf = (ref) => (ref && typeof ref === "object" ? ref._id : ref);

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100";

/**
 * Task Detail Modal (Tailwind CSS)
 * Permissions mirror the backend: edit = task:update / assignee / reporter,
 * delete = task:delete / reporter, comment edit = author only,
 * comment delete = author / comment:delete.
 */
const TaskDetailModal = ({
  task,
  orgId,
  currentProject,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}) => {
  const { currentOrg, can } = useOrgStore();
  const { user } = useAuthStore();
  const socket = useSocket();

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [typingUsers, setTypingUsers] = useState({}); // userId -> name

  const [attachments, setAttachments] = useState(task?.attachments || []);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [members, setMembers] = useState([]);
  const [currentAssignee, setCurrentAssignee] = useState(idOf(task?.assignee) || "");
  const [assigning, setAssigning] = useState(false);
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
  );
  const [updatingDueDate, setUpdatingDueDate] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);

  const isAssignee = idOf(task?.assignee) === user?._id;
  const isReporter = idOf(task?.reporter) === user?._id;
  const canEditTask = can("task:update") || isAssignee || isReporter;
  const canDeleteTask = can("task:delete") || isReporter;
  const canModerateComments = can("comment:delete");
  const canAssign = can("task:assign") || can("task:update");

  // Initial data
  useEffect(() => {
    if (!task?._id || !orgId) return;

    const loadData = async () => {
      setLoadingComments(true);
      try {
        const [commentsRes, membersRes] = await Promise.all([
          api.get(ENDPOINTS.COMMENTS.LIST_CREATE(orgId, task._id)),
          api.get(ENDPOINTS.ORGANIZATIONS.MEMBERS(orgId), { params: { limit: 50 } }),
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

  // Live discussion: new comments, attachments and typing indicators for this task
  useEffect(() => {
    if (!socket || !task?._id) return;
    const leaveTaskRoom = joinRoomWhileConnected(socket, "join:task", task._id, "leave:task");
    const typingTimers = {};

    const onCommentNew = (comment) => {
      if (idOf(comment.task) !== task._id) return;
      // Our own post arrives via the API response too; keep one copy
      setComments((prev) => (prev.some((c) => c._id === comment._id) ? prev : [...prev, comment]));
    };

    const onAttachmentUploaded = (attachment) => {
      setAttachments((prev) =>
        prev.some((a) => a._id === attachment._id) ? prev : [...prev, attachment],
      );
    };

    const onUserTyping = ({ taskId, userId, userName, isTyping }) => {
      if (taskId !== task._id || userId === user?._id) return;
      clearTimeout(typingTimers[userId]);
      if (isTyping) {
        setTypingUsers((prev) => ({ ...prev, [userId]: userName }));
        // Drop the indicator if the "stopped typing" event never arrives
        typingTimers[userId] = setTimeout(() => {
          setTypingUsers(({ [userId]: _, ...rest }) => rest);
        }, 4000);
      } else {
        setTypingUsers(({ [userId]: _, ...rest }) => rest);
      }
    };

    socket.on("comment:new", onCommentNew);
    socket.on("task:attachment_uploaded", onAttachmentUploaded);
    socket.on("task:user_typing", onUserTyping);

    return () => {
      Object.values(typingTimers).forEach(clearTimeout);
      socket.off("comment:new", onCommentNew);
      socket.off("task:attachment_uploaded", onAttachmentUploaded);
      socket.off("task:user_typing", onUserTyping);
      leaveTaskRoom();
    };
  }, [socket, task?._id, user?._id]);

  // Typing indicator (outgoing): announce once, then "stopped" after a pause.
  // Uses getSocket() so timers/unmount always talk to the live socket.
  const typingStopTimer = useRef(null);
  const isTypingRef = useRef(false);
  const taskIdRef = useRef(task?._id);
  taskIdRef.current = task?._id;

  const stopTyping = () => {
    clearTimeout(typingStopTimer.current);
    const live = getSocket();
    if (isTypingRef.current && live && taskIdRef.current) {
      live.emit("task:typing", { taskId: taskIdRef.current, isTyping: false });
    }
    isTypingRef.current = false;
  };
  const announceTyping = () => {
    const live = getSocket();
    if (!live || !taskIdRef.current) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      live.emit("task:typing", { taskId: taskIdRef.current, isTyping: true });
    }
    clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(stopTyping, 2000);
  };
  useEffect(() => stopTyping, []);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    stopTyping();
    setSubmittingComment(true);
    try {
      const res = await api.post(ENDPOINTS.COMMENTS.LIST_CREATE(orgId, task._id), {
        content: newComment.trim(),
      });
      const created = res.data.data;
      setComments((prev) => (prev.some((c) => c._id === created._id) ? prev : [...prev, created]));
      setNewComment("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const startEditComment = (c) => {
    setEditingCommentId(c._id);
    setEditingCommentText(c.content);
  };

  const handleSaveComment = async (commentId) => {
    const content = editingCommentText.trim();
    if (!content) return;
    try {
      const res = await api.patch(ENDPOINTS.COMMENTS.UPDATE_DELETE(orgId, task._id, commentId), {
        content,
      });
      setComments((prev) => prev.map((c) => (c._id === commentId ? res.data.data : c)));
      setEditingCommentId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to edit comment");
    }
  };

  const handleDeleteComment = async (commentId) => {
    const ok = await confirm({
      title: "Delete comment?",
      message: "It will be removed from the discussion for everyone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await api.delete(ENDPOINTS.COMMENTS.UPDATE_DELETE(orgId, task._id, commentId));
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete comment");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadingFile(true);
    try {
      const res = await api.post(ENDPOINTS.TASKS.ATTACHMENTS(orgId, task._id), formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });
      setAttachments(res.data.data || []);
      if (onTaskUpdated) onTaskUpdated({ _id: task._id, attachments: res.data.data });
      toast.success("Attachment uploaded successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload file");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    const ok = await confirm({
      title: "Remove attachment?",
      message: "The file will be deleted from this task.",
      confirmLabel: "Remove",
    });
    if (!ok) return;

    try {
      const res = await api.delete(ENDPOINTS.TASKS.DELETE_ATTACHMENT(orgId, task._id, attachmentId));
      setAttachments(res.data.data || []);
      if (onTaskUpdated) onTaskUpdated({ _id: task._id, attachments: res.data.data });
      toast.success("Attachment removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete attachment");
    }
  };

  const handleAssignChange = async (newUserId) => {
    const previous = currentAssignee;
    setCurrentAssignee(newUserId);
    setAssigning(true);

    try {
      const res = await api.patch(ENDPOINTS.TASKS.ASSIGN(orgId, task._id), {
        assigneeId: newUserId || null,
      });
      if (onTaskUpdated) onTaskUpdated(res.data.data);
      toast.success("Assignee updated");
    } catch (err) {
      setCurrentAssignee(previous);
      toast.error(err.response?.data?.message || "Failed to update assignment");
    } finally {
      setAssigning(false);
    }
  };

  const patchTask = async (fields) => {
    const res = await api.patch(ENDPOINTS.TASKS.UPDATE(orgId, task._id), fields);
    if (onTaskUpdated) onTaskUpdated(res.data.data);
    return res.data.data;
  };

  const handleDueDateChange = async (e) => {
    const val = e.target.value;
    const previous = dueDate;
    setDueDate(val);
    setUpdatingDueDate(true);
    try {
      await patchTask({ dueDate: val ? new Date(val).toISOString() : null });
      toast.success("Target due date updated");
    } catch (err) {
      setDueDate(previous);
      toast.error(err.response?.data?.message || "Failed to update target date");
    } finally {
      setUpdatingDueDate(false);
    }
  };

  const handlePriorityChange = async (priority) => {
    if (priority === task.priority) return;
    setUpdatingPriority(true);
    try {
      await patchTask({ priority });
      toast.success("Priority updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update priority");
    } finally {
      setUpdatingPriority(false);
    }
  };

  const startEditTask = () => {
    setEditForm({ title: task.title || "", description: task.description || "" });
    setIsEditing(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    const title = editForm.title.trim();
    if (title.length < 2) {
      toast.error("Title must be at least 2 characters");
      return;
    }
    setSavingEdit(true);
    try {
      await patchTask({ title, description: editForm.description.trim() });
      setIsEditing(false);
      toast.success("Task updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update task");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteTask = async () => {
    const ok = await confirm({
      title: `Delete ${task.taskKey}?`,
      message: `"${task.title}" and all of its comments will be deleted. This cannot be undone.`,
      confirmLabel: "Delete Task",
    });
    if (!ok) return;

    setDeletingTask(true);
    try {
      await api.delete(ENDPOINTS.TASKS.DELETE(orgId, task._id));
      if (onTaskDeleted) onTaskDeleted(task._id);
      toast.success(`Task ${task.taskKey} deleted`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete task");
      setDeletingTask(false);
    }
  };

  const teamName =
    task.team?.name || task.project?.team?.name || currentProject?.team?.name || "Team";
  const projectName = task.project?.name || currentProject?.name || "Project";
  const typingNames = Object.values(typingUsers);

  return (
    <Modal title={`${task.taskKey}: ${task.title}`} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4 text-sm">
        {/* Contextual Hierarchy Path (Workspace › Team › Project › Task) */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{currentOrg?.name}</span>
          <span>›</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{teamName}</span>
          <span>›</span>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">{projectName}</span>
          <span>›</span>
          <span className="font-mono font-bold text-zinc-950 dark:text-zinc-50 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
            {task.taskKey}
          </span>
        </div>

        {/* Meta Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold uppercase bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
              {task.status?.replace("_", " ")}
            </span>
            {canEditTask ? (
              <CustomSelect
                size="sm"
                value={task.priority}
                disabled={updatingPriority}
                onChange={handlePriorityChange}
                options={PRIORITY_OPTIONS}
                className="min-w-36"
              />
            ) : (
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold capitalize bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                {task.priority} Priority
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Target Date Picker */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Target:</span>
              <input
                type="date"
                value={dueDate}
                disabled={updatingDueDate || !canEditTask}
                onChange={handleDueDateChange}
                className="text-xs px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* Assignee */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">Assignee:</span>
              <CustomSelect
                size="sm"
                value={currentAssignee}
                disabled={assigning || !canAssign}
                onChange={handleAssignChange}
                options={[
                  { value: "", label: "Unassigned" },
                  ...members.map((m) => ({
                    value: m.user?._id,
                    label: m.user?.name || "Unknown",
                    avatar: m.user?.name?.charAt(0) || "U",
                  })),
                ]}
                className="min-w-37.5"
              />
            </div>
          </div>
        </div>

        {/* Title + Description */}
        {isEditing ? (
          <form onSubmit={handleSaveTask} className="space-y-2.5">
            <input
              className={inputClass}
              value={editForm.title}
              maxLength={200}
              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Task title"
            />
            <textarea
              className={`${inputClass} min-h-28`}
              value={editForm.description}
              maxLength={10000}
              onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the task..."
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={savingEdit}
                className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white rounded-lg text-xs font-medium disabled:opacity-50 cursor-pointer"
              >
                {savingEdit ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Description
              </div>
              {canEditTask && (
                <button
                  type="button"
                  onClick={startEditTask}
                  className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer"
                >
                  Edit task
                </button>
              )}
            </div>
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/30 text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {task.description || "No description provided."}
            </div>
          </div>
        )}

        {/* Attachments Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Attachments ({attachments.length})
            </div>
            {canEditTask && (
              <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>{uploadingFile ? "Uploading..." : "Upload File"}</span>
                <input type="file" disabled={uploadingFile} onChange={handleFileUpload} className="hidden" />
              </label>
            )}
          </div>

          {attachments.length === 0 ? (
            <div className="text-xs text-slate-400 dark:text-zinc-500 italic">No files attached yet.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {attachments.map((att) => {
                const canRemove = can("task:delete") || idOf(att.uploadedBy) === user?._id;
                return (
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
                      <svg className="w-3.5 h-3.5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span>{att.originalName}</span>
                    </a>
                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAttachment(att._id)}
                        className="p-0.5 text-zinc-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                        title="Delete attachment"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Discussion / Comments */}
        <div className="pt-4 border-t border-slate-200 dark:border-zinc-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-2">
            Comments & Discussion ({comments.length})
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2.5 mb-3 pr-1">
            {loadingComments ? (
              <div className="text-xs text-slate-400">Loading discussion...</div>
            ) : comments.length === 0 ? (
              <div className="text-xs text-slate-400 dark:text-zinc-500 py-2">
                No comments yet. Start the conversation!
              </div>
            ) : (
              comments.map((c) => {
                const isAuthor = idOf(c.author) === user?._id;
                const canDeleteComment = isAuthor || canModerateComments;
                const isEditingThis = editingCommentId === c._id;
                return (
                  <div
                    key={c._id}
                    className="group p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/40"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 mb-1 gap-2">
                      <span className="flex items-center gap-2 font-semibold text-slate-800 dark:text-zinc-200">
                        <UserAvatar user={c.author} size="xs" />
                        {c.author?.name || "User"}
                      </span>
                      <span className="flex items-center gap-2 text-[11px]">
                        {c.isEdited && <span className="italic">edited</span>}
                        {new Date(c.createdAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {!isEditingThis && (isAuthor || canDeleteComment) && (
                          <span className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            {isAuthor && (
                              <button
                                type="button"
                                onClick={() => startEditComment(c)}
                                className="hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                            {canDeleteComment && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(c._id)}
                                className="hover:text-red-600 cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                          </span>
                        )}
                      </span>
                    </div>
                    {isEditingThis ? (
                      <div className="space-y-2 mt-1">
                        <textarea
                          className={`${inputClass} text-xs min-h-16`}
                          value={editingCommentText}
                          maxLength={5000}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveComment(c._id)}
                            disabled={!editingCommentText.trim()}
                            className="px-3 py-1 bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-md text-[11px] font-medium disabled:opacity-50 cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCommentId(null)}
                            className="px-3 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 text-[11px] font-medium cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">{c.content}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="h-4 text-[11px] text-zinc-400 italic mb-1">
            {typingNames.length === 1 && `${typingNames[0]} is typing...`}
            {typingNames.length > 1 && `${typingNames.length} people are typing...`}
          </div>

          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Write a comment..."
              value={newComment}
              maxLength={5000}
              onChange={(e) => {
                setNewComment(e.target.value);
                if (e.target.value) announceTyping();
                else stopTyping();
              }}
              onBlur={stopTyping}
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
        {canDeleteTask && (
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
        )}
      </div>
    </Modal>
  );
};

export default TaskDetailModal;
