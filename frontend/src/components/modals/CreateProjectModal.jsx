import { useState, useEffect } from "react";
import Modal from "../common/Modal";
import CustomSelect from "../common/CustomSelect";
import CreateTeamModal from "./CreateTeamModal";
import api from "../../services/api";
import { ENDPOINTS } from "../../services/urls";

const CreateProjectModal = ({ orgId, onClose, onProjectCreated }) => {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState("");
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [error, setError] = useState("");

  const fetchTeams = async () => {
    if (!orgId) return;
    setLoadingTeams(true);
    try {
      const res = await api.get(ENDPOINTS.TEAMS.LIST_CREATE(orgId));
      const fetchedTeams = res.data.data || [];
      setTeams(fetchedTeams);
      if (fetchedTeams.length > 0 && !teamId) {
        setTeamId(fetchedTeams[0]._id);
      }
    } catch (err) {
      console.error("Failed to load teams:", err);
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [orgId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !key.trim() || !teamId) {
      if (!teamId) setError("Please select a team. Every project must belong to a team.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        key: key.trim().toUpperCase(),
        description: description.trim(),
        teamId,
      };

      const res = await api.post(ENDPOINTS.PROJECTS.LIST_CREATE(orgId), payload);

      if (onProjectCreated) {
        onProjectCreated(res.data.data);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  const teamOptions = teams.map((t) => ({
    value: t._id,
    label: `${t.name} (${t.members?.length || 0} members)`,
  }));

  return (
    <>
      <Modal title="Create New Project" onClose={onClose} maxWidth="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* If no teams exist, show requirement banner */}
          {!loadingTeams && teams.length === 0 && (
            <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs flex flex-col gap-2">
              <span className="font-semibold">
                No teams found in this workspace. Every project must belong to a team.
              </span>
              <button
                type="button"
                onClick={() => setShowCreateTeamModal(true)}
                className="self-start px-3 py-1.5 rounded-lg bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 font-medium text-xs cursor-pointer shadow-2xs"
              >
                + Create Team First
              </button>
            </div>
          )}

          {/* Assigned Team * */}
          <CustomSelect
            label="Assigned Team *"
            value={teamId}
            disabled={loadingTeams || teams.length === 0}
            onChange={(val) => setTeamId(val)}
            options={teamOptions}
            placeholder={loadingTeams ? "Loading teams..." : "Select team *"}
            helperText="Every project is scoped to a functional team (e.g. Engineering, Design, Security)"
          />

          {/* Project Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!key) {
                  const suggested = e.target.value
                    .replace(/[^a-zA-Z]/g, "")
                    .slice(0, 3)
                    .toUpperCase();
                  setKey(suggested);
                }
              }}
              placeholder="e.g. Website Redesign"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100"
            />
          </div>

          {/* Project Key */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
              Project Key * (2-6 letters, e.g. "WEB", "AUTH")
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="WEB"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm font-mono uppercase focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Scope, objectives, and goals..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !name.trim() || !key.trim() || !teamId}
            className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white disabled:opacity-50 font-medium rounded-lg text-sm transition-colors shadow-xs cursor-pointer"
          >
            {loading ? "Creating..." : "Create Project"}
          </button>
        </form>
      </Modal>

      {showCreateTeamModal && (
        <CreateTeamModal
          orgId={orgId}
          onClose={() => setShowCreateTeamModal(false)}
          onTeamCreated={(newTeam) => {
            setTeams((prev) => [...prev, newTeam]);
            setTeamId(newTeam._id);
            setShowCreateTeamModal(false);
          }}
        />
      )}
    </>
  );
};

export default CreateProjectModal;
