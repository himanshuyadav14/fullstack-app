import { useState, useEffect } from "react";
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

  // 1. Load Projects on Workspace change
  useEffect(() => {
    if (!currentOrg?._id) return;

    const fetchProjects = async () => {
      try {
        const res = await api.get(ENDPOINTS.PROJECTS.LIST_CREATE(currentOrg._id));
        const projs = res.data.data || [];
        setProjects(projs);
        if (projs.length > 0 && !selectedProjectId) {
          setSelectedProjectId(projs[0]._id);
        }
      } catch (err) {
        console.error("Failed to load projects:", err);
      }
    };

    fetchProjects();
  }, [currentOrg?._id]);

  // 2. Load Kanban Tasks when project changes
  const loadKanbanTasks = async (pId) => {
    if (!currentOrg?._id || !pId) return;

    setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.PROJECTS.KANBAN_TASKS(currentOrg._id, pId));
      const kanbanCols = res.data.data || {};
      setTasks({
        todo: kanbanCols.todo || [],
        in_progress: kanbanCols.in_progress || [],
        done: kanbanCols.done || [],
      });
    } catch (err) {
      console.error("Failed to load kanban tasks:", err);
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

    socket.on("task:created", onTaskCreated);
    socket.on("task:status_changed", onStatusChanged);

    return () => {
      socket.off("task:created", onTaskCreated);
      socket.off("task:status_changed", onStatusChanged);
      socket.emit("leave:project", selectedProjectId);
    };
  }, [selectedProjectId]);

  // Move task status via API
  const handleMoveStatus = async (taskId, newStatus) => {
    try {
      await api.put(ENDPOINTS.TASKS.UPDATE_STATUS(currentOrg._id, taskId), {
        status: newStatus,
      });
      loadKanbanTasks(selectedProjectId);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Project:
          </label>
          {projects.length > 0 ? (
            <CustomSelect
              size="sm"
              value={selectedProjectId}
              onChange={(val) => setSelectedProjectId(val)}
              options={projects.map((p) => ({
                value: p._id,
                label: `${p.name} (${p.key})`,
              }))}
              className="min-w-[190px]"
            />
          ) : (
            <span className="text-xs text-slate-400">No projects created yet</span>
          )}

          <button
            type="button"
            onClick={() => setShowCreateProject(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-dashed border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors cursor-pointer"
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

      {/* Kanban Board Columns */}
      {loading ? (
        <div className="py-20 text-center text-sm text-zinc-500">
          Syncing Kanban tasks...
        </div>
      ) : projects.length === 0 ? (
        <div className="max-w-md mx-auto my-16 p-8 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl">
          <h3 className="text-lg font-bold mb-2">No Projects Found</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
            Create your first project to start tracking tasks and sprints on the Kanban board.
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
        <div className="flex gap-5 overflow-x-auto pb-4">
          <KanbanColumn
            title="To Do"
            dotColorClass="bg-slate-400 dark:bg-slate-500"
            tasks={tasks.todo}
            onMove={(id) => handleMoveStatus(id, "in_progress")}
            moveLabel="Start"
            onTaskClick={(t) => setActiveTask(t)}
          />

          <KanbanColumn
            title="In Progress"
            dotColorClass="bg-amber-500"
            tasks={tasks.in_progress}
            onMove={(id) => handleMoveStatus(id, "done")}
            moveLabel="Mark Done"
            onTaskClick={(t) => setActiveTask(t)}
          />

          <KanbanColumn
            title="Done"
            dotColorClass="bg-green-500"
            tasks={tasks.done}
            onTaskClick={(t) => setActiveTask(t)}
          />
        </div>
      )}

      {/* Task Detail Modal */}
      {activeTask && (
        <TaskDetailModal
          task={activeTask}
          orgId={currentOrg?._id}
          onClose={() => setActiveTask(null)}
          onTaskUpdated={() => loadKanbanTasks(selectedProjectId)}
          onTaskDeleted={() => {
            setActiveTask(null);
            loadKanbanTasks(selectedProjectId);
          }}
        />
      )}

      {/* Create Project Modal */}
      {showCreateProject && (
        <CreateProjectModal
          orgId={currentOrg?._id}
          onClose={() => setShowCreateProject(false)}
          onProjectCreated={(newProj) => {
            setProjects((prev) => [...prev, newProj]);
            setSelectedProjectId(newProj._id);
          }}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal
          orgId={currentOrg?._id}
          selectedProjectId={selectedProjectId}
          projects={projects}
          onClose={() => setShowCreateTask(false)}
          onTaskCreated={() => loadKanbanTasks(selectedProjectId)}
        />
      )}
    </div>
  );
};

export default KanbanPage;
