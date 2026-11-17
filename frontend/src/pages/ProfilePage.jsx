import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { ENDPOINTS } from "../services/urls";
import { useAuthStore } from "../stores/authStore";
import { useOrgStore } from "../stores/orgStore";
import UserAvatar from "../components/common/UserAvatar";
import { confirm } from "../stores/confirmStore";

const card =
  "p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs";
const input =
  "w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100";
const primaryBtn =
  "py-2 px-4 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 cursor-pointer";

const ACCEPTED_IMAGES = "image/jpeg,image/png,image/webp,image/gif";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuthStore();
  const { clearOrg } = useOrgStore();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const nameChanged = name.trim() && name.trim() !== user?.name;

  const handleSaveName = async (e) => {
    e.preventDefault();
    if (!nameChanged) return;
    setSavingName(true);
    try {
      const res = await api.patch(ENDPOINTS.USERS.PROFILE, { name: name.trim() });
      updateUser({ name: res.data.user?.name || name.trim() });
      toast.success("Name updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update name");
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    if (!ACCEPTED_IMAGES.split(",").includes(file.type)) {
      toast.error("Please choose a JPEG, PNG, WEBP or GIF image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5MB or smaller");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    setAvatarBusy(true);
    try {
      const res = await api.post(ENDPOINTS.USERS.AVATAR, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });
      updateUser({ avatar: res.data.avatar });
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload photo");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    const ok = await confirm({
      title: "Remove profile photo?",
      message: "Your initial will be shown instead.",
      confirmLabel: "Remove",
    });
    if (!ok) return;
    setAvatarBusy(true);
    try {
      await api.delete(ENDPOINTS.USERS.AVATAR);
      updateUser({ avatar: null });
      toast.success("Profile photo removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove photo");
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError("");
    if (!deletePassword) return;
    const ok = await confirm({
      title: "Delete your account?",
      message: "You'll be removed from every workspace and signed out. This cannot be undone.",
      confirmLabel: "Delete Account",
    });
    if (!ok) return;

    setDeleting(true);
    try {
      await api.delete(ENDPOINTS.USERS.PROFILE, { data: { password: deletePassword } });
      toast.success("Your account has been deleted");
      clearOrg();
      logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Failed to delete account");
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Your Profile</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          How you appear to teammates across all your workspaces
        </p>
      </div>

      {/* Photo */}
      <div className={`${card} flex flex-wrap items-center gap-5`}>
        <UserAvatar user={user} size="lg" />
        <div className="space-y-2">
          <div className="text-sm font-semibold">Profile photo</div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">JPEG, PNG, WEBP or GIF, up to 5MB.</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={avatarBusy}
              onClick={() => fileInputRef.current?.click()}
              className={primaryBtn}
            >
              {avatarBusy ? "Please wait..." : user?.avatar ? "Change Photo" : "Upload Photo"}
            </button>
            {user?.avatar && (
              <button
                type="button"
                disabled={avatarBusy}
                onClick={handleRemoveAvatar}
                className="py-2 px-3.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
              >
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGES}
            onChange={handleAvatarSelected}
            className="hidden"
          />
        </div>
      </div>

      {/* Details */}
      <form onSubmit={handleSaveName} className={`${card} space-y-4`}>
        <div className="text-sm font-semibold">Account details</div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
            Full name
          </label>
          <input
            type="text"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
            Email
          </label>
          <input type="email" value={user?.email || ""} disabled className={`${input} opacity-60 cursor-not-allowed`} />
        </div>
        <button type="submit" disabled={!nameChanged || savingName} className={primaryBtn}>
          {savingName ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Delete account */}
      <form onSubmit={handleDeleteAccount} className={`${card} border-red-200 dark:border-red-900/60 space-y-3`}>
        <div>
          <div className="text-sm font-bold text-red-600 dark:text-red-400">Delete account</div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            You'll be removed from every workspace. If you own a workspace, transfer its ownership
            first (Workspace Settings → Danger Zone).
          </p>
        </div>
        {deleteError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
            {deleteError}
          </div>
        )}
        <input
          type="password"
          value={deletePassword}
          onChange={(e) => setDeletePassword(e.target.value)}
          placeholder="Enter your password to confirm"
          autoComplete="current-password"
          className={input}
        />
        <button
          type="submit"
          disabled={!deletePassword || deleting}
          className="py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-40 cursor-pointer transition-colors"
        >
          {deleting ? "Deleting..." : "Delete My Account"}
        </button>
      </form>
    </div>
  );
};

export default ProfilePage;
