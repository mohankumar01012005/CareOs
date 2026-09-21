const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = require("./server");
const User = require("./src/models/User");
const CareRecipient = require("./src/models/CareRecipient");
const CareCircle = require("./src/models/CareCircle");
const CareCircleMember = require("./src/models/CareCircleMember");
const VitalReading = require("./src/models/VitalReading");
const SymptomLog = require("./src/models/SymptomLog");
const ClinicalBaseline = require("./src/models/ClinicalBaseline");
const Medication = require("./src/models/Medication");
const DoseLog = require("./src/models/DoseLog");
const CareNote = require("./src/models/CareNote");
const {
  CAREOS_ROLES,
  MEMBERSHIP_STATUS,
  VITAL_TYPES,
  VITAL_ALERT_SEVERITIES,
  SYMPTOM_CATEGORIES,
  SYMPTOM_SEVERITIES,
  MEDICATION_STATUS,
  DOSE_STATUS,
  NOTE_CATEGORIES,
} = require("./src/constants/roles");

let serverInstance;
const TEST_PORT = 5103;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runHealthTrackerTests() {
  console.log("==================================================================");
  console.log("CAREOS HEALTH & SYMPTOM TRACKER TEST SUITE (IMP 09)");
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
  console.log("Connected to MongoDB for Health Tracker testing.");

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`Health Tracker Test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  const timestamp = Date.now();
  const mainEmail = `health.main.${timestamp}@example.com`;
  const subEmail = `health.sub.${timestamp}@example.com`;
  const docEmail = `health.doc.${timestamp}@example.com`;
  const famEmail = `health.fam.${timestamp}@example.com`;
  const nurseEmail = `health.nurse.${timestamp}@example.com`;
  const receiverEmail = `health.receiver.${timestamp}@example.com`;
  const outsiderEmail = `health.outsider.${timestamp}@example.com`;
  const testPassword = "Password123!Health";

  let mainToken = "";
  let subToken = "";
  let docToken = "";
  let famToken = "";
  let nurseToken = "";
  let receiverToken = "";
  let outsiderToken = "";

  let mainId = "";
  let subId = "";
  let docId = "";
  let famId = "";
  let nurseId = "";
  let receiverId = "";
  let outsiderId = "";

  let circleId = "";
  let foreignCircleId = "";
  let recipientId = "";

  let vitalBpNormalId = "";
  let vitalSugarWarnId = "";
  let vitalSpo2CritId = "";
  let vitalTempId = "";
  let symptomPainId = "";
  let symptomFeverId = "";

  try {
    // ----------------------------------------------------------------
    // Setup Test Users & Care Circles
    // ----------------------------------------------------------------
    const createTestUser = async (name, email) => {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password: testPassword }),
      });
      const data = await res.json();
      return { token: data.data.tokens.accessToken, userId: data.data.user.id };
    };

    const mainUser = await createTestUser("Main Caretaker", mainEmail);
    mainToken = mainUser.token;
    mainId = mainUser.userId;

    const subUser = await createTestUser("Sub Caretaker", subEmail);
    subToken = subUser.token;
    subId = subUser.userId;

    const docUser = await createTestUser("Dr. Cardiologist", docEmail);
    docToken = docUser.token;
    docId = docUser.userId;

    const famUser = await createTestUser("Family Member", famEmail);
    famToken = famUser.token;
    famId = famUser.userId;

    const nurseUser = await createTestUser("Paid Attendant", nurseEmail);
    nurseToken = nurseUser.token;
    nurseId = nurseUser.userId;

    const receiverUser = await createTestUser("Care Receiver", receiverEmail);
    receiverToken = receiverUser.token;
    receiverId = receiverUser.userId;

    const outsiderUser = await createTestUser("Outsider User", outsiderEmail);
    outsiderToken = outsiderUser.token;
    outsiderId = outsiderUser.userId;

    // Create Primary Circle
    const circleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        name: `Health Circle ${timestamp}`,
        recipient: {
          fullName: "Elderly Patient A",
          dateOfBirth: "1948-04-12",
          gender: "female",
          bloodGroup: "O+",
          knownConditions: ["Hypertension", "Type 2 Diabetes"],
          allergies: ["Penicillin", "Sulfa"],
          emergencyContact: {
            name: "Main Caretaker",
            relationship: "Daughter",
            phone: "+919876543210",
          },
        },
      }),
    });
    const circleData = await circleRes.json();
    circleId = circleData.data.careCircle.id;
    recipientId = circleData.data.careRecipient.id;

    // Create Foreign Circle for isolation checks
    const foreignCircleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${outsiderToken}`,
      },
      body: JSON.stringify({
        name: `Foreign Circle ${timestamp}`,
        recipient: { fullName: "Foreign Recipient" },
      }),
    });
    const foreignCircleData = await foreignCircleRes.json();
    foreignCircleId = foreignCircleData.data.careCircle.id;



    // Add all roles to Primary Circle
    const addMember = async (userId, role) => {
      await CareCircleMember.create({
        careCircle: circleId,
        user: userId,
        role,
        membershipStatus: MEMBERSHIP_STATUS.ACTIVE,
      });
    };

    await addMember(subId, CAREOS_ROLES.SUB_CARETAKER);
    await addMember(docId, CAREOS_ROLES.PAID_DOCTOR);
    await addMember(famId, CAREOS_ROLES.FAMILY_MEMBER);
    await addMember(nurseId, CAREOS_ROLES.PAID_CARETAKER);
    await addMember(receiverId, CAREOS_ROLES.CARE_RECEIVER);

    // Setup dummy medication, dose log, and care note for Doctor's Brief testing
    const med = await Medication.create({
      careCircle: circleId,
      careRecipient: recipientId,
      name: "Metformin 500mg",
      dosage: "500mg",
      form: "tablet",
      frequency: "twice_daily",
      status: MEDICATION_STATUS.ACTIVE,
      currentStock: 30,
      createdBy: mainId,
    });

    const todayStr = new Date().toISOString().split("T")[0];
    await DoseLog.create({
      careCircle: circleId,
      careRecipient: recipientId,
      medication: med._id,
      scheduledDate: todayStr,
      slot: "morning",
      status: DOSE_STATUS.TAKEN,
      administeredBy: nurseId,
      administeredAt: new Date(),
    });


    await CareNote.create({
      careCircle: circleId,
      careRecipient: recipientId,
      author: nurseId,
      category: NOTE_CATEGORIES.HANDOVER,
      noteDate: todayStr,
      title: "Morning Shift Observation",
      content: "Patient slept well. Took light breakfast and morning meds on time.",
    });

    // ================================================================
    // SECTION 1: Authentication & Circle Boundary Isolation
    // ================================================================
    console.log("\n--- Section 1: Authentication & Authorization ---");

    const noAuthRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`);
    assert(
      noAuthRes.status === 401,
      "1. Unauthenticated request to vitals endpoint is rejected with 401 AUTH_TOKEN_MISSING"
    );

    const outsiderRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      headers: { Authorization: `Bearer ${outsiderToken}` },
    });
    assert(
      outsiderRes.status === 403,
      "2. Non-member user is rejected with 403 FORBIDDEN"
    );

    const crossCircleRes = await fetch(`${BASE_URL}/api/care-circles/${foreignCircleId}/health/vitals`, {
      headers: { Authorization: `Bearer ${famToken}` },
    });
    assert(
      crossCircleRes.status === 403,
      "3. Cross-circle access attempt using foreign circle ID is denied (403 FORBIDDEN)"
    );

    // ================================================================
    // SECTION 2: Validation Failures & Error Handling
    // ================================================================
    console.log("\n--- Section 2: Validation Failures ---");

    const val1 = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({}),
    });
    assert(
      val1.status === 400,
      "4. Vital creation missing vitalType is rejected with 400 validation error"
    );

    const val2 = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        vitalType: "INVALID_VITAL_TYPE",
        measurements: { value: 100 },
      }),
    });
    assert(
      val2.status === 400,
      "5. Vital creation with invalid vitalType is rejected with 400 validation error"
    );

    const val3 = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.BLOOD_PRESSURE,
        measurements: { systolic: 120 }, // missing diastolic
      }),
    });
    assert(
      val3.status === 400,
      "6. Blood pressure vital with missing diastolic is rejected with 400 validation error"
    );

    const val4 = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.BLOOD_SUGAR,
        measurements: { sugarLevel: 110, mealContext: "INVALID_MEAL_CONTEXT" },
      }),
    });
    assert(
      val4.status === 400,
      "7. Blood sugar vital with invalid mealContext is rejected with 400 validation error"
    );

    const val5 = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.TEMPERATURE,
        measurements: { temperature: 98.6, temperatureUnit: "KELVIN" },
      }),
    });
    assert(
      val5.status === 400,
      "8. Temperature vital with invalid temperatureUnit is rejected with 400 validation error"
    );

    const val6 = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.OXYGEN_SATURATION,
        measurements: { spO2: 150 }, // out of bounds (> 100)
      }),
    });
    assert(
      val6.status === 400,
      "9. SpO2 reading out of realistic bounds (> 100%) is rejected with 400 validation error"
    );

    const val7 = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/symptoms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${famToken}`,
      },
      body: JSON.stringify({}),
    });
    assert(
      val7.status === 400,
      "10. Symptom creation missing symptomCategory and symptomName is rejected with 400"
    );

    const val8 = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/symptoms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${famToken}`,
      },
      body: JSON.stringify({
        symptomCategory: SYMPTOM_CATEGORIES.PAIN,
        symptomName: "Severe Back Pain",
        severityScore: 15, // Out of 1-10 range
      }),
    });
    assert(
      val8.status === 400,
      "11. Symptom creation with severityScore > 10 is rejected with 400 validation error"
    );

    const val9 = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals/invalid-mongo-id`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    assert(
      val9.status === 400,
      "12. Invalid vitalId format in URL param is rejected with 400 validation error"
    );

    // ================================================================
    // SECTION 3: Vitals Logging across All 7 Vital Types & Multi-Role Logging
    // ================================================================
    console.log("\n--- Section 3: Vitals Logging across All 7 Types & All Roles ---");

    const bpRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.BLOOD_PRESSURE,
        measurements: { systolic: 120, diastolic: 80, pulse: 72 },
        notes: "Resting BP after morning tea",
        deviceSource: "omron_m3",
      }),
    });
    const bpData = await bpRes.json();
    vitalBpNormalId = bpData.vitalReading?.id;
    assert(
      bpRes.status === 201 &&
        bpData.vitalReading.isAbnormal === false &&
        bpData.vitalReading.alertSeverity === "NORMAL",
      "13. Main Caretaker logs normal BLOOD_PRESSURE (120/80 mmHg) -> 201 Created, isAbnormal: false"
    );

    const sugarRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nurseToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.BLOOD_SUGAR,
        measurements: { sugarLevel: 95, mealContext: "FASTING" },
        notes: "Fasting blood sugar before breakfast",
      }),
    });
    const sugarData = await sugarRes.json();
    assert(
      sugarRes.status === 201 && sugarData.vitalReading.isAbnormal === false,
      "14. Paid Caretaker logs normal FASTING BLOOD_SUGAR (95 mg/dL) -> 201 Created"
    );

    const hrRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${docToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.HEART_RATE,
        measurements: { bpm: 75 },
        notes: "Sinus rhythm verified during clinic consultation",
      }),
    });
    const hrData = await hrRes.json();
    assert(
      hrRes.status === 201 && hrData.vitalReading.isAbnormal === false,
      "15. Paid Doctor logs normal HEART_RATE (75 bpm) -> 201 Created"
    );

    const spo2Res = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${famToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.OXYGEN_SATURATION,
        measurements: { spO2: 98 },
        notes: "Pulse oximeter reading on room air",
      }),
    });
    const spo2Data = await spo2Res.json();
    assert(
      spo2Res.status === 201 && spo2Data.vitalReading.isAbnormal === false,
      "16. Family Member logs normal OXYGEN_SATURATION (98%) -> 201 Created"
    );

    const tempRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${receiverToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.TEMPERATURE,
        measurements: { temperature: 98.6, temperatureUnit: "F" },
        notes: "Self-measured oral thermometer",
      }),
    });
    const tempData = await tempRes.json();
    vitalTempId = tempData.vitalReading?.id;
    assert(
      tempRes.status === 201 && tempData.vitalReading.isAbnormal === false,
      "17. Care Receiver logs normal TEMPERATURE (98.6 °F) -> 201 Created"
    );

    const weightRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${subToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.WEIGHT,
        measurements: { weight: 68.5, weightUnit: "kg" },
        notes: "Weekly morning weight check",
      }),
    });
    const weightData = await weightRes.json();
    assert(
      weightRes.status === 201 && weightData.vitalReading.isAbnormal === false,
      "18. Sub Caretaker logs normal WEIGHT (68.5 kg) -> 201 Created"
    );

    const respRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nurseToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.RESPIRATORY_RATE,
        measurements: { respiratoryRate: 16 },
      }),
    });
    const respData = await respRes.json();
    assert(
      respRes.status === 201 && respData.vitalReading.isAbnormal === false,
      "19. Paid Caretaker logs normal RESPIRATORY_RATE (16 breaths/min) -> 201 Created"
    );

    // ================================================================
    // SECTION 4: Automated Baseline Deviation Detection
    // ================================================================
    console.log("\n--- Section 4: Automated Baseline Deviation Detection ---");

    const highBpRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nurseToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.BLOOD_PRESSURE,
        measurements: { systolic: 155, diastolic: 85 },
      }),
    });
    const highBpData = await highBpRes.json();
    assert(
      highBpRes.status === 201 &&
        highBpData.vitalReading.isAbnormal === true &&
        highBpData.vitalReading.alertSeverity === VITAL_ALERT_SEVERITIES.WARNING &&
        highBpData.vitalReading.abnormalReasons.includes("HIGH_SYSTOLIC_BP"),
      "20. Warning: Elevated Systolic BP (155 mmHg) is detected as WARNING alert with HIGH_SYSTOLIC_BP reason"
    );

    const critBpRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.BLOOD_PRESSURE,
        measurements: { systolic: 195, diastolic: 115 },
        notes: "Emergency: severe headache and blurred vision",
      }),
    });
    const critBpData = await critBpRes.json();
    assert(
      critBpRes.status === 201 &&
        critBpData.vitalReading.isAbnormal === true &&
        critBpData.vitalReading.alertSeverity === VITAL_ALERT_SEVERITIES.CRITICAL &&
        critBpData.vitalReading.abnormalReasons.includes("CRITICAL_HIGH_SYSTOLIC_BP"),
      "21. Critical: Stage 3 Hypertensive Crisis BP (195/115 mmHg) is detected as CRITICAL alert"
    );

    const highSugarRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nurseToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.BLOOD_SUGAR,
        measurements: { sugarLevel: 165, mealContext: "FASTING" },
      }),
    });
    const highSugarData = await highSugarRes.json();
    vitalSugarWarnId = highSugarData.vitalReading?.id;
    assert(
      highSugarRes.status === 201 &&
        highSugarData.vitalReading.isAbnormal === true &&
        highSugarData.vitalReading.alertSeverity === VITAL_ALERT_SEVERITIES.WARNING &&
        highSugarData.vitalReading.abnormalReasons.includes("HIGH_FASTING_SUGAR"),
      "22. Warning: High Fasting Blood Sugar (165 mg/dL) is detected as WARNING alert with HIGH_FASTING_SUGAR"
    );

    const hypoSugarRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${famToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.BLOOD_SUGAR,
        measurements: { sugarLevel: 48, mealContext: "RANDOM" },
        notes: "Patient feeling dizzy and cold sweat",
      }),
    });
    const hypoSugarData = await hypoSugarRes.json();
    assert(
      hypoSugarRes.status === 201 &&
        hypoSugarData.vitalReading.alertSeverity === VITAL_ALERT_SEVERITIES.CRITICAL &&
        hypoSugarData.vitalReading.abnormalReasons.includes("CRITICAL_HYPOGLYCEMIA"),
      "23. Critical: Severe Hypoglycemia (48 mg/dL) is detected as CRITICAL alert"
    );

    const lowSpo2Res = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nurseToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.OXYGEN_SATURATION,
        measurements: { spO2: 92 },
      }),
    });
    const lowSpo2Data = await lowSpo2Res.json();
    assert(
      lowSpo2Res.status === 201 &&
        lowSpo2Data.vitalReading.alertSeverity === VITAL_ALERT_SEVERITIES.WARNING &&
        lowSpo2Data.vitalReading.abnormalReasons.includes("LOW_SPO2"),
      "24. Warning: Low SpO2 (92%) is detected as WARNING alert"
    );

    const critSpo2Res = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${docToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.OXYGEN_SATURATION,
        measurements: { spO2: 87 },
      }),
    });
    const critSpo2Data = await critSpo2Res.json();
    vitalSpo2CritId = critSpo2Data.vitalReading?.id;
    assert(
      critSpo2Res.status === 201 &&
        critSpo2Data.vitalReading.alertSeverity === VITAL_ALERT_SEVERITIES.CRITICAL &&
        critSpo2Data.vitalReading.abnormalReasons.includes("CRITICAL_LOW_SPO2"),
      "25. Critical: Acute Hypoxia SpO2 (87%) is detected as CRITICAL alert"
    );

    const feverRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nurseToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.TEMPERATURE,
        measurements: { temperature: 103.2, temperatureUnit: "F" },
      }),
    });
    const feverData = await feverRes.json();
    assert(
      feverRes.status === 201 &&
        feverData.vitalReading.alertSeverity === VITAL_ALERT_SEVERITIES.CRITICAL &&
        feverData.vitalReading.abnormalReasons.includes("CRITICAL_HIGH_FEVER"),
      "26. Critical: High Fever (103.2 °F) is detected as CRITICAL alert"
    );

    const alertsFeedRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals/alerts?severity=CRITICAL`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const alertsFeedData = await alertsFeedRes.json();
    assert(
      alertsFeedRes.status === 200 &&
        alertsFeedData.alerts.every((a) => a.alertSeverity === "CRITICAL") &&
        alertsFeedData.count >= 4,
      "27. GET /vitals/alerts returns only abnormal readings matching severity filter (200 OK)"
    );

    // ================================================================
    // SECTION 5: Clinical Baseline Configuration & RBAC Governance
    // ================================================================
    console.log("\n--- Section 5: Clinical Baseline Configuration & RBAC ---");

    const getBaseRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/baseline`, {
      headers: { Authorization: `Bearer ${famToken}` },
    });
    const getBaseData = await getBaseRes.json();
    assert(
      getBaseRes.status === 200 &&
        getBaseData.isDefault === true &&
        getBaseData.baseline.bpSystolicMax === 140,
      "28. Default baseline retrieval returns standard reference thresholds (isDefault: true)"
    );

    const famBaseRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/baseline`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${famToken}`,
      },
      body: JSON.stringify({ bpSystolicMax: 130 }),
    });
    assert(
      famBaseRes.status === 403,
      "29. Family Member attempt to configure custom baseline is rejected (403 FORBIDDEN)"
    );

    const nurseBaseRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/baseline`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nurseToken}`,
      },
      body: JSON.stringify({ bpSystolicMax: 130 }),
    });
    assert(
      nurseBaseRes.status === 403,
      "30. Paid Caretaker attempt to configure custom baseline is rejected (403 FORBIDDEN)"
    );

    const recvBaseRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/baseline`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${receiverToken}`,
      },
      body: JSON.stringify({ bpSystolicMax: 130 }),
    });
    assert(
      recvBaseRes.status === 403,
      "31. Care Receiver attempt to configure custom baseline is rejected (403 FORBIDDEN)"
    );

    const docBaseRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/baseline`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${docToken}`,
      },
      body: JSON.stringify({
        bpSystolicMax: 130, // Tighter BP target configured by cardiologist
        notes: "Patient has stage 1 CKD, keep systolic strictly under 130",
      }),
    });
    const docBaseData = await docBaseRes.json();
    assert(
      docBaseRes.status === 200 &&
        docBaseData.baseline.bpSystolicMax === 130 &&
        docBaseData.baseline.notes.includes("CKD"),
      "32. Paid Doctor successfully configures custom clinical baseline (200 OK)"
    );

    const mainBaseRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/baseline`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        spO2Min: 95, // Updated target
      }),
    });
    const mainBaseData = await mainBaseRes.json();
    assert(
      mainBaseRes.status === 200 &&
        mainBaseData.baseline.spO2Min === 95 &&
        mainBaseData.baseline.bpSystolicMax === 130,
      "33. Main Caretaker successfully updates custom clinical baseline properties (200 OK)"
    );

    // Custom Baseline Deviation check: 135 mmHg is now abnormal under new bpSystolicMax of 130
    const customBpRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        vitalType: VITAL_TYPES.BLOOD_PRESSURE,
        measurements: { systolic: 135, diastolic: 80 },
      }),
    });
    const customBpData = await customBpRes.json();
    assert(
      customBpRes.status === 201 &&
        customBpData.vitalReading.isAbnormal === true &&
        customBpData.vitalReading.abnormalReasons.includes("HIGH_SYSTOLIC_BP"),
      "34. Custom Baseline Deviation Check: BP reading of 135 mmHg is flagged as abnormal against new 130 baseline"
    );

    // ================================================================
    // SECTION 6: Symptom Logging & Lifecycle Management
    // ================================================================
    console.log("\n--- Section 6: Symptom Logging & Management ---");

    const sym1Res = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/symptoms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${receiverToken}`,
      },
      body: JSON.stringify({
        symptomCategory: SYMPTOM_CATEGORIES.PAIN,
        symptomName: "Severe Left Knee Pain",
        severity: SYMPTOM_SEVERITIES.SEVERE,
        severityScore: 8,
        bodyLocation: "Left Knee Joint",
        triggers: ["Walking up stairs"],
        notes: "Started after morning stroll in garden",
      }),
    });
    const sym1Data = await sym1Res.json();
    symptomPainId = sym1Data.symptomLog?.id;
    assert(
      sym1Res.status === 201 &&
        sym1Data.symptomLog.severityScore === 8 &&
        sym1Data.symptomLog.isOngoing === true,
      "35. Care Receiver logs active symptom (PAIN, Severe Left Knee Pain, score: 8) -> 201 Created"
    );

    const sym2Res = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/symptoms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nurseToken}`,
      },
      body: JSON.stringify({
        symptomCategory: SYMPTOM_CATEGORIES.FEVER,
        symptomName: "Shivering and Mild Chills",
        severity: SYMPTOM_SEVERITIES.MILD,
        severityScore: 3,
      }),
    });
    const sym2Data = await sym2Res.json();
    symptomFeverId = sym2Data.symptomLog?.id;
    assert(
      sym2Res.status === 201 && sym2Data.symptomLog.severity === "MILD",
      "36. Paid Caretaker logs active symptom (FEVER, Mild Chills, score: 3) -> 201 Created"
    );

    const listSymRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/symptoms?isOngoing=true`, {
      headers: { Authorization: `Bearer ${famToken}` },
    });
    const listSymData = await listSymRes.json();
    assert(
      listSymRes.status === 200 && listSymData.count >= 2,
      "37. GET /symptoms lists ongoing symptoms with filtering (200 OK)"
    );

    const getSingleSymRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/symptoms/${symptomPainId}`, {
      headers: { Authorization: `Bearer ${docToken}` },
    });
    const getSingleSymData = await getSingleSymRes.json();
    assert(
      getSingleSymRes.status === 200 &&
        getSingleSymData.symptomLog.symptomName.includes("Knee Pain"),
      "38. GET /symptoms/:symptomId returns specific symptom details (200 OK)"
    );

    const updateSymRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/symptoms/${symptomPainId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${receiverToken}`,
      },
      body: JSON.stringify({
        isOngoing: false,
        notes: "Pain subsided after applying pain relief gel and rest",
      }),
    });
    const updateSymData = await updateSymRes.json();
    assert(
      updateSymRes.status === 200 &&
        updateSymData.symptomLog.isOngoing === false,
      "39. Symptom author updates symptom status to resolved (isOngoing: false) -> 200 OK"
    );

    const unauthSymUpdate = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/symptoms/${symptomPainId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${famToken}`, // Family member did not author symptomPain
      },
      body: JSON.stringify({ notes: "Unauthorized edit attempt" }),
    });
    assert(
      unauthSymUpdate.status === 403,
      "40. Non-author, non-caretaker member is rejected from modifying another's symptom log (403 FORBIDDEN)"
    );

    const delSymRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/symptoms/${symptomFeverId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${mainToken}` }, // Main caretaker allowed
    });
    assert(
      delSymRes.status === 200,
      "41. Main Caretaker successfully deletes a symptom log (200 OK)"
    );

    // ================================================================
    // SECTION 7: Time-Series Trends & Telemetry Aggregation
    // ================================================================
    console.log("\n--- Section 7: Time-Series Trends & Telemetry ---");

    const bpTrendsRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals/trends?vitalType=BLOOD_PRESSURE&days=30`, {
      headers: { Authorization: `Bearer ${docToken}` },
    });
    const bpTrendsData = await bpTrendsRes.json();
    assert(
      bpTrendsRes.status === 200 &&
        bpTrendsData.summary.totalReadings >= 3 &&
        typeof bpTrendsData.summary.systolic.avg === "number" &&
        bpTrendsData.dataPoints.length >= 3,
      "42. GET /vitals/trends calculates min/max/avg for Blood Pressure telemetry (200 OK)"
    );

    const sugarTrendsRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals/trends?vitalType=BLOOD_SUGAR&days=30`, {
      headers: { Authorization: `Bearer ${docToken}` },
    });
    const sugarTrendsData = await sugarTrendsRes.json();
    assert(
      sugarTrendsRes.status === 200 &&
        typeof sugarTrendsData.summary.sugarLevel.avg === "number" &&
        sugarTrendsData.summary.fasting !== undefined,
      "43. GET /vitals/trends returns Blood Sugar analytics with meal context breakdown (200 OK)"
    );

    const trendsMissingType = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals/trends`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    assert(
      trendsMissingType.status === 400,
      "44. GET /vitals/trends missing vitalType parameter is rejected with 400 VITAL_TYPE_REQUIRED"
    );

    // ================================================================
    // SECTION 8: Doctor's Brief & Consolidated Clinical Snapshot
    // ================================================================
    console.log("\n--- Section 8: Doctor's Brief & Clinical Snapshot ---");

    const briefRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/doctors-brief?days=30`, {
      headers: { Authorization: `Bearer ${docToken}` },
    });
    const briefData = await briefRes.json();
    const brief = briefData.doctorsBrief;

    assert(
      briefRes.status === 200 &&
        brief &&
        brief.careRecipient.fullName === "Elderly Patient A" &&
        brief.careRecipient.knownConditions.includes("Hypertension") &&
        brief.vitalSummary?.BLOOD_PRESSURE?.count >= 3 &&
        brief.abnormalAlerts.length >= 1 &&
        brief.medications.activeCount >= 1 &&
        brief.medications.adherenceRate === "100%" &&
        brief.recentHandoverObservations.length >= 1,
      "45. GET /health/doctors-brief generates comprehensive 30-day clinical consultation dossier with vitals, alerts, adherence, and notes (200 OK)",
      JSON.stringify(briefData)
    );


    // ================================================================
    // SECTION 9: Vitals CRUD & 404 Handlers
    // ================================================================
    console.log("\n--- Section 9: Vitals CRUD & 404 Handlers ---");

    const unauthVitalDelete = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals/${vitalTempId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${nurseToken}` }, // Nurse did not author vitalTemp (Receiver authored it)
    });
    assert(
      unauthVitalDelete.status === 403,
      "46. Non-author, non-caretaker member is rejected from deleting another's vital reading (403 FORBIDDEN)"
    );

    const authorVitalDelete = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals/${vitalTempId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${receiverToken}` }, // Receiver authored it
    });
    assert(
      authorVitalDelete.status === 200,
      "47. Vital reading author successfully deletes own vital reading (200 OK)"
    );

    const nonExistentVital = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/vitals/650000000000000000000001`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    assert(
      nonExistentVital.status === 404,
      "48. Accessing non-existent vital reading ID returns 404 VITAL_NOT_FOUND"
    );

    const nonExistentSymptom = await fetch(`${BASE_URL}/api/care-circles/${circleId}/health/symptoms/650000000000000000000001`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    assert(
      nonExistentSymptom.status === 404,
      "49. Accessing non-existent symptom log ID returns 404 SYMPTOM_NOT_FOUND"
    );

  } catch (error) {
    console.error("Test execution encountered an error:", error);
    failed++;
  } finally {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
    await mongoose.disconnect();
  }

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runHealthTrackerTests();
