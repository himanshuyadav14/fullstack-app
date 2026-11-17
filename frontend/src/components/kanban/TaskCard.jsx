import { useState } from "react";

/**
 * Reusable Task Card on Kanban Board (Tailwind CSS)
 * Features:
 * - HTML5 Native Drag & Drop
 * - Assignee avatar / name
 * - Target / Due date indicator
 * - Attachments & Comments count
 * - Monochrome palette (no blue)
 */
const TaskCard = ({ task, onMove, moveLabel, onClick }) => {
  const [isDragging, setIsDragging] = useState(false);

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400";
      case "high":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";
      case "medium":
        return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700";
      default:
        return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-400";
    }
  };

  const isOverdue =
    task.dueDate &&
    task.status !== "done" &&
    new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : null;

  const handleDragStart = (e) => {
    e.dataTransfer.setData("taskId", task._id);
    e.dataTransfer.setData("fromStatus", task.status);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onClick && onClick(task)}
      className={`p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs hover:border-zinc-900 dark:hover:border-zinc-100 transition-all cursor-grab active:cursor-grabbing flex flex-col gap-2 group select-none ${
        isDragging
          ? "opacity-35 scale-95 border-dashed border-zinc-400 dark:border-zinc-600"
          : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
            {task.taskKey}
          </span>
          {(task.team?.name || task.project?.team?.name) && (
            <span className="text-[10px] text-zinc-400 font-medium truncate max-w-[100px]">
              • {task.team?.name || task.project?.team?.name}
            </span>
          )}
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-md font-medium capitalize ${getPriorityBadge(
            task.priority,
          )}`}
        >
          {task.priority}
        </span>
      </div>

      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-snug">
        {task.title}
      </div>

      {task.description && (
        <div className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
          {task.description}
        </div>
      )}

      {/* Badges Row: Target Date, Attachments & Comments */}
      {(formattedDueDate || task.attachments?.length > 0 || (task.commentsCount > 0 || task.comments?.length > 0)) && (
        <div className="flex items-center gap-2 pt-0.5">
          {formattedDueDate && (
            <span
              className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                isOverdue
                  ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-900"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formattedDueDate}</span>
            </span>
          )}

          {task.attachments?.length > 0 && (
            <span
              className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400"
              title={`${task.attachments.length} attachments`}
            >
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span>{task.attachments.length}</span>
            </span>
          )}

          {(task.commentsCount > 0 || task.comments?.length > 0) && (
            <span
              className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400"
              title={`${task.commentsCount || task.comments?.length || 0} comments`}
            >
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{task.commentsCount || task.comments?.length || 0}</span>
            </span>
          )}
        </div>
      )}

      {/* Footer: Assignee & Action */}
      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5 truncate max-w-[150px]">
          {task.assignee?.name ? (
            <span className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-[10px] font-bold flex items-center justify-center shrink-0">
              {task.assignee.name.charAt(0).toUpperCase()}
            </span>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 inline-block shrink-0" />
          )}
          <span className="truncate">{task.assignee?.name || "Unassigned"}</span>
        </span>

        {onMove && moveLabel && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMove(task._id);
            }}
            className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline cursor-pointer shrink-0"
          >
            {moveLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
