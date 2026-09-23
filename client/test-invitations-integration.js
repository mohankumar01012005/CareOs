/**
 * CareOS Frontend Invitations & Member Onboarding Integration Test Suite
 * Phase 1 — Vertical Slice 4: Care Circle Members + Invitations + Invited-User Onboarding
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve dependencies using server's node_modules context
const serverRequire = createRequire(path.join(__dirname, '../server/package.json'));

const dotenv = serverRequire('dotenv');
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const mongoose = serverRequire('mongoose');
const app = serverRequire('./server.js');
const User = serverRequire('./src/models/User');
const CareRecipient = serverRequire('./src/models/CareRecipient');
const CareCircle = serverRequire('./src/models/CareCircle');
const CareCircleMember = serverRequire('./src/models/CareCircleMember');
const CareCircleInvitation = serverRequire('./src/models/CareCircleInvitation');
const RefreshToken = serverRequire('./src/models/RefreshToken');

import {
  isMainCaretaker,
  canInviteMembers,
  INVITATION_ROLES,
  INVITATION_STATUS,
  ROLE_LABELS,
} from './src/constants/roles.js';

let serverInstance;
const TEST_PORT = 5096;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runInvitationsIntegrationTests() {
  console.log('================================================================');
  console.log('CAREOS FRONTEND PHASE 1 INTEGRATION TEST SUITE');
  console.log('Slice: Care Circle Members + Invitations + Invited-User Onboarding');
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
  console.log('Connected to MongoDB for Invitations integration testing.');

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`Invitations test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  const timestamp = Date.now();
  const mainEmail = `main.caretaker.${timestamp}@example.com`;
  const existingDoctorEmail = `doctor.member.${timestamp}@example.com`;
  const newFamilyEmail = `new.family.${timestamp}@example.com`;
  const nurseEmail = `nurse.aide.${timestamp}@example.com`;
  const subCaretakerEmail = `sub.caretaker.${timestamp}@example.com`;
  const unrelatedEmail = `unrelated.user.${timestamp}@example.com`;
  const testPassword = 'Password123!Inv';

  let mainToken = '';
  let mainUserId = '';

  let existingDoctorToken = '';
  let existingDoctorId = '';

  let unrelatedToken = '';
  let unrelatedUserId = '';

  let circleId = '';
  let recipientId = '';

  // Invitation tracking
  let doctorInviteToken = '';
  let doctorInviteId = '';

  let newFamilyInviteToken = '';
  let newFamilyInviteId = '';

  let nurseInviteToken = '';
  let nurseInviteId = '';

  let subCaretakerInviteToken = '';
  let subCaretakerInviteId = '';

  let toRevokeInviteToken = '';
  let toRevokeInviteId = '';

  try {
    // ----------------------------------------------------------------
    // Setup: Create Users & Care Circle
    // ----------------------------------------------------------------
    // 1. Main Caretaker User
    const mainRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sunita Main Caretaker',
        email: mainEmail,
        password: testPassword,
        phone: '+919876543401',
      }),
    });
    const mainRegData = await mainRegRes.json();
    mainToken = mainRegData.data.tokens.accessToken;
    mainUserId = mainRegData.data.user.id;

    // 2. Existing Doctor User (Registered beforehand)
    const docRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Alok Verma',
        email: existingDoctorEmail,
        password: testPassword,
        phone: '+919876543402',
      }),
    });
    const docRegData = await docRegRes.json();
    existingDoctorToken = docRegData.data.tokens.accessToken;
    existingDoctorId = docRegData.data.user.id;

    // 3. Unrelated User (For cross-user & email mismatch tests)
    const unregRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unrelated User',
        email: unrelatedEmail,
        password: testPassword,
        phone: '+919876543403',
      }),
    });
    const unregData = await unregRes.json();
    unrelatedToken = unregData.data.tokens.accessToken;
    unrelatedUserId = unregData.data.user.id;

    // 4. Create primary Care Circle
    const circleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        name: "Grandma Kanta's Circle",
        recipient: {
          fullName: 'Kanta Devi',
          dateOfBirth: '1950-04-12',
          gender: 'female',
          bloodGroup: 'A+',
          knownConditions: ['Osteoarthritis'],
        },
      }),
    });
    const circleData = await circleRes.json();
    circleId = circleData.data.careCircle.id;
    recipientId = circleData.data.careRecipient.id;

    // ================================================================
    // SECTION 1: ROLE CAPABILITIES & AUTHORIZATION
    // ================================================================
    console.log('\n--- Section 1: Role Capabilities & Governance ---');

    // 1. Role capability helpers
    assert(
      canInviteMembers('MAIN_CARETAKER') === true &&
        canInviteMembers('SUB_CARETAKER') === false &&
        canInviteMembers('FAMILY_MEMBER') === false &&
        canInviteMembers('PAID_DOCTOR') === false,
      '1. canInviteMembers helper strictly returns true only for MAIN_CARETAKER'
    );

    // 2. Unauthenticated request to circle details rejected (401)
    const unauthRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}`);
    assert(
      unauthRes.status === 401,
      '2. Unauthenticated request to circle details is rejected with 401 Unauthorized',
      `Status: ${unauthRes.status}`
    );

    // 3. Non-member user access to circle details rejected (403)
    const nonMemberRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}`, {
      headers: { Authorization: `Bearer ${unrelatedToken}` },
    });
    assert(
      nonMemberRes.status === 403,
      '3. Non-circle member cannot access circle details (403 Forbidden)',
      `Status: ${nonMemberRes.status}`
    );

    // 4. Non-caretaker cannot create invitation (403)
    const nonMainInviteRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${unrelatedToken}`,
      },
      body: JSON.stringify({
        email: 'test@example.com',
        role: 'FAMILY_MEMBER',
      }),
    });
    assert(
      nonMainInviteRes.status === 403,
      '4. Non-Main-Caretaker cannot create invitations (403 Forbidden)',
      `Status: ${nonMainInviteRes.status}`
    );

    // ================================================================
    // SECTION 2: INVITATION CREATION FOR ALL SUPPORTED ROLES
    // ================================================================
    console.log('\n--- Section 2: Invitation Creation & Role Validation ---');

    // 5. Attempting to invite MAIN_CARETAKER role is rejected (400)
    const invalidRoleRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        email: 'someone@example.com',
        role: 'MAIN_CARETAKER',
      }),
    });
    assert(
      invalidRoleRes.status === 400,
      '5. Attempting to invite MAIN_CARETAKER role is rejected with 400 validation error',
      `Status: ${invalidRoleRes.status}`
    );

    // 6. Invite PAID_DOCTOR
    const docInviteRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        email: existingDoctorEmail,
        role: 'PAID_DOCTOR',
      }),
    });
    const docInviteData = await docInviteRes.json();
    doctorInviteToken = docInviteData.data.token;
    doctorInviteId = docInviteData.data.invitation.id;

    assert(
      docInviteRes.status === 201 &&
        docInviteData.data.invitation.role === 'PAID_DOCTOR' &&
        typeof docInviteData.data.token === 'string',
      '6. Main Caretaker invites PAID_DOCTOR successfully and receives raw token (201 Created)',
      `Status: ${docInviteRes.status}`
    );

    // 7. Invite FAMILY_MEMBER (for unregistered user)
    const famInviteRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        email: newFamilyEmail,
        role: 'FAMILY_MEMBER',
      }),
    });
    const famInviteData = await famInviteRes.json();
    newFamilyInviteToken = famInviteData.data.token;
    newFamilyInviteId = famInviteData.data.invitation.id;

    assert(
      famInviteRes.status === 201 &&
        famInviteData.data.invitation.role === 'FAMILY_MEMBER',
      '7. Main Caretaker invites FAMILY_MEMBER successfully (201 Created)',
      `Status: ${famInviteRes.status}`
    );

    // 8. Invite PAID_CARETAKER
    const nurseInviteRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        email: nurseEmail,
        role: 'PAID_CARETAKER',
      }),
    });
    const nurseInviteData = await nurseInviteRes.json();
    nurseInviteToken = nurseInviteData.data.token;
    nurseInviteId = nurseInviteData.data.invitation.id;

    assert(
      nurseInviteRes.status === 201 &&
        nurseInviteData.data.invitation.role === 'PAID_CARETAKER',
      '8. Main Caretaker invites PAID_CARETAKER successfully (201 Created)',
      `Status: ${nurseInviteRes.status}`
    );

    // 9. Invite SUB_CARETAKER
    const subInviteRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        email: subCaretakerEmail,
        role: 'SUB_CARETAKER',
      }),
    });
    const subInviteData = await subInviteRes.json();
    subCaretakerInviteToken = subInviteData.data.token;
    subCaretakerInviteId = subInviteData.data.invitation.id;

    assert(
      subInviteRes.status === 201 &&
        subInviteData.data.invitation.role === 'SUB_CARETAKER',
      '9. Main Caretaker invites SUB_CARETAKER successfully (201 Created)',
      `Status: ${subInviteRes.status}`
    );

    // 10. Invite to be revoked
    const toRevokeRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        email: 'revokeme@example.com',
        role: 'FAMILY_MEMBER',
      }),
    });
    const toRevokeData = await toRevokeRes.json();
    toRevokeInviteToken = toRevokeData.data.token;
    toRevokeInviteId = toRevokeData.data.invitation.id;

    assert(
      toRevokeRes.status === 201,
      '10. Test invitation created for revocation testing'
    );

    // ================================================================
    // SECTION 3: LISTING & REVOCATION OF INVITATIONS
    // ================================================================
    console.log('\n--- Section 3: Pending Invitations & Revocation ---');

    // 11. List circle invitations
    const listInvRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/invitations`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const listInvData = await listInvRes.json();
    assert(
      listInvRes.status === 200 && listInvData.data.length >= 5,
      '11. Main Caretaker lists all circle invitations with populated metadata (200 OK)',
      `Count: ${listInvData.data?.length}`
    );

    // 12. Revoke an invitation
    const revokeRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/invitations/${toRevokeInviteId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    assert(
      revokeRes.status === 200,
      '12. Main Caretaker successfully revokes a pending invitation (200 OK)',
      `Status: ${revokeRes.status}`
    );

    // 13. Verify revoked invitation returns 400 INVITATION_REVOKED
    const verifyRevokedRes = await fetch(`${BASE_URL}/api/invitations/${toRevokeInviteToken}`);
    const verifyRevokedData = await verifyRevokedRes.json();
    assert(
      verifyRevokedRes.status === 400 && verifyRevokedData.code === 'INVITATION_REVOKED',
      '13. Public verification of revoked invitation returns 400 INVITATION_REVOKED',
      `Status: ${verifyRevokedRes.status}, Code: ${verifyRevokedData.code}`
    );

    // ================================================================
    // SECTION 4: INVITATION VERIFICATION & TOKEN SECURITY
    // ================================================================
    console.log('\n--- Section 4: Public Verification & Token Security ---');

    // 14. Verify valid doctor invitation (Public endpoint)
    const verifyDocRes = await fetch(`${BASE_URL}/api/invitations/${doctorInviteToken}`);
    const verifyDocData = await verifyDocRes.json();
    assert(
      verifyDocRes.status === 200 &&
        verifyDocData.data.valid === true &&
        verifyDocData.data.circleName === "Grandma Kanta's Circle" &&
        verifyDocData.data.role === 'PAID_DOCTOR' &&
        verifyDocData.data.email === existingDoctorEmail,
      '14. Public verification returns safe circle & role metadata without leaking tokenHash (200 OK)',
      `Role: ${verifyDocData.data?.role}`
    );

    // 15. Invalid / non-existent token returns 404 INVITATION_NOT_FOUND
    const fakeToken = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const fakeVerifyRes = await fetch(`${BASE_URL}/api/invitations/${fakeToken}`);
    const fakeVerifyData = await fakeVerifyRes.json();
    assert(
      fakeVerifyRes.status === 404 && fakeVerifyData.code === 'INVITATION_NOT_FOUND',
      '15. Non-existent token returns 404 INVITATION_NOT_FOUND',
      `Status: ${fakeVerifyRes.status}`
    );

    // ================================================================
    // SECTION 5: INVITATION ACCEPTANCE & ONBOARDING
    // ================================================================
    console.log('\n--- Section 5: Acceptance & Onboarding Workflows ---');

    // 16. Existing user acceptance with email mismatch fails (403)
    const mismatchRes = await fetch(`${BASE_URL}/api/invitations/${doctorInviteToken}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${unrelatedToken}`, // Logged in as unrelatedEmail, invite sent to existingDoctorEmail
      },
    });
    const mismatchData = await mismatchRes.json();
    assert(
      mismatchRes.status === 403 && mismatchData.code === 'INVITATION_EMAIL_MISMATCH',
      '16. Accepting invitation with mismatched logged-in user email is rejected (403 INVITATION_EMAIL_MISMATCH)',
      `Status: ${mismatchRes.status}, Code: ${mismatchData.code}`
    );

    // 17. Existing Doctor user accepts invitation with matching email
    const docAcceptRes = await fetch(`${BASE_URL}/api/invitations/${doctorInviteToken}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${existingDoctorToken}`,
      },
    });
    const docAcceptData = await docAcceptRes.json();
    assert(
      docAcceptRes.status === 200 &&
        docAcceptData.data.role === 'PAID_DOCTOR' &&
        docAcceptData.data.careCircleId === circleId,
      '17. Existing Doctor accepts invitation: joined circle with PAID_DOCTOR role (200 OK)',
      `Role: ${docAcceptData.data?.role}`
    );

    // 18. Attempting to re-accept already accepted invitation fails (400 INVITATION_ALREADY_USED)
    const reAcceptRes = await fetch(`${BASE_URL}/api/invitations/${doctorInviteToken}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${existingDoctorToken}`,
      },
    });
    const reAcceptData = await reAcceptRes.json();
    assert(
      reAcceptRes.status === 400 && reAcceptData.code === 'INVITATION_ALREADY_USED',
      '18. Single-use token enforcement: Re-accepting used invitation returns 400 INVITATION_ALREADY_USED',
      `Status: ${reAcceptRes.status}, Code: ${reAcceptData.code}`
    );

    // 19. New user onboarding via /accept-and-register (Atomic register + join)
    const newFamOnboardRes = await fetch(
      `${BASE_URL}/api/invitations/${newFamilyInviteToken}/accept-and-register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Pooja Family Member',
          password: testPassword,
          phone: '+919876543410',
        }),
      }
    );
    const newFamOnboardData = await newFamOnboardRes.json();
    assert(
      newFamOnboardRes.status === 201 &&
        newFamOnboardData.data.user.email === newFamilyEmail &&
        newFamOnboardData.data.role === 'FAMILY_MEMBER' &&
        typeof newFamOnboardData.data.tokens?.accessToken === 'string',
      '19. Unregistered user accepts invite and registers atomically in one step with tokens returned (201 Created)',
      `Status: ${newFamOnboardRes.status}, Role: ${newFamOnboardData.data?.role}`
    );

    // 20. Attempting to invite already active member email is rejected (409 MEMBERSHIP_ALREADY_EXISTS)
    const dupMemberInviteRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/invitations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          email: existingDoctorEmail, // Already a member now!
          role: 'PAID_DOCTOR',
        }),
      }
    );
    const dupMemberInviteData = await dupMemberInviteRes.json();
    assert(
      dupMemberInviteRes.status === 409 &&
        dupMemberInviteData.code === 'MEMBERSHIP_ALREADY_EXISTS',
      '20. Duplicate membership protection: Inviting an email that is already an active member returns 409 MEMBERSHIP_ALREADY_EXISTS',
      `Status: ${dupMemberInviteRes.status}, Code: ${dupMemberInviteData.code}`
    );

    // 21. Verify circle details now returns all 3 active members (Main, Doctor, Family)
    const circleDetailsRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const circleDetailsData = await circleDetailsRes.json();
    assert(
      circleDetailsRes.status === 200 &&
        Array.isArray(circleDetailsData.data.members) &&
        circleDetailsData.data.members.length === 3,
      '21. GET /api/care-circles/:id returns updated active members list (3 members)',
      `Member count: ${circleDetailsData.data?.members?.length}`
    );

    // 22. Verify Doctor user can list their care circles and see the joined circle
    const docCirclesRes = await fetch(`${BASE_URL}/api/care-circles`, {
      headers: { Authorization: `Bearer ${existingDoctorToken}` },
    });
    const docCirclesData = await docCirclesRes.json();
    assert(
      docCirclesRes.status === 200 &&
        docCirclesData.data.length >= 1 &&
        docCirclesData.data[0].role === 'PAID_DOCTOR',
      '22. Joined Doctor user lists their circles and sees active circle with PAID_DOCTOR role',
      `Role in circle: ${docCirclesData.data?.[0]?.role}`
    );

  } catch (error) {
    console.error('Test execution failed with error:', error);
    failed++;
  } finally {
    console.log('\n================================================================');
    console.log(`INVITATIONS INTEGRATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (serverInstance) {
      serverInstance.close();
    }
    await mongoose.connection.close();

    process.exit(failed > 0 ? 1 : 0);
  }
}

runInvitationsIntegrationTests();
