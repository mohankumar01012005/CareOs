/**
 * CareOS RBAC & Circle-Level Authorization Test Suite
 * Automated verification of Implementation 04 requirements
 */
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = require("./server");
const User = require("./src/models/User");
const CareRecipient = require("./src/models/CareRecipient");
const CareCircle = require("./src/models/CareCircle");
const CareCircleMember = require("./src/models/CareCircleMember");
const CareCircleInvitation = require("./src/models/CareCircleInvitation");
const RefreshToken = require("./src/models/RefreshToken");
const {
  CAREOS_ROLES,
  CARETAKER_ROLES,
  CLINICAL_ROLES,
  FAMILY_ROLES,
  CIRCLE_STATUS,
  MEMBERSHIP_STATUS,
} = require("./src/constants/roles");
const {
  requireCircleRole,
  hasCircleRole,
} = require("./src/middleware/circleAuth.middleware");

let serverInstance;
const TEST_PORT = 5096;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runRbacTests() {
  console.log("==================================================");
  console.log("CAREOS RBAC & CIRCLE-LEVEL PERMISSIONS TEST SUITE");
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
  console.log("Connected to MongoDB for RBAC testing.");

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`RBAC Test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  const timestamp = Date.now();
  const user1Email = `rbac.user1.${timestamp}@example.com`;
  const user2Email = `rbac.user2.${timestamp}@example.com`;
  const user3Email = `rbac.user3.${timestamp}@example.com`;
  const testPassword = "Password123!Safe";

  let user1Token = "";
  let user2Token = "";
  let user3Token = "";

  let user1Id = "";
  let user2Id = "";
  let user3Id = "";

  let circleAId = "";
  let circleBId = "";

  try {
    // ----------------------------------------------------------------
    // Setup Test Users
    // ----------------------------------------------------------------
    // Register User 1
    const reg1Res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Caretaker",
        email: user1Email,
        password: testPassword,
        phone: "+919876543211",
      }),
    });
    const reg1Data = await reg1Res.json();
    user1Token = reg1Data.data.tokens.accessToken;
    user1Id = reg1Data.data.user.id;

    // Register User 2
    const reg2Res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bob FamilyMember",
        email: user2Email,
        password: testPassword,
        phone: "+919876543212",
      }),
    });
    const reg2Data = await reg2Res.json();
    user2Token = reg2Data.data.tokens.accessToken;
    user2Id = reg2Data.data.user.id;

    // Register User 3
    const reg3Res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Charlie Doctor",
        email: user3Email,
        password: testPassword,
        phone: "+919876543213",
      }),
    });
    const reg3Data = await reg3Res.json();
    user3Token = reg3Data.data.tokens.accessToken;
    user3Id = reg3Data.data.user.id;

    // ----------------------------------------------------------------
    // Setup Circle A (Created by User 1 -> User 1 is MAIN_CARETAKER)
    // ----------------------------------------------------------------
    const createCircleARes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        name: "Circle Alpha",
        recipient: {
          fullName: "Recipient Alpha",
          gender: "female",
          bloodGroup: "A+",
        },
      }),
    });
    const createCircleAData = await createCircleARes.json();
    circleAId = createCircleAData.data.careCircle.id;

    // ----------------------------------------------------------------
    // Setup Circle B (Created by User 2 -> User 2 is MAIN_CARETAKER)
    // ----------------------------------------------------------------
    const createCircleBRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user2Token}`,
      },
      body: JSON.stringify({
        name: "Circle Beta",
        recipient: {
          fullName: "Recipient Beta",
          gender: "male",
          bloodGroup: "B+",
        },
      }),
    });
    const createCircleBData = await createCircleBRes.json();
    circleBId = createCircleBData.data.careCircle.id;

    // Add User 1 as FAMILY_MEMBER in Circle B
    await CareCircleMember.create({
      careCircle: circleBId,
      user: user1Id,
      role: CAREOS_ROLES.FAMILY_MEMBER,
      membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
    });

    // Add User 3 as PAID_DOCTOR in Circle A
    await CareCircleMember.create({
      careCircle: circleAId,
      user: user3Id,
      role: CAREOS_ROLES.PAID_DOCTOR,
      membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
    });

    // ================================================================
    // Requirement 1: Unauthenticated request handling
    // ================================================================
    const unauthRes = await fetch(`${BASE_URL}/api/care-circles/${circleAId}`, {
      headers: { "Content-Type": "application/json" },
    });
    const unauthData = await unauthRes.json();
    assert(
      unauthRes.status === 401 && unauthData.code === "AUTH_TOKEN_MISSING",
      "1. Unauthenticated request rejected with 401 AUTH_TOKEN_MISSING"
    );

    const invalidTokenRes = await fetch(`${BASE_URL}/api/care-circles/${circleAId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid.jwt.token",
      },
    });
    const invalidTokenData = await invalidTokenRes.json();
    assert(
      invalidTokenRes.status === 401 && invalidTokenData.code === "AUTH_TOKEN_INVALID",
      "2. Invalid token request rejected with 401 AUTH_TOKEN_INVALID"
    );

    // ================================================================
    // Requirement 2: Authenticated user with NO membership in target circle
    // ================================================================
    // User 3 is NOT a member of Circle B
    const noMembershipRes = await fetch(`${BASE_URL}/api/care-circles/${circleBId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user3Token}`,
      },
    });
    const noMembershipData = await noMembershipRes.json();
    assert(
      noMembershipRes.status === 403 && noMembershipData.code === "FORBIDDEN",
      "3. Authenticated user with no membership in requested circle is denied (403 FORBIDDEN)"
    );

    // ================================================================
    // Requirement 3: Inactive & Suspended Membership Status
    // ================================================================
    // Create an inactive membership for a test scenario
    const inactiveUserEmail = `rbac.inactive.${timestamp}@example.com`;
    const regInactiveRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Inactive Member",
        email: inactiveUserEmail,
        password: testPassword,
      }),
    });
    const regInactiveData = await regInactiveRes.json();
    const inactiveToken = regInactiveData.data.tokens.accessToken;
    const inactiveUserId = regInactiveData.data.user.id;

    // Create INACTIVE membership in Circle A
    const inactiveMemberDoc = await CareCircleMember.create({
      careCircle: circleAId,
      user: inactiveUserId,
      role: CAREOS_ROLES.FAMILY_MEMBER,
      membershipStatus: MEMBERSHIP_STATUS.INACTIVE,
    });

    const inactiveAccessRes = await fetch(`${BASE_URL}/api/care-circles/${circleAId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${inactiveToken}`,
      },
    });
    const inactiveAccessData = await inactiveAccessRes.json();
    assert(
      inactiveAccessRes.status === 403 && inactiveAccessData.code === "FORBIDDEN",
      "4. Inactive membership (status: INACTIVE) is denied (403 FORBIDDEN)"
    );

    // Update status to SUSPENDED
    inactiveMemberDoc.membershipStatus = MEMBERSHIP_STATUS.SUSPENDED;
    await inactiveMemberDoc.save();

    const suspendedAccessRes = await fetch(`${BASE_URL}/api/care-circles/${circleAId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${inactiveToken}`,
      },
    });
    const suspendedAccessData = await suspendedAccessRes.json();
    assert(
      suspendedAccessRes.status === 403 && suspendedAccessData.code === "FORBIDDEN",
      "5. Suspended membership (status: SUSPENDED) is denied (403 FORBIDDEN)"
    );

    // ================================================================
    // Requirement 4: Active member with allowed role
    // ================================================================
    // User 1 is MAIN_CARETAKER in Circle A -> Allowed to view details & create invitation
    const activeAllowedDetailsRes = await fetch(`${BASE_URL}/api/care-circles/${circleAId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Token}`,
      },
    });
    const activeAllowedDetailsData = await activeAllowedDetailsRes.json();
    assert(
      activeAllowedDetailsRes.status === 200 &&
        activeAllowedDetailsData.success === true &&
        activeAllowedDetailsData.data.currentUserRole === CAREOS_ROLES.MAIN_CARETAKER,
      "6. Active MAIN_CARETAKER can access circle details (200 OK)"
    );

    // User 1 creates invitation in Circle A
    const inviteRes = await fetch(`${BASE_URL}/api/care-circles/${circleAId}/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        email: `new.member.${timestamp}@example.com`,
        role: CAREOS_ROLES.SUB_CARETAKER,
      }),
    });
    const inviteData = await inviteRes.json();
    assert(
      inviteRes.status === 201 && inviteData.success === true,
      "7. Active MAIN_CARETAKER can create circle invitations (201 Created)"
    );

    // ================================================================
    // Requirement 5: Active member with disallowed role
    // ================================================================
    // User 3 is PAID_DOCTOR in Circle A -> Allowed to view details (member), but NOT create invitation (MAIN_CARETAKER only)
    const doctorDetailsRes = await fetch(`${BASE_URL}/api/care-circles/${circleAId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user3Token}`,
      },
    });
    const doctorDetailsData = await doctorDetailsRes.json();
    assert(
      doctorDetailsRes.status === 200 &&
        doctorDetailsData.data.currentUserRole === CAREOS_ROLES.PAID_DOCTOR,
      "8. Active PAID_DOCTOR can access circle details as member (200 OK)"
    );

    const doctorInviteRes = await fetch(`${BASE_URL}/api/care-circles/${circleAId}/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user3Token}`,
      },
      body: JSON.stringify({
        email: `doctor.invited.${timestamp}@example.com`,
        role: CAREOS_ROLES.FAMILY_MEMBER,
      }),
    });
    const doctorInviteData = await doctorInviteRes.json();
    assert(
      doctorInviteRes.status === 403 &&
        doctorInviteData.code === "FORBIDDEN" &&
        doctorInviteData.message.includes("Only the Main Caretaker"),
      "9. Active PAID_DOCTOR is denied from creating invitations (403 FORBIDDEN)"
    );

    // ================================================================
    // Requirement 6: Multi-Circle Role Independence (Same user, different roles in different circles)
    // ================================================================
    // User 1 is MAIN_CARETAKER in Circle A, but FAMILY_MEMBER in Circle B
    // In Circle A: User 1 CAN list invitations
    const user1CircleAInvitesRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleAId}/invitations`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user1Token}`,
        },
      }
    );
    const user1CircleAInvitesData = await user1CircleAInvitesRes.json();
    assert(
      user1CircleAInvitesRes.status === 200 && user1CircleAInvitesData.success === true,
      "10. User 1 acting as MAIN_CARETAKER in Circle A can list invitations (200 OK)"
    );

    // In Circle B: User 1 is FAMILY_MEMBER -> CANNOT list invitations
    const user1CircleBInvitesRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleBId}/invitations`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user1Token}`,
        },
      }
    );
    const user1CircleBInvitesData = await user1CircleBInvitesRes.json();
    assert(
      user1CircleBInvitesRes.status === 403 &&
        user1CircleBInvitesData.code === "FORBIDDEN" &&
        user1CircleBInvitesData.message.includes("Only the Main Caretaker"),
      "11. User 1 acting as FAMILY_MEMBER in Circle B is denied from listing invitations (403 FORBIDDEN)"
    );

    // In Circle B: User 2 is MAIN_CARETAKER -> CAN list invitations
    const user2CircleBInvitesRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleBId}/invitations`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user2Token}`,
        },
      }
    );
    const user2CircleBInvitesData = await user2CircleBInvitesRes.json();
    assert(
      user2CircleBInvitesRes.status === 200 && user2CircleBInvitesData.success === true,
      "12. User 2 acting as MAIN_CARETAKER in Circle B can list invitations (200 OK)"
    );

    // ================================================================
    // Requirement 7: Cross-Circle Access Prevention
    // ================================================================
    // User 2 (MAIN_CARETAKER of Circle B) attempts to access Circle A where User 2 has no membership
    const crossCircleDetailsRes = await fetch(`${BASE_URL}/api/care-circles/${circleAId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user2Token}`,
      },
    });
    const crossCircleDetailsData = await crossCircleDetailsRes.json();
    assert(
      crossCircleDetailsRes.status === 403 && crossCircleDetailsData.code === "FORBIDDEN",
      "13. User 2 cannot access Circle A details (Cross-circle access rejected with 403)"
    );

    // User 2 attempts to create an invitation in Circle A
    const crossCircleInviteRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleAId}/invitations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user2Token}`,
        },
        body: JSON.stringify({
          email: `attacker.${timestamp}@example.com`,
          role: CAREOS_ROLES.SUB_CARETAKER,
        }),
      }
    );
    const crossCircleInviteData = await crossCircleInviteRes.json();
    assert(
      crossCircleInviteRes.status === 403 && crossCircleInviteData.code === "FORBIDDEN",
      "14. User 2 cannot create invitations in Circle A (Cross-circle privilege escalation prevented)"
    );

    // ================================================================
    // Requirement 8: Role constant groups & programmatic RBAC helpers
    // ================================================================
    assert(
      Array.isArray(CARETAKER_ROLES) &&
        CARETAKER_ROLES.includes(CAREOS_ROLES.MAIN_CARETAKER) &&
        CARETAKER_ROLES.includes(CAREOS_ROLES.SUB_CARETAKER),
      "15. CARETAKER_ROLES constant includes MAIN_CARETAKER and SUB_CARETAKER"
    );

    assert(
      Array.isArray(CLINICAL_ROLES) &&
        CLINICAL_ROLES.includes(CAREOS_ROLES.PAID_DOCTOR) &&
        CLINICAL_ROLES.includes(CAREOS_ROLES.PAID_CARETAKER),
      "16. CLINICAL_ROLES constant includes PAID_DOCTOR and PAID_CARETAKER"
    );

    assert(
      Array.isArray(FAMILY_ROLES) &&
        FAMILY_ROLES.includes(CAREOS_ROLES.FAMILY_MEMBER) &&
        FAMILY_ROLES.includes(CAREOS_ROLES.CARE_RECEIVER),
      "17. FAMILY_ROLES constant includes FAMILY_MEMBER and CARE_RECEIVER"
    );

    assert(
      hasCircleRole(CAREOS_ROLES.MAIN_CARETAKER, CARETAKER_ROLES) === true &&
        hasCircleRole(CAREOS_ROLES.PAID_DOCTOR, CARETAKER_ROLES) === false,
      "18. hasCircleRole helper accurately validates role inclusion"
    );

    // Test requireCircleRole higher-order middleware factory execution
    const mockReq = {
      circleMembership: {
        role: CAREOS_ROLES.FAMILY_MEMBER,
        membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
      },
      careCircle: { id: "test" },
    };
    let middlewareForbidden = false;
    const mockRes = {
      status: (s) => ({
        json: (data) => {
          if (s === 403 && data.code === "FORBIDDEN") middlewareForbidden = true;
        },
      }),
    };
    const testMiddleware = requireCircleRole(CARETAKER_ROLES);
    await testMiddleware(mockReq, mockRes, () => {});
    assert(
      middlewareForbidden === true,
      "19. requireCircleRole correctly blocks disallowed role in middleware pipeline"
    );

    let middlewarePassed = false;
    mockReq.circleMembership.role = CAREOS_ROLES.MAIN_CARETAKER;
    await testMiddleware(mockReq, mockRes, () => {
      middlewarePassed = true;
    });
    assert(
      middlewarePassed === true,
      "20. requireCircleRole correctly allows permitted role in middleware pipeline"
    );

    // ================================================================
    // Requirement 9: Archived Care Circle Handling
    // ================================================================
    const circleDoc = await CareCircle.findById(circleAId);
    circleDoc.status = CIRCLE_STATUS.ARCHIVED;
    await circleDoc.save();

    const archivedAccessRes = await fetch(`${BASE_URL}/api/care-circles/${circleAId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Token}`,
      },
    });
    const archivedAccessData = await archivedAccessRes.json();
    assert(
      archivedAccessRes.status === 404 &&
        archivedAccessData.code === "CIRCLE_NOT_FOUND" &&
        archivedAccessData.message.includes("archived"),
      "21. Archived Care Circle access is rejected with 404 CIRCLE_NOT_FOUND"
    );

    // ================================================================
    // Requirement 10: Non-existent Circle ID
    // ================================================================
    const nonExistentId = "507f1f77bcf86cd799439011";
    const notFoundRes = await fetch(`${BASE_URL}/api/care-circles/${nonExistentId}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user1Token}`,
      },
    });
    const notFoundData = await notFoundRes.json();
    assert(
      notFoundRes.status === 404 && notFoundData.code === "CIRCLE_NOT_FOUND",
      "22. Non-existent Care Circle ID returns 404 CIRCLE_NOT_FOUND"
    );
  } catch (error) {
    console.error("Test execution error:", error);
    failed++;
  } finally {
    // Clean up test data
    console.log("\nCleaning up RBAC test records...");
    await User.deleteMany({
      email: {
        $in: [
          user1Email,
          user2Email,
          user3Email,
          `rbac.inactive.${timestamp}@example.com`,
        ],
      },
    });
    if (circleAId) {
      await CareCircle.findByIdAndDelete(circleAId);
      await CareCircleMember.deleteMany({ careCircle: circleAId });
      await CareCircleInvitation.deleteMany({ careCircle: circleAId });
    }
    if (circleBId) {
      await CareCircle.findByIdAndDelete(circleBId);
      await CareCircleMember.deleteMany({ careCircle: circleBId });
      await CareCircleInvitation.deleteMany({ careCircle: circleBId });
    }
    console.log("RBAC test records cleaned up successfully.");

    if (serverInstance) {
      serverInstance.close();
    }
    await mongoose.connection.close();
  }

  console.log("==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runRbacTests();
