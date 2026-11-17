import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import validate from "../utils/validate";
import { useAuthStore } from "../stores/authStore";
import ThemeToggle from "../components/common/ThemeToggle";
import OrbitLogo from "../components/common/OrbitLogo";

const Signup = () => {
  const navigate = useNavigate();
  const { signup, verifyOtp, resendOtp, loading } = useAuthStore();

  // "form" | "verify"
  const [step, setStep] = useState("form");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [apiError, setApiError] = useState("");
  const [resendMessage, setResendMessage] = useState("");

  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Timer for resending OTP
  useEffect(() => {
    if (step === "verify" && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (step === "verify" && countdown === 0) {
      setCanResend(true);
    }
  }, [step, countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

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
      // Transition seamlessly to OTP verification screen
      setStep("verify");
      setCountdown(60);
      setCanResend(false);
    } else {
      setApiError(res.message);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setApiError("");
    setResendMessage("");

    if (!otp.trim() || otp.trim().length !== 6) {
      setApiError("Please enter a valid 6-digit verification code");
      return;
    }

    const res = await verifyOtp({
      email: formData.email.trim(),
      otp: otp.trim(),
    });

    if (res.success) {
      // User is verified and JWT is saved! Auto-redirect to app home
      navigate("/");
    } else {
      setApiError(res.message);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setApiError("");
    setResendMessage("");

    const res = await resendOtp(formData.email.trim());
    if (res.success) {
      setResendMessage("A new verification code has been dispatched to your email.");
      setCanResend(false);
      setCountdown(60);
    } else {
      setApiError(res.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 relative">
      {/* Theme Toggle Button */}
      <ThemeToggle className="absolute top-5 right-5" />

      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl p-8">
        {step === "form" ? (
          <>
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-13 h-13 rounded-2xl bg-zinc-950 dark:bg-zinc-800 border border-zinc-800 dark:border-zinc-700 flex items-center justify-center text-white shadow-md">
                  <OrbitLogo className="w-7 h-7" />
                </div>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Create OrbitHQ Account</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                Manage your projects, teams, and sprints in one orbit
              </p>
            </div>

            {apiError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400">
                {apiError}
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 text-sm cursor-pointer"
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
                      setFormData((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }));
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 text-sm cursor-pointer"
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
                {loading ? "Creating account..." : "Continue →"}
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
          </>
        ) : (
          /* ─── Step 2: OTP Verification Wizard ─── */
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-2xl mb-3">
                ✉️
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Confirm Your Email</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
                We sent a 6-digit verification code to
              </p>
              <div className="font-semibold text-sm text-blue-600 dark:text-blue-400 mt-0.5">
                {formData.email}
              </div>
            </div>

            {apiError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400">
                {apiError}
              </div>
            )}

            {resendMessage && (
              <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 text-sm text-green-700 dark:text-green-300">
                {resendMessage}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  autoFocus
                  value={otp}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9]/g, "");
                    setOtp(clean);
                    setApiError("");
                  }}
                  placeholder="123456"
                  className="w-full px-3.5 py-3 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-center font-mono text-2xl tracking-[8px] font-bold text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-sm text-sm cursor-pointer mt-2"
              >
                {loading ? "Verifying..." : "Verify & Activate Account"}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <span>Didn't receive the code?</span>
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Resend Code
                </button>
              ) : (
                <span>Resend in {countdown}s</span>
              )}
            </div>

            <p className="text-center text-xs text-slate-500 dark:text-zinc-400 mt-6">
              Entered wrong details?{" "}
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setApiError("");
                }}
                className="font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Back to edit
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default Signup;
