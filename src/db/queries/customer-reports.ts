import "server-only";

import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { installation } from "@/db/schema/installation";
import { project } from "@/db/schema/project";
import { serviceRequest } from "@/db/schema/service-request";
import type { RecordStatus, ServiceCategory } from "@/lib/constants";
import { formatRecordId } from "@/lib/format";

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
    issueTitle: string;
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
    email: string;
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
    email: string;
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
): Promise<CustomerReportResult> {
  const [servicesData, installationsData, projectsData] = await Promise.all([
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
      .orderBy(desc(project.createdAt)),
  ]);

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
): Promise<CustomerRow[]> {
  const result = await getCustomerReports({
    ...params,
    page: 1,
    perPage: 100000,
  });
  return result.customers;
}

/**
 * Fetches full Customer 360 data including service, installation, and project histories.
 */
export async function getCustomer360Details(
  customerKey: string,
): Promise<Customer360Data | null> {
  const [servicesData, installationsData, projectsData, allTechs] =
    await Promise.all([
      db
        .select({
          service: serviceRequest,
          technicianName: srTech.name,
        })
        .from(serviceRequest)
        .leftJoin(srTech, eq(srTech.id, serviceRequest.assignedTechnicianId))
        .orderBy(desc(serviceRequest.createdAt)),

      db
        .select({
          installation,
          technicianName: insTech.name,
          technicianDepartment: insTech.department,
        })
        .from(installation)
        .leftJoin(insTech, eq(insTech.id, installation.assignedTechnicianId))
        .orderBy(desc(installation.createdAt)),

      db
        .select({
          project,
          technicianName: prjTech.name,
          technicianDepartment: prjTech.department,
        })
        .from(project)
        .leftJoin(prjTech, eq(prjTech.id, project.assignedTechnicianId))
        .orderBy(desc(project.createdAt)),

      db
        .select({ id: user.id, name: user.name })
        .from(user)
        .where(eq(user.role, "TECHNICIAN")),
    ]);

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
