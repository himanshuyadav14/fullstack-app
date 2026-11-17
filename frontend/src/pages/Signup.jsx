import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import validate from "../utils/validate";
import { useAuthStore } from "../stores/authStore";
import { useThemeStore } from "../stores/themeStore";

const Signup = () => {
  const navigate = useNavigate();
  const { signup, loading } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [apiError, setApiError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    setSuccessMessage("");

    const nameError = validate.name(formData.name);
    const emailError = validate.email(formData.email);
    const passwordError = validate.password(formData.password);
    const confirmPasswordError = validate.confirmPassword(
      formData.confirmPassword,
      formData.password,
    );

    setErrors({
      name: nameError || "",
      email: emailError || "",
      password: passwordError || "",
      confirmPassword: confirmPasswordError || "",
    });

    if (nameError || emailError || passwordError || confirmPasswordError) return;

    const res = await signup({
      name: formData.name,
      email: formData.email,
      password: formData.password,
    });

    if (res.success) {
      setSuccessMessage(
        res.message || "Account registered successfully! Please check your email to verify.",
      );
      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      setTimeout(() => navigate("/login"), 2500);
    } else {
      setApiError(res.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 relative">
      {/* Theme Toggle Button */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-5 right-5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-sm"
      >
        {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
      </button>

      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-2xl mb-3">
            🚀
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Create Account</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Join TeamFlow to manage your projects seamlessly
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
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
              Redirecting to login shortly...
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, name: e.target.value }));
                setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="Alex Johnson"
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white dark:bg-zinc-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name
                  ? "border-red-500 dark:border-red-500"
                  : "border-slate-300 dark:border-zinc-700"
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, email: e.target.value }));
                setErrors((prev) => ({ ...prev, email: "" }));
              }}
              placeholder="alex@company.com"
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm bg-white dark:bg-zinc-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email
                  ? "border-red-500 dark:border-red-500"
                  : "border-slate-300 dark:border-zinc-700"
              }`}
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, password: e.target.value }));
                  setErrors((prev) => ({ ...prev, password: "" }));
                }}
                placeholder="Password (min 8 chars)"
                className={`w-full px-3.5 py-2.5 pr-10 rounded-lg border text-sm bg-white dark:bg-zinc-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.password
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
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }));
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
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 dark:text-zinc-400 mt-6">
          Already have an account?{" "}
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

export default Signup;
