import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { notification } from "@/db/schema/notification";

type RecordType = "SERVICE" | "INSTALLATION" | "PROJECT";

const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  SERVICE: "Service Request",
  INSTALLATION: "Installation Request",
  PROJECT: "Project",
};

type RecordRef = {
  recordType: RecordType;
  recordId: string;
  recordLabel: string;
};

/**
 * Verifies that a given user ID exists in the user table.
 * Returns the valid user ID or null if not found.
 */
async function findValidUserId(
  userId: string | null | undefined,
): Promise<string | null> {
  if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
    return null;
  }
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, userId.trim()))
    .limit(1);

  return row ? row.id : null;
}

/**
 * Admin assigned a record to a technician. Carries the record id and the task
 * the admin described, per spec §4.0 step 2.
 */
async function notifyAssignment(
  ref: RecordRef,
  input: { technicianId: string; actorId: string; description: string },
): Promise<void> {
  try {
    const validRecipientId = await findValidUserId(input.technicianId);
    if (!validRecipientId) {
      console.warn(
        `[notifyAssignment] Skipping notification: recipient user ID "${input.technicianId}" does not exist in user table (record: ${ref.recordType} ${ref.recordLabel}).`,
      );
      return;
    }

    const validActorId = await findValidUserId(input.actorId);

    await db.insert(notification).values({
      recipientId: validRecipientId,
      actorId: validActorId,
      type: "ASSIGNMENT",
      recordType: ref.recordType,
      recordId: ref.recordId,
      recordLabel: ref.recordLabel,
      title: `${RECORD_TYPE_LABELS[ref.recordType]} ${ref.recordLabel} assigned to you`,
      message: input.description,
    });
  } catch (error) {
    console.error(
      `[notifyAssignment] Failed to insert assignment notification for ${ref.recordLabel}:`,
      error,
    );
  }
}

/**
 * A technician saved changes. One notification per save (not per field), sent
 * to every active admin, per spec §4.0 step 4.
 */
async function notifyAdminsOfUpdate(
  ref: RecordRef,
  input: { actorId: string; actorName: string; summary: string },
): Promise<void> {
  try {
    const admins = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.role, "ADMIN"), eq(user.status, "ACTIVE")));

    if (admins.length === 0) return;

    const validActorId = await findValidUserId(input.actorId);

    await db.insert(notification).values(
      admins.map((admin) => ({
        recipientId: admin.id,
        actorId: validActorId,
        type: "UPDATE" as const,
        recordType: ref.recordType,
        recordId: ref.recordId,
        recordLabel: ref.recordLabel,
        title: `${input.actorName} updated ${RECORD_TYPE_LABELS[ref.recordType]} ${ref.recordLabel}`,
        message: input.summary,
      })),
    );
  } catch (error) {
    console.error(
      `[notifyAdminsOfUpdate] Failed to insert admin update notification for ${ref.recordLabel}:`,
      error,
    );
  }
}

/**
 * An admin edited a record that is already assigned to a technician. Tells the
 * assigned technician what the admin changed, so they don't act on stale
 * details. Reuses the UPDATE type; the reassignment case is covered by
 * notifyAssignment instead.
 */
async function notifyTechnicianOfEdit(
  ref: RecordRef,
  input: {
    technicianId: string;
    actorId: string;
    actorName: string;
    summary: string;
  },
): Promise<void> {
  try {
    const validRecipientId = await findValidUserId(input.technicianId);
    if (!validRecipientId) {
      console.warn(
        `[notifyTechnicianOfEdit] Skipping notification: recipient user ID "${input.technicianId}" does not exist in user table (record: ${ref.recordType} ${ref.recordLabel}).`,
      );
      return;
    }

    const validActorId = await findValidUserId(input.actorId);

    await db.insert(notification).values({
      recipientId: validRecipientId,
      actorId: validActorId,
      type: "UPDATE",
      recordType: ref.recordType,
      recordId: ref.recordId,
      recordLabel: ref.recordLabel,
      title: `${input.actorName} changed ${RECORD_TYPE_LABELS[ref.recordType]} ${ref.recordLabel}`,
      message: input.summary,
    });
  } catch (error) {
    console.error(
      `[notifyTechnicianOfEdit] Failed to insert technician edit notification for ${ref.recordLabel}:`,
      error,
    );
  }
}

type ChangeField = {
  key: string;
  label: string;
  /** Secrets and long free-text: report that it changed, never echo the value. */
  opaque?: boolean;
  format?: (value: unknown) => string;
};

/**
 * Diffs the stored row against the just-submitted values and returns one line
 * per field that actually changed ("Amount: ₹5,000.00 → ₹6,500.00"). Fields
 * absent from `after` are skipped, so the same defs work for the admin and the
 * narrower technician form. Returns [] when nothing changed.
 */
function diffRecord(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: ChangeField[],
): string[] {
  const show = (value: unknown, format?: ChangeField["format"]) => {
    if (format) return format(value);
    if (value === null || value === undefined || value === "") return "—";
    return String(value);
  };

  const lines: string[] = [];
  for (const field of fields) {
    if (!(field.key in after)) continue;
    const from = show(before[field.key], field.format);
    const to = show(after[field.key], field.format);
    if (from === to) continue;
    lines.push(
      field.opaque
        ? `${field.label} updated`
        : `${field.label}: ${from} → ${to}`,
    );
  }
  return lines;
}

export type { RecordRef, RecordType };
export {
  notifyAssignment,
  notifyAdminsOfUpdate,
  notifyTechnicianOfEdit,
  diffRecord,
  RECORD_TYPE_LABELS,
};
