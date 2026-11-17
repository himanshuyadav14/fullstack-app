import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { ENDPOINTS } from "../services/urls";
import { useAuthStore } from "../stores/authStore";
import { useOrgStore } from "../stores/orgStore";
import { confirm } from "../stores/confirmStore";
import ThemeToggle from "../components/common/ThemeToggle";
import OrbitLogo from "../components/common/OrbitLogo";

// Survives the login/signup/verify detour; AppLayout picks it up after sign-in.
import { PENDING_INVITE_KEY } from "../utils/pendingInvite";

const primaryBtn =
  "w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-xs text-sm cursor-pointer text-center block";
const secondaryBtn =
  "w-full py-2.5 px-4 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 font-medium rounded-lg transition-colors text-sm cursor-pointer text-center block";

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const { isAuthenticated, user, logout } = useAuthStore();
  const { fetchMyOrgs, setCurrentOrg, clearOrg } = useOrgStore();

  const [busy, setBusy] = useState(null); // "accept" | "reject" | null
  const [error, setError] = useState("");
  const [emailMismatch, setEmailMismatch] = useState(false);

  const rememberInvite = () => {
    try {
      localStorage.setItem(PENDING_INVITE_KEY, token);
    } catch {
      // storage unavailable: user can reopen the email link after signing in
    }
  };

  const handleAccept = async () => {
    setBusy("accept");
    setError("");
    setEmailMismatch(false);
    try {
      const res = await api.post(ENDPOINTS.INVITATIONS.ACCEPT, { token });
      const joinedOrgId = res.data.data?.organization?._id;

      await fetchMyOrgs();
      const joined = useOrgStore.getState().userOrgs.find((o) => o._id === joinedOrgId);
      if (joined) setCurrentOrg(joined);

      toast.success(res.data.message || "Invitation accepted!");
      navigate("/", { replace: true });
    } catch (err) {
      const status = err.response?.status;
      setError(err.response?.data?.message || "Failed to accept invitation.");
      if (status === 403) setEmailMismatch(true);
      setBusy(null);
    }
  };

  const handleReject = async () => {
    const ok = await confirm({
      title: "Decline this invitation?",
      message: "You'll need a new invitation to join this workspace later.",
      confirmLabel: "Decline",
    });
    if (!ok) return;
    setBusy("reject");
    setError("");
    try {
      await api.post(ENDPOINTS.INVITATIONS.REJECT, { token });
      toast.success("Invitation declined");
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to decline invitation.");
      setBusy(null);
    }
  };

  const handleSwitchAccount = () => {
    rememberInvite();
    clearOrg();
    logout();
    navigate("/login");
  };

  let body;

  if (!token) {
    body = (
      <>
        <p className="text-sm text-slate-500 dark:text-zinc-400 text-center">
          This invitation link is missing its token. Please open the link from your invitation email again.
        </p>
        <Link to="/" className={primaryBtn}>
          Go to Dashboard
        </Link>
      </>
    );
  } else if (!isAuthenticated) {
    body = (
      <>
        <p className="text-sm text-slate-500 dark:text-zinc-400 text-center leading-relaxed">
          Sign in with the email address this invitation was sent to. New here? Create an account with that email first.
        </p>
        <Link to="/login" onClick={rememberInvite} className={primaryBtn}>
          Sign In to Accept
        </Link>
        <Link to="/signup" onClick={rememberInvite} className={secondaryBtn}>
          Create Account
        </Link>
      </>
    );
  } else {
    body = (
      <>
        <p className="text-sm text-slate-500 dark:text-zinc-400 text-center">
          Signed in as <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{user?.email}</strong>
        </p>
        <button type="button" onClick={handleAccept} disabled={!!busy} className={primaryBtn}>
          {busy === "accept" ? "Joining workspace..." : "Accept Invitation"}
        </button>
        <button type="button" onClick={handleReject} disabled={!!busy} className={secondaryBtn}>
          {busy === "reject" ? "Declining..." : "Decline"}
        </button>
        {emailMismatch && (
          <button
            type="button"
            onClick={handleSwitchAccount}
            className="text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Sign in with a different account →
          </button>
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 relative">
      <ThemeToggle className="absolute top-5 right-5" />

      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-13 h-13 rounded-2xl bg-zinc-950 dark:bg-zinc-800 border border-zinc-800 dark:border-zinc-700 flex items-center justify-center text-white shadow-md">
              <OrbitLogo className="w-7 h-7" />
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Workspace Invitation</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            You've been invited to join a workspace on OrbitHQ
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="space-y-3">{body}</div>
      </div>
    </div>
  );
};

export default AcceptInvitation;
