const User = require("../models/User");
const Role = require("../models/Role");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { isValidEmail, isValidPassword } = require("../utils/validate");

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
        message: "Valid name, email and password are required",
      });
    }

    // 2. Validate email
    if (!isValidEmail(email.trim())) {
      return res.status(400).json({
        message: "Invalid email address",
      });
    }

    // 3. Validate password
    if (!isValidPassword(password)) {
      return res.status(400).json({
        message: "Minimum length of password is 8",
      });
    }

    // 4. Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // 5. Check if user already exists
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    // 6. Fetch default member role
    const roleDoc = await Role.findOne({
      name: "member",
    });

    if (!roleDoc) {
      return res.status(500).json({
        message: "Default member role not found in database",
      });
    }

    // 7. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 8. Create new user
    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: roleDoc._id,
    });

    await newUser.save();

    // 9. Send response
    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: roleDoc.name,
      },
    });
  } catch (err) {
    // Handle duplicate email race condition
    if (err.code === 11000) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    console.error("signup error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validate input
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      password.length === 0
    ) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // 2. Validate email
    if (!isValidEmail(email.trim())) {
      return res.status(400).json({
        message: "Invalid email address",
      });
    }

    // 3. Normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // 4. Find user and populate role
    const user = await User.findOne({
      email: normalizedEmail,
    }).populate("role", "name");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // 5. Verify password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // 6. Verify role exists
    if (!user.role) {
      return res.status(403).json({
        message: "User role configuration not found",
      });
    }

    // 7. Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      },
    );

    // 8. Send response
    return res.status(200).json({
      message: "User logged in successfully",
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: {
          _id: user.role._id,
          name: user.role.name,
        },
      },
    });
  } catch (err) {
    console.error("login error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("name email role createdAt")
      .populate("role", "name description permissions isSystemRole");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.role) {
      return res.status(403).json({
        message: "User role configuration not found",
      });
    }

    return res.status(200).json({
      message: "Authentication successful",
      user,
    });
  } catch (err) {
    console.error("getMe error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports = { signup, login, getMe };
