# Comprehensive Teacher Side Audit Report

**Date:** 2026-11-23  
**System:** Danuma LMS / Newgen-LMS  
**Target:** Teacher Portal (Roles, Policies, Navigation, Views, Backend Services, Integrity)

---

## 1. Executive Summary & Teacher Scope

In accordance with system specifications, the Teacher Portal must strictly scope all data to the authenticated teacher's **own classes**, the **exams/tests of those classes**, and the **students enrolled in those classes** (plus any students created by that teacher). A teacher must not have access to any other teacher's data, center-wide administration tools, or staff-exclusive functions.

### Allowed Teacher Pages (Sidebar):
1. **Dashboard** (`/dashboard`)
2. **Marks** (`/marks`)
3. **Analysis** (`/analysis`)
4. **Classes** (`/classes`)
5. **Exams & Tests** (`/exams`)
6. **Subjects** (`/subjects`)
7. **Announcements** (`/announcements`)
8. **Students** (`/students`)
9. **Staff Members** (`/staff`)
10. **Leaderboard** (`/leaderboard`)
11. **Settings** (`/settings`)

---

## 2. Page-by-Page Audit Table

| Feature / Page | Expected Behavior | Status | Root Cause | Planned Fix |
|---|---|---|---|---|
| **Sidebar / Navigation** (`TeacherShell.tsx`) | Exactly 11 pages: Dashboard, Marks, Analysis, Classes, Exams & Tests, Subjects, Announcements, Students, Staff Members, Leaderboard, Settings. | Broken / Wrong data | Marks, Subjects, and Staff are missing from `TeacherShell.tsx`; unauthorized Schedule (`/attendance`) and Security (`/security`) are present. | Update `TeacherShell.tsx` navigation items to exactly match the 11 allowed routes. Remove Schedule and Security. |
| **Dashboard - Analytics Data Scoping** (`/dashboard`) | Summary stats and charts must strictly represent the teacher's enrolled students and assigned classes. | Broken / Wrong data | `getTeacherAnalytics` in `modules/analysis/service.ts` queries all students in the center without filtering by teacher's classes. Falls back to mock data (`snap?.score ?? 68`, mock weekly arrays). | Update `getTeacherAnalytics(centerId, teacherId)` to strictly query teacher's classes and enrolled students. Remove all mock data fallbacks. |
| **Dashboard - Low Performing Students** (`/dashboard`) | List weak students (score < 55) sorted lowest score first: name, grade, class, score. | Missing | `TeacherDashboardView.tsx` defines the interface property but does not render the dedicated Low-Performing Students table. | Implement the Low-Performing Students widget matching the design language. |
| **Dashboard - Top Ranking Students** (`/dashboard`) | List top performing students sorted highest score first with rank and class. | Missing | Not rendered in `TeacherDashboardView.tsx`. | Add recent highest-ranking students list to Dashboard. |
| **Dashboard - Treemap / Distribution** (`/dashboard`) | Treemap or grouped cards of Weak vs Medium vs Excellent students with real counts. | Wrong data | `TeacherDashboardView.tsx` renders a custom concentric SVG ring rather than the specified Treemap / Distribution component. | Render Treemap component with real counts from teacher's students. |
| **Dashboard - Low Performers Trend Chart** (`/dashboard`) | Area/line chart showing performance trend across recent weeks for the 3 lowest performing students with labeled axes and legend. | Missing | `TeacherDashboardView.tsx` currently only renders teaching hours bar chart; multi-series student trend chart is missing. | Add multi-line/area chart for the 3 lowest performing students with proper axes and legend. |
| **Dashboard - Teacher Profile Card** (`/dashboard`) | Profile card displaying teacher account age, class average score, and overall result. | Missing | Not present in `TeacherDashboardView.tsx`. | Add teacher profile statistics card. |
| **Marks - Navigation & Scope** (`/marks`) | View teacher's students only with search, class filter, and detailed marks tabs (Subjects, Exams, Tests + type filter). | Broken / Missing | `TeacherMarksView.tsx` only has student dropdown and flat list. Has unauthorized link to `/evaluate-marks`. | Remove `/evaluate-marks` link. Add class filter and tabbed results breakdown (Subjects, Exams, Tests) with type filtering. |
| **Analysis - Filtering & Selection** (`/analysis`) | Student list with search, class filter, group filter (Weak, Medium, Excellent). URL `?studentId=` preselection. | Broken / Missing | `TeacherAnalysisView.tsx` lacks class filter and group filter. Does not read `searchParams.get("studentId")`. | Add class filter, group filter chips, and URL search param auto-selection. Ensure AI guidance uses `computeStudentScore`. |
| **Classes - Listing & Filters** (`/classes`) | Server-side search, type filter (regular/special), subject, day, status, with real aggregate counts. | Working | Client-side filtering in some components; pagination missing on large sets. | Implement full server-side query params, debounced search, and URL state synchronization. |
| **Classes - Modals to Details Page** (`/classes`) | Class creation redirects to `/classes/[slug]?tab=students`. Manage/Enroll clicks open details page. | Missing | No `/classes/[slug]` page exists. Currently uses giant dialog modals. `ClassModel` lacks `slug` field. | Add `slug` index to `ClassModel`. Create `/classes/[slug]` with Overview, Students, Staff, Exams & Tests, Announcements tabs. |
| **Classes - Delete Rules** (`/classes`) | Soft-delete class, set status to `ended`, mark enrollments as `left`. Show impact dialog ("X students enrolled, Y exams linked"). | Broken | `ClassService.deleteClass` soft-deletes class but leaves enrollments as active; no impact warning. | Update `deleteClass` to transition active enrollments to `left` and show student/exam impact in ConfirmDialog. |
| **Exams & Tests - Listing & Filters** (`/exams`) | List exams for teacher's classes with type, subject, class, status filters. Auto status transitions. | Working | Server-side filters need TanStack Query invalidation on mutations. | Ensure query invalidation across affected lists and stats. |
| **Exams & Tests - Details Page** (`/exams`) | Create redirects to `/exams/[slug]?tab=staff`. Details page with Overview, Classes, Staff, Results tabs. | Missing | No `/exams/[slug]` page exists. `Assessment` schema lacks `slug` field. | Add `slug` to `Assessment`. Create `/exams/[slug]` with required tabs. |
| **Exams & Tests - Delete Rules** (`/exams`) | Soft delete with warning/impact if marks are already submitted. | Broken | `deleteAssessment` does not check for submitted marks. | Add submitted marks validation and warning in confirm dialog before soft deletion. |
| **Subjects - Teacher View** (`/subjects`) | Search, filters, summary stats, create, update, delete with reference integrity check. | Wrong data / Broken | Teacher is served generic admin table. Deleting subject does not check if used by classes/assessments. | Create dedicated `TeacherSubjectsView`. Block subject deletion if referenced by any class or assessment with friendly error. |
| **Announcements - Audience Validation** (`/announcements`) | Teacher can broadcast to center or one/more of their own classes. Validate class ownership. | Broken | `createAnnouncement` allows teacher to supply arbitrary `classIds` without checking ownership. Only 1 class selectable in UI. | Validate that all selected `classIds` belong to the teacher. Support multi-select class audience in UI. |
| **Students - Listing & Details Page** (`/students`) | Filter by class, status, group. Create shows temporary password once (`mustChangePassword: true`). Details page `/students/[username]`. | Missing | No `/students/[username]` page exists. Currently uses modal. Cross-teacher student mutation vulnerability. | Create `/students/[username]` with Overview, Classes, Marks, Analysis, Account tabs. Implement `canAccessStudent` policy. |
| **Students - Delete Rules** (`/students`) | Soft delete, account disabled, sessions revoked, active enrollments marked `left`. | Broken | `softDeleteUser` revokes sessions and disables user but leaves active enrollments intact in MongoDB. | Update `softDeleteUser` to transition all active enrollments to `left` with timestamp. |
| **Staff Members - Teacher View & Details** (`/staff`) | Teacher-themed view. Search, filters, summary, assign to classes/exams. Details page `/staff/[username]`. | Wrong data / Missing | Served generic admin table without Teacher layout. No `/staff/[username]` page exists. | Create `TeacherStaffView` matching banner/stats design. Create `/staff/[username]` with Overview, Classes, Exams tabs. |
| **Staff Members - Delete Rules** (`/staff`) | Blocked if staff has unfinished evaluations; otherwise remove from class/assessment assignments. | Broken | Deleting staff does not check unfinished marks evaluations or remove staff from class `staffIds` and assessment `evaluatorIds`. | Implement guard in `UserService.softDeleteUser`: block if pending evaluations exist, otherwise prune references. |
| **Leaderboard** (`/leaderboard`) | Top 10 list with podium, rows, grade filter, last sync time. Click to view student analysis. No Sync button for teacher. | Working | Analysis link did not pre-select student in Analysis view due to missing URL param listener. | Wire query parameter handling in `TeacherAnalysisView` so clicking leaderboard external link opens analysis seamlessly. |
| **Settings** (`/settings`) | Update own profile (name, photo, phone, social links), change password, view active sessions. | Working | UI and mutations working properly. | Ensure responsive layout and toast feedback. |

