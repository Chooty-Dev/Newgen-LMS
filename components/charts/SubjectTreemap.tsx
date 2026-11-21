"use client";

import * as React from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";

interface TreemapItem {
  name: string;
  size: number;
  fill?: string;
}

interface SubjectTreemapProps {
  data: TreemapItem[];
  caption?: string;
}

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export function SubjectTreemap({
  data,
  caption = "Bigger and lighter box means higher marks. The number is your marks %.",
}: SubjectTreemapProps) {
  const formattedData = data.map((d, idx) => ({
    ...d,
    fill: d.fill || COLORS[idx % COLORS.length],
  }));

  return (
    <div className="h-72 w-full flex flex-col justify-between">
      <span className="sr-only">
        Subject treemap chart: {caption}
      </span>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={formattedData}
            dataKey="size"
            stroke="var(--card)"
            fill="var(--chart-1)"
          >
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
                borderRadius: "1rem",
                color: "var(--foreground)",
                fontSize: "0.875rem",
              }}
              formatter={(val: unknown) => [`${val}%`, "Mark"]}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground pt-2 text-center">
        {caption}
      </p>
    </div>
  );
}
