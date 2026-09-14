const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { verifyAccessToken } = require("../utils/token.util");

/**
 * Authentication Middleware
 * Validates the Bearer Access Token on protected routes, verifies user status,
 * and attaches the authenticated user record to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token required. Format: Bearer <token>",
        code: "AUTH_TOKEN_MISSING",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          message: "Access token has expired. Please refresh your session.",
          code: "AUTH_TOKEN_EXPIRED",
        });
      }
      return res.status(401).json({
        success: false,
        message: "Invalid access token.",
        code: "AUTH_TOKEN_INVALID",
      });
    }

    // Verify token type is strictly 'access'
    if (decoded.type !== "access") {
      return res.status(401).json({
        success: false,
        message: "Invalid token type provided.",
        code: "AUTH_TOKEN_INVALID",
      });
    }

    // Retrieve active user record
    const user = await User.findById(decoded.sub);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User associated with this token no longer exists.",
        code: "USER_NOT_FOUND",
      });
    }

    if (user.accountStatus !== "active") {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.accountStatus}. Access denied.`,
        code: "ACCOUNT_INACTIVE",
      });
    }

    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal authentication error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = { authenticate };
