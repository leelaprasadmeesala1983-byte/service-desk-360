/**
 * Fields that cannot be changed from the Edit dialog in Service, Project and
 * Installation management: assigned technician(s), status and updated date.
 *
 * The update actions overwrite whatever the client sends for these fields with
 * the stored values, and stamp `updatedAt` with the current time. The columns
 * themselves are untouched in the database.
 */
type LockableRecord = {
  status: string;
  assignedTechnicianId?: string | null;
  assignedTechnicianIds?: string[] | null;
};

function lockedTechnicianIds(existing: LockableRecord): string[] {
  if (
    Array.isArray(existing.assignedTechnicianIds) &&
    existing.assignedTechnicianIds.length > 0
  ) {
    return existing.assignedTechnicianIds;
  }
  return existing.assignedTechnicianId ? [existing.assignedTechnicianId] : [];
}

function lockEditFields<T extends LockableRecord>(existing: T) {
  const technicianIds = lockedTechnicianIds(existing);
  return {
    status: existing.status as T["status"],
    assignedTechnicianIds: technicianIds,
    assignedTechnicianId: technicianIds[0] ?? "",
    updatedAt: new Date(),
  };
}

export { lockEditFields, lockedTechnicianIds };
