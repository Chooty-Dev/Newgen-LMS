"use client";

import * as React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

interface SubjectBarItem {
  subject: string;
  average: number;
}

interface SubjectBarChartProps {
  data: SubjectBarItem[];
  xLabel?: string;
  yLabel?: string;
  unit?: string;
}

export function SubjectBarChart({
  data,
  xLabel = "Subject",
  yLabel = "Average marks (%)",
  unit = "%",
}: SubjectBarChartProps) {
  return (
    <div className="h-72 w-full relative">
      <span className="sr-only">
        Subject comparison bar chart showing average percentage for each subject.
      </span>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 15, right: 15, left: -10, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="subject"
            stroke="var(--muted-foreground)"
            fontSize={14}
            tickLine={false}
            axisLine={false}
            label={{
              value: xLabel,
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
              value: yLabel,
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
            formatter={(val: unknown) => [`${val} ${unit}`, "Average"]}
          />
          <Bar dataKey="average" name="Average" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
