# Danuma LMS — Student Management & Analysis System

A comprehensive, production-quality education management platform built for modern learning centers. Danuma LMS provides fine-grained multi-role access control, fast keyboard-driven marks evaluation, real-time attendance tracking with automated absence resolution, and an advanced performance analysis engine that translates quantitative academic data into plain-language explanations.

---

## 1. System Architecture & Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4 (`@theme inline`), customized shadcn/ui component system
- **Design System**: Strict 4-tone monochromatic purple palette (Dark: `#635985`, `#443C68`, `#393053`, `#18122B`; Light: `#DBD8E3`, `#5C5470`, `#352F44`, `#2A2438`). No arbitrary hex codes or default Tailwind hues in components.
- **Typography**: Poppins font everywhere via `next/font/google` (`tabular-nums` for numbers; no monospace fonts).
- **Component Design**: `rounded-full` buttons (min `h-12`), `rounded-3xl` cards/dialogs/sheets, plain Lucide icons without background badges.
- **Database**: MongoDB with Mongoose (typed schemas, explicit compound indexes, connection pooling with automatic `mongodb-memory-server` fallback).
- **Authentication**: `jose` signed HTTP-only JWT cookies with sliding idle session timeouts (15m) and absolute expiry (12h). Passwords hashed using `bcryptjs` (cost 12).
- **RBAC**: Multi-role permission catalog (66 permissions) with role hierarchy, cached permission resolution (30s TTL), and Super Admin exclusive immunity.
- **Data Tables & Fetching**: TanStack Query v5 for client queries/mutations, TanStack Table v8 for responsive data tables (stacked cards on mobile).
- **Charts**: Recharts (Area charts, Treemaps, Bar charts) rendered using CSS variable chart tokens.
- **Testing**: Vitest unit and integration test suite.

---

## 2. User Roles & Access Hierarchy

The system supports five distinct user roles with unified routes and role-tailored views:

1. **Super Admin**: Full unrestricted access across all modules, center configuration, security controls, center-wide session revoking, role permission editing, and full audit logs.
2. **Admin**: Center manager who can manage teachers, staff, students, subjects, classes, exams, attendance, and center settings.
3. **Teacher**: Academic faculty who can create and manage their own classes, schedule exams/tests, review student marks across subjects/exams/tests, and inspect detailed analysis.
4. **Staff**: Administrative coordinators and evaluators who can conduct rapid keyboard mark evaluations, schedule/finalize attendance sessions, and manage daily operations.
5. **Student**: Self-service portal to view academic marks breakdown, subject trends, personal performance score, strengths & weaknesses, and recommended next steps.

---

## 3. Quick Start & Setup

### 3.1 Prerequisites
- Node.js 20+ (Node 22 or 26 recommended)
- MongoDB instance running locally on `mongodb://localhost:27017/newgen_lms` (or let the built-in memory server fallback run automatically).

### 3.2 Installation
```bash
# Clone and enter directory
cd Newgen-LMS

# Install dependencies
npm install --legacy-peer-deps

# Configure environment variables
cp .env.example .env.local
```

### 3.3 Database Seeding
Run the deterministic seed script to populate a complete center, all five roles, subjects, classes, 30 students, 12 assessments, marks, attendance, and historical snapshots:
```bash
npm run seed
```

### 3.4 Development Server
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Default Seed Credentials

All accounts are pre-seeded and ready for instant testing:

| Role | Username | Password | Notes |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `dev_admin` | `Admin@123456` | Full center permissions |
| **Admin** | `owner_admin` | `Admin@123456` | Center operations manager |
| **Teacher (Math)** | `teacher_math` | `Teacher@123456` | Samantha Perera |
| **Teacher (Science)** | `teacher_science` | `Teacher@123456` | Dr. David Silva |
| **Teacher (English)** | `teacher_english` | `Teacher@123456` | Sarah Jenkins |
| **Staff (Evaluator 1)** | `staff_1` | `Staff@123456` | Lead Mark Evaluator |
| **Staff (Coordinator)** | `staff_2` | `Staff@123456` | Exam Coordinator |
| **Staff (Attendance)** | `staff_3` | `Staff@123456` | Attendance Officer |
| **Student (Excellent)** | `student_1` | `Student@123456` | Kasun Mendis (Score: ~88%) |
| **Student (Good)** | `student_9` | `Student@123456` | Anuki Dissanayake (Score: ~65%) |
| **Student (Declining)** | `student_23` | `Student@123456` | Chamikara Dias (Falling trend) |
| **Student (Declining)** | `student_24` | `Student@123456` | Dinithi Cooray (Falling trend) |
| **Student (Declining)** | `student_25` | `Student@123456` | Gayan Jayatillake (Falling trend) |

---

## 5. Automated Tests

The test suite covers the mathematical analysis engine, linear regression slope calculation, RBAC resolution, hierarchy policies, and attendance auto-absent logic:

```bash
# Run all unit and integration tests
npm run test

# Run type check and lint
npx tsc --noEmit && npm run lint
```

---

## 6. Key Features & Workflows

### 6.1 Performance Analysis & Score Engine
- **Single Source of Truth**: All scores, historical snapshots, score explanations, and rankings pass through `computeStudentScore()` in `modules/analysis/engine/score.ts`.
- **Formula**: `Score = (Marks Score × 75%) + (Attendance Score × 25%)` (weights editable in System Settings).
- **Marks Calculation**: Evaluates submitted, non-deleted assessments in active enrolled classes. Uses weighted averages per subject (Exam: 3, Test: 2, Paper: 2, MCQ Quiz: 1, Assignment: 1). Marks score is the simple average of subject scores.
- **Attendance Calculation**: Evaluates finalized sessions (`present` = 1, `late` = 0.5, `absent` = 0, `excused` sessions ignored). Attendance score = (earned points / counted sessions) × 100.
- **Rule-Based Smart Messages**: A deterministic, positive message engine in `modules/analysis/messages/index.ts` creates child-friendly greetings, daily focus tips, and actionable advice without using banned words (e.g. failing, bad, weak, poor, at risk, lazy).

---

## 7. Background Jobs & Cron Tasks

The system includes pre-configured HTTP endpoints for scheduled cron execution (protected by `Authorization: Bearer <CRON_SECRET>`):

1. **Daily Performance Snapshot Job**: `GET /api/cron/performance`
   - **Schedule**: Daily at 00:00 (center timezone).
   - Computes fresh daily performance snapshots (`PerformanceSnapshot`) for every active student, persisting marks score, attendance score, total score, and daily events.
2. **Daily Center Leaderboard Sync**: `GET /api/cron/leaderboard`
   - **Schedule**: Daily at 00:30 (center timezone, immediately after the performance job).
   - Recalculates center-wide student rankings and creates the daily `LeaderboardSnapshot` and `LeaderboardEntry` records.
   - Eligibility: Students with at least 3 submitted assessments and 5 finalized attendance sessions.
   - 5 Tie-Breakers (in order): higher score, higher marks score, higher attendance score, more assessments, alphabetical name.
3. **Auto Absent Finalizer**: `GET /api/cron/finalize-attendance`
   - **Schedule**: Nightly at 23:45.
   - Scans unfinalized attendance sessions for past dates, marks remaining unmarked enrolled students as absent, and marks the session as finalized.
