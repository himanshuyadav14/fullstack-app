/**
 * Reusable Task Card on Kanban Board (Tailwind CSS)
 */
const TaskCard = ({ task, onMove, moveLabel, onClick }) => {
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

  return (
    <div
      onClick={() => onClick && onClick(task)}
      className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs hover:border-zinc-900 dark:hover:border-zinc-100 transition-all cursor-pointer flex flex-col gap-2 group"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100">
          {task.taskKey}
        </span>
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
        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
          {task.description}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 inline-block" />
          {task.assignee?.name || "Unassigned"}
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
