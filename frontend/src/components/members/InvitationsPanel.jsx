import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { ENDPOINTS } from "../../services/urls";
import { confirm } from "../../stores/confirmStore";

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900",
  rejected: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
  revoked: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900",
  expired: "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700",
};

// A pending invite past its expiry is effectively expired even if not swept yet
const effectiveStatus = (inv) =>
  inv.status === "pending" && new Date(inv.expiresAt) <= new Date() ? "expired" : inv.status;

/**
 * Lists the organization's invitations and lets authorized members revoke pending ones.
 * `reloadKey` changes whenever a new invite is sent so the list refreshes.
 */
const InvitationsPanel = ({ orgId, canRevoke, reloadKey, onCountChange }) => {
  const [invitations, setInvitations] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [filter, setFilter] = useState("pending"); // "pending" | "all"

  const load = async (targetPage = page) => {
    if (!orgId) return;
    setLoading(true);
    try {
      const res = await api.get(ENDPOINTS.ORGANIZATIONS.INVITATIONS(orgId), {
        params: { page: targetPage, limit: 20 },
      });
      setInvitations(res.data.data || []);
      setTotalPages(res.data.totalPages || 1);
      setPage(targetPage);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load invitations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, [orgId, reloadKey]);

  const pendingCount = invitations.filter((i) => effectiveStatus(i) === "pending").length;
  useEffect(() => {
    if (onCountChange) onCountChange(pendingCount);
  }, [pendingCount]);

  const handleRevoke = async (inv) => {
    const ok = await confirm({
      title: "Revoke invitation?",
      message: `The link sent to ${inv.email} will stop working. You can invite them again afterwards.`,
      confirmLabel: "Revoke",
    });
    if (!ok) return;
    setRevokingId(inv._id);
    try {
      await api.delete(ENDPOINTS.ORGANIZATIONS.REVOKE_INVITATION(orgId, inv._id));
      setInvitations((prev) =>
        prev.map((i) => (i._id === inv._id ? { ...i, status: "revoked" } : i)),
      );
      toast.success(`Invitation to ${inv.email} revoked`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to revoke invitation");
    } finally {
      setRevokingId(null);
    }
  };

  const visible =
    filter === "pending"
      ? invitations.filter((i) => effectiveStatus(i) === "pending")
      : invitations;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Invitations expire after 7 days. Revoke one to re-invite the same email right away.
        </p>
        <div className="flex items-center gap-1 p-0.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-lg shrink-0">
          {["pending", "all"].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold capitalize cursor-pointer transition-colors ${
                filter === f
                  ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 shadow-2xs"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-zinc-500">Loading invitations...</div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-500">
            {filter === "pending" ? "No pending invitations." : "No invitations sent yet."}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {visible.map((inv) => {
              const status = effectiveStatus(inv);
              return (
                <div key={inv._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 truncate">
                      {inv.email}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Role <span className="font-medium capitalize">{inv.role?.name || "—"}</span>
                      {" · "}Invited by {inv.invitedBy?.name || "someone"}
                      {" · "}
                      {status === "pending"
                        ? `expires ${new Date(inv.expiresAt).toLocaleDateString([], { month: "short", day: "numeric" })}`
                        : new Date(inv.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${STATUS_STYLES[status] || STATUS_STYLES.expired}`}
                    >
                      {status}
                    </span>
                    {canRevoke && status === "pending" && (
                      <button
                        type="button"
                        disabled={revokingId === inv._id}
                        onClick={() => handleRevoke(inv)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {revokingId === inv._id ? "Revoking..." : "Revoke"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => load(page - 1)}
            className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 disabled:opacity-40 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => load(page + 1)}
            className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 disabled:opacity-40 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default InvitationsPanel;
