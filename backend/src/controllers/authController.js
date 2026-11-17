const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Membership = require("../models/Membership");
const { isValidEmail, isValidPassword } = require("../utils/validate");
const {
  sendVerificationEmail,
  sendVerificationOtpEmail,
  sendPasswordResetEmail,
} = require("../services/emailService");

/**
 * 1. POST /api/auth/signup
 * Registers a new user account, creates verification token, and sends verification email
 */
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validate input types and empty values
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      password.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid name, email and password are required",
      });
    }

    // 2. Validate email
    if (!isValidEmail(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    // 3. Validate password
    if (!isValidPassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Minimum length of password is 8 characters",
      });
    }

    // 4. Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // 5. Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email address",
      });
    }

    // 6. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7. Generate 6-digit numeric OTP (expires in 10 minutes)
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const emailOtpHash = crypto
      .createHash("sha256")
      .update(rawOtp)
      .digest("hex");
    const emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Also generate legacy verification token for compatibility
    const rawVerificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenHash = crypto
      .createHash("sha256")
      .update(rawVerificationToken)
      .digest("hex");
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 8. Create new user with authProvider local
    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      authProvider: "local",
      isEmailVerified: false,
      emailOtpHash,
      emailOtpExpiresAt,
      verificationTokenHash,
      verificationTokenExpiresAt,
      status: "active",
    });

    await newUser.save();

    // 9. Send 6-digit OTP verification email via Gmail SMTP
    const emailResult = await sendVerificationOtpEmail({
      to: normalizedEmail,
      name: newUser.name,
      otp: rawOtp,
    });

    if (!emailResult?.success) {
      console.warn("⚠️ User registered, but verification OTP email delivery failed.");
    }

    // 10. Issue JWT session token
    const token = jwt.sign(
      { id: newUser._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    return res.status(201).json({
      success: true,
      message: "User registered successfully. A 6-digit verification code has been sent to your email.",
      token,
      email: newUser.email,
      otp: process.env.NODE_ENV !== "production" ? rawOtp : undefined,
      verificationToken: rawVerificationToken,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        isEmailVerified: newUser.isEmailVerified,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email address",
      });
    }

    console.error("signup error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 2. POST /api/auth/verify-email (also accepts { email, otp } or { token })
 * Verifies email address using 6-digit OTP or verification token
 */
const verifyEmail = async (req, res) => {
  try {
    const { token, email, otp } = req.body;

    if (!otp && !token && !email) {
      return res.status(400).json({
        success: false,
        message: "Verification code (OTP) or token is required",
      });
    }

    let user = null;

    if (email && otp) {
      const normalizedEmail = email.trim().toLowerCase();
      const otpHash = crypto
        .createHash("sha256")
        .update(String(otp).trim())
        .digest("hex");

      user = await User.findOne({
        email: normalizedEmail,
        emailOtpHash: otpHash,
        emailOtpExpiresAt: { $gt: new Date() },
      });
    } else if (token && typeof token === "string") {
      const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");
      user = await User.findOne({
        verificationTokenHash: tokenHash,
        verificationTokenExpiresAt: { $gt: new Date() },
      });
    } else if (email && process.env.NODE_ENV !== "production") {
      // Dev shortcut for quick local testing without email access
      user = await User.findOne({ email: email.trim().toLowerCase() });
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code",
      });
    }

    if (user.isEmailVerified) {
      // Already verified, return active session
      const sessionToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
      );

      return res.status(200).json({
        success: true,
        message: "Email is already verified",
        token: sessionToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          isEmailVerified: true,
        },
      });
    }

    user.isEmailVerified = true;
    user.emailOtpHash = undefined;
    user.emailOtpExpiresAt = undefined;
    user.verificationTokenHash = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    // Issue JWT token on verification so user is immediately authenticated
    const sessionToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    return res.status(200).json({
      success: true,
      message: "Email verified successfully! Welcome to TeamFlow.",
      token: sessionToken,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (err) {
    console.error("verifyEmail error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 3. POST /api/auth/resend-verification
 * Resends a 6-digit verification OTP email
 */
const resendVerification = async (req, res) => {
  try {
    const email = req.body.email || (req.user ? (await User.findById(req.user.id))?.email : null);

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Valid email address is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail, status: "active" });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified. Please log in.",
      });
    }

    // Generate fresh 6-digit OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.emailOtpHash = crypto
      .createHash("sha256")
      .update(rawOtp)
      .digest("hex");
    user.emailOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Legacy verification token refresh
    const rawVerificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationTokenHash = crypto
      .createHash("sha256")
      .update(rawVerificationToken)
      .digest("hex");
    user.verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await sendVerificationOtpEmail({
      to: user.email,
      name: user.name,
      otp: rawOtp,
    });

    return res.status(200).json({
      success: true,
      message: "A new 6-digit verification code has been sent to your email.",
      otp: process.env.NODE_ENV !== "production" ? rawOtp : undefined,
      verificationToken: rawVerificationToken,
    });
  } catch (err) {
    console.error("resendVerification error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 4. POST /api/auth/login
 * Authenticates user and issues JWT token
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      password.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    if (!isValidEmail(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid email address",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Please contact support.`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    return res.status(200).json({
      success: true,
      message: "Logged in successfully",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        status: user.status,
      },
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 5. GET /api/auth/me
 * Returns current authenticated user and active workspace memberships
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Fetch active organization memberships
    const memberships = await Membership.find({
      user: user._id,
      status: "active",
    })
      .populate("organization", "name slug")
      .populate("role", "name description permissions");

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        status: user.status,
        createdAt: user.createdAt,
      },
      memberships,
    });
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 6. POST /api/auth/forgot-password
 * Generates password reset token and sends reset link via email
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string" || !isValidEmail(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail, status: "active" });

    if (!user) {
      // Return standard success message to prevent email enumeration
      return res.status(200).json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    }

    // Generate secure random token
    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const passwordResetTokenHash = crypto
      .createHash("sha256")
      .update(rawResetToken)
      .digest("hex");
    const passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.passwordResetTokenHash = passwordResetTokenHash;
    user.passwordResetExpiresAt = passwordResetExpiresAt;
    await user.save();

    // Send email
    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetToken: rawResetToken,
    });

    if (!emailResult?.success) {
      console.warn("⚠️ Password reset email delivery failed:", emailResult?.error);
    }

    return res.status(200).json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (err) {
    console.error("forgotPassword error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

/**
 * 7. POST /api/auth/reset-password
 * Resets user password using valid, unexpired token
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || typeof token !== "string" || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required",
      });
    }

    if (!newPassword || typeof newPassword !== "string" || !isValidPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token.trim())
      .digest("hex");

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
      status: "active",
    }).select("+password");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Password reset link is invalid or has expired",
      });
    }

    // Hash new password and clear reset fields
    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully. You can now log in.",
    });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  signup,
  login,
  getMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
};
