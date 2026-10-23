import "server-only";

import { desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { scopeRecordToViewer, type Viewer } from "@/db/queries/record-scope";
import { user } from "@/db/schema/auth";
import { installation } from "@/db/schema/installation";
import { project } from "@/db/schema/project";
import { serviceRequest } from "@/db/schema/service-request";
import { technicianWorkLog } from "@/db/schema/technician-work-log";
import { workHistory } from "@/db/schema/work-history";
import type { RecordStatus, ServiceCategory } from "@/lib/constants";
import { withDbRetry } from "@/lib/db-resilience";
import { formatRecordId } from "@/lib/format";
import {
  type ParsedMaterial,
  parseWorkHistoryDescription,
} from "@/lib/utils/work-history-parser";

const srTech = alias(user, "sr_tech_user");
const insTech = alias(user, "ins_tech_user");
const prjTech = alias(user, "prj_tech_user");

export type CustomerSummaryStats = {
  totalCustomers: number;
  totalServices: number;
  totalInstallations: number;
  totalProjects: number;
  totalRequests: number;
};

export type CustomerRow = {
  id: string; // Unique customer key (e.g. phone-normalized)
  customerName: string;
  companyName: string | null;
  mobileNumber: string;
  email: string | null;
  address: string | null;
  servicesCount: number;
  installationsCount: number;
  projectsCount: number;
  totalRequests: number;
  lastActivityDate: Date;
};

export type CustomerActivityItem = {
  id: string;
  module: "SERVICE" | "INSTALLATION" | "PROJECT";
  recordId: string;
  title: string;
  description: string | null;
  status: RecordStatus;
  technicianName: string | null;
  date: Date;
  updatedAt: Date;
  amount: string | null;
  address: string | null;
  category?: ServiceCategory | string | null;
  referenceNo?: string | null;
  estimationNo?: string | null;
};

export type Customer360Data = {
  customer: CustomerRow;
  services: {
    id: string;
    recordId: string;
    customerName: string;
    phone: string;
    email: string | null;
    category: ServiceCategory;
    address: string;
    issueTitle: string | null;
    description: string;
    status: RecordStatus;
    technicianName: string | null;
    amount: string | null;
    closedDescription: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[];
  installations: {
    id: string;
    recordId: string;
    customerName: string;
    contactNumber: string;
    email: string | null;
    address: string;
    description: string;
    status: RecordStatus;
    technicianName: string | null;
    technicianDepartment: string | null;
    accountUsername: string | null;
    accountMobile: string | null;
    referenceNo: string | null;
    amount: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[];
  projects: {
    id: string;
    recordId: string;
    companyName: string;
    customerName: string;
    mobileNo: string;
    email: string | null;
    location: string;
    estimationNo: string;
    description: string;
    status: RecordStatus;
    technicianName: string | null;
    technicianDepartment: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[];
  timeline: CustomerActivityItem[];
};

export type CustomerReportFilterParams = {
  search?: string;
  type?: "ALL" | "SERVICES" | "INSTALLATIONS" | "PROJECTS";
  status?: "ALL" | "OPEN" | "IN_PROGRESS" | "CLOSED";
  page?: number;
  perPage?: number;
};

export type CustomerReportResult = {
  stats: CustomerSummaryStats;
  customers: CustomerRow[];
  totalRecords: number;
  page: number;
  perPage: number;
  totalPages: number;
};

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits || phone.trim().toLowerCase();
}

function getCustomerKey(
  phone: string | null | undefined,
  email: string | null | undefined,
  name: string | null | undefined,
): string {
  const normPhone = normalizePhone(phone);
  if (normPhone) return `phone:${normPhone}`;

  const normEmail = (email || "").trim().toLowerCase();
  if (normEmail) return `email:${normEmail}`;

  const normName = (name || "").trim().toLowerCase();
  if (normName) return `name:${normName}`;

  return "unknown";
}

/**
 * Aggregates all customers across Service, Installation, and Project records.
 */
export async function getCustomerReports(
  params: CustomerReportFilterParams = {},
  viewer?: Viewer,
): Promise<CustomerReportResult> {
  const srScope = viewer
    ? scopeRecordToViewer(
        {
          createdById: serviceRequest.createdById,
          assignedTechnicianId: serviceRequest.assignedTechnicianId,
          assignedTechnicianIds: serviceRequest.assignedTechnicianIds,
        },
        viewer,
      )
    : undefined;
  const insScope = viewer
    ? scopeRecordToViewer(
        {
          createdById: installation.createdById,
          assignedTechnicianId: installation.assignedTechnicianId,
          assignedTechnicianIds: installation.assignedTechnicianIds,
        },
        viewer,
      )
    : undefined;
  const prjScope = viewer
    ? scopeRecordToViewer(
        {
          createdById: project.createdById,
          assignedTechnicianId: project.assignedTechnicianId,
          assignedTechnicianIds: project.assignedTechnicianIds,
        },
        viewer,
      )
    : undefined;

  const [servicesData, installationsData, projectsData] = await withDbRetry(
    () =>
      Promise.all([
        db
          .select({
            id: serviceRequest.id,
            seq: serviceRequest.seq,
            customerName: serviceRequest.customerName,
            phone: serviceRequest.phone,
            email: serviceRequest.email,
            category: serviceRequest.category,
            address: serviceRequest.address,
            issueTitle: serviceRequest.issueTitle,
            description: serviceRequest.description,
            status: serviceRequest.status,
            amount: serviceRequest.amount,
            createdAt: serviceRequest.createdAt,
            updatedAt: serviceRequest.updatedAt,
          })
          .from(serviceRequest)
          .where(srScope ? srScope : undefined)
          .orderBy(desc(serviceRequest.createdAt)),

        db
          .select({
            id: installation.id,
            seq: installation.seq,
            customerName: installation.customerName,
            contactNumber: installation.contactNumber,
            email: installation.email,
            address: installation.address,
            description: installation.description,
            status: installation.status,
            createdAt: installation.createdAt,
            updatedAt: installation.updatedAt,
          })
          .from(installation)
          .where(insScope ? insScope : undefined)
          .orderBy(desc(installation.createdAt)),

        db
          .select({
            id: project.id,
            seq: project.seq,
            companyName: project.companyName,
            customerName: project.customerName,
            mobileNo: project.mobileNo,
            email: project.email,
            location: project.location,
            estimationNo: project.estimationNo,
            description: project.description,
            status: project.status,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          })
          .from(project)
          .where(prjScope ? prjScope : undefined)
          .orderBy(desc(project.createdAt)),
      ]),
    { retries: 2, delayMs: 150, operationName: "getCustomerReports" },
  );

  const customerMap = new Map<
    string,
    {
      key: string;
      names: Set<string>;
      companyNames: Set<string>;
      phones: Set<string>;
      emails: Set<string>;
      addresses: Set<string>;
      servicesCount: number;
      installationsCount: number;
      projectsCount: number;
      lastDate: Date;
    }
  >();

  // Helper filter for status on individual transaction records
  const targetStatus =
    params.status && params.status !== "ALL" ? params.status : null;

  const matchesRecordFilters = (status: RecordStatus) => {
    if (targetStatus && status !== targetStatus) return false;
    return true;
  };

  // 1. Process Service Requests
  for (const s of servicesData) {
    if (!matchesRecordFilters(s.status)) continue;

    const key = getCustomerKey(s.phone, s.email, s.customerName);
    if (!key || key === "unknown") continue;

    let c = customerMap.get(key);
    if (!c) {
      c = {
        key,
        names: new Set(),
        companyNames: new Set(),
        phones: new Set(),
        emails: new Set(),
        addresses: new Set(),
        servicesCount: 0,
        installationsCount: 0,
        projectsCount: 0,
        lastDate: s.updatedAt || s.createdAt,
      };
      customerMap.set(key, c);
    }

    if (s.customerName) c.names.add(s.customerName.trim());
    if (s.phone) c.phones.add(s.phone.trim());
    if (s.email) c.emails.add(s.email.trim());
    if (s.address) c.addresses.add(s.address.trim());

    c.servicesCount++;
    const itemLatest = s.updatedAt > s.createdAt ? s.updatedAt : s.createdAt;
    if (itemLatest > c.lastDate) c.lastDate = itemLatest;
  }

  // 2. Process Installations
  for (const ins of installationsData) {
    if (!matchesRecordFilters(ins.status)) continue;

    const key = getCustomerKey(ins.contactNumber, ins.email, ins.customerName);
    if (!key || key === "unknown") continue;

    let c = customerMap.get(key);
    if (!c) {
      c = {
        key,
        names: new Set(),
        companyNames: new Set(),
        phones: new Set(),
        emails: new Set(),
        addresses: new Set(),
        servicesCount: 0,
        installationsCount: 0,
        projectsCount: 0,
        lastDate: ins.updatedAt || ins.createdAt,
      };
      customerMap.set(key, c);
    }

    if (ins.customerName) c.names.add(ins.customerName.trim());
    if (ins.contactNumber) c.phones.add(ins.contactNumber.trim());
    if (ins.email) c.emails.add(ins.email.trim());
    if (ins.address) c.addresses.add(ins.address.trim());

    c.installationsCount++;
    const itemLatest =
      ins.updatedAt > ins.createdAt ? ins.updatedAt : ins.createdAt;
    if (itemLatest > c.lastDate) c.lastDate = itemLatest;
  }

  // 3. Process Projects
  for (const prj of projectsData) {
    if (!matchesRecordFilters(prj.status)) continue;

    const key = getCustomerKey(prj.mobileNo, prj.email, prj.customerName);
    if (!key || key === "unknown") continue;

    let c = customerMap.get(key);
    if (!c) {
      c = {
        key,
        names: new Set(),
        companyNames: new Set(),
        phones: new Set(),
        emails: new Set(),
        addresses: new Set(),
        servicesCount: 0,
        installationsCount: 0,
        projectsCount: 0,
        lastDate: prj.updatedAt || prj.createdAt,
      };
      customerMap.set(key, c);
    }

    if (prj.customerName) c.names.add(prj.customerName.trim());
    if (prj.companyName) c.companyNames.add(prj.companyName.trim());
    if (prj.mobileNo) c.phones.add(prj.mobileNo.trim());
    if (prj.email) c.emails.add(prj.email.trim());
    if (prj.location) c.addresses.add(prj.location.trim());

    c.projectsCount++;
    const itemLatest =
      prj.updatedAt > prj.createdAt ? prj.updatedAt : prj.createdAt;
    if (itemLatest > c.lastDate) c.lastDate = itemLatest;
  }

  // Convert map to array of CustomerRow
  const allCustomers: CustomerRow[] = Array.from(customerMap.values()).map(
    (c) => {
      const customerName =
        Array.from(c.names)[0] || Array.from(c.companyNames)[0] || "Unknown";
      const companyName = Array.from(c.companyNames)[0] || null;
      const mobileNumber = Array.from(c.phones)[0] || "—";
      const email = Array.from(c.emails)[0] || null;
      const address = Array.from(c.addresses)[0] || null;

      return {
        id: c.key,
        customerName,
        companyName,
        mobileNumber,
        email,
        address,
        servicesCount: c.servicesCount,
        installationsCount: c.installationsCount,
        projectsCount: c.projectsCount,
        totalRequests: c.servicesCount + c.installationsCount + c.projectsCount,
        lastActivityDate: c.lastDate,
      };
    },
  );

  // Apply Search and Type Filters
  let filtered = allCustomers;

  // Search filter (name, phone, email, company)
  const searchTerm = (params.search || "").trim().toLowerCase();
  if (searchTerm) {
    filtered = filtered.filter(
      (c) =>
        c.customerName.toLowerCase().includes(searchTerm) ||
        (c.companyName?.toLowerCase().includes(searchTerm) ?? false) ||
        c.mobileNumber.toLowerCase().includes(searchTerm) ||
        (c.email?.toLowerCase().includes(searchTerm) ?? false),
    );
  }

  // Type filter
  if (params.type === "SERVICES") {
    filtered = filtered.filter((c) => c.servicesCount > 0);
  } else if (params.type === "INSTALLATIONS") {
    filtered = filtered.filter((c) => c.installationsCount > 0);
  } else if (params.type === "PROJECTS") {
    filtered = filtered.filter((c) => c.projectsCount > 0);
  }

  // Calculate Transaction-focused Summary Stats
  const totalCustomers = filtered.length;
  let totalServices = 0;
  let totalInstallations = 0;
  let totalProjects = 0;

  for (const c of filtered) {
    totalServices += c.servicesCount;
    totalInstallations += c.installationsCount;
    totalProjects += c.projectsCount;
  }

  const totalRequests = totalServices + totalInstallations + totalProjects;

  const stats: CustomerSummaryStats = {
    totalCustomers,
    totalServices,
    totalInstallations,
    totalProjects,
    totalRequests,
  };

  // Sort by latest activity date
  filtered.sort(
    (a, b) => b.lastActivityDate.getTime() - a.lastActivityDate.getTime(),
  );

  const totalRecords = filtered.length;
  const page = Math.max(1, params.page || 1);
  const perPage = Math.max(1, params.perPage || 10);
  const totalPages = Math.max(1, Math.ceil(totalRecords / perPage));

  const paginatedCustomers = filtered.slice(
    (page - 1) * perPage,
    page * perPage,
  );

  return {
    stats,
    customers: paginatedCustomers,
    totalRecords,
    page,
    perPage,
    totalPages,
  };
}

/**
 * Fetches all filtered customers without pagination for Excel export.
 */
export async function getAllFilteredCustomersForExport(
  params: CustomerReportFilterParams = {},
  viewer?: Viewer,
): Promise<CustomerRow[]> {
  const result = await getCustomerReports(
    {
      ...params,
      page: 1,
      perPage: 100000,
    },
    viewer,
  );
  return result.customers;
}

/**
 * Fetches full Customer 360 data including service, installation, and project histories.
 */
export async function getCustomer360Details(
  customerKey: string,
  viewer?: Viewer,
): Promise<Customer360Data | null> {
  const srScope = viewer
    ? scopeRecordToViewer(
        {
          createdById: serviceRequest.createdById,
          assignedTechnicianId: serviceRequest.assignedTechnicianId,
          assignedTechnicianIds: serviceRequest.assignedTechnicianIds,
        },
        viewer,
      )
    : undefined;
  const insScope = viewer
    ? scopeRecordToViewer(
        {
          createdById: installation.createdById,
          assignedTechnicianId: installation.assignedTechnicianId,
          assignedTechnicianIds: installation.assignedTechnicianIds,
        },
        viewer,
      )
    : undefined;
  const prjScope = viewer
    ? scopeRecordToViewer(
        {
          createdById: project.createdById,
          assignedTechnicianId: project.assignedTechnicianId,
          assignedTechnicianIds: project.assignedTechnicianIds,
        },
        viewer,
      )
    : undefined;

  const [servicesData, installationsData, projectsData, allTechs] =
    await withDbRetry(
      () =>
        Promise.all([
          db
            .select({
              service: serviceRequest,
              technicianName: srTech.name,
            })
            .from(serviceRequest)
            .leftJoin(
              srTech,
              eq(srTech.id, serviceRequest.assignedTechnicianId),
            )
            .where(srScope ? srScope : undefined)
            .orderBy(desc(serviceRequest.createdAt)),

          db
            .select({
              installation,
              technicianName: insTech.name,
              technicianDepartment: insTech.department,
            })
            .from(installation)
            .leftJoin(
              insTech,
              eq(insTech.id, installation.assignedTechnicianId),
            )
            .where(insScope ? insScope : undefined)
            .orderBy(desc(installation.createdAt)),

          db
            .select({
              project,
              technicianName: prjTech.name,
              technicianDepartment: prjTech.department,
            })
            .from(project)
            .leftJoin(prjTech, eq(prjTech.id, project.assignedTechnicianId))
            .where(prjScope ? prjScope : undefined)
            .orderBy(desc(project.createdAt)),

          db
            .select({ id: user.id, name: user.name })
            .from(user)
            .where(eq(user.role, "TECHNICIAN")),
        ]),
      { retries: 2, delayMs: 150, operationName: "getCustomer360Details" },
    );

  const techMap = new Map(allTechs.map((t) => [t.id, t.name]));

  // Filter matching services
  const matchedServices = servicesData
    .filter(
      (s) =>
        getCustomerKey(
          s.service.phone,
          s.service.email,
          s.service.customerName,
        ) === customerKey,
    )
    .map((s) => {
      const rawIds = s.service.assignedTechnicianIds;
      const assignedIds =
        Array.isArray(rawIds) && rawIds.length > 0
          ? rawIds
          : s.service.assignedTechnicianId
            ? [s.service.assignedTechnicianId]
            : [];
      const techNames: string[] = [];
      for (const id of assignedIds) {
        const name = techMap.get(id);
        if (name) techNames.push(name);
      }
      return {
        id: s.service.id,
        recordId: formatRecordId("SERVICE", s.service.seq),
        customerName: s.service.customerName,
        phone: s.service.phone,
        email: s.service.email,
        category: s.service.category,
        address: s.service.address,
        issueTitle: s.service.issueTitle,
        description: s.service.description,
        status: s.service.status,
        technicianName:
          techNames.length > 0
            ? techNames.join(", ")
            : s.technicianName || "Unassigned",
        amount: s.service.amount,
        closedDescription: s.service.closedDescription,
        createdAt: s.service.createdAt,
        updatedAt: s.service.updatedAt,
      };
    });

  // Filter matching installations
  const matchedInstallations = installationsData
    .filter(
      (ins) =>
        getCustomerKey(
          ins.installation.contactNumber,
          ins.installation.email,
          ins.installation.customerName,
        ) === customerKey,
    )
    .map((ins) => {
      const rawIds = ins.installation.assignedTechnicianIds;
      const assignedIds =
        Array.isArray(rawIds) && rawIds.length > 0
          ? rawIds
          : ins.installation.assignedTechnicianId
            ? [ins.installation.assignedTechnicianId]
            : [];
      const techNames: string[] = [];
      for (const id of assignedIds) {
        const name = techMap.get(id);
        if (name) techNames.push(name);
      }
      return {
        id: ins.installation.id,
        recordId: formatRecordId("INSTALLATION", ins.installation.seq),
        customerName: ins.installation.customerName,
        contactNumber: ins.installation.contactNumber,
        email: ins.installation.email,
        address: ins.installation.address,
        description: ins.installation.description,
        status: ins.installation.status,
        technicianName:
          techNames.length > 0
            ? techNames.join(", ")
            : ins.technicianName || "Unassigned",
        technicianDepartment: ins.technicianDepartment,
        accountUsername: ins.installation.accountUsername,
        accountMobile: ins.installation.accountMobile,
        referenceNo: ins.installation.referenceNo,
        amount: ins.installation.amount,
        createdAt: ins.installation.createdAt,
        updatedAt: ins.installation.updatedAt,
      };
    });

  // Filter matching projects
  const matchedProjects = projectsData
    .filter(
      (prj) =>
        getCustomerKey(
          prj.project.mobileNo,
          prj.project.email,
          prj.project.customerName,
        ) === customerKey,
    )
    .map((prj) => {
      const rawIds = prj.project.assignedTechnicianIds;
      const assignedIds =
        Array.isArray(rawIds) && rawIds.length > 0
          ? rawIds
          : prj.project.assignedTechnicianId
            ? [prj.project.assignedTechnicianId]
            : [];
      const techNames: string[] = [];
      for (const id of assignedIds) {
        const name = techMap.get(id);
        if (name) techNames.push(name);
      }
      return {
        id: prj.project.id,
        recordId: formatRecordId("PROJECT", prj.project.seq),
        companyName: prj.project.companyName,
        customerName: prj.project.customerName,
        mobileNo: prj.project.mobileNo,
        email: prj.project.email,
        location: prj.project.location,
        estimationNo: prj.project.estimationNo,
        description: prj.project.description,
        status: prj.project.status,
        technicianName:
          techNames.length > 0
            ? techNames.join(", ")
            : prj.technicianName || "Unassigned",
        technicianDepartment: prj.technicianDepartment,
        createdAt: prj.project.createdAt,
        updatedAt: prj.project.updatedAt,
      };
    });

  if (
    matchedServices.length === 0 &&
    matchedInstallations.length === 0 &&
    matchedProjects.length === 0
  ) {
    return null;
  }

  // Consolidate customer info
  const allNames = [
    ...matchedServices.map((s) => s.customerName),
    ...matchedInstallations.map((ins) => ins.customerName),
    ...matchedProjects.map((p) => p.customerName),
    ...matchedProjects.map((p) => p.companyName),
  ].filter(Boolean);

  const customerName = allNames[0] || "Customer";
  const companyName =
    matchedProjects.map((p) => p.companyName).find(Boolean) || null;
  const mobileNumber =
    matchedServices.map((s) => s.phone).find(Boolean) ||
    matchedInstallations.map((i) => i.contactNumber).find(Boolean) ||
    matchedProjects.map((p) => p.mobileNo).find(Boolean) ||
    "—";
  const email =
    matchedServices.map((s) => s.email).find(Boolean) ||
    matchedInstallations.map((i) => i.email).find(Boolean) ||
    matchedProjects.map((p) => p.email).find(Boolean) ||
    null;
  const address =
    matchedServices.map((s) => s.address).find(Boolean) ||
    matchedInstallations.map((i) => i.address).find(Boolean) ||
    matchedProjects.map((p) => p.location).find(Boolean) ||
    null;

  const allLatestDates = [
    ...matchedServices.map((s) => s.updatedAt || s.createdAt),
    ...matchedInstallations.map((i) => i.updatedAt || i.createdAt),
    ...matchedProjects.map((p) => p.updatedAt || p.createdAt),
  ];

  const lastActivityDate = new Date(
    Math.max(...allLatestDates.map((d) => d.getTime())),
  );

  const customerRow: CustomerRow = {
    id: customerKey,
    customerName,
    companyName,
    mobileNumber,
    email,
    address,
    servicesCount: matchedServices.length,
    installationsCount: matchedInstallations.length,
    projectsCount: matchedProjects.length,
    totalRequests:
      matchedServices.length +
      matchedInstallations.length +
      matchedProjects.length,
    lastActivityDate,
  };

  // Build combined chronological timeline
  const timeline: CustomerActivityItem[] = [
    ...matchedServices.map(
      (s): CustomerActivityItem => ({
        id: s.id,
        module: "SERVICE",
        recordId: s.recordId,
        title: s.issueTitle || `Service Request (${s.recordId})`,
        description: s.description,
        status: s.status,
        technicianName: s.technicianName,
        date: s.createdAt,
        updatedAt: s.updatedAt,
        amount: s.amount,
        address: s.address,
        category: s.category,
      }),
    ),
    ...matchedInstallations.map(
      (i): CustomerActivityItem => ({
        id: i.id,
        module: "INSTALLATION",
        recordId: i.recordId,
        title: `Installation (${i.recordId})`,
        description: i.description,
        status: i.status,
        technicianName: i.technicianName,
        date: i.createdAt,
        updatedAt: i.updatedAt,
        amount: i.amount,
        address: i.address,
        referenceNo: i.referenceNo,
      }),
    ),
    ...matchedProjects.map(
      (p): CustomerActivityItem => ({
        id: p.id,
        module: "PROJECT",
        recordId: p.recordId,
        title: `${p.companyName}: Project (${p.recordId})`,
        description: p.description,
        status: p.status,
        technicianName: p.technicianName,
        date: p.createdAt,
        updatedAt: p.updatedAt,
        amount: null,
        address: p.location,
        estimationNo: p.estimationNo,
      }),
    ),
  ];

  timeline.sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    customer: customerRow,
    services: matchedServices,
    installations: matchedInstallations,
    projects: matchedProjects,
    timeline,
  };
}

/**
 * Determines whether a record or work history status is eligible for
 * Customer Reports' Day-by-Day Work History and Manpower Summary.
 * Only 'IN_PROGRESS' and 'CLOSED' are eligible.
 * 'OPEN', 'REJECTED', null, or unsupported statuses are excluded.
 */
export function isEligibleRecordStatus(
  status: string | null | undefined,
): boolean {
  if (!status) return false;
  const normalized = status.trim().toUpperCase().replace(/\s+/g, "_");
  return normalized === "IN_PROGRESS" || normalized === "CLOSED";
}

export type DayByDayWorkLog = {
  id: string;
  date: string;
  rawDate: Date;
  workCompleted: string;
  description: string;
  pendingWork: string | null;
  materialsUsed: string;
  materialsList: ParsedMaterial[];
  technicianIds?: string[];
  technicianNames: string[];
  technicianDisplay: string;
  manpowerTechnicians: string;
  technicianCount: number;
  workingHours: number | null;
  progressPercentage: number | null;
  status: RecordStatus;
};

export type TechnicianManpowerItem = {
  technicianId: string;
  technicianName: string;
  workingDays: number;
  manDays: number;
  manHours: number | null;
  assignments: number;
};

export type ManpowerSummary = {
  totalDaysWorked: number;
  totalWorkingDays: number;
  totalManDays: number;
  totalManHours: number | null;
  totalAssignments: number;
  totalTechnicianAssignments: number;
  totalUniqueTechnicians: number;
  uniqueTechnicians: number;
  uniqueTechnicianNames: string[];
  technicians: TechnicianManpowerItem[];
  pendingWork: string | null;
};

export type MaterialConsumptionItem = {
  name: string;
  totalQuantity: number;
  unit: string | null;
  usageDates: string[];
};

export type ClosureSummary = {
  isClosed: boolean;
  actualWorkStartDate: Date | null;
  actualClosureDate: Date | null;
  totalCalendarDuration: string | null;
  totalDaysWorked: number;
  totalManDays: number;
  totalManHours: number | null;
  totalUniqueTechnicians: number;
  finalCompletionNotes: string | null;
  currentStatus: RecordStatus;
  elapsedDuration: string;
};

export type RecordDetailReport = {
  id: string;
  recordId: string;
  module: "SERVICE" | "INSTALLATION" | "PROJECT";
  customerName: string;
  title: string;
  description: string;
  status: RecordStatus;
  creationDate: Date;
  actualWorkStartDate: Date | null;
  completionDate: Date | null;
  assignedTechnicians: string[];
  assignedTechniciansDisplay: string;
  category: string;
  workLocation: string;
  latestProgress: string | null;
  totalElapsedDuration: string;
  dayByDayWorkHistory: DayByDayWorkLog[];
  manpowerSummary: ManpowerSummary;
  materialConsumption: MaterialConsumptionItem[];
  closureSummary: ClosureSummary;
  amount?: string | null;
  accountUsername?: string | null;
  referenceNo?: string | null;
  estimationNo?: string | null;
  companyName?: string | null;
};

export type CustomerDetailedReportData = {
  customer: CustomerRow;
  services: RecordDetailReport[];
  installations: RecordDetailReport[];
  projects: RecordDetailReport[];
  overallManpowerSummary?: ManpowerSummary;
};

function formatDurationDays(startDate: Date, endDate: Date): string {
  const diffMs = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 1) return "1 day";
  return `${diffDays} days`;
}

function formatElapsedToNow(startDate: Date): string {
  const diffMs = Math.max(0, Date.now() - startDate.getTime());
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Started today";
  if (diffDays === 1) return "1 day elapsed";
  return `${diffDays} days elapsed`;
}

/**
 * Fetches the enhanced detailed customer report across Service, Installation,
 * and Project modules with complete day-by-day work history, manpower summaries,
 * material consumption, and closure details.
 */
export async function getCustomerDetailedReport(
  customerKey: string,
  viewer?: Viewer,
): Promise<CustomerDetailedReportData | null> {
  const srScope = viewer
    ? scopeRecordToViewer(
        {
          createdById: serviceRequest.createdById,
          assignedTechnicianId: serviceRequest.assignedTechnicianId,
          assignedTechnicianIds: serviceRequest.assignedTechnicianIds,
        },
        viewer,
      )
    : undefined;
  const insScope = viewer
    ? scopeRecordToViewer(
        {
          createdById: installation.createdById,
          assignedTechnicianId: installation.assignedTechnicianId,
          assignedTechnicianIds: installation.assignedTechnicianIds,
        },
        viewer,
      )
    : undefined;
  const prjScope = viewer
    ? scopeRecordToViewer(
        {
          createdById: project.createdById,
          assignedTechnicianId: project.assignedTechnicianId,
          assignedTechnicianIds: project.assignedTechnicianIds,
        },
        viewer,
      )
    : undefined;

  const [servicesData, installationsData, projectsData, allUsers] =
    await withDbRetry(
      () =>
        Promise.all([
          db
            .select({
              service: serviceRequest,
              technicianName: srTech.name,
            })
            .from(serviceRequest)
            .leftJoin(
              srTech,
              eq(srTech.id, serviceRequest.assignedTechnicianId),
            )
            .where(srScope ? srScope : undefined)
            .orderBy(desc(serviceRequest.createdAt)),

          db
            .select({
              installation,
              technicianName: insTech.name,
              technicianDepartment: insTech.department,
            })
            .from(installation)
            .leftJoin(
              insTech,
              eq(insTech.id, installation.assignedTechnicianId),
            )
            .where(insScope ? insScope : undefined)
            .orderBy(desc(installation.createdAt)),

          db
            .select({
              project,
              technicianName: prjTech.name,
              technicianDepartment: prjTech.department,
            })
            .from(project)
            .leftJoin(prjTech, eq(prjTech.id, project.assignedTechnicianId))
            .where(prjScope ? prjScope : undefined)
            .orderBy(desc(project.createdAt)),

          db
            .select({
              id: user.id,
              name: user.name,
              department: user.department,
            })
            .from(user),
        ]),
      {
        retries: 2,
        delayMs: 150,
        operationName: "getCustomerDetailedReport:records",
      },
    );

  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  // Match records belonging to customerKey
  const matchedServices = servicesData.filter(
    (s) =>
      getCustomerKey(
        s.service.phone,
        s.service.email,
        s.service.customerName,
      ) === customerKey,
  );

  const matchedInstallations = installationsData.filter(
    (ins) =>
      getCustomerKey(
        ins.installation.contactNumber,
        ins.installation.email,
        ins.installation.customerName,
      ) === customerKey,
  );

  const matchedProjects = projectsData.filter(
    (prj) =>
      getCustomerKey(
        prj.project.mobileNo,
        prj.project.email,
        prj.project.customerName,
      ) === customerKey,
  );

  if (
    matchedServices.length === 0 &&
    matchedInstallations.length === 0 &&
    matchedProjects.length === 0
  ) {
    return null;
  }

  // Consolidate customer header info
  const allNames = [
    ...matchedServices.map((s) => s.service.customerName),
    ...matchedInstallations.map((ins) => ins.installation.customerName),
    ...matchedProjects.map((p) => p.project.customerName),
    ...matchedProjects.map((p) => p.project.companyName),
  ].filter(Boolean);

  const customerName = allNames[0] || "Customer";
  const companyName =
    matchedProjects.map((p) => p.project.companyName).find(Boolean) || null;
  const mobileNumber =
    matchedServices.map((s) => s.service.phone).find(Boolean) ||
    matchedInstallations
      .map((i) => i.installation.contactNumber)
      .find(Boolean) ||
    matchedProjects.map((p) => p.project.mobileNo).find(Boolean) ||
    "—";
  const email =
    matchedServices.map((s) => s.service.email).find(Boolean) ||
    matchedInstallations.map((i) => i.installation.email).find(Boolean) ||
    matchedProjects.map((p) => p.project.email).find(Boolean) ||
    null;
  const address =
    matchedServices.map((s) => s.service.address).find(Boolean) ||
    matchedInstallations.map((i) => i.installation.address).find(Boolean) ||
    matchedProjects.map((p) => p.project.location).find(Boolean) ||
    null;

  const allDates = [
    ...matchedServices.map((s) => s.service.updatedAt || s.service.createdAt),
    ...matchedInstallations.map(
      (i) => i.installation.updatedAt || i.installation.createdAt,
    ),
    ...matchedProjects.map((p) => p.project.updatedAt || p.project.createdAt),
  ];

  const lastActivityDate = new Date(
    Math.max(...allDates.map((d) => d.getTime())),
  );

  const customerRow: CustomerRow = {
    id: customerKey,
    customerName,
    companyName,
    mobileNumber,
    email,
    address,
    servicesCount: matchedServices.length,
    installationsCount: matchedInstallations.length,
    projectsCount: matchedProjects.length,
    totalRequests:
      matchedServices.length +
      matchedInstallations.length +
      matchedProjects.length,
    lastActivityDate,
  };

  // Fetch all work history and technician work logs for matched records
  const allRecordIds = [
    ...matchedServices.map((s) => s.service.id),
    ...matchedInstallations.map((i) => i.installation.id),
    ...matchedProjects.map((p) => p.project.id),
  ];

  let rawWorkHistory: (typeof workHistory.$inferSelect)[] = [];
  let rawTechWorkLogs: (typeof technicianWorkLog.$inferSelect)[] = [];

  if (allRecordIds.length > 0) {
    const [whRows, twlRows] = await withDbRetry(
      () =>
        Promise.all([
          db
            .select()
            .from(workHistory)
            .where(inArray(workHistory.referenceId, allRecordIds)),
          db
            .select()
            .from(technicianWorkLog)
            .where(inArray(technicianWorkLog.referenceId, allRecordIds)),
        ]),
      {
        retries: 2,
        delayMs: 150,
        operationName: "getCustomerDetailedReport:history",
      },
    );
    rawWorkHistory = whRows;
    rawTechWorkLogs = twlRows;
  }

  // Helper to build detailed reports for records of a given module
  function buildRecordReports(
    records: {
      id: string;
      seq: number;
      module: "SERVICE" | "INSTALLATION" | "PROJECT";
      customerName: string;
      title: string;
      description: string;
      status: RecordStatus;
      category: string;
      workLocation: string;
      assignedTechnicianIds: string[];
      amount?: string | null;
      closedDescription?: string | null;
      accountUsername?: string | null;
      referenceNo?: string | null;
      estimationNo?: string | null;
      companyName?: string | null;
      createdAt: Date;
      updatedAt: Date;
    }[],
  ): RecordDetailReport[] {
    return records.map((rec) => {
      const recordWh = rawWorkHistory.filter(
        (wh) => wh.referenceId === rec.id && wh.workType === rec.module,
      );
      const recordTwl = rawTechWorkLogs.filter(
        (twl) => twl.referenceId === rec.id && twl.workType === rec.module,
      );

      // Collect assigned technicians on the parent record
      const parentTechNames: string[] = [];
      const parentTechIds = new Set<string>();
      for (const tid of rec.assignedTechnicianIds) {
        if (tid) {
          const u = userMap.get(tid);
          if (u) {
            parentTechIds.add(tid);
            parentTechNames.push(u.name);
          }
        }
      }

      // Record Eligibility Rules:
      // Include a work record only when BOTH conditions are satisfied:
      // - A technician is assigned to the record.
      // - The record status is either 'In Progress' or 'Closed'.
      // Exclude:
      // - Records with 'Open' status
      // - Records without an assigned technician
      // - Records with missing or unsupported statuses
      const isParentEligible =
        isEligibleRecordStatus(rec.status) && parentTechIds.size > 0;

      if (!isParentEligible) {
        const isClosed = rec.status === "CLOSED";
        const emptyClosureSummary: ClosureSummary = {
          isClosed,
          actualWorkStartDate: null,
          actualClosureDate: isClosed ? rec.updatedAt : null,
          totalCalendarDuration: null,
          totalDaysWorked: 0,
          totalManDays: 0,
          totalManHours: null,
          totalUniqueTechnicians: 0,
          finalCompletionNotes: rec.closedDescription || null,
          currentStatus: rec.status,
          elapsedDuration: isClosed
            ? "Completed"
            : formatElapsedToNow(rec.createdAt),
        };

        const emptyManpowerSummary: ManpowerSummary = {
          totalDaysWorked: 0,
          totalWorkingDays: 0,
          totalManDays: 0,
          totalManHours: null,
          totalAssignments: 0,
          totalTechnicianAssignments: 0,
          totalUniqueTechnicians: 0,
          uniqueTechnicians: 0,
          uniqueTechnicianNames: [],
          technicians: [],
          pendingWork: null,
        };

        return {
          id: rec.id,
          recordId: formatRecordId(rec.module, rec.seq),
          module: rec.module,
          customerName: rec.customerName,
          title: rec.title,
          description: rec.description,
          status: rec.status,
          creationDate: rec.createdAt,
          actualWorkStartDate: null,
          completionDate: isClosed ? rec.updatedAt : null,
          assignedTechnicians: parentTechNames,
          assignedTechniciansDisplay:
            parentTechNames.length > 0
              ? parentTechNames.join(", ")
              : "Unassigned",
          category: rec.category,
          workLocation: rec.workLocation || "—",
          latestProgress: isClosed ? "100%" : null,
          totalElapsedDuration: isClosed
            ? "Completed"
            : formatElapsedToNow(rec.createdAt),
          dayByDayWorkHistory: [],
          manpowerSummary: emptyManpowerSummary,
          materialConsumption: [],
          closureSummary: emptyClosureSummary,
          amount: rec.amount,
          accountUsername: rec.accountUsername,
          referenceNo: rec.referenceNo,
          estimationNo: rec.estimationNo,
          companyName: rec.companyName,
        };
      }

      // Track technician metrics for Manpower Summary
      const techStatsMap = new Map<
        string,
        {
          id: string;
          name: string;
          datesWorked: Set<string>;
          assignmentsCount: number;
          hoursSum: number;
          hasHours: boolean;
        }
      >();

      function getOrCreateTechStat(tid: string) {
        let stat = techStatsMap.get(tid);
        if (!stat) {
          const u = userMap.get(tid);
          stat = {
            id: tid,
            name: u?.name || "Technician",
            datesWorked: new Set<string>(),
            assignmentsCount: 0,
            hoursSum: 0,
            hasHours: false,
          };
          techStatsMap.set(tid, stat);
        }
        return stat;
      }

      // Group work history entries by date (YYYY-MM-DD)
      const dateMap = new Map<
        string,
        {
          dateStr: string;
          rawDate: Date;
          descriptions: string[];
          techIds: Set<string>;
          status: RecordStatus;
        }
      >();

      // Track distinct (techId, dateStr) combinations to prevent double-counting
      const processedTechDates = new Set<string>();

      for (const wh of recordWh) {
        // Exclude work records with Open status, rejected, or missing status
        if (!isEligibleRecordStatus(wh.status)) {
          continue;
        }

        // Must have an assigned technician
        const entryTechIds = (wh.technicianIds || []).filter(
          (tid) => tid && userMap.has(tid),
        );
        const effectiveTechIds =
          entryTechIds.length > 0 ? entryTechIds : Array.from(parentTechIds);

        if (effectiveTechIds.length === 0) {
          continue;
        }

        const dateStr = wh.workDate
          ? typeof wh.workDate === "string"
            ? wh.workDate.split("T")[0]
            : new Date(wh.workDate).toISOString().split("T")[0]
          : wh.workDateTime
            ? new Date(wh.workDateTime).toISOString().split("T")[0]
            : wh.createdAt
              ? new Date(wh.createdAt).toISOString().split("T")[0]
              : "";

        if (!dateStr) continue;

        let entry = dateMap.get(dateStr);
        if (!entry) {
          entry = {
            dateStr,
            rawDate: wh.workDateTime || wh.createdAt,
            descriptions: [],
            techIds: new Set<string>(),
            status: wh.status,
          };
          dateMap.set(dateStr, entry);
        }
        if (wh.description && wh.description.trim()) {
          entry.descriptions.push(wh.description.trim());
        }

        const parsedWh = parseWorkHistoryDescription(wh.description);
        const whHours = parsedWh.workingHours;

        for (const tid of effectiveTechIds) {
          entry.techIds.add(tid);
          const tech = getOrCreateTechStat(tid);
          tech.assignmentsCount += 1;
          tech.datesWorked.add(dateStr);
          processedTechDates.add(`${tid}:${dateStr}`);
          if (whHours !== null) {
            tech.hasHours = true;
            tech.hoursSum += whHours;
          }
        }
        entry.status = wh.status;
      }

      for (const twl of recordTwl) {
        if (!twl.technicianId || !userMap.has(twl.technicianId)) {
          continue;
        }
        // Must be an assigned technician of the parent record
        if (!parentTechIds.has(twl.technicianId)) {
          continue;
        }

        const dateStr = twl.workDate
          ? typeof twl.workDate === "string"
            ? twl.workDate.split("T")[0]
            : new Date(twl.workDate).toISOString().split("T")[0]
          : twl.createdAt
            ? new Date(twl.createdAt).toISOString().split("T")[0]
            : "";

        if (!dateStr) continue;

        let entry = dateMap.get(dateStr);
        if (entry) {
          entry.techIds.add(twl.technicianId);
          if (twl.notes && twl.notes.trim()) {
            if (!entry.descriptions.includes(twl.notes.trim())) {
              entry.descriptions.push(twl.notes.trim());
            }
          }
          const tech = getOrCreateTechStat(twl.technicianId);
          tech.datesWorked.add(dateStr);

          const key = `${twl.technicianId}:${dateStr}`;
          if (!processedTechDates.has(key)) {
            processedTechDates.add(key);
            tech.assignmentsCount += 1;
            const parsedTwl = parseWorkHistoryDescription(twl.notes);
            if (parsedTwl.workingHours !== null) {
              tech.hasHours = true;
              tech.hoursSum += parsedTwl.workingHours;
            }
          }
        } else if (twl.notes && twl.notes.trim()) {
          // If twl has actual work notes (not an empty assignment entry)
          const parsedTwl = parseWorkHistoryDescription(twl.notes);
          entry = {
            dateStr,
            rawDate: twl.createdAt,
            descriptions: [twl.notes.trim()],
            techIds: new Set<string>([twl.technicianId]),
            status: rec.status,
          };
          dateMap.set(dateStr, entry);
          const tech = getOrCreateTechStat(twl.technicianId);
          tech.datesWorked.add(dateStr);
          tech.assignmentsCount += 1;
          processedTechDates.add(`${twl.technicianId}:${dateStr}`);
          if (parsedTwl.workingHours !== null) {
            tech.hasHours = true;
            tech.hoursSum += parsedTwl.workingHours;
          }
        }
      }

      // Sort chronological ascending (earliest day first)
      const sortedDates = Array.from(dateMap.values()).sort(
        (a, b) =>
          new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime() ||
          a.rawDate.getTime() - b.rawDate.getTime(),
      );

      // Build day-by-day work history
      const dayByDayWorkHistory: DayByDayWorkLog[] = sortedDates.map(
        (item, idx) => {
          const combinedDesc =
            item.descriptions.length > 0
              ? item.descriptions.join(" | ")
              : "Work logged";
          const parsed = parseWorkHistoryDescription(combinedDesc);

          const techNames: string[] = [];
          for (const tid of item.techIds) {
            const u = userMap.get(tid);
            if (u && u.name) techNames.push(u.name);
          }

          const technicianDisplay =
            techNames.length > 0 ? techNames.join(", ") : "—";

          const materialsUsedText =
            parsed.materials.length > 0
              ? parsed.materials
                  .map(
                    (m) =>
                      `${m.quantity} ${m.unit ? m.unit + " " : ""}${m.name}`,
                  )
                  .join(", ")
              : "—";

          return {
            id: `${rec.id}-day-${idx}-${item.dateStr}`,
            date: item.dateStr,
            rawDate: item.rawDate,
            workCompleted: parsed.workCompleted,
            description: parsed.workCompleted,
            pendingWork: parsed.pendingWork,
            materialsUsed: materialsUsedText,
            materialsList: parsed.materials,
            technicianIds: Array.from(item.techIds),
            technicianNames: techNames,
            technicianDisplay,
            manpowerTechnicians: technicianDisplay,
            technicianCount: techNames.length,
            workingHours: parsed.workingHours,
            progressPercentage: parsed.progressPercentage,
            status: item.status,
          };
        },
      );

      // Calculate Manpower Summary
      const distinctWorkDates = new Set(dayByDayWorkHistory.map((d) => d.date));
      const totalWorkingDays = distinctWorkDates.size;
      const totalDaysWorked = totalWorkingDays;

      let totalManDays = 0;
      for (const day of dayByDayWorkHistory) {
        totalManDays += day.technicianCount;
      }

      let totalHoursSum: number | null = null;
      let hasHoursRecorded = false;
      for (const day of dayByDayWorkHistory) {
        if (day.workingHours !== null) {
          hasHoursRecorded = true;
          totalHoursSum = (totalHoursSum ?? 0) + day.workingHours;
        }
      }
      const totalManHours = hasHoursRecorded ? totalHoursSum : null;

      // Unique technician IDs
      const uniqueTechIds = new Set<string>();
      for (const [tid] of techStatsMap) {
        uniqueTechIds.add(tid);
      }
      const totalUniqueTechnicians = uniqueTechIds.size;

      // Build technician-wise summary items
      const technicians: TechnicianManpowerItem[] = Array.from(
        techStatsMap.values(),
      )
        .map((stat) => ({
          technicianId: stat.id,
          technicianName: stat.name,
          workingDays: stat.datesWorked.size,
          manDays: stat.datesWorked.size,
          manHours: stat.hasHours ? stat.hoursSum : null,
          assignments: stat.assignmentsCount,
        }))
        .sort(
          (a, b) =>
            b.workingDays - a.workingDays ||
            b.assignments - a.assignments ||
            a.technicianName.localeCompare(b.technicianName),
        );

      let totalTechnicianAssignments = 0;
      for (const t of technicians) {
        totalTechnicianAssignments += t.assignments;
      }

      const uniqueTechnicianNames = technicians.map((t) => t.technicianName);

      // Latest pending work
      let latestPendingWork: string | null = null;
      for (let i = dayByDayWorkHistory.length - 1; i >= 0; i--) {
        if (dayByDayWorkHistory[i].pendingWork) {
          latestPendingWork = dayByDayWorkHistory[i].pendingWork;
          break;
        }
      }

      const manpowerSummary: ManpowerSummary = {
        totalDaysWorked: totalWorkingDays,
        totalWorkingDays,
        totalManDays,
        totalManHours,
        totalAssignments: totalTechnicianAssignments,
        totalTechnicianAssignments,
        totalUniqueTechnicians,
        uniqueTechnicians: totalUniqueTechnicians,
        uniqueTechnicianNames,
        technicians,
        pendingWork: latestPendingWork,
      };

      // Calculate Material Consumption
      const materialMap = new Map<
        string,
        {
          name: string;
          totalQuantity: number;
          unit: string | null;
          usageDates: Set<string>;
        }
      >();

      for (const day of dayByDayWorkHistory) {
        for (const mat of day.materialsList) {
          const key = mat.name.trim().toLowerCase();
          const existing = materialMap.get(key);
          if (existing) {
            existing.totalQuantity += mat.quantity;
            existing.usageDates.add(day.date);
            if (!existing.unit && mat.unit) existing.unit = mat.unit;
          } else {
            materialMap.set(key, {
              name: mat.name.trim(),
              totalQuantity: mat.quantity,
              unit: mat.unit,
              usageDates: new Set([day.date]),
            });
          }
        }
      }

      const materialConsumption: MaterialConsumptionItem[] = Array.from(
        materialMap.values(),
      )
        .map((m) => ({
          name: m.name,
          totalQuantity: m.totalQuantity,
          unit: m.unit,
          usageDates: Array.from(m.usageDates).sort(),
        }))
        .sort((a, b) => b.totalQuantity - a.totalQuantity);

      // Dates and Closure
      const actualWorkStartDate =
        sortedDates.length > 0 ? sortedDates[0].rawDate : null;

      const isClosed = rec.status === "CLOSED";
      let actualClosureDate: Date | null = null;
      if (isClosed) {
        const closedWh = recordWh.find((wh) => wh.status === "CLOSED");
        actualClosureDate =
          closedWh?.workDateTime ?? closedWh?.createdAt ?? rec.updatedAt;
      }

      const totalCalendarDuration =
        isClosed && actualClosureDate && actualWorkStartDate
          ? formatDurationDays(actualWorkStartDate, actualClosureDate)
          : null;

      const elapsedDuration = isClosed
        ? (totalCalendarDuration ?? "Completed")
        : actualWorkStartDate
          ? formatElapsedToNow(actualWorkStartDate)
          : formatElapsedToNow(rec.createdAt);

      // Final completion notes
      let finalCompletionNotes = rec.closedDescription || null;
      if (!finalCompletionNotes && isClosed) {
        const closedWh = recordWh.find(
          (wh) =>
            wh.status === "CLOSED" &&
            wh.description &&
            wh.description !== "Status changed to Closed",
        );
        if (closedWh?.description) {
          finalCompletionNotes = closedWh.description;
        }
      }

      const closureSummary: ClosureSummary = {
        isClosed,
        actualWorkStartDate,
        actualClosureDate,
        totalCalendarDuration,
        totalDaysWorked,
        totalManDays,
        totalManHours,
        totalUniqueTechnicians,
        finalCompletionNotes,
        currentStatus: rec.status,
        elapsedDuration,
      };

      // Latest progress %
      let latestProgress: string | null = null;
      for (let i = dayByDayWorkHistory.length - 1; i >= 0; i--) {
        if (dayByDayWorkHistory[i].progressPercentage !== null) {
          latestProgress = `${dayByDayWorkHistory[i].progressPercentage}%`;
          break;
        }
      }
      if (!latestProgress) {
        latestProgress = isClosed ? "100%" : null;
      }

      return {
        id: rec.id,
        recordId: formatRecordId(rec.module, rec.seq),
        module: rec.module,
        customerName: rec.customerName,
        title: rec.title,
        description: rec.description,
        status: rec.status,
        creationDate: rec.createdAt,
        actualWorkStartDate,
        completionDate: actualClosureDate,
        assignedTechnicians:
          uniqueTechnicianNames.length > 0
            ? uniqueTechnicianNames
            : parentTechNames,
        assignedTechniciansDisplay:
          parentTechNames.length > 0
            ? parentTechNames.join(", ")
            : uniqueTechnicianNames.length > 0
              ? uniqueTechnicianNames.join(", ")
              : "Unassigned",
        category: rec.category,
        workLocation: rec.workLocation || "—",
        latestProgress,
        totalElapsedDuration: elapsedDuration,
        dayByDayWorkHistory,
        manpowerSummary,
        materialConsumption,
        closureSummary,
        amount: rec.amount,
        accountUsername: rec.accountUsername,
        referenceNo: rec.referenceNo,
        estimationNo: rec.estimationNo,
        companyName: rec.companyName,
      };
    });
  }

  const services = buildRecordReports(
    matchedServices.map((s) => {
      const rawIds = s.service.assignedTechnicianIds;
      const assignedIds =
        Array.isArray(rawIds) && rawIds.length > 0
          ? rawIds
          : s.service.assignedTechnicianId
            ? [s.service.assignedTechnicianId]
            : [];
      return {
        id: s.service.id,
        seq: s.service.seq,
        module: "SERVICE" as const,
        customerName: s.service.customerName,
        title:
          s.service.issueTitle || s.service.description || "Service Request",
        description: s.service.description,
        status: s.service.status,
        category: s.service.category,
        workLocation: s.service.address,
        assignedTechnicianIds: assignedIds,
        amount: s.service.amount,
        closedDescription: s.service.closedDescription,
        createdAt: s.service.createdAt,
        updatedAt: s.service.updatedAt,
      };
    }),
  );

  const installations = buildRecordReports(
    matchedInstallations.map((ins) => {
      const rawIds = ins.installation.assignedTechnicianIds;
      const assignedIds =
        Array.isArray(rawIds) && rawIds.length > 0
          ? rawIds
          : ins.installation.assignedTechnicianId
            ? [ins.installation.assignedTechnicianId]
            : [];
      return {
        id: ins.installation.id,
        seq: ins.installation.seq,
        module: "INSTALLATION" as const,
        customerName: ins.installation.customerName,
        title: ins.installation.description || "Installation Request",
        description: ins.installation.description,
        status: ins.installation.status,
        category: ins.technicianDepartment || "Installation",
        workLocation: ins.installation.address,
        assignedTechnicianIds: assignedIds,
        accountUsername: ins.installation.accountUsername,
        referenceNo: ins.installation.referenceNo,
        amount: ins.installation.amount,
        createdAt: ins.installation.createdAt,
        updatedAt: ins.installation.updatedAt,
      };
    }),
  );

  const projects = buildRecordReports(
    matchedProjects.map((prj) => {
      const rawIds = prj.project.assignedTechnicianIds;
      const assignedIds =
        Array.isArray(rawIds) && rawIds.length > 0
          ? rawIds
          : prj.project.assignedTechnicianId
            ? [prj.project.assignedTechnicianId]
            : [];
      return {
        id: prj.project.id,
        seq: prj.project.seq,
        module: "PROJECT" as const,
        customerName: prj.project.customerName,
        title: `${prj.project.companyName}: ${prj.project.description || "Project"}`,
        description: prj.project.description,
        status: prj.project.status,
        category: prj.project.companyName || "Project",
        workLocation: prj.project.location,
        assignedTechnicianIds: assignedIds,
        estimationNo: prj.project.estimationNo,
        companyName: prj.project.companyName,
        createdAt: prj.project.createdAt,
        updatedAt: prj.project.updatedAt,
      };
    }),
  );

  // Calculate customer-wide overall manpower summary across all modules
  const allDayByDay = [
    ...services.flatMap((s) => s.dayByDayWorkHistory),
    ...installations.flatMap((i) => i.dayByDayWorkHistory),
    ...projects.flatMap((p) => p.dayByDayWorkHistory),
  ];
  const allCustomerWorkDates = new Set(allDayByDay.map((d) => d.date));
  const overallWorkingDays = allCustomerWorkDates.size;

  let overallManDays = 0;
  for (const d of allDayByDay) {
    overallManDays += d.technicianCount;
  }

  let overallHoursSum: number | null = null;
  let hasOverallHours = false;
  for (const d of allDayByDay) {
    if (d.workingHours !== null) {
      hasOverallHours = true;
      overallHoursSum = (overallHoursSum ?? 0) + d.workingHours;
    }
  }

  const allRecords = [...services, ...installations, ...projects];
  const overallTechMap = new Map<
    string,
    {
      id: string;
      name: string;
      dates: Set<string>;
      assignments: number;
      hours: number;
      hasHours: boolean;
    }
  >();

  for (const rec of allRecords) {
    for (const t of rec.manpowerSummary.technicians) {
      let item = overallTechMap.get(t.technicianId);
      if (!item) {
        item = {
          id: t.technicianId,
          name: t.technicianName,
          dates: new Set(),
          assignments: 0,
          hours: 0,
          hasHours: false,
        };
        overallTechMap.set(t.technicianId, item);
      }
      item.assignments += t.assignments;
      if (t.manHours !== null) {
        item.hasHours = true;
        item.hours += t.manHours;
      }
    }
  }

  for (const day of allDayByDay) {
    for (const tid of Array.from(overallTechMap.keys())) {
      const techItem = overallTechMap.get(tid);
      if (!techItem) continue;
      if (
        (day.technicianIds && day.technicianIds.includes(tid)) ||
        day.technicianNames.includes(techItem.name)
      ) {
        techItem.dates.add(day.date);
      }
    }
  }

  const overallTechnicians: TechnicianManpowerItem[] = Array.from(
    overallTechMap.values(),
  )
    .map((t) => ({
      technicianId: t.id,
      technicianName: t.name,
      workingDays: t.dates.size,
      manDays: t.dates.size,
      manHours: t.hasHours ? t.hours : null,
      assignments: t.assignments,
    }))
    .sort(
      (a, b) =>
        b.workingDays - a.workingDays ||
        b.assignments - a.assignments ||
        a.technicianName.localeCompare(b.technicianName),
    );

  let overallAssignments = 0;
  for (const t of overallTechnicians) {
    overallAssignments += t.assignments;
  }

  const overallManpowerSummary: ManpowerSummary = {
    totalDaysWorked: overallWorkingDays,
    totalWorkingDays: overallWorkingDays,
    totalManDays: overallManDays,
    totalManHours: hasOverallHours ? overallHoursSum : null,
    totalAssignments: overallAssignments,
    totalTechnicianAssignments: overallAssignments,
    totalUniqueTechnicians: overallTechMap.size,
    uniqueTechnicians: overallTechMap.size,
    uniqueTechnicianNames: overallTechnicians.map((t) => t.technicianName),
    technicians: overallTechnicians,
    pendingWork: null,
  };

  return {
    customer: customerRow,
    services,
    installations,
    projects,
    overallManpowerSummary,
  };
}
