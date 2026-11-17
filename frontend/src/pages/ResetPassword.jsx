import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { ENDPOINTS } from "../services/urls";
import validate from "../utils/validate";
import { useThemeStore } from "../stores/themeStore";
import OrbitLogo from "../components/common/OrbitLogo";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get("token") || "";

  const { theme, toggleTheme } = useThemeStore();

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
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-5 right-5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
      >
        {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
      </button>

      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <OrbitLogo className="w-12 h-12" />
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
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white dark:bg-zinc-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.token
                    ? "border-red-500 dark:border-red-500"
                    : "border-slate-300 dark:border-zinc-700"
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
                className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm bg-white dark:bg-zinc-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.newPassword
                    ? "border-red-500 dark:border-red-500"
                    : "border-slate-300 dark:border-zinc-700"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 text-sm"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
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
                className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm bg-white dark:bg-zinc-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.confirmPassword
                    ? "border-red-500 dark:border-red-500"
                    : "border-slate-300 dark:border-zinc-700"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 text-sm"
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-sm text-sm cursor-pointer mt-2"
          >
            {loading ? "Updating password..." : "Update Password"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 dark:text-zinc-400 mt-6">
          Remembered your password?{" "}
          <Link
            to="/login"
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