---

## 3. Unauthorized Items on the Teacher Side (To Be Removed)

1. **Schedule / Attendance Navigation**: Remove `/attendance` from Teacher sidebar in `TeacherShell.tsx`.
2. **Security Tab in TeacherShell**: Remove `/security` from `TeacherShell.tsx` account menu (credential management belongs inside `/settings`).
3. **Staff-Exclusive "Evaluate Marks" Link**: Remove link to `/evaluate-marks` in `TeacherMarksView.tsx`.
4. **Attendance Action Shortcuts**: Remove `/attendance` quick-action buttons from Teacher Views where attendance is a staff responsibility.
5. **Center-Wide Administrative Tools**: Verify and ensure routes `/teachers`, `/admins`, `/centers`, `/system-settings`, `/permissions`, `/audit-trail` strictly deny access to teachers (403 Forbidden).
6. **Other Teachers' Data**: Ensure all endpoints filter by `teacherId` so teachers cannot view or mutate other teachers' classes, exams, or students.

---

## 4. Modals to be Converted into Details Pages

| Entity | Route | URL Identifier | Tabs Required |
|---|---|---|---|
| **Class** | `/classes/[slug]` | Unique slug (e.g. `grade-11-mathematics-k8x2`) | **Overview**, **Students**, **Staff**, **Exams & Tests**, **Announcements** |
| **Exam / Test** | `/exams/[slug]` | Unique slug (e.g. `term-1-mid-exam-p4q9`) | **Overview**, **Classes**, **Staff**, **Results** |
| **Student** | `/students/[username]` | Username (e.g. `kasun-perera`) | **Overview**, **Classes**, **Marks**, **Analysis**, **Account** |
| **Staff Member** | `/staff/[username]` | Username (e.g. `nimali-evaluator`) | **Overview**, **Classes**, **Exams & Tests** |

