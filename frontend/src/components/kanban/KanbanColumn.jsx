import TaskCard from "./TaskCard";

/**
 * Reusable Kanban Column (Tailwind CSS)
 */
const KanbanColumn = ({
  title,
  dotColorClass = "bg-slate-400",
  tasks = [],
  onMove,
  moveLabel,
  onTaskClick,
}) => {
  return (
    <div className="flex-1 min-w-[280px] bg-slate-100/70 dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 min-h-[500px]">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${dotColorClass}`} />
          <h3 className="text-sm font-bold tracking-tight text-slate-800 dark:text-zinc-100">
            {title}
          </h3>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 flex-1">
        {tasks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-zinc-800/80 rounded-xl p-6 text-center text-xs text-slate-400 dark:text-zinc-500">
            No tasks in {title.toLowerCase()}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onMove={onMove}
              moveLabel={moveLabel}
              onClick={onTaskClick}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
