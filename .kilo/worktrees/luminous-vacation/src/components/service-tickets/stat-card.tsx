import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  hint?: string;
  tone?:
    | "default"
    | "open"
    | "progress"
    | "closed"
    | "rejected"
    | "primary"
    | "info"
    | "purple";
  className?: string;
};

const TONE_CLASSES: Record<
  NonNullable<StatCardProps["tone"]>,
  { text: string; iconBg: string }
> = {
  default: {
    text: "text-foreground",
    iconBg: "bg-muted text-muted-foreground",
  },
  open: {
    text: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
  },
  progress: {
    text: "text-amber-600 dark:text-amber-400",
    iconBg:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  },
  closed: {
    text: "text-emerald-600 dark:text-emerald-400",
    iconBg:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  rejected: {
    text: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400",
  },
  primary: {
    text: "text-primary",
    iconBg: "bg-primary/10 text-primary",
  },
  info: {
    text: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400",
  },
  purple: {
    text: "text-purple-600 dark:text-purple-400",
    iconBg:
      "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400",
  },
};

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  className,
}: StatCardProps) {
  const currentTone = TONE_CLASSES[tone] || TONE_CLASSES.default;

  return (
    <div
      className={cn(
        "border-border bg-card flex min-h-[115px] sm:min-h-[125px] flex-col justify-between rounded-xl border p-3.5 shadow-2xs transition-shadow sm:p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-muted-foreground text-xs font-semibold sm:text-[13px] whitespace-normal break-words leading-snug min-w-0 flex-1">
          {label}
        </span>
        {Icon && (
          <div
            className={cn(
              "flex size-7.5 sm:size-8 items-center justify-center rounded-lg shrink-0",
              currentTone.iconBg,
            )}
          >
            <Icon className="size-4" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <p
          className={cn(
            "text-2xl font-bold tracking-tight sm:text-[26px] leading-tight",
            currentTone.text,
          )}
        >
          {value}
        </p>
        {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
      </div>
    </div>
  );
}

export { StatCard };