*All details pages will support old ID resolution and redirect to slug/username, store active tab in URL `?tab=`, include back button, loading skeletons, and responsive layout matching the Danuma LMS design.*

---

## 5. Relation & Data Integrity Issues

1. **Missing Slugs**: `ClassModel` and `Assessment` do not have a `slug` field. Slugs must be generated on creation (kebab-case name + nanoid) and indexed with unique constraints.
2. **Policy Scope Vulnerability (`canAccessStudent`)**: `core/rbac/policies.ts` only checks `ROLE_RANK` when mutating users. A teacher could mutate or delete students from another teacher's class. A new policy `canAccessStudent(actor, studentId)` must be enforced across all student endpoints.
3. **Assessment Class Scoping**: `createAssessment` and `updateAssessment` must verify that all linked `classIds` belong to the teacher.
4. **Delete Cascade & Soft Delete Rules**:
   - Class deletion: mark enrollments as `left`.
   - Student deletion: disable user, revoke sessions, mark enrollments as `left`.
   - Subject deletion: block if referenced by active classes or assessments.
   - Staff deletion: block if active pending evaluations exist, prune from `staffIds` and `evaluatorIds`.
5. **Seed Data Incompleteness**: Currently the seeded teacher `Samantha Perera` only has 1 regular class and lacks special classes, multiple exam types, and realistic score histories.

---

## 6. Execution Plan

- **Phase 1: Backend Scoping, Policies, Slugs & Delete Rules**
  - Add `slug` to `ClassModel` and `Assessment`. Add slug generation helper.
  - Implement `canAccessStudent` in `core/rbac/policies.ts`.
  - Implement delete rules (subject guard, staff evaluation guard, enrollment cascading).
  - Scope `getTeacherAnalytics` strictly to teacher's enrolled students.
  - Fix student and class resolution by slug/username or Mongo ID.

- **Phase 2: Data Fetching, Invalidation & Page Checks**
  - Server-side pagination, search debouncing, URL sync for all filters.
  - Correct TanStack Query cache invalidations across lists and stats.
  - Remove all mock data fallbacks.

- **Phase 3: Convert Modals to Dedicated Details Pages with Tabs**
  - Build `/classes/[slug]` (Overview, Students, Staff, Exams, Announcements).
  - Build `/exams/[slug]` (Overview, Classes, Staff, Results).
  - Build `/students/[username]` (Overview, Classes, Marks, Analysis, Account).
  - Build `/staff/[username]` (Overview, Classes, Exams & Tests).
  - Update creation workflows to redirect to details pages.

- **Phase 4: Remove Unauthorized Items & Align Design**
  - Align `TeacherShell.tsx` to exact 11 pages.
  - Remove evaluate-marks and attendance references from teacher views.
  - Implement `TeacherSubjectsView` and `TeacherStaffView`.
  - Align Dashboard widgets (low performers, top rankers, treemap, 3-student trend chart, profile card).

- **Phase 5: Tests, Seed Enhancement & Final Verification**
  - Enhance `scripts/seed.ts` with comprehensive teacher dataset.
  - Add Vitest tests for slugs, teacher policies, delete rules, and teacher flow.
  - Verify zero TypeScript errors and successful production build.
