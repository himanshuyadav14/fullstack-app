import { useState, useEffect } from "react";
import { useOrgStore } from "../stores/orgStore";
import CreateTeamModal from "../components/modals/CreateTeamModal";
import api from "../services/api";
import { ENDPOINTS } from "../services/urls";

const TeamsPage = () => {
  const { currentOrg, currentRole } = useOrgStore();

  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = async () => {
    if (!currentOrg?._id) return;
    setLoading(true);
    try {
      const [teamsRes, projectsRes] = await Promise.all([
        api.get(ENDPOINTS.TEAMS.LIST_CREATE(currentOrg._id)),
        api.get(ENDPOINTS.PROJECTS.LIST_CREATE(currentOrg._id)),
      ]);
      setTeams(teamsRes.data.data || []);
      setProjects(projectsRes.data.data || []);
    } catch (err) {
      console.error("Failed to load teams or projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentOrg?._id]);

  const isOwnerOrAdmin =
    currentRole === "owner" || currentRole === "admin" || currentRole === "manager";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Teams & Departments</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Organize members into functional squads and assign projects for{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">
              {currentOrg?.name}
            </strong>
          </p>
        </div>

        {isOwnerOrAdmin && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="py-2 px-4 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white font-medium rounded-lg text-sm transition-colors shadow-2xs cursor-pointer"
          >
            + New Team
          </button>
        )}
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="py-20 text-center text-sm text-zinc-500">
          Loading teams & squads...
        </div>
      ) : teams.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <h3 className="text-base font-bold mb-1">No Teams Created Yet</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 max-w-sm mx-auto">
            Create cross-functional teams like "Engineering", "Design", or "Product" to own projects and collaborate on tasks.
          </p>
          {isOwnerOrAdmin && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="py-2.5 px-6 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white font-medium rounded-lg text-sm shadow-2xs cursor-pointer"
            >
              Create First Team
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((t) => {
            const teamProjects = projects.filter(
              (p) => p.team?._id === t._id || p.team === t._id
            );
            const memberCount = t.memberCount ?? t.members?.length ?? 0;

            return (
              <div
                key={t._id}
                className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                      {t.name}
                    </h4>
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
                      {memberCount} {memberCount === 1 ? "member" : "members"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3">
                    {t.description || "No description provided."}
                  </p>

                  {/* Assigned Projects */}
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                      Assigned Projects ({teamProjects.length})
                    </div>
                    {teamProjects.length === 0 ? (
                      <span className="text-xs text-zinc-400 italic">
                        No projects assigned to this team yet.
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {teamProjects.map((p) => (
                          <span
                            key={p._id}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700"
                          >
                            <span>{p.name}</span>
                            <span className="font-mono text-[10px] text-zinc-500">
                              ({p.key})
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Team Members Avatar Stack */}
                  {Array.isArray(t.members) && t.members.length > 0 && (
                    <div className="flex items-center gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                        Squad Members:
                      </span>
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {t.members.slice(0, 5).map((m) => {
                          const mName = m?.name || (typeof m === "string" ? "User" : "Member");
                          return (
                            <div
                              key={m?._id || m}
                              title={mName}
                              className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-800 dark:text-zinc-200 shadow-2xs"
                            >
                              {mName.charAt(0).toUpperCase()}
                            </div>
                          );
                        })}
                        {t.members.length > 5 && (
                          <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[9px] font-medium text-zinc-500">
                            +{t.members.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {t.lead && (
                  <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                    <span>
                      Team Lead:{" "}
                      <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">
                        {t.lead.name}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <CreateTeamModal
          orgId={currentOrg?._id}
          onClose={() => setShowCreateModal(false)}
          onTeamCreated={(newTeam) => setTeams((prev) => [...prev, newTeam])}
        />
      )}
    </div>
  );
};

export default TeamsPage;
