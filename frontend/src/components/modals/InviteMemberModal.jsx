import { useState, useEffect } from "react";
import Modal from "../common/Modal";
import CustomSelect from "../common/CustomSelect";
import api from "../../services/api";
import { ENDPOINTS } from "../../services/urls";

const InviteMemberModal = ({ orgId, onClose, onMemberInvited }) => {
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!orgId) return;

    const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
        const res = await api.get(ENDPOINTS.ORGANIZATIONS.ROLES(orgId));
        const roles = res.data.data || [];
        // Filter out owner role (cannot invite someone as owner)
        const assignable = roles.filter((r) => r.name?.toLowerCase() !== "owner");
        setAvailableRoles(assignable);

        // Default to 'member' role
        const defaultRole = assignable.find((r) => r.name?.toLowerCase() === "member") || assignable[0];
        if (defaultRole) {
          setRoleId(defaultRole._id);
        }
      } catch (err) {
        console.error("Failed to load roles:", err);
      } finally {
        setLoadingRoles(false);
      }
    };

    fetchRoles();
  }, [orgId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !roleId) return;

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await api.post(ENDPOINTS.ORGANIZATIONS.INVITATIONS(orgId), {
        email: email.trim(),
        roleId,
      });

      setSuccess(res.data.message || "Invitation sent successfully via email!");
      if (onMemberInvited) onMemberInvited();
      setTimeout(() => onClose(), 1800);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = availableRoles.map((r) => ({
    value: r._id,
    label: `${r.name.charAt(0).toUpperCase() + r.name.slice(1)} ${
      r.description ? `— ${r.description}` : ""
    }`,
  }));

  return (
    <Modal title="Invite Member to Workspace" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 text-xs text-green-700 dark:text-green-300">
            {success}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
            Member Email Address *
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100"
          />
        </div>

        <CustomSelect
          label="Initial Workspace Role"
          value={roleId}
          disabled={loadingRoles}
          onChange={(val) => setRoleId(val)}
          options={roleOptions}
          placeholder={loadingRoles ? "Loading roles..." : "Select role"}
        />

        <button
          type="submit"
          disabled={loading || loadingRoles || !email.trim() || !roleId}
          className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white disabled:opacity-50 font-medium rounded-lg text-sm transition-colors shadow-xs cursor-pointer"
        >
          {loading ? "Sending Invitation..." : "Send Invitation"}
        </button>
      </form>
    </Modal>
  );
};

export default InviteMemberModal;
