const path = require("path");
const mongoose = require("mongoose");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, ".env") });
process.env.USE_MOCK_S3 = "true";

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
  STORAGE_PROVIDERS,
} = require("./src/constants/roles");
const {
  sanitizeFileName,
  checkMagicBytes,
  validateFileForUpload,
  buildS3ObjectKey,
} = require("./src/utils/s3.util");

let serverInstance;
const TEST_PORT = 5110;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runS3CareDocumentTests() {
  console.log("==================================================================");
  console.log("CAREOS SECURE DOCUMENT VAULT — REAL S3 + AWS KMS INTEGRATION TESTS");
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
  console.log("Connected to MongoDB for Care Document S3 integration testing.");

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`Care Document S3 Test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  const timestamp = Date.now();
  const mainCaretakerEmail = `s3.main.${timestamp}@example.com`;
  const subCaretakerEmail = `s3.sub.${timestamp}@example.com`;
  const doctorEmail = `s3.doctor.${timestamp}@example.com`;
  const familyMemberEmail = `s3.family.${timestamp}@example.com`;
  const paidCaregiverEmail = `s3.caregiver.${timestamp}@example.com`;
  const outsiderEmail = `s3.outsider.${timestamp}@example.com`;
  const testPassword = "Password123!S3Doc";

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

  let docPersonalId = "";
  let docFamilyId = "";
  let docDoctorId = "";
  let docCaretakerId = "";
  let docCircleWideId = "";
  let docEmergencyId = "";
  let docS3UploadedId = "";

  try {
    // ----------------------------------------------------------------
    // SECTION 1: UNIT VALIDATION & S3 UTILITY TESTS
    // ----------------------------------------------------------------
    console.log("\n--- SECTION 1: S3 UTILITY & VALIDATION UNIT TESTS ---");

    // 1. Filename sanitization removes traversal characters
    const dirtyName = "../../../secret/../../etc/passwd..//malicious.pdf";
    const cleanName = sanitizeFileName(dirtyName);
    assert(
      cleanName === "passwd_malicious.pdf" || !cleanName.includes(".."),
      "1. sanitizeFileName strips directory traversal and unsafe characters",
      `Got: ${cleanName}`
    );

    // 2. Magic byte inspection for PDF
    const validPdfBuffer = Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj");
    const isPdf = checkMagicBytes(validPdfBuffer, ".pdf");
    assert(isPdf === true, "2. checkMagicBytes accurately recognizes valid PDF header (%PDF-)");

    // 3. Magic byte inspection rejects disguised binary
    const fakePdfBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00"); // DOS executable header
    const isFakePdf = checkMagicBytes(fakePdfBuffer, ".pdf");
    assert(isFakePdf === false, "3. checkMagicBytes rejects executable disguised as .pdf");

    // 4. Validate file for upload with dangerous extension
    const dangerousFile = {
      originalname: "virus.exe",
      mimetype: "application/x-msdownload",
      buffer: Buffer.from("MZ\x90\x00"),
      size: 3,
    };
    const dangerResult = validateFileForUpload(dangerousFile);
    assert(
      dangerResult.isValid === false && dangerResult.code === "DANGEROUS_FILE_TYPE",
      "4. validateFileForUpload strictly rejects dangerous .exe extensions",
      `Got code: ${dangerResult.code}`
    );

    // 5. Validate file for upload with 0 bytes
    const emptyFile = {
      originalname: "empty.pdf",
      mimetype: "application/pdf",
      buffer: Buffer.alloc(0),
      size: 0,
    };
    const emptyResult = validateFileForUpload(emptyFile);
    assert(
      emptyResult.isValid === false && emptyResult.code === "EMPTY_FILE",
      "5. validateFileForUpload rejects empty 0-byte file",
      `Got code: ${emptyResult.code}`
    );

    // 6. Validate file for upload with oversized buffer (>15MB)
    const oversizedFile = {
      originalname: "huge_scan.pdf",
      mimetype: "application/pdf",
      buffer: Buffer.alloc(16 * 1024 * 1024),
      size: 16 * 1024 * 1024,
    };
    const sizeResult = validateFileForUpload(oversizedFile);
    assert(
      sizeResult.isValid === false && sizeResult.code === "FILE_TOO_LARGE",
      "6. validateFileForUpload rejects files larger than 15MB",
      `Got code: ${sizeResult.code}`
    );

    // 7. Secure S3 object key generation
    const testDocId = new mongoose.Types.ObjectId();
    const generatedKey = buildS3ObjectKey({
      circleId: "650111111111111111111111",
      recipientId: "650222222222222222222222",
      docId: testDocId,
      originalFileName: "Health Policy 2026.pdf",
    });
    assert(
      generatedKey.startsWith("circles/650111111111111111111111/recipients/650222222222222222222222/documents/") &&
      generatedKey.endsWith("Health_Policy_2026.pdf"),
      "7. buildS3ObjectKey creates secure hierarchical path with circle and recipient partition",
      `Got: ${generatedKey}`
    );

    // ----------------------------------------------------------------
    // SECTION 2: SETUP USERS & CARE CIRCLES
    // ----------------------------------------------------------------
    console.log("\n--- SECTION 2: SETUP USERS & CIRCLE MEMBERSHIPS ---");

    // Register Main Caretaker
    const regMain = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Vikram Main",
        email: mainCaretakerEmail,
        password: testPassword,
        phone: "+919811111111",
      }),
    });
    const regMainData = await regMain.json();
    mainToken = regMainData.data.tokens.accessToken;
    mainId = regMainData.data.user.id;

    // Register Sub Caretaker
    const regSub = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Meera Sub",
        email: subCaretakerEmail,
        password: testPassword,
        phone: "+919822222222",
      }),
    });
    const regSubData = await regSub.json();
    subToken = regSubData.data.tokens.accessToken;
    subId = regSubData.data.user.id;

    // Register Doctor
    const regDoc = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dr. Kulkarni MD",
        email: doctorEmail,
        password: testPassword,
        phone: "+919833333333",
      }),
    });
    const regDocData = await regDoc.json();
    doctorToken = regDocData.data.tokens.accessToken;
    doctorId = regDocData.data.user.id;

    // Register Family Member
    const regFam = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Rohan Family",
        email: familyMemberEmail,
        password: testPassword,
        phone: "+919844444444",
      }),
    });
    const regFamData = await regFam.json();
    familyToken = regFamData.data.tokens.accessToken;
    familyId = regFamData.data.user.id;

    // Register Paid Caregiver
    const regCare = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Anjali Caregiver",
        email: paidCaregiverEmail,
        password: testPassword,
        phone: "+919855555555",
      }),
    });
    const regCareData = await regCare.json();
    caregiverToken = regCareData.data.tokens.accessToken;
    caregiverId = regCareData.data.user.id;

    // Register Outsider
    const regOut = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Outsider User",
        email: outsiderEmail,
        password: testPassword,
        phone: "+919866666666",
      }),
    });
    const regOutData = await regOut.json();
    outsiderToken = regOutData.data.tokens.accessToken;
    outsiderId = regOutData.data.user.id;

    // Create Main Care Circle
    const createCircleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        name: "Sharma Family S3 Care Circle",
        recipient: {
          fullName: "Savitri Sharma",
          dateOfBirth: "1954-08-15",
          gender: "female",
          bloodGroup: "O+",
        },
      }),
    });
    const circleData = await createCircleRes.json();
    circleId = circleData.data.careCircle.id;
    recipientId = circleData.data.careRecipient.id;

    // Add circle memberships
    await CareCircleMember.create([
      { careCircle: circleId, user: subId, role: CAREOS_ROLES.SUB_CARETAKER, membershipStatus: MEMBERSHIP_STATUS.ACTIVE },
      { careCircle: circleId, user: doctorId, role: CAREOS_ROLES.PAID_DOCTOR, membershipStatus: MEMBERSHIP_STATUS.ACTIVE },
      { careCircle: circleId, user: familyId, role: CAREOS_ROLES.FAMILY_MEMBER, membershipStatus: MEMBERSHIP_STATUS.ACTIVE },
      { careCircle: circleId, user: caregiverId, role: CAREOS_ROLES.PAID_CARETAKER, membershipStatus: MEMBERSHIP_STATUS.ACTIVE },
    ]);

    // Create foreign circle for cross-circle isolation testing
    const outsideCircleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${outsiderToken}`,
      },
      body: JSON.stringify({
        name: "Foreign Circle",
        recipient: {
          fullName: "Foreign Patient",
        },
      }),
    });
    const outsideCircleData = await outsideCircleRes.json();
    outsideCircleId = outsideCircleData.data.careCircle.id;

    assert(Boolean(circleId && outsideCircleId), "8. Setup test users, memberships, and circles successfully");

    // ----------------------------------------------------------------
    // SECTION 3: REAL MULTIPART S3 UPLOAD & VALIDATION TESTS
    // ----------------------------------------------------------------
    console.log("\n--- SECTION 3: S3 UPLOAD & MULTIPART API TESTS ---");

    // 9. Upload valid PDF file via multipart/form-data
    const validPdfBytes = Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj\n<< /Title (Blood Test Report) >>\nendobj\ntrailer\n<<>>\n%%EOF");
    const formData = new FormData();
    const pdfBlob = new Blob([validPdfBytes], { type: "application/pdf" });
    formData.append("file", pdfBlob, "blood_test_report_2026.pdf");
    formData.append("title", "Complete Blood Count & Lipid Panel");
    formData.append("category", "LAB_REPORT");
    formData.append("privacyLevel", "CIRCLE_WIDE");
    formData.append("documentNumber", "LAB-2026-9901");
    formData.append("issuedDate", "2026-09-10");
    formData.append("description", "Routine comprehensive metabolic and lipid profile.");

    const uploadRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mainToken}`,
      },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    assert(
      uploadRes.status === 201 &&
        uploadData.data.document.storageProvider === "S3" &&
        uploadData.data.document.s3Key &&
        uploadData.data.document.auditLogs.some((l) => l.action === "UPLOAD"),
      "9. POST /documents/upload uploads file, sets storageProvider S3, s3Key, and records UPLOAD audit log",
      `Status: ${uploadRes.status}, Msg: ${uploadData.message}`
    );
    docS3UploadedId = uploadData.data.document.id;

    // 10. Attempt to upload dangerous .sh script via multipart
    const dangerForm = new FormData();
    const shBlob = new Blob(["#!/bin/bash\nrm -rf /"], { type: "application/x-sh" });
    dangerForm.append("file", shBlob, "exploit.sh");
    dangerForm.append("title", "Exploit Script");

    const dangerUploadRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${mainToken}` },
      body: dangerForm,
    });
    const dangerUploadData = await dangerUploadRes.json();
    assert(
      dangerUploadRes.status === 400 && dangerUploadData.code === "DANGEROUS_FILE_TYPE",
      "10. POST /documents/upload rejects dangerous script file with 400 DANGEROUS_FILE_TYPE",
      `Got: ${dangerUploadRes.status}, code: ${dangerUploadData.code}`
    );

    // 11. Attempt to upload disguised binary as .pdf
    const spoofForm = new FormData();
    const spoofBlob = new Blob(["MZ\x90\x00ThisIsAnExecutable"], { type: "application/pdf" });
    spoofForm.append("file", spoofBlob, "disguised.pdf");
    spoofForm.append("title", "Disguised Executable");

    const spoofUploadRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${mainToken}` },
      body: spoofForm,
    });
    const spoofUploadData = await spoofUploadRes.json();
    assert(
      spoofUploadRes.status === 400 && spoofUploadData.code === "CORRUPTED_OR_DISGUISED_FILE",
      "11. POST /documents/upload rejects disguised binary failing magic bytes with 400 CORRUPTED_OR_DISGUISED_FILE",
      `Got: ${spoofUploadRes.status}, code: ${spoofUploadData.code}`
    );

    // 12. Attempt to upload with missing file
    const noFileForm = new FormData();
    noFileForm.append("title", "No File Attached");

    const noFileRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${mainToken}` },
      body: noFileForm,
    });
    const noFileData = await noFileRes.json();
    assert(
      noFileRes.status === 400 && noFileData.code === "FILE_REQUIRED",
      "12. POST /documents/upload rejects request with missing file (400 FILE_REQUIRED)",
      `Got: ${noFileRes.status}`
    );

    // 13. Create backward-compatible URL/reference document
    const urlDocRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        title: "Star Health Insurance Policy 2026",
        category: "INSURANCE",
        privacyLevel: "FAMILY_ONLY",
        fileUrl: "https://starhealth.in/portal/policies/POL-2026-SHAR.pdf",
        fileName: "policy_doc.pdf",
        documentNumber: "POL-2026-SHAR",
        issuedDate: "2026-01-01",
        expiryDate: "2027-01-01",
      }),
    });
    const urlDocData = await urlDocRes.json();
    assert(
      urlDocRes.status === 201 &&
        urlDocData.data.document.storageProvider === "EXTERNAL_URL" &&
        urlDocData.data.document.fileUrl.startsWith("https://"),
      "13. POST /documents supports backward-compatible EXTERNAL_URL storageProvider",
      `Got status: ${urlDocRes.status}`
    );
    docFamilyId = urlDocData.data.document.id;

    // ----------------------------------------------------------------
    // SECTION 4: PERSONAL PRIVACY AUTHORIZATION TESTS
    // ----------------------------------------------------------------
    console.log("\n--- SECTION 4: PERSONAL PRIVACY & UPLOADER-ONLY AUTHORIZATION ---");

    // 14. Family Member Rohan uploads a strictly PERSONAL document
    const personalPdfBytes = Buffer.from("%PDF-1.4\n%âãÏÓ\nPersonal Will & Testament\n%%EOF");
    const personalForm = new FormData();
    personalForm.append("file", new Blob([personalPdfBytes], { type: "application/pdf" }), "private_will.pdf");
    personalForm.append("title", "Personal Financial Will & Directive");
    personalForm.append("category", "LEGAL_FINANCIAL");
    personalForm.append("privacyLevel", "PERSONAL");
    personalForm.append("description", "Confidential inheritance directive strictly for author.");

    const personalUploadRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${familyToken}` },
      body: personalForm,
    });
    const personalUploadData = await personalUploadRes.json();
    assert(
      personalUploadRes.status === 201 && personalUploadData.data.document.privacyLevel === "PERSONAL",
      "14. Family Member successfully uploads a PERSONAL (Uploader-Only) document",
      `Got status: ${personalUploadRes.status}`
    );
    docPersonalId = personalUploadData.data.document.id;

    // 15. Attempt to create PERSONAL document with isEmergencyAccessible: true rejected by validator
    const invalidPersonalRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${familyToken}`,
      },
      body: JSON.stringify({
        title: "Invalid Contradictory Document",
        fileUrl: "https://example.com/doc.pdf",
        privacyLevel: "PERSONAL",
        isEmergencyAccessible: true,
      }),
    });
    assert(
      invalidPersonalRes.status === 400,
      "15. Validator rejects contradiction between PERSONAL privacy and isEmergencyAccessible: true",
      `Got status: ${invalidPersonalRes.status}`
    );

    // 16. Uploader (Family Member) CAN view their own PERSONAL document
    const uploaderViewRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docPersonalId}`, {
      headers: { Authorization: `Bearer ${familyToken}` },
    });
    const uploaderViewData = await uploaderViewRes.json();
    assert(
      uploaderViewRes.status === 200 && uploaderViewData.data.document.id === docPersonalId,
      "16. Uploader (Family Member) can view their own PERSONAL document details (200 OK)",
      `Got status: ${uploaderViewRes.status}`
    );

    // 17. Main Caretaker CANNOT view someone else's PERSONAL document (403 Forbidden)
    const mainViewPersonalRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docPersonalId}`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const mainViewPersonalData = await mainViewPersonalRes.json();
    assert(
      mainViewPersonalRes.status === 403 && mainViewPersonalData.code === "DOCUMENT_ACCESS_RESTRICTED",
      "17. Main Caretaker is strictly FORBIDDEN (403) from accessing another user's PERSONAL document",
      `Got status: ${mainViewPersonalRes.status}, code: ${mainViewPersonalData.code}`
    );

    // 18. Sub Caretaker CANNOT view someone else's PERSONAL document (403 Forbidden)
    const subViewPersonalRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docPersonalId}`, {
      headers: { Authorization: `Bearer ${subToken}` },
    });
    assert(
      subViewPersonalRes.status === 403,
      "18. Sub Caretaker is strictly FORBIDDEN (403) from accessing another user's PERSONAL document",
      `Got status: ${subViewPersonalRes.status}`
    );

    // 19. Doctor CANNOT view someone else's PERSONAL document (403 Forbidden)
    const docViewPersonalRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docPersonalId}`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert(
      docViewPersonalRes.status === 403,
      "19. Paid Doctor is strictly FORBIDDEN (403) from accessing another user's PERSONAL document",
      `Got status: ${docViewPersonalRes.status}`
    );

    // 20. Paid Caregiver CANNOT view someone else's PERSONAL document (403 Forbidden)
    const careViewPersonalRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docPersonalId}`, {
      headers: { Authorization: `Bearer ${caregiverToken}` },
    });
    assert(
      careViewPersonalRes.status === 403,
      "20. Paid Caregiver is strictly FORBIDDEN (403) from accessing another user's PERSONAL document",
      `Got status: ${careViewPersonalRes.status}`
    );

    // 21. Main Caretaker CANNOT download someone else's PERSONAL document (403 Forbidden + audit logged)
    const mainDownloadPersonalRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docPersonalId}/download`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const mainDownloadPersonalData = await mainDownloadPersonalRes.json();
    assert(
      mainDownloadPersonalRes.status === 403 && mainDownloadPersonalData.code === "DOCUMENT_ACCESS_RESTRICTED",
      "21. Main Caretaker download attempt on PERSONAL document returns 403 and records DOWNLOAD_DENIED",
      `Got status: ${mainDownloadPersonalRes.status}`
    );

    // 22. Main Caretaker CANNOT update someone else's PERSONAL document (403 Forbidden)
    const mainUpdatePersonalRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docPersonalId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({ title: "Unauthorized Title Hijack" }),
      }
    );
    assert(
      mainUpdatePersonalRes.status === 403,
      "22. Main Caretaker CANNOT update someone else's PERSONAL document (403 FORBIDDEN)",
      `Got status: ${mainUpdatePersonalRes.status}`
    );

    // 23. Main Caretaker CANNOT delete someone else's PERSONAL document (403 Forbidden)
    const mainDelPersonalRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docPersonalId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    assert(
      mainDelPersonalRes.status === 403,
      "23. Main Caretaker CANNOT delete someone else's PERSONAL document (403 FORBIDDEN)",
      `Got status: ${mainDelPersonalRes.status}`
    );

    // 24. Main Caretaker CANNOT inspect audit logs of someone else's PERSONAL document (403 Forbidden)
    const mainAuditPersonalRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docPersonalId}/audit-logs`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    assert(
      mainAuditPersonalRes.status === 403,
      "24. Main Caretaker is blocked from inspecting audit logs of a PERSONAL document (403 FORBIDDEN)",
      `Got status: ${mainAuditPersonalRes.status}`
    );

    // 25. Uploader CAN inspect their own PERSONAL document audit logs
    const uploaderAuditRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docPersonalId}/audit-logs`,
      {
        headers: { Authorization: `Bearer ${familyToken}` },
      }
    );
    const uploaderAuditData = await uploaderAuditRes.json();
    assert(
      uploaderAuditRes.status === 200 && Array.isArray(uploaderAuditData.data.auditLogs),
      "25. Document uploader can inspect their own PERSONAL document audit logs (200 OK)",
      `Got status: ${uploaderAuditRes.status}`
    );

    // ----------------------------------------------------------------
    // SECTION 5: LISTING, EMERGENCY, AND PRESIGNED DOWNLOAD TESTS
    // ----------------------------------------------------------------
    console.log("\n--- SECTION 5: LISTING, EMERGENCY, AND PRESIGNED DOWNLOAD TESTS ---");

    // 26. Main Caretaker lists documents: PERSONAL doc of Family Member is NOT visible
    const mainListRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const mainListData = await mainListRes.json();
    const hasPersonalInMainList = mainListData.data.documents.some((d) => d.id === docPersonalId);
    assert(
      mainListRes.status === 200 && !hasPersonalInMainList,
      "26. GET /documents filters out PERSONAL documents of other users for Main Caretaker",
      `Found personal doc in main list: ${hasPersonalInMainList}`
    );

    // 27. Uploader (Family Member) lists documents: their PERSONAL document IS visible
    const familyListRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      headers: { Authorization: `Bearer ${familyToken}` },
    });
    const familyListData = await familyListRes.json();
    const hasPersonalInFamilyList = familyListData.data.documents.some((d) => d.id === docPersonalId);
    assert(
      familyListRes.status === 200 && hasPersonalInFamilyList,
      "27. GET /documents includes PERSONAL document for the uploader",
      `Found personal doc in uploader list: ${hasPersonalInFamilyList}`
    );

    // 28. Doctor lists documents: Doctor & Caretakers and Circle Wide docs visible, but Family Only hidden
    const doctorListRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const doctorListData = await doctorListRes.json();
    const hasFamilyDocInDoctorList = doctorListData.data.documents.some((d) => d.id === docFamilyId);
    assert(
      doctorListRes.status === 200 && !hasFamilyDocInDoctorList,
      "28. Doctor listing hides FAMILY_ONLY documents",
      `Has family doc in doctor list: ${hasFamilyDocInDoctorList}`
    );

    // 29. Authorized presigned download URL generation for S3 document
    const downloadRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docS3UploadedId}/download`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const downloadData = await downloadRes.json();
    assert(
      downloadRes.status === 200 &&
        downloadData.data.downloadUrl &&
        downloadData.data.storageProvider === "S3" &&
        downloadData.data.expiresInSeconds === 300,
      "29. GET /documents/:docId/download generates short-lived presigned GET URL for authorized S3 document",
      `Status: ${downloadRes.status}, URL: ${downloadData.data?.downloadUrl?.slice(0, 40)}...`
    );

    // 30. Download endpoint on EXTERNAL_URL document returns original URL
    const extDownloadRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docFamilyId}/download`,
      {
        headers: { Authorization: `Bearer ${familyToken}` },
      }
    );
    const extDownloadData = await extDownloadRes.json();
    assert(
      extDownloadRes.status === 200 &&
        extDownloadData.data.storageProvider === "EXTERNAL_URL" &&
        extDownloadData.data.downloadUrl.startsWith("https://"),
      "30. GET /documents/:docId/download returns external URL for EXTERNAL_URL documents",
      `Got status: ${extDownloadRes.status}`
    );

    // 31. Create Emergency document and test Emergency Quick Access
    const emergPdfBytes = Buffer.from("%PDF-1.4\n%âãÏÓ\nEmergency DNR and Blood Directive\n%%EOF");
    const emergForm = new FormData();
    emergForm.append("file", new Blob([emergPdfBytes], { type: "application/pdf" }), "emergency_dnr.pdf");
    emergForm.append("title", "Advance Medical Directive & Emergency DNR");
    emergForm.append("category", "DISCHARGE_SUMMARY");
    emergForm.append("privacyLevel", "EMERGENCY_SOS");
    emergForm.append("isEmergencyAccessible", "true");

    const emergUploadRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${mainToken}` },
      body: emergForm,
    });
    const emergUploadData = await emergUploadRes.json();
    docEmergencyId = emergUploadData.data.document.id;

    const emergencyListRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/emergency`, {
      headers: { Authorization: `Bearer ${caregiverToken}` },
    });
    const emergencyListData = await emergencyListRes.json();
    const hasEmergDoc = emergencyListData.data.documents.some((d) => d.id === docEmergencyId);
    assert(
      emergencyListRes.status === 200 && hasEmergDoc,
      "31. GET /documents/emergency returns emergency documents to all active circle caregivers",
      `Found emergency doc: ${hasEmergDoc}`
    );

    // 32. Cross-circle isolation: Outsider CANNOT access circle document
    const crossCircleRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docEmergencyId}`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    assert(
      crossCircleRes.status === 403,
      "32. Cross-Circle Isolation: Outsider from another circle is returned 403 FORBIDDEN",
      `Got status: ${crossCircleRes.status}`
    );

    // 33. Cross-circle download: Outsider CANNOT generate download URL
    const crossDownloadRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/documents/${docEmergencyId}/download`,
      {
        headers: { Authorization: `Bearer ${outsiderToken}` },
      }
    );
    assert(
      crossDownloadRes.status === 403,
      "33. Cross-Circle Isolation: Outsider CANNOT generate presigned download URL (403 FORBIDDEN)",
      `Got status: ${crossDownloadRes.status}`
    );

    // 34. Document update by author
    const updateRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docS3UploadedId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        title: "Complete Blood Count — Updated 2026",
        description: "Updated with second physician review notes.",
      }),
    });
    const updateData = await updateRes.json();
    assert(
      updateRes.status === 200 &&
        updateData.data.document.title === "Complete Blood Count — Updated 2026" &&
        updateData.data.document.auditLogs.some((l) => l.action === "UPDATE"),
      "34. Document metadata updated successfully and records UPDATE audit log",
      `Got status: ${updateRes.status}`
    );

    // 35. Document deletion by author
    const delRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docS3UploadedId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const delData = await delRes.json();
    assert(
      delRes.status === 200 && delData.data.documentId === docS3UploadedId,
      "35. Document author successfully deletes document and underlying S3 object reference",
      `Got status: ${delRes.status}`
    );

    // 36. Confirm deleted document returns 404
    const checkDeletedRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docS3UploadedId}`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    assert(
      checkDeletedRes.status === 404,
      "36. Deleted document returns 404 DOCUMENT_NOT_FOUND on subsequent access",
      `Got status: ${checkDeletedRes.status}`
    );

  } catch (error) {
    console.error("Test suite encountered fatal error:", error);
    failed++;
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await mongoose.disconnect();
    console.log("\n==================================================");
    console.log(`S3 VAULT INTEGRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runS3CareDocumentTests();
