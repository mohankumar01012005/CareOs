const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = require("./server");
const User = require("./src/models/User");
const CareRecipient = require("./src/models/CareRecipient");
const CareCircle = require("./src/models/CareCircle");
const CareCircleMember = require("./src/models/CareCircleMember");
const CareNote = require("./src/models/CareNote");
const {
  CAREOS_ROLES,
  MEMBERSHIP_STATUS,
  NOTE_CATEGORIES,
  NOTE_SHIFTS,
  NOTE_URGENCY,
} = require("./src/constants/roles");

let serverInstance;
const TEST_PORT = 5101;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runCareNoteTests() {
  console.log("==================================================================");
  console.log("CAREOS CARE NOTES & SHIFT HANDOVER TEST SUITE (IMP 07)");
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
  console.log("Connected to MongoDB for Care Note testing.");

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`Care Note Test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  const timestamp = Date.now();
  const mainCaretakerEmail = `note.main.${timestamp}@example.com`;
  const subCaretakerEmail = `note.sub.${timestamp}@example.com`;
  const doctorEmail = `note.doctor.${timestamp}@example.com`;
  const familyMemberEmail = `note.family.${timestamp}@example.com`;
  const paidCaregiverEmail = `note.caregiver.${timestamp}@example.com`;
  const outsiderEmail = `note.outsider.${timestamp}@example.com`;
  const testPassword = "Password123!Note";

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

  let note1Id = "";
  let note2Id = "";
  let note3Id = "";
  let note4Id = "";

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
        name: "Dada's Healing Circle",
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
      `${BASE_URL}/api/care-circles/${circleId}/notes`
    );
    const unauthData = await unauthRes.json();
    assert(
      unauthRes.status === 401 && unauthData.code === "AUTH_TOKEN_MISSING",
      "1. Unauthenticated request to notes endpoint is rejected with 401 AUTH_TOKEN_MISSING",
      `Got ${unauthRes.status}`
    );

    // 2. Non-member access
    const nonMemberRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes`,
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
      `${BASE_URL}/api/care-circles/${outsideCircleId}/notes`,
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

    // 4. Missing content
    const missingContentRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Empty note",
        }),
      }
    );
    const missingContentData = await missingContentRes.json();
    assert(
      missingContentRes.status === 400 &&
        missingContentData.success === false &&
        Array.isArray(missingContentData.errors),
      "4. Note creation missing content is rejected with 400 validation error",
      `Got ${missingContentRes.status}`
    );

    // 5. Invalid date format
    const invalidDateRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          content: "Valid content string",
          noteDate: "15/09/2026", // Invalid format (should be YYYY-MM-DD)
        }),
      }
    );
    const invalidDateData = await invalidDateRes.json();
    assert(
      invalidDateRes.status === 400 &&
        invalidDateData.success === false &&
        Array.isArray(invalidDateData.errors),
      "5. Note creation with invalid noteDate format is rejected with 400 validation error",
      `Got ${invalidDateRes.status}`
    );

    // 6. Invalid category enum
    const invalidCatRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          content: "Valid content string",
          category: "INVALID_CATEGORY_NAME",
        }),
      }
    );
    const invalidCatData = await invalidCatRes.json();
    assert(
      invalidCatRes.status === 400 &&
        invalidCatData.success === false &&
        Array.isArray(invalidCatData.errors),
      "6. Note creation with invalid category is rejected with 400 validation error",
      `Got ${invalidCatRes.status}`
    );

    // 7. Invalid shift enum
    const invalidShiftRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          content: "Valid content string",
          shift: "midnight_graveyard",
        }),
      }
    );
    const invalidShiftData = await invalidShiftRes.json();
    assert(
      invalidShiftRes.status === 400 &&
        invalidShiftData.success === false &&
        Array.isArray(invalidShiftData.errors),
      "7. Note creation with invalid shift is rejected with 400 validation error",
      `Got ${invalidShiftRes.status}`
    );

    // 8. Invalid urgency enum
    const invalidUrgRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          content: "Valid content string",
          urgency: "SUPER_EMERGENCY",
        }),
      }
    );
    const invalidUrgData = await invalidUrgRes.json();
    assert(
      invalidUrgRes.status === 400 &&
        invalidUrgData.success === false &&
        Array.isArray(invalidUrgData.errors),
      "8. Note creation with invalid urgency is rejected with 400 validation error",
      `Got ${invalidUrgRes.status}`
    );

    // 9. Invalid vitals range (Systolic BP > 300)
    const invalidVitalsRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          content: "Vitals log",
          vitalsSnapshot: {
            bpSystolic: 450, // Out of range
          },
        }),
      }
    );
    const invalidVitalsData = await invalidVitalsRes.json();
    assert(
      invalidVitalsRes.status === 400 &&
        invalidVitalsData.success === false &&
        Array.isArray(invalidVitalsData.errors),
      "9. Note creation with out-of-range vitals is rejected with 400 validation error",
      `Got ${invalidVitalsRes.status}`
    );

    // 10. Invalid diet/mood enum
    const invalidDietRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          content: "Diet observation",
          dietMood: {
            mood: "furious", // Not in enum
          },
        }),
      }
    );
    const invalidDietData = await invalidDietRes.json();
    assert(
      invalidDietRes.status === 400 &&
        invalidDietData.success === false &&
        Array.isArray(invalidDietData.errors),
      "10. Note creation with invalid mood enum is rejected with 400 validation error",
      `Got ${invalidDietRes.status}`
    );

    // 11. Invalid noteId format in URL param
    const invalidIdRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes/bad-note-id-123`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const invalidIdData = await invalidIdRes.json();
    assert(
      invalidIdRes.status === 400 &&
        invalidIdData.success === false &&
        Array.isArray(invalidIdData.errors),
      "11. Invalid noteId format in URL is rejected with 400 validation error",
      `Got ${invalidIdRes.status}`
    );

    // ================================================================
    // 3. CARE NOTE CREATION TESTS
    // ================================================================
    console.log("\n--- Section 3: Care Note Creation ---");

    // 12. Paid Caregiver creates morning shift handover note with vitals & diet/mood
    const createNote1Res = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${caregiverToken}`,
        },
        body: JSON.stringify({
          title: "Morning Shift Handover & Vitals Log",
          content: "Dada had oats and papaya cheerfully. Morning Metformin given on time. Walked 15 mins in balcony.",
          category: "HANDOVER",
          shift: "morning",
          noteDate: todayStr,
          urgency: "NORMAL",
          vitalsSnapshot: {
            bpSystolic: 124,
            bpDiastolic: 80,
            heartRate: 72,
            bloodSugar: 135,
            temperature: 98.4,
            spO2: 98,
          },
          dietMood: {
            appetite: "good",
            mood: "happy",
            bowelMovement: "normal",
          },
        }),
      }
    );
    const createNote1Data = await createNote1Res.json();
    note1Id = createNote1Data.data.note.id;

    assert(
      createNote1Res.status === 201 &&
        createNote1Data.data.note.category === "HANDOVER" &&
        createNote1Data.data.note.shift === "morning" &&
        createNote1Data.data.note.vitalsSnapshot.bpSystolic === 124 &&
        createNote1Data.data.note.dietMood.mood === "happy" &&
        (createNote1Data.data.note.author.id || createNote1Data.data.note.author._id).toString() === caregiverId,
      "12. Paid Caregiver creates structured morning shift handover note with vitals snapshot (201 Created)",
      `Got ${createNote1Res.status}`
    );

    // 13. Family Member creates free-text observation note
    const createNote2Res = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${familyToken}`,
        },
        body: JSON.stringify({
          title: "Afternoon Family Visit Observation",
          content: "Spent 1 hour with Dada doing Sudoku. He seemed calm and remembered old family stories vividly.",
          category: "GENERAL",
          shift: "afternoon",
          noteDate: todayStr,
          urgency: "NORMAL",
          dietMood: {
            mood: "calm",
          },
        }),
      }
    );
    const createNote2Data = await createNote2Res.json();
    note2Id = createNote2Data.data.note.id;

    assert(
      createNote2Res.status === 201 &&
        createNote2Data.data.note.category === "GENERAL" &&
        (createNote2Data.data.note.author.id || createNote2Data.data.note.author._id).toString() === familyId,
      "13. Family Member creates afternoon observation note (201 Created)",
      `Got ${createNote2Res.status}`
    );

    // 14. Doctor creates clinical note with URGENT escalation
    const createNote3Res = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({
          title: "Cardiology Review & Medication Adjustment",
          content: "ECG shows stable rhythm. If evening BP exceeds 140/90, administer SOS Amlodipine 2.5mg and notify clinic immediately.",
          category: "DOCTOR_VISIT",
          shift: "none",
          noteDate: todayStr,
          urgency: "URGENT",
          vitalsSnapshot: {
            bpSystolic: 138,
            bpDiastolic: 86,
            heartRate: 74,
          },
        }),
      }
    );
    const createNote3Data = await createNote3Res.json();
    note3Id = createNote3Data.data.note.id;

    assert(
      createNote3Res.status === 201 &&
        createNote3Data.data.note.category === "DOCTOR_VISIT" &&
        createNote3Data.data.note.urgency === "URGENT" &&
        (createNote3Data.data.note.author.id || createNote3Data.data.note.author._id).toString() === doctorId,
      "14. Doctor creates urgent clinical guidance note with target vitals (201 Created)",
      `Got ${createNote3Res.status}`
    );

    // 15. Main Caretaker creates night routine note
    const createNote4Res = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Night Routine Handover",
          content: "Dada drank warm milk with turmeric. Night vitals normal. Slept peacefully at 9:30 PM.",
          category: "NIGHT_ROUTINE",
          shift: "night",
          noteDate: todayStr,
          urgency: "NORMAL",
          vitalsSnapshot: {
            bpSystolic: 120,
            bpDiastolic: 78,
            heartRate: 68,
          },
          dietMood: {
            appetite: "good",
            mood: "calm",
          },
        }),
      }
    );
    const createNote4Data = await createNote4Res.json();
    note4Id = createNote4Data.data.note.id;

    assert(
      createNote4Res.status === 201 &&
        createNote4Data.data.note.category === "NIGHT_ROUTINE" &&
        createNote4Data.data.note.shift === "night",
      "15. Main Caretaker creates night routine handover note (201 Created)",
      `Got ${createNote4Res.status}`
    );

    // ================================================================
    // 4. LISTING, FILTERING & SEARCH TESTS
    // ================================================================
    console.log("\n--- Section 4: Listing, Filtering & Search ---");

    // 16. List all circle notes
    const listNotesRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes`,
      {
        headers: { Authorization: `Bearer ${familyToken}` },
      }
    );
    const listNotesData = await listNotesRes.json();
    assert(
      listNotesRes.status === 200 && listNotesData.data.notes.length === 4,
      "16. Circle member lists all care notes with author populated (200 OK, count: 4)",
      `Got count: ${listNotesData.data?.notes?.length}`
    );

    // 17. Filter by category: category=HANDOVER
    const catFilterRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes?category=HANDOVER`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const catFilterData = await catFilterRes.json();
    assert(
      catFilterRes.status === 200 &&
        catFilterData.data.notes.length === 1 &&
        catFilterData.data.notes[0].id === note1Id,
      "17. Filter category=HANDOVER returns only handover notes (200 OK)",
      `Got count: ${catFilterData.data?.notes?.length}`
    );

    // 18. Filter by shift: shift=morning
    const shiftFilterRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes?shift=morning`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const shiftFilterData = await shiftFilterRes.json();
    assert(
      shiftFilterRes.status === 200 &&
        shiftFilterData.data.notes.length === 1 &&
        shiftFilterData.data.notes[0].id === note1Id,
      "18. Filter shift=morning returns only morning shift notes (200 OK)",
      `Got count: ${shiftFilterData.data?.notes?.length}`
    );

    // 19. Filter by urgency: urgency=URGENT
    const urgFilterRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes?urgency=URGENT`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const urgFilterData = await urgFilterRes.json();
    assert(
      urgFilterRes.status === 200 &&
        urgFilterData.data.notes.length === 1 &&
        urgFilterData.data.notes[0].id === note3Id,
      "19. Filter urgency=URGENT returns only urgent clinical note (200 OK)",
      `Got count: ${urgFilterData.data?.notes?.length}`
    );

    // 20. Filter by author: author=<caregiverId>
    const authorFilterRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes?author=${caregiverId}`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const authorFilterData = await authorFilterRes.json();
    assert(
      authorFilterRes.status === 200 &&
        authorFilterData.data.notes.length === 1 &&
        authorFilterData.data.notes[0].id === note1Id,
      "20. Filter author=<caregiverId> returns notes authored by Paid Caregiver (200 OK)",
      `Got count: ${authorFilterData.data?.notes?.length}`
    );

    // 21. Search query: search=Sudoku
    const searchRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes?search=Sudoku`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const searchData = await searchRes.json();
    assert(
      searchRes.status === 200 &&
        searchData.data.notes.length === 1 &&
        searchData.data.notes[0].id === note2Id,
      "21. Search query search=Sudoku matches observation note (200 OK)",
      `Got count: ${searchData.data?.notes?.length}`
    );

    // ================================================================
    // 5. SINGLE NOTE DOSSIER & UPDATES
    // ================================================================
    console.log("\n--- Section 5: Note Dossier & Updates ---");

    // 22. Get single note by ID
    const getNoteRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes/${note1Id}`,
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );
    const getNoteData = await getNoteRes.json();
    assert(
      getNoteRes.status === 200 &&
        getNoteData.data.note.id === note1Id &&
        getNoteData.data.note.author.name === "Anita Paid Attendant",
      "22. GET /notes/:noteId returns full note dossier with populated author (200 OK)",
      `Got ${getNoteRes.status}`
    );

    // 23. Unauthorized update: Family Member attempting to edit Caregiver's note
    const unauthUpdateRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes/${note1Id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${familyToken}`,
        },
        body: JSON.stringify({
          content: "Unauthorized modification attempt",
        }),
      }
    );
    const unauthUpdateData = await unauthUpdateRes.json();
    assert(
      unauthUpdateRes.status === 403 && unauthUpdateData.code === "FORBIDDEN",
      "23. Non-author, non-caretaker member is rejected from updating note (403 FORBIDDEN)",
      `Got ${unauthUpdateRes.status}`
    );

    // 24. Author (Paid Caregiver) updates their own note
    const authorUpdateRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes/${note1Id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${caregiverToken}`,
        },
        body: JSON.stringify({
          content: "Dada had oats and papaya cheerfully. Morning Metformin given. Walked 20 mins in garden (updated).",
        }),
      }
    );
    const authorUpdateData = await authorUpdateRes.json();
    assert(
      authorUpdateRes.status === 200 &&
        authorUpdateData.data.note.content.includes("20 mins in garden (updated)"),
      "24. Note author updates note content successfully (200 OK)",
      `Got ${authorUpdateRes.status}`
    );

    // 25. Main Caretaker updates another member's note
    const caretakerUpdateRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes/${note2Id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Afternoon Family Visit Observation (Reviewed by Vikram)",
        }),
      }
    );
    const caretakerUpdateData = await caretakerUpdateRes.json();
    assert(
      caretakerUpdateRes.status === 200 &&
        caretakerUpdateData.data.note.title.includes("Reviewed by Vikram"),
      "25. Main Caretaker can update circle notes (200 OK)",
      `Got ${caretakerUpdateRes.status}`
    );

    // ================================================================
    // 6. PINNING GOVERNANCE TESTS
    // ================================================================
    console.log("\n--- Section 6: Pinning Governance ---");

    // 26. Unauthorized pin attempt: Family member attempting to pin a note
    const unauthPinRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes/${note3Id}/pin`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${familyToken}`,
        },
        body: JSON.stringify({
          isPinned: true,
        }),
      }
    );
    const unauthPinData = await unauthPinRes.json();
    assert(
      unauthPinRes.status === 403 && unauthPinData.code === "FORBIDDEN",
      "26. FAMILY_MEMBER role is rejected from pinning notes (403 FORBIDDEN)",
      `Got ${unauthPinRes.status}`
    );

    // 27. Doctor pins urgent clinical note
    const docPinRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes/${note3Id}/pin`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({
          isPinned: true,
        }),
      }
    );
    const docPinData = await docPinRes.json();
    assert(
      docPinRes.status === 200 && docPinData.data.note.isPinned === true,
      "27. PAID_DOCTOR pins clinical note successfully (200 OK)",
      `Got ${docPinRes.status}`
    );

    // 28. Pinned notes appear first in feed
    const listPinnedRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const listPinnedData = await listPinnedRes.json();
    assert(
      listPinnedRes.status === 200 &&
        listPinnedData.data.notes[0].id === note3Id &&
        listPinnedData.data.notes[0].isPinned === true,
      "28. Feed sorting prioritizes pinned notes at the top of the list (200 OK)",
      `First note ID: ${listPinnedData.data?.notes[0]?.id}`
    );

    // 29. Main Caretaker unpins note
    const unpinRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes/${note3Id}/pin`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          isPinned: false,
        }),
      }
    );
    const unpinData = await unpinRes.json();
    assert(
      unpinRes.status === 200 && unpinData.data.note.isPinned === false,
      "29. MAIN_CARETAKER unpins note successfully (200 OK)",
      `Got ${unpinRes.status}`
    );

    // ================================================================
    // 7. HANDOVER ACKNOWLEDGMENT LOOP TESTS
    // ================================================================
    console.log("\n--- Section 7: Handover Acknowledgment Loop ---");

    // 30. Sub Caretaker acknowledges morning shift handover note
    const ackRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes/${note1Id}/acknowledge`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${subToken}`,
        },
      }
    );
    const ackData = await ackRes.json();
    assert(
      ackRes.status === 200 &&
        ackData.data.note.acknowledgedBy.length === 1 &&
        (ackData.data.note.acknowledgedBy[0].user.id || ackData.data.note.acknowledgedBy[0].user._id).toString() === subId,
      "30. Sub Caretaker acknowledges handover note: recorded in acknowledgedBy with timestamp (200 OK)",
      `Got count: ${ackData.data?.note?.acknowledgedBy?.length}`
    );

    // 31. Idempotent acknowledgment (Sub Caretaker calls acknowledge again)
    const dupAckRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes/${note1Id}/acknowledge`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${subToken}`,
        },
      }
    );
    const dupAckData = await dupAckRes.json();
    assert(
      dupAckRes.status === 200 &&
        dupAckData.data.note.acknowledgedBy.length === 1,
      "31. Acknowledging note is idempotent and prevents duplicate acknowledgment records (200 OK)",
      `Got count: ${dupAckData.data?.note?.acknowledgedBy?.length}`
    );

    // 32. Family Member also acknowledges handover note
    const famAckRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes/${note1Id}/acknowledge`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${familyToken}`,
        },
      }
    );
    const famAckData = await famAckRes.json();
    assert(
      famAckRes.status === 200 &&
        famAckData.data.note.acknowledgedBy.length === 2,
      "32. Multiple members can acknowledge the same shift handover note (200 OK, count: 2)",
      `Got count: ${famAckData.data?.note?.acknowledgedBy?.length}`
    );

    // ================================================================
    // 8. DASHBOARD SUMMARIES & TELEMETRY
    // ================================================================
    console.log("\n--- Section 8: Dashboard Summaries & Telemetry ---");

    // 33. GET /recent/handover
    const latestHandoverRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes/recent/handover`,
      {
        headers: { Authorization: `Bearer ${familyToken}` },
      }
    );
    const latestHandoverData = await latestHandoverRes.json();
    assert(
      latestHandoverRes.status === 200 &&
        latestHandoverData.data.note !== null &&
        latestHandoverData.data.note.id === note4Id,
      "33. GET /recent/handover returns the latest shift handover note for dashboard (200 OK)",
      `Got note ID: ${latestHandoverData.data?.note?.id}`
    );

    // 34. GET /summary/daily
    const dailySummaryRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes/summary/daily?date=${todayStr}`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const dailySummaryData = await dailySummaryRes.json();
    assert(
      dailySummaryRes.status === 200 &&
        dailySummaryData.data.summary.totalNotesCount === 4 &&
        dailySummaryData.data.summary.urgentNotesCount === 1 &&
        dailySummaryData.data.summary.handoverCount >= 2 &&
        dailySummaryData.data.summary.vitalsLoggedCount >= 2 &&
        dailySummaryData.data.summary.latestVitals !== null,
      "34. GET /summary/daily aggregates total notes, urgent alerts, handovers, and latest vitals (200 OK)",
      `Got summary: ${JSON.stringify(dailySummaryData.data?.summary)}`
    );

    // ================================================================
    // 9. DELETION & 404 HANDLERS
    // ================================================================
    console.log("\n--- Section 9: Deletion Authorization & 404 Handlers ---");

    // 35. Unauthorized deletion: Family Member attempting to delete Paid Caregiver's note
    const unauthDelRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes/${note1Id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${familyToken}` },
      }
    );
    const unauthDelData = await unauthDelRes.json();
    assert(
      unauthDelRes.status === 403 && unauthDelData.code === "FORBIDDEN",
      "35. Non-caretaker user cannot delete another member's note (403 FORBIDDEN)",
      `Got ${unauthDelRes.status}`
    );

    // 36. Note author (Family Member) deletes their own note (note2)
    const authorDelRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes/${note2Id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${familyToken}` },
      }
    );
    const authorDelData = await authorDelRes.json();
    assert(
      authorDelRes.status === 200 &&
        authorDelData.data.noteId === note2Id,
      "36. Note author successfully deletes their own note (200 OK)",
      `Got ${authorDelRes.status}`
    );

    // 37. Main Caretaker deletes another member's note (note4)
    const caretakerDelRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes/${note4Id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const caretakerDelData = await caretakerDelRes.json();
    assert(
      caretakerDelRes.status === 200 &&
        caretakerDelData.data.noteId === note4Id,
      "37. Main Caretaker can delete any care note in the circle (200 OK)",
      `Got ${caretakerDelRes.status}`
    );

    // 38. Accessing non-existent/deleted note returns 404
    const fakeNoteId = new mongoose.Types.ObjectId().toString();
    const notFoundRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/notes/${fakeNoteId}`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const notFoundData = await notFoundRes.json();
    assert(
      notFoundRes.status === 404 && notFoundData.code === "NOTE_NOT_FOUND",
      "38. Accessing non-existent note ID returns 404 NOTE_NOT_FOUND",
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

runCareNoteTests();
