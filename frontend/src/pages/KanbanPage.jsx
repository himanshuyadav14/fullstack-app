import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useOrgStore } from "../stores/orgStore";
import CustomSelect from "../components/common/CustomSelect";
import KanbanColumn from "../components/kanban/KanbanColumn";
import TaskDetailModal from "../components/kanban/TaskDetailModal";
import CreateProjectModal from "../components/modals/CreateProjectModal";
import CreateTaskModal from "../components/modals/CreateTaskModal";
import api from "../services/api";
import { ENDPOINTS } from "../services/urls";
import { getSocket } from "../services/socket";

const KanbanPage = () => {
  const { currentOrg } = useOrgStore();

  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [tasks, setTasks] = useState({
    todo: [],
    in_progress: [],
    done: [],
  });
  const [loading, setLoading] = useState(false);

  // Modals state
  const [activeTask, setActiveTask] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);

  // 1. Load Teams and Projects on Workspace change
  const loadData = async () => {
    if (!currentOrg?._id) return;

    try {
      const [teamsRes, projectsRes] = await Promise.all([
        api.get(ENDPOINTS.TEAMS.LIST_CREATE(currentOrg._id)),
        api.get(ENDPOINTS.PROJECTS.LIST_CREATE(currentOrg._id)),
      ]);

      const fetchedTeams = teamsRes.data.data || [];
      const fetchedProjects = projectsRes.data.data || [];

      setTeams(fetchedTeams);
      setProjects(fetchedProjects);

      if (fetchedProjects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(fetchedProjects[0]._id);
        if (fetchedProjects[0].team?._id) {
          setSelectedTeamId(fetchedProjects[0].team._id);
        }
      }
    } catch (err) {
      console.error("Failed to load workspace teams/projects:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentOrg?._id]);

  // Filter projects by selected team (if any)
  const displayedProjects = selectedTeamId
    ? projects.filter(
        (p) => p.team?._id === selectedTeamId || p.team === selectedTeamId
      )
    : projects;

  // 2. Load Kanban Tasks when project changes
  const loadKanbanTasks = async (pId) => {
    if (!currentOrg?._id || !pId) return;

    setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.PROJECTS.KANBAN_TASKS(currentOrg._id, pId));
      let kanbanCols = res.data.columns || res.data.data || {};

      if (Array.isArray(res.data.data)) {
        kanbanCols = { todo: [], in_progress: [], done: [] };
        res.data.data.forEach((t) => {
          if (t.status === "done") kanbanCols.done.push(t);
          else if (t.status === "in_progress" || t.status === "in_review") kanbanCols.in_progress.push(t);
          else kanbanCols.todo.push(t);
        });
      }

      const inProgressList = [
        ...(kanbanCols.in_progress || []),
        ...(kanbanCols.in_review || []),
      ];

      setTasks({
        todo: kanbanCols.todo || [],
        in_progress: inProgressList,
        done: kanbanCols.done || [],
      });
    } catch (err) {
      console.error("Failed to load board tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      loadKanbanTasks(selectedProjectId);
    }
  }, [selectedProjectId, currentOrg?._id]);

  // 3. Socket.IO Real-Time Sync
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !selectedProjectId) return;

    socket.emit("join:project", selectedProjectId);

    const onTaskCreated = (newTask) => {
      if (newTask.project === selectedProjectId || newTask.project?._id === selectedProjectId) {
        setTasks((prev) => ({
          ...prev,
          todo: [newTask, ...prev.todo],
        }));
      }
    };

    const onStatusChanged = ({ taskId, status }) => {
      setTasks((prev) => {
        let movedTask = null;
        const newCols = {
          todo: prev.todo.filter((t) => {
            if (t._id === taskId) {
              movedTask = { ...t, status };
              return false;
            }
            return true;
          }),
          in_progress: prev.in_progress.filter((t) => {
            if (t._id === taskId) {
              movedTask = { ...t, status };
              return false;
            }
            return true;
          }),
          done: prev.done.filter((t) => {
            if (t._id === taskId) {
              movedTask = { ...t, status };
              return false;
            }
            return true;
          }),
        };

        if (movedTask && newCols[status]) {
          newCols[status].unshift(movedTask);
        }

        return newCols;
      });
    };

    const onTaskDeleted = ({ taskId }) => {
      setTasks((prev) => ({
        todo: prev.todo.filter((t) => t._id !== taskId),
        in_progress: prev.in_progress.filter((t) => t._id !== taskId),
        done: prev.done.filter((t) => t._id !== taskId),
      }));
    };

    socket.on("task:created", onTaskCreated);
    socket.on("task:status_changed", onStatusChanged);
    socket.on("task:deleted", onTaskDeleted);

    return () => {
      socket.emit("leave:project", selectedProjectId);
      socket.off("task:created", onTaskCreated);
      socket.off("task:status_changed", onStatusChanged);
      socket.off("task:deleted", onTaskDeleted);
    };
  }, [selectedProjectId]);

  // Move task status via API with optimistic update
  const handleMoveStatus = async (taskId, newStatus) => {
    // 1. Optimistic UI update across columns
    setTasks((prev) => {
      let movedTask = null;
      const newCols = {
        todo: prev.todo.filter((t) => {
          if (t._id === taskId) {
            movedTask = { ...t, status: newStatus };
            return false;
          }
          return true;
        }),
        in_progress: prev.in_progress.filter((t) => {
          if (t._id === taskId) {
            movedTask = { ...t, status: newStatus };
            return false;
          }
          return true;
        }),
        done: prev.done.filter((t) => {
          if (t._id === taskId) {
            movedTask = { ...t, status: newStatus };
            return false;
          }
          return true;
        }),
      };

      if (movedTask && newCols[newStatus]) {
        newCols[newStatus].unshift(movedTask);
      }

      return newCols;
    });

    // 2. Persist to API
    try {
      await api.patch(ENDPOINTS.TASKS.UPDATE_STATUS(currentOrg._id, taskId), {
        status: newStatus,
      });
      const statusLabels = {
        todo: "To Do",
        in_progress: "In Progress",
        done: "Done",
      };
      toast.success(`Task moved to ${statusLabels[newStatus] || newStatus}`, { id: `status-${taskId}` });
    } catch (err) {
      console.error("Failed to update status, rolling back:", err);
      loadKanbanTasks(selectedProjectId);
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  const currentProject = projects.find((p) => p._id === selectedProjectId);
  const totalTasksCount = tasks.todo.length + tasks.in_progress.length + tasks.done.length;

  return (
    <div className="space-y-4">
      {/* Action & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Team Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Team:
            </label>
            <CustomSelect
              size="sm"
              value={selectedTeamId}
              onChange={(val) => {
                setSelectedTeamId(val);
                const matching = val
                  ? projects.filter((p) => p.team?._id === val || p.team === val)
                  : projects;
                if (matching.length > 0) {
                  setSelectedProjectId(matching[0]._id);
                }
              }}
              options={[
                { value: "", label: "All Teams" },
                ...teams.map((t) => ({ value: t._id, label: t.name })),
              ]}
              className="min-w-[150px]"
            />
          </div>

          <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">|</span>

          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Project:
            </label>
            {displayedProjects.length > 0 ? (
              <CustomSelect
                size="sm"
                value={selectedProjectId}
                onChange={(val) => setSelectedProjectId(val)}
                options={displayedProjects.map((p) => ({
                  value: p._id,
                  label: `${p.name} (${p.key})`,
                  badge: p.team?.name || null,
                }))}
                className="min-w-[210px]"
              />
            ) : (
              <span className="text-xs text-zinc-400">No projects in this team</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCreateProject(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors cursor-pointer"
          >
            + New Project
          </button>
        </div>

        {projects.length > 0 && (
          <button
            type="button"
            onClick={() => setShowCreateTask(true)}
            className="py-2 px-4 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white font-medium rounded-lg text-sm transition-colors shadow-2xs cursor-pointer"
          >
            + Create Task
          </button>
        )}
      </div>

      {/* Clear Hierarchy Breadcrumb Bar (Org › Team › Project) */}
      {currentProject && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 text-xs">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {currentOrg?.name}
            </span>
            <span>›</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
              <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {currentProject?.team?.name || "Team Squad"}
            </span>
            <span>›</span>
            <span className="font-bold text-zinc-950 dark:text-zinc-50 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 shadow-2xs">
              {currentProject?.name} ({currentProject?.key})
            </span>
          </div>

          <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 font-medium text-[11px]">
            <span>Status: <strong className="text-zinc-900 dark:text-zinc-100 capitalize">{currentProject?.status || "active"}</strong></span>
            <span>•</span>
            <span>Tasks on Board: <strong className="text-zinc-900 dark:text-zinc-100">{totalTasksCount}</strong></span>
          </div>
        </div>
      )}

      {/* Board Columns */}
      {loading ? (
        <div className="py-20 text-center text-sm text-zinc-500">
          Syncing board tasks...
        </div>
      ) : projects.length === 0 ? (
        <div className="max-w-md mx-auto my-16 p-8 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl">
          <h3 className="text-lg font-bold mb-2">No Projects Found</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
            Create your first project under a team to start tracking tasks and sprints on the board.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateProject(true)}
            className="py-2.5 px-6 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white font-medium rounded-lg text-sm shadow-2xs cursor-pointer"
          >
            Create Project
          </button>
        </div>
      ) : (
        <div className="flex gap-5 overflow-x-auto p-1 pb-4">
          <KanbanColumn
            title="To Do"
            status="todo"
            dotColorClass="bg-slate-400 dark:bg-slate-500"
            tasks={tasks.todo}
            onMove={(id) => handleMoveStatus(id, "in_progress")}
            moveLabel="Start"
            onTaskClick={(t) => setActiveTask(t)}
            onDropTask={handleMoveStatus}
          />

          <KanbanColumn
            title="In Progress"
            status="in_progress"
            dotColorClass="bg-amber-500"
            tasks={tasks.in_progress}
            onMove={(id) => handleMoveStatus(id, "done")}
            moveLabel="Mark Done"
            onTaskClick={(t) => setActiveTask(t)}
            onDropTask={handleMoveStatus}
          />

          <KanbanColumn
            title="Done"
            status="done"
            dotColorClass="bg-green-500"
            tasks={tasks.done}
            onMove={(id) => handleMoveStatus(id, "todo")}
            moveLabel="Reopen"
            onTaskClick={(t) => setActiveTask(t)}
            onDropTask={handleMoveStatus}
          />
        </div>
      )}

      {/* Modals */}
      {showCreateProject && (
        <CreateProjectModal
          orgId={currentOrg?._id}
          onClose={() => setShowCreateProject(false)}
          onProjectCreated={(newProject) => {
            setProjects((prev) => [newProject, ...prev]);
            setSelectedProjectId(newProject._id);
            if (newProject.team?._id) {
              setSelectedTeamId(newProject.team._id);
            }
            toast.success(`Project "${newProject.name}" created!`);
          }}
        />
      )}

      {showCreateTask && (
        <CreateTaskModal
          orgId={currentOrg?._id}
          selectedProjectId={selectedProjectId}
          projects={displayedProjects.length > 0 ? displayedProjects : projects}
          onClose={() => setShowCreateTask(false)}
          onTaskCreated={(newTask) => {
            setTasks((prev) => ({
              ...prev,
              todo: [newTask, ...prev.todo],
            }));
            toast.success(`Task "${newTask.taskKey}" created!`);
          }}
        />
      )}

      {activeTask && (
        <TaskDetailModal
          task={activeTask}
          orgId={currentOrg?._id}
          currentProject={currentProject}
          onClose={() => setActiveTask(null)}
          onTaskUpdated={(updated) => {
            setActiveTask(updated);
            setTasks((prev) => ({
              todo: prev.todo.map((t) => (t._id === updated._id ? updated : t)),
              in_progress: prev.in_progress.map((t) => (t._id === updated._id ? updated : t)),
              done: prev.done.map((t) => (t._id === updated._id ? updated : t)),
            }));
          }}
          onTaskDeleted={(deletedId) => {
            setActiveTask(null);
            setTasks((prev) => ({
              todo: prev.todo.filter((t) => t._id !== deletedId),
              in_progress: prev.in_progress.filter((t) => t._id !== deletedId),
              done: prev.done.filter((t) => t._id !== deletedId),
            }));
          }}
        />
      )}
    </div>
  );
};

export default KanbanPage;
