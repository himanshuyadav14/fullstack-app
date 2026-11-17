import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import { ENDPOINTS } from "../../services/urls";
import { useOrgStore } from "../../stores/orgStore";
import { confirm } from "../../stores/confirmStore";

/**
 * Invitations addressed to the signed-in user, with in-app Accept / Decline.
 * Renders nothing when there are none, so it can sit on any page.
 */
const PendingInvitations = ({ className = "" }) => {
  const navigate = useNavigate();
  const { fetchMyOrgs, setCurrentOrg } = useOrgStore();
  const [invitations, setInvitations] = useState([]);
  const [busy, setBusy] = useState(null); // `${id}:accept` | `${id}:reject`

  useEffect(() => {
    let cancelled = false;
    api
      .get(ENDPOINTS.INVITATIONS.MY)
      .then((res) => {
        if (!cancelled) setInvitations(res.data.data || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const removeLocal = (id) => setInvitations((prev) => prev.filter((i) => i._id !== id));

  const handleAccept = async (inv) => {
    setBusy(`${inv._id}:accept`);
    try {
      const res = await api.post(ENDPOINTS.INVITATIONS.ACCEPT_BY_ID(inv._id));
      removeLocal(inv._id);
      await fetchMyOrgs();
      const joinedId = res.data.data?.organization?._id;
      const joined = useOrgStore.getState().userOrgs.find((o) => o._id === joinedId);
      if (joined) setCurrentOrg(joined);
      toast.success(res.data.message || `Joined ${inv.organization?.name}`);
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to accept invitation");
      // Already processed or expired: it won't succeed later either
      if ([400, 404].includes(err.response?.status)) removeLocal(inv._id);
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async (inv) => {
    const ok = await confirm({
      title: `Decline invitation to ${inv.organization?.name || "this workspace"}?`,
      message: "You'll need a new invitation to join later.",
      confirmLabel: "Decline",
    });
    if (!ok) return;
    setBusy(`${inv._id}:reject`);
    try {
      await api.post(ENDPOINTS.INVITATIONS.REJECT_BY_ID(inv._id));
      removeLocal(inv._id);
      toast.success("Invitation declined");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to decline invitation");
      if ([400, 404].includes(err.response?.status)) removeLocal(inv._id);
    } finally {
      setBusy(null);
    }
  };

  if (invitations.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 text-left">
        Pending invitations ({invitations.length})
      </div>
      {invitations.map((inv) => (
        <div
          key={inv._id}
          className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xs text-left"
        >
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {inv.organization?.name || "A workspace"}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {inv.invitedBy?.name || "Someone"} invited you as{" "}
              <span className="font-medium capitalize">{inv.role?.name || "member"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!!busy}
              onClick={() => handleReject(inv)}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
            >
              {busy === `${inv._id}:reject` ? "Declining..." : "Decline"}
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => handleAccept(inv)}
              className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white rounded-lg text-xs font-medium disabled:opacity-50 cursor-pointer"
            >
              {busy === `${inv._id}:accept` ? "Joining..." : "Accept"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PendingInvitations;
