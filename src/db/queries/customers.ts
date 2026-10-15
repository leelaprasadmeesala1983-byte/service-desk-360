import "server-only";

import { and, desc, eq, ilike, ne, or, type SQL, sql } from "drizzle-orm";

import { db } from "@/db";
import type { Viewer } from "@/db/queries/record-scope";
import { user } from "@/db/schema/auth";
import { customer } from "@/db/schema/customer";
import { installation } from "@/db/schema/installation";
import { project } from "@/db/schema/project";
import { serviceRequest } from "@/db/schema/service-request";

export type CustomerRow = {
  id: string;
  customerName: string;
  mobileNumber: string;
  email: string | null;
  address: string;
  createdById: string | null;
  createdByName?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomerListParams = {
  search?: string;
  page?: number;
  limit?: number;
};

export type CustomerListResult = {
  customers: CustomerRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export async function listCustomers(
  params: CustomerListParams = {},
  viewer?: Viewer,
): Promise<CustomerListResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, Math.min(100, params.limit ?? 10));
  const offset = (page - 1) * limit;

  // Enforce server-side user isolation: caller must provide a valid authenticated viewer
  if (!viewer?.id) {
    return {
      customers: [],
      total: 0,
      page,
      limit,
      totalPages: 1,
    };
  }

  const conditions: SQL[] = [eq(customer.createdById, viewer.id)];

  if (params.search && params.search.trim().length > 0) {
    const rawSearch = params.search.trim();
    const searchTerm = `%${rawSearch}%`;

    conditions.push(
      or(
        ilike(customer.customerName, searchTerm),
        ilike(customer.mobileNumber, searchTerm),
        ilike(customer.email, searchTerm),
        ilike(customer.address, searchTerm),
      )!,
    );
  }

  const whereClause = and(...conditions);

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(customer)
      .where(whereClause),
    db
      .select({
        id: customer.id,
        customerName: customer.customerName,
        mobileNumber: customer.mobileNumber,
        email: customer.email,
        address: customer.address,
        createdById: customer.createdById,
        createdByName: user.name,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      })
      .from(customer)
      .leftJoin(user, eq(customer.createdById, user.id))
      .where(whereClause)
      .orderBy(desc(customer.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = countResult[0]?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    customers: rows,
    total,
    page,
    limit,
    totalPages,
  };
}

export async function getCustomerById(
  id: string,
  viewer?: Viewer,
): Promise<CustomerRow | null> {
  if (!viewer?.id) {
    return null;
  }

  const rows = await db
    .select({
      id: customer.id,
      customerName: customer.customerName,
      mobileNumber: customer.mobileNumber,
      email: customer.email,
      address: customer.address,
      createdById: customer.createdById,
      createdByName: user.name,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    })
    .from(customer)
    .leftJoin(user, eq(customer.createdById, user.id))
    .where(and(eq(customer.id, id), eq(customer.createdById, viewer.id)))
    .limit(1);

  return rows[0] ?? null;
}

export async function getCustomerByMobile(
  mobileNumber: string,
  excludeId?: string,
): Promise<CustomerRow | null> {
  const conditions: SQL[] = [eq(customer.mobileNumber, mobileNumber.trim())];
  if (excludeId) {
    conditions.push(ne(customer.id, excludeId));
  }

  const rows = await db
    .select({
      id: customer.id,
      customerName: customer.customerName,
      mobileNumber: customer.mobileNumber,
      email: customer.email,
      address: customer.address,
      createdById: customer.createdById,
      createdByName: user.name,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    })
    .from(customer)
    .leftJoin(user, eq(customer.createdById, user.id))
    .where(and(...conditions))
    .limit(1);

  return rows[0] ?? null;
}

export async function getCustomerByEmail(
  email: string,
  excludeId?: string,
): Promise<CustomerRow | null> {
  if (!email || !email.trim()) return null;

  const conditions: SQL[] = [ilike(customer.email, email.trim())];
  if (excludeId) {
    conditions.push(ne(customer.id, excludeId));
  }

  const rows = await db
    .select({
      id: customer.id,
      customerName: customer.customerName,
      mobileNumber: customer.mobileNumber,
      email: customer.email,
      address: customer.address,
      createdById: customer.createdById,
      createdByName: user.name,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    })
    .from(customer)
    .leftJoin(user, eq(customer.createdById, user.id))
    .where(and(...conditions))
    .limit(1);

  return rows[0] ?? null;
}

export async function getCustomerStats(
  viewer?: Viewer,
): Promise<{ total: number }> {
  if (!viewer?.id) {
    return { total: 0 };
  }

  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customer)
    .where(eq(customer.createdById, viewer.id));

  return {
    total: countResult[0]?.count ?? 0,
  };
}

export async function checkCustomerReferences(
  id: string,
  mobileNumber: string,
  customerName: string,
): Promise<{
  isLinked: boolean;
  serviceRequestsCount: number;
  installationsCount: number;
  projectsCount: number;
  totalReferences: number;
  message?: string;
}> {
  const cleanMobile = mobileNumber.trim();
  const cleanName = customerName.trim();

  const [srvRes, insRes, prjRes] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(serviceRequest)
      .where(
        or(
          eq(serviceRequest.phone, cleanMobile),
          ilike(serviceRequest.customerName, cleanName),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(installation)
      .where(
        or(
          eq(installation.contactNumber, cleanMobile),
          ilike(installation.customerName, cleanName),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(project)
      .where(
        or(
          eq(project.mobileNo, cleanMobile),
          ilike(project.customerName, cleanName),
        ),
      ),
  ]);

  const serviceRequestsCount = srvRes[0]?.count ?? 0;
  const installationsCount = insRes[0]?.count ?? 0;
  const projectsCount = prjRes[0]?.count ?? 0;
  const totalReferences =
    serviceRequestsCount + installationsCount + projectsCount;

  if (totalReferences > 0) {
    const parts: string[] = [];
    if (serviceRequestsCount > 0) {
      parts.push(`${serviceRequestsCount} service request(s)`);
    }
    if (installationsCount > 0) {
      parts.push(`${installationsCount} installation(s)`);
    }
    if (projectsCount > 0) {
      parts.push(`${projectsCount} project(s)`);
    }

    return {
      isLinked: true,
      serviceRequestsCount,
      installationsCount,
      projectsCount,
      totalReferences,
      message: `Cannot delete customer because they are linked to ${parts.join(
        ", ",
      )}. Please remove or reassign those records first.`,
    };
  }

  return {
    isLinked: false,
    serviceRequestsCount: 0,
    installationsCount: 0,
    projectsCount: 0,
    totalReferences: 0,
  };
}

export async function listCustomersForDropdown(
  search?: string,
  viewer?: Viewer,
) {
  if (!viewer?.id) {
    return [];
  }

  const conditions: SQL[] = [eq(customer.createdById, viewer.id)];

  if (search && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(customer.customerName, term),
        ilike(customer.mobileNumber, term),
        ilike(customer.email, term),
      )!,
    );
  }

  const whereClause = and(...conditions);

  return db
    .select({
      id: customer.id,
      customerName: customer.customerName,
      mobileNumber: customer.mobileNumber,
      email: customer.email,
      address: customer.address,
    })
    .from(customer)
    .where(whereClause)
    .orderBy(customer.customerName)
    .limit(50);
}
