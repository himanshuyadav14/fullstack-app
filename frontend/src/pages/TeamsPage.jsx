import { useState, useEffect } from "react";
import { useOrgStore } from "../stores/orgStore";
import CreateTeamModal from "../components/modals/CreateTeamModal";
import api from "../services/api";
import { ENDPOINTS } from "../services/urls";

const TeamsPage = () => {
  const { currentOrg, currentRole } = useOrgStore();

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadTeams = async () => {
    if (!currentOrg?._id) return;
    setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.TEAMS.LIST_CREATE(currentOrg._id));
      setTeams(res.data.data || []);
    } catch (err) {
      console.error("Failed to load teams:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, [currentOrg?._id]);

  const isOwnerOrAdmin =
    currentRole === "owner" || currentRole === "admin" || currentRole === "manager";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Teams & Departments</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            Organize members into functional squads for{" "}
            <strong className="text-blue-600 dark:text-blue-400">
              {currentOrg?.name}
            </strong>
          </p>
        </div>

        {isOwnerOrAdmin && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors shadow-xs cursor-pointer"
          >
            + New Team
          </button>
        )}
      </div>

      {/* Teams Grid */}
      {loading ? (
        <div className="py-20 text-center text-sm text-slate-500">
          Loading team squads...
        </div>
      ) : teams.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs">
          <div className="text-4xl mb-3">🛡️</div>
          <h3 className="text-base font-bold mb-1">No Teams Created Yet</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6 max-w-sm mx-auto">
            Create cross-functional teams like "Engineering", "Design", or "Growth" to organize assignments.
          </p>
          {isOwnerOrAdmin && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-xs cursor-pointer"
            >
              + Create First Team
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((t) => (
            <div
              key={t._id}
              className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between gap-3 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-base font-bold tracking-tight text-slate-800 dark:text-zinc-100">
                    🛡️ {t.name}
                  </h4>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                    {t.members?.length || 0} members
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  {t.description || "No description provided."}
                </p>
              </div>

              {t.lead && (
                <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 text-xs text-slate-500 dark:text-zinc-400">
                  Team Lead: <span className="font-semibold text-slate-700 dark:text-zinc-300">{t.lead.name}</span>
                </div>
              )}
            </div>
          ))}
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
