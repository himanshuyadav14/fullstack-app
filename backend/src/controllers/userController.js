const User = require("../models/User");
const Role = require("../models/Role");
const mongoose = require("mongoose");

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password -__v")
      .populate("role", "name description isSystemRole")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Users fetched successfully",
      count: users.length,
      users,
    });
  } catch (err) {
    console.error("getAllUsers Error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(userId)
      .select("-password -__v")
      .populate("role", "name description isSystemRole");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User fetched successfully",
      user,
    });
  } catch (err) {
    console.error("getUserById Error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    if (!mongoose.isValidObjectId(roleId)) {
      return res.status(400).json({
        message: "Valid role ID is required",
      });
    }

    const [existingUser, targetRole] = await Promise.all([
      User.findById(userId),
      Role.findById(roleId),
    ]);

    if (!existingUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!targetRole) {
      return res.status(404).json({
        message: "Role not found",
      });
    }

    // Last Admin Protection
    const adminRole = await Role.findOne({ name: "admin" });

    if (
      adminRole &&
      existingUser.role.toString() === adminRole._id.toString() &&
      targetRole._id.toString() !== adminRole._id.toString()
    ) {
      const adminCount = await User.countDocuments({
        role: adminRole._id,
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot demote the last remaining admin",
        });
      }
    }

    existingUser.role = targetRole._id;
    await existingUser.save();

    await existingUser.populate("role", "name description isSystemRole");

    return res.status(200).json({
      message: "User role updated successfully",
      user: {
        _id: existingUser._id,
        name: existingUser.name,
        email: existingUser.email,
        role: existingUser.role,
      },
    });
  } catch (err) {
    console.error("updateUserRole Error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Prevent self deletion
    if (req.user.id.toString() === user._id.toString()) {
      return res.status(400).json({
        message: "You cannot delete your own account",
      });
    }

    // Last Admin Protection
    const adminRole = await Role.findOne({ name: "admin" });

    if (adminRole && user.role.toString() === adminRole._id.toString()) {
      const adminCount = await User.countDocuments({
        role: adminRole._id,
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot delete the last remaining admin",
        });
      }
    }

    await user.deleteOne();

    return res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (err) {
    console.error("deleteUser Error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res
        .status(400)
        .json({ message: "Name is required and must be a valid string" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name: name.trim() },
      { new: true, runValidators: true },
    )
      .select("-password -__v")
      .populate("role", "name description");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("updateUserProfile Error:", error.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

const deleteOwnAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Prevent deletion of the last admin
    const adminRole = await Role.findOne({ name: "admin" });

    if (adminRole && user.role.toString() === adminRole._id.toString()) {
      const adminCount = await User.countDocuments({
        role: adminRole._id,
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot delete the last remaining admin",
        });
      }
    }

    await user.deleteOne();

    return res.status(200).json({
      message: "Your account has been deleted successfully",
    });
  } catch (err) {
    console.error("deleteOwnAccount Error:", err.message);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  updateUserProfile,
  deleteOwnAccount,
};
