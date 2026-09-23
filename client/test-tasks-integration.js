/**
 * CareOS Frontend Tasks & Shared Calendar Integration Test Suite
 * Slice: Care Tasks + Shared Calendar
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
const CareTask = serverRequire('./src/models/CareTask');
const RefreshToken = serverRequire('./src/models/RefreshToken');
import {
  isMainCaretaker,
  canManageTasks,
  TASK_CATEGORIES,
  TASK_TIME_SLOTS,
} from './src/constants/roles.js';

let serverInstance;
const TEST_PORT = 5095;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runTasksIntegrationTests() {
  console.log('================================================================');
  console.log('CAREOS FRONTEND PHASE 1 INTEGRATION TEST SUITE');
  console.log('Slice: Care Tasks + Shared Calendar');
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
  console.log('Connected to MongoDB for Task integration testing.');

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`Task integration test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  const timestamp = Date.now();
  const mainEmail = `caretaker.tasks.${timestamp}@example.com`;
  const familyEmail = `family.tasks.${timestamp}@example.com`;
  const outsideEmail = `outsider.tasks.${timestamp}@example.com`;
  const testPassword = 'Password123!Task';

  let mainToken = '';
  let familyToken = '';
  let outsideToken = '';

  let mainUserId = '';
  let familyUserId = '';
  let outsideUserId = '';

  let circleId = '';
  let recipientId = '';
  let foreignCircleId = '';

  let createdTaskId1 = '';
  let createdTaskId2 = '';

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  try {
    // ----------------------------------------------------------------
    // Setup: Create Users & Care Circles
    // ----------------------------------------------------------------
    // 1. Main Caretaker
    const mainRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Anita Caretaker',
        email: mainEmail,
        password: testPassword,
        phone: '+919876543220',
      }),
    });
    const mainRegData = await mainRegRes.json();
    mainToken = mainRegData.data.tokens.accessToken;
    mainUserId = mainRegData.data.user.id;

    // 2. Family Member User
    const familyRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rohan Family',
        email: familyEmail,
        password: testPassword,
        phone: '+919876543221',
      }),
    });
    const familyRegData = await familyRegRes.json();
    familyToken = familyRegData.data.tokens.accessToken;
    familyUserId = familyRegData.data.user.id;

    // 3. Outsider User
    const outsideRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Oscar Outsider',
        email: outsideEmail,
        password: testPassword,
      }),
    });
    const outsideRegData = await outsideRegRes.json();
    outsideToken = outsideRegData.data.tokens.accessToken;
    outsideUserId = outsideRegData.data.user.id;

    // 4. Create Main Care Circle with Care Recipient
    const circleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        name: "Grandpa's Circle",
        recipient: {
          fullName: 'Grandpa Ramesh',
          dateOfBirth: '1945-03-10',
          bloodGroup: 'A+',
        },
      }),
    });
    const circleData = await circleRes.json();
    circleId = circleData.data.careCircle.id;
    recipientId = circleData.data.careRecipient.id;

    // 5. Add Family Member to Circle
    await CareCircleMember.create({
      careCircle: circleId,
      user: familyUserId,
      role: 'FAMILY_MEMBER',
      membershipStatus: 'ACTIVE',
    });

    // 6. Create Foreign Circle for Cross-Circle Access Testing
    const foreignCircleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${outsideToken}`,
      },
      body: JSON.stringify({
        name: "Foreign Circle",
        recipient: { fullName: "Stranger" },
      }),
    });
    const foreignCircleData = await foreignCircleRes.json();
    foreignCircleId = foreignCircleData.data.careCircle.id;

    // ----------------------------------------------------------------
    // 1. Initial State: List Tasks for Empty Circle
    // ----------------------------------------------------------------
    const emptyListRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/tasks`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const emptyListData = await emptyListRes.json();
    assert(
      emptyListRes.status === 200 &&
        emptyListData.success === true &&
        emptyListData.count === 0 &&
        Array.isArray(emptyListData.data.tasks) &&
        emptyListData.data.tasks.length === 0,
      '1. Initial state: GET /tasks returns empty array for new care circle'
    );

    // ----------------------------------------------------------------
    // 2. Task Creation Validation Failure
    // ----------------------------------------------------------------
    const invalidTaskRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        title: 'A', // too short (<2 chars)
        dueDate: 'invalid-date',
        category: 'NOT_A_CATEGORY',
        priority: 'SUPER_URGENT',
      }),
    });
    const invalidTaskData = await invalidTaskRes.json();
    assert(
      invalidTaskRes.status === 400 &&
        invalidTaskData.success === false &&
        Array.isArray(invalidTaskData.errors) &&
        invalidTaskData.errors.length >= 4,
      '2. Task creation rejects short title, bad date format, invalid category, and invalid priority with 400'
    );

    // ----------------------------------------------------------------
    // 3. Task Creation with Non-Circle-Member Assignee Failure
    // ----------------------------------------------------------------
    const nonMemberAssignRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        title: 'Give afternoon medication',
        dueDate: todayStr,
        assignedTo: outsideUserId, // Not a member of circleId
      }),
    });
    const nonMemberAssignData = await nonMemberAssignRes.json();
    assert(
      nonMemberAssignRes.status === 400 &&
        nonMemberAssignData.success === false &&
        nonMemberAssignData.code === 'ASSIGNEE_NOT_MEMBER',
      '3. Task assignment to a non-circle member is rejected with 400 ASSIGNEE_NOT_MEMBER'
    );

    // ----------------------------------------------------------------
    // 4. Task Creation Success (All Supported Fields)
    // ----------------------------------------------------------------
    const createTask1Res = await fetch(`${BASE_URL}/api/care-circles/${circleId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        title: 'Morning Blood Pressure & Pulse Check',
        description: 'Take readings before breakfast and log them in CareOS.',
        category: 'VITALS',
        priority: 'HIGH',
        dueDate: todayStr,
        timeSlot: 'morning',
        exactTime: '08:00',
        assignedTo: familyUserId,
        location: 'Bedroom Recliner',
      }),
    });
    const createTask1Data = await createTask1Res.json();
    assert(
      createTask1Res.status === 201 &&
        createTask1Data.success === true &&
        createTask1Data.data?.task?.title === 'Morning Blood Pressure & Pulse Check' &&
        createTask1Data.data?.task?.category === 'VITALS' &&
        createTask1Data.data?.task?.priority === 'HIGH' &&
        createTask1Data.data?.task?.status === 'PENDING' &&
        createTask1Data.data?.task?.dueDate === todayStr &&
        createTask1Data.data?.task?.timeSlot === 'morning' &&
        createTask1Data.data?.task?.exactTime === '08:00' &&
        createTask1Data.data?.task?.assignedTo?.name === 'Rohan Family',
      '4. Task creation succeeds with full fields and auto-populates assignee user details'
    );
    createdTaskId1 = createTask1Data.data.task.id;

    // 5. Create Second Task for Tomorrow
    const createTask2Res = await fetch(`${BASE_URL}/api/care-circles/${circleId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${familyToken}`,
      },
      body: JSON.stringify({
        title: 'Pick up Metformin Refill from Pharmacy',
        description: 'Call ahead to ensure prescription is ready.',
        category: 'ERRAND',
        priority: 'MEDIUM',
        dueDate: tomorrowStr,
        timeSlot: 'afternoon',
        location: 'Apollo Pharmacy Branch',
      }),
    });
    const createTask2Data = await createTask2Res.json();
    assert(
      createTask2Res.status === 201 &&
        createTask2Data.success === true &&
        createTask2Data.data?.task?.title === 'Pick up Metformin Refill from Pharmacy' &&
        createTask2Data.data?.task?.assignedTo === null,
      '5. Second task (shared/unassigned) created successfully for tomorrow'
    );
    createdTaskId2 = createTask2Data.data.task.id;

    // ----------------------------------------------------------------
    // 6. Task Listing & Filtering by Tab
    // ----------------------------------------------------------------
    // Tab: Today
    const todayTabRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/tasks?tab=today`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const todayTabData = await todayTabRes.json();
    assert(
      todayTabRes.status === 200 &&
        todayTabData.count === 1 &&
        todayTabData.data.tasks[0].id === createdTaskId1,
      '6. Filter tab=today returns only tasks scheduled for today'
    );

    // Tab: Upcoming
    const upcomingTabRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/tasks?tab=upcoming`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const upcomingTabData = await upcomingTabRes.json();
    assert(
      upcomingTabRes.status === 200 && upcomingTabData.count === 2,
      '7. Filter tab=upcoming returns pending tasks due today and in the future'
    );

    // ----------------------------------------------------------------
    // 7. Task Filtering by Category, Priority, and Search
    // ----------------------------------------------------------------
    const catFilterRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks?category=VITALS`,
      { headers: { Authorization: `Bearer ${mainToken}` } }
    );
    const catFilterData = await catFilterRes.json();
    assert(
      catFilterRes.status === 200 &&
        catFilterData.count === 1 &&
        catFilterData.data.tasks[0].category === 'VITALS',
      '8. Filter category=VITALS matches only vitals tasks'
    );

    const searchRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks?search=Pharmacy`,
      { headers: { Authorization: `Bearer ${mainToken}` } }
    );
    const searchData = await searchRes.json();
    assert(
      searchRes.status === 200 &&
        searchData.count === 1 &&
        searchData.data.tasks[0].id === createdTaskId2,
      '9. Search query search=Pharmacy matches errand task title and location'
    );

    // ----------------------------------------------------------------
    // 8. Task Detail Retrieval (GET /tasks/:taskId)
    // ----------------------------------------------------------------
    const detailRes = await fetch(`${BASE_URL}/api/care-circles/${circleId}/tasks/${createdTaskId1}`, {
      headers: { Authorization: `Bearer ${mainToken}` },
    });
    const detailData = await detailRes.json();
    assert(
      detailRes.status === 200 &&
        detailData.success === true &&
        detailData.data?.task?.id === createdTaskId1 &&
        detailData.data?.task?.assignedTo?.name === 'Rohan Family' &&
        detailData.data?.task?.createdBy?.name === 'Anita Caretaker',
      '10. GET /tasks/:taskId retrieves complete task dossier with populated relationships'
    );

    // ----------------------------------------------------------------
    // 9. Task Status Transitions & Lifecycle
    // ----------------------------------------------------------------
    // Set to IN_PROGRESS
    const inProgressRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/${createdTaskId1}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${familyToken}`,
        },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      }
    );
    const inProgressData = await inProgressRes.json();
    assert(
      inProgressRes.status === 200 && inProgressData.data.task.status === 'IN_PROGRESS',
      '11. Status transition: PENDING -> IN_PROGRESS succeeds'
    );

    // Mark COMPLETED with completionNotes
    const completeRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/${createdTaskId1}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${familyToken}`,
        },
        body: JSON.stringify({
          status: 'COMPLETED',
          completionNotes: 'BP recorded at 122/82 mmHg, Pulse 74 bpm. Normal range.',
        }),
      }
    );
    const completeData = await completeRes.json();
    assert(
      completeRes.status === 200 &&
        completeData.data.task.status === 'COMPLETED' &&
        completeData.data.task.completedBy?.name === 'Rohan Family' &&
        Boolean(completeData.data.task.completedAt) &&
        completeData.data.task.completionNotes.includes('122/82 mmHg'),
      '12. Status transition: IN_PROGRESS -> COMPLETED attributes completedBy and stores completion notes'
    );

    // Verify Tab: Completed
    const completedTabRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks?tab=completed`,
      { headers: { Authorization: `Bearer ${mainToken}` } }
    );
    const completedTabData = await completedTabRes.json();
    assert(
      completedTabRes.status === 200 &&
        completedTabData.count === 1 &&
        completedTabData.data.tasks[0].id === createdTaskId1,
      '13. Tab tab=completed returns completed tasks with attribution'
    );

    // Revert to PENDING
    const revertRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/${createdTaskId1}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({ status: 'PENDING' }),
      }
    );
    const revertData = await revertRes.json();
    assert(
      revertRes.status === 200 &&
        revertData.data.task.status === 'PENDING' &&
        revertData.data.task.completedBy === null &&
        revertData.data.task.completedAt === null,
      '14. Reverting task from COMPLETED -> PENDING cleanly resets completedBy and completedAt'
    );

    // ----------------------------------------------------------------
    // 10. Today Summary & Time-Slot Timeline Endpoint
    // ----------------------------------------------------------------
    const summaryRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/summary/today`,
      { headers: { Authorization: `Bearer ${mainToken}` } }
    );
    const summaryData = await summaryRes.json();
    assert(
      summaryRes.status === 200 &&
        summaryData.success === true &&
        summaryData.data?.summary?.totalCount === 1 &&
        summaryData.data?.summary?.pendingCount === 1 &&
        summaryData.data?.timeline?.morning?.items.length === 1 &&
        summaryData.data?.timeline?.morning?.items[0].title === 'Morning Blood Pressure & Pulse Check',
      '15. GET /tasks/summary/today breaks down tasks by time slot (morning, afternoon, evening, night, anytime)'
    );

    // ----------------------------------------------------------------
    // 11. Caregiver Workload Telemetry Endpoint
    // ----------------------------------------------------------------
    const workloadRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/workload`,
      { headers: { Authorization: `Bearer ${mainToken}` } }
    );
    const workloadData = await workloadRes.json();
    assert(
      workloadRes.status === 200 &&
        workloadData.success === true &&
        workloadData.data?.totalActiveTasks === 2 &&
        workloadData.data?.unassignedCount === 1 &&
        Array.isArray(workloadData.data?.workload) &&
        workloadData.data?.workload.length === 2,
      '16. GET /tasks/workload computes accurate task load and percentage across circle caregivers'
    );

    // ----------------------------------------------------------------
    // 12. Cross-Circle Access Protection
    // ----------------------------------------------------------------
    const crossCircleRes = await fetch(
      `${BASE_URL}/api/care-circles/${foreignCircleId}/tasks`,
      { headers: { Authorization: `Bearer ${mainToken}` } }
    );
    assert(
      crossCircleRes.status === 403,
      '17. Non-member user attempting to access tasks in another Care Circle is rejected with 403 FORBIDDEN'
    );

    // ----------------------------------------------------------------
    // 13. Task Deletion Authorization
    // ----------------------------------------------------------------
    // Outsider cannot delete task
    const badDeleteRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/${createdTaskId1}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${outsideToken}` },
      }
    );
    assert(
      badDeleteRes.status === 403,
      '18. Unauthorized non-member cannot delete circle task (403)'
    );

    // Main Caretaker deletes task
    const deleteRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/${createdTaskId2}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const deleteData = await deleteRes.json();
    assert(
      deleteRes.status === 200 && deleteData.success === true,
      '19. Main Caretaker successfully deletes a task from the circle'
    );

    // ----------------------------------------------------------------
    // 14. Constants & Role Capabilities Verification
    // ----------------------------------------------------------------
    assert(
      TASK_CATEGORIES.length === 8 &&
        TASK_TIME_SLOTS.length === 5 &&
        isMainCaretaker('MAIN_CARETAKER') === true &&
        canManageTasks('MAIN_CARETAKER') === true &&
        canManageTasks('SUB_CARETAKER') === true &&
        canManageTasks('PAID_CARETAKER') === true,
      '20. Task constants and role capability functions enforce proper RBAC rules'
    );

    // Clean up test records
    await CareTask.deleteMany({ careCircle: circleId });
    await CareTask.deleteMany({ careCircle: foreignCircleId });
    await CareCircleMember.deleteMany({ careCircle: { $in: [circleId, foreignCircleId] } });
    await CareCircle.deleteMany({ _id: { $in: [circleId, foreignCircleId] } });
    await CareRecipient.deleteMany({ _id: recipientId });
    await RefreshToken.deleteMany({ userId: { $in: [mainUserId, familyUserId, outsideUserId] } });
    await User.deleteMany({ _id: { $in: [mainUserId, familyUserId, outsideUserId] } });
    console.log('\nTask integration test database records cleaned up successfully.');
  } catch (err) {
    console.error('Task integration test encountered unexpected error:', err);
    failed++;
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await mongoose.disconnect();
  }

  console.log('\n================================================================');
  console.log(`TASK INTEGRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTasksIntegrationTests();
