"use client";

import * as React from "react";
import { ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = {
  [k: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
    theme?: Record<string, string>;
  };
};

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

export function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof ResponsiveContainer>["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs text-foreground [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50",
          className
        )}
        {...props}
      >
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = RechartsTooltip;

export function ChartTooltipContent({
  active,
  payload,
  label,
  indicator = "dot",
  hideLabel = false,
  className,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | string;
    dataKey?: string;
    color?: string;
    payload?: Record<string, unknown>;
  }>;
  label?: string;
  indicator?: "dot" | "line" | "dashed";
  hideLabel?: boolean;
  className?: string;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "min-w-[8rem] rounded-2xl border border-border bg-card p-3 text-base text-card-foreground shadow-xl",
        className
      )}
    >
      {!hideLabel && label && (
        <div className="mb-2 font-medium text-foreground">{label}</div>
      )}
      <div className="flex flex-col gap-1.5">
        {payload.map((item, index) => {
          const key = `${item.dataKey || item.name || index}`;
          const itemConfig = config[key] || config[item.name];
          const color = itemConfig?.color || item.color || "var(--chart-1)";

          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {indicator === "dot" && (
                  <span
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                )}
                <span className="text-muted-foreground text-sm">
                  {itemConfig?.label || item.name}
                </span>
              </div>
              <span className="font-semibold tabular-nums text-foreground">
                {item.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
