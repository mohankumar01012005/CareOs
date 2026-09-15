const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = require("./server");
const User = require("./src/models/User");
const CareRecipient = require("./src/models/CareRecipient");
const CareCircle = require("./src/models/CareCircle");
const CareCircleMember = require("./src/models/CareCircleMember");
const CareTask = require("./src/models/CareTask");
const {
  CAREOS_ROLES,
  MEMBERSHIP_STATUS,
  TASK_STATUS,
  TASK_PRIORITY,
  TASK_CATEGORIES,
  TASK_TIME_SLOTS,
} = require("./src/constants/roles");

let serverInstance;
const TEST_PORT = 5100;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runCareTaskTests() {
  console.log("==================================================================");
  console.log("CAREOS CARE TASK & FAMILY COORDINATION TEST SUITE (IMP 06)");
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
  console.log("Connected to MongoDB for Care Task testing.");

  await new Promise((resolve) => {
    serverInstance = app.listen(TEST_PORT, () => {
      console.log(`Care Task Test server running on port ${TEST_PORT}\n`);
      resolve();
    });
  });

  const timestamp = Date.now();
  const mainCaretakerEmail = `task.main.${timestamp}@example.com`;
  const subCaretakerEmail = `task.sub.${timestamp}@example.com`;
  const doctorEmail = `task.doctor.${timestamp}@example.com`;
  const familyMemberEmail = `task.family.${timestamp}@example.com`;
  const outsiderEmail = `task.outsider.${timestamp}@example.com`;
  const testPassword = "Password123!Task";

  let mainToken = "";
  let subToken = "";
  let doctorToken = "";
  let familyToken = "";
  let outsiderToken = "";

  let mainId = "";
  let subId = "";
  let doctorId = "";
  let familyId = "";
  let outsiderId = "";

  let circleId = "";
  let outsideCircleId = "";
  let recipientId = "";

  let task1Id = "";
  let task2Id = "";
  let task3Id = "";
  let task4Id = "";

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
        name: "Aarav Main Caretaker",
        email: mainCaretakerEmail,
        password: testPassword,
        phone: "+919911111111",
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
        name: "Neha Sub Caretaker",
        email: subCaretakerEmail,
        password: testPassword,
        phone: "+919922222222",
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
        name: "Dr. Ananya Roy",
        email: doctorEmail,
        password: testPassword,
        phone: "+919933333333",
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
        name: "Rohan Family Member",
        email: familyMemberEmail,
        password: testPassword,
        phone: "+919944444444",
      }),
    });
    const regFamData = await regFam.json();
    familyToken = regFamData.data.tokens.accessToken;
    familyId = regFamData.data.user.id;

    // 5. Register Outsider
    const regOut = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Oliver Outsider",
        email: outsiderEmail,
        password: testPassword,
        phone: "+919955555555",
      }),
    });
    const regOutData = await regOut.json();
    outsiderToken = regOutData.data.tokens.accessToken;
    outsiderId = regOutData.data.user.id;

    // 6. Main Caretaker creates primary Care Circle
    const circleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mainToken}`,
      },
      body: JSON.stringify({
        name: "Grandma Kamala Care Circle",
        recipient: {
          fullName: "Kamala Devi",
          dateOfBirth: "1948-05-12",
          gender: "female",
          bloodGroup: "O+",
          knownConditions: ["Hypertension", "Arthritis"],
          allergies: ["Sulfa drugs"],
        },
      }),
    });
    const circleData = await circleRes.json();
    circleId = circleData.data.careCircle.id;
    recipientId = circleData.data.careRecipient.id;

    // 7. Add Sub Caretaker, Doctor, and Family Member to primary Circle
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

    // 8. Outsider creates a separate circle
    const outCircleRes = await fetch(`${BASE_URL}/api/care-circles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${outsiderToken}`,
      },
      body: JSON.stringify({
        name: "Outsider Isolated Circle",
        recipient: {
          fullName: "Isolated Recipient",
          gender: "other",
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
      `${BASE_URL}/api/care-circles/${circleId}/tasks`
    );
    const unauthData = await unauthRes.json();
    assert(
      unauthRes.status === 401 && unauthData.code === "AUTH_TOKEN_MISSING",
      "1. Unauthenticated request to tasks endpoint is rejected with 401 AUTH_TOKEN_MISSING",
      `Got ${unauthRes.status}`
    );

    // 2. Non-member access
    const nonMemberRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks`,
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

    // 3. Cross-circle task access
    const crossCircleRes = await fetch(
      `${BASE_URL}/api/care-circles/${outsideCircleId}/tasks`,
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
      `${BASE_URL}/api/care-circles/${circleId}/tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          dueDate: todayStr,
        }),
      }
    );
    const missingTitleData = await missingTitleRes.json();
    assert(
      missingTitleRes.status === 400 &&
        missingTitleData.success === false &&
        Array.isArray(missingTitleData.errors),
      "4. Task creation missing title is rejected with 400 validation error",
      `Got ${missingTitleRes.status}`
    );

    // 5. Missing / invalid dueDate
    const invalidDateRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Morning Blood Pressure",
          dueDate: "15-09-2026", // Invalid format (should be YYYY-MM-DD)
        }),
      }
    );
    const invalidDateData = await invalidDateRes.json();
    assert(
      invalidDateRes.status === 400 &&
        invalidDateData.success === false &&
        Array.isArray(invalidDateData.errors),
      "5. Task creation with invalid dueDate format is rejected with 400 validation error",
      `Got ${invalidDateRes.status}`
    );

    // 6. Invalid category
    const invalidCatRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Walk in Park",
          dueDate: todayStr,
          category: "INVALID_CAT_NAME",
        }),
      }
    );
    const invalidCatData = await invalidCatRes.json();
    assert(
      invalidCatRes.status === 400 &&
        invalidCatData.success === false &&
        Array.isArray(invalidCatData.errors),
      "6. Task creation with invalid category is rejected with 400 validation error",
      `Got ${invalidCatRes.status}`
    );

    // 7. Invalid priority
    const invalidPriRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Walk in Park",
          dueDate: todayStr,
          priority: "SUPER_CRITICAL",
        }),
      }
    );
    const invalidPriData = await invalidPriRes.json();
    assert(
      invalidPriRes.status === 400 &&
        invalidPriData.success === false &&
        Array.isArray(invalidPriData.errors),
      "7. Task creation with invalid priority is rejected with 400 validation error",
      `Got ${invalidPriRes.status}`
    );

    // 8. Invalid timeSlot
    const invalidSlotRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Walk in Park",
          dueDate: todayStr,
          timeSlot: "midnight_snack",
        }),
      }
    );
    const invalidSlotData = await invalidSlotRes.json();
    assert(
      invalidSlotRes.status === 400 &&
        invalidSlotData.success === false &&
        Array.isArray(invalidSlotData.errors),
      "8. Task creation with invalid timeSlot is rejected with 400 validation error",
      `Got ${invalidSlotRes.status}`
    );

    // 9. Assignee who is not a circle member
    const invalidAssigneeRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Assist with Breakfast",
          dueDate: todayStr,
          assignedTo: outsiderId, // Not a member of circleId
        }),
      }
    );
    const invalidAssigneeData = await invalidAssigneeRes.json();
    assert(
      invalidAssigneeRes.status === 400 &&
        invalidAssigneeData.code === "ASSIGNEE_NOT_MEMBER",
      "9. Task assignment to non-circle member is rejected with 400 ASSIGNEE_NOT_MEMBER",
      `Got ${invalidAssigneeRes.status}`
    );

    // 10. Invalid taskId MongoDB format in URL
    const invalidIdRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/bad-task-id-123`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const invalidIdData = await invalidIdRes.json();
    assert(
      invalidIdRes.status === 400 &&
        invalidIdData.success === false &&
        Array.isArray(invalidIdData.errors),
      "10. Invalid taskId format in URL is rejected with 400 validation error",
      `Got ${invalidIdRes.status}`
    );

    // ================================================================
    // 3. TASK CREATION TESTS
    // ================================================================
    console.log("\n--- Section 3: Care Task Creation ---");

    // 11. Main Caretaker creates task 1 (Morning Vitals & Medication, assigned to Family Member)
    const createTask1Res = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Morning Blood Pressure & Pulse Check",
          description: "Record BP using digital monitor before morning tea.",
          category: "VITALS",
          priority: "URGENT",
          dueDate: todayStr,
          timeSlot: "morning",
          exactTime: "08:00",
          assignedTo: familyId,
          location: "Master Bedroom",
        }),
      }
    );
    const createTask1Data = await createTask1Res.json();
    task1Id = createTask1Data.data.task.id;

    assert(
      createTask1Res.status === 201 &&
        createTask1Data.data.task.title === "Morning Blood Pressure & Pulse Check" &&
        createTask1Data.data.task.status === TASK_STATUS.PENDING &&
        (createTask1Data.data.task.assignedTo.id || createTask1Data.data.task.assignedTo._id).toString() === familyId &&
        (createTask1Data.data.task.createdBy.id || createTask1Data.data.task.createdBy._id).toString() === mainId,
      "11. Main Caretaker creates urgent vitals task assigned to Family Member (201 Created)",
      `Got ${createTask1Res.status}`
    );

    // 12. Family Member creates task 2 (Unassigned afternoon grocery errand)
    const createTask2Res = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${familyToken}`,
        },
        body: JSON.stringify({
          title: "Pick up fresh fruits and diabetic snacks",
          description: "Get papayas, apples, and roasted almonds.",
          category: "ERRAND",
          priority: "MEDIUM",
          dueDate: todayStr,
          timeSlot: "afternoon",
          exactTime: "15:00",
          location: "Organic Supermarket",
        }),
      }
    );
    const createTask2Data = await createTask2Res.json();
    task2Id = createTask2Data.data.task.id;

    assert(
      createTask2Res.status === 201 &&
        createTask2Data.data.task.assignedTo === null &&
        createTask2Data.data.task.category === "ERRAND",
      "12. Family Member creates unassigned errand task (201 Created)",
      `Got ${createTask2Res.status}`
    );

    // 13. Doctor creates task 3 (Cardiologist appointment, assigned to Main Caretaker)
    const createTask3Res = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({
          title: "Cardiologist Consultation Followup",
          description: "Review ECG and echocardiogram reports with Dr. Roy.",
          category: "APPOINTMENT",
          priority: "HIGH",
          dueDate: todayStr,
          timeSlot: "morning",
          exactTime: "11:00",
          assignedTo: mainId,
          location: "Care Heart Clinic",
        }),
      }
    );
    const createTask3Data = await createTask3Res.json();
    task3Id = createTask3Data.data.task.id;

    assert(
      createTask3Res.status === 201 &&
        createTask3Data.data.task.category === "APPOINTMENT" &&
        (createTask3Data.data.task.assignedTo.id || createTask3Data.data.task.assignedTo._id).toString() === mainId,
      "13. Doctor creates clinic appointment task assigned to Main Caretaker (201 Created)",
      `Got ${createTask3Res.status}`
    );

    // 14. Sub Caretaker creates task 4 (Evening physiotherapy mobility routine)
    const createTask4Res = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${subToken}`,
        },
        body: JSON.stringify({
          title: "Evening Physiotherapy & Joint Mobility Exercises",
          description: "15 minutes knee flexion and assisted walking in corridor.",
          category: "MOBILITY",
          priority: "LOW",
          dueDate: todayStr,
          timeSlot: "evening",
          exactTime: "18:30",
          assignedTo: subId,
          location: "Living Room",
        }),
      }
    );
    const createTask4Data = await createTask4Res.json();
    task4Id = createTask4Data.data.task.id;

    assert(
      createTask4Res.status === 201 &&
        createTask4Data.data.task.category === "MOBILITY" &&
        (createTask4Data.data.task.assignedTo.id || createTask4Data.data.task.assignedTo._id).toString() === subId,
      "14. Sub Caretaker creates evening mobility task assigned to self (201 Created)",
      `Got ${createTask4Res.status}`
    );

    // ================================================================
    // 4. TASK LISTING, FILTERING & SEARCH TESTS
    // ================================================================
    console.log("\n--- Section 4: Task Listing, Filtering & Search ---");

    // 15. List all circle tasks
    const listAllRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks`,
      {
        headers: { Authorization: `Bearer ${familyToken}` },
      }
    );
    const listAllData = await listAllRes.json();
    assert(
      listAllRes.status === 200 && listAllData.data.tasks.length === 4,
      "15. Active member lists all care circle tasks (200 OK, count: 4)",
      `Got count: ${listAllData.data?.tasks?.length}`
    );

    // 16. Tab filter: tab=today
    const tabTodayRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks?tab=today`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const tabTodayData = await tabTodayRes.json();
    assert(
      tabTodayRes.status === 200 && tabTodayData.data.tasks.length === 4,
      "16. Filter tab=today returns all tasks due today (200 OK)",
      `Got count: ${tabTodayData.data?.tasks?.length}`
    );

    // 17. Category filter: category=VITALS
    const catFilterRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks?category=VITALS`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const catFilterData = await catFilterRes.json();
    assert(
      catFilterRes.status === 200 &&
        catFilterData.data.tasks.length === 1 &&
        catFilterData.data.tasks[0].id === task1Id,
      "17. Filter category=VITALS returns only the vitals task (200 OK)",
      `Got count: ${catFilterData.data?.tasks?.length}`
    );

    // 18. Priority filter: priority=URGENT
    const priFilterRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks?priority=URGENT`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const priFilterData = await priFilterRes.json();
    assert(
      priFilterRes.status === 200 &&
        priFilterData.data.tasks.length === 1 &&
        priFilterData.data.tasks[0].priority === "URGENT",
      "18. Filter priority=URGENT returns only the urgent task (200 OK)",
      `Got count: ${priFilterData.data?.tasks?.length}`
    );

    // 19. Assignee filter: assignedTo=<familyId>
    const assigneeFilterRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks?assignedTo=${familyId}`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const assigneeFilterData = await assigneeFilterRes.json();
    assert(
      assigneeFilterRes.status === 200 &&
        assigneeFilterData.data.tasks.length === 1 &&
        assigneeFilterData.data.tasks[0].id === task1Id,
      "19. Filter assignedTo=<familyId> returns tasks assigned to Family Member (200 OK)",
      `Got count: ${assigneeFilterData.data?.tasks?.length}`
    );

    // 20. Unassigned filter: assignedTo=unassigned
    const unassignedFilterRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks?assignedTo=unassigned`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const unassignedFilterData = await unassignedFilterRes.json();
    assert(
      unassignedFilterRes.status === 200 &&
        unassignedFilterData.data.tasks.length === 1 &&
        unassignedFilterData.data.tasks[0].id === task2Id,
      "20. Filter assignedTo=unassigned returns unassigned errand task (200 OK)",
      `Got count: ${unassignedFilterData.data?.tasks?.length}`
    );

    // 21. Case-insensitive search filter: search=Physiotherapy
    const searchFilterRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks?search=Physiotherapy`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const searchFilterData = await searchFilterRes.json();
    assert(
      searchFilterRes.status === 200 &&
        searchFilterData.data.tasks.length === 1 &&
        searchFilterData.data.tasks[0].id === task4Id,
      "21. Search query search=Physiotherapy matches mobility task (200 OK)",
      `Got count: ${searchFilterData.data?.tasks?.length}`
    );

    // ================================================================
    // 5. SINGLE TASK DOSSIER & UPDATES
    // ================================================================
    console.log("\n--- Section 5: Task Dossier & Updates ---");

    // 22. Get single task by ID
    const getTaskRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/${task1Id}`,
      {
        headers: { Authorization: `Bearer ${doctorToken}` },
      }
    );
    const getTaskData = await getTaskRes.json();
    assert(
      getTaskRes.status === 200 &&
        getTaskData.data.task.id === task1Id &&
        getTaskData.data.task.assignedTo.name === "Rohan Family Member",
      "22. GET /tasks/:taskId returns complete task dossier with populated relations (200 OK)",
      `Got ${getTaskRes.status}`
    );

    // 23. Update task details (title, description, location)
    const updateTaskRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/${task1Id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          title: "Morning Blood Pressure & Heart Rate Log",
          description: "Record BP using digital arm cuff; log into CareOS.",
          location: "Grandma's Suite",
        }),
      }
    );
    const updateTaskData = await updateTaskRes.json();
    assert(
      updateTaskRes.status === 200 &&
        updateTaskData.data.task.title === "Morning Blood Pressure & Heart Rate Log" &&
        updateTaskData.data.task.location === "Grandma's Suite",
      "23. PATCH /tasks/:taskId updates task details successfully (200 OK)",
      `Got ${updateTaskRes.status}`
    );

    // 24. Reassign unassigned task (task2) to Sub Caretaker
    const reassignRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/${task2Id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          assignedTo: subId,
        }),
      }
    );
    const reassignData = await reassignRes.json();
    assert(
      reassignRes.status === 200 &&
        (reassignData.data.task.assignedTo.id || reassignData.data.task.assignedTo._id).toString() === subId,
      "24. Reassigning task to active member (Sub Caretaker) succeeds (200 OK)",
      `Got ${reassignRes.status}`
    );

    // 25. Reassigning to non-circle member fails
    const reassignBadRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/${task2Id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          assignedTo: outsiderId,
        }),
      }
    );
    const reassignBadData = await reassignBadRes.json();
    assert(
      reassignBadRes.status === 400 &&
        reassignBadData.code === "ASSIGNEE_NOT_MEMBER",
      "25. Reassigning task to non-circle member fails with 400 ASSIGNEE_NOT_MEMBER",
      `Got ${reassignBadRes.status}`
    );

    // ================================================================
    // 6. TASK LIFECYCLE & STATUS CHANGES
    // ================================================================
    console.log("\n--- Section 6: Task Lifecycle & Status Tracking ---");

    // 26. Update status to IN_PROGRESS
    const progressRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/${task1Id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${familyToken}`,
        },
        body: JSON.stringify({
          status: TASK_STATUS.IN_PROGRESS,
        }),
      }
    );
    const progressData = await progressRes.json();
    assert(
      progressRes.status === 200 &&
        progressData.data.task.status === TASK_STATUS.IN_PROGRESS,
      "26. PATCH /tasks/:taskId/status sets status to IN_PROGRESS (200 OK)",
      `Got ${progressRes.status}`
    );

    // 27. Mark task 1 COMPLETED with completionNotes
    const completeRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/${task1Id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${familyToken}`,
        },
        body: JSON.stringify({
          status: TASK_STATUS.COMPLETED,
          completionNotes: "BP reading: 124/82 mmHg, Pulse: 72 bpm. Normal range.",
        }),
      }
    );
    const completeData = await completeRes.json();
    assert(
      completeRes.status === 200 &&
        completeData.data.task.status === TASK_STATUS.COMPLETED &&
        (completeData.data.task.completedBy.id || completeData.data.task.completedBy._id).toString() === familyId &&
        completeData.data.task.completedAt !== null &&
        completeData.data.task.completionNotes.includes("124/82 mmHg"),
      "27. Mark task COMPLETED attributes completedBy, sets completedAt, and saves notes (200 OK)",
      `Got ${completeRes.status}`
    );

    // 28. Tab filter tab=completed returns completed task
    const tabCompletedRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks?tab=completed`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const tabCompletedData = await tabCompletedRes.json();
    assert(
      tabCompletedRes.status === 200 &&
        tabCompletedData.data.tasks.length === 1 &&
        tabCompletedData.data.tasks[0].id === task1Id,
      "28. Tab tab=completed returns only completed tasks (200 OK)",
      `Got count: ${tabCompletedData.data?.tasks?.length}`
    );

    // 29. Tab filter tab=upcoming excludes completed task
    const tabUpcomingRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks?tab=upcoming`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const tabUpcomingData = await tabUpcomingRes.json();
    assert(
      tabUpcomingRes.status === 200 &&
        tabUpcomingData.data.tasks.length === 3 &&
        !tabUpcomingData.data.tasks.some((t) => t.id === task1Id),
      "29. Tab tab=upcoming filters out completed tasks (200 OK, count: 3)",
      `Got count: ${tabUpcomingData.data?.tasks?.length}`
    );

    // 30. Revert task 1 back to PENDING (uncomplete)
    const uncompleteRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/${task1Id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mainToken}`,
        },
        body: JSON.stringify({
          status: TASK_STATUS.PENDING,
        }),
      }
    );
    const uncompleteData = await uncompleteRes.json();
    assert(
      uncompleteRes.status === 200 &&
        uncompleteData.data.task.status === TASK_STATUS.PENDING &&
        uncompleteData.data.task.completedBy === null &&
        uncompleteData.data.task.completedAt === null,
      "30. Reverting task to PENDING clears completedBy and completedAt (200 OK)",
      `Got ${uncompleteRes.status}`
    );

    // Mark task 1 COMPLETED again for summary metrics
    await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/${task1Id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${familyToken}`,
        },
        body: JSON.stringify({
          status: TASK_STATUS.COMPLETED,
          completionNotes: "BP checked and verified.",
        }),
      }
    );

    // 31. Mark task 3 as CANCELLED
    const cancelRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/${task3Id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${doctorToken}`,
        },
        body: JSON.stringify({
          status: TASK_STATUS.CANCELLED,
          completionNotes: "Appointment rescheduled by clinic to tomorrow.",
        }),
      }
    );
    const cancelData = await cancelRes.json();
    assert(
      cancelRes.status === 200 &&
        cancelData.data.task.status === TASK_STATUS.CANCELLED,
      "31. Marking task CANCELLED preserves status and notes (200 OK)",
      `Got ${cancelRes.status}`
    );

    // ================================================================
    // 7. TIMELINE SUMMARY & CAREGIVER WORKLOAD TELEMETRY
    // ================================================================
    console.log("\n--- Section 7: Timeline Summary & Caregiver Workload ---");

    // 32. GET /summary/today
    const summaryRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/summary/today?date=${todayStr}`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const summaryData = await summaryRes.json();
    assert(
      summaryRes.status === 200 &&
        summaryData.data.summary.totalCount === 4 &&
        summaryData.data.summary.completedCount === 1 &&
        summaryData.data.summary.cancelledCount === 1 &&
        summaryData.data.summary.pendingCount === 2 &&
        summaryData.data.summary.completionPercentage === 25 &&
        summaryData.data.timeline.morning.items.length === 2 &&
        summaryData.data.timeline.afternoon.items.length === 1 &&
        summaryData.data.timeline.evening.items.length === 1,
      "32. GET /summary/today returns accurate aggregate counts, completion percentage, and time-slot timeline (200 OK)",
      `Got ${JSON.stringify(summaryData.data?.summary)}`
    );

    // 33. GET /workload
    const workloadRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/workload`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const workloadData = await workloadRes.json();
    assert(
      workloadRes.status === 200 &&
        workloadData.data.totalActiveTasks === 4 &&
        Array.isArray(workloadData.data.workload) &&
        workloadData.data.workload.length >= 4,
      "33. GET /workload aggregates tasks per caregiver member with active/completed workload percentages (200 OK)",
      `Got totalActiveTasks: ${workloadData.data?.totalActiveTasks}, members: ${workloadData.data?.workload?.length}`
    );

    // ================================================================
    // 8. TASK DELETION & NOT FOUND HANDLERS
    // ================================================================
    console.log("\n--- Section 8: Deletion Authorization & 404 Handlers ---");

    // 34. Unauthorized deletion: Family Member attempting to delete Doctor's task (task3)
    const unauthDelRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/${task3Id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${familyToken}` },
      }
    );
    const unauthDelData = await unauthDelRes.json();
    assert(
      unauthDelRes.status === 403 && unauthDelData.code === "FORBIDDEN",
      "34. Non-caretaker user cannot delete another member's task (403 FORBIDDEN)",
      `Got ${unauthDelRes.status}`
    );

    // 35. Task creator (Family Member) deletes their own task (task2)
    const creatorDelRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/${task2Id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${familyToken}` },
      }
    );
    const creatorDelData = await creatorDelRes.json();
    assert(
      creatorDelRes.status === 200 &&
        creatorDelData.data.taskId === task2Id,
      "35. Task creator successfully deletes their own task (200 OK)",
      `Got ${creatorDelRes.status}`
    );

    // 36. Main Caretaker deletes Doctor's task (task3)
    const caretakerDelRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/${task3Id}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const caretakerDelData = await caretakerDelRes.json();
    assert(
      caretakerDelRes.status === 200 &&
        caretakerDelData.data.taskId === task3Id,
      "36. Main Caretaker can delete any task in the circle (200 OK)",
      `Got ${caretakerDelRes.status}`
    );

    // 37. Accessing deleted/non-existent task returns 404
    const fakeTaskId = new mongoose.Types.ObjectId().toString();
    const notFoundRes = await fetch(
      `${BASE_URL}/api/care-circles/${circleId}/tasks/${fakeTaskId}`,
      {
        headers: { Authorization: `Bearer ${mainToken}` },
      }
    );
    const notFoundData = await notFoundRes.json();
    assert(
      notFoundRes.status === 404 && notFoundData.code === "TASK_NOT_FOUND",
      "37. Accessing non-existent task ID returns 404 TASK_NOT_FOUND",
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

runCareTaskTests();
