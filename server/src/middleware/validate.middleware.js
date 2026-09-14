const { validationResult } = require("express-validator");

/**
 * Middleware that inspects express-validator results.
 * If validation errors exist, returns a 400 Bad Request with structured field errors.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: formattedErrors,
    });
  }
  next();
};

module.exports = validate;
