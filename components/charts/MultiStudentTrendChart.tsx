"use client";

import * as React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface LowStudentTrend {
  id: string;
  name: string;
  history: Array<{ period: string; score: number }>;
}

const LINE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function MultiStudentTrendChart({ students }: { students: LowStudentTrend[] }) {
  // Pivot data so periods are rows and student names are columns
  const periods = students[0]?.history.map((h) => h.period) || [];
  const chartData = periods.map((period, pIdx) => {
    const row: Record<string, string | number> = { period };
    students.forEach((st) => {
      row[st.name] = st.history[pIdx]?.score ?? 0;
    });
    return row;
  });

  return (
    <div className="h-80 w-full relative">
      <span className="sr-only">
        Multi-student trend chart showing individual performance scores over time.
      </span>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="period"
            stroke="var(--muted-foreground)"
            fontSize={14}
            tickLine={false}
            axisLine={false}
            label={{
              value: "Day",
              position: "insideBottom",
              offset: -15,
              fontSize: 12,
              fill: "var(--muted-foreground)",
            }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            stroke="var(--muted-foreground)"
            fontSize={14}
            tickLine={false}
            axisLine={false}
            label={{
              value: "Student score (out of 100)",
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
              borderRadius: "1rem",
              color: "var(--foreground)",
              fontSize: "0.875rem",
              padding: "0.5rem 1rem",
            }}
            formatter={(val: unknown) => [`${val} out of 100`, "Score"]}
          />
          <Legend wrapperStyle={{ paddingTop: "10px" }} />
          {students.map((st, idx) => {
            const color = LINE_COLORS[idx % LINE_COLORS.length];
            return (
              <Area
                key={st.id}
                type="monotone"
                dataKey={st.name}
                stroke={color}
                strokeWidth={2}
                fillOpacity={0.15}
                fill={color}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
