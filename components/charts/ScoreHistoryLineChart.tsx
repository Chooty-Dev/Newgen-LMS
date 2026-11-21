"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface ScoreHistoryPoint {
  date: string;
  displayDate: string;
  score: number;
  hasEvent: boolean;
  eventText?: string;
}

interface ScoreHistoryResponse {
  points: ScoreHistoryPoint[];
  diff: number;
  summarySentence: string;
  currentScore: number;
  range: string;
}

interface ScoreHistoryLineChartProps {
  studentId?: string; // omit or "me" for logged-in student
  className?: string;
  height?: number;
}

export function ScoreHistoryLineChart({
  studentId = "me",
  className,
  height = 240,
}: ScoreHistoryLineChartProps) {
  const [range, setRange] = React.useState<"7d" | "30d" | "90d">("30d");

  const { data, isLoading } = useQuery<{ data: ScoreHistoryResponse }>({
    queryKey: ["score-history", studentId, range],
    queryFn: async () => {
      const res = await fetch(`/api/v1/students/${studentId}/score-history?range=${range}`);
      if (!res.ok) throw new Error("Failed to load score history");
      return res.json();
    },
  });

  const history = data?.data;
  const points = history?.points || [];

  return (
    <div className={cn("space-y-4 flex flex-col justify-between", className)}>
      {/* Top Filter Buttons */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-sm font-semibold text-muted-foreground">
          Score Timeline
        </span>
        <div className="flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border">
          <button
            type="button"
            onClick={() => setRange("7d")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
              range === "7d"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Last Week
          </button>
          <button
            type="button"
            onClick={() => setRange("30d")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
              range === "30d"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Last Month
          </button>
          <button
            type="button"
            onClick={() => setRange("90d")}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
              range === "90d"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Last 3 Months
          </button>
        </div>
      </div>

      {/* Line Chart */}
      <div style={{ height }} className="w-full relative">
        {isLoading ? (
          <Skeleton className="w-full h-full rounded-2xl" />
        ) : points.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Not enough score history recorded yet.
          </div>
        ) : (
          <>
            <span className="sr-only">
              Score history line chart showing daily scores over {range}. {history?.summarySentence}
            </span>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 15, right: 15, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="displayDate"
                  stroke="var(--muted-foreground)"
                  fontSize={13}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: "Day",
                    position: "insideBottom",
                    offset: -12,
                    fontSize: 12,
                    fill: "var(--muted-foreground)",
                  }}
                />
                <YAxis
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  stroke="var(--muted-foreground)"
                  fontSize={13}
                  tickLine={false}
                  axisLine={false}
                  label={{
                    value: "My score (out of 100)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 20,
                    fontSize: 12,
                    fill: "var(--muted-foreground)",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: "1.2rem",
                    color: "var(--foreground)",
                    fontSize: "0.875rem",
                    padding: "0.75rem 1rem",
                  }}
                  formatter={(val: unknown) => [`${val} out of 100`, "Score"]}
                  labelFormatter={(lbl: React.ReactNode, payload: readonly { payload?: ScoreHistoryPoint }[]) => {
                    const item = payload?.[0]?.payload;
                    if (item?.eventText) {
                      return `${item.displayDate} • ${item.eventText}`;
                    }
                    return `${lbl}`;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  name="Score"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={(props: { cx?: number; cy?: number; payload?: ScoreHistoryPoint }) => {
                    if (props.payload?.hasEvent) {
                      return (
                        <circle
                          key={props.payload.date}
                          cx={props.cx}
                          cy={props.cy}
                          r={5}
                          fill="var(--primary)"
                          stroke="var(--background)"
                          strokeWidth={2}
                        />
                      );
                    }
                    return <g key={props.payload?.date || (props.cx !== undefined ? `${props.cx}-${props.cy}` : "dot")} />;
                  }}
                  activeDot={{ r: 6, fill: "var(--primary)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* Friendly summary sentence */}
      {history && (
        <p className="text-sm font-medium text-foreground pt-1">
          {history.summarySentence}
        </p>
      )}
    </div>
  );
}
