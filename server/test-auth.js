/**
 * CareOS Backend Authentication Test Suite
 * Automated verification of all 17 auth criteria
 */
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = require("./server");
const User = require("./src/models/User");
const RefreshToken = require("./src/models/RefreshToken");
const jwt = require("jsonwebtoken");

let serverInstance;
const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runTests() {
  console.log("==================================================");
  console.log("STARTING CAREOS AUTHENTICATION BACKEND TEST SUITE");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = "") {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  // Connect to DB and start HTTP server on test port
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for testing.");

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`Test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  const uniqueId = Date.now();
  const testEmail = `rahul.caretaker.${uniqueId}@example.com`;
  const testPassword = "SecurePassword123!";
  const testName = "Rahul Sharma";
  const testPhone = "+919876543210";

  let savedAccessToken = "";
  let savedRefreshToken = "";
  let registeredUserId = "";

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(
      healthRes.status === 200 && healthData.database === "connected",
      "1. Server starts and MongoDB connects successfully",
      JSON.stringify(healthData)
    );

    // 2. Malformed registration request (missing password and invalid email)
    const malformedRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "R", email: "not-an-email" }),
    });
    const malformedRegData = await malformedRegRes.json();
    assert(
      malformedRegRes.status === 400 &&
        malformedRegData.success === false &&
        Array.isArray(malformedRegData.errors),
      "2. Malformed registration is rejected with structured 400 validation errors",
      JSON.stringify(malformedRegData)
    );

    // 3. Main Caretaker registration
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
        phone: testPhone,
        role: "ADMIN", // Attacker trying to inject privileged role
      }),
    });
    const regData = await regRes.json();
    assert(
      regRes.status === 201 &&
        regData.success === true &&
        regData.data.tokens.accessToken &&
        regData.data.tokens.refreshToken &&
        regData.data.user.email === testEmail &&
        regData.data.user.role === undefined, // Client-supplied role was ignored
      "3. Main Caretaker registration succeeds and ignores client-supplied privileged role",
      JSON.stringify(regData)
    );

    registeredUserId = regData.data.user.id;
    savedAccessToken = regData.data.tokens.accessToken;
    savedRefreshToken = regData.data.tokens.refreshToken;

    // 4. Password hash is never returned
    assert(
      regData.data.user.passwordHash === undefined &&
        regData.data.user.password === undefined,
      "4. Password hash is never returned in registration response"
    );

    // 5. Password is properly hashed in database
    const dbUser = await User.findById(registeredUserId).select("+passwordHash");
    assert(
      dbUser &&
        dbUser.passwordHash &&
        dbUser.passwordHash.startsWith("$2") &&
        dbUser.passwordHash !== testPassword,
      "5. Password is securely hashed in MongoDB using bcrypt"
    );

    // 6. Duplicate registration rejection
    const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate User",
        email: testEmail,
        password: "AnotherPassword123!",
      }),
    });
    const dupData = await dupRes.json();
    assert(
      dupRes.status === 409 &&
        dupData.success === false &&
        dupData.code === "USER_ALREADY_EXISTS",
      "6. Duplicate registration with same email is rejected with 409 Conflict",
      JSON.stringify(dupData)
    );

    // 7. Correct login works
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginData = await loginRes.json();
    assert(
      loginRes.status === 200 &&
        loginData.success === true &&
        loginData.data &&
        loginData.data.tokens &&
        loginData.data.tokens.accessToken &&
        loginData.data.user.email === testEmail &&
        loginData.data.user.passwordHash === undefined,
      "7. Correct login works and returns tokens without passwordHash",
      JSON.stringify(loginData)
    );

    if (loginData.data && loginData.data.tokens) {
      savedAccessToken = loginData.data.tokens.accessToken;
      savedRefreshToken = loginData.data.tokens.refreshToken;
    }

    // 8. Incorrect password fails with generic 401
    const badPassRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "WrongPassword999!",
      }),
    });
    const badPassData = await badPassRes.json();
    assert(
      badPassRes.status === 401 &&
        badPassData.success === false &&
        badPassData.message === "Invalid email or password.",
      "8. Incorrect password fails with generic 401 error message",
      JSON.stringify(badPassData)
    );

    // 9. Non-existent email fails with identical generic 401 error (no enumeration)
    const nonExistentRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nonexistent.user.123@example.com",
        password: "SomePassword123!",
      }),
    });
    const nonExistentData = await nonExistentRes.json();
    assert(
      nonExistentRes.status === 401 &&
        nonExistentData.message === "Invalid email or password.",
      "9. Non-existent email fails with identical generic 401 error",
      JSON.stringify(nonExistentData)
    );

    // 10. GET /api/auth/me rejects unauthenticated request (no token)
    const noAuthRes = await fetch(`${BASE_URL}/api/auth/me`);
    const noAuthData = await noAuthRes.json();
    assert(
      noAuthRes.status === 401 && noAuthData.code === "AUTH_TOKEN_MISSING",
      "10. GET /me rejects unauthenticated requests with 401",
      JSON.stringify(noAuthData)
    );

    // 11. GET /api/auth/me works with valid Bearer token
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${savedAccessToken}` },
    });
    const meData = await meRes.json();
    assert(
      meRes.status === 200 &&
        meData.success === true &&
        meData.data.user.email === testEmail &&
        meData.data.user.passwordHash === undefined,
      "11. GET /me returns authenticated user profile without sensitive fields",
      JSON.stringify(meData)
    );

    // 12. GET /api/auth/me rejects forged/invalid token
    const invalidTokenRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: "Bearer this-is-a-fake-invalid-token" },
    });
    const invalidTokenData = await invalidTokenRes.json();
    assert(
      invalidTokenRes.status === 401 &&
        invalidTokenData.code === "AUTH_TOKEN_INVALID",
      "12. GET /me rejects forged/invalid access token",
      JSON.stringify(invalidTokenData)
    );

    // 13. GET /api/auth/me rejects expired token
    const expiredToken = jwt.sign(
      { sub: registeredUserId, email: testEmail, type: "access" },
      process.env.JWT_ACCESS_SECRET || "careos_access_jwt_secret_dev_key_2026_super_secure",
      { expiresIn: "-10s" } // Already expired
    );
    const expiredRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    const expiredData = await expiredRes.json();
    assert(
      expiredRes.status === 401 && expiredData.code === "AUTH_TOKEN_EXPIRED",
      "13. GET /me rejects expired access token with AUTH_TOKEN_EXPIRED",
      JSON.stringify(expiredData)
    );

    // 14. Refresh token flow works and rotates tokens
    const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: savedRefreshToken }),
    });
    const refreshData = await refreshRes.json();
    assert(
      refreshRes.status === 200 &&
        refreshData.success === true &&
        refreshData.data.tokens.accessToken &&
        refreshData.data.tokens.refreshToken &&
        refreshData.data.tokens.refreshToken !== savedRefreshToken,
      "14. Refresh token flow successfully rotates tokens and returns new pair",
      JSON.stringify(refreshData)
    );

    const newAccessToken = refreshData.data.tokens.accessToken;
    const newRefreshToken = refreshData.data.tokens.refreshToken;

    // 15. Verify the old refresh token is now revoked and cannot be used again
    const reuseRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: savedRefreshToken }),
    });
    assert(
      reuseRes.status === 401,
      "15. Reuse of revoked refresh token is rejected with 401"
    );

    // 16. Logout invalidates the active refresh token
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: newRefreshToken }),
    });
    const logoutData = await logoutRes.json();
    assert(
      logoutRes.status === 200 && logoutData.success === true,
      "16. Logout succeeds and marks refresh session as revoked",
      JSON.stringify(logoutData)
    );

    // 17. Verify logged-out refresh token no longer works
    const postLogoutRefreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: newRefreshToken }),
    });
    assert(
      postLogoutRefreshRes.status === 401,
      "17. Attempting to refresh with logged-out token is rejected with 401"
    );

    // Clean up test records
    await User.deleteOne({ _id: registeredUserId });
    await RefreshToken.deleteMany({ userId: registeredUserId });
    console.log("\nTest records cleaned up successfully.");
  } catch (err) {
    console.error("Test execution encountered an error:", err);
    failed++;
  } finally {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
    await mongoose.connection.close();
    console.log("==================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
