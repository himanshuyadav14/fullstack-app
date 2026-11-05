const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Membership = require("../models/Membership");
const { isValidEmail, isValidPassword } = require("../utils/validate");
const { sendVerificationEmail } = require("../services/emailService");

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

    // 7. Generate email verification token
    const rawVerificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenHash = crypto
      .createHash("sha256")
      .update(rawVerificationToken)
      .digest("hex");
    const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // 8. Create new user
    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      isEmailVerified: false,
      verificationTokenHash,
      verificationTokenExpiresAt,
      status: "active",
    });

    await newUser.save();

    // 9. Send verification email via Gmail SMTP
    const emailResult = await sendVerificationEmail({
      to: normalizedEmail,
      name: newUser.name,
      verificationToken: rawVerificationToken,
    });

    if (!emailResult?.success) {
      console.warn("⚠️ User registered, but verification email delivery failed.");
    }

    // 10. Issue JWT session token
    const token = jwt.sign(
      { id: newUser._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    return res.status(201).json({
      success: true,
      message: "User registered successfully. Please verify your email.",
      token,
      verificationToken: rawVerificationToken, // Provided for easy Postman testing
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
 * 2. POST /api/auth/verify-email
 * Verifies email address using verification token
 */
const verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token && !email) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    let query = {};
    if (token && typeof token === "string") {
      const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");
      query = {
        verificationTokenHash: tokenHash,
        verificationTokenExpiresAt: { $gt: new Date() },
      };
    } else if (email && process.env.NODE_ENV !== "production") {
      // Dev shortcut for quick manual testing
      query = { email: email.trim().toLowerCase() };
    }

    const user = await User.findOne(query);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({
        success: true,
        message: "Email is already verified",
      });
    }

    user.isEmailVerified = true;
    user.verificationTokenHash = undefined;
    user.verificationTokenExpiresAt = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully! You can now accept workspace invitations.",
      user: {
        id: user._id,
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
 * Resends a verification email
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

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    const rawVerificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationTokenHash = crypto
      .createHash("sha256")
      .update(rawVerificationToken)
      .digest("hex");
    user.verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationToken: rawVerificationToken,
    });

    return res.status(200).json({
      success: true,
      message: "Verification email resent successfully",
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

module.exports = {
  signup,
  login,
  getMe,
  verifyEmail,
  resendVerification,
};
