/**
 * CareOS Frontend Vertical Slice Integration Test Suite
 * Slice: Authentication + Main Caretaker Care Circle Onboarding
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve dependencies using the server's node_modules context
const serverRequire = createRequire(path.join(__dirname, '../server/package.json'));

const dotenv = serverRequire('dotenv');
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const mongoose = serverRequire('mongoose');
const app = serverRequire('./server.js');
const User = serverRequire('./src/models/User');
const CareRecipient = serverRequire('./src/models/CareRecipient');
const CareCircle = serverRequire('./src/models/CareCircle');
const CareCircleMember = serverRequire('./src/models/CareCircleMember');
const RefreshToken = serverRequire('./src/models/RefreshToken');
import {
  isMainCaretaker,
  canManageCircle,
  canInviteMembers,
  canManageMedications,
} from './src/constants/roles.js';

let serverInstance;
const TEST_PORT = 5096;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runFrontendIntegrationTests() {
  console.log('================================================================');
  console.log('CAREOS FRONTEND PHASE 1 INTEGRATION TEST SUITE');
  console.log('Slice: Authentication + Main Caretaker Care Circle Onboarding');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
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
  console.log('Connected to MongoDB for integration testing.');

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`Integration test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  const timestamp = Date.now();
  const testEmail = `caretaker.${timestamp}@example.com`;
  const testPassword = 'Password123!';

  let testAccessToken = '';
  let testRefreshToken = '';
  let testUserId = '';
  let createdCircleId = '';

  try {
    // ----------------------------------------------------------------
    // 1. Registration Validation Failure (Weak password & malformed email)
    // ----------------------------------------------------------------
    const invalidRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A', // too short
        email: 'not-an-email',
        password: 'weak',
      }),
    });
    const invalidRegData = await invalidRegRes.json();
    assert(
      invalidRegRes.status === 400 &&
        invalidRegData.success === false &&
        Array.isArray(invalidRegData.errors) &&
        invalidRegData.errors.length >= 3,
      '1. Registration rejects invalid name length, bad email, and weak password with 400',
      JSON.stringify(invalidRegData.errors)
    );

    // ----------------------------------------------------------------
    // 2. Registration Success (Main Caretaker self-registration)
    // ----------------------------------------------------------------
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Priya Sharma',
        email: testEmail,
        password: testPassword,
        phone: '+919876543210',
      }),
    });
    const regData = await regRes.json();
    assert(
      regRes.status === 201 &&
        regData.success === true &&
        regData.data?.tokens?.accessToken &&
        regData.data?.tokens?.refreshToken &&
        regData.data?.user?.email === testEmail &&
        regData.data?.user?.passwordHash === undefined,
      '2. Registration creates Main Caretaker account, issues auth tokens, and hides password hash',
      JSON.stringify(regData)
    );

    testAccessToken = regData.data.tokens.accessToken;
    testRefreshToken = regData.data.tokens.refreshToken;
    testUserId = regData.data.user.id;

    // ----------------------------------------------------------------
    // 3. Duplicate Registration Rejection (409 Conflict)
    // ----------------------------------------------------------------
    const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Priya Sharma Duplicate',
        email: testEmail,
        password: testPassword,
      }),
    });
    const dupData = await dupRes.json();
    assert(
      dupRes.status === 409 &&
        dupData.success === false &&
        dupData.code === 'USER_ALREADY_EXISTS',
      '3. Duplicate registration with same email returns 409 USER_ALREADY_EXISTS'
    );

    // ----------------------------------------------------------------
    // 4. Login Failure Handling
    // ----------------------------------------------------------------
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999!',
      }),
    });
    const badLoginData = await badLoginRes.json();
    assert(
      badLoginRes.status === 401 &&
        badLoginData.success === false &&
        badLoginData.code === 'INVALID_CREDENTIALS',
      '4. Login with incorrect password returns 401 INVALID_CREDENTIALS'
    );

    // ----------------------------------------------------------------
    // 5. Login Success Handling
    // ----------------------------------------------------------------
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginData = await loginRes.json();
    assert(
      loginRes.status === 200 &&
        loginData.success === true &&
        loginData.data?.tokens?.accessToken &&
        loginData.data?.user?.email === testEmail,
      '5. Login with valid credentials succeeds and issues fresh tokens'
    );

    // ----------------------------------------------------------------
    // 6. Initial Circle Check (New user has 0 circles -> onboarding required)
    // ----------------------------------------------------------------
    const initCirclesRes = await fetch(`${BASE_URL}/api/care-circles`, {
      headers: { Authorization: `Bearer ${testAccessToken}` },
    });
    const initCirclesData = await initCirclesRes.json();
    assert(
      initCirclesRes.status === 200 &&
        initCirclesData.success === true &&
        initCirclesData.count === 0 &&
        initCirclesData.data.length === 0,
      '6. Newly registered user has 0 circles (frontend routing rule: route to /onboarding/create-circle)'
    );

    // ----------------------------------------------------------------
    // 7. Care Circle Creation Validation Failure
    // ----------------------------------------------------------------
    const invalidCircleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testAccessToken}`,
      },
      body: JSON.stringify({
        name: '',
        recipient: {
          fullName: '',
          bloodGroup: 'INVALID_BG',
        },
      }),
    });
    const invalidCircleData = await invalidCircleRes.json();
    assert(
      invalidCircleRes.status === 400 &&
        invalidCircleData.success === false &&
        Array.isArray(invalidCircleData.errors) &&
        invalidCircleData.errors.length >= 3,
      '7. Care Circle creation rejects empty name, empty recipient name, and invalid blood group with 400'
    );

    // ----------------------------------------------------------------
    // 8. Care Circle Creation Success (Full Recipient Profile)
    // ----------------------------------------------------------------
    const createCircleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testAccessToken}`,
      },
      body: JSON.stringify({
        name: "Kamala's Family Circle",
        recipient: {
          fullName: 'Kamala Sharma',
          dateOfBirth: '1952-08-15T00:00:00.000Z',
          gender: 'female',
          bloodGroup: 'B+',
          knownConditions: ['Hypertension', 'Mild Osteoarthritis'],
          allergies: ['Sulfa drugs'],
          emergencyContact: {
            name: 'Priya Sharma',
            relationship: 'Daughter',
            phone: '+919876543210',
          },
        },
      }),
    });
    const createCircleData = await createCircleRes.json();
    assert(
      createCircleRes.status === 201 &&
        createCircleData.success === true &&
        createCircleData.data?.careCircle?.name === "Kamala's Family Circle" &&
        createCircleData.data?.careRecipient?.fullName === 'Kamala Sharma' &&
        createCircleData.data?.careRecipient?.bloodGroup === 'B+' &&
        createCircleData.data?.membership?.role === 'MAIN_CARETAKER',
      '8. Main Caretaker creates Care Circle + Recipient and is automatically assigned MAIN_CARETAKER role'
    );

    createdCircleId = createCircleData.data.careCircle.id;

    // ----------------------------------------------------------------
    // 9. Existing-Circle Detection on Subsequent List / Login
    // ----------------------------------------------------------------
    const updatedCirclesRes = await fetch(`${BASE_URL}/api/care-circles`, {
      headers: { Authorization: `Bearer ${testAccessToken}` },
    });
    const updatedCirclesData = await updatedCirclesRes.json();
    assert(
      updatedCirclesRes.status === 200 &&
        updatedCirclesData.count === 1 &&
        updatedCirclesData.data[0].id === createdCircleId &&
        updatedCirclesData.data[0].role === 'MAIN_CARETAKER' &&
        updatedCirclesData.data[0].careRecipient.fullName === 'Kamala Sharma',
      '9. User now has 1 active circle (frontend routing rule: route to /dashboard)'
    );

    // ----------------------------------------------------------------
    // 10. Circle Details & Member Authorization
    // ----------------------------------------------------------------
    const circleDetailsRes = await fetch(`${BASE_URL}/api/care-circles/${createdCircleId}`, {
      headers: { Authorization: `Bearer ${testAccessToken}` },
    });
    const circleDetailsData = await circleDetailsRes.json();
    assert(
      circleDetailsRes.status === 200 &&
        circleDetailsData.success === true &&
        circleDetailsData.data?.currentUserRole === 'MAIN_CARETAKER' &&
        circleDetailsData.data?.members.length === 1 &&
        circleDetailsData.data?.members[0].user.name === 'Priya Sharma',
      '10. Circle details endpoint returns circle recipient and sanitized members list'
    );

    // ----------------------------------------------------------------
    // 11. Role Capability Matrix Verification
    // ----------------------------------------------------------------
    const role = 'MAIN_CARETAKER';
    const isMain = isMainCaretaker(role);
    const canManage = canManageCircle(role);
    const canInvite = canInviteMembers(role);
    const canMeds = canManageMedications(role);
    assert(
      isMain === true && canManage === true && canInvite === true && canMeds === true,
      '11. Role capability checks correctly grant MAIN_CARETAKER full administrative permissions'
    );

    // ----------------------------------------------------------------
    // 12. Session Persistence Verification (GET /api/auth/me)
    // ----------------------------------------------------------------
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${testAccessToken}` },
    });
    const meData = await meRes.json();
    assert(
      meRes.status === 200 &&
        meData.success === true &&
        meData.data?.user?.email === testEmail &&
        meData.data?.user?.name === 'Priya Sharma',
      '12. Session verification (GET /me) restores authenticated identity on page refresh'
    );

    // ----------------------------------------------------------------
    // 13. Token Refresh Flow
    // ----------------------------------------------------------------
    const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: testRefreshToken }),
    });
    const refreshData = await refreshRes.json();
    assert(
      refreshRes.status === 200 &&
        refreshData.success === true &&
        refreshData.data?.tokens?.accessToken &&
        refreshData.data?.tokens?.refreshToken,
      '13. Refresh token rotation issues a new token pair successfully'
    );

    const rotatedRefreshToken = refreshData.data.tokens.refreshToken;

    // ----------------------------------------------------------------
    // 14. Logout & Session Invalidation
    // ----------------------------------------------------------------
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rotatedRefreshToken }),
    });
    const logoutData = await logoutRes.json();
    assert(
      logoutRes.status === 200 && logoutData.success === true,
      '14. Logout succeeds and revokes server refresh token session'
    );

    // ----------------------------------------------------------------
    // 15. Revoked Token Rejection
    // ----------------------------------------------------------------
    const reuseRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rotatedRefreshToken }),
    });
    assert(
      reuseRes.status === 401,
      '15. Attempting to use a revoked token after logout is rejected with 401'
    );

    // Clean up test records
    await CareCircleMember.deleteMany({ careCircle: createdCircleId });
    await CareCircle.deleteMany({ _id: createdCircleId });
    await CareRecipient.deleteMany({ fullName: 'Kamala Sharma' });
    await RefreshToken.deleteMany({ userId: testUserId });
    await User.deleteMany({ _id: testUserId });
    console.log('\nIntegration test database records cleaned up successfully.');
  } catch (err) {
    console.error('Integration test encountered unexpected error:', err);
    failed++;
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`INTEGRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFrontendIntegrationTests();
