const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "careos_default_access_jwt_secret_change_in_production";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "careos_default_refresh_jwt_secret_change_in_production";

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

/**
 * Generates a short-lived access token with minimal identity payload and unique jti.
 * Sensitive data and circle roles are deliberately omitted from the JWT payload.
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id ? user._id.toString() : user.id,
      email: user.email,
      jti: crypto.randomUUID(),
      type: "access",
    },
    JWT_ACCESS_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    }
  );
};

/**
 * Generates a long-lived refresh token with unique jti nonce to prevent collisions.
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user._id ? user._id.toString() : user.id,
      jti: crypto.randomUUID(),
      type: "refresh",
    },
    JWT_REFRESH_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    }
  );
};

/**
 * Verifies and decodes an access token.
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_ACCESS_SECRET);
};

/**
 * Verifies and decodes a refresh token.
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

/**
 * Helper to calculate expiry date for refresh token storage.
 */
const getRefreshTokenExpiryDate = () => {
  const days = parseInt(REFRESH_TOKEN_EXPIRES_IN, 10) || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshTokenExpiryDate,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
};
