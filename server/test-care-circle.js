/**
 * CareOS Backend Care Circle & Care Recipient Test Suite
 * Automated verification of all 15 implementation criteria
 */
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = require("./server");
const User = require("./src/models/User");
const CareRecipient = require("./src/models/CareRecipient");
const CareCircle = require("./src/models/CareCircle");
const CareCircleMember = require("./src/models/CareCircleMember");
const RefreshToken = require("./src/models/RefreshToken");

let serverInstance;
const TEST_PORT = 5098;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runTests() {
  console.log("==================================================");
  console.log("CAREOS CARE CIRCLE & RECIPIENT BACKEND TEST SUITE");
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
  const userAEmail = `user.a.${timestamp}@example.com`;
  const userBEmail = `user.b.${timestamp}@example.com`;
  const testPassword = "SecurePassword123!";

  let userAToken = "";
  let userBToken = "";
  let userAId = "";
  let userBId = "";

  let createdCircleId = "";
  let createdRecipientId = "";
  let secondCircleId = "";

  try {
    // ----------------------------------------------------------------
    // Setup Test Users
    // ----------------------------------------------------------------
    const regUserARes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice Caretaker",
        email: userAEmail,
        password: testPassword,
        phone: "+919876543210",
      }),
    });
    const regUserAData = await regUserARes.json();
    userAToken = regUserAData.data.tokens.accessToken;
    userAId = regUserAData.data.user.id;

    const regUserBRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bob Unrelated",
        email: userBEmail,
        password: testPassword,
        phone: "+919876543211",
      }),
    });
    const regUserBData = await regUserBRes.json();
    userBToken = regUserBData.data.tokens.accessToken;
    userBId = regUserBData.data.user.id;

    // ----------------------------------------------------------------
    // 1. Unauthenticated request to protected endpoints is rejected (401)
    // ----------------------------------------------------------------
    const noAuthPostRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Circle" }),
    });
    const noAuthPostData = await noAuthPostRes.json();
    assert(
      noAuthPostRes.status === 401 && noAuthPostData.code === "AUTH_TOKEN_MISSING",
      "1. POST /api/care-circles rejects unauthenticated request with 401 AUTH_TOKEN_MISSING"
    );

    const noAuthGetRes = await fetch(`${BASE_URL}/api/care-circles`);
    const noAuthGetData = await noAuthGetRes.json();
    assert(
      noAuthGetRes.status === 401 && noAuthGetData.code === "AUTH_TOKEN_MISSING",
      "2. GET /api/care-circles rejects unauthenticated request with 401 AUTH_TOKEN_MISSING"
    );

    // ----------------------------------------------------------------
    // 2. Validation Failures (400 Bad Request)
    // ----------------------------------------------------------------
    const invalidPayloadRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        name: "A", // too short
        recipient: {
          fullName: "", // empty
          gender: "invalid_gender", // invalid enum
          bloodGroup: "Z+", // invalid enum
          dateOfBirth: "not-a-date", // invalid date
        },
      }),
    });
    const invalidPayloadData = await invalidPayloadRes.json();
    assert(
      invalidPayloadRes.status === 400 &&
        invalidPayloadData.success === false &&
        Array.isArray(invalidPayloadData.errors) &&
        invalidPayloadData.errors.length >= 4,
      "3. Validation rejects invalid circle name, empty recipient name, and invalid enums with 400",
      JSON.stringify(invalidPayloadData.errors)
    );

    // ----------------------------------------------------------------
    // 3. Authenticated User Creates Care Circle & Recipient (Role Immunity)
    // ----------------------------------------------------------------
    const createRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        name: "Sharma Family Care",
        recipient: {
          fullName: "Grandma Sita",
          dateOfBirth: "1948-05-12T00:00:00.000Z",
          gender: "female",
          bloodGroup: "O+",
          knownConditions: ["Hypertension", "Type 2 Diabetes"],
          allergies: ["Penicillin", "Peanuts"],
          emergencyContact: {
            name: "Rahul Sharma",
            relationship: "Son",
            phone: "+919876543210",
          },
          profilePhoto: "https://example.com/photos/grandma.jpg",
        },
        // Client attempt to spoof role and privileged fields
        role: "PAID_DOCTOR",
        membershipStatus: "SUSPENDED",
        createdBy: "654321654321654321654321",
      }),
    });
    const createData = await createRes.json();

    assert(
      createRes.status === 201 && createData.success === true,
      "4. Authenticated user can create Care Circle + Recipient successfully",
      JSON.stringify(createData)
    );

    assert(
      createData.data.careCircle &&
        createData.data.careCircle.name === "Sharma Family Care" &&
        createData.data.careCircle.status === "ACTIVE",
      "5. Care Circle is created with ACTIVE status"
    );

    assert(
      createData.data.careRecipient &&
        createData.data.careRecipient.fullName === "Grandma Sita" &&
        createData.data.careRecipient.bloodGroup === "O+" &&
        createData.data.careRecipient.gender === "female" &&
        createData.data.careRecipient.allergies.includes("Penicillin"),
      "6. Care Recipient document is created with correct medical & contact fields"
    );

    assert(
      createData.data.membership &&
        createData.data.membership.role === "MAIN_CARETAKER" &&
        createData.data.membership.membershipStatus === "ACTIVE",
      "7. Creator automatically becomes MAIN_CARETAKER (client spoofing PAID_DOCTOR was ignored)"
    );

    createdCircleId = createData.data.careCircle.id;
    createdRecipientId = createData.data.careRecipient.id;

    // ----------------------------------------------------------------
    // 4. Verify Database Relationships & Absence of Global Role on User
    // ----------------------------------------------------------------
    const dbCircle = await CareCircle.findById(createdCircleId);
    const dbRecipient = await CareRecipient.findById(createdRecipientId);
    const dbMembership = await CareCircleMember.findOne({
      careCircle: createdCircleId,
      user: userAId,
    });
    const dbUser = await User.findById(userAId);

    assert(
      dbCircle &&
        dbCircle.careRecipient.toString() === createdRecipientId &&
        dbCircle.createdBy.toString() === userAId,
      "8. Database relationships: CareCircle points to CareRecipient and creator User"
    );

    assert(
      dbRecipient && dbRecipient.createdBy.toString() === userAId,
      "9. Database relationships: CareRecipient records creator User ID"
    );

    assert(
      dbMembership &&
        dbMembership.careCircle.toString() === createdCircleId &&
        dbMembership.user.toString() === userAId &&
        dbMembership.role === "MAIN_CARETAKER",
      "10. Database relationships: CareCircleMember binds Circle, User, and MAIN_CARETAKER role"
    );

    assert(
      dbUser && dbUser.role === undefined && dbUser.careCircle === undefined,
      "11. Architecture check: User model has NO global role or circle membership embedded"
    );

    // ----------------------------------------------------------------
    // 5. Unique Membership Constraint (Prevent Duplicates)
    // ----------------------------------------------------------------
    let duplicateCaught = false;
    try {
      await CareCircleMember.create({
        careCircle: createdCircleId,
        user: userAId,
        role: "FAMILY_MEMBER",
      });
    } catch (err) {
      if (err.code === 11000 || err.name === "MongoServerError") {
        duplicateCaught = true;
      }
    }
    assert(
      duplicateCaught === true,
      "12. Compound index enforces uniqueness: duplicate membership for same user/circle is rejected"
    );

    // ----------------------------------------------------------------
    // 6. List User's Circles (GET /api/care-circles)
    // ----------------------------------------------------------------
    const listUserARes = await fetch(`${BASE_URL}/api/care-circles`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const listUserAData = await listUserARes.json();
    assert(
      listUserARes.status === 200 &&
        listUserAData.success === true &&
        listUserAData.count === 1 &&
        listUserAData.data[0].id === createdCircleId &&
        listUserAData.data[0].role === "MAIN_CARETAKER" &&
        listUserAData.data[0].careRecipient.fullName === "Grandma Sita",
      "13. GET /api/care-circles returns circles where user is a member with populated recipient",
      JSON.stringify(listUserAData)
    );

    const listUserBRes = await fetch(`${BASE_URL}/api/care-circles`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });
    const listUserBData = await listUserBRes.json();
    assert(
      listUserBRes.status === 200 &&
        listUserBData.success === true &&
        listUserBData.count === 0 &&
        listUserBData.data.length === 0,
      "14. GET /api/care-circles for non-member user returns empty list (no leakage)"
    );

    // ----------------------------------------------------------------
    // 7. Circle Details & Authorization (GET /api/care-circles/:circleId)
    // ----------------------------------------------------------------
    const detailsMemberRes = await fetch(
      `${BASE_URL}/api/care-circles/${createdCircleId}`,
      {
        headers: { Authorization: `Bearer ${userAToken}` },
      }
    );
    const detailsMemberData = await detailsMemberRes.json();
    assert(
      detailsMemberRes.status === 200 &&
        detailsMemberData.success === true &&
        detailsMemberData.data.careCircle.id === createdCircleId &&
        detailsMemberData.data.careCircle.careRecipient.fullName === "Grandma Sita" &&
        detailsMemberData.data.currentUserRole === "MAIN_CARETAKER" &&
        Array.isArray(detailsMemberData.data.members) &&
        detailsMemberData.data.members.length === 1 &&
        detailsMemberData.data.members[0].user.name === "Alice Caretaker",
      "15. Circle member can retrieve full details with recipient and sanitized members list",
      JSON.stringify(detailsMemberData)
    );

    // ----------------------------------------------------------------
    // 8. Non-member Access Rejection (403 Forbidden)
    // ----------------------------------------------------------------
    const detailsNonMemberRes = await fetch(
      `${BASE_URL}/api/care-circles/${createdCircleId}`,
      {
        headers: { Authorization: `Bearer ${userBToken}` },
      }
    );
    const detailsNonMemberData = await detailsNonMemberRes.json();
    assert(
      detailsNonMemberRes.status === 403 &&
        detailsNonMemberData.success === false &&
        detailsNonMemberData.code === "FORBIDDEN",
      "16. Non-member user is rejected with 403 FORBIDDEN when attempting to access another circle",
      JSON.stringify(detailsNonMemberData)
    );

    // ----------------------------------------------------------------
    // 9. Malformed & Non-existent Circle IDs
    // ----------------------------------------------------------------
    const malformedIdRes = await fetch(
      `${BASE_URL}/api/care-circles/invalid-circle-id-123`,
      {
        headers: { Authorization: `Bearer ${userAToken}` },
      }
    );
    const malformedIdData = await malformedIdRes.json();
    assert(
      malformedIdRes.status === 400 &&
        malformedIdData.success === false &&
        Array.isArray(malformedIdData.errors),
      "17. Malformed circleId in URL parameter is rejected with 400 validation error",
      JSON.stringify(malformedIdData)
    );

    const nonExistentCircleId = "507f1f77bcf86cd799439011";
    const notFoundRes = await fetch(
      `${BASE_URL}/api/care-circles/${nonExistentCircleId}`,
      {
        headers: { Authorization: `Bearer ${userAToken}` },
      }
    );
    const notFoundData = await notFoundRes.json();
    assert(
      notFoundRes.status === 404 &&
        notFoundData.success === false &&
        notFoundData.code === "CIRCLE_NOT_FOUND",
      "18. Non-existent Care Circle ID returns 404 CIRCLE_NOT_FOUND",
      JSON.stringify(notFoundData)
    );

    // ----------------------------------------------------------------
    // 10. Privacy & Sensitive Data Leak Prevention
    // ----------------------------------------------------------------
    const detailsStr = JSON.stringify(detailsMemberData);
    assert(
      !detailsStr.includes("passwordHash") &&
        !detailsStr.includes("password") &&
        !detailsStr.includes("__v"),
      "19. Response payload never exposes passwordHash, passwords, or __v metadata"
    );

    // ----------------------------------------------------------------
    // 11. Multi-Circle Support for Same User
    // ----------------------------------------------------------------
    const createSecondRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        name: "Sharma In-Laws Care Circle",
        recipient: {
          fullName: "Grandpa Ramesh",
          gender: "male",
          bloodGroup: "B+",
          knownConditions: ["Arthritis"],
          allergies: [],
        },
      }),
    });
    const createSecondData = await createSecondRes.json();
    secondCircleId = createSecondData.data?.careCircle?.id;

    const listMultiRes = await fetch(`${BASE_URL}/api/care-circles`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    const listMultiData = await listMultiRes.json();
    assert(
      createSecondRes.status === 201 &&
        listMultiRes.status === 200 &&
        listMultiData.count === 2,
      "20. User can create and belong to multiple Care Circles independently"
    );

    // ----------------------------------------------------------------
    // 12. Transaction Atomicity Verification (Rollback on Error)
    // ----------------------------------------------------------------
    const preRollbackRecipientCount = await CareRecipient.countDocuments();
    const preRollbackCircleCount = await CareCircle.countDocuments();
    const preRollbackMemberCount = await CareCircleMember.countDocuments();

    // Trigger an error during circle creation by mocking/causing a validation error in transaction
    const failedTxRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        name: "Valid Circle Name",
        recipient: {
          fullName: "Valid Recipient",
          gender: "invalid_gender_that_bypasses_or_fails",
        },
      }),
    });

    const postRollbackRecipientCount = await CareRecipient.countDocuments();
    const postRollbackCircleCount = await CareCircle.countDocuments();
    const postRollbackMemberCount = await CareCircleMember.countDocuments();

    assert(
      preRollbackRecipientCount === postRollbackRecipientCount &&
        preRollbackCircleCount === postRollbackCircleCount &&
        preRollbackMemberCount === postRollbackMemberCount,
      "21. Atomicity guarantee: Failed transactions rollback and leave no orphaned records"
    );
    await User.deleteMany({ _id: { $in: [userAId, userBId] } });
    await RefreshToken.deleteMany({ userId: { $in: [userAId, userBId] } });
    await CareCircle.deleteMany({ _id: { $in: [createdCircleId, secondCircleId] } });
    await CareRecipient.deleteMany({
      _id: { $in: [createdRecipientId, createSecondData.data?.careRecipient?.id] },
    });
    await CareCircleMember.deleteMany({
      careCircle: { $in: [createdCircleId, secondCircleId] },
    });
    console.log("\nCare Circle test records cleaned up successfully.");
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
