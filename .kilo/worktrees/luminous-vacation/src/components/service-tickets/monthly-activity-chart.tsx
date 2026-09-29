"use client";

import { useRef, useState } from "react";
import type { MonthlyActivityPoint } from "@/db/queries/dashboard";

const SERIES = [
  { key: "services", label: "Services", color: "#2f80ed" },
  { key: "installations", label: "Installations", color: "#35b96f" },
  { key: "projects", label: "Projects", color: "#f5b72f" },
] as const;

type MonthlyActivityChartProps = {
  data: MonthlyActivityPoint[];
};

type HoverState = {
  index: number;
  point: MonthlyActivityPoint;
  clientX: number;
  clientY: number;
};

/** Grouped bar chart for the last 6 months, hand-drawn in responsive SVG with interactive tooltip. */
function MonthlyActivityChart({ data }: MonthlyActivityChartProps) {
  const [hoverState, setHoverState] = useState<HoverState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const max = Math.max(
    1,
    ...data.flatMap((point) => [
      point.services,
      point.installations,
      point.projects,
    ]),
  );

  const width = 640;
  const height = 240;
  const padding = { top: 20, right: 16, bottom: 32, left: 36 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const groupWidth = plotWidth / (data.length || 1);
  const barWidth = Math.min(18, (groupWidth - 16) / SERIES.length);

  const ticks = 4;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || data.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert mouseX to SVG coordinate space
    const svgX = (mouseX / rect.width) * width;

    if (svgX < padding.left || svgX > width - padding.right) {
      setHoverState(null);
      return;
    }

    const plotX = svgX - padding.left;
    const index = Math.floor(plotX / groupWidth);

    if (index >= 0 && index < data.length) {
      setHoverState({
        index,
        point: data[index],
        clientX: mouseX,
        clientY: mouseY,
      });
    } else {
      setHoverState(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverState(null);
  };

  // Determine tooltip positioning avoiding viewport edge clippings
  const getTooltipPosition = () => {
    if (!hoverState || !containerRef.current) return {};
    const rect = containerRef.current.getBoundingClientRect();
    const isRightHalf = hoverState.clientX > rect.width * 0.6;
    const isLeftEdge = hoverState.clientX < rect.width * 0.25;

    let transform = "translate(-50%, -105%)";
    if (isRightHalf) {
      transform = "translate(-100%, -105%)";
    } else if (isLeftEdge) {
      transform = "translate(0%, -105%)";
    }

    const top = Math.max(10, hoverState.clientY - 12);

    return {
      left: `${hoverState.clientX}px`,
      top: `${top}px`,
      transform,
    };
  };

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
        {SERIES.map((series) => (
          <div
            key={series.key}
            className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
          >
            <span
              className="size-3 rounded-sm shrink-0"
              style={{ backgroundColor: series.color }}
            />
            <span>{series.label}</span>
          </div>
        ))}
      </div>

      {/* Chart Wrapper with robust mouse tracking */}
      <div
        ref={containerRef}
        className="relative w-full cursor-crosshair select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Floating Tooltip Card */}
        {hoverState && (
          <div
            className="pointer-events-none absolute z-50 transition-transform duration-75 ease-out"
            style={getTooltipPosition()}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #d9e2ec",
                borderRadius: "18px",
                boxShadow:
                  "0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)",
                padding: "10px 16px",
                color: "#10233f",
                minWidth: "150px",
              }}
            >
              <div className="space-y-1.5 text-[15px] sm:text-[16px] font-semibold leading-snug">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: "#2f80ed" }}
                  />
                  <span>Services: {hoverState.point.services}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: "#35b96f" }}
                  />
                  <span>Installations: {hoverState.point.installations}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: "#f5b72f" }}
                  />
                  <span>Projects: {hoverState.point.projects}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-52 sm:h-64 w-full"
          role="img"
          aria-label="Monthly activity for services, installations and projects"
        >
          {/* Grid lines & Y-axis labels */}
          {Array.from({ length: ticks + 1 }).map((_, index) => {
            const value = Math.round((max / ticks) * (ticks - index));
            const y = padding.top + (plotHeight / ticks) * index;
            return (
              <g key={index}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  className="stroke-border/70"
                  strokeWidth={1}
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px] font-medium"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* Grouped Bars per Month */}
          {data.map((point, groupIndex) => {
            const groupX = padding.left + groupWidth * groupIndex;
            const innerX =
              groupX + (groupWidth - barWidth * SERIES.length - 4) / 2;
            const isHovered = hoverState?.index === groupIndex;

            return (
              <g key={point.label}>
                {/* Column hover background highlight */}
                {isHovered && (
                  <rect
                    x={groupX + 2}
                    y={padding.top}
                    width={groupWidth - 4}
                    height={plotHeight}
                    fill="#e2e8f0"
                    opacity={0.4}
                    rx={6}
                  />
                )}

                {/* Series Bars */}
                {SERIES.map((series, seriesIndex) => {
                  const raw = point[series.key];
                  const barHeight = (raw / max) * plotHeight;
                  const x = innerX + seriesIndex * (barWidth + 2);
                  const y = padding.top + plotHeight - barHeight;
                  return (
                    <rect
                      key={series.key}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, raw > 0 ? 3 : 0)}
                      rx={3}
                      fill={series.color}
                      className="transition-all duration-150"
                      opacity={isHovered ? 1 : 0.9}
                    />
                  );
                })}

                {/* Month Label */}
                <text
                  x={groupX + groupWidth / 2}
                  y={height - 10}
                  textAnchor="middle"
                  className={`text-[11px] transition-colors ${
                    isHovered
                      ? "fill-primary font-bold"
                      : "fill-muted-foreground font-medium"
                  }`}
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export { MonthlyActivityChart };
