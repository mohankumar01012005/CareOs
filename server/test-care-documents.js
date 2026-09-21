const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = require("./server");
const User = require("./src/models/User");
const CareRecipient = require("./src/models/CareRecipient");
const CareCircle = require("./src/models/CareCircle");
const CareCircleMember = require("./src/models/CareCircleMember");
const CareDocument = require("./src/models/CareDocument");
const {
  CAREOS_ROLES,
  MEMBERSHIP_STATUS,
  DOCUMENT_CATEGORIES,
  DOCUMENT_PRIVACY_LEVELS,
} = require("./src/constants/roles");

let serverInstance;
const TEST_PORT = 5102;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runCareDocumentTests() {
  console.log("==================================================================");
  console.log("CAREOS EMERGENCY DOCUMENT VAULT TEST SUITE (IMP 08)");
  console.log("==================================================================");

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
  console.log("Connected to MongoDB for Care Document testing.");

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`Care Document Test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  const timestamp = Date.now();
  const mainCaretakerEmail = `doc.main.${timestamp}@example.com`;
  const subCaretakerEmail = `doc.sub.${timestamp}@example.com`;
  const doctorEmail = `doc.doctor.${timestamp}@example.com`;
  const familyMemberEmail = `doc.family.${timestamp}@example.com`;
  const paidCaregiverEmail = `doc.caregiver.${timestamp}@example.com`;
  const outsiderEmail = `doc.outsider.${timestamp}@example.com`;
  const testPassword = "Password123!Doc";

  let mainToken = "";
  let subToken = "";
  let doctorToken = "";
  let familyToken = "";
  let caregiverToken = "";
  let outsiderToken = "";

  let mainId = "";
  let subId = "";
  let doctorId = "";
  let familyId = "";
  let caregiverId = "";
  let outsiderId = "";

  let circleId = "";
  let outsideCircleId = "";
  let recipientId = "";

  let docInsuranceId = "";
  let docLegalId = "";
  let docLabId = "";
  let docSalaryId = "";
  let docEmergencyId = "";
  let docExpiringSoonId = "";
  let docExpiredId = "";

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 15);
  const futureDateStr = futureDate.toISOString().split("T")[0];

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 30);
  const pastDateStr = pastDate.toISOString().split("T")[0];

  try {
    // ----------------------------------------------------------------
    // Setup Test Users & Care Circles
    // ----------------------------------------------------------------
    // 1. Register Main Caretaker
    const regMain = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Vikram Main Caretaker",
        email: mainCaretakerEmail,
        password: testPassword,
        phone: "+919711111111",
      }),
    });
    const regMainData = await regMain.json();
    mainToken = regMainData.data.tokens.accessToken;
    mainId = regMainData.data.user.id;

    // 2. Register Sub Caretaker
    const regSub = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Meera Sub Caretaker",
        email: subCaretakerEmail,
        password: testPassword,
        phone: "+919722222222",
      }),
    });
    const regSubData = await regSub.json();
    subToken = regSubData.data.tokens.accessToken;
    subId = regSubData.data.user.id;

    // 3. Register Doctor
    const regDoc = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dr. Kulkarni Physician",
        email: doctorEmail,
        password: testPassword,
        phone: "+919733333333",
      }),
    });
    const regDocData = await regDoc.json();
    doctorToken = regDocData.data.tokens.accessToken;
    doctorId = regDocData.data.user.id;

    // 4. Register Family Member
    const regFam = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Pooja Family Daughter",
        email: familyMemberEmail,
        password: testPassword,
        phone: "+919744444444",
      }),
    });
    const regFamData = await regFam.json();
    familyToken = regFamData.data.tokens.accessToken;
    familyId = regFamData.data.user.id;

    // 5. Register Paid Caregiver
    const regCg = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Anita Paid Attendant",
        email: paidCaregiverEmail,
        password: testPassword,
        phone: "+919755555555",
      }),
    });
    const regCgData = await regCg.json();
    caregiverToken = regCgData.data.tokens.accessToken;
    caregiverId = regCgData.data.user.id;

    // 6. Register Outsider
    const regOut = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Zack Outsider",
        email: outsiderEmail,
        password: testPassword,
        phone: "+919766666666",
      }),
    });
    const regOutData = await regOut.json();
    outsiderToken = regOutData.data.tokens.accessToken;
    outsiderId = regOutData.data.user.id;

    // 7. Main Caretaker creates primary Care Circle
    const circleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        name: "Dada's Health & Legal Circle",
        recipient: {
          fullName: "Dada Deshmukh",
          dateOfBirth: "1946-03-21",
          gender: "male",
          bloodGroup: "AB+",
          knownConditions: ["Diabetes", "Cardiac Pacemaker"],
          allergies: ["Aspirin"],
        },
      }),
    });
    const circleData = await circleRes.json();
    circleId = circleData.data.careCircle.id;
    recipientId = circleData.data.careRecipient.id;

    // 8. Add members to primary Circle
    await CareCircleMember.create({
      careCircle: circleId,
      user: subId,
      role: CAREOS_ROLES.SUB_CARETAKER,
      membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
    });

    await CareCircleMember.create({
      careCircle: circleId,
      user: doctorId,
      role: CAREOS_ROLES.PAID_DOCTOR,
      membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
    });

    await CareCircleMember.create({
      careCircle: circleId,
      user: familyId,
      role: CAREOS_ROLES.FAMILY_MEMBER,
      membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
    });

    await CareCircleMember.create({
      careCircle: circleId,
      user: caregiverId,
      role: CAREOS_ROLES.PAID_CARETAKER,
      membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
    });

    // 9. Outsider creates separate circle
    const outCircleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${outsiderToken}`,
      },
      body: JSON.stringify({
        name: "Isolated Foreign Circle",
        recipient: {
          fullName: "Foreign Patient",
          gender: "male",
        },
      }),
    });
    const outCircleData = await outCircleRes.json();
    outsideCircleId = outCircleData.data.careCircle.id;

    // ================================================================
    // 1. AUTHENTICATION & ACCESS CONTROL TESTS
    // ================================================================
    console.log("\n--- Section 1: Authentication & Authorization ---");

    // 1. Unauthenticated request
    const unauthRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`
    );
    const unauthData = await unauthRes.json();
    assert(
      unauthRes.status === 401 && unauthData.code === "AUTH_TOKEN_MISSING",
      "1. Unauthenticated request to documents endpoint is rejected with 401 AUTH_TOKEN_MISSING",
      `Got ${unauthRes.status}`
    );

    // 2. Non-member access
    const nonMemberRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        headers: { Authorization: `Bearer ${outsiderToken}` },
      }
    );
    const nonMemberData = await nonMemberRes.json();
    assert(
      nonMemberRes.status === 403 && nonMemberData.code === "FORBIDDEN",
      "2. Non-member user is rejected with 403 FORBIDDEN",
      `Got ${nonMemberRes.status}`
    );

    // 3. Cross-circle access attempt
    const crossCircleRes = await fetch(
      `${BASE_URL}/api/care-circles/${outsideCircleId}/documents`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const crossCircleData = await crossCircleRes.json();
    assert(
      crossCircleRes.status === 403 && crossCircleData.code === "FORBIDDEN",
      "3. Cross-circle access attempt using foreign circle ID is denied (403 FORBIDDEN)",
      `Got ${crossCircleRes.status}`
    );

    // ================================================================
    // 2. VALIDATION FAILURE TESTS
    // ================================================================
    console.log("\n--- Section 2: Validation Failures ---");

    // 4. Missing title
    const missingTitleRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          fileUrl: "https://storage.careos.app/docs/insurance.pdf",
        }),
      }
    );
    const missingTitleData = await missingTitleRes.json();
    assert(
      missingTitleRes.status === 400 &&
        missingTitleData.success === false &&
        Array.isArray(missingTitleData.errors),
      "4. Document creation missing title is rejected with 400 validation error",
      `Got ${missingTitleRes.status}`
    );

    // 5. Missing fileUrl
    const missingFileRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Insurance Document",
        }),
      }
    );
    const missingFileData = await missingFileRes.json();
    assert(
      missingFileRes.status === 400 &&
        missingFileData.success === false &&
        Array.isArray(missingFileData.errors),
      "5. Document creation missing fileUrl is rejected with 400 validation error",
      `Got ${missingFileRes.status}`
    );

    // 6. Invalid category
    const invalidCatRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Secret Doc",
          fileUrl: "https://storage.careos.app/docs/secret.pdf",
          category: "INVALID_DOCUMENT_CATEGORY",
        }),
      }
    );
    const invalidCatData = await invalidCatRes.json();
    assert(
      invalidCatRes.status === 400 &&
        invalidCatData.success === false &&
        Array.isArray(invalidCatData.errors),
      "6. Document creation with invalid category is rejected with 400 validation error",
      `Got ${invalidCatRes.status}`
    );

    // 7. Invalid privacyLevel
    const invalidPrivacyRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Secret Doc",
          fileUrl: "https://storage.careos.app/docs/secret.pdf",
          privacyLevel: "TOP_SECRET_MILITARY",
        }),
      }
    );
    const invalidPrivacyData = await invalidPrivacyRes.json();
    assert(
      invalidPrivacyRes.status === 400 &&
        invalidPrivacyData.success === false &&
        Array.isArray(invalidPrivacyData.errors),
      "7. Document creation with invalid privacyLevel is rejected with 400 validation error",
      `Got ${invalidPrivacyRes.status}`
    );

    // 8. Invalid issuedDate format
    const invalidIssuedDateRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Insurance Policy",
          fileUrl: "https://storage.careos.app/docs/policy.pdf",
          issuedDate: "2026/09/15", // Bad format
        }),
      }
    );
    const invalidIssuedData = await invalidIssuedDateRes.json();
    assert(
      invalidIssuedDateRes.status === 400 &&
        invalidIssuedData.success === false &&
        Array.isArray(invalidIssuedData.errors),
      "8. Document creation with invalid issuedDate format is rejected with 400 validation error",
      `Got ${invalidIssuedDateRes.status}`
    );

    // 9. Invalid expiryDate format
    const invalidExpiryDateRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Insurance Policy",
          fileUrl: "https://storage.careos.app/docs/policy.pdf",
          expiryDate: "15-09-2027", // Bad format
        }),
      }
    );
    const invalidExpiryData = await invalidExpiryDateRes.json();
    assert(
      invalidExpiryDateRes.status === 400 &&
        invalidExpiryData.success === false &&
        Array.isArray(invalidExpiryData.errors),
      "9. Document creation with invalid expiryDate format is rejected with 400 validation error",
      `Got ${invalidExpiryDateRes.status}`
    );

    // 10. Negative file size
    const invalidSizeRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Insurance Policy",
          fileUrl: "https://storage.careos.app/docs/policy.pdf",
          fileSizeBytes: -500,
        }),
      }
    );
    const invalidSizeData = await invalidSizeRes.json();
    assert(
      invalidSizeRes.status === 400 &&
        invalidSizeData.success === false &&
        Array.isArray(invalidSizeData.errors),
      "10. Document creation with negative fileSizeBytes is rejected with 400 validation error",
      `Got ${invalidSizeRes.status}`
    );

    // 11. Invalid docId format in URL param
    const invalidIdRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/bad-doc-id-xyz`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const invalidIdData = await invalidIdRes.json();
    assert(
      invalidIdRes.status === 400 &&
        invalidIdData.success === false &&
        Array.isArray(invalidIdData.errors),
      "11. Invalid docId format in URL param is rejected with 400 validation error",
      `Got ${invalidIdRes.status}`
    );

    // ================================================================
    // 3. DOCUMENT CREATION & METADATA TESTS
    // ================================================================
    console.log("\n--- Section 3: Document Vault Creation ---");

    // 12. Main Caretaker uploads CIRCLE_WIDE Health Insurance Policy
    const doc1Res = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Star Health Senior Citizen Red Carpet Policy",
          description: "Primary cashless hospitalization health insurance card and policy schedule.",
          category: "INSURANCE",
          privacyLevel: "CIRCLE_WIDE",
          fileUrl: "https://storage.careos.app/circles/dada/insurance-2026.pdf",
          fileName: "star-health-red-carpet-2026.pdf",
          fileType: "application/pdf",
          fileSizeBytes: 2450000,
          documentNumber: "SH-POL-9928120",
          issuedDate: "2026-01-01",
          expiryDate: "2027-01-01",
          isEmergencyAccessible: true,
          tags: ["insurance", "cashless", "tpa", "mediclaim"],
        }),
      }
    );
    const doc1Data = await doc1Res.json();
    docInsuranceId = doc1Data.data.document.id;

    assert(
      doc1Res.status === 201 &&
        doc1Data.data.document.category === "INSURANCE" &&
        doc1Data.data.document.privacyLevel === "CIRCLE_WIDE" &&
        doc1Data.data.document.isEmergencyAccessible === true &&
        (doc1Data.data.document.uploadedBy.id || doc1Data.data.document.uploadedBy._id).toString() === mainId,
      "12. Main Caretaker uploads CIRCLE_WIDE Health Insurance Policy with emergency flag (201 Created)",
      `Got ${doc1Res.status}`
    );

    // 13. Sub Caretaker uploads FAMILY_ONLY Legal Document (Will / Power of Attorney)
    const doc2Res = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${subToken}`,
        },
        body: JSON.stringify({
          title: "Medical Power of Attorney & Advance Healthcare Directive",
          description: "Designates Meera and Vikram as medical decision makers in incapacitation.",
          category: "LEGAL_FINANCIAL",
          privacyLevel: "FAMILY_ONLY",
          fileUrl: "https://storage.careos.app/circles/dada/legal-poa.pdf",
          fileName: "dada-power-of-attorney.pdf",
          fileType: "application/pdf",
          fileSizeBytes: 5120000,
          documentNumber: "LEG-POA-2024-88",
          issuedDate: "2024-06-15",
          tags: ["legal", "poa", "directive", "family"],
        }),
      }
    );
    const doc2Data = await doc2Res.json();
    docLegalId = doc2Data.data.document.id;

    assert(
      doc2Res.status === 201 &&
        doc2Data.data.document.category === "LEGAL_FINANCIAL" &&
        doc2Data.data.document.privacyLevel === "FAMILY_ONLY",
      "13. Sub Caretaker uploads FAMILY_ONLY Legal Power of Attorney document (201 Created)",
      `Got ${doc2Res.status}`
    );

    // 14. Doctor uploads DOCTOR_AND_CARETAKERS Cardiology Lab Report
    const doc3Res = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({
          title: "Cardiology Echo & Holter Monitor Report",
          description: "24-hour Holter ECG telemetry analysis and ejection fraction assessment.",
          category: "LAB_REPORT",
          privacyLevel: "DOCTOR_AND_CARETAKERS",
          fileUrl: "https://storage.careos.app/circles/dada/holter-report-sep2026.pdf",
          fileName: "holter-ecg-sep2026.pdf",
          fileType: "application/pdf",
          fileSizeBytes: 1840000,
          documentNumber: "LAB-ECG-77491",
          issuedDate: todayStr,
          tags: ["cardiology", "ecg", "holter", "lab"],
        }),
      }
    );
    const doc3Data = await doc3Res.json();
    docLabId = doc3Data.data.document.id;

    assert(
      doc3Res.status === 201 &&
        doc3Data.data.document.category === "LAB_REPORT" &&
        doc3Data.data.document.privacyLevel === "DOCTOR_AND_CARETAKERS",
      "14. Doctor uploads DOCTOR_AND_CARETAKERS Cardiology Lab Report (201 Created)",
      `Got ${doc3Res.status}`
    );

    // 15. Main Caretaker uploads CARETAKERS_ONLY Agreement & Salary Record
    const doc4Res = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Care Attendant Employment Agreement & Salary Schedule",
          description: "Internal contract and agency billing records.",
          category: "OTHER",
          privacyLevel: "CARETAKERS_ONLY",
          fileUrl: "https://storage.careos.app/circles/dada/attendant-contract.pdf",
          fileName: "attendant-contract-2026.pdf",
          fileType: "application/pdf",
          fileSizeBytes: 980000,
          tags: ["salary", "contract", "caretakers"],
        }),
      }
    );
    const doc4Data = await doc4Res.json();
    docSalaryId = doc4Data.data.document.id;

    assert(
      doc4Res.status === 201 &&
        doc4Data.data.document.privacyLevel === "CARETAKERS_ONLY",
      "15. Main Caretaker uploads CARETAKERS_ONLY internal contract (201 Created)",
      `Got ${doc4Res.status}`
    );

    // 16. Family Member uploads EMERGENCY_SOS Emergency Card
    const doc5Res = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${familyToken}`,
        },
        body: JSON.stringify({
          title: "Emergency Medical Summary & Blood Group Card",
          description: "Contains pacemaker specs, blood group AB+, emergency hospital contacts, and allergy alerts.",
          category: "GOVERNMENT_ID",
          privacyLevel: "EMERGENCY_SOS",
          fileUrl: "https://storage.careos.app/circles/dada/emergency-card.jpg",
          fileName: "dada-emergency-card.jpg",
          fileType: "image/jpeg",
          fileSizeBytes: 450000,
          isEmergencyAccessible: true,
          tags: ["emergency", "sos", "blood", "pacemaker"],
        }),
      }
    );
    const doc5Data = await doc5Res.json();
    docEmergencyId = doc5Data.data.document.id;

    assert(
      doc5Res.status === 201 &&
        doc5Data.data.document.privacyLevel === "EMERGENCY_SOS" &&
        doc5Data.data.document.isEmergencyAccessible === true,
      "16. Family Member uploads EMERGENCY_SOS Medical Card (201 Created)",
      `Got ${doc5Res.status}`
    );

    // ================================================================
    // 4. ROLE-BASED PRIVACY ACCESS CONTROL ENFORCEMENT
    // ================================================================
    console.log("\n--- Section 4: Role-Based Privacy Enforcement ---");

    // 17. Main Caretaker lists all documents: should see all 5 documents
    const mainListRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const mainListData = await mainListRes.json();
    assert(
      mainListRes.status === 200 && mainListData.data.documents.length === 5,
      "17. Main Caretaker can list all 5 documents across all privacy tiers (200 OK)",
      `Got count: ${mainListData.data?.documents?.length}`
    );

    // 18. Sub Caretaker lists all documents: should see all 5 documents
    const subListRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        headers: { Authorization: `Bearer ${subToken}` },
      }
    );
    const subListData = await subListRes.json();
    assert(
      subListRes.status === 200 && subListData.data.documents.length === 5,
      "18. Sub Caretaker can list all 5 documents across all privacy tiers (200 OK)",
      `Got count: ${subListData.data?.documents?.length}`
    );

    // 19. Family Member lists documents: should see CIRCLE_WIDE, FAMILY_ONLY, EMERGENCY_SOS (3 docs)
    const famListRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        headers: { Authorization: `Bearer ${familyToken}` },
      }
    );
    const famListData = await famListRes.json();
    const famDocIds = famListData.data.documents.map((d) => d.id);
    assert(
      famListRes.status === 200 &&
        famListData.data.documents.length === 3 &&
        famDocIds.includes(docInsuranceId) &&
        famDocIds.includes(docLegalId) &&
        famDocIds.includes(docEmergencyId) &&
        !famDocIds.includes(docLabId) &&
        !famDocIds.includes(docSalaryId),
      "19. Family Member feed filters out DOCTOR_AND_CARETAKERS and CARETAKERS_ONLY documents (count: 3)",
      `Got count: ${famListData.data?.documents?.length}`
    );

    // 20. Family Member direct GET on DOCTOR_AND_CARETAKERS document -> 403
    const famGetDocRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docLabId}`,
      {
        headers: { Authorization: `Bearer ${familyToken}` },
      }
    );
    const famGetDocData = await famGetDocRes.json();
    assert(
      famGetDocRes.status === 403 &&
        famGetDocData.code === "DOCUMENT_ACCESS_RESTRICTED",
      "20. Family Member direct access to DOCTOR_AND_CARETAKERS document is rejected (403 DOCUMENT_ACCESS_RESTRICTED)",
      `Got ${famGetDocRes.status}`
    );

    // 21. Family Member direct GET on CARETAKERS_ONLY document -> 403
    const famGetCareRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docSalaryId}`,
      {
        headers: { Authorization: `Bearer ${familyToken}` },
      }
    );
    const famGetCareData = await famGetCareRes.json();
    assert(
      famGetCareRes.status === 403 &&
        famGetCareData.code === "DOCUMENT_ACCESS_RESTRICTED",
      "21. Family Member direct access to CARETAKERS_ONLY document is rejected (403 DOCUMENT_ACCESS_RESTRICTED)",
      `Got ${famGetCareRes.status}`
    );

    // 22. Paid Doctor lists documents: should see CIRCLE_WIDE, DOCTOR_AND_CARETAKERS, EMERGENCY_SOS (3 docs)
    const docListRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );
    const docListData = await docListRes.json();
    const docDocIds = docListData.data.documents.map((d) => d.id);
    assert(
      docListRes.status === 200 &&
        docListData.data.documents.length === 3 &&
        docDocIds.includes(docInsuranceId) &&
        docDocIds.includes(docLabId) &&
        docDocIds.includes(docEmergencyId) &&
        !docDocIds.includes(docLegalId) &&
        !docDocIds.includes(docSalaryId),
      "22. Paid Doctor feed filters out FAMILY_ONLY and CARETAKERS_ONLY documents (count: 3)",
      `Got count: ${docListData.data?.documents?.length}`
    );

    // 23. Paid Doctor direct GET on FAMILY_ONLY document -> 403
    const docGetFamRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docLegalId}`,
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );
    const docGetFamData = await docGetFamRes.json();
    assert(
      docGetFamRes.status === 403 &&
        docGetFamData.code === "DOCUMENT_ACCESS_RESTRICTED",
      "23. Paid Doctor direct access to FAMILY_ONLY legal document is rejected (403 DOCUMENT_ACCESS_RESTRICTED)",
      `Got ${docGetFamRes.status}`
    );

    // 24. Paid Doctor direct GET on CARETAKERS_ONLY document -> 403
    const docGetCareRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docSalaryId}`,
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );
    const docGetCareData = await docGetCareRes.json();
    assert(
      docGetCareRes.status === 403 &&
        docGetCareData.code === "DOCUMENT_ACCESS_RESTRICTED",
      "24. Paid Doctor direct access to CARETAKERS_ONLY document is rejected (403 DOCUMENT_ACCESS_RESTRICTED)",
      `Got ${docGetCareRes.status}`
    );

    // 25. Paid Caregiver lists documents: should see CIRCLE_WIDE and EMERGENCY_SOS (2 docs)
    const cgListRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        headers: { Authorization: `Bearer ${caregiverToken}` },
      }
    );
    const cgListData = await cgListRes.json();
    const cgDocIds = cgListData.data.documents.map((d) => d.id);
    assert(
      cgListRes.status === 200 &&
        cgListData.data.documents.length === 2 &&
        cgDocIds.includes(docInsuranceId) &&
        cgDocIds.includes(docEmergencyId) &&
        !cgDocIds.includes(docLegalId) &&
        !cgDocIds.includes(docLabId) &&
        !cgDocIds.includes(docSalaryId),
      "25. Paid Caregiver feed only includes CIRCLE_WIDE and EMERGENCY_SOS documents (count: 2)",
      `Got count: ${cgListData.data?.documents?.length}`
    );

    // 26. Paid Caregiver direct GET on FAMILY_ONLY document -> 403
    const cgGetFamRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docLegalId}`,
      {
        headers: { Authorization: `Bearer ${caregiverToken}` },
      }
    );
    const cgGetFamData = await cgGetFamRes.json();
    assert(
      cgGetFamRes.status === 403 &&
        cgGetFamData.code === "DOCUMENT_ACCESS_RESTRICTED",
      "26. Paid Caregiver direct access to FAMILY_ONLY legal document is rejected (403 DOCUMENT_ACCESS_RESTRICTED)",
      `Got ${cgGetFamRes.status}`
    );

    // ================================================================
    // 5. EMERGENCY QUICK-ACCESS ENDPOINT
    // ================================================================
    console.log("\n--- Section 5: Emergency Quick-Access Endpoint ---");

    // 27. GET /documents/emergency
    const emListRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/emergency`,
      {
        headers: { Authorization: `Bearer ${caregiverToken}` },
      }
    );
    const emListData = await emListRes.json();
    const emDocIds = emListData.data.documents.map((d) => d.id);
    assert(
      emListRes.status === 200 &&
        emListData.data.documents.length >= 2 &&
        emDocIds.includes(docInsuranceId) &&
        emDocIds.includes(docEmergencyId),
      "27. GET /documents/emergency returns all documents flagged as emergency-accessible (200 OK)",
      `Got count: ${emListData.data?.documents?.length}`
    );

    // 28. Paid Doctor access to emergency endpoint
    const docEmRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/emergency`,
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );
    const docEmData = await docEmRes.json();
    assert(
      docEmRes.status === 200 && docEmData.data.documents.length >= 2,
      "28. All circle roles can query emergency quick-access documents during crisis (200 OK)",
      `Got count: ${docEmData.data?.documents?.length}`
    );

    // ================================================================
    // 6. EXPIRY & RENEWAL TELEMETRY ENDPOINT
    // ================================================================
    console.log("\n--- Section 6: Expiry & Renewal Telemetry ---");

    // 29. Upload document expiring soon (in 15 days)
    const expSoonRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Physiotherapy Prescription (Expiring Soon)",
          category: "PRESCRIPTION",
          privacyLevel: "CIRCLE_WIDE",
          fileUrl: "https://storage.careos.app/circles/dada/physio-rx.pdf",
          expiryDate: futureDateStr,
        }),
      }
    );
    const expSoonData = await expSoonRes.json();
    docExpiringSoonId = expSoonData.data.document.id;

    assert(
      expSoonRes.status === 201 &&
        expSoonData.data.document.expiryDate === futureDateStr,
      "29. Main Caretaker uploads document expiring in 15 days (201 Created)",
      `Got ${expSoonRes.status}`
    );

    // 30. Upload expired document (expired 30 days ago)
    const expiredRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Previous Year Lab Report (Expired)",
          category: "LAB_REPORT",
          privacyLevel: "CIRCLE_WIDE",
          fileUrl: "https://storage.careos.app/circles/dada/old-lab.pdf",
          expiryDate: pastDateStr,
        }),
      }
    );
    const expiredData = await expiredRes.json();
    docExpiredId = expiredData.data.document.id;

    assert(
      expiredRes.status === 201 &&
        expiredData.data.document.expiryDate === pastDateStr,
      "30. Main Caretaker uploads already expired document (201 Created)",
      `Got ${expiredRes.status}`
    );

    // 31. GET /documents/expiring?days=30
    const telemetryRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/expiring?days=30`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const telemetryData = await telemetryRes.json();
    assert(
      telemetryRes.status === 200 &&
        telemetryData.data.expiringCount >= 1 &&
        telemetryData.data.expiredCount >= 1 &&
        telemetryData.data.expiringDocuments.some((d) => d.id === docExpiringSoonId) &&
        telemetryData.data.expiredDocuments.some((d) => d.id === docExpiredId),
      "31. GET /documents/expiring telemetry identifies documents expiring within 30 days and expired docs (200 OK)",
      `Expiring count: ${telemetryData.data?.expiringCount}, Expired count: ${telemetryData.data?.expiredCount}`
    );

    // ================================================================
    // 7. SEARCH, CATEGORY & TAG FILTERING
    // ================================================================
    console.log("\n--- Section 7: Search, Category & Tag Filtering ---");

    // 32. Filter by category: INSURANCE
    const catFilterRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents?category=INSURANCE`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const catFilterData = await catFilterRes.json();
    assert(
      catFilterRes.status === 200 &&
        catFilterData.data.documents.length === 1 &&
        catFilterData.data.documents[0].id === docInsuranceId,
      "32. Filter category=INSURANCE returns insurance policy (200 OK)",
      `Got count: ${catFilterData.data?.documents?.length}`
    );

    // 33. Search by text keyword: "Cardiology"
    const searchRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents?search=Cardiology`,
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );
    const searchData = await searchRes.json();
    assert(
      searchRes.status === 200 &&
        searchData.data.documents.length === 1 &&
        searchData.data.documents[0].id === docLabId,
      "33. Search query 'Cardiology' matches cardiology lab report (200 OK)",
      `Got count: ${searchData.data?.documents?.length}`
    );

    // 34. Filter by tags: tags=pacemaker
    const tagFilterRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents?tags=pacemaker`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const tagFilterData = await tagFilterRes.json();
    assert(
      tagFilterRes.status === 200 &&
        tagFilterData.data.documents.length === 1 &&
        tagFilterData.data.documents[0].id === docEmergencyId,
      "34. Filter tags=pacemaker returns emergency medical card (200 OK)",
      `Got count: ${tagFilterData.data?.documents?.length}`
    );

    // ================================================================
    // 8. ACCESS AUDIT TRAIL & CARETAKER INSPECTION
    // ================================================================
    console.log("\n--- Section 8: Access Audit Trail & Caretaker Inspection ---");

    // 35. View document by ID (Doctor views docInsuranceId) -> pushes VIEW audit log
    const docViewRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docInsuranceId}`,
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );
    const docViewData = await docViewRes.json();
    assert(
      docViewRes.status === 200 &&
        docViewData.data.document.id === docInsuranceId &&
        docViewData.data.document.auditLogs.some(
          (log) =>
            log.action === "VIEW" &&
            (log.user.id || log.user._id || log.user).toString() === doctorId
        ),
      "35. Accessing document via GET /:docId appends a VIEW action audit log with timestamp (200 OK)",
      `Got ${docViewRes.status}`
    );

    // 36. Non-caretaker (Family Member) attempting to access audit logs endpoint -> 403 FORBIDDEN
    const unauthAuditRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docInsuranceId}/audit-logs`,
      {
        headers: { Authorization: `Bearer ${familyToken}` },
      }
    );
    const unauthAuditData = await unauthAuditRes.json();
    assert(
      unauthAuditRes.status === 403 && unauthAuditData.code === "FORBIDDEN",
      "36. Non-caretaker user is forbidden from inspecting document audit logs (403 FORBIDDEN)",
      `Got ${unauthAuditRes.status}`
    );

    // 37. Main Caretaker inspects document audit logs
    const auditLogsRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docInsuranceId}/audit-logs`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const auditLogsData = await auditLogsRes.json();
    assert(
      auditLogsRes.status === 200 &&
        auditLogsData.data.auditLogs.length >= 2 &&
        auditLogsData.data.auditLogs.some((l) => l.action === "UPDATE") &&
        auditLogsData.data.auditLogs.some((l) => l.action === "VIEW"),
      "37. Main Caretaker retrieves complete immutable audit trail of document access & uploads (200 OK)",
      `Got logs count: ${auditLogsData.data?.auditLogs?.length}`
    );

    // ================================================================
    // 9. DOCUMENT UPDATES, DELETIONS & 404 HANDLERS
    // ================================================================
    console.log("\n--- Section 9: Document Updates, Deletions & 404 Handlers ---");

    // 38. Unauthorized update attempt: Family Member attempts to update Doctor's lab report
    const unauthUpdateRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docLabId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${familyToken}`,
        },
        body: JSON.stringify({
          title: "Tampered Lab Report",
        }),
      }
    );
    const unauthUpdateData = await unauthUpdateRes.json();
    assert(
      unauthUpdateRes.status === 403 && unauthUpdateData.code === "FORBIDDEN",
      "38. Non-uploader, non-caretaker member is rejected from updating document (403 FORBIDDEN)",
      `Got ${unauthUpdateRes.status}`
    );

    // 39. Author (Doctor) updates their own document title and tags
    const authorUpdateRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docLabId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({
          title: "Cardiology Echo & Holter Monitor Report (Final Signed)",
          tags: ["cardiology", "ecg", "holter", "lab", "signed"],
        }),
      }
    );
    const authorUpdateData = await authorUpdateRes.json();
    assert(
      authorUpdateRes.status === 200 &&
        authorUpdateData.data.document.title.includes("Final Signed") &&
        authorUpdateData.data.document.tags.includes("signed"),
      "39. Document author updates document metadata successfully (200 OK)",
      `Got ${authorUpdateRes.status}`
    );

    // 40. Unauthorized deletion: Paid Caregiver attempting to delete Insurance document
    const unauthDelRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docInsuranceId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${caregiverToken}` },
      }
    );
    const unauthDelData = await unauthDelRes.json();
    assert(
      unauthDelRes.status === 403 && unauthDelData.code === "FORBIDDEN",
      "40. Non-caretaker, non-uploader is rejected from deleting document (403 FORBIDDEN)",
      `Got ${unauthDelRes.status}`
    );

    // 41. Document author (Family Member) deletes their own document (docEmergencyId)
    const authorDelRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docEmergencyId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${familyToken}` },
      }
    );
    const authorDelData = await authorDelRes.json();
    assert(
      authorDelRes.status === 200 &&
        authorDelData.data.documentId === docEmergencyId,
      "41. Document author successfully deletes their own document (200 OK)",
      `Got ${authorDelRes.status}`
    );

    // 42. Main Caretaker deletes document (docSalaryId)
    const caretakerDelRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docSalaryId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const caretakerDelData = await caretakerDelRes.json();
    assert(
      caretakerDelRes.status === 200 &&
        caretakerDelData.data.documentId === docSalaryId,
      "42. Main Caretaker successfully deletes circle document (200 OK)",
      `Got ${caretakerDelRes.status}`
    );

    // 43. Accessing non-existent docId returns 404
    const fakeDocId = new mongoose.Types.ObjectId().toString();
    const notFoundRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${fakeDocId}`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const notFoundData = await notFoundRes.json();
    assert(
      notFoundRes.status === 404 && notFoundData.code === "DOCUMENT_NOT_FOUND",
      "43. Accessing non-existent document ID returns 404 DOCUMENT_NOT_FOUND",
      `Got ${notFoundRes.status}`
    );

  } catch (error) {
    console.error("Test execution failed with error:", error);
    failed++;
  } finally {
    // Teardown HTTP server and MongoDB connection
    if (serverInstance) {
      serverInstance.close();
    }
    await mongoose.disconnect();
    console.log("\n==================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runCareDocumentTests();
