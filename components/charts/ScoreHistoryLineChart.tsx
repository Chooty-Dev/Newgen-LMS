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
  studentId?: string;
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
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Score Timeline
        </span>
        <div className="flex items-center gap-1 p-1 rounded-full bg-slate-100 border border-slate-200">
          <button
            type="button"
            onClick={() => setRange("7d")}
            className={cn(
              "px-3.5 py-1 rounded-full text-xs font-bold transition-all",
              range === "7d"
                ? "bg-[#184880] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Last Week
          </button>
          <button
            type="button"
            onClick={() => setRange("30d")}
            className={cn(
              "px-3.5 py-1 rounded-full text-xs font-bold transition-all",
              range === "30d"
                ? "bg-[#184880] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Last Month
          </button>
          <button
            type="button"
            onClick={() => setRange("90d")}
            className={cn(
              "px-3.5 py-1 rounded-full text-xs font-bold transition-all",
              range === "90d"
                ? "bg-[#184880] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
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
          <div className="flex items-center justify-center h-full text-slate-400 text-xs">
            Not enough score history recorded yet.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 15, right: 15, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="displayDate"
                tick={{ fill: "#64748B", fontSize: 11, fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: "#E2E8F0" }}
                dy={8}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fill: "#64748B", fontSize: 11, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                dx={-5}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const dataPoint = payload[0].payload as ScoreHistoryPoint;
                    return (
                      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-md text-xs space-y-1">
                        <span className="font-bold text-slate-500 block">
                          {dataPoint.date}
                        </span>
                        <div className="flex items-center gap-1.5 font-black text-slate-900 text-sm">
                          <span>Score:</span>
                          <span className="text-[#184880]">{dataPoint.score}%</span>
                        </div>
                        {dataPoint.eventText && (
                          <p className="text-[11px] text-slate-500 font-medium">
                            {dataPoint.eventText}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#184880"
                strokeWidth={2.5}
                dot={(props: { cx?: number; cy?: number; payload?: ScoreHistoryPoint }) => {
                  const { cx, cy, payload } = props;
                  if (!cx || !cy || !payload) return null;
                  return (
                    <circle
                      key={`dot-${payload.date}`}
                      cx={cx}
                      cy={cy}
                      r={payload.hasEvent ? 5 : 3.5}
                      fill="#184880"
                      stroke="#FFFFFF"
                      strokeWidth={2}
                    />
                  );
                }}
                activeDot={{
                  r: 6,
                  fill: "#184880",
                  stroke: "#FFFFFF",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Sentence */}
      {history && (
        <div className="pt-2 text-xs font-semibold text-slate-600">
          <span>{history.summarySentence}</span>
        </div>
      )}
    </div>
  );
}
