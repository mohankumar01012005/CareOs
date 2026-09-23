/**
 * CareOS Frontend Medication Management & Reminders Integration Test Suite
 * Phase 1 — Vertical Slice 3: Medication Management + Medication Reminders
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
const Medication = serverRequire('./src/models/Medication');
const DoseLog = serverRequire('./src/models/DoseLog');
const RefreshToken = serverRequire('./src/models/RefreshToken');

import {
  canManageMedications,
  MEDICATION_FORMS,
  MEDICATION_FREQUENCIES,
  FOOD_TIMINGS,
  MEDICATION_TIME_SLOTS,
  MEDICATION_STATUS,
  DOSE_STATUS,
} from './src/constants/roles.js';

let serverInstance;
const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runMedicationsIntegrationTests() {
  console.log('================================================================');
  console.log('CAREOS FRONTEND PHASE 1 INTEGRATION TEST SUITE');
  console.log('Slice: Medication Management + Medication Reminders');
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
  console.log('Connected to MongoDB for Medication integration testing.');

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`Medication integration test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  const timestamp = Date.now();
  const mainEmail = `caretaker.meds.${timestamp}@example.com`;
  const doctorEmail = `doctor.meds.${timestamp}@example.com`;
  const familyEmail = `family.meds.${timestamp}@example.com`;
  const outsideEmail = `outsider.meds.${timestamp}@example.com`;
  const testPassword = 'Password123!Med';

  let mainToken = '';
  let doctorToken = '';
  let familyToken = '';
  let outsideToken = '';

  let mainUserId = '';
  let doctorUserId = '';
  let familyUserId = '';
  let outsideUserId = '';

  let circleId = '';
  let recipientId = '';
  let foreignCircleId = '';

  let metforminId = '';
  let amlodipineId = '';
  let doseLogId = '';

  const todayStr = new Date().toISOString().split('T')[0];

  try {
    // ----------------------------------------------------------------
    // Setup: Create Users & Care Circles
    // ----------------------------------------------------------------
    // 1. Main Caretaker
    const mainRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sunita Main Caretaker',
        email: mainEmail,
        password: testPassword,
        phone: '+919876543301',
      }),
    });
    const mainRegData = await mainRegRes.json();
    mainToken = mainRegData.data.tokens.accessToken;
    mainUserId = mainRegData.data.user.id;

    // 2. Doctor User
    const docRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Vikram Patel',
        email: doctorEmail,
        password: testPassword,
        phone: '+919876543302',
      }),
    });
    const docRegData = await docRegRes.json();
    doctorToken = docRegData.data.tokens.accessToken;
    doctorUserId = docRegData.data.user.id;

    // 3. Family Member User
    const familyRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aakash Family Member',
        email: familyEmail,
        password: testPassword,
        phone: '+919876543303',
      }),
    });
    const familyRegData = await familyRegRes.json();
    familyToken = familyRegData.data.tokens.accessToken;
    familyUserId = familyRegData.data.user.id;

    // 4. Outsider User
    const outRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Neha Outsider',
        email: outsideEmail,
        password: testPassword,
        phone: '+919876543304',
      }),
    });
    const outRegData = await outRegRes.json();
    outsideToken = outRegData.data.tokens.accessToken;
    outsideUserId = outRegData.data.user.id;

    // 5. Create primary care circle (Grandpa Care Circle)
    const circleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        name: "Grandpa Ramesh's Care Circle",
        recipient: {
          fullName: 'Ramesh Patel',
          dateOfBirth: '1948-06-15',
          gender: 'male',
          bloodGroup: 'O+',
          knownConditions: ['Type 2 Diabetes', 'Hypertension'],
          allergies: ['Penicillin'],
        },
      }),
    });
    const circleData = await circleRes.json();
    circleId = circleData.data.careCircle.id;
    recipientId = circleData.data.careRecipient.id;

    // 6. Add Doctor as PAID_DOCTOR and Aakash as FAMILY_MEMBER
    await CareCircleMember.create({
      careCircle: circleId,
      user: doctorUserId,
      role: 'PAID_DOCTOR',
      membershipStatus: 'ACTIVE',
    });

    await CareCircleMember.create({
      careCircle: circleId,
      user: familyUserId,
      role: 'FAMILY_MEMBER',
      membershipStatus: 'ACTIVE',
    });

    // 7. Create foreign care circle for outsider
    const foreignCircleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${outsideToken}`,
      },
      body: JSON.stringify({
        name: "Outsider's Private Circle",
        recipient: {
          fullName: 'Foreign Recipient',
          gender: 'female',
        },
      }),
    });
    const foreignCircleData = await foreignCircleRes.json();
    foreignCircleId = foreignCircleData.data.careCircle.id;

    // ================================================================
    // SECTION 1: AUTHENTICATION & CROSS-CIRCLE PROTECTION
    // ================================================================
    console.log('\n--- Section 1: Authentication & Cross-Circle Protection ---');

    // 1. Unauthenticated access rejected (401)
    const unauthRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/medications`);
    assert(
      unauthRes.status === 401,
      '1. Unauthenticated request to medication endpoints is rejected (401 Unauthorized)',
      `Status: ${unauthRes.status}`
    );

    // 2. Non-member access rejected (403)
    const nonMemberRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/medications`, {
      headers: { Authorization: `Bearer ${outsideToken}` },
    });
    assert(
      nonMemberRes.status === 403,
      '2. Non-circle member request is rejected with 403 FORBIDDEN',
      `Status: ${nonMemberRes.status}`
    );

    // 3. Cross-circle medication access rejected (403)
    const crossCircleRes = await fetch(
      `${BASE_URL}/api/care-circles/${foreignCircleId}/medications`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    assert(
      crossCircleRes.status === 403,
      '3. Member of Circle A cannot access Circle B medications (403 Forbidden)',
      `Status: ${crossCircleRes.status}`
    );

    // 4. Role check helper test
    assert(
      canManageMedications('MAIN_CARETAKER') === true &&
        canManageMedications('PAID_DOCTOR') === true &&
        canManageMedications('FAMILY_MEMBER') === false,
      '4. canManageMedications role helper accurately grants to MAIN_CARETAKER and PAID_DOCTOR but denies FAMILY_MEMBER'
    );

    // 5. FAMILY_MEMBER attempting to create medication is rejected with 403
    const famCreateRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/medications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${familyToken}`,
      },
      body: JSON.stringify({
        name: 'Unauthorized Med',
        dosage: '100mg',
      }),
    });
    assert(
      famCreateRes.status === 403,
      '5. Backend RBAC enforces that FAMILY_MEMBER cannot create medication (403 FORBIDDEN)',
      `Status: ${famCreateRes.status}`
    );

    // ================================================================
    // SECTION 2: VALIDATION FAILURES
    // ================================================================
    console.log('\n--- Section 2: Validation Failures & Constraints ---');

    // 6. Missing medication name rejected (400)
    const noNameRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/medications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        dosage: '500mg',
      }),
    });
    const noNameData = await noNameRes.json();
    assert(
      noNameRes.status === 400 && noNameData.success === false,
      '6. Medication creation without name is rejected with 400 validation error',
      `Status: ${noNameRes.status}`
    );

    // 7. Missing dosage rejected (400)
    const noDosageRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/medications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        name: 'Metformin',
      }),
    });
    const noDosageData = await noDosageRes.json();
    assert(
      noDosageRes.status === 400 && noDosageData.success === false,
      '7. Medication creation without dosage is rejected with 400 validation error',
      `Status: ${noDosageRes.status}`
    );

    // 8. Invalid form enum rejected (400)
    const invalidFormRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/medications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        name: 'Metformin',
        dosage: '500mg',
        form: 'chocolate_bar',
      }),
    });
    assert(
      invalidFormRes.status === 400,
      '8. Medication creation with invalid form enum is rejected with 400 validation error',
      `Status: ${invalidFormRes.status}`
    );

    // ================================================================
    // SECTION 3: MEDICATION CREATION & LISTING
    // ================================================================
    console.log('\n--- Section 3: Medication Creation & Listing ---');

    // 9. MAIN_CARETAKER creates Metformin with schedule & stock
    const createMetforminRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          name: 'Metformin Hydrochloride',
          genericName: 'Glucophage',
          dosage: '500mg',
          form: 'tablet',
          formDetails: 'White round tablet with score line',
          frequency: 'twice_daily',
          foodTiming: 'with_meal',
          instructions: 'Take immediately after breakfast and dinner with full glass of water',
          schedule: [
            {
              slot: 'morning',
              time: '08:00',
              doseQuantity: 1,
              instructions: '1 tablet with breakfast',
            },
            {
              slot: 'evening',
              time: '18:00',
              doseQuantity: 1,
              instructions: '1 tablet with dinner',
            },
          ],
          prescribedBy: {
            doctorName: 'Dr. Vikram Patel',
            specialty: 'Endocrinologist',
            hospital: 'Patel Diabetes Clinic',
            phone: '+91 98101 22334',
          },
          stock: {
            tracked: true,
            currentQuantity: 60,
            unit: 'tablets',
            lowStockThreshold: 10,
            packageSize: 60,
            pharmacy: 'Apollo Pharmacy 24/7',
          },
          safetyProtocols: [
            'Ensure Papa drinks at least 250ml water',
            'If missed by >3 hours, skip and continue next scheduled slot',
          ],
        }),
      }
    );
    const createMetforminData = await createMetforminRes.json();
    metforminId = createMetforminData.data.medication.id;

    assert(
      createMetforminRes.status === 201 &&
        createMetforminData.data.medication.name === 'Metformin Hydrochloride' &&
        createMetforminData.data.medication.stock.currentQuantity === 60,
      '9. MAIN_CARETAKER creates complete medication regimen with multi-slot schedule & stock telemetry (201 Created)',
      `Status: ${createMetforminRes.status}`
    );

    // 10. PAID_DOCTOR creates Amlodipine for morning blood pressure
    const createAmlodipineRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({
          name: 'Amlodipine Besylate',
          genericName: 'Norvasc',
          dosage: '5mg',
          form: 'tablet',
          frequency: 'once_daily',
          foodTiming: 'no_restriction',
          instructions: 'Take 1 tablet every morning',
          schedule: [
            {
              slot: 'morning',
              time: '08:00',
              doseQuantity: 1,
              instructions: '1 tablet for BP control',
            },
          ],
          stock: {
            tracked: true,
            currentQuantity: 30,
            unit: 'tablets',
            lowStockThreshold: 5,
            packageSize: 30,
          },
        }),
      }
    );
    const createAmlodipineData = await createAmlodipineRes.json();
    amlodipineId = createAmlodipineData.data.medication.id;

    assert(
      createAmlodipineRes.status === 201 &&
        createAmlodipineData.data.medication.name === 'Amlodipine Besylate',
      '10. PAID_DOCTOR creates medication successfully (201 Created)',
      `Status: ${createAmlodipineRes.status}`
    );

    // 11. Listing circle medications (FAMILY_MEMBER has read access)
    const listRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/medications`, {
      headers: { Authorization: `Bearer ${familyToken}` },
    });
    const listData = await listRes.json();
    assert(
      listRes.status === 200 && listData.data.medications.length === 2,
      '11. FAMILY_MEMBER can view all medications in the Care Circle (200 OK)',
      `Count: ${listData.data?.medications?.length}`
    );

    // 12. Search filter (?search=Amlodipine)
    const searchRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications?search=Amlodipine`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const searchData = await searchRes.json();
    assert(
      searchRes.status === 200 &&
        searchData.data.medications.length === 1 &&
        searchData.data.medications[0].name === 'Amlodipine Besylate',
      '12. Search filter successfully filters medications by name',
      `Count: ${searchData.data?.medications?.length}`
    );

    // 13. Get single medication dossier with calculated telemetry
    const getDossierRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/${metforminId}`,
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );
    const getDossierData = await getDossierRes.json();
    assert(
      getDossierRes.status === 200 &&
        getDossierData.data.telemetry.dailyDoseCount === 2 &&
        getDossierData.data.telemetry.daysRemaining === 30 &&
        getDossierData.data.telemetry.isLowStock === false,
      '13. Medication dossier returns telemetry (dailyDoseCount: 2, daysRemaining: 30, isLowStock: false)',
      `Telemetry: ${JSON.stringify(getDossierData.data?.telemetry)}`
    );

    // ================================================================
    // SECTION 4: TODAY'S DOSE SCHEDULE & DOSE RECORDING
    // ================================================================
    console.log("\n--- Section 4: Today's Schedule & Dose Tracking ---");

    // 14. GET /schedule/today returns timeline slots
    const todaySchedRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/schedule/today?date=${todayStr}`,
      {
        headers: { Authorization: `Bearer ${familyToken}` },
      }
    );
    const todaySchedData = await todaySchedRes.json();
    assert(
      todaySchedRes.status === 200 &&
        todaySchedData.data.summary.totalScheduledCount === 3 &&
        todaySchedData.data.timeline.morning.items.length === 2 &&
        todaySchedData.data.timeline.evening.items.length === 1,
      "14. GET /schedule/today computes today's scheduled doses across Morning & Evening slots (200 OK)",
      `Total scheduled: ${todaySchedData.data?.summary?.totalScheduledCount}`
    );

    // 15. Record morning dose as TAKEN by FAMILY_MEMBER (verifies stock decrement)
    const logMorningTakenRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/${metforminId}/doses`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${familyToken}`,
        },
        body: JSON.stringify({
          slot: 'morning',
          scheduledDate: todayStr,
          scheduledTime: '08:00',
          status: DOSE_STATUS.TAKEN,
          quantityTaken: 1,
          notes: 'Papa had oats and warm milk. Blood glucose was 112 mg/dL.',
        }),
      }
    );
    const logMorningTakenData = await logMorningTakenRes.json();
    doseLogId = logMorningTakenData.data.doseLog.id;

    assert(
      logMorningTakenRes.status === 201 &&
        logMorningTakenData.data.doseLog.status === DOSE_STATUS.TAKEN &&
        logMorningTakenData.data.stockRemaining === 59 &&
        logMorningTakenData.data.doseLog.administeredBy.name === 'Aakash Family Member',
      '15. Dose marked TAKEN: caregiver attributed to Aakash and inventory stock decremented from 60 to 59 (201 Created)',
      `Status: ${logMorningTakenRes.status}, Stock: ${logMorningTakenData.data?.stockRemaining}`
    );

    // 16. Duplicate dose logging rejected (409)
    const dupDoseRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/${metforminId}/doses`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          slot: 'morning',
          scheduledDate: todayStr,
          status: DOSE_STATUS.TAKEN,
        }),
      }
    );
    assert(
      dupDoseRes.status === 409,
      '16. Duplicate dose record for same slot on same date is rejected with 409 DOSE_ALREADY_LOGGED',
      `Status: ${dupDoseRes.status}`
    );

    // 17. Record evening dose as SKIPPED by MAIN_CARETAKER (verifies NO stock decrement)
    const logEveningSkippedRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/${metforminId}/doses`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          slot: 'evening',
          scheduledDate: todayStr,
          status: DOSE_STATUS.SKIPPED,
          skipReason: 'Papa had late dinner and felt nausea; doctor advised skipping evening dose.',
        }),
      }
    );
    const logEveningSkippedData = await logEveningSkippedRes.json();

    assert(
      logEveningSkippedRes.status === 201 &&
        logEveningSkippedData.data.doseLog.status === DOSE_STATUS.SKIPPED &&
        logEveningSkippedData.data.doseLog.stockDeducted === false,
      '17. Dose marked SKIPPED: reason recorded and stock is NOT decremented (stock remains 59) (201 Created)',
      `Stock deducted: ${logEveningSkippedData.data?.doseLog?.stockDeducted}`
    );

    // 18. Check updated schedule summary reflects completed, skipped, and pending counts
    const updatedSchedRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/schedule/today?date=${todayStr}`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const updatedSchedData = await updatedSchedRes.json();
    assert(
      updatedSchedRes.status === 200 &&
        updatedSchedData.data.summary.totalCompletedCount === 1 &&
        updatedSchedData.data.summary.totalSkippedCount === 1 &&
        updatedSchedData.data.summary.pendingCount === 1,
      "18. Today's schedule summary accurately updates: 1 Taken, 1 Skipped, 1 Pending",
      `Summary: ${JSON.stringify(updatedSchedData.data?.summary)}`
    );

    // ================================================================
    // SECTION 5: STOCK REFILL & ADHERENCE ANALYTICS
    // ================================================================
    console.log('\n--- Section 5: Stock Refill & Adherence Analytics ---');

    // 19. Refill medication stock by 60 units (59 + 60 = 119)
    const refillRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/${metforminId}/refill`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          quantity: 60,
          pharmacy: 'Apollo Pharmacy 24/7',
        }),
      }
    );
    const refillData = await refillRes.json();
    assert(
      refillRes.status === 200 && refillData.data.stock.currentQuantity === 119,
      '19. Refill medication increases inventory accurately (59 + 60 = 119 tablets) (200 OK)',
      `Current stock: ${refillData.data?.stock?.currentQuantity}`
    );

    // 20. Non-manager (FAMILY_MEMBER) cannot refill stock (403)
    const famRefillRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/${metforminId}/refill`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${familyToken}`,
        },
        body: JSON.stringify({
          quantity: 30,
        }),
      }
    );
    assert(
      famRefillRes.status === 403,
      '20. Non-manager role (FAMILY_MEMBER) is forbidden from refilling stock (403 Forbidden)',
      `Status: ${famRefillRes.status}`
    );

    // 21. Adherence statistics endpoint
    const adhRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/adherence/stats`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const adhData = await adhRes.json();
    assert(
      adhRes.status === 200 &&
        Array.isArray(adhData.data.history) &&
        adhData.data.history.length === 7 &&
        typeof adhData.data.averageAdherenceRate === 'number',
      '21. GET /adherence/stats calculates 7-day adherence history breakdown and streak',
      `Average rate: ${adhData.data?.averageAdherenceRate}%`
    );

    // 22. Circle-wide dose history list
    const circleDosesRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/doses/history`,
      {
        headers: { Authorization: `Bearer ${familyToken}` },
      }
    );
    const circleDosesData = await circleDosesRes.json();
    assert(
      circleDosesRes.status === 200 && circleDosesData.data.doses.length >= 2,
      '22. GET /doses/history lists all logged dose administration events across circle',
      `Count: ${circleDosesData.data?.doses?.length}`
    );

    // ================================================================
    // SECTION 6: DISCONTINUATION & DASHBOARD INTEGRATION
    // ================================================================
    console.log('\n--- Section 6: Discontinuation & Dashboard Summary ---');

    // 23. Discontinue Amlodipine
    const deleteRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/${amlodipineId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );
    const deleteData = await deleteRes.json();
    assert(
      deleteRes.status === 200 &&
        deleteData.data.medication.status === MEDICATION_STATUS.DISCONTINUED,
      '23. PAID_DOCTOR discontinues medication: status marked as DISCONTINUED (200 OK)',
      `Status: ${deleteData.data?.medication?.status}`
    );

    // 24. Active medications list now excludes discontinued medication
    const activeOnlyRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications?status=ACTIVE`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const activeOnlyData = await activeOnlyRes.json();
    assert(
      activeOnlyRes.status === 200 &&
        activeOnlyData.data.medications.length === 1 &&
        activeOnlyData.data.medications[0].id === metforminId,
      '24. Filtered GET /medications?status=ACTIVE returns only active medications (1 remaining)',
      `Count: ${activeOnlyData.data?.medications?.length}`
    );

    // 25. Update dose log note
    const updateLogRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/doses/${doseLogId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${familyToken}`,
        },
        body: JSON.stringify({
          notes: 'Papa had oats and warm milk. Blood glucose 112 mg/dL. Re-checked at 10 AM: 118 mg/dL.',
        }),
      }
    );
    const updateLogData = await updateLogRes.json();
    assert(
      updateLogRes.status === 200 &&
        updateLogData.data.doseLog.notes.includes('Re-checked at 10 AM'),
      '25. PATCH /doses/:doseLogId updates caregiver note successfully (200 OK)',
      `Status: ${updateLogRes.status}`
    );
  } catch (error) {
    console.error('Test execution failed with error:', error);
    failed++;
  } finally {
    console.log('\n================================================================');
    console.log(`MEDICATION INTEGRATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (serverInstance) {
      serverInstance.close();
    }
    await mongoose.connection.close();

    process.exit(failed > 0 ? 1 : 0);
  }
}

runMedicationsIntegrationTests();
