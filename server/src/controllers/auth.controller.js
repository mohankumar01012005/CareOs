const bcrypt = require("bcryptjs");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiryDate,
  ACCESS_TOKEN_EXPIRES_IN,
} = require("../utils/token.util");

/**
 * Register a new user (Main Caretaker self-registration)
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, profilePhoto } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : "";

    // Check for existing user account
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists.",
        code: "USER_ALREADY_EXISTS",
      });
    }

    // Hash password with bcryptjs (12 salt rounds)
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user entity (strictly ignoring client-supplied roles)
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : null,
      passwordHash,
      profilePhoto: profilePhoto || null,
      accountStatus: "active",
      lastLoginAt: new Date(),
    });

    // Generate tokens
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // Persist refresh token session
    await RefreshToken.create({
      token: refreshToken,
      userId: newUser._id,
      expiresAt: getRefreshTokenExpiryDate(),
      userAgent: req.headers["user-agent"] || null,
      ipAddress: req.ip || null,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      data: {
        user: newUser.toJSON(),
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log in an existing user with email and password
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : "";

    // Explicitly select passwordHash since it is omitted by default in queries
    const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");

    // Generic error to prevent account enumeration
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
        code: "INVALID_CREDENTIALS",
      });
    }

    if (user.accountStatus !== "active") {
      return res.status(403).json({
        success: false,
        message: `Your account is ${user.accountStatus}. Please contact support.`,
        code: "ACCOUNT_INACTIVE",
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    // Generate fresh tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token session
    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: getRefreshTokenExpiryDate(),
      userAgent: req.headers["user-agent"] || null,
      ipAddress: req.ip || null,
    });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user: user.toJSON(),
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token using a valid refresh token with token rotation
 * POST /api/auth/refresh
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required.",
        code: "REFRESH_TOKEN_REQUIRED",
      });
    }

    // Verify refresh token signature & expiration
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token.",
        code: "REFRESH_TOKEN_INVALID",
      });
    }

    if (decoded.type !== "refresh") {
      return res.status(401).json({
        success: false,
        message: "Invalid token type provided for refresh.",
        code: "REFRESH_TOKEN_INVALID",
      });
    }

    // Check refresh token session in database
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken });

    if (!tokenDoc) {
      return res.status(401).json({
        success: false,
        message: "Refresh token session not found or already invalidated.",
        code: "REFRESH_TOKEN_NOT_FOUND",
      });
    }

    // Reuse detection: If token was already revoked, someone may be attempting token replay
    if (tokenDoc.revoked) {
      // Invalidate all tokens for this user as a security precaution
      await RefreshToken.updateMany(
        { userId: tokenDoc.userId },
        { revoked: true, revokedAt: new Date() }
      );

      return res.status(401).json({
        success: false,
        message: "Compromised token detected. All sessions have been terminated. Please log in again.",
        code: "TOKEN_REUSE_DETECTED",
      });
    }

    // Check expiration
    if (new Date() > tokenDoc.expiresAt) {
      tokenDoc.revoked = true;
      tokenDoc.revokedAt = new Date();
      await tokenDoc.save();

      return res.status(401).json({
        success: false,
        message: "Refresh token has expired. Please log in again.",
        code: "REFRESH_TOKEN_EXPIRED",
      });
    }

    // Verify user is still active
    const user = await User.findById(tokenDoc.userId);
    if (!user || user.accountStatus !== "active") {
      return res.status(401).json({
        success: false,
        message: "User account is no longer active.",
        code: "USER_INACTIVE",
      });
    }

    // Token rotation: Revoke the used refresh token and issue a fresh pair
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    tokenDoc.revoked = true;
    tokenDoc.revokedAt = new Date();
    tokenDoc.replacedByToken = newRefreshToken;
    await tokenDoc.save();

    // Store new refresh token
    await RefreshToken.create({
      token: newRefreshToken,
      userId: user._id,
      expiresAt: getRefreshTokenExpiryDate(),
      userAgent: req.headers["user-agent"] || null,
      ipAddress: req.ip || null,
    });

    return res.status(200).json({
      success: true,
      message: "Tokens refreshed successfully.",
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: ACCESS_TOKEN_EXPIRES_IN,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Log out user by revoking the refresh token session
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await RefreshToken.updateOne(
        { token: refreshToken },
        {
          revoked: true,
          revokedAt: new Date(),
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get authenticated user profile
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      user: req.user.toJSON(),
    },
  });
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
};
