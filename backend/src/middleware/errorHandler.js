/**
 * 404 Route Not Found Handler
 * Catches any unmatched route and returns a standardized JSON 404 response
 */
const notFoundHandler = (req, res, next) => {
  return res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Centralized Error Handling Middleware for Express 5
 * Intercepts all synchronous and asynchronous exceptions
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal Server Error";
  let errors = null;

  // 1. Mongoose Invalid ObjectId CastError
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ID format for parameter "${err.path}"`;
  }

  // 2. Mongoose Schema Validation Error
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Schema validation failed";
    errors = Object.values(err.errors || {}).map((e) => e.message);
  }

  // 3. MongoDB Unique Index Duplicate Key Error (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    const duplicatedKeys = Object.keys(err.keyPattern || err.keyValue || {});
    message = `Duplicate value error for field(s): ${duplicatedKeys.join(", ")}`;
  }

  // 4. JWT Authentication Errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid access token";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Access token has expired. Please login again.";
  }

  // 5. Multer File Upload Errors
  if (err.name === "MulterError") {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File size exceeds the 5MB maximum limit";
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  // 6. Express Malformed JSON Body
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    statusCode = 400;
    message = "Malformed JSON payload in request body";
  }

  // Log server internal errors for debugging
  if (statusCode >= 500) {
    console.error("🔥 [Server Error]:", {
      method: req.method,
      url: req.originalUrl,
      message: err.message,
      stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
    });
  }

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500 && process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV !== "production" &&
      statusCode >= 500 && { stack: err.stack }),
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
