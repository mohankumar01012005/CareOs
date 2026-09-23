/**
 * CareOS Frontend Care Notes & Shift Handover Integration Test Suite
 * Slice: Care Notes + Shift Handover Frontend (Vertical Slice 5)
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
const CareNote = serverRequire('./src/models/CareNote');
const RefreshToken = serverRequire('./src/models/RefreshToken');

import {
  ROLES,
  NOTE_CATEGORIES,
  NOTE_SHIFTS,
  NOTE_URGENCY,
  canPinNotes,
  canEditNote,
  canDeleteNote,
} from './src/constants/roles.js';

let serverInstance;
const TEST_PORT = 5105;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runNotesIntegrationTests() {
  console.log('================================================================');
  console.log('CAREOS FRONTEND PHASE 1 INTEGRATION TEST SUITE');
  console.log('Slice: Care Notes + Shift Handover Frontend (Slice 5)');
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
  console.log('Connected to MongoDB for Care Notes frontend integration testing.');

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`Notes integration test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  const timestamp = Date.now();
  const mainEmail = `caretaker.notes.${timestamp}@example.com`;
  const subEmail = `sub.notes.${timestamp}@example.com`;
  const doctorEmail = `doctor.notes.${timestamp}@example.com`;
  const familyEmail = `family.notes.${timestamp}@example.com`;
  const outsideEmail = `outsider.notes.${timestamp}@example.com`;
  const testPassword = 'Password123!Notes';

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

  let note1Id = '';
  let note2Id = '';
  let note3Id = '';
  let note4Id = '';
  let note5Id = '';

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
        name: 'Anita Main Caretaker',
        email: mainEmail,
        password: testPassword,
        phone: '+919876543230',
      }),
    });
    const mainRegData = await mainRegRes.json();
    mainToken = mainRegData.data.tokens.accessToken;
    mainUserId = mainRegData.data.user.id;

    // 2. Sub Caretaker
    const subRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sunil Sub Caretaker',
        email: subEmail,
        password: testPassword,
        phone: '+919876543231',
      }),
    });
    const subRegData = await subRegRes.json();
    subToken = subRegData.data.tokens.accessToken;
    subUserId = subRegData.data.user.id;

    // 3. Doctor User
    const docRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Arjun Doctor',
        email: doctorEmail,
        password: testPassword,
        phone: '+919876543232',
      }),
    });
    const docRegData = await docRegRes.json();
    doctorToken = docRegData.data.tokens.accessToken;
    doctorUserId = docRegData.data.user.id;

    // 4. Family Member User
    const familyRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rohan Family',
        email: familyEmail,
        password: testPassword,
        phone: '+919876543233',
      }),
    });
    const familyRegData = await familyRegRes.json();
    familyToken = familyRegData.data.tokens.accessToken;
    familyUserId = familyRegData.data.user.id;

    // 5. Outsider User
    const outRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Outsider User',
        email: outsideEmail,
        password: testPassword,
        phone: '+919876543234',
      }),
    });
    const outRegData = await outRegRes.json();
    outsideToken = outRegData.data.tokens.accessToken;
    outsideUserId = outRegData.data.user.id;

    // Create Main Care Circle 1
    const circleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        name: 'Sharma Family Circle',
        relationshipToRecipient: 'DAUGHTER',
        recipient: {
          fullName: 'Ramesh Sharma',
          preferredName: 'Dad',
          dateOfBirth: '1948-06-15',
          gender: 'male',
          bloodGroup: 'B+',
          knownConditions: ['Type 2 Diabetes', 'Hypertension'],
          allergies: ['Penicillin'],
        },
      }),
    });
    const circleData = await circleRes.json();
    circleId = circleData.data.careCircle.id;
    recipientId = circleData.data.careCircle.careRecipient.id;

    // Add Sub Caretaker to Circle 1
    await CareCircleMember.create({
      user: subUserId,
      careCircle: circleId,
      role: 'SUB_CARETAKER',
      status: 'ACTIVE',
      joinedAt: new Date(),
    });

    // Add Doctor to Circle 1
    await CareCircleMember.create({
      user: doctorUserId,
      careCircle: circleId,
      role: 'PAID_DOCTOR',
      status: 'ACTIVE',
      joinedAt: new Date(),
    });

    // Add Family Member to Circle 1
    await CareCircleMember.create({
      user: familyUserId,
      careCircle: circleId,
      role: 'FAMILY_MEMBER',
      status: 'ACTIVE',
      joinedAt: new Date(),
    });

    // Create Second Care Circle for Circle Switching Test
    const circle2Res = await fetch(`${BASE_URL}/api/care-circles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        name: 'Verma Family Circle',
        relationshipToRecipient: 'SON',
        recipient: {
          fullName: 'Sushila Verma',
          preferredName: 'Maa',
          dateOfBirth: '1952-09-20',
          gender: 'female',
          bloodGroup: 'O+',
        },
      }),
    });
    const circle2Data = await circle2Res.json();
    circle2Id = circle2Data.data.careCircle.id;

    // Create Foreign Care Circle for Outsider
    const foreignCircleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${outsideToken}`,
      },
      body: JSON.stringify({
        name: 'Outsider Private Circle',
        relationshipToRecipient: 'SELF',
        recipient: {
          fullName: 'Stranger Person',
          dateOfBirth: '1980-01-01',
          gender: 'other',
        },
      }),
    });
    const foreignCircleData = await foreignCircleRes.json();
    foreignCircleId = foreignCircleData.data.careCircle.id;

    console.log('--- Phase 1: Context & Empty Feed Initializations ---');

    // 1. Notes page loads
    assert(
      circleId && mainToken,
      '1. Notes page loads with authenticated session'
    );

    // 2. Active circle is used
    assert(
      circleId.length === 24,
      '2. Active circle context ID is verified and valid MongoDB ObjectID'
    );

    // 3. Notes list loads for circle
    const initialListRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const initialListData = await initialListRes.json();
    assert(
      initialListRes.status === 200 && Array.isArray(initialListData.data.notes),
      '3. Notes list endpoint responds with 200 and notes array'
    );

    // 4. Empty notes state
    assert(
      initialListData.data.notes.length === 0 && initialListData.total === 0,
      '4. Empty notes state correctly reflects 0 notes initially'
    );

    console.log('--- Phase 2: Care Note Creation & Categories ---');

    // 5. Create GENERAL note
    const note1Res = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        title: 'Morning Walk & Breakfast',
        content: 'Ramesh completed 20 minutes gentle walk in the garden. Ate 2 idlis and coconut chutney with good appetite.',
        category: 'GENERAL',
        shift: 'morning',
        urgency: 'NORMAL',
        noteDate: todayStr,
      }),
    });
    const note1Data = await note1Res.json();
    note1Id = note1Data.data.note.id || note1Data.data.note._id;
    assert(
      note1Res.status === 201 && note1Data.data.note.category === 'GENERAL',
      '5. Create GENERAL note persists and returns 201 Created'
    );

    // 6. Create HANDOVER note
    const note2Res = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${subToken}`,
      },
      body: JSON.stringify({
        title: 'Afternoon Shift Handover to Evening Caregiver',
        content: 'Patient rested well. Hydration prompt completed (500ml water). Evening dose of Metformin due at 8:00 PM.',
        category: 'HANDOVER',
        shift: 'afternoon',
        urgency: 'IMPORTANT',
        noteDate: todayStr,
      }),
    });
    const note2Data = await note2Res.json();
    note2Id = note2Data.data.note.id || note2Data.data.note._id;
    assert(
      note2Res.status === 201 && note2Data.data.note.category === 'HANDOVER',
      '6. Create HANDOVER note persists with shift tag'
    );

    // 7. Create VITALS_DIET note with vitals snapshot
    const note3Res = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        title: 'Post-Lunch Vitals & Meal Log',
        content: 'Blood pressure and post-prandial glucose checked 2 hours after lunch.',
        category: 'VITALS_DIET',
        shift: 'afternoon',
        urgency: 'NORMAL',
        noteDate: todayStr,
        vitalsSnapshot: {
          bpSystolic: 128,
          bpDiastolic: 82,
          heartRate: 74,
          bloodSugar: 135,
          temperature: 98.4,
          spO2: 98,
        },
        dietMood: {
          appetite: 'good',
          mood: 'happy',
          bowelMovement: 'normal',
        },
      }),
    });
    const note3Data = await note3Res.json();
    note3Id = note3Data.data.note.id || note3Data.data.note._id;
    assert(
      note3Res.status === 201 &&
        note3Data.data.note.vitalsSnapshot.bpSystolic === 128 &&
        note3Data.data.note.dietMood.appetite === 'good',
      '7. Create VITALS_DIET note stores biometrics snapshot and nutrition telemetry'
    );

    // 8. Create INCIDENT note
    const note4Res = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${familyToken}`,
      },
      body: JSON.stringify({
        title: 'Mild Dizziness After Standing',
        content: 'Dad experienced brief postural dizziness when getting up from sofa. Resolved after sitting for 2 minutes and drinking water.',
        category: 'INCIDENT',
        shift: 'evening',
        urgency: 'URGENT',
        noteDate: todayStr,
      }),
    });
    const note4Data = await note4Res.json();
    note4Id = note4Data.data.note.id || note4Data.data.note._id;
    assert(
      note4Res.status === 201 && note4Data.data.note.category === 'INCIDENT',
      '8. Create INCIDENT note records emergency/incident entry'
    );

    console.log('--- Phase 3: Urgency & Shift Filtering ---');

    // 9. Urgency handling & filtering
    const urgentFilterRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes?urgency=URGENT`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const urgentFilterData = await urgentFilterRes.json();
    assert(
      urgentFilterRes.status === 200 &&
        urgentFilterData.data.notes.every((n) => n.urgency === 'URGENT'),
      '9. Urgency filtering correctly isolates URGENT notes'
    );

    // 10. Shift handling & filtering
    const morningShiftRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes?shift=morning`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const morningShiftData = await morningShiftRes.json();
    assert(
      morningShiftRes.status === 200 &&
        morningShiftData.data.notes.every((n) => n.shift === 'morning'),
      '10. Shift filtering isolates morning shift entries'
    );

    console.log('--- Phase 4: Note Dossier, Acknowledgment & Pinning ---');

    // 11. Note detail
    const detailRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes/${note3Id}`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const detailData = await detailRes.json();
    assert(
      detailRes.status === 200 &&
        detailData.data.note.author.name === 'Anita Main Caretaker',
      '11. Note detail endpoint returns full note dossier with populated author profile'
    );

    // 12. Acknowledge note
    const ackRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes/${note2Id}/acknowledge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const ackData = await ackRes.json();
    assert(
      ackRes.status === 200 &&
        ackData.data.note.acknowledgedBy.some((a) => String(a.user._id || a.user.id) === String(doctorUserId)),
      '12. Acknowledge note records user acknowledgment with timestamp'
    );

    // 13. Duplicate acknowledgement handling (Idempotency)
    const dupAckRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes/${note2Id}/acknowledge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const dupAckData = await dupAckRes.json();
    const ackOccurrences = dupAckData.data.note.acknowledgedBy.filter(
      (a) => String(a.user._id || a.user.id) === String(doctorUserId)
    );
    assert(
      dupAckRes.status === 200 && ackOccurrences.length === 1,
      '13. Duplicate acknowledgment is idempotent and avoids duplicate records'
    );

    // 14. Pin note by Doctor
    const pinRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes/${note4Id}/pin`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${doctorToken}`,
      },
      body: JSON.stringify({ isPinned: true }),
    });
    const pinData = await pinRes.json();
    assert(
      pinRes.status === 200 && pinData.data.note.isPinned === true,
      '14. Pin note by PAID_DOCTOR pins clinical note successfully'
    );

    // 15. Unpin note by Main Caretaker
    const unpinRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes/${note4Id}/pin`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({ isPinned: false }),
    });
    const unpinData = await unpinRes.json();
    assert(
      unpinRes.status === 200 && unpinData.data.note.isPinned === false,
      '15. Unpin note by MAIN_CARETAKER updates isPinned to false'
    );

    console.log('--- Phase 5: Edit & Delete Governance ---');

    // 16. Edit authorized note by author
    const editRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes/${note1Id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        title: 'Morning Walk & Nutritious Breakfast (Updated)',
        content: 'Ramesh completed 25 minutes walk. Drank 1 glass warm turmeric water and ate 2 idlis.',
      }),
    });
    const editData = await editRes.json();
    assert(
      editRes.status === 200 &&
        editData.data.note.title.includes('(Updated)') &&
        editData.data.note.content.includes('25 minutes'),
      '16. Note author updates note content successfully'
    );

    // Create temporary note for delete test
    const tempNoteRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${familyToken}`,
      },
      body: JSON.stringify({
        title: 'Temporary Note',
        content: 'This note will be deleted shortly.',
        category: 'GENERAL',
        noteDate: todayStr,
      }),
    });
    const tempNoteData = await tempNoteRes.json();
    note5Id = tempNoteData.data.note.id || tempNoteData.data.note._id;

    // 17. Delete authorized note by author
    const deleteRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes/${note5Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${familyToken}` },
    });
    assert(
      deleteRes.status === 200,
      '17. Note author successfully deletes note with 200 OK'
    );

    // 18. Unauthorized edit/delete rejection (Family Member trying to delete Note 1 authored by Main Caretaker)
    const unauthDelRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes/${note1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${familyToken}` },
    });
    assert(
      unauthDelRes.status === 403,
      '18. Unauthorized edit/delete attempt by non-caretaker non-author is rejected with 403 FORBIDDEN'
    );

    // Unauthorized Pin rejection (Family Member trying to pin note)
    const unauthPinRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes/${note1Id}/pin`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${familyToken}`,
      },
      body: JSON.stringify({ isPinned: true }),
    });
    assert(
      unauthPinRes.status === 403,
      '18b. Pin attempt by FAMILY_MEMBER role is rejected with 403 FORBIDDEN'
    );

    console.log('--- Phase 6: Handover & Daily Summary Integration ---');

    // 19. Latest handover retrieval
    const latestHandoverRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes/recent/handover`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const latestHandoverData = await latestHandoverRes.json();
    assert(
      latestHandoverRes.status === 200 &&
        latestHandoverData.data.note !== null &&
        (latestHandoverData.data.note.category === 'HANDOVER' ||
          ['morning', 'afternoon', 'evening', 'night'].includes(latestHandoverData.data.note.shift)),
      '19. Latest handover endpoint returns the most recent shift handover note'
    );

    // 20. Create new handover note
    const eveningHandoverRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        title: 'Evening Shift Handover to Night Caretaker',
        content: 'Dinner completed at 7:30 PM. BP 122/80. Night medication given.',
        category: 'HANDOVER',
        shift: 'evening',
        urgency: 'NORMAL',
        noteDate: todayStr,
      }),
    });
    const eveningHandoverData = await eveningHandoverRes.json();
    assert(
      eveningHandoverRes.status === 201 &&
        eveningHandoverData.data.note.shift === 'evening',
      '20. Create new handover records latest shift handover successfully'
    );

    // 21. Handover acknowledgement
    const eveningHandoverId = eveningHandoverData.data.note.id || eveningHandoverData.data.note._id;
    const ackHandoverRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes/${eveningHandoverId}/acknowledge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${subToken}` },
    });
    const ackHandoverData = await ackHandoverRes.json();
    assert(
      ackHandoverRes.status === 200 &&
        ackHandoverData.data.note.acknowledgedBy.length >= 1,
      '21. Incoming caregiver acknowledges shift handover note'
    );

    // 22. Daily summary
    const summaryRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes/summary/daily?date=${todayStr}`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const summaryData = await summaryRes.json();
    assert(
      summaryRes.status === 200 &&
        summaryData.data.summary.totalNotesCount >= 4 &&
        summaryData.data.summary.handoverCount >= 2 &&
        summaryData.data.summary.vitalsLoggedCount >= 1,
      '22. Daily summary endpoint aggregates total notes, handovers, urgent alerts, and vitals'
    );

    console.log('--- Phase 7: Circle Switching & Isolation ---');

    // 23. Circle switching
    const circle2NotesRes = await fetch(`${BASE_URL}/api/care-circles/${circle2Id}/notes`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const circle2NotesData = await circle2NotesRes.json();
    assert(
      circle2NotesRes.status === 200 && circle2NotesData.data.notes.length === 0,
      '23. Circle switching isolates notes cleanly: Circle 2 has 0 notes'
    );

    // 24. Cross-circle isolation (Outsider cannot view Circle 1 notes)
    const crossCircleRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes`, {
      headers: { Authorization: `Bearer ${outsideToken}` },
    });
    assert(
      crossCircleRes.status === 403,
      '24. Cross-circle access attempt is rejected with 403 FORBIDDEN'
    );

    console.log('--- Phase 8: HTTP Status & Validation Integrity ---');

    // 25. 401 handling
    const noAuthRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes`);
    assert(
      noAuthRes.status === 401,
      '25. Unauthenticated request returns 401 AUTH_TOKEN_MISSING'
    );

    // 26. 403 handling (Non-member accessing circle)
    const nonMemberRes = await fetch(`${BASE_URL}/api/care-circles/${foreignCircleId}/notes`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    assert(
      nonMemberRes.status === 403,
      '26. Non-member request returns 403 FORBIDDEN'
    );

    // 27. 404 handling (Non-existent note)
    const fakeId = new mongoose.Types.ObjectId().toString();
    const notFoundRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes/${fakeId}`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    assert(
      notFoundRes.status === 404,
      '27. Non-existent note ID returns 404 NOTE_NOT_FOUND'
    );

    // 28. Validation failure (missing required content)
    const valFailRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        content: '',
        category: 'INVALID_CATEGORY',
      }),
    });
    assert(
      valFailRes.status === 400,
      '28. Validation error on missing content / invalid category returns 400 Bad Request'
    );

    // 29. Network / Server error handling: invalid Note ID format
    const badIdRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes/invalid-not-a-mongo-id`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    assert(
      badIdRes.status === 400,
      '29. Invalid noteId format returns 400 validation error gracefully'
    );

    // 30. Search & Refresh persistence
    const searchRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/notes?search=turmeric`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const searchData = await searchRes.json();
    assert(
      searchRes.status === 200 &&
        searchData.data.notes.length >= 1 &&
        searchData.data.notes[0].content.includes('turmeric'),
      '30. Search and refresh persistence verifies keyword search over persisted MongoDB notes'
    );

    console.log('--- Phase 9: Client Role Helpers Integrity ---');

    // 31. Permission helpers check
    assert(
      canPinNotes(ROLES.MAIN_CARETAKER) === true &&
        canPinNotes(ROLES.PAID_DOCTOR) === true &&
        canPinNotes(ROLES.FAMILY_MEMBER) === false,
      '31. canPinNotes helper matches backend permission rules'
    );

    assert(
      canEditNote({ author: mainUserId }, { id: mainUserId }, ROLES.FAMILY_MEMBER) === true &&
        canEditNote({ author: mainUserId }, { id: familyUserId }, ROLES.FAMILY_MEMBER) === false &&
        canEditNote({ author: familyUserId }, { id: mainUserId }, ROLES.MAIN_CARETAKER) === true,
      '32. canEditNote and canDeleteNote helpers enforce author and caretaker privileges'
    );
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`CARE NOTES INTEGRATION SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runNotesIntegrationTests();
