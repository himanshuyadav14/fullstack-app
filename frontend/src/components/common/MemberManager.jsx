import { useState } from "react";
import CustomSelect from "./CustomSelect";
import UserAvatar from "./UserAvatar";
import { confirm } from "../../stores/confirmStore";

/**
 * Member list with add/remove, shared by team and project management.
 *
 * - canManage: may add anyone and remove anyone
 * - Everyone may remove themselves (backend allows self-removal)
 */
const MemberManager = ({
  members = [],
  leadId,
  candidates = [],
  canManage,
  currentUserId,
  onAdd,
  onRemove,
  emptyText = "No members yet.",
}) => {
  const [selected, setSelected] = useState("");
  const [busyId, setBusyId] = useState(null);

  const memberIds = new Set(members.map((m) => m._id));
  const addable = candidates.filter((u) => !memberIds.has(u._id));

  const handleAdd = async () => {
    if (!selected) return;
    setBusyId("add");
    const ok = await onAdd(selected);
    if (ok) setSelected("");
    setBusyId(null);
  };

  const handleRemove = async (user) => {
    const isSelf = user._id === currentUserId;
    const ok = await confirm(
      isSelf
        ? { title: "Leave?", message: "You'll be removed from this list. Someone with access can add you back.", confirmLabel: "Leave" }
        : { title: `Remove ${user.name}?`, message: "They stay in the workspace, just not in this list.", confirmLabel: "Remove" },
    );
    if (!ok) return;
    setBusyId(user._id);
    await onRemove(user._id);
    setBusyId(null);
  };

  return (
    <div className="space-y-3">
      {canManage && (
        <div className="flex items-center gap-2">
          <CustomSelect
            size="sm"
            value={selected}
            onChange={setSelected}
            placeholder={addable.length ? "Add a member..." : "Everyone is already added"}
            disabled={addable.length === 0 || busyId === "add"}
            options={addable.map((u) => ({
              value: u._id,
              label: u.name,
              avatar: u.name?.charAt(0) || "U",
            }))}
            className="flex-1"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selected || busyId === "add"}
            className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white rounded-lg text-xs font-medium disabled:opacity-40 cursor-pointer"
          >
            {busyId === "add" ? "Adding..." : "Add"}
          </button>
        </div>
      )}

      {members.length === 0 ? (
        <p className="text-xs text-zinc-400 italic">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 max-h-64 overflow-y-auto">
          {members.map((m) => {
            const isLead = leadId && m._id === leadId;
            const isSelf = m._id === currentUserId;
            const canRemove = canManage || isSelf;
            return (
              <li key={m._id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar user={m} size="xs" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">
                      {m.name}
                      {isSelf && <span className="text-zinc-400 font-normal"> (you)</span>}
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate">{m.email}</div>
                  </div>
                  {isLead && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                      Lead
                    </span>
                  )}
                </div>
                {canRemove && (
                  <button
                    type="button"
                    disabled={busyId === m._id}
                    onClick={() => handleRemove(m)}
                    className="text-[11px] text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer disabled:opacity-50"
                  >
                    {busyId === m._id ? "..." : isSelf ? "Leave" : "Remove"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default MemberManager;
