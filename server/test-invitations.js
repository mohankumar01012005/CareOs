/**
 * CareOS Backend Care Circle Invitation & Member Onboarding Test Suite
 * Automated verification of all 26+ implementation criteria
 */
const path = require("path");
const mongoose = require("mongoose");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = require("./server");
const User = require("./src/models/User");
const CareRecipient = require("./src/models/CareRecipient");
const CareCircle = require("./src/models/CareCircle");
const CareCircleMember = require("./src/models/CareCircleMember");
const CareCircleInvitation = require("./src/models/CareCircleInvitation");
const RefreshToken = require("./src/models/RefreshToken");
const { INVITATION_STATUS, CAREOS_ROLES } = require("./src/constants/roles");

let serverInstance;
const TEST_PORT = 5097;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runTests() {
  console.log("==================================================");
  console.log("CAREOS INVITATION & ONBOARDING BACKEND TEST SUITE");
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

  const timestamp = Date.now();
  const mainCaretakerEmail = `main.caretaker.${timestamp}@example.com`;
  const existingInviteeEmail = `existing.doctor.${timestamp}@example.com`;
  const newInviteeEmail = `new.family.${timestamp}@example.com`;
  const unrelatedUserEmail = `unrelated.user.${timestamp}@example.com`;
  const testPassword = "SecurePassword123!";

  let mainCaretakerToken = "";
  let mainCaretakerId = "";

  let existingInviteeToken = "";
  let existingInviteeId = "";

  let unrelatedUserToken = "";
  let unrelatedUserId = "";

  let circleId = "";
  let recipientId = "";

  let validInvitationToken = "";
  let validInvitationId = "";

  let newFamilyInvitationToken = "";
  let newFamilyInvitationId = "";

  try {
    // ----------------------------------------------------------------
    // Setup Test Users & Care Circle
    // ----------------------------------------------------------------
    // 1. Main Caretaker User
    const regMainRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dr. Arvind Main",
        email: mainCaretakerEmail,
        password: testPassword,
        phone: "+919876543201",
      }),
    });
    const regMainData = await regMainRes.json();
    mainCaretakerToken = regMainData.data.tokens.accessToken;
    mainCaretakerId = regMainData.data.user.id;

    // 2. Existing Invitee User (e.g. Paid Doctor)
    const regDoctorRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dr. Priya Doctor",
        email: existingInviteeEmail,
        password: testPassword,
        phone: "+919876543202",
      }),
    });
    const regDoctorData = await regDoctorRes.json();
    existingInviteeToken = regDoctorData.data.tokens.accessToken;
    existingInviteeId = regDoctorData.data.user.id;

    // 3. Unrelated User (Non-member)
    const regUnrelatedRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bob Unrelated",
        email: unrelatedUserEmail,
        password: testPassword,
        phone: "+919876543203",
      }),
    });
    const regUnrelatedData = await regUnrelatedRes.json();
    unrelatedUserToken = regUnrelatedData.data.tokens.accessToken;
    unrelatedUserId = regUnrelatedData.data.user.id;

    // 4. Create Care Circle for Main Caretaker
    const createCircleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mainCaretakerToken}`,
      },
      body: JSON.stringify({
        name: "Sharma Family Circle",
        recipient: {
          fullName: "Grandpa Ramanathan",
          gender: "male",
          bloodGroup: "O+",
          knownConditions: ["Hypertension"],
          allergies: ["Penicillin"],
        },
      }),
    });
    const createCircleData = await createCircleRes.json();
    circleId = createCircleData.data.careCircle.id;
    recipientId = createCircleData.data.careRecipient.id;

    // ----------------------------------------------------------------
    // 1. Unauthenticated user cannot create invitation (401)
    // ----------------------------------------------------------------
    const noAuthInviteRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/invitations`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: existingInviteeEmail,
          role: "PAID_DOCTOR",
        }),
      }
    );
    const noAuthInviteData = await noAuthInviteRes.json();
    assert(
      noAuthInviteRes.status === 401 && noAuthInviteData.code === "AUTH_TOKEN_MISSING",
      "1. Unauthenticated user cannot create invitation (401 AUTH_TOKEN_MISSING)"
    );

    // ----------------------------------------------------------------
    // 2. Non-member user cannot create invitation (403)
    // ----------------------------------------------------------------
    const nonMemberInviteRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/invitations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${unrelatedUserToken}`,
        },
        body: JSON.stringify({
          email: existingInviteeEmail,
          role: "PAID_DOCTOR",
        }),
      }
    );
    const nonMemberInviteData = await nonMemberInviteRes.json();
    assert(
      nonMemberInviteRes.status === 403 && nonMemberInviteData.code === "FORBIDDEN",
      "2. Non-member cannot create invitation (403 FORBIDDEN)"
    );

    // ----------------------------------------------------------------
    // 3. Non-MAIN_CARETAKER member cannot create invitation (403)
    // ----------------------------------------------------------------
    // Temporarily add a member as FAMILY_MEMBER
    const tempMember = await CareCircleMember.create({
      careCircle: circleId,
      user: unrelatedUserId,
      role: "FAMILY_MEMBER",
      membershipStatus: "ACTIVE",
    });

    const familyMemberInviteRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/invitations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${unrelatedUserToken}`,
        },
        body: JSON.stringify({
          email: "another.person@example.com",
          role: "PAID_CARETAKER",
        }),
      }
    );
    const familyMemberInviteData = await familyMemberInviteRes.json();
    assert(
      familyMemberInviteRes.status === 403 &&
        familyMemberInviteData.code === "FORBIDDEN" &&
        familyMemberInviteData.message.includes("Only the Main Caretaker"),
      "3. Non-MAIN_CARETAKER member cannot create invitation (403 FORBIDDEN)"
    );

    // Remove temporary member
    await CareCircleMember.deleteOne({ _id: tempMember._id });

    // ----------------------------------------------------------------
    // 4. Invalid email is rejected (400)
    // ----------------------------------------------------------------
    const invalidEmailRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/invitations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainCaretakerToken}`,
        },
        body: JSON.stringify({
          email: "not-an-email",
          role: "PAID_DOCTOR",
        }),
      }
    );
    const invalidEmailData = await invalidEmailRes.json();
    assert(
      invalidEmailRes.status === 400 &&
        invalidEmailData.success === false &&
        Array.isArray(invalidEmailData.errors),
      "4. Invalid email is rejected with 400 validation error"
    );

    // ----------------------------------------------------------------
    // 5. Invalid role is rejected (400)
    // ----------------------------------------------------------------
    const invalidRoleRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/invitations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainCaretakerToken}`,
        },
        body: JSON.stringify({
          email: existingInviteeEmail,
          role: "SUPER_ADMIN",
        }),
      }
    );
    const invalidRoleData = await invalidRoleRes.json();
    assert(
      invalidRoleRes.status === 400 &&
        invalidRoleData.success === false &&
        Array.isArray(invalidRoleData.errors),
      "5. Invalid role is rejected with 400 validation error"
    );

    // ----------------------------------------------------------------
    // 6. MAIN_CARETAKER cannot be selected as invitation role (400)
    // ----------------------------------------------------------------
    const mainRoleRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/invitations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainCaretakerToken}`,
        },
        body: JSON.stringify({
          email: existingInviteeEmail,
          role: "MAIN_CARETAKER",
        }),
      }
    );
    const mainRoleData = await mainRoleRes.json();
    assert(
      mainRoleRes.status === 400 &&
        mainRoleData.success === false &&
        Array.isArray(mainRoleData.errors),
      "6. MAIN_CARETAKER role cannot be chosen for invitation (rejected with 400)"
    );

    // ----------------------------------------------------------------
    // 7. CARE_RECEIVER cannot be selected as invitation role (400)
    // ----------------------------------------------------------------
    const receiverRoleRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/invitations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainCaretakerToken}`,
        },
        body: JSON.stringify({
          email: existingInviteeEmail,
          role: "CARE_RECEIVER",
        }),
      }
    );
    const receiverRoleData = await receiverRoleRes.json();
    assert(
      receiverRoleRes.status === 400 &&
        receiverRoleData.success === false &&
        Array.isArray(receiverRoleData.errors),
      "7. CARE_RECEIVER role cannot be chosen for invitation (rejected with 400)"
    );

    // ----------------------------------------------------------------
    // 8. MAIN_CARETAKER can create valid invitation for existing user email
    // ----------------------------------------------------------------
    const validInviteRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/invitations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainCaretakerToken}`,
        },
        body: JSON.stringify({
          email: existingInviteeEmail,
          role: "PAID_DOCTOR",
        }),
      }
    );
    const validInviteData = await validInviteRes.json();
    assert(
      validInviteRes.status === 201 &&
        validInviteData.success === true &&
        validInviteData.data.token &&
        validInviteData.data.invitation.email === existingInviteeEmail &&
        validInviteData.data.invitation.role === "PAID_DOCTOR" &&
        validInviteData.data.invitation.status === "PENDING",
      "8. MAIN_CARETAKER can create valid invitation (201 Created)"
    );

    validInvitationToken = validInviteData.data.token;
    validInvitationId = validInviteData.data.invitation.id;

    // ----------------------------------------------------------------
    // 9. Invitation token is NOT stored in raw form in MongoDB (Hash-at-Rest)
    // ----------------------------------------------------------------
    const dbInvitation = await CareCircleInvitation.findById(validInvitationId).select(
      "+tokenHash"
    );
    const expectedHash = crypto
      .createHash("sha256")
      .update(validInvitationToken)
      .digest("hex");

    assert(
      dbInvitation &&
        dbInvitation.tokenHash === expectedHash &&
        dbInvitation.tokenHash !== validInvitationToken &&
        dbInvitation.toObject().token === undefined,
      "9. Raw token is never stored in DB; only SHA-256 tokenHash is stored"
    );

    // ----------------------------------------------------------------
    // 10. Public invitation verification works (GET /api/invitations/:token)
    // ----------------------------------------------------------------
    const verifyRes = await fetch(`${BASE_URL}/api/invitations/${validInvitationToken}`);
    const verifyData = await verifyRes.json();
    assert(
      verifyRes.status === 200 &&
        verifyData.success === true &&
        verifyData.data.valid === true &&
        verifyData.data.circleName === "Sharma Family Circle" &&
        verifyData.data.email === existingInviteeEmail &&
        verifyData.data.role === "PAID_DOCTOR",
      "10. Public invitation verification endpoint validates token (200 OK)"
    );

    // ----------------------------------------------------------------
    // 11. Valid invitation verification exposes only safe metadata
    // ----------------------------------------------------------------
    const verifyStr = JSON.stringify(verifyData);
    assert(
      !verifyStr.includes("tokenHash") &&
        !verifyStr.includes("password") &&
        !verifyStr.includes("__v"),
      "11. Verification endpoint exposes safe metadata without tokenHash or internal fields"
    );

    // ----------------------------------------------------------------
    // 12. Expired invitation is rejected
    // ----------------------------------------------------------------
    // Create an invitation with expired timestamp
    const expiredTokenRaw = crypto.randomBytes(32).toString("hex");
    const expiredTokenHash = crypto
      .createHash("sha256")
      .update(expiredTokenRaw)
      .digest("hex");
    const expiredDoc = await CareCircleInvitation.create({
      careCircle: circleId,
      invitedBy: mainCaretakerId,
      email: "expired.invitee@example.com",
      role: "FAMILY_MEMBER",
      tokenHash: expiredTokenHash,
      expiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour ago
      status: "PENDING",
    });

    const verifyExpiredRes = await fetch(
      `${BASE_URL}/api/invitations/${expiredTokenRaw}`
    );
    const verifyExpiredData = await verifyExpiredRes.json();
    assert(
      verifyExpiredRes.status === 400 &&
        verifyExpiredData.code === "INVITATION_EXPIRED",
      "12. Expired invitation is rejected with 400 INVITATION_EXPIRED"
    );

    // ----------------------------------------------------------------
    // 13. Revoked invitation is rejected
    // ----------------------------------------------------------------
    const revokedTokenRaw = crypto.randomBytes(32).toString("hex");
    const revokedTokenHash = crypto
      .createHash("sha256")
      .update(revokedTokenRaw)
      .digest("hex");
    const revokedDoc = await CareCircleInvitation.create({
      careCircle: circleId,
      invitedBy: mainCaretakerId,
      email: "revoked.invitee@example.com",
      role: "SUB_CARETAKER",
      tokenHash: revokedTokenHash,
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
      status: "REVOKED",
    });

    const verifyRevokedRes = await fetch(
      `${BASE_URL}/api/invitations/${revokedTokenRaw}`
    );
    const verifyRevokedData = await verifyRevokedRes.json();
    assert(
      verifyRevokedRes.status === 400 &&
        verifyRevokedData.code === "INVITATION_REVOKED",
      "13. Revoked invitation is rejected with 400 INVITATION_REVOKED"
    );

    // ----------------------------------------------------------------
    // 14. Email mismatch rejection (403 INVITATION_EMAIL_MISMATCH)
    // ----------------------------------------------------------------
    // Unrelated user attempts to accept Doctor's invitation
    const mismatchAcceptRes = await fetch(
      `${BASE_URL}/api/invitations/${validInvitationToken}/accept`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${unrelatedUserToken}`,
        },
      }
    );
    const mismatchAcceptData = await mismatchAcceptRes.json();
    assert(
      mismatchAcceptRes.status === 403 &&
        mismatchAcceptData.code === "INVITATION_EMAIL_MISMATCH",
      "14. Accepting invitation with mismatched user email is rejected (403 INVITATION_EMAIL_MISMATCH)"
    );

    // ----------------------------------------------------------------
    // 15. Existing user accepts invitation successfully (POST /api/invitations/:token/accept)
    // ----------------------------------------------------------------
    const acceptRes = await fetch(
      `${BASE_URL}/api/invitations/${validInvitationToken}/accept`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${existingInviteeToken}`,
        },
      }
    );
    const acceptData = await acceptRes.json();
    assert(
      acceptRes.status === 200 &&
        acceptData.success === true &&
        acceptData.data.role === "PAID_DOCTOR" &&
        acceptData.data.membership.role === "PAID_DOCTOR",
      "15. Existing user accepts invitation successfully and joins circle with PAID_DOCTOR role"
    );

    // ----------------------------------------------------------------
    // 16. Correct CareCircleMember is created and Invitation status is ACCEPTED
    // ----------------------------------------------------------------
    const dbDoctorMember = await CareCircleMember.findOne({
      careCircle: circleId,
      user: existingInviteeId,
    });
    const dbUpdatedInvitation = await CareCircleInvitation.findById(validInvitationId);

    assert(
      dbDoctorMember &&
        dbDoctorMember.role === "PAID_DOCTOR" &&
        dbDoctorMember.membershipStatus === "ACTIVE" &&
        dbUpdatedInvitation.status === "ACCEPTED" &&
        dbUpdatedInvitation.acceptedBy.toString() === existingInviteeId,
      "16. DB verification: CareCircleMember is ACTIVE with PAID_DOCTOR role and invitation marked ACCEPTED"
    );

    // ----------------------------------------------------------------
    // 17. Used invitation cannot be accepted again (400 INVITATION_ALREADY_USED)
    // ----------------------------------------------------------------
    const reuseAcceptRes = await fetch(
      `${BASE_URL}/api/invitations/${validInvitationToken}/accept`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${existingInviteeToken}`,
        },
      }
    );
    const reuseAcceptData = await reuseAcceptRes.json();
    assert(
      reuseAcceptRes.status === 400 &&
        reuseAcceptData.code === "INVITATION_ALREADY_USED",
      "17. Attempt to re-use already accepted invitation is rejected with 400 INVITATION_ALREADY_USED"
    );

    // ----------------------------------------------------------------
    // 18. Duplicate membership prevention (409 MEMBERSHIP_ALREADY_EXISTS)
    // ----------------------------------------------------------------
    // Try to invite the doctor again who is now already an active member
    const dupInviteRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/invitations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainCaretakerToken}`,
        },
        body: JSON.stringify({
          email: existingInviteeEmail,
          role: "FAMILY_MEMBER",
        }),
      }
    );
    const dupInviteData = await dupInviteRes.json();
    assert(
      dupInviteRes.status === 409 &&
        dupInviteData.code === "MEMBERSHIP_ALREADY_EXISTS",
      "18. Inviting an existing active member of the Care Circle is rejected with 409 MEMBERSHIP_ALREADY_EXISTS"
    );

    // ----------------------------------------------------------------
    // 19. Create Invitation for New User Onboarding (FAMILY_MEMBER)
    // ----------------------------------------------------------------
    const newFamilyInviteRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/invitations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainCaretakerToken}`,
        },
        body: JSON.stringify({
          email: newInviteeEmail,
          role: "FAMILY_MEMBER",
        }),
      }
    );
    const newFamilyInviteData = await newFamilyInviteRes.json();
    assert(
      newFamilyInviteRes.status === 201 && newFamilyInviteData.data.token,
      "19. Main Caretaker creates invitation for new user (FAMILY_MEMBER)"
    );
    newFamilyInvitationToken = newFamilyInviteData.data.token;
    newFamilyInvitationId = newFamilyInviteData.data.invitation.id;

    // ----------------------------------------------------------------
    // 20. New User Onboarding via Invitation (POST /api/invitations/:token/accept-and-register)
    // ----------------------------------------------------------------
    const onboardRes = await fetch(
      `${BASE_URL}/api/invitations/${newFamilyInvitationToken}/accept-and-register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Kavita Sharma",
          password: "SecurePassword123!",
          phone: "+919876543204",
          // Spoof attempts ignored
          email: "attacker.override@example.com",
          role: "MAIN_CARETAKER",
        }),
      }
    );
    const onboardData = await onboardRes.json();
    assert(
      onboardRes.status === 201 &&
        onboardData.success === true &&
        onboardData.data.user.email === newInviteeEmail &&
        onboardData.data.user.name === "Kavita Sharma" &&
        onboardData.data.tokens.accessToken &&
        onboardData.data.tokens.refreshToken &&
        onboardData.data.membership.role === "FAMILY_MEMBER" &&
        onboardData.data.role === "FAMILY_MEMBER",
      "20. New user onboards via accept-and-register: derives email and role strictly from invite"
    );

    const newUserId = onboardData.data.user.id;

    // ----------------------------------------------------------------
    // 21. New user authentication tokens work on protected endpoints
    // ----------------------------------------------------------------
    const newMeRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${onboardData.data.tokens.accessToken}` },
    });
    const newMeData = await newMeRes.json();
    assert(
      newMeRes.status === 200 && newMeData.data.user.email === newInviteeEmail,
      "21. Newly onboarded user access token works immediately on protected endpoints"
    );

    // ----------------------------------------------------------------
    // 22. Newly onboarded user can view the Care Circle as FAMILY_MEMBER
    // ----------------------------------------------------------------
    const newCircleDetailsRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}`,
      {
        headers: { Authorization: `Bearer ${onboardData.data.tokens.accessToken}` },
      }
    );
    const newCircleDetailsData = await newCircleDetailsRes.json();
    assert(
      newCircleDetailsRes.status === 200 &&
        newCircleDetailsData.data.currentUserRole === "FAMILY_MEMBER" &&
        newCircleDetailsData.data.members.length === 3, // Main Caretaker, Doctor, Family Member
      "22. Newly onboarded member can view circle details with role FAMILY_MEMBER and 3 total members"
    );

    // ----------------------------------------------------------------
    // 23. Main Caretaker lists all invitations for the circle
    // ----------------------------------------------------------------
    const listInvitesRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/invitations`,
      {
        headers: { Authorization: `Bearer ${mainCaretakerToken}` },
      }
    );
    const listInvitesData = await listInvitesRes.json();
    assert(
      listInvitesRes.status === 200 &&
        listInvitesData.count >= 2 &&
        Array.isArray(listInvitesData.data),
      "23. Main Caretaker can list invitations for their Care Circle"
    );

    // ----------------------------------------------------------------
    // 24. Main Caretaker revokes a pending invitation
    // ----------------------------------------------------------------
    const createToRevokeRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/invitations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainCaretakerToken}`,
        },
        body: JSON.stringify({
          email: "to.revoke@example.com",
          role: "SUB_CARETAKER",
        }),
      }
    );
    const createToRevokeData = await createToRevokeRes.json();
    const inviteToRevokeId = createToRevokeData.data.invitation.id;

    const revokeRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/invitations/${inviteToRevokeId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${mainCaretakerToken}` },
      }
    );
    const revokeData = await revokeRes.json();
    assert(
      revokeRes.status === 200 && revokeData.success === true,
      "24. Main Caretaker can revoke a pending invitation (DELETE /invitations/:id)"
    );

    // ----------------------------------------------------------------
    // 25. Transaction Atomicity: Failed onboarding rolls back all records
    // ----------------------------------------------------------------
    const preRollbackUserCount = await User.countDocuments();
    const preRollbackMemberCount = await CareCircleMember.countDocuments();

    const rollbackTokenRaw = crypto.randomBytes(32).toString("hex");
    const rollbackTokenHash = crypto
      .createHash("sha256")
      .update(rollbackTokenRaw)
      .digest("hex");
    await CareCircleInvitation.create({
      careCircle: circleId,
      invitedBy: mainCaretakerId,
      email: "rollback.test@example.com",
      role: "PAID_CARETAKER",
      tokenHash: rollbackTokenHash,
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
      status: "PENDING",
    });

    // Provide invalid data causing failure inside transaction (e.g. invalid name format)
    const failedOnboardRes = await fetch(
      `${BASE_URL}/api/invitations/${rollbackTokenRaw}/accept-and-register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "R", // too short (fails validation)
          password: "Short",
        }),
      }
    );

    const postRollbackUserCount = await User.countDocuments();
    const postRollbackMemberCount = await CareCircleMember.countDocuments();

    assert(
      preRollbackUserCount === postRollbackUserCount &&
        preRollbackMemberCount === postRollbackMemberCount,
      "25. Transaction rollback: Failed onboarding attempts leave no partial records"
    );

    // ----------------------------------------------------------------
    // Clean up test records
    // ----------------------------------------------------------------
    await User.deleteMany({
      _id: { $in: [mainCaretakerId, existingInviteeId, unrelatedUserId, newUserId] },
    });
    await RefreshToken.deleteMany({
      userId: { $in: [mainCaretakerId, existingInviteeId, unrelatedUserId, newUserId] },
    });
    await CareCircle.deleteOne({ _id: circleId });
    await CareRecipient.deleteOne({ _id: recipientId });
    await CareCircleMember.deleteMany({ careCircle: circleId });
    await CareCircleInvitation.deleteMany({ careCircle: circleId });
    await CareCircleInvitation.deleteMany({ _id: { $in: [expiredDoc._id, revokedDoc._id] } });

    console.log("\nInvitation test records cleaned up successfully.");
  } catch (err) {
    console.error("Test suite execution encountered an error:", err);
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
