"use client";

import * as React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

interface TrendPoint {
  period: string;
  score: number;
  marks?: number;
  attendance?: number;
}

interface AreaTrendChartProps {
  data: TrendPoint[];
  xLabel?: string;
  yLabel?: string;
  unit?: string;
}

export function AreaTrendChart({
  data,
  xLabel = "Day",
  yLabel = "Performance score (out of 100)",
  unit = "out of 100",
}: AreaTrendChartProps) {
  return (
    <div className="h-72 w-full relative">
      <span className="sr-only">
        Trend chart showing score progression across evaluation dates.
      </span>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 15, right: 15, left: -10, bottom: 25 }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.6} />
              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="period"
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
            formatter={(val: unknown) => [`${val} ${unit}`, "Score"]}
          />
          <Area
            type="monotone"
            dataKey="score"
            name="Score"
            stroke="var(--chart-1)"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#scoreGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
