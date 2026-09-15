const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, ".env") });


const app = require("./server");
const User = require("./src/models/User");
const CareRecipient = require("./src/models/CareRecipient");
const CareCircle = require("./src/models/CareCircle");
const CareCircleMember = require("./src/models/CareCircleMember");
const Medication = require("./src/models/Medication");
const DoseLog = require("./src/models/DoseLog");
const RefreshToken = require("./src/models/RefreshToken");
const {
  CAREOS_ROLES,
  MEMBERSHIP_STATUS,
  MEDICATION_STATUS,
  DOSE_STATUS,
} = require("./src/constants/roles");

let serverInstance;
const TEST_PORT = 5097;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runMedicationTests() {
  console.log("==================================================================");
  console.log("CAREOS MEDICATION REGIMEN & DOSE TRACKING TEST SUITE (IMP 05)");
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
  console.log("Connected to MongoDB for Medication testing.");

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`Medication Test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  const timestamp = Date.now();
  const mainCaretakerEmail = `med.main.${timestamp}@example.com`;
  const doctorEmail = `med.doctor.${timestamp}@example.com`;
  const familyMemberEmail = `med.family.${timestamp}@example.com`;
  const outsiderEmail = `med.outsider.${timestamp}@example.com`;
  const testPassword = "Password123!Med";

  let mainToken = "";
  let doctorToken = "";
  let familyToken = "";
  let outsiderToken = "";

  let mainId = "";
  let doctorId = "";
  let familyId = "";
  let outsiderId = "";

  let circleId = "";
  let outsideCircleId = "";
  let recipientId = "";

  let metforminId = "";
  let amlodipineId = "";
  let doseLogId = "";

  const todayStr = new Date().toISOString().split("T")[0];

  try {
    // ----------------------------------------------------------------
    // Setup Test Users & Care Circles
    // ----------------------------------------------------------------
    // 1. Register Main Caretaker
    const regMain = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Rahul Main Caretaker",
        email: mainCaretakerEmail,
        password: testPassword,
        phone: "+919811111111",
      }),
    });
    const regMainData = await regMain.json();
    mainToken = regMainData.data.tokens.accessToken;
    mainId = regMainData.data.user.id;

    // 2. Register Doctor
    const regDoc = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dr. Alok Sharma",
        email: doctorEmail,
        password: testPassword,
        phone: "+919822222222",
      }),
    });
    const regDocData = await regDoc.json();
    doctorToken = regDocData.data.tokens.accessToken;
    doctorId = regDocData.data.user.id;

    // 3. Register Family Member
    const regFam = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Priya Family Member",
        email: familyMemberEmail,
        password: testPassword,
        phone: "+919833333333",
      }),
    });
    const regFamData = await regFam.json();
    familyToken = regFamData.data.tokens.accessToken;
    familyId = regFamData.data.user.id;

    // 4. Register Outsider
    const regOut = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Oscar Outsider",
        email: outsiderEmail,
        password: testPassword,
        phone: "+919844444444",
      }),
    });
    const regOutData = await regOut.json();
    outsiderToken = regOutData.data.tokens.accessToken;
    outsiderId = regOutData.data.user.id;

    // 5. Main Caretaker creates primary Care Circle
    const circleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        name: "Papa's Health Circle",
        recipient: {
          fullName: "Papa Sharma",
          dateOfBirth: "1952-10-24",
          gender: "male",
          bloodGroup: "B+",
          knownConditions: ["Type 2 Diabetes", "Hypertension"],
          allergies: ["Penicillin"],
        },
      }),
    });
    const circleData = await circleRes.json();
    circleId = circleData.data.careCircle.id;
    recipientId = circleData.data.careRecipient.id;

    // 6. Add Doctor and Family Member to primary Circle
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

    // 7. Outsider creates separate circle
    const outCircleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${outsiderToken}`,
      },
      body: JSON.stringify({
        name: "Outsider Care Circle",
        recipient: {
          fullName: "Grandpa Smith",
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
      `${BASE_URL}/api/care-circles/${circleId}/medications`
    );
    const unauthData = await unauthRes.json();
    assert(
      unauthRes.status === 401 && unauthData.code === "AUTH_TOKEN_MISSING",
      "1. Unauthenticated request to medication endpoint is rejected with 401 AUTH_TOKEN_MISSING",
      `Got ${unauthRes.status}`
    );

    // 2. Non-member access
    const nonMemberRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications`,
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

    // 3. Cross-circle medication access
    const crossCircleRes = await fetch(
      `${BASE_URL}/api/care-circles/${outsideCircleId}/medications`,
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

    // 4. Role restriction: FAMILY_MEMBER cannot create medication
    const familyCreateRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${familyToken}`,
        },
        body: JSON.stringify({
          name: "Unauthorized Med",
          dosage: "100mg",
        }),
      }
    );
    const familyCreateData = await familyCreateRes.json();
    assert(
      familyCreateRes.status === 403 && familyCreateData.code === "FORBIDDEN",
      "4. FAMILY_MEMBER role is rejected when attempting to create medication (403 FORBIDDEN)",
      `Got ${familyCreateRes.status}`
    );

    // ================================================================
    // 2. VALIDATION FAILURE TESTS
    // ================================================================
    console.log("\n--- Section 2: Validation Failures ---");

    // 5. Missing name validation
    const missingNameRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          dosage: "500mg",
        }),
      }
    );
    const missingNameData = await missingNameRes.json();
    assert(
      missingNameRes.status === 400 &&
        missingNameData.success === false &&
        Array.isArray(missingNameData.errors),
      "5. Medication creation missing name is rejected with 400 validation error",
      `Got ${missingNameRes.status}`
    );

    // 6. Missing dosage validation
    const missingDosageRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          name: "Metformin",
        }),
      }
    );
    const missingDosageData = await missingDosageRes.json();
    assert(
      missingDosageRes.status === 400 &&
        missingDosageData.success === false &&
        Array.isArray(missingDosageData.errors),
      "6. Medication creation missing dosage is rejected with 400 validation error",
      `Got ${missingDosageRes.status}`
    );

    // 7. Invalid medication form
    const invalidFormRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          name: "Metformin",
          dosage: "500mg",
          form: "invalid_form_candy",
        }),
      }
    );
    const invalidFormData = await invalidFormRes.json();
    assert(
      invalidFormRes.status === 400 &&
        invalidFormData.success === false &&
        Array.isArray(invalidFormData.errors),
      "7. Medication creation with invalid form is rejected with 400 validation error",
      `Got ${invalidFormRes.status}`
    );

    // 8. Invalid schedule slot
    const invalidSlotRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          name: "Metformin",
          dosage: "500mg",
          schedule: [{ slot: "midnight_snack", time: "00:00" }],
        }),
      }
    );
    const invalidSlotData = await invalidSlotRes.json();
    assert(
      invalidSlotRes.status === 400 &&
        invalidSlotData.success === false &&
        Array.isArray(invalidSlotData.errors),
      "8. Medication creation with invalid schedule slot is rejected with 400 validation error",
      `Got ${invalidSlotRes.status}`
    );

    // ================================================================
    // 3. MEDICATION CREATION & DOSSIER TESTS
    // ================================================================
    console.log("\n--- Section 3: Medication Creation & Retrieval ---");

    // 9. MAIN_CARETAKER creates Metformin with multi-slot schedule & stock tracking
    const createMetforminRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          name: "Metformin Hydrochloride",
          genericName: "Oral Anti-hyperglycemic Agent",
          dosage: "500mg",
          form: "tablet",
          formDetails: "White Round Tablet, Embossed M 500",
          frequency: "twice_daily",
          schedule: [
            {
              slot: "morning",
              time: "08:00",
              doseQuantity: 1,
              instructions: "1 tablet with breakfast",
            },
            {
              slot: "afternoon",
              time: "14:00",
              doseQuantity: 1,
              instructions: "1 tablet with or immediately after lunch",
            },
          ],
          instructions: "Strictly with or immediately following balanced meals",
          foodTiming: "with_meal",
          prescribedBy: {
            doctorName: "Dr. Alok Sharma",
            specialty: "Senior Diabetologist",
            hospital: "City Hospital",
            phone: "+91 98101 22345",
          },
          stock: {
            tracked: true,
            currentQuantity: 60,
            unit: "tablets",
            lowStockThreshold: 10,
            packageSize: 60,
            pharmacy: "Apollo 24/7 Pharmacy",
          },
          safetyProtocols: [
            "Always verify Papa drank at least 250ml water to protect stomach lining.",
            "If delayed past 3:30 PM, do NOT double the night dose. Note in Care Log.",
          ],
        }),
      }
    );
    const createMetforminData = await createMetforminRes.json();
    metforminId = createMetforminData.data.medication.id;

    assert(
      createMetforminRes.status === 201 &&
        createMetforminData.data.medication.name === "Metformin Hydrochloride" &&
        createMetforminData.data.medication.stock.currentQuantity === 60,
      "9. MAIN_CARETAKER creates comprehensive medication with multi-slot schedule & stock (201 Created)",
      `Got ${createMetforminRes.status}`
    );

    // 10. PAID_DOCTOR creates Amlodipine medication
    const createAmlodipineRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({
          name: "Amlodipine",
          dosage: "5mg",
          form: "tablet",
          frequency: "once_daily",
          schedule: [
            {
              slot: "morning",
              time: "08:00",
              doseQuantity: 1,
              instructions: "1 tablet for blood pressure",
            },
          ],
          instructions: "Take with water",
          stock: {
            tracked: true,
            currentQuantity: 30,
            unit: "tablets",
            lowStockThreshold: 5,
          },
        }),
      }
    );
    const createAmlodipineData = await createAmlodipineRes.json();
    amlodipineId = createAmlodipineData.data.medication.id;

    assert(
      createAmlodipineRes.status === 201 &&
        createAmlodipineData.data.medication.name === "Amlodipine",
      "10. PAID_DOCTOR creates medication successfully (201 Created)",
      `Got ${createAmlodipineRes.status}`
    );

    // 11. List all circle medications (FAMILY_MEMBER can read)
    const listMedsRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications`,
      {
        headers: { Authorization: `Bearer ${familyToken}` },
      }
    );
    const listMedsData = await listMedsRes.json();
    assert(
      listMedsRes.status === 200 && listMedsData.data.medications.length === 2,
      "11. Any active member (FAMILY_MEMBER) can list circle medications (200 OK)",
      `Got count: ${listMedsData.data?.medications?.length}`
    );

    // 12. Search query filter (?search=Metformin)
    const searchMedsRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications?search=Metformin`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const searchMedsData = await searchMedsRes.json();
    assert(
      searchMedsRes.status === 200 &&
        searchMedsData.data.medications.length === 1 &&
        searchMedsData.data.medications[0].name === "Metformin Hydrochloride",
      "12. Medications list supports case-insensitive search filter (200 OK)",
      `Got count: ${searchMedsData.data?.medications?.length}`
    );

    // 13. Get single medication dossier with telemetry
    const getDossierRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/${metforminId}`,
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );
    const getDossierData = await getDossierRes.json();
    assert(
      getDossierRes.status === 200 &&
        getDossierData.data.medication.id === metforminId &&
        getDossierData.data.telemetry.dailyDoseCount === 2 &&
        getDossierData.data.telemetry.daysRemaining === 30 &&
        getDossierData.data.telemetry.isLowStock === false,
      "13. Get medication dossier computes telemetry (dailyDoseCount, daysRemaining, isLowStock) (200 OK)",
      `Got ${JSON.stringify(getDossierData.data?.telemetry)}`
    );

    // 14. Update medication details
    const updateMedRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/${metforminId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          formDetails: "White Round Tablet, Embossed M 500 (Updated)",
        }),
      }
    );
    // Use PATCH for updating
    const patchMedRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/${metforminId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          formDetails: "White Round Tablet, Embossed M 500 (Updated)",
        }),
      }
    );
    const patchMedData = await patchMedRes.json();
    assert(
      patchMedRes.status === 200 &&
        patchMedData.data.medication.formDetails.includes("Updated"),
      "14. PATCH /medications/:id updates medication formDetails successfully (200 OK)",
      `Got ${patchMedRes.status}`
    );

    // ================================================================
    // 4. DOSE ADMINISTRATION & STOCK TELEMETRY TESTS
    // ================================================================
    console.log("\n--- Section 4: Dose Administration & Stock Telemetry ---");

    // 15. Record morning dose as TAKEN by FAMILY_MEMBER
    const logMorningDoseRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/${metforminId}/doses`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${familyToken}`,
        },
        body: JSON.stringify({
          slot: "morning",
          scheduledDate: todayStr,
          scheduledTime: "08:00",
          status: DOSE_STATUS.TAKEN,
          quantityTaken: 1,
          notes: "Logged with cup of warm skimmed milk & oats. Papa felt energetic.",
        }),
      }
    );
    const logMorningDoseData = await logMorningDoseRes.json();
    doseLogId = logMorningDoseData.data.doseLog.id;

    assert(
      logMorningDoseRes.status === 201 &&
        logMorningDoseData.data.doseLog.status === DOSE_STATUS.TAKEN &&
        logMorningDoseData.data.stockRemaining === 59 &&
        logMorningDoseData.data.doseLog.administeredBy.name === "Priya Family Member",
      "15. FAMILY_MEMBER records morning dose as TAKEN: caregiver attributed and stock decremented to 59 (201 Created)",
      `Got status: ${logMorningDoseRes.status}, stockRemaining: ${logMorningDoseData.data?.stockRemaining}`
    );

    // 16. Duplicate dose protection for identical slot on same date
    const dupDoseRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/${metforminId}/doses`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          slot: "morning",
          scheduledDate: todayStr,
          status: DOSE_STATUS.TAKEN,
        }),
      }
    );
    const dupDoseData = await dupDoseRes.json();
    assert(
      dupDoseRes.status === 409 && dupDoseData.code === "DOSE_ALREADY_LOGGED",
      "16. Duplicate dose logging for the same date and slot is rejected with 409 DOSE_ALREADY_LOGGED",
      `Got ${dupDoseRes.status}`
    );

    // 17. Record afternoon dose as SKIPPED with skipReason
    const skipAfternoonRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/${metforminId}/doses`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          slot: "afternoon",
          scheduledDate: todayStr,
          status: DOSE_STATUS.SKIPPED,
          skipReason: "Papa had late lunch; doctor advised skipping to avoid hypoglycemia.",
        }),
      }
    );
    const skipAfternoonData = await skipAfternoonRes.json();
    assert(
      skipAfternoonRes.status === 201 &&
        skipAfternoonData.data.doseLog.status === DOSE_STATUS.SKIPPED &&
        skipAfternoonData.data.doseLog.stockDeducted === false,
      "17. Dose recorded as SKIPPED does not decrement stock (201 Created)",
      `Got ${skipAfternoonRes.status}`
    );

    // 18. Edit / update a dose log note
    const updateLogRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/doses/${doseLogId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${familyToken}`,
        },
        body: JSON.stringify({
          notes: "Logged with oats & warm milk. Papa felt energetic. Blood sugar normal.",
        }),
      }
    );
    const updateLogData = await updateLogRes.json();
    assert(
      updateLogRes.status === 200 &&
        updateLogData.data.doseLog.notes.includes("Blood sugar normal"),
      "18. PATCH /doses/:doseLogId updates dose log notes successfully (200 OK)",
      `Got ${updateLogRes.status}`
    );

    // 19. Refill medication stock
    const refillRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/${metforminId}/refill`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          quantity: 60,
          pharmacy: "Apollo Pharmacy 24/7",
        }),
      }
    );
    const refillData = await refillRes.json();
    assert(
      refillRes.status === 200 && refillData.data.stock.currentQuantity === 119,
      "19. Stock refill increments inventory accurately (59 + 60 = 119 tablets) (200 OK)",
      `Got currentQuantity: ${refillData.data?.stock?.currentQuantity}`
    );

    // ================================================================
    // 5. DAILY SCHEDULE & ADHERENCE ANALYTICS TESTS
    // ================================================================
    console.log("\n--- Section 5: Daily Schedule & Adherence Analytics ---");

    // 20. GET /schedule/today
    const schedRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/schedule/today?date=${todayStr}`,
      {
        headers: { Authorization: `Bearer ${familyToken}` },
      }
    );
    const schedData = await schedRes.json();

    assert(
      schedRes.status === 200 &&
        schedData.data.summary.totalScheduledCount >= 3 &&
        schedData.data.timeline.morning.items.length >= 2 &&
        schedData.data.timeline.afternoon.items.length >= 1,
      "20. GET /schedule/today computes integrated time-slot timeline with morning/afternoon dose statuses (200 OK)",
      `Got summary: ${JSON.stringify(schedData.data?.summary)}`
    );

    // 21. GET /adherence/stats
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
        typeof adhData.data.averageAdherenceRate === "number",
      "21. GET /adherence/stats calculates 7-day adherence history and streak metrics (200 OK)",
      `Got history days: ${adhData.data?.history?.length}`
    );

    // 22. GET /doses/history (circle-wide)
    const historyRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/doses/history`,
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );
    const historyData = await historyRes.json();
    assert(
      historyRes.status === 200 && historyData.data.doses.length >= 2,
      "22. GET /doses/history lists all circle dose events with populated metadata (200 OK)",
      `Got count: ${historyData.data?.doses?.length}`
    );

    // ================================================================
    // 6. DISCONTINUE / DELETE & NOT FOUND CASES
    // ================================================================
    console.log("\n--- Section 6: Discontinue Medication & Not Found Handlers ---");

    // 23. Discontinue medication
    const deleteRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/${amlodipineId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );
    const deleteData = await deleteRes.json();
    assert(
      deleteRes.status === 200 &&
        deleteData.data.medication.status === MEDICATION_STATUS.DISCONTINUED,
      "23. DELETE /medications/:id marks medication status as DISCONTINUED (200 OK)",
      `Got ${deleteRes.status}`
    );

    // 24. Non-existent medication lookup (404)
    const fakeId = new mongoose.Types.ObjectId().toString();
    const notFoundRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/${fakeId}`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const notFoundData = await notFoundRes.json();
    assert(
      notFoundRes.status === 404 && notFoundData.code === "MEDICATION_NOT_FOUND",
      "24. Accessing non-existent medication ID returns 404 MEDICATION_NOT_FOUND",
      `Got ${notFoundRes.status}`
    );

    // 25. Invalid MongoDB ID param format (400)
    const invalidIdRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/medications/invalid-id-format-123`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const invalidIdData = await invalidIdRes.json();
    assert(
      invalidIdRes.status === 400 &&
        invalidIdData.success === false &&
        Array.isArray(invalidIdData.errors),
      "25. Invalid medication ID format is rejected with 400 validation error",
      `Got ${invalidIdRes.status}`
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

runMedicationTests();
