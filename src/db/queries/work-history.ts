import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { scopeRecordToViewer, type Viewer } from "@/db/queries/record-scope";
import { user } from "@/db/schema/auth";
import { installation } from "@/db/schema/installation";
import { project } from "@/db/schema/project";
import { serviceRequest } from "@/db/schema/service-request";
import { workHistory } from "@/db/schema/work-history";
import type {
  RecordStatus,
  RecordType,
  ServiceCategory,
} from "@/lib/constants";
import { formatRecordId, parseRecordIdSearch } from "@/lib/format";

export type TechnicianWorkSummary = {
  id: string;
  name: string;
  department: string | null;
};

export type WorkHistoryItem = {
  id: string;
  recordType: "INITIAL_REQUEST" | "WORK_LOG" | "STATUS_CHANGE";
  workType: RecordType;
  referenceId: string;
  serviceId?: string;
  customerName?: string;
  mobileNumber?: string;
  category?: string;
  technicianIds: string[];
  technicians: TechnicianWorkSummary[];
  technicianNames: string[];
  workDate: string;
  workDateTime: Date;
  status: RecordStatus;
  notes: string;
  description: string;
  attachments: string[];
  createdById: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt?: Date;
  isInitial?: boolean;
};

export type ServiceRequestSummary = {
  id: string;
  seq: number;
  serviceId: string;
  recordId: string;
  customerName: string;
  mobileNumber: string;
  phone: string;
  email: string | null;
  category: ServiceCategory | string;
  address: string;
  status: RecordStatus;
  description: string;
  issueTitle?: string | null;
  createdAt: Date;
  assignedTechnicianIds: string[];
  assignedTechnicians: TechnicianWorkSummary[];
  technicians: TechnicianWorkSummary[];
  technicianNames: string[];
};

export type CombinedWorkHistoryResult = {
  serviceRequest: ServiceRequestSummary | null;
  parentRecord: ServiceRequestSummary | null;
  history: WorkHistoryItem[];
  totalLogs: number;
};

export type SelectableRecord = {
  id: string;
  seq: number;
  recordId: string;
  customerName: string;
  phone: string;
  email: string | null;
  category: ServiceCategory | string;
  address: string;
  status: RecordStatus;
  assignedTechnicianIds?: string[];
  assignedTechnicianId?: string | null;
  technicianNames?: string[];
  technicianName?: string | null;
};

/**
 * Returns all work history entries for a specific record (Service / Installation / Project),
 * always including the initial request creation and any subsequent work logs,
 * sorted chronologically (newest first).
 */
export async function listWorkHistoryByRecord(
  params: {
    workType: RecordType;
    referenceId: string;
  },
  viewer?: Viewer,
): Promise<WorkHistoryItem[]> {
  const result = await getCombinedWorkHistory(params, viewer);
  return result.history;
}

/**
 * Retrieves the parent ticket details alongside the complete merged chronological
 * history timeline (initial request + all daily work logs).
 */
