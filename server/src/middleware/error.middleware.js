/**
 * 404 Not Found Middleware
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    code: "NOT_FOUND",
  });
};

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let code = err.code || "INTERNAL_ERROR";

  // Handle Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message = `An account with this ${field} already exists.`;
    code = "DUPLICATE_KEY";
  }

  // Handle Mongoose Validation Error
  if (err.name === "ValidationError") {
    statusCode = 400;
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(statusCode).json({
      success: false,
      message: "Validation Error",
      code: "VALIDATION_ERROR",
      errors,
    });
  }

  // Handle CastError (invalid ObjectId)
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid format for parameter: ${err.path}`;
    code = "INVALID_ID_FORMAT";
  }

  // Handle JSON parsing syntax error in request body
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    statusCode = 400;
    message = "Malformed JSON payload in request body.";
    code = "MALFORMED_JSON";
  }

  return res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
