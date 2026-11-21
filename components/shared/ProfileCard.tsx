import * as React from "react";
import { Card } from "@/components/ui/card";
import { UserRole } from "@/core/rbac/permissions";
import { Link as LinkIcon, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProfileCardData {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  joinedAt?: string | Date;
  score?: number;
  scoreLabel?: string;
  metricTitle?: string;
  socialLinks?: Array<{ platform: string; url: string }>;
  email?: string;
  phone?: string;
  className?: string;
}

export function ProfileCard({
  name,
  role,
  joinedAt,
  score,
  scoreLabel,
  metricTitle,
  socialLinks = [],
  email,
  phone,
  className,
}: ProfileCardData) {
  const getAccountAge = (date?: string | Date) => {
    if (!date) return "Active member";
    const start = new Date(date);
    const now = new Date();
    const diffMonths = Math.max(
      1,
      (now.getFullYear() - start.getFullYear()) * 12 +
        (now.getMonth() - start.getMonth())
    );
    if (diffMonths < 12) {
      return `Member for ${diffMonths} ${diffMonths === 1 ? "month" : "months"}`;
    }
    const years = Math.floor(diffMonths / 12);
    return `Member for ${years} ${years === 1 ? "year" : "years"}`;
  };

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleDisplay = role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const resolvedMetricTitle =
    metricTitle ||
    (role === "student"
      ? "Performance Score"
      : role === "teacher"
      ? "Class Average"
      : role === "staff"
      ? "Tasks Completed"
      : "Center Average");

  return (
    <Card className={cn("rounded-3xl p-6 md:p-8 border-border bg-card shadow-sm", className)}>
      <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div className="size-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold ring-4 ring-border shrink-0 shadow-md">
            {initials}
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
              {name}
            </h2>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground font-medium">
              <span className="text-foreground font-semibold">{roleDisplay}</span>
              <span>•</span>
              <span>{getAccountAge(joinedAt)}</span>
            </div>

            {(email || phone) && (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-sm text-muted-foreground">
                {email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="size-4" />
                    {email}
                  </span>
                )}
                {phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-4" />
                    {phone}
                  </span>
                )}
              </div>
            )}

            {socialLinks.length > 0 && (
              <div className="flex items-center justify-center sm:justify-start gap-3 pt-2 text-muted-foreground">
                {socialLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground transition-colors p-1"
                    aria-label={link.platform}
                  >
                    <LinkIcon className="size-5" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {score !== undefined && (
          <div className="flex flex-col items-center sm:items-end justify-center rounded-3xl bg-muted/40 border border-border p-5 text-center sm:text-right min-w-[160px]">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {resolvedMetricTitle}
            </span>
            <div className="text-3xl font-bold text-foreground tabular-nums my-1">
              {role === "staff" ? `${score}%` : `${score}/100`}
            </div>
            {scoreLabel && (
              <span className="inline-block rounded-full bg-card px-3 py-0.5 text-xs font-semibold text-foreground border border-border">
                {scoreLabel}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
