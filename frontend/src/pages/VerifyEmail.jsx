import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import ThemeToggle from "../components/common/ThemeToggle";
import OrbitLogo from "../components/common/OrbitLogo";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get("email") || "";
  const tokenFromUrl = searchParams.get("token") || "";

  const { verifyOtp, resendOtp, loading } = useAuthStore();

  const [email, setEmail] = useState(emailFromUrl);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // If a legacy link with ?token= is provided, auto-verify
  useEffect(() => {
    if (tokenFromUrl) {
      const autoVerify = async () => {
        const res = await verifyOtp({ token: tokenFromUrl });
        if (res.success) {
          navigate("/");
        } else {
          setError(res.message);
        }
      };
      autoVerify();
    }
  }, [tokenFromUrl]);

  // Resend countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setResendMessage("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Please enter a valid 6-digit verification code");
      return;
    }

    const res = await verifyOtp({ email: email.trim(), otp: otp.trim() });
    if (res.success) {
      navigate("/");
    } else {
      setError(res.message);
    }
  };

  const handleResend = async () => {
    if (!canResend || !email.trim()) return;
    setError("");
    setResendMessage("");

    const res = await resendOtp(email.trim());
    if (res.success) {
      setResendMessage("A fresh 6-digit code has been sent to your email.");
      setCanResend(false);
      setCountdown(60);
    } else {
      setError(res.message);
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
          <h2 className="text-2xl font-bold tracking-tight">Confirm Your Email</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            We sent a 6-digit verification code to
          </p>
          <div className="font-semibold text-sm text-blue-600 dark:text-blue-400 mt-0.5">
            {email || "your email address"}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {resendMessage && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 text-sm text-green-700 dark:text-green-300">
            {resendMessage}
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          {!emailFromUrl && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

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
                setError("");
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
            {loading ? "Verifying..." : "Verify & Continue →"}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
          <span>Didn't receive the code?</span>
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Resend Code
            </button>
          ) : (
            <span>Resend in {countdown}s</span>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-zinc-400 mt-6">
          Entered the wrong email?{" "}
          <Link
            to="/signup"
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Back to sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
