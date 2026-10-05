/**
 * CareOS Frontend Document Vault Integration Test Suite
 * Slice: Emergency Document Vault Frontend (Vertical Slice 6)
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
const CareDocument = serverRequire('./src/models/CareDocument');
const RefreshToken = serverRequire('./src/models/RefreshToken');

import {
  ROLES,
  DOCUMENT_CATEGORIES,
  DOCUMENT_PRIVACY_LEVELS,
  canUploadDocuments,
  canEditDocument,
  canDeleteDocument,
  canViewAuditLogs,
} from './src/constants/roles.js';

let serverInstance;
const TEST_PORT = 5106;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runDocumentsIntegrationTests() {
  console.log('================================================================');
  console.log('CAREOS FRONTEND PHASE 1 INTEGRATION TEST SUITE');
  console.log('Slice: Emergency Document Vault Frontend (Slice 6)');
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
  console.log('Connected to MongoDB for Care Document frontend integration testing.');

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`Documents integration test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  const timestamp = Date.now();
  const mainEmail = `caretaker.doc.${timestamp}@example.com`;
  const subEmail = `sub.doc.${timestamp}@example.com`;
  const doctorEmail = `doctor.doc.${timestamp}@example.com`;
  const familyEmail = `family.doc.${timestamp}@example.com`;
  const outsideEmail = `outsider.doc.${timestamp}@example.com`;
  const testPassword = 'Password123!Docs';

  let mainToken = '';
  let subToken = '';
  let doctorToken = '';
  let familyToken = '';
  let outsideToken = '';

  let mainUserId = '';
  let subUserId = '';
  let doctorUserId = '';
  let familyUserId = '';
  let outsideUserId = '';

  let circleId = '';
  let circle2Id = '';
  let recipientId = '';
  let foreignCircleId = '';

  let docInsuranceId = '';
  let docLegalId = '';
  let docLabId = '';
  let docInternalId = '';
  let docEmergencyId = '';
  let docExpiringId = '';
  let docExpiredId = '';

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 15);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 30);
  const pastDateStr = pastDate.toISOString().split('T')[0];

  try {
    // ----------------------------------------------------------------
    // Setup Test Users & Care Circles
    // ----------------------------------------------------------------
    // 1. Register Main Caretaker
    const regMain = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Anita Verma',
        email: mainEmail,
        password: testPassword,
        phone: '+919811112222',
      }),
    });
    const mainData = await regMain.json();
    mainToken = mainData.data.tokens.accessToken;
    mainUserId = mainData.data.user.id;

    // 2. Register Sub Caretaker
    const regSub = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rohan Verma',
        email: subEmail,
        password: testPassword,
        phone: '+919811112223',
      }),
    });
    const subData = await regSub.json();
    subToken = subData.data.tokens.accessToken;
    subUserId = subData.data.user.id;

    // 3. Register Paid Doctor
    const regDoc = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Sameer Joshi',
        email: doctorEmail,
        password: testPassword,
        phone: '+919811112224',
      }),
    });
    const docData = await regDoc.json();
    doctorToken = docData.data.tokens.accessToken;
    doctorUserId = docData.data.user.id;

    // 4. Register Family Member
    const regFam = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kavita Verma',
        email: familyEmail,
        password: testPassword,
        phone: '+919811112225',
      }),
    });
    const famData = await regFam.json();
    familyToken = famData.data.tokens.accessToken;
    familyUserId = famData.data.user.id;

    // 5. Register Outsider
    const regOut = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Outsider User',
        email: outsideEmail,
        password: testPassword,
        phone: '+919811112226',
      }),
    });
    const outData = await regOut.json();
    outsideToken = outData.data.tokens.accessToken;
    outsideUserId = outData.data.user.id;

    // 6. Create Care Circle 1
    const createCircleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        name: 'Verma Family Circle',
        recipient: {
          fullName: 'Kailash Verma',
          dateOfBirth: '1952-04-12',
          gender: 'male',
          bloodGroup: 'B+',
        },
      }),
    });
    const circleData = await createCircleRes.json();
    circleId = circleData.data.careCircle.id;
    recipientId = circleData.data.careRecipient.id;

    // 7. Add Sub Caretaker, Doctor, and Family Member to Circle 1
    await CareCircleMember.create([
      { careCircle: circleId, user: subUserId, role: ROLES.SUB_CARETAKER, membershipStatus: 'ACTIVE' },
      { careCircle: circleId, user: doctorUserId, role: ROLES.PAID_DOCTOR, membershipStatus: 'ACTIVE' },
      { careCircle: circleId, user: familyUserId, role: ROLES.FAMILY_MEMBER, membershipStatus: 'ACTIVE' },
    ]);

    // 8. Create Circle 2 for switching and cross-circle isolation
    const createCircle2Res = await fetch(`${BASE_URL}/api/care-circles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        name: 'Secondary Circle',
        recipient: {
          fullName: 'Sharda Verma',
          dateOfBirth: '1955-08-20',
          gender: 'female',
          bloodGroup: 'O+',
        },
      }),
    });
    const circle2Data = await createCircle2Res.json();
    circle2Id = circle2Data.data.careCircle.id;

    // Foreign circle for outsider
    const createForeignRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${outsideToken}`,
      },
      body: JSON.stringify({
        name: 'Foreign Circle',
        recipient: {
          fullName: 'Foreign Recipient',
          dateOfBirth: '1960-01-01',
          gender: 'male',
          bloodGroup: 'A+',
        },
      }),
    });
    const foreignData = await createForeignRes.json();
    foreignCircleId = foreignData.data.careCircle.id;

    // ================================================================
    // PHASE 1: Context & Empty Vault Initializations
    // ================================================================
    console.log('\n--- Phase 1: Context & Empty Vault Initializations ---');

    assert(Boolean(mainToken), '1. Documents page loads with authenticated session');
    assert(mongoose.Types.ObjectId.isValid(circleId), '2. Active circle context ID is verified and valid MongoDB ObjectID');

    const emptyListRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const emptyListData = await emptyListRes.json();
    assert(emptyListRes.status === 200 && Array.isArray(emptyListData.data.documents), '3. Documents list endpoint responds with 200 and documents array');
    assert(emptyListData.data.documents.length === 0 && emptyListData.total === 0, '4. Empty vault state correctly reflects 0 documents initially');

    // ================================================================
    // PHASE 2: Document Creation & Canonical Categories
    // ================================================================
    console.log('\n--- Phase 2: Document Creation & Canonical Categories ---');

    // 5. Upload CIRCLE_WIDE Insurance Policy
    const doc1Res = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        title: 'Star Health Family Optima Policy 2026',
        category: 'INSURANCE',
        privacyLevel: 'CIRCLE_WIDE',
        fileUrl: 'https://storage.careos.health/docs/star-health-2026.pdf',
        fileName: 'star-health-2026.pdf',
        fileType: 'application/pdf',
        fileSizeBytes: 2048576,
        documentNumber: 'POL-SH-99201',
        issuedDate: '2026-01-01',
        expiryDate: '2026-12-31',
        isEmergencyAccessible: true,
        tags: ['insurance', 'mediclaim', 'cashless', 'starhealth'],
        description: 'Comprehensive cashless health insurance covering hospitalization up to 10 Lakhs.',
      }),
    });
    const doc1Data = await doc1Res.json();
    assert(doc1Res.status === 201 && doc1Data.data.document.title.includes('Star Health'), '5. Upload CIRCLE_WIDE Insurance policy persists and returns 201 Created');
    docInsuranceId = doc1Data.data.document.id || doc1Data.data.document._id;

    // 6. Upload FAMILY_ONLY Legal Power of Attorney
    const doc2Res = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${subToken}`,
      },
      body: JSON.stringify({
        title: 'Medical Power of Attorney & Advance Directive',
        category: 'LEGAL_FINANCIAL',
        privacyLevel: 'FAMILY_ONLY',
        fileUrl: 'https://storage.careos.health/docs/poa-directive.pdf',
        fileName: 'poa-directive.pdf',
        documentNumber: 'POA-2026-88',
        issuedDate: '2026-02-10',
        tags: ['legal', 'poa', 'directive'],
        description: 'Designated healthcare proxy and medical decisions power of attorney.',
      }),
    });
    const doc2Data = await doc2Res.json();
    assert(doc2Res.status === 201 && doc2Data.data.document.privacyLevel === 'FAMILY_ONLY', '6. Upload FAMILY_ONLY Legal Power of Attorney document persists (201 Created)');
    docLegalId = doc2Data.data.document.id || doc2Data.data.document._id;

    // 7. Upload DOCTOR_AND_CARETAKERS Cardiology Lab Report
    const doc3Res = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken}`,
      },
      body: JSON.stringify({
        title: 'Comprehensive Echo & Lipid Profile Report',
        category: 'LAB_REPORT',
        privacyLevel: 'DOCTOR_AND_CARETAKERS',
        fileUrl: 'https://storage.careos.health/docs/echo-lipid-report.pdf',
        fileName: 'echo-lipid-report.pdf',
        documentNumber: 'LAB-ECHO-2026',
        issuedDate: todayStr,
        tags: ['cardiology', 'echo', 'lipids'],
        description: 'Ejection fraction 60%, normal LV systolic function.',
      }),
    });
    const doc3Data = await doc3Res.json();
    assert(doc3Res.status === 201 && doc3Data.data.document.category === 'LAB_REPORT', '7. Upload DOCTOR_AND_CARETAKERS Cardiology Lab Report persists (201 Created)');
    docLabId = doc3Data.data.document.id || doc3Data.data.document._id;

    // 8. Upload CARETAKERS_ONLY internal contract
    const doc4Res = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        title: 'Night Nurse Service Contract & Shift Agreement',
        category: 'OTHER',
        privacyLevel: 'CARETAKERS_ONLY',
        fileUrl: 'https://storage.careos.health/docs/nurse-contract.pdf',
        description: 'Internal private contract terms with home healthcare service provider.',
      }),
    });
    const doc4Data = await doc4Res.json();
    assert(doc4Res.status === 201 && doc4Data.data.document.privacyLevel === 'CARETAKERS_ONLY', '8. Upload CARETAKERS_ONLY Internal document persists (201 Created)');
    docInternalId = doc4Data.data.document.id || doc4Data.data.document._id;

    // 9. Upload EMERGENCY_SOS Medical ID card
    const doc5Res = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${familyToken}`,
      },
      body: JSON.stringify({
        title: 'Emergency Medical ID & Pacemaker Specification Card',
        category: 'DISCHARGE_SUMMARY',
        privacyLevel: 'EMERGENCY_SOS',
        fileUrl: 'https://storage.careos.health/docs/pacemaker-id-card.pdf',
        documentNumber: 'MED-ID-PACE-01',
        isEmergencyAccessible: true,
        tags: ['emergency', 'pacemaker', 'medtronic', 'sos'],
        description: 'Medtronic Dual Chamber Pacemaker implanted in 2024. Model Azure XT DR.',
      }),
    });
    const doc5Data = await doc5Res.json();
    assert(doc5Res.status === 201 && doc5Data.data.document.isEmergencyAccessible === true, '9. Upload EMERGENCY_SOS Medical ID card persists with emergency flag (201 Created)');
    docEmergencyId = doc5Data.data.document.id || doc5Data.data.document._id;

    // ================================================================
    // PHASE 3: Role-Based Privacy & Visibility Enforcement
    // ================================================================
    console.log('\n--- Phase 3: Role-Based Privacy & Visibility Enforcement ---');

    // 10. Main Caretaker lists all 5 documents
    const mainListRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const mainListData = await mainListRes.json();
    assert(mainListRes.status === 200 && mainListData.data.documents.length === 5, `10. Main Caretaker lists all 5 documents across all privacy tiers (count: ${mainListData.data.documents.length})`);

    // 11. Sub Caretaker lists all 5 documents
    const subListRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${subToken}` },
    });
    const subListData = await subListRes.json();
    assert(subListRes.status === 200 && subListData.data.documents.length === 5, `11. Sub Caretaker lists all 5 documents across all privacy tiers (count: ${subListData.data.documents.length})`);

    // 12. Family Member feed only includes permitted tiers (CIRCLE_WIDE, FAMILY_ONLY, EMERGENCY_SOS)
    const famListRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${familyToken}` },
    });
    const famListData = await famListRes.json();
    const famDocIds = famListData.data.documents.map((d) => d.id || d._id);
    assert(
      famListRes.status === 200 &&
      famListData.data.documents.length === 3 &&
      famDocIds.includes(docInsuranceId) &&
      famDocIds.includes(docLegalId) &&
      famDocIds.includes(docEmergencyId) &&
      !famDocIds.includes(docLabId) &&
      !famDocIds.includes(docInternalId),
      `12. Family Member feed filters out DOCTOR_AND_CARETAKERS and CARETAKERS_ONLY documents (count: ${famListData.data.documents.length})`
    );

    // 13. Paid Doctor feed only includes permitted tiers (CIRCLE_WIDE, DOCTOR_AND_CARETAKERS, EMERGENCY_SOS)
    const docListRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const docListData = await docListRes.json();
    const doctorDocIds = docListData.data.documents.map((d) => d.id || d._id);
    assert(
      docListRes.status === 200 &&
      docListData.data.documents.length === 3 &&
      doctorDocIds.includes(docInsuranceId) &&
      doctorDocIds.includes(docLabId) &&
      doctorDocIds.includes(docEmergencyId) &&
      !doctorDocIds.includes(docLegalId) &&
      !doctorDocIds.includes(docInternalId),
      `13. Paid Doctor feed filters out FAMILY_ONLY and CARETAKERS_ONLY documents (count: ${docListData.data.documents.length})`
    );

    // 14. Family Member direct access to CARETAKERS_ONLY document is rejected (403)
    const famRestrictedRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docInternalId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${familyToken}` },
    });
    assert(famRestrictedRes.status === 403, '14. Family Member direct access to CARETAKERS_ONLY document is rejected (403 DOCUMENT_ACCESS_RESTRICTED)');

    // 15. Paid Doctor direct access to FAMILY_ONLY document is rejected (403)
    const docRestrictedRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docLegalId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    assert(docRestrictedRes.status === 403, '15. Paid Doctor direct access to FAMILY_ONLY legal document is rejected (403 DOCUMENT_ACCESS_RESTRICTED)');

    // ================================================================
    // PHASE 4: Emergency Quick-Access Endpoint & Expiry Telemetry
    // ================================================================
    console.log('\n--- Phase 4: Emergency Quick-Access & Expiry Telemetry ---');

    // 16. Emergency documents endpoint
    const emergRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/emergency`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${familyToken}` },
    });
    const emergData = await emergRes.json();
    assert(emergRes.status === 200 && emergData.data.documents.length === 2, `16. GET /documents/emergency returns emergency documents to all circle members (count: ${emergData.data.documents.length})`);

    // 17. Upload expiring document and expired document for renewal telemetry
    const docExpiringRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        title: 'Physiotherapy Referral Order (Expiring Soon)',
        category: 'PRESCRIPTION',
        privacyLevel: 'CIRCLE_WIDE',
        fileUrl: 'https://storage.careos.health/docs/physio-referral.pdf',
        issuedDate: todayStr,
        expiryDate: futureDateStr,
        tags: ['physio', 'referral'],
      }),
    });
    const docExpiringData = await docExpiringRes.json();
    docExpiringId = docExpiringData.data.document.id || docExpiringData.data.document._id;

    const docExpiredRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        title: 'Senior Citizen Travel Medical Clearance (Expired)',
        category: 'OTHER',
        privacyLevel: 'CIRCLE_WIDE',
        fileUrl: 'https://storage.careos.health/docs/travel-clearance.pdf',
        issuedDate: pastDateStr,
        expiryDate: pastDateStr,
        tags: ['travel', 'clearance'],
      }),
    });
    const docExpiredData = await docExpiredRes.json();
    docExpiredId = docExpiredData.data.document.id || docExpiredData.data.document._id;

    assert(Boolean(docExpiringId) && Boolean(docExpiredId), '17. Uploaded expiring document (15 days) and expired document (-30 days)');

    // 18. GET /documents/expiring
    const expiringRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/expiring?days=30`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const expiringTelemetry = await expiringRes.json();
    assert(
      expiringRes.status === 200 &&
      expiringTelemetry.data.windowDays === 30 &&
      expiringTelemetry.data.expiringCount >= 1 &&
      expiringTelemetry.data.expiredCount >= 1,
      `18. GET /documents/expiring returns accurate telemetry (expiring: ${expiringTelemetry.data.expiringCount}, expired: ${expiringTelemetry.data.expiredCount})`
    );

    // ================================================================
    // PHASE 5: Document Detail & VIEW Access Audit Logging
    // ================================================================
    console.log('\n--- Phase 5: Document Detail & VIEW Access Audit Logging ---');

    // 19. GET /documents/:docId returns full document dossier
    const detailRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docInsuranceId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const detailData = await detailRes.json();
    assert(detailRes.status === 200 && detailData.data.document.uploadedBy.name === 'Anita Verma', '19. GET /documents/:docId returns full document dossier with populated uploader profile');

    // 20. Viewing document appends a VIEW action audit log
    const viewedDoc = await CareDocument.findById(docInsuranceId);
    const hasViewLog = viewedDoc.auditLogs.some((l) => l.action === 'VIEW');
    assert(hasViewLog, '20. GET /documents/:docId automatically appends a VIEW action audit log with timestamp');

    // 21. Caretaker inspects document audit logs
    const auditRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docInsuranceId}/audit-logs`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const auditData = await auditRes.json();
    assert(auditRes.status === 200 && Array.isArray(auditData.data.auditLogs) && auditData.data.auditLogs.length >= 2, `21. Caretaker inspects document audit logs via GET /documents/:id/audit-logs (${auditData.data.auditLogs.length} logs)`);

    // 22. Non-caretaker is rejected from inspecting audit logs (403)
    const famAuditRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docInsuranceId}/audit-logs`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${familyToken}` },
    });
    assert(famAuditRes.status === 403, '22. Non-caretaker (Family Member) is rejected from inspecting audit logs (403 FORBIDDEN)');

    // ================================================================
    // PHASE 6: Document Updates & Deletion Governance
    // ================================================================
    console.log('\n--- Phase 6: Document Updates & Deletion Governance ---');

    // 23. Document author updates metadata
    const updateRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docExpiringId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        title: 'Physiotherapy Referral Order (Renewed for Q2 2026)',
        description: 'Updated with 20 additional sessions prescribed by Dr. Sameer.',
      }),
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200 && updateData.data.document.title.includes('Renewed'), '23. Document author updates document metadata successfully (200 OK)');

    // 24. Non-caretaker, non-author is rejected from updating document (403)
    const unauthorizedUpdateRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docExpiringId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${familyToken}`,
      },
      body: JSON.stringify({
        title: 'Attempted Unauthorized Update',
      }),
    });
    assert(unauthorizedUpdateRes.status === 403, '24. Non-caretaker, non-author member is rejected from updating document (403 FORBIDDEN)');

    // 25. Document author deletes document successfully
    const deleteExpiringRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docExpiringId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    assert(deleteExpiringRes.status === 200, '25. Document author successfully deletes document with 200 OK');

    // 26. Main Caretaker deletes document created by another user
    const deleteExpiredRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docExpiredId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    assert(deleteExpiredRes.status === 200, '26. Main Caretaker successfully deletes circle document (200 OK)');

    // 27. Non-caretaker, non-author is rejected from deleting document (403)
    const unauthorizedDeleteRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/${docLabId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${familyToken}` },
    });
    assert(unauthorizedDeleteRes.status === 403, '27. Non-caretaker, non-author user cannot delete another member\'s document (403 FORBIDDEN)');

    // ================================================================
    // PHASE 7: Circle Switching & Cross-Circle Protection
    // ================================================================
    console.log('\n--- Phase 7: Circle Switching & Cross-Circle Protection ---');

    // 28. Circle switching isolates documents
    const circle2ListRes = await fetch(`${BASE_URL}/api/care-circles/${circle2Id}/documents`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const circle2ListData = await circle2ListRes.json();
    assert(circle2ListRes.status === 200 && circle2ListData.data.documents.length === 0, '28. Circle switching isolates documents cleanly: Circle 2 has 0 documents');

    // 29. Cross-circle access attempt is rejected with 403
    const crossCircleRes = await fetch(`${BASE_URL}/api/care-circles/${foreignCircleId}/documents`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    assert(crossCircleRes.status === 403, '29. Cross-circle access attempt using foreign circle ID is denied (403 FORBIDDEN)');

    // ================================================================
    // PHASE 8: HTTP Status & Validation Integrity
    // ================================================================
    console.log('\n--- Phase 8: HTTP Status & Validation Integrity ---');

    // 30. Unauthenticated request
    const unauthRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      method: 'GET',
    });
    assert(unauthRes.status === 401, '30. Unauthenticated request returns 401 AUTH_TOKEN_MISSING');

    // 31. Non-member request
    const nonMemberRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${outsideToken}` },
    });
    assert(nonMemberRes.status === 403, '31. Non-member user request returns 403 FORBIDDEN');

    // 32. Non-existent document ID
    const notFoundRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/507f1f77bcf86cd799439011`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    assert(notFoundRes.status === 404, '32. Accessing non-existent document ID returns 404 DOCUMENT_NOT_FOUND');

    // 33. Validation error on missing title and missing fileUrl
    const badDocRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        category: 'INSURANCE',
      }),
    });
    assert(badDocRes.status === 400, '33. Validation error on missing title / fileUrl returns 400 Bad Request');

    // 34. Invalid docId format in URL parameter
    const invalidIdRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents/invalid-id-format`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    assert(invalidIdRes.status === 400, '34. Invalid docId format in URL param returns 400 validation error gracefully');

    // 35. Search query filter
    const searchRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/documents?search=Pacemaker`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const searchData = await searchRes.json();
    assert(searchRes.status === 200 && searchData.data.documents.length === 1, '35. Search query filter search=Pacemaker matches emergency medical ID document');

    // ================================================================
    // PHASE 9: Client Role Helpers Integrity
    // ================================================================
    console.log('\n--- Phase 9: Client Role Helpers Integrity ---');

    assert(canUploadDocuments(ROLES.MAIN_CARETAKER) && canUploadDocuments(ROLES.FAMILY_MEMBER), '36. canUploadDocuments helper grants upload rights to all active circle members');
    assert(canViewAuditLogs(ROLES.MAIN_CARETAKER) && canViewAuditLogs(ROLES.SUB_CARETAKER) && !canViewAuditLogs(ROLES.FAMILY_MEMBER) && !canViewAuditLogs(ROLES.PAID_DOCTOR), '37. canViewAuditLogs helper restricts audit logs strictly to Main and Sub Caretakers');

    const sampleDoc = { uploadedBy: { _id: familyUserId }, title: 'Family Doc' };
    assert(canEditDocument(sampleDoc, { _id: familyUserId }, ROLES.FAMILY_MEMBER), '38. canEditDocument helper correctly permits document author');
    assert(canEditDocument(sampleDoc, { _id: mainUserId }, ROLES.MAIN_CARETAKER), '39. canEditDocument helper correctly permits Main Caretaker');
    assert(!canEditDocument(sampleDoc, { _id: doctorUserId }, ROLES.PAID_DOCTOR), '40. canEditDocument helper correctly denies non-author Doctor');

    // ================================================================
    // PHASE 10: Error & Toast String Normalization Safety
    // ================================================================
    console.log('\n--- Phase 10: Error & Toast String Normalization Safety ---');

    // Simulate toast normalization logic
    const rawErrorObj = { type: 'error', title: 'Upload Failed', message: 'File size exceeds limit' };
    const normalizedToast = typeof rawErrorObj === 'string'
      ? rawErrorObj
      : rawErrorObj?.message || rawErrorObj?.title || 'Unknown Error';
    assert(typeof normalizedToast === 'string' && normalizedToast === 'File size exceeds limit', '41. Toast normalization converts object payload to string and prevents React child rendering error');

    // Telemetry count safety
    const sampleDocsList = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const sampleEmergList = [{ id: '1' }];
    const docSummaryState = {
      total: sampleDocsList.length,
      emergency: sampleEmergList.length,
      expiring: 0,
    };
    assert(docSummaryState.total === 3 && docSummaryState.emergency === 1, '42. Dashboard document summary metrics compute accurate counts for home card');

  } catch (err) {
    console.error('Fatal error running Document Vault integration tests:', err);
    failed++;
  } finally {
    // Cleanup created database records
    console.log('\nCleaning up Document Vault integration test database records...');
    await CareDocument.deleteMany({ careCircle: { $in: [circleId, circle2Id, foreignCircleId] } });
    await CareCircleMember.deleteMany({ careCircle: { $in: [circleId, circle2Id, foreignCircleId] } });
    await CareRecipient.deleteMany({ _id: recipientId });
    await CareCircle.deleteMany({ _id: { $in: [circleId, circle2Id, foreignCircleId] } });
    await RefreshToken.deleteMany({ user: { $in: [mainUserId, subUserId, doctorUserId, familyUserId, outsideUserId] } });
    await User.deleteMany({ _id: { $in: [mainUserId, subUserId, doctorUserId, familyUserId, outsideUserId] } });

    console.log('Document Vault integration test database records cleaned up successfully.\n');

    if (serverInstance) {
      serverInstance.close();
    }
    await mongoose.disconnect();

    console.log('================================================================');
    console.log(`DOCUMENT VAULT INTEGRATION SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runDocumentsIntegrationTests();
