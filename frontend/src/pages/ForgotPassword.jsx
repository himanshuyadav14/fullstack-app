import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { ENDPOINTS } from "../services/urls";
import validate from "../utils/validate";
import ThemeToggle from "../components/common/ThemeToggle";
import OrbitLogo from "../components/common/OrbitLogo";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    setError("");

    const emailErr = validate.email(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        email: email.trim(),
      });
      if (res.data?.success) {
        setSubmitted(true);
        toast.success("Password reset email sent!");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Failed to process password reset request. Please try again.";
      setApiError(msg);
      toast.error(msg);
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
          <h2 className="text-2xl font-bold tracking-tight">Forgot Password?</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Enter your registered email to receive a password reset link
          </p>
        </div>

        {apiError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400">
            {apiError}
          </div>
        )}

        {submitted ? (
          <div className="text-center space-y-4">
            <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
              If an account with <strong className="font-semibold text-zinc-950 dark:text-zinc-100">{email}</strong> exists, a password reset link has been dispatched to your inbox.
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              The link expires in 15 minutes. Please check your spam folder if you do not receive it.
            </p>
            <Link
              to="/login"
              className="inline-block py-2.5 px-6 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white font-medium rounded-lg transition-colors text-sm shadow-xs cursor-pointer"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="name@company.com"
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white dark:bg-zinc-800/80 transition-colors focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 ${
                  error
                    ? "border-red-500 dark:border-red-500"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-xs text-sm cursor-pointer"
            >
              {loading ? "Sending link..." : "Send Reset Link"}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 transition-colors"
              >
                ← Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
