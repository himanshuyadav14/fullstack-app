const rateLimit = require("express-rate-limit");

/**
 * Strict Rate Limiter for Authentication endpoints
 * Protects against brute-force password guessing and registration spam
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts from this IP. Please try again in 15 minutes.",
  },
});

/**
 * General Rate Limiter for all /api endpoints
 * Protects against API abuse and DoS attacks
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP. Please slow down and try again later.",
  },
});

/**
 * File Upload Rate Limiter
 * Protects Cloudinary bandwidth and memory buffer exhaustion
 */
const fileUploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 uploads per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Upload rate limit reached. Please wait before uploading more files.",
  },
});

module.exports = {
  authLimiter,
  apiLimiter,
  fileUploadLimiter,
};
