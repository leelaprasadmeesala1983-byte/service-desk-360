import type { RecordStatus } from "@/lib/constants";
import type { RecordKind } from "@/lib/format";

/** Where each record type's list screen lives. */
const RECORD_KIND_PATHS: Record<RecordKind, string> = {
  SERVICE: "/service-tickets/service-management",
  INSTALLATION: "/service-tickets/installation-management",
  PROJECT: "/service-tickets/project-management",
  CSH: "/quick-cash",
  ASSET: "/asset-management",
  STV: "/asset-management/send-to-vendor",
  REP: "/asset-management/repair-status",
};

const RECORD_KIND_LABELS: Record<RecordKind, string> = {
  SERVICE: "Service Request",
  INSTALLATION: "Installation Request",
  PROJECT: "Project",
  CSH: "Cash Transaction",
  ASSET: "Asset",
  STV: "Send to Vendor",
  REP: "Repair Status",
};

/** Badge colouring per status; "Completed" (CLOSED) reads as success. */
const RECORD_STATUS_TONE: Record<RecordStatus, { dot: string; badge: string }> =
  {
    OPEN: {
      dot: "bg-blue-500",
      badge: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    },
    IN_PROGRESS: {
      dot: "bg-amber-500",
      badge:
        "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    },
    CLOSED: {
      dot: "bg-emerald-500",
      badge:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    },
    REJECTED: {
      dot: "bg-rose-500",
      badge: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    },
  };

/** Statuses that count as "still pending" on the dashboard. */
const PENDING_STATUSES: RecordStatus[] = ["OPEN", "IN_PROGRESS"];

/** Sentinel for the Assign Technician dropdown's "Unassigned" option. */
const UNASSIGNED_VALUE = "__UNASSIGNED__";

export {
  RECORD_KIND_PATHS,
  RECORD_KIND_LABELS,
  RECORD_STATUS_TONE,
  PENDING_STATUSES,
  UNASSIGNED_VALUE,
};