export async function getCombinedWorkHistory(
  params: {
    workType: RecordType;
    referenceId: string;
  },
  viewer?: Viewer,
): Promise<CombinedWorkHistoryResult> {
  const { workType, referenceId } = params;
  if (!referenceId) {
    return {
      serviceRequest: null,
      parentRecord: null,
      history: [],
      totalLogs: 0,
    };
  }

  // 1. Fetch parent record info
  let parentRecord: ServiceRequestSummary | null = null;
  let initialTechIds: string[] = [];
  let initialCreatedById: string | null = null;
  let initialCreatedAt = new Date();
  let parentUpdatedAt: Date | null = null;
  let initialStatus: RecordStatus = "OPEN";
  let initialDescription = "Service request created.";
  let resolvedReferenceId = referenceId;

  // Check if referenceId is a formatted ID (e.g. "SRV-1010") or a UUID
  const seqNumber = parseRecordIdSearch(referenceId);

  if (workType === "SERVICE") {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        referenceId,
      );
    const idClause = isUuid
      ? eq(serviceRequest.id, referenceId)
      : seqNumber !== null
        ? eq(serviceRequest.seq, seqNumber)
        : eq(serviceRequest.id, referenceId);

    const scope = scopeRecordToViewer(
      {
        createdById: serviceRequest.createdById,
        assignedTechnicianId: serviceRequest.assignedTechnicianId,
        assignedTechnicianIds: serviceRequest.assignedTechnicianIds,
      },
      viewer,
    );

    const rows = await db
      .select({
        id: serviceRequest.id,
        seq: serviceRequest.seq,
        customerName: serviceRequest.customerName,
        phone: serviceRequest.phone,
        email: serviceRequest.email,
        category: serviceRequest.category,
        address: serviceRequest.address,
        status: serviceRequest.status,
        description: serviceRequest.description,
        issueTitle: serviceRequest.issueTitle,
        assignedTechnicianId: serviceRequest.assignedTechnicianId,
        assignedTechnicianIds: serviceRequest.assignedTechnicianIds,
        createdById: serviceRequest.createdById,
        createdAt: serviceRequest.createdAt,
        updatedAt: serviceRequest.updatedAt,
      })
      .from(serviceRequest)
      .where(scope ? and(idClause, scope) : idClause)
      .limit(1);

    const sr = rows[0];
    if (sr) {
      resolvedReferenceId = sr.id;
      const ids =
        Array.isArray(sr.assignedTechnicianIds) &&
        sr.assignedTechnicianIds.length > 0
          ? sr.assignedTechnicianIds
          : sr.assignedTechnicianId
            ? [sr.assignedTechnicianId]
            : [];
      initialTechIds = ids;
      initialCreatedById = sr.createdById;
      initialCreatedAt = sr.createdAt;
      parentUpdatedAt = sr.updatedAt;
      initialStatus = sr.status;
      initialDescription = sr.issueTitle
        ? `${sr.issueTitle} — ${sr.description}`
        : sr.description || "Service request created.";

      const recId = formatRecordId("SERVICE", sr.seq);
      parentRecord = {
        id: sr.id,
        seq: sr.seq,
        serviceId: recId,
        recordId: recId,
        customerName: sr.customerName,
        mobileNumber: sr.phone,
        phone: sr.phone,
        email: sr.email,
        category: sr.category,
        address: sr.address,
        status: sr.status,
        description: sr.description,
        issueTitle: sr.issueTitle,
        createdAt: sr.createdAt,
        assignedTechnicianIds: ids,
        assignedTechnicians: [],
        technicians: [],
        technicianNames: [],
      };
    }
  } else if (workType === "INSTALLATION") {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        referenceId,
      );
    const idClause = isUuid
      ? eq(installation.id, referenceId)
      : seqNumber !== null
        ? eq(installation.seq, seqNumber)
        : eq(installation.id, referenceId);

    const scope = scopeRecordToViewer(
      {
        createdById: installation.createdById,
        assignedTechnicianId: installation.assignedTechnicianId,
        assignedTechnicianIds: installation.assignedTechnicianIds,
      },
      viewer,
    );

    const rows = await db
      .select({
        id: installation.id,
        seq: installation.seq,
        customerName: installation.customerName,
        contactNumber: installation.contactNumber,
        email: installation.email,
        address: installation.address,
        status: installation.status,
        description: installation.description,
        assignedTechnicianId: installation.assignedTechnicianId,
        assignedTechnicianIds: installation.assignedTechnicianIds,
        createdById: installation.createdById,
        createdAt: installation.createdAt,
        updatedAt: installation.updatedAt,
      })
      .from(installation)
      .where(scope ? and(idClause, scope) : idClause)
      .limit(1);

    const ins = rows[0];
    if (ins) {
      resolvedReferenceId = ins.id;
      const ids =
        Array.isArray(ins.assignedTechnicianIds) &&
        ins.assignedTechnicianIds.length > 0
          ? ins.assignedTechnicianIds
          : ins.assignedTechnicianId
            ? [ins.assignedTechnicianId]
            : [];
      initialTechIds = ids;
      initialCreatedById = ins.createdById;
      initialCreatedAt = ins.createdAt;
      parentUpdatedAt = ins.updatedAt;
      initialStatus = ins.status;
      initialDescription = ins.description || "Installation request created.";

      const recId = formatRecordId("INSTALLATION", ins.seq);
      parentRecord = {
        id: ins.id,
        seq: ins.seq,
        serviceId: recId,
        recordId: recId,
        customerName: ins.customerName,
        mobileNumber: ins.contactNumber,
        phone: ins.contactNumber,
        email: ins.email,
        category: "Installation",
        address: ins.address,
        status: ins.status,
        description: ins.description,
        createdAt: ins.createdAt,
        assignedTechnicianIds: ids,
        assignedTechnicians: [],
        technicians: [],
        technicianNames: [],
      };
    }
  } else if (workType === "PROJECT") {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        referenceId,
      );
    const idClause = isUuid
      ? eq(project.id, referenceId)
      : seqNumber !== null
        ? eq(project.seq, seqNumber)
        : eq(project.id, referenceId);

    const scope = scopeRecordToViewer(
      {
        createdById: project.createdById,
        assignedTechnicianId: project.assignedTechnicianId,
        assignedTechnicianIds: project.assignedTechnicianIds,
      },
      viewer,
    );

    const rows = await db
      .select({
        id: project.id,
        seq: project.seq,
        companyName: project.companyName,
        customerName: project.customerName,
        mobileNo: project.mobileNo,
        email: project.email,
        location: project.location,
        status: project.status,
        description: project.description,
        assignedTechnicianId: project.assignedTechnicianId,
        assignedTechnicianIds: project.assignedTechnicianIds,
        createdById: project.createdById,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      })
      .from(project)
      .where(scope ? and(idClause, scope) : idClause)
      .limit(1);

    const prj = rows[0];
    if (prj) {
      resolvedReferenceId = prj.id;
      const ids =
        Array.isArray(prj.assignedTechnicianIds) &&
        prj.assignedTechnicianIds.length > 0
          ? prj.assignedTechnicianIds
          : prj.assignedTechnicianId
            ? [prj.assignedTechnicianId]
            : [];
      initialTechIds = ids;
      initialCreatedById = prj.createdById;
      initialCreatedAt = prj.createdAt;
      parentUpdatedAt = prj.updatedAt;
      initialStatus = prj.status;
      initialDescription = `${prj.companyName}: ${prj.description}`;

      const recId = formatRecordId("PROJECT", prj.seq);
      parentRecord = {
        id: prj.id,
        seq: prj.seq,
        serviceId: recId,
        recordId: recId,
        customerName: prj.customerName,
        mobileNumber: prj.mobileNo,
        phone: prj.mobileNo,
        email: prj.email,
        category: prj.companyName,
        address: prj.location,
        status: prj.status,
        description: prj.description,
        createdAt: prj.createdAt,
        assignedTechnicianIds: ids,
        assignedTechnicians: [],
        technicians: [],
        technicianNames: [],
      };
    }
  }

  // 2. Fetch logged work history rows from DB for this record
  const rawLogs = await db
    .select({
      history: workHistory,
      createdByName: user.name,
    })
    .from(workHistory)
    .leftJoin(user, eq(workHistory.createdById, user.id))
    .where(
      and(
        eq(workHistory.workType, workType),
        eq(workHistory.referenceId, resolvedReferenceId),
      ),
    )
    .orderBy(
      desc(workHistory.workDate),
      desc(workHistory.workDateTime),
      desc(workHistory.createdAt),
    );

  // Find any existing initial snapshot log row
  const initialLogs = rawLogs.filter(
    (r) =>
      r.history.isInitial ||
      r.history.description.startsWith("Initial service request created") ||
      r.history.description.startsWith("Initial installation created") ||
      r.history.description.startsWith("Initial project created") ||
      r.history.description.startsWith("Initial request created"),
  );
  const initialLogRow =
    initialLogs.length > 0 ? initialLogs[initialLogs.length - 1] : undefined;

  // Collect all technician IDs and creator IDs across parent record, initial snapshot, and logs
  const allUserIds = new Set<string>();
  for (const tid of initialTechIds) {
    if (tid) allUserIds.add(tid);
  }
  if (initialCreatedById) allUserIds.add(initialCreatedById);

  if (initialLogRow && Array.isArray(initialLogRow.history.technicianIds)) {
    for (const tid of initialLogRow.history.technicianIds) {
      if (tid) allUserIds.add(tid);
    }
  }
  if (initialLogRow?.history.createdById) {
    allUserIds.add(initialLogRow.history.createdById);
  }

  for (const row of rawLogs) {
    if (Array.isArray(row.history.technicianIds)) {
      for (const tid of row.history.technicianIds) {
        if (tid) allUserIds.add(tid);
      }
    }
    if (row.history.createdById) allUserIds.add(row.history.createdById);
  }

  const userMap = new Map<
    string,
    { name: string; department: string | null }
  >();
  if (allUserIds.size > 0) {
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        department: user.department,
      })
      .from(user)
      .where(inArray(user.id, Array.from(allUserIds)));

    for (const u of users) {
      userMap.set(u.id, { name: u.name, department: u.department });
    }
  }

  // Populate technician details on parentRecord
  if (parentRecord) {
    const parentTechList: TechnicianWorkSummary[] = [];
    const parentTechNames: string[] = [];
    for (const tid of parentRecord.assignedTechnicianIds) {
      const u = userMap.get(tid);
      if (u) {
        parentTechList.push({
          id: tid,
          name: u.name,
          department: u.department,
        });
        parentTechNames.push(u.name);
      }
    }
    parentRecord.assignedTechnicians = parentTechList;
    parentRecord.technicians = parentTechList;
    parentRecord.technicianNames = parentTechNames;
  }

  // 3. Map actual work logs (excluding initial snapshot records)
  const mappedLogs: WorkHistoryItem[] = [];
  for (const { history, createdByName } of rawLogs) {
    const isInitialRow =
      history.isInitial ||
      history.description.startsWith("Initial service request created") ||
      history.description.startsWith("Initial installation created") ||
      history.description.startsWith("Initial project created") ||
      history.description.startsWith("Initial request created");

    // Skip initial snapshot rows from the regular work log list because they represent INITIAL_REQUEST
    if (isInitialRow) {
      continue;
    }

    const techIds = Array.isArray(history.technicianIds)
      ? history.technicianIds
      : [];

    const technicians: TechnicianWorkSummary[] = [];
    const technicianNames: string[] = [];

    for (const tid of techIds) {
      const tech = userMap.get(tid);
      if (tech) {
        technicians.push({
          id: tid,
          name: tech.name,
          department: tech.department,
        });
        technicianNames.push(tech.name);
      } else {
        technicians.push({
          id: tid,
          name: "Technician",
          department: null,
        });
      }
    }

    const workDateStr =
      typeof history.workDate === "string"
        ? history.workDate
        : new Date(history.workDate).toISOString().split("T")[0];

    // Identify CLOSED status change events
    const isStatusChange =
      history.status === "CLOSED" &&
      (history.description === "Status changed to Closed" ||
        techIds.length === 0);

    mappedLogs.push({
      id: history.id,
      recordType: isStatusChange ? "STATUS_CHANGE" : "WORK_LOG",
      workType: history.workType,
      referenceId: history.referenceId,
      serviceId: parentRecord?.recordId,
      customerName: parentRecord?.customerName,
      mobileNumber: parentRecord?.phone,
      category: parentRecord?.category,
      technicianIds: isStatusChange ? [] : techIds,
      technicians: isStatusChange ? [] : technicians,
      technicianNames: isStatusChange ? [] : technicianNames,
      workDate: workDateStr,
      workDateTime: history.workDateTime,
      status: history.status,
      notes: history.description,
      description: history.description,
      attachments: Array.isArray(history.attachments)
        ? history.attachments
        : [],
      createdById: history.createdById,
      createdByName:
        createdByName ?? userMap.get(history.createdById ?? "")?.name ?? null,
      createdAt: history.createdAt,
      updatedAt: history.updatedAt,
      isInitial: false,
    });
  }

  // Fallback: If parent record is CLOSED and no CLOSED status event was logged in work_history,
  // synthesize a STATUS_CHANGE event using parent record's updatedAt or createdAt timestamp.
  const hasClosedEvent = mappedLogs.some(
    (l) => l.recordType === "STATUS_CHANGE" && l.status === "CLOSED",
  );

  if (parentRecord && parentRecord.status === "CLOSED" && !hasClosedEvent) {
    const closeTime = parentUpdatedAt ?? parentRecord.createdAt;
    const closeDateStr = new Date(closeTime).toISOString().split("T")[0];
    mappedLogs.push({
      id: `closed-${parentRecord.id}`,
      recordType: "STATUS_CHANGE",
      workType,
      referenceId: parentRecord.id,
      serviceId: parentRecord.recordId,
      customerName: parentRecord.customerName,
      mobileNumber: parentRecord.phone,
      category: parentRecord.category,
      technicianIds: [],
      technicians: [],
      technicianNames: [],
      workDate: closeDateStr,
      workDateTime: closeTime,
      status: "CLOSED",
      notes: "Status changed to Closed",
      description: "Status changed to Closed",
      attachments: [],
      createdById: null,
      createdByName: null,
      createdAt: closeTime,
      isInitial: false,
    });
  }

  // 4. Construct the INITIAL_REQUEST record from the historical snapshot
  const allTimelineItems: WorkHistoryItem[] = [...mappedLogs];

  if (parentRecord) {
    let snapshotTechIds: string[] = [];
    let snapshotCreatedAt = initialCreatedAt;
    let snapshotCreatedById = initialCreatedById;
    let snapshotStatus = initialStatus;
    let snapshotDescription = initialDescription;

    if (initialLogRow) {
      snapshotTechIds = Array.isArray(initialLogRow.history.technicianIds)
        ? initialLogRow.history.technicianIds
        : [];
      snapshotCreatedAt =
        initialLogRow.history.workDateTime || initialLogRow.history.createdAt;
      snapshotCreatedById =
        initialLogRow.history.createdById || initialCreatedById;
      snapshotStatus = initialLogRow.history.status || initialStatus;
      if (initialLogRow.history.description) {
        snapshotDescription = initialLogRow.history.description;
      }
    } else {
      // Fallback for legacy records without an explicit initial snapshot row:
      // If work logs exist, the initial ticket had no technicians at creation (or unassigned).
      // If no work logs exist, use initialTechIds.
      const hasWorkLogs = mappedLogs.length > 0;
      snapshotTechIds = hasWorkLogs ? [] : initialTechIds;
    }

    const snapshotTechs: TechnicianWorkSummary[] = [];
    const snapshotTechNames: string[] = [];
    for (const tid of snapshotTechIds) {
      const u = userMap.get(tid);
      if (u) {
        snapshotTechs.push({
          id: tid,
          name: u.name,
          department: u.department,
        });
        snapshotTechNames.push(u.name);
      } else {
        snapshotTechs.push({
          id: tid,
          name: "Technician",
          department: null,
        });
        snapshotTechNames.push("Technician");
      }
    }

    const initDateStr =
      snapshotCreatedAt instanceof Date
        ? snapshotCreatedAt.toISOString().split("T")[0]
        : new Date(snapshotCreatedAt).toISOString().split("T")[0];

    const initialItem: WorkHistoryItem = {
      id: initialLogRow
        ? initialLogRow.history.id
        : `initial-${parentRecord.id}`,
      recordType: "INITIAL_REQUEST",
      workType,
      referenceId: parentRecord.id,
      serviceId: parentRecord.recordId,
      customerName: parentRecord.customerName,
      mobileNumber: parentRecord.phone,
      category: parentRecord.category,
      technicianIds: snapshotTechIds,
      technicians: snapshotTechs,
      technicianNames: snapshotTechNames,
      workDate: initDateStr,
      workDateTime: snapshotCreatedAt,
      status: snapshotStatus,
      notes: "Service request created",
      description: snapshotDescription,
      attachments: [],
      createdById: snapshotCreatedById,
      createdByName:
        userMap.get(snapshotCreatedById ?? "")?.name ?? "System Admin",
      createdAt: snapshotCreatedAt,
      isInitial: true,
    };

    allTimelineItems.push(initialItem);
  }

  // 5. Sort chronologically (newest activity at top, initial request in its chronological position)
  allTimelineItems.sort((a, b) => {
    const timeA = new Date(a.workDateTime).getTime();
    const timeB = new Date(b.workDateTime).getTime();
    if (timeA !== timeB) return timeB - timeA;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return {
    serviceRequest: parentRecord,
    parentRecord,
    history: allTimelineItems,
    totalLogs: allTimelineItems.length,
  };
}

/**
 * Retrieves a single work history record by ID.
 */
export async function getWorkHistoryById(
  id: string,
): Promise<WorkHistoryItem | null> {
  const [row] = await db
    .select({
      history: workHistory,
      createdByName: user.name,
    })
    .from(workHistory)
    .leftJoin(user, eq(workHistory.createdById, user.id))
    .where(eq(workHistory.id, id))
    .limit(1);

  if (!row) return null;

  const techIds = Array.isArray(row.history.technicianIds)
    ? row.history.technicianIds
    : [];

  const technicians: TechnicianWorkSummary[] = [];
  const technicianNames: string[] = [];

  if (techIds.length > 0) {
    const techUsers = await db
      .select({
        id: user.id,
        name: user.name,
        department: user.department,
      })
      .from(user)
      .where(inArray(user.id, techIds));

    const techMap = new Map(techUsers.map((u) => [u.id, u]));
    for (const tid of techIds) {
      const u = techMap.get(tid);
      if (u) {
        technicians.push({
          id: u.id,
          name: u.name,
          department: u.department,
        });
        technicianNames.push(u.name);
      }
    }
  }

  const workDateStr =
    typeof row.history.workDate === "string"
      ? row.history.workDate
      : new Date(row.history.workDate).toISOString().split("T")[0];

  const isInitial =
    row.history.description.startsWith("Initial service request created") ||
    row.history.description.startsWith("Initial installation created") ||
    row.history.description.startsWith("Initial project created") ||
    row.history.description.startsWith("Initial request created");

  const isStatusChange =
    row.history.status === "CLOSED" &&
    (row.history.description === "Status changed to Closed" ||
      techIds.length === 0);

  return {
    id: row.history.id,
    recordType: isInitial
      ? "INITIAL_REQUEST"
      : isStatusChange
        ? "STATUS_CHANGE"
        : "WORK_LOG",
    workType: row.history.workType,
    referenceId: row.history.referenceId,
    technicianIds: isStatusChange ? [] : techIds,
    technicians: isStatusChange ? [] : technicians,
    technicianNames: isStatusChange ? [] : technicianNames,
    workDate: workDateStr,
    workDateTime: row.history.workDateTime,
    status: row.history.status,
    notes: row.history.description,
    description: row.history.description,
    attachments: Array.isArray(row.history.attachments)
      ? row.history.attachments
      : [],
    createdById: row.history.createdById,
    createdByName: row.createdByName ?? null,
    createdAt: row.history.createdAt,
    updatedAt: row.history.updatedAt,
    isInitial,
  };
}

/**
 * Returns active service requests for the Log Request form dropdown with pre-populated metadata.
 */
export async function listSelectableServiceRequests(
  viewer?: Viewer,
): Promise<SelectableRecord[]> {
  const scopeCondition = viewer
    ? scopeRecordToViewer(
        {
          createdById: serviceRequest.createdById,
          assignedTechnicianId: serviceRequest.assignedTechnicianId,
          assignedTechnicianIds: serviceRequest.assignedTechnicianIds,
        },
        viewer,
      )
    : undefined;
  const rows = await db
    .select({
      id: serviceRequest.id,
      seq: serviceRequest.seq,
      customerName: serviceRequest.customerName,
      phone: serviceRequest.phone,
      email: serviceRequest.email,
      category: serviceRequest.category,
      address: serviceRequest.address,
      status: serviceRequest.status,
      assignedTechnicianId: serviceRequest.assignedTechnicianId,
      assignedTechnicianIds: serviceRequest.assignedTechnicianIds,
    })
    .from(serviceRequest)
    .where(scopeCondition ? scopeCondition : undefined)
    .orderBy(desc(serviceRequest.createdAt));

  // Collect technician names
  const allTechIds = new Set<string>();
  for (const r of rows) {
    const ids =
      Array.isArray(r.assignedTechnicianIds) &&
      r.assignedTechnicianIds.length > 0
        ? r.assignedTechnicianIds
        : r.assignedTechnicianId
          ? [r.assignedTechnicianId]
          : [];
    for (const tid of ids) {
      if (tid) allTechIds.add(tid);
    }
  }

  const techMap = new Map<string, string>();
  if (allTechIds.size > 0) {
    const users = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(inArray(user.id, Array.from(allTechIds)));
    for (const u of users) {
      techMap.set(u.id, u.name);
    }
  }

  return rows.map((r) => {
    const assignedTechnicianIds =
      Array.isArray(r.assignedTechnicianIds) &&
      r.assignedTechnicianIds.length > 0
        ? r.assignedTechnicianIds
        : r.assignedTechnicianId
          ? [r.assignedTechnicianId]
          : [];

    const technicianNames = assignedTechnicianIds
      .map((id) => techMap.get(id))
      .filter((n): n is string => Boolean(n));

    return {
      id: r.id,
      seq: r.seq,
      recordId: formatRecordId("SERVICE", r.seq),
      customerName: r.customerName,
      phone: r.phone,
      email: r.email,
      category: r.category,
      address: r.address,
      status: r.status,
      assignedTechnicianIds,
      technicianNames,
    };
  });
}
