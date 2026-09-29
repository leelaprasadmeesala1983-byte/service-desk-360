import type { RecordStatus } from "@/lib/constants";
import { DASHBOARD_STATUS_LABELS, RECORD_STATUS_LABELS } from "@/lib/constants";
import { RECORD_STATUS_TONE } from "@/lib/service-ticket";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  status: RecordStatus;
  /** Use the dashboard wording where CLOSED reads as "Completed". */
  dashboardLabel?: boolean;
  className?: string;
};

function StatusBadge({
  status,
  dashboardLabel = false,
  className,
}: StatusBadgeProps) {
  const tone = RECORD_STATUS_TONE[status];
  const label = dashboardLabel
    ? DASHBOARD_STATUS_LABELS[status]
    : RECORD_STATUS_LABELS[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        tone.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
      {label}
    </span>
  );
}

export { StatusBadge };
