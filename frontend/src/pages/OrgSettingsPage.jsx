import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { ENDPOINTS } from "../services/urls";
import { useOrgStore } from "../stores/orgStore";
import { useAuthStore } from "../stores/authStore";
import CustomSelect from "../components/common/CustomSelect";
import { confirm } from "../stores/confirmStore";

const card =
  "p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs";
const label = "text-[11px] font-bold uppercase tracking-wider text-zinc-400";

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" }) : "—";

const OrgSettingsPage = () => {
  const navigate = useNavigate();
  const { currentOrg, fetchMyOrgs } = useOrgStore();
  const { user } = useAuthStore();

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const [members, setMembers] = useState([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const orgId = currentOrg?._id;
  const myRole = details?.currentUserMembership?.role;
  const isOwner = myRole?.name === "owner";

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(ENDPOINTS.ORGANIZATIONS.GET_BY_ID(orgId));
        if (!cancelled) setDetails(res.data.data);
      } catch (err) {
        if (!cancelled) toast.error(err.response?.data?.message || "Failed to load workspace");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  // Candidates for ownership transfer (only needed by the owner)
  useEffect(() => {
    if (!orgId || !isOwner) return;
    api
      .get(ENDPOINTS.ORGANIZATIONS.MEMBERS(orgId), { params: { limit: 50 } })
      .then((res) => setMembers(res.data.data || []))
      .catch(() => setMembers([]));
  }, [orgId, isOwner]);

  const org = details?.organization;
  const transferCandidates = members.filter((m) => m.user?._id && m.user._id !== user?._id);
  const nameMatches = org && confirmName.trim() === org.name;

  const handleTransfer = async () => {
    if (!targetUserId || !nameMatches) return;
    const target = transferCandidates.find((m) => m.user._id === targetUserId);
    const ok = await confirm({
      title: `Make ${target?.user?.name} the owner?`,
      message: `They'll get full control of ${org.name} and you'll become an Admin. Only the new owner can undo this.`,
      confirmLabel: "Transfer Ownership",
    });
    if (!ok) return;
    setTransferring(true);
    try {
      const res = await api.post(ENDPOINTS.ORGANIZATIONS.TRANSFER_OWNERSHIP(orgId), {
        targetUserId,
      });
      toast.success(res.data.message || `Ownership transferred to ${target?.user?.name}`);
      // Our role changed to admin; refresh org list and this page's details
      await fetchMyOrgs();
      const refreshed = await api.get(ENDPOINTS.ORGANIZATIONS.GET_BY_ID(orgId));
      setDetails(refreshed.data.data);
      setTargetUserId("");
      setConfirmName("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to transfer ownership");
    } finally {
      setTransferring(false);
    }
  };

  const handleLeave = async () => {
    const ok = await confirm({
      title: `Leave ${org?.name}?`,
      message: "You'll lose access to its teams, projects and tasks, and need a new invitation to rejoin.",
      confirmLabel: "Leave Workspace",
    });
    if (!ok) return;
    setLeaving(true);
    try {
      await api.post(ENDPOINTS.ORGANIZATIONS.LEAVE(orgId));
      toast.success(`You left ${org?.name}`);
      await fetchMyOrgs();
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to leave workspace");
      setLeaving(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-sm text-zinc-500">Loading workspace settings...</div>;
  }

  if (!org) {
    return <div className="py-20 text-center text-sm text-zinc-500">Workspace not found.</div>;
  }

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Workspace Settings</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Details and ownership for <strong className="text-zinc-900 dark:text-zinc-100">{org.name}</strong>
        </p>
      </div>

      {/* Workspace profile */}
      <div className={card}>
        <div className="flex items-center gap-4 mb-5">
          {org.logo ? (
            <img src={org.logo} alt="" className="w-14 h-14 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-zinc-950 dark:bg-zinc-800 text-white flex items-center justify-center text-xl font-bold">
              {org.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-lg font-bold truncate">{org.name}</h3>
            <p className="text-xs font-mono text-zinc-500">/{org.slug}</p>
          </div>
        </div>

        {org.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed mb-5">{org.description}</p>
        )}

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <dt className={label}>Industry</dt>
            <dd className="text-sm font-medium mt-1 capitalize">{org.industry || "—"}</dd>
          </div>
          <div>
            <dt className={label}>Team size</dt>
            <dd className="text-sm font-medium mt-1">{org.teamSize || "—"}</dd>
          </div>
          <div>
            <dt className={label}>Created</dt>
            <dd className="text-sm font-medium mt-1">{formatDate(org.createdAt)}</dd>
          </div>
          <div>
            <dt className={label}>Status</dt>
            <dd className="text-sm font-medium mt-1 capitalize">{org.status}</dd>
          </div>
        </dl>
      </div>

      {/* Your membership */}
      <div className={card}>
        <h3 className="text-sm font-bold mb-4">Your Membership</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className={label}>Role</dt>
            <dd className="text-sm font-medium mt-1 capitalize">{myRole?.name || "—"}</dd>
          </div>
          <div>
            <dt className={label}>Joined</dt>
            <dd className="text-sm font-medium mt-1">{formatDate(details.currentUserMembership?.joinedAt)}</dd>
          </div>
        </dl>
        {myRole?.permissions?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className={`${label} mb-2`}>Your permissions</div>
            <div className="flex flex-wrap gap-1.5">
              {myRole.permissions.map((p) => (
                <span
                  key={p}
                  className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className={`${card} border-red-200 dark:border-red-900/60`}>
        <h3 className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">Danger Zone</h3>

        {isOwner ? (
          <div className="space-y-3 mt-3">
            <div>
              <div className="text-sm font-semibold">Transfer ownership</div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                The new owner gets full control. You'll become an Admin. As owner you can't leave the
                workspace until you transfer it.
              </p>
            </div>

            {transferCandidates.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">
                Invite at least one other member before you can transfer ownership.
              </p>
            ) : (
              <>
                <CustomSelect
                  value={targetUserId}
                  onChange={setTargetUserId}
                  placeholder="Choose the new owner"
                  options={transferCandidates.map((m) => ({
                    value: m.user._id,
                    label: `${m.user.name} (${m.role?.name || "member"})`,
                    avatar: m.user.name?.charAt(0) || "U",
                  }))}
                />
                <div>
                  <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                    Type <strong className="text-zinc-900 dark:text-zinc-100">{org.name}</strong> to confirm
                  </label>
                  <input
                    type="text"
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
                <button
                  type="button"
                  disabled={!targetUserId || !nameMatches || transferring}
                  onClick={handleTransfer}
                  className="py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-40 cursor-pointer transition-colors"
                >
                  {transferring ? "Transferring..." : "Transfer Ownership"}
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
            <div>
              <div className="text-sm font-semibold">Leave workspace</div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                You'll lose access to its teams, projects and tasks.
              </p>
            </div>
            <button
              type="button"
              disabled={leaving}
              onClick={handleLeave}
              className="py-2 px-4 rounded-lg border border-red-300 dark:border-red-900 bg-red-50/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 text-sm font-medium cursor-pointer disabled:opacity-50"
            >
              {leaving ? "Leaving..." : "Leave Workspace"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrgSettingsPage;
