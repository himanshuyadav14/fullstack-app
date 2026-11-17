/**
 * Reusable Task Card on Kanban Board (Tailwind CSS)
 */
const TaskCard = ({ task, onMove, moveLabel, onClick }) => {
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400";
      case "high":
        return "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400";
      case "medium":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400";
      default:
        return "bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400";
    }
  };

  return (
    <div
      onClick={() => onClick && onClick(task)}
      className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-xs hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col gap-2 group"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
          {task.taskKey}
        </span>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${getPriorityBadge(
            task.priority,
          )}`}
        >
          {task.priority}
        </span>
      </div>

      <div className="text-sm font-semibold text-slate-800 dark:text-zinc-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {task.title}
      </div>

      {task.description && (
        <div className="text-xs text-slate-500 dark:text-zinc-400 truncate">
          {task.description}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800 text-xs text-slate-500 dark:text-zinc-400">
        <span className="flex items-center gap-1">
          👤 {task.assignee?.name || "Unassigned"}
        </span>

        {onMove && moveLabel && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMove(task._id);
            }}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            {moveLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
