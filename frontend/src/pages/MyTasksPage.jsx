import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { ENDPOINTS } from "../services/urls";
import { useOrgStore } from "../stores/orgStore";
import { useAuthStore } from "../stores/authStore";
import CustomSelect from "../components/common/CustomSelect";
import UserAvatar from "../components/common/UserAvatar";
import TaskDetailModal from "../components/kanban/TaskDetailModal";

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];
const PRIORITY_OPTIONS = ["low", "medium", "high", "urgent"].map((p) => ({
  value: p,
  label: p.charAt(0).toUpperCase() + p.slice(1),
}));
const PRIORITY_STYLES = {
  low: "text-zinc-500",
  medium: "text-sky-600 dark:text-sky-400",
  high: "text-amber-600 dark:text-amber-400",
  urgent: "text-red-600 dark:text-red-400",
};

const idOf = (ref) => (ref && typeof ref === "object" ? ref._id : ref);

const isOverdue = (t) =>
  t.dueDate && !["done", "cancelled"].includes(t.status) && new Date(t.dueDate) < new Date();

const MyTasksPage = () => {
  const { currentOrg, can } = useOrgStore();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const orgId = currentOrg?._id;

  const [scope, setScope] = useState("mine"); // "mine" | "all"
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [projectId, setProjectId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [activeTask, setActiveTask] = useState(null);

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (!orgId) return;
    api
      .get(ENDPOINTS.PROJECTS.LIST_CREATE(orgId), { params: { limit: 50 } })
      .then((res) => setProjects(res.data.data || []))
      .catch(() => setProjects([]));
  }, [orgId]);

  const loadTasks = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.TASKS.LIST(orgId), {
        params: {
          page,
          limit: 20,
          myTasks: scope === "mine" ? "true" : undefined,
          status: status || undefined,
          priority: priority || undefined,
          projectId: projectId || undefined,
          search: search || undefined,
        },
      });
      setTasks(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [orgId, scope, status, priority, projectId, search, page]);

  // Open a task by id: fetches full details (attachments, team, project lead)
  const openTask = async (taskId) => {
    try {
      const res = await api.get(ENDPOINTS.TASKS.GET_BY_ID(orgId, taskId));
      setActiveTask(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Task not found");
      return false;
    }
    return true;
  };

  // Deep link: /tasks?task=<id> (used by notifications)
  const linkedTaskId = searchParams.get("task");
  useEffect(() => {
    if (!linkedTaskId || !orgId) return;
    openTask(linkedTaskId).finally(() => {
      searchParams.delete("task");
      setSearchParams(searchParams, { replace: true });
    });
  }, [linkedTaskId, orgId]);

  const handleStatusChange = async (task, newStatus) => {
    if (newStatus === task.status) return;
    const previous = task.status;
    setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, status: newStatus } : t)));
    try {
      await api.patch(ENDPOINTS.TASKS.UPDATE_STATUS(orgId, task._id), { status: newStatus });
    } catch (err) {
      setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, status: previous } : t)));
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  const resetFilters = () => {
    setStatus("");
    setPriority("");
    setProjectId("");
    setSearchInput("");
    setPage(1);
  };

  const hasFilters = status || priority || projectId || searchInput;
  const setFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Tasks</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {scope === "mine" ? "Everything assigned to you" : "All tasks"} across{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">{currentOrg?.name}</strong>
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl">
          {[
            ["mine", "Assigned to me"],
            ["all", "All tasks"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(setScope)(value)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                scope === value
                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 shadow-2xs"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search title, key or description..."
          className="flex-1 min-w-48 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
        />
        <CustomSelect
          size="sm"
          value={status}
          onChange={setFilter(setStatus)}
          options={[{ value: "", label: "Any status" }, ...STATUS_OPTIONS]}
          className="min-w-36"
        />
        <CustomSelect
          size="sm"
          value={priority}
          onChange={setFilter(setPriority)}
          options={[{ value: "", label: "Any priority" }, ...PRIORITY_OPTIONS]}
          className="min-w-36"
        />
        <CustomSelect
          size="sm"
          value={projectId}
          onChange={setFilter(setProjectId)}
          options={[
            { value: "", label: "All projects" },
            ...projects.map((p) => ({ value: p._id, label: `${p.name} (${p.key})` })),
          ]}
          className="min-w-44"
        />
        {hasFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 px-2 cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* List */}
      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        {loading && tasks.length === 0 ? (
          <div className="p-12 text-center text-sm text-zinc-500">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-base font-bold mb-1">No tasks found</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {hasFilters
                ? "Try clearing some filters."
                : scope === "mine"
                  ? "Nothing is assigned to you right now."
                  : "No tasks have been created yet."}
            </p>
          </div>
        ) : (
          <ul className={`divide-y divide-zinc-100 dark:divide-zinc-800/60 ${loading ? "opacity-60" : ""}`}>
            {tasks.map((t) => {
              const canChangeStatus = can("task:update") || idOf(t.assignee) === user?._id;
              return (
                <li
                  key={t._id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => openTask(t._id)}
                    className="flex-1 min-w-56 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-zinc-500">{t.taskKey}</span>
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {t.title}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-zinc-500">
                      <span>{t.project?.name}</span>
                      <span className={`font-semibold capitalize ${PRIORITY_STYLES[t.priority] || ""}`}>
                        {t.priority}
                      </span>
                      {t.dueDate && (
                        <span className={isOverdue(t) ? "text-red-600 dark:text-red-400 font-semibold" : ""}>
                          {isOverdue(t) ? "Overdue · " : "Due "}
                          {new Date(t.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      )}
                      {t.commentsCount > 0 && <span>{t.commentsCount} comments</span>}
                    </div>
                  </button>

                  {scope === "all" && (
                    <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                      {t.assignee ? (
                        <>
                          <UserAvatar user={t.assignee} size="xs" />
                          {t.assignee.name}
                        </>
                      ) : (
                        <span className="italic">Unassigned</span>
                      )}
                    </span>
                  )}

                  {canChangeStatus ? (
                    <CustomSelect
                      size="sm"
                      value={t.status}
                      onChange={(v) => handleStatusChange(t, v)}
                      options={STATUS_OPTIONS}
                      className="min-w-32"
                    />
                  ) : (
                    <span className="text-[11px] font-semibold uppercase px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                      {t.status?.replace("_", " ")}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{total} tasks</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {activeTask && (
        <TaskDetailModal
          task={activeTask}
          orgId={orgId}
          onClose={() => setActiveTask(null)}
          onTaskUpdated={(updated) => {
            setActiveTask((prev) => ({ ...prev, ...updated }));
            setTasks((prev) => prev.map((t) => (t._id === updated._id ? { ...t, ...updated } : t)));
          }}
          onTaskDeleted={(deletedId) => {
            setActiveTask(null);
            setTasks((prev) => prev.filter((t) => t._id !== deletedId));
            setTotal((n) => Math.max(0, n - 1));
          }}
        />
      )}
    </div>
  );
};

export default MyTasksPage;
