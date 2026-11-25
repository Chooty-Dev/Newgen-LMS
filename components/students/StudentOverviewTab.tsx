"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Phone,
  ShieldAlert,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScoreHistoryLineChart } from "@/components/charts/ScoreHistoryLineChart";
import {
  StudentDetailRecord,
  formatAssessmentTypeLabel,
  formatClassScheduleSummary,
} from "./studentProfileTypes";

export function StudentOverviewTab({
  student,
  onNavigateTab,
}: {
  student: StudentDetailRecord;
  onNavigateTab: (tab: "analysis" | "marks" | "classes" | "actions") => void;
}) {
  const subjects = [...(student.subjectBreakdown || [])].sort((a, b) => b.average - a.average);
  const bestSubject = subjects[0];
  const lowestSubject = subjects.length > 1 ? subjects[subjects.length - 1] : undefined;
  const att = student.attendanceBreakdown;
  const attendedCount = (att?.presentCount || 0) + (att?.lateCount || 0) + (att?.excusedCount || 0);
  const totalSessions = att?.totalFinalized || 0;
  const recentMarks = student.marks.slice(0, 4);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Row 1: 4 Concise High-Signal KPI Tiles for Teachers */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#F4F8FD] border border-[#DDE8F8] rounded-[24px] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#627D98]">
            <span>Marks Average</span>
            <Award className="size-4 text-[#184880]" />
          </div>
          <p className="text-2xl font-black text-[#0F172A] tabular-nums">
            {student.marksScore !== null && student.marksScore !== undefined
              ? `${student.marksScore}%`
              : "—"}
          </p>
          <p className="text-xs font-medium text-[#627D98]">
            {student.marks.length} assessment(s) recorded
          </p>
        </div>

        <div className="bg-[#EBF3FE] border border-[#DDE8F8] rounded-[24px] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#627D98]">
            <span>Attendance Rate</span>
            <UserCheck className="size-4 text-[#184880]" />
          </div>
          <p className="text-2xl font-black text-[#0F172A] tabular-nums">
            {student.attendanceScore !== null && student.attendanceScore !== undefined
              ? `${student.attendanceScore}%`
              : "—"}
          </p>
          <p className="text-xs font-medium text-[#627D98]">
            {totalSessions > 0
              ? `${attendedCount}/${totalSessions} sessions attended`
              : "No sessions finalized yet"}
          </p>
        </div>

        <div className="bg-white border border-[#DDE8F8] rounded-[24px] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#627D98]">
            <span>Strongest Subject</span>
            <CheckCircle2 className="size-4 text-emerald-600" />
          </div>
          <p className="text-lg font-extrabold text-[#0F172A] truncate">
            {bestSubject ? bestSubject.subject : "Not enough data"}
          </p>
          <p className="text-xs font-semibold text-emerald-700 tabular-nums">
            {bestSubject ? `${bestSubject.average}% avg` : "Awaiting marks"}
          </p>
        </div>

        <div className="bg-white border border-[#DDE8F8] rounded-[24px] p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#627D98]">
            <span>Focus Needed</span>
            <ShieldAlert
              className={cn(
                "size-4",
                lowestSubject && lowestSubject.average < 60 ? "text-rose-600" : "text-[#184880]"
              )}
            />
          </div>
          <p className="text-lg font-extrabold text-[#0F172A] truncate">
            {lowestSubject ? lowestSubject.subject : bestSubject ? "All balanced" : "—"}
          </p>
          <p
            className={cn(
              "text-xs font-semibold tabular-nums",
              lowestSubject && lowestSubject.average < 60 ? "text-rose-600" : "text-[#627D98]"
            )}
          >
            {lowestSubject ? `${lowestSubject.average}% avg` : "No flagged gap"}
          </p>
        </div>
      </section>

      {/* Row 2: Score Trajectory + Teacher Contact & Guardian Card */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-7 bg-white border border-[#DDE8F8] rounded-[26px] p-6 flex flex-col justify-between">
          <ScoreHistoryLineChart studentId={student.id} height={230} />
        </div>

        <div className="lg:col-span-5 bg-white border border-[#DDE8F8] rounded-[26px] p-6 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDE8F8]">
              <h3 className="text-sm font-extrabold text-[#0F172A]">Teacher Quick Info</h3>
              <button
                type="button"
                onClick={() => onNavigateTab("actions")}
                className="text-xs font-bold text-[#184880] hover:underline cursor-pointer"
              >
                Edit Details
              </button>
            </div>

            {/* Guardian Outreach Callout */}
            <div className="p-4 rounded-2xl bg-[#F4F8FD] border border-[#DDE8F8] space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#627D98]">
                Guardian Contact
              </span>
              <p className="text-sm font-extrabold text-[#0F172A]">
                {student.guardian?.name || "Not provided"}
                {student.guardian?.relation ? (
                  <span className="text-xs font-semibold text-[#627D98]">
                    {" "}
                    ({student.guardian.relation})
                  </span>
                ) : null}
              </p>
              {student.guardian?.phone ? (
                <a
                  href={`tel:${student.guardian.phone}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#184880] hover:underline"
                >
                  <Phone className="size-3.5" />
                  <span>{student.guardian.phone}</span>
                </a>
              ) : (
                <p className="text-xs text-[#627D98]">No guardian phone recorded</p>
              )}
            </div>

            {/* Key Student Info Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#F4F8FD] border border-[#DDE8F8]">
                <span className="text-[11px] text-[#627D98] font-semibold block">Admission No</span>
                <span className="font-bold text-[#0F172A] mt-0.5 block">{student.admissionNo}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F4F8FD] border border-[#DDE8F8]">
                <span className="text-[11px] text-[#627D98] font-semibold block">Joined</span>
                <span className="font-bold text-[#0F172A] mt-0.5 block">
                  {new Date(student.joinedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F4F8FD] border border-[#DDE8F8] truncate">
                <span className="text-[11px] text-[#627D98] font-semibold block">Student Phone</span>
                <span className="font-bold text-[#0F172A] mt-0.5 block truncate">
                  {student.phone || "—"}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F4F8FD] border border-[#DDE8F8] truncate">
                <span className="text-[11px] text-[#627D98] font-semibold block">Email</span>
                <span className="font-bold text-[#0F172A] mt-0.5 block truncate">
                  {student.email || "—"}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab("analysis")}
            className="w-full py-3 px-4 rounded-full bg-[#184880] hover:bg-[#184880]/95 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <TrendingUp className="size-4" />
            <span>Open Full Teacher Analysis</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </section>

      {/* Row 3: Subject Snapshot + Recent Results */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6 bg-white border border-[#DDE8F8] rounded-[26px] p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#DDE8F8]">
            <h3 className="text-sm font-extrabold text-[#0F172A]">Subject Performance</h3>
            <span className="text-xs font-semibold text-[#627D98]">
              {subjects.length} subject(s)
            </span>
          </div>

          {subjects.length === 0 ? (
            <p className="text-xs text-[#627D98] py-6 text-center">
              Subject averages appear once assessments are graded.
            </p>
          ) : (
            <div className="space-y-3.5">
              {subjects.map((sub) => (
                <div key={sub.subject} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[#0F172A]">{sub.subject}</span>
                    <span className="text-[#184880] tabular-nums">{sub.average}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#EBF3FE] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#184880] rounded-full"
                      style={{ width: `${Math.min(100, sub.average)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 bg-white border border-[#DDE8F8] rounded-[26px] p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#DDE8F8]">
            <h3 className="text-sm font-extrabold text-[#0F172A]">Recent Results</h3>
            <button
              type="button"
              onClick={() => onNavigateTab("marks")}
              className="text-xs font-bold text-[#184880] hover:underline cursor-pointer"
            >
              View All ({student.marks.length})
            </button>
          </div>

          {recentMarks.length === 0 ? (
            <p className="text-xs text-[#627D98] py-6 text-center">No assessment marks yet.</p>
          ) : (
            <div className="divide-y divide-[#DDE8F8]/70">
              {recentMarks.map((m) => (
                <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-[#0F172A] truncate">
                      {m.assessmentTitle}
                    </p>
                    <p className="text-[11px] text-[#627D98] truncate">
                      {m.subject || formatAssessmentTypeLabel(m.type)} •{" "}
                      {new Date(m.evaluatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-xs font-bold text-[#0F172A] tabular-nums">
                      {m.score}/{m.totalMarks}
                    </span>
                    <span className="size-7 rounded-full bg-[#EBF3FE] text-[#184880] border border-[#DDE8F8] inline-flex items-center justify-center text-[11px] font-black">
                      {m.grade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function StudentClassesTab({ student }: { student: StudentDetailRecord }) {
  const enrollments = student.enrollments || [];

  if (enrollments.length === 0) {
    return (
      <div className="bg-white border border-[#DDE8F8] rounded-[26px] p-12 text-center space-y-2">
        <BookOpen className="size-10 mx-auto text-[#184880]/40" />
        <h3 className="text-sm font-extrabold text-[#0F172A]">No Enrolled Classes</h3>
        <p className="text-xs text-[#627D98]">
          Use the Actions tab to enroll this student in an active class batch.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-200">
      {enrollments.map((item) => (
        <Link
          key={item.id}
          href={`/classes/${item.slug || item.classId}`}
          className="group bg-white border border-[#DDE8F8] hover:border-[#184880]/45 rounded-[24px] p-5 flex flex-col justify-between gap-4 transition-all"
        >
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EBF3FE] text-[#184880] border border-[#DDE8F8] truncate max-w-[165px]">
                {item.subject && item.subject !== "-" ? item.subject : item.grade || "Class"}
              </span>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize border",
                  item.status === "active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-rose-50 text-rose-700 border-rose-200"
                )}
              >
                {item.status}
              </span>
            </div>

            <h3 className="text-base font-extrabold text-[#0F172A] group-hover:text-[#184880] transition-colors line-clamp-2">
              {item.className}
            </h3>

            <div className="space-y-1 text-xs text-[#627D98]">
              {item.teacher && item.teacher !== "-" && (
                <p className="font-semibold text-[#0F172A]/80">Instructor: {item.teacher}</p>
              )}
              <p className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5 text-[#184880]" />
                <span>{formatClassScheduleSummary(item.schedule)}</span>
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-[#DDE8F8] flex items-center justify-between text-xs">
            <span className="text-[#627D98] inline-flex items-center gap-1">
              <Calendar className="size-3" />
              <span>Joined {new Date(item.enrolledAt).toLocaleDateString()}</span>
            </span>
            <span className="font-bold text-[#184880] inline-flex items-center gap-1">
              <span>Open</span>
              <ExternalLink className="size-3" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export function StudentMarksTab({ student }: { student: StudentDetailRecord }) {
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const marks = student.marks || [];

  const filteredMarks = marks.filter((m) => {
    if (typeFilter === "all") return true;
    if (typeFilter === "test") return m.type === "test" || m.type === "mcq_quiz";
    return m.type === typeFilter;
  });

  const avgPct =
    marks.length > 0
      ? Math.round(marks.reduce((sum, m) => sum + (m.percentage || 0), 0) / marks.length)
      : 0;
  const highestPct =
    marks.length > 0 ? Math.max(...marks.map((m) => m.percentage || 0)) : 0;
  const passCount = marks.filter((m) => (m.percentage || 0) >= 35).length;
  const passRate = marks.length > 0 ? Math.round((passCount / marks.length) * 100) : 0;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-[#F4F8FD] border border-[#DDE8F8] rounded-[22px] p-4">
          <span className="text-[11px] font-bold text-[#627D98] block">Assessments</span>
          <span className="text-xl font-black text-[#0F172A] tabular-nums">{marks.length}</span>
        </div>
        <div className="bg-[#EBF3FE] border border-[#DDE8F8] rounded-[22px] p-4">
          <span className="text-[11px] font-bold text-[#627D98] block">Average Score</span>
          <span className="text-xl font-black text-[#184880] tabular-nums">
            {marks.length > 0 ? `${avgPct}%` : "—"}
          </span>
        </div>
        <div className="bg-white border border-[#DDE8F8] rounded-[22px] p-4">
          <span className="text-[11px] font-bold text-[#627D98] block">Highest Score</span>
          <span className="text-xl font-black text-[#0F172A] tabular-nums">
            {marks.length > 0 ? `${highestPct}%` : "—"}
          </span>
        </div>
        <div className="bg-white border border-[#DDE8F8] rounded-[22px] p-4">
          <span className="text-[11px] font-bold text-[#627D98] block">Pass Rate</span>
          <span className="text-xl font-black text-emerald-700 tabular-nums">
            {marks.length > 0 ? `${passRate}%` : "—"}
          </span>
        </div>
      </div>

      {/* Filter Pills + Marks Card List */}
      <div className="bg-white border border-[#DDE8F8] rounded-[26px] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#DDE8F8]">
          <h3 className="text-sm font-extrabold text-[#0F172A]">Assessment Scores</h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All" },
              { id: "exam", label: "Exams" },
              { id: "test", label: "Tests & Quizzes" },
              { id: "paper", label: "Papers" },
              { id: "assignment", label: "Assignments" },
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setTypeFilter(pill.id)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer",
                  typeFilter === pill.id
                    ? "bg-[#184880] text-white"
                    : "bg-[#F4F8FD] text-[#627D98] hover:text-[#0F172A] border border-[#DDE8F8]"
                )}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {filteredMarks.length === 0 ? (
          <p className="text-xs text-[#627D98] py-10 text-center">
            No recorded marks found for this filter.
          </p>
        ) : (
          <div className="divide-y divide-[#DDE8F8]/80">
            {filteredMarks.map((m) => (
              <div
                key={m.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF3FE] text-[#184880] border border-[#DDE8F8]">
                      {formatAssessmentTypeLabel(m.type)}
                    </span>
                    <Link
                      href={`/exams/${m.assessmentSlug || m.assessmentId}`}
                      className="text-sm font-extrabold text-[#0F172A] hover:text-[#184880] transition-colors inline-flex items-center gap-1 truncate"
                    >
                      <span>{m.assessmentTitle}</span>
                      <ExternalLink className="size-3 shrink-0 text-[#627D98]" />
                    </Link>
                  </div>
                  <p className="text-xs text-[#627D98]">
                    {m.subject && m.subject !== "-" ? `${m.subject} • ` : ""}
                    {new Date(m.evaluatedAt).toLocaleDateString()}
                    {m.attendanceStatus === "absent" ? " • Absent" : ""}
                    {m.feedback ? ` • “${m.feedback}”` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                  <div className="w-24 hidden md:block">
                    <div className="h-1.5 w-full bg-[#EBF3FE] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#184880] rounded-full"
                        style={{ width: `${Math.min(100, m.percentage)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right min-w-[64px]">
                    <span className="text-sm font-extrabold text-[#0F172A] block tabular-nums">
                      {m.score} / {m.totalMarks}
                    </span>
                    <span className="text-[11px] font-semibold text-[#627D98] tabular-nums">
                      {m.percentage}%
                    </span>
                  </div>
                  <span className="size-9 rounded-full bg-[#EBF3FE] text-[#184880] border border-[#DDE8F8] inline-flex items-center justify-center font-black text-xs">
                    {m.grade}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
