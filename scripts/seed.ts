import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User, StudentProfile, TeacherProfile, StaffProfile } from "@/modules/users/model";
import { Center } from "@/modules/centers/model";
import { Subject } from "@/modules/subjects/model";
import { ClassModel, Enrollment } from "@/modules/classes/model";
import { Assessment, IAssessment, AssessmentType } from "@/modules/exams/model";
import { Mark } from "@/modules/marks/model";
import { AttendanceSession, Attendance } from "@/modules/attendance/model";
import { Announcement } from "@/modules/announcements/model";
import { Setting } from "@/modules/settings/model";
import { PerformanceSnapshot } from "@/modules/analysis/model";
import { LeaderboardSnapshot, LeaderboardEntry, UserPreference } from "@/modules/leaderboard/model";
import { LeaderboardService } from "@/modules/leaderboard/service";
import { generateSlug } from "@/lib/slug";

export async function runSeed() {
  console.log("🌱 Starting Danuma LMS Database Seeding...");
  await connectDB();

  // Clear existing collections for a clean, deterministic seed
  console.log("🧹 Cleaning old records...");
  await Promise.all([
    User.deleteMany({}),
    StudentProfile.deleteMany({}),
    TeacherProfile.deleteMany({}),
    StaffProfile.deleteMany({}),
    Center.deleteMany({}),
    Subject.deleteMany({}),
    ClassModel.deleteMany({}),
    Enrollment.deleteMany({}),
    Assessment.deleteMany({}),
    Mark.deleteMany({}),
    AttendanceSession.deleteMany({}),
    Attendance.deleteMany({}),
    Announcement.deleteMany({}),
    Setting.deleteMany({}),
    PerformanceSnapshot.deleteMany({}),
    LeaderboardSnapshot.deleteMany({}),
    LeaderboardEntry.deleteMany({}),
    UserPreference.deleteMany({}),
  ]);

  // 1. Create Center
  console.log("🏢 Seeding Centers...");
  const center = await Center.create({
    name: "Newgen Education Center - Colombo",
    address: "123 Galle Road, Colombo 03, Sri Lanka",
    phone: "+94 11 234 5678",
    timezone: "Asia/Colombo",
  });
  const centerId = center._id;

  const centerKandy = await Center.create({
    name: "Newgen Excellence Campus - Kandy",
    address: "45 Peradeniya Road, Kandy, Sri Lanka",
    phone: "+94 81 222 3344",
    timezone: "Asia/Colombo",
  });
  const centerKandyId = centerKandy._id;

  // 2. Hash default passwords
  console.log("🔐 Hashing passwords (cost 12)...");
  const adminPasswordHash = await bcrypt.hash("Admin@123456", 12);
  const teacherPasswordHash = await bcrypt.hash("Teacher@123456", 12);
  const staffPasswordHash = await bcrypt.hash("Staff@123456", 12);
  const studentPasswordHash = await bcrypt.hash("Student@123456", 12);

  // 3. Create Super Admin & Admin
  console.log("👑 Seeding Administrators...");
  const superAdmin = await User.create({
    centerId,
    username: "dev_admin",
    passwordHash: adminPasswordHash,
    name: "Developer Admin",
    email: "dev@newgen.lk",
    phone: "+94 77 100 0001",
    role: "super_admin",
    status: "active",
  });

  const admin = await User.create({
    centerId,
    username: "owner_admin",
    passwordHash: adminPasswordHash,
    name: "Owner Admin",
    email: "owner@newgen.lk",
    phone: "+94 77 100 0002",
    role: "admin",
    status: "active",
  });

  // 4. Create Teachers
  console.log("👨‍🏫 Seeding Teachers...");
  const teacherMath = await User.create({
    centerId,
    assignedCenterIds: [centerId, centerKandyId],
    username: "teacher_math",
    passwordHash: teacherPasswordHash,
    name: "Samantha Perera",
    email: "samantha@newgen.lk",
    phone: "+94 77 123 4561",
    role: "teacher",
    status: "active",
  });
  await TeacherProfile.create({
    userId: teacherMath._id,
    centerId,
    assignedCenterIds: [centerId, centerKandyId],
    title: "Senior Mathematics Lecturer",
  });

  const teacherScience = await User.create({
    centerId,
    username: "teacher_science",
    passwordHash: teacherPasswordHash,
    name: "Dr. David Silva",
    email: "david@newgen.lk",
    phone: "+94 77 123 4562",
    role: "teacher",
    status: "active",
  });
  await TeacherProfile.create({
    userId: teacherScience._id,
    centerId,
    title: "Head of Science & Physics",
  });

  const teacherEnglish = await User.create({
    centerId,
    username: "teacher_english",
    passwordHash: teacherPasswordHash,
    name: "Sarah Jenkins",
    email: "sarah@newgen.lk",
    phone: "+94 77 123 4563",
    role: "teacher",
    status: "active",
  });
  await TeacherProfile.create({
    userId: teacherEnglish._id,
    centerId,
    title: "Lead English Instructor",
  });

  // 5. Create Staff Members
  console.log("💼 Seeding Staff Members...");
  const staff1 = await User.create({
    centerId,
    username: "staff_1",
    passwordHash: staffPasswordHash,
    name: "Nimali Wickramasinghe",
    email: "evaluator1@newgen.lk",
    phone: "+94 77 123 4564",
    role: "staff",
    status: "active",
  });
  await StaffProfile.create({
    userId: staff1._id,
    centerId,
    title: "Evaluation Coordinator",
    position: "Lead Mark Evaluator",
  });

  const staff2 = await User.create({
    centerId,
    username: "staff_2",
    passwordHash: staffPasswordHash,
    name: "Chathura Jayasinghe",
    email: "evaluator2@newgen.lk",
    phone: "+94 77 123 4565",
    role: "staff",
    status: "active",
  });
  await StaffProfile.create({
    userId: staff2._id,
    centerId,
    title: "Academic Operations",
    position: "Exam Coordinator",
  });

  const staff3 = await User.create({
    centerId,
    username: "staff_3",
    passwordHash: staffPasswordHash,
    name: "Keshani Alwis",
    email: "attendance@newgen.lk",
    phone: "+94 77 123 4566",
    role: "staff",
    status: "active",
  });
  await StaffProfile.create({
    userId: staff3._id,
    centerId,
    title: "Student Affairs",
    position: "Attendance Officer",
  });

  // 6. Create Subjects
  console.log("📚 Seeding Subjects...");
  const subjectsData = [
    { name: "Mathematics", code: "MATH101", description: "General Mathematics for secondary grades" },
    { name: "Combined Science", code: "SCI101", description: "Integrated Physics, Chemistry, and Biology" },
    { name: "English Language", code: "ENG101", description: "English Grammar, Composition, and Literature" },
    { name: "Physics", code: "PHY101", description: "Mechanics, Heat, Light, and Electricity" },
    { name: "Chemistry", code: "CHEM101", description: "Inorganic, Organic, and Physical Chemistry" },
    { name: "Information Technology", code: "IT101", description: "Computer Systems and Practical Programming" },
  ];

  const subjects = await Subject.insertMany(
    subjectsData.map((s) => ({ ...s, centerId }))
  );
  const mathSub = subjects.find((s) => s.code === "MATH101")!;
  const sciSub = subjects.find((s) => s.code === "SCI101")!;
  const engSub = subjects.find((s) => s.code === "ENG101")!;
  const phySub = subjects.find((s) => s.code === "PHY101")!;
  const chemSub = subjects.find((s) => s.code === "CHEM101")!;
  const itSub = subjects.find((s) => s.code === "IT101")!;

  // 7. Create Classes
  console.log("🏫 Seeding Classes...");
  const classMath = await ClassModel.create({
    centerId,
    name: "Grade 11 Mathematics",
    slug: generateSlug("Grade 11 Mathematics"),
    subjectId: mathSub._id,
    teacherId: teacherMath._id,
    staffIds: [staff1._id],
    schedule: {
      type: "regular",
      regular: {
        daysOfWeek: [2, 4], // Tuesday & Thursday
        startTime: "15:00",
        endTime: "17:00",
      },
    },
    status: "active",
  });

  const classMath2 = await ClassModel.create({
    centerId,
    name: "Grade 10 Pure Mathematics",
    slug: generateSlug("Grade 10 Pure Mathematics"),
    subjectId: mathSub._id,
    teacherId: teacherMath._id,
    staffIds: [staff1._id],
    schedule: {
      type: "regular",
      regular: {
        daysOfWeek: [3, 5], // Wednesday & Friday
        startTime: "15:00",
        endTime: "17:00",
      },
    },
    status: "active",
  });

  const classMathSpecial = await ClassModel.create({
    centerId,
    name: "O/L Mathematics Target Seminar",
    slug: generateSlug("OL Mathematics Target Seminar"),
    subjectId: mathSub._id,
    teacherId: teacherMath._id,
    staffIds: [staff2._id],
    schedule: {
      type: "special",
      special: {
        sessions: [
          { date: "2026-11-27", startTime: "08:30", endTime: "12:30" },
        ],
      },
    },
    status: "active",
  });

  const classScience = await ClassModel.create({
    centerId,
    name: "Grade 11 Science",
    slug: generateSlug("Grade 11 Science"),
    subjectId: sciSub._id,
    teacherId: teacherScience._id,
    staffIds: [staff2._id],
    schedule: {
      type: "regular",
      regular: {
        daysOfWeek: [1, 3], // Monday & Wednesday
        startTime: "15:00",
        endTime: "17:00",
      },
    },
    status: "active",
  });

  const classEnglish = await ClassModel.create({
    centerId,
    name: "Grade 11 English",
    slug: generateSlug("Grade 11 English"),
    subjectId: engSub._id,
    teacherId: teacherEnglish._id,
    staffIds: [staff3._id],
    schedule: {
      type: "regular",
      regular: {
        daysOfWeek: [6], // Saturday
        startTime: "09:00",
        endTime: "12:00",
      },
    },
    status: "active",
  });

  const classPhysicsSpecial = await ClassModel.create({
    centerId,
    name: "Physics Revision Workshop",
    slug: generateSlug("Physics Revision Workshop"),
    subjectId: phySub._id,
    teacherId: teacherScience._id,
    staffIds: [staff1._id],
    schedule: {
      type: "special",
      special: {
        sessions: [
          { date: "2026-11-25", startTime: "08:30", endTime: "12:30" },
          { date: "2026-12-02", startTime: "08:30", endTime: "12:30" },
        ],
      },
    },
    status: "active",
  });

  const classChemLab = await ClassModel.create({
    centerId,
    name: "Chemistry Lab Practical",
    slug: generateSlug("Chemistry Lab Practical"),
    subjectId: chemSub._id,
    teacherId: teacherScience._id,
    staffIds: [staff2._id],
    schedule: {
      type: "special",
      special: {
        sessions: [
          { date: "2026-11-28", startTime: "13:00", endTime: "16:00" },
        ],
      },
    },
    status: "active",
  });

  // 8. Create 30 Students: 8 Excellent, 14 Medium, 8 Weak
  console.log("🎓 Seeding 30 Students across standing tiers...");
  const studentNames = [
    // 8 Excellent
    "Kasun Mendis", "Amali Fernando", "Dilshan Perera", "Nethmi Jayawardena",
    "Tharindu Wickrama", "Ishara Bandara", "Kavindi De Silva", "Ravindu Senaratne",
    // 14 Medium
    "Anuki Dissanayake", "Dhanushka Gunasekara", "Hashan Abeykoon", "Janani Kulatunga",
    "Lahiru Samaranayake", "Manushi Ranasinghe", "Nuwan Rathnayake", "Poorna Hettiarachchi",
    "Rumesh Karunaratne", "Sajith Weerasinghe", "Thilini Ekanayake", "Umesh Gamage",
    "Vihara Liyanage", "Yasith Wijesinghe",
    // 8 Weak (student 23, 24, 25 have falling performance trajectories)
    "Chamikara Dias", "Dinithi Cooray", "Gayan Jayatillake", "Hansani Peiris",
    "Kusal Samarawickrama", "Malith Ariyaratne", "Nadeesha Pathirana", "Oshada Fernando"
  ];

  const students = [];
  for (let i = 0; i < studentNames.length; i++) {
    const idx = i + 1;
    const username = `student_${idx}`;
    const name = studentNames[i];
    const groupTier = idx <= 8 ? "excellent" : idx <= 22 ? "medium" : "weak";

    const userDoc = await User.create({
      centerId,
      username,
      passwordHash: studentPasswordHash,
      name,
      email: `${username}@newgen.lk`,
      phone: `+94 71 ${String(2000000 + idx)}`,
      role: "student",
      status: "active",
      createdBy: teacherMath._id,
    });

    await StudentProfile.create({
      userId: userDoc._id,
      centerId,
      admissionNo: `ADM-2026-${String(idx).padStart(3, "0")}`,
      grade: "Grade 11",
      guardian: {
        name: `Parent of ${name.split(" ")[0]}`,
        phone: `+94 77 ${String(7000000 + idx)}`,
        relation: "Parent",
      },
    });

    students.push({
      id: userDoc._id,
      username,
      name,
      groupTier,
      idx,
    });
  }

  // 9. Enroll all students in Regular Classes and select special classes
  console.log("📝 Enrolling students in classes...");
  const enrollments = [];
  for (const st of students) {
    enrollments.push({ centerId, classId: classMath._id, studentId: st.id, status: "active" });
    enrollments.push({ centerId, classId: classScience._id, studentId: st.id, status: "active" });
    enrollments.push({ centerId, classId: classEnglish._id, studentId: st.id, status: "active" });
    if (st.idx % 2 === 0) {
      enrollments.push({ centerId, classId: classPhysicsSpecial._id, studentId: st.id, status: "active" });
      enrollments.push({ centerId, classId: classMath2._id, studentId: st.id, status: "active" });
    }
    if (st.idx % 3 === 0) {
      enrollments.push({ centerId, classId: classChemLab._id, studentId: st.id, status: "active" });
      enrollments.push({ centerId, classId: classMathSpecial._id, studentId: st.id, status: "active" });
    }
  }
  await Enrollment.insertMany(enrollments);

  // 10. Create 12 Assessments
  console.log("📋 Seeding 12 Assessments...");
  const assessmentsData: Array<{
    title: string;
    type: AssessmentType;
    subjectId: mongoose.Types.ObjectId;
    classIds: mongoose.Types.ObjectId[];
    totalMarks: number;
    passMark: number;
    weight: number;
  }> = [
      { title: "Term 1 Examination", type: "exam", subjectId: mathSub._id, classIds: [classMath._id], totalMarks: 100, passMark: 40, weight: 2.0 },
      { title: "Mid-Term Examination", type: "exam", subjectId: sciSub._id, classIds: [classScience._id], totalMarks: 100, passMark: 40, weight: 2.0 },
      { title: "Math Monthly Unit Test", type: "test", subjectId: mathSub._id, classIds: [classMath._id], totalMarks: 50, passMark: 20, weight: 1.0 },
      { title: "Science Electricity Unit Test", type: "test", subjectId: sciSub._id, classIds: [classScience._id], totalMarks: 50, passMark: 20, weight: 1.0 },
      { title: "English Essay Composition", type: "paper", subjectId: engSub._id, classIds: [classEnglish._id], totalMarks: 50, passMark: 20, weight: 1.0 },
      { title: "Physics Mechanics MCQ Quiz", type: "mcq_quiz", subjectId: phySub._id, classIds: [classPhysicsSpecial._id], totalMarks: 25, passMark: 10, weight: 0.5 },
      { title: "Chemistry Bonding Quiz", type: "mcq_quiz", subjectId: chemSub._id, classIds: [classChemLab._id], totalMarks: 25, passMark: 10, weight: 0.5 },
      { title: "Algebra & Graphs Quiz", type: "mcq_quiz", subjectId: mathSub._id, classIds: [classMath._id], totalMarks: 20, passMark: 8, weight: 0.5 },
      { title: "Science Model Paper 1", type: "paper", subjectId: sciSub._id, classIds: [classScience._id], totalMarks: 100, passMark: 40, weight: 1.5 },
      { title: "English Grammar Proficiency", type: "mcq_quiz", subjectId: engSub._id, classIds: [classEnglish._id], totalMarks: 30, passMark: 12, weight: 0.5 },
      { title: "IT Practical Assignment", type: "assignment", subjectId: itSub._id, classIds: [classMath._id], totalMarks: 50, passMark: 20, weight: 1.0 },
      { title: "Final Term Mock Test", type: "test", subjectId: mathSub._id, classIds: [classMath._id], totalMarks: 100, passMark: 40, weight: 1.5 },
    ];

  const assessments: IAssessment[] = [];
  for (const a of assessmentsData) {
    const created = await Assessment.create({
      centerId,
      title: a.title,
      slug: generateSlug(a.title),
      type: a.type,
      subjectId: a.subjectId,
      classIds: a.classIds,
      totalMarks: a.totalMarks,
      passMark: a.passMark,
      weight: a.weight,
      dateMode: "single",
      sessions: [{ date: "2026-11-10", startTime: "09:00", endTime: "11:00" }],
      evaluatorIds: [staff1._id, staff2._id],
      status: "completed",
      createdBy: teacherMath._id,
    });
    assessments.push(created);
  }

  // 11. Create Realistic Marks for each student
  console.log("✍️ Seeding realistic marks for all students...");
  const marksToInsert = [];
  for (const st of students) {
    for (const asm of assessments) {
      let percentage = 70;
      if (st.idx === 1) {
        // Kasun Mendis: Top student across the board (95 - 99%)
        percentage = Math.floor(95 + Math.random() * 5);
      } else if (st.groupTier === "excellent") {
        percentage = Math.floor(78 + Math.random() * 14); // 78 - 91%
      } else if (st.groupTier === "medium") {
        percentage = Math.floor(52 + Math.random() * 21); // 52 - 72%
      } else {
        // Weak students
        if ([23, 24, 25].includes(st.idx)) {
          // Falling trend students
          percentage = Math.floor(32 + Math.random() * 12); // 32 - 44%
        } else {
          percentage = Math.floor(25 + Math.random() * 22); // 25 - 46%
        }
      }

      const score = Math.round((percentage / 100) * asm.totalMarks);
      let grade = "W";
      if (percentage >= 75) grade = "A";
      else if (percentage >= 65) grade = "B";
      else if (percentage >= 55) grade = "C";
      else if (percentage >= 35) grade = "S";

      marksToInsert.push({
        centerId,
        assessmentId: asm._id,
        studentId: st.id,
        classId: asm.classIds[0],
        subjectId: asm.subjectId,
        totalMarks: asm.totalMarks,
        score,
        percentage,
        grade,
        type: asm.type,
        status: "submitted",
        evaluatedBy: staff1._id,
        evaluatedAt: new Date(),
      });
    }
  }
  await Mark.insertMany(marksToInsert);

  // 12. Create 8 Weeks of Attendance Records
  console.log("📅 Seeding 8 weeks of class attendance...");
  const attendanceSessions = [];
  const attendanceRecords = [];
  const weeks = ["2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16", "2026-11-20"];

  for (const date of weeks) {
    const sess = await AttendanceSession.create({
      centerId,
      kind: "class",
      refId: classMath._id,
      date,
      startTime: "15:00",
      endTime: "17:00",
      status: "finalized",
      finalizedBy: staff3._id,
      finalizedAt: new Date(date),
    });
    attendanceSessions.push(sess);

    for (const st of students) {
      let status: "present" | "absent" | "late" = "present";
      const rand = Math.random();

      if (st.idx === 1) {
        status = "present"; // 100% attendance for Kasun Mendis
      } else if (st.groupTier === "excellent") {
        status = rand < 0.94 ? "present" : rand < 0.98 ? "late" : "absent";
      } else if (st.groupTier === "medium") {
        status = rand < 0.82 ? "present" : rand < 0.92 ? "late" : "absent";
      } else {
        status = rand < 0.45 ? "present" : rand < 0.65 ? "late" : "absent";
      }

      attendanceRecords.push({
        centerId,
        sessionId: sess._id,
        studentId: st.id,
        classId: classMath._id,
        date,
        status,
        source: "manual",
        markedBy: staff3._id,
        markedAt: new Date(date),
      });
    }
  }
  await Attendance.insertMany(attendanceRecords);

  // 13. Create Announcements
  console.log("📢 Seeding Announcements...");
  await Announcement.insertMany([
    {
      centerId,
      title: "Term 2 Academic Session & Class Schedule",
      body: "Welcome to Term 2! All regular batch sessions for Grade 11 Mathematics and Science will resume on standard schedules. Please check your timetable.",
      audience: "center",
      pinned: true,
      createdBy: admin._id,
    },
    {
      centerId,
      title: "Term 1 Final Examination Results Published",
      body: "Marks for all Term 1 assessments are now fully evaluated and approved. Students can view detailed performance analysis in their dashboard.",
      audience: "center",
      pinned: true,
      createdBy: superAdmin._id,
    },
    {
      centerId,
      title: "Special Mathematics Revision Workshop Announcement",
      body: "An intensive calculus and geometry revision session will be conducted this upcoming Saturday. Enrolled students are requested to bring past paper booklets.",
      audience: "classes",
      classIds: [classMath._id],
      pinned: false,
      createdBy: teacherMath._id,
    },
    {
      centerId,
      title: "Faculty Curriculum Review Meeting",
      body: "Monthly staff review meeting scheduled for Friday at 4:30 PM in Conference Room A. Discussion on student guidance strategies for low performers.",
      audience: "center",
      pinned: false,
      createdBy: admin._id,
    },
    {
      centerId,
      title: "Examination Regulations & Hall Conduct Guidelines",
      body: "All students are reminded that electronic devices and calculators must strictly adhere to the examination hall rules during the upcoming unit tests.",
      audience: "center",
      pinned: false,
      createdBy: staff2._id,
    },
  ]);

  // 14. Create Default System Settings
  console.log("⚙️ Seeding System Settings...");
  await Setting.insertMany([
    {
      centerId,
      key: "score.weights",
      value: { marks: 75, attendance: 25 },
    },
    {
      centerId,
      key: "score.typeWeights",
      value: { exam: 3, test: 2, paper: 2, mcq_quiz: 1, assignment: 1 },
    },
    {
      centerId,
      key: "score.countAbsentAsZero",
      value: true,
    },
    {
      centerId,
      key: "leaderboard.minAssessments",
      value: 3,
    },
    {
      centerId,
      key: "leaderboard.minSessions",
      value: 5,
    },
    {
      centerId,
      key: "leaderboard.showToStudents",
      value: true,
    },
    {
      centerId,
      key: "leaderboard.showFullNames",
      value: true,
    },
    {
      centerId,
      key: "performanceWeights",
      value: { marks: 0.75, attendance: 0.25 },
    },
    {
      centerId,
      key: "groupThresholds",
      value: { excellent: 75, medium: 50 },
    },
    {
      centerId,
      key: "gradeScale",
      value: [
        { grade: "A", min: 75 },
        { grade: "B", min: 65 },
        { grade: "C", min: 55 },
        { grade: "S", min: 35 },
        { grade: "W", min: 0 },
      ],
    },
  ]);

  // 15. Create Daily Performance Snapshots across 90 days
  console.log("📈 Seeding 90 Days of Daily Performance Snapshots...");
  const snapshotsToInsert = [];
  const nowMs = Date.now();

  for (const st of students) {
    const baseScore = st.groupTier === "excellent" ? 88 : st.groupTier === "medium" ? 68 : 45;
    const isFallingStudent = [23, 24, 25].includes(st.idx);
    const isNewStudent = [29, 30].includes(st.idx); // new students with too little data

    // If new student, only seed 2 days of recent data
    const startDay = isNewStudent ? 2 : 89;

    for (let dayOffset = startDay; dayOffset >= 0; dayOffset--) {
      const date = new Date(nowMs - dayOffset * 86400000).toISOString().slice(0, 10);
      let score = baseScore;

      if (st.idx === 1) {
        // Kasun Mendis: dynamic realistic curve across 90 days for chart inspection
        // Days 89..60: starts at ~82, rises to 87
        // Days 59..40: dips slightly to ~84-85 (challenging mid-term unit)
        // Days 39..15: climbs from 86 to 93
        // Days 14..0: surges to 95, 96, 97 (#1 spot)
        if (dayOffset >= 60) {
          const t = (89 - dayOffset) / 29;
          score = Math.round(82 + t * 5 + (dayOffset % 2 === 0 ? 1 : -1));
        } else if (dayOffset >= 40) {
          const t = (59 - dayOffset) / 19;
          score = Math.round(87 - t * 3 + (dayOffset % 2 === 0 ? 1 : 0));
        } else if (dayOffset >= 15) {
          const t = (39 - dayOffset) / 24;
          score = Math.round(85 + t * 8 + (dayOffset % 3 === 0 ? 1 : -1));
        } else {
          const t = (14 - dayOffset) / 14;
          score = Math.round(93 + t * 4); // 93 up to 97
        }
      } else if (isFallingStudent) {
        // Dramatic declining trend over 90 days: from 75 down to 36
        const progress = (89 - dayOffset) / 89;
        score = Math.round(75 - progress * 39);
      } else {
        // Slight fluctuation
        const jitter = Math.sin(dayOffset / 5) * 4 + (dayOffset % 3 === 0 ? 1 : -1);
        score = Math.min(96, Math.max(25, Math.round(baseScore + jitter)));
      }

      const marksScore = st.idx === 1 ? Math.min(100, score - 1) : Math.min(100, Math.max(20, score + 1));
      const attendanceScore = st.idx === 1 ? 100 : st.groupTier === "excellent" ? 94 : st.groupTier === "medium" ? 82 : 55;
      const group = score >= 75 ? "excellent" : score >= 50 ? "medium" : "weak";

      const events: Array<{ date: string; description: string; type: string }> = [];
      if (st.idx === 1) {
        if (dayOffset === 75) {
          events.push({ date, description: "Mathematics Mid-Term Exam (88%)", type: "assessment" });
        } else if (dayOffset === 50) {
          events.push({ date, description: "Science Electricity Unit Test (84%)", type: "assessment" });
        } else if (dayOffset === 30) {
          events.push({ date, description: "Final Term Mock Test (96%)", type: "assessment" });
        } else if (dayOffset === 14) {
          events.push({ date, description: "Physics Mechanics MCQ Quiz (98%)", type: "assessment" });
        } else if (dayOffset === 7) {
          events.push({ date, description: "Entered Center Top 3", type: "rank" });
        } else if (dayOffset === 1) {
          events.push({ date, description: "Reached #1 in Center Leaderboard!", type: "rank" });
        }
      } else {
        if (dayOffset % 14 === 0) {
          events.push({ date, description: "Assessment submitted: Regular Test", type: "assessment" });
        }
      }

      snapshotsToInsert.push({
        studentId: st.id,
        date,
        period: date,
        score,
        marksScore,
        attendanceScore,
        group,
        countedAssessments: isNewStudent ? 1 : Math.min(12, Math.floor((90 - dayOffset) / 7) + 3),
        countedSessions: isNewStudent ? 2 : Math.min(25, Math.floor((90 - dayOffset) / 3) + 5),
        events,
        computedAt: new Date(nowMs - dayOffset * 86400000),
      });
    }
  }
  await PerformanceSnapshot.insertMany(snapshotsToInsert);

  // 16. Generate Center Leaderboard Snapshot
  console.log("🏆 Generating Center Leaderboard Snapshot...");
  const syncResult = await LeaderboardService.syncLeaderboard(centerId.toString(), "cron");

  // Add some simulated rank movements to the entries for realistic testing
  if (syncResult?.snapshot) {
    const entries = await LeaderboardEntry.find({ snapshotId: syncResult.snapshot._id }).sort({ rank: 1 });
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      // Simulate movement: #1 same, #2 up 1, #3 down 1, #4 new, others slight shift
      let prevRank: number | undefined = undefined;
      if (entry.rank === 1) prevRank = 1;
      else if (entry.rank === 2) prevRank = 3;
      else if (entry.rank === 3) prevRank = 2;
      else if (entry.rank === 4) prevRank = undefined; // new
      else prevRank = entry.rank + (entry.rank % 2 === 0 ? -1 : 1);

      await LeaderboardEntry.updateOne(
        { _id: entry._id },
        { $set: { previousRank: prevRank } }
      );
    }
  }

  console.log("✅ Seeding completed successfully!\n");

  // Print Formatted Credentials Table
  console.log("================================================================================");
  console.log("                     Danuma LMS - DEFAULT LOGIN CREDENTIALS                     ");
  console.log("================================================================================");
  console.log("Role            | Username          | Password        | Description");
  console.log("----------------+-------------------+-----------------+-------------------------");
  console.log("Super Admin     | dev_admin         | Admin@123456    | Full center permissions");
  console.log("Admin           | owner_admin       | Admin@123456    | Center operations owner");
  console.log("Teacher (Math)  | teacher_math      | Teacher@123456  | Samantha Perera");
  console.log("Teacher (Sci)   | teacher_science   | Teacher@123456  | Dr. David Silva");
  console.log("Teacher (Eng)   | teacher_english   | Teacher@123456  | Sarah Jenkins");
  console.log("Staff (Eval 1)  | staff_1           | Staff@123456    | Mark Evaluator");
  console.log("Staff (Eval 2)  | staff_2           | Staff@123456    | Exam Coordinator");
  console.log("Staff (Att)     | staff_3           | Staff@123456    | Attendance Officer");
  console.log("Student (Top)   | student_1         | Student@123456  | Kasun Mendis (Excellent)");
  console.log("Student (Mid)   | student_9         | Student@123456  | Anuki Dissanayake (Good)");
  console.log("Student (Weak)  | student_23        | Student@123456  | Chamikara Dias (Falling)");
  console.log("Student (Weak)  | student_24        | Student@123456  | Dinithi Cooray (Falling)");
  console.log("Student (Weak)  | student_25        | Student@123456  | Gayan Jayatillake (Falling)");
  console.log("================================================================================\n");

  return true;
}

// Auto-run if executed directly via Node
if (typeof process !== "undefined" && process.argv && process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  runSeed().then(() => process.exit(0)).catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  });
}
