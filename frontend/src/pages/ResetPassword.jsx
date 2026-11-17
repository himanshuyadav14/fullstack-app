import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { ENDPOINTS } from "../services/urls";
import validate from "../utils/validate";
import ThemeToggle from "../components/common/ThemeToggle";
import OrbitLogo from "../components/common/OrbitLogo";
import { EyeOpenIcon, EyeClosedIcon } from "../components/common/EyeIcons";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({
    token: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    setSuccessMessage("");

    const tokenErr = !token.trim() ? "Reset token is required" : "";
    const passwordErr = validate.password(newPassword);
    const confirmErr = validate.confirmPassword(confirmPassword, newPassword);

    setErrors({
      token: tokenErr,
      newPassword: passwordErr || "",
      confirmPassword: confirmErr || "",
    });

    if (tokenErr || passwordErr || confirmErr) return;

    setLoading(true);
    try {
      const res = await api.post(ENDPOINTS.AUTH.RESET_PASSWORD, {
        token: token.trim(),
        newPassword,
      });

      if (res.data?.success) {
        setSuccessMessage(
          res.data.message || "Password has been reset successfully! Redirecting to login...",
        );
        setTimeout(() => navigate("/login"), 2500);
      }
    } catch (err) {
      setApiError(
        err.response?.data?.message ||
          "Failed to reset password. The token may be invalid or expired.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 relative">
      {/* Theme Toggle Button */}
      <ThemeToggle className="absolute top-5 right-5" />

      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-13 h-13 rounded-2xl bg-zinc-950 dark:bg-zinc-800 border border-zinc-800 dark:border-zinc-700 flex items-center justify-center text-white shadow-md">
              <OrbitLogo className="w-7 h-7" />
            </div>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Set New Password</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Choose a strong new password to protect your account
          </p>
        </div>

        {apiError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400">
            {apiError}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 text-sm text-green-700 dark:text-green-300">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {!tokenFromUrl && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
                Reset Token
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setErrors((prev) => ({ ...prev, token: "" }));
                }}
                placeholder="Paste token from email"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white dark:bg-zinc-800/80 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 ${
                  errors.token
                    ? "border-red-500 dark:border-red-500"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              />
              {errors.token && <p className="text-xs text-red-500 mt-1">{errors.token}</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, newPassword: "" }));
                }}
                placeholder="Min 8 characters"
                className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm bg-white dark:bg-zinc-800/80 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 ${
                  errors.newPassword
                    ? "border-red-500 dark:border-red-500"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer p-0.5"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.newPassword}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                }}
                placeholder="Confirm password"
                className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm bg-white dark:bg-zinc-800/80 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 ${
                  errors.confirmPassword
                    ? "border-red-500 dark:border-red-500"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer p-0.5"
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-xs text-sm cursor-pointer mt-2"
          >
            {loading ? "Updating password..." : "Update Password"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mt-6">
          Remembered your password?{" "}
          <Link
            to="/login"
            className="font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
