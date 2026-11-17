const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  try {
    const bearerToken = req.headers.authorization;

    if (!bearerToken || !bearerToken.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token is missing or invalid",
      });
    }

    const token = bearerToken.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token is missing",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    // A valid signature only proves we issued the token; the account may have been
    // deleted or suspended since. Check the current state on every request.
    const user = await User.findById(decoded.id).select("_id name email status");

    if (!user || user.status !== "active") {
      return res.status(401).json({
        success: false,
        message: "Account is no longer active",
      });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }
    // DB or other unexpected failure: don't log the user out for a server-side problem
    return next(error);
  }
};

module.exports = authMiddleware;
