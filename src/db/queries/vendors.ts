import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { sendToVendor } from "@/db/schema/send-to-vendor";
import { vendor } from "@/db/schema/vendor";
import type {
  CreateVendorInput,
  Vendor,
  VendorListParams,
  VendorListResponse,
  VendorRow,
} from "@/types/vendors";

export async function listVendors(
  params: VendorListParams = {},
): Promise<VendorListResponse> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.max(1, Math.min(100, params.limit ?? 10));
  const offset = (page - 1) * limit;

  const conditions = [];

  if (params.search && params.search.trim().length > 0) {
    const rawSearch = params.search.trim();
    const searchTerm = `%${rawSearch}%`;

    conditions.push(
      or(
        ilike(vendor.vendorName, searchTerm),
        ilike(vendor.contactPerson, searchTerm),
        ilike(vendor.phoneNumber, searchTerm),
        ilike(vendor.address, searchTerm),
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(vendor)
      .where(whereClause),
    db
      .select({
        id: vendor.id,
        vendorName: vendor.vendorName,
        contactPerson: vendor.contactPerson,
        phoneNumber: vendor.phoneNumber,
        address: vendor.address,
        createdById: vendor.createdById,
        createdByName: user.name,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
      })
      .from(vendor)
      .leftJoin(user, eq(vendor.createdById, user.id))
      .where(whereClause)
      .orderBy(desc(vendor.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = countResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const data: VendorRow[] = rows.map((row) => ({
    id: row.id,
    vendorName: row.vendorName,
    contactPerson: row.contactPerson,
    phoneNumber: row.phoneNumber,
    address: row.address,
    createdById: row.createdById,
    createdByName: row.createdByName ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

export async function getAllVendors(): Promise<VendorRow[]> {
  const rows = await db
    .select({
      id: vendor.id,
      vendorName: vendor.vendorName,
      contactPerson: vendor.contactPerson,
      phoneNumber: vendor.phoneNumber,
      address: vendor.address,
      createdById: vendor.createdById,
      createdByName: user.name,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    })
    .from(vendor)
    .leftJoin(user, eq(vendor.createdById, user.id))
    .orderBy(vendor.vendorName);

  return rows.map((row) => ({
    id: row.id,
    vendorName: row.vendorName,
    contactPerson: row.contactPerson,
    phoneNumber: row.phoneNumber,
    address: row.address,
    createdById: row.createdById,
    createdByName: row.createdByName ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function getVendorById(id: string): Promise<Vendor | null> {
  const [row] = await db
    .select({
      id: vendor.id,
      vendorName: vendor.vendorName,
      contactPerson: vendor.contactPerson,
      phoneNumber: vendor.phoneNumber,
      address: vendor.address,
      createdById: vendor.createdById,
      creatorId: user.id,
      creatorName: user.name,
      creatorEmail: user.email,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    })
    .from(vendor)
    .leftJoin(user, eq(vendor.createdById, user.id))
    .where(eq(vendor.id, id))
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    vendorName: row.vendorName,
    contactPerson: row.contactPerson,
    phoneNumber: row.phoneNumber,
    address: row.address,
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.creatorId
      ? {
          id: row.creatorId,
          name: row.creatorName ?? "",
          email: row.creatorEmail ?? "",
        }
      : null,
  };
}

export async function createVendorRecord(
  input: CreateVendorInput,
  createdById?: string,
): Promise<Vendor> {
  const [created] = await db
    .insert(vendor)
    .values({
      vendorName: input.vendorName.trim(),
      contactPerson: input.contactPerson.trim(),
      phoneNumber: input.phoneNumber.trim(),
      address: input.address.trim(),
      createdById: createdById ?? null,
    })
    .returning();

  return created as Vendor;
}

export async function updateVendorRecord(
  id: string,
  input: Partial<CreateVendorInput>,
): Promise<Vendor | null> {
  const valuesToUpdate: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.vendorName !== undefined)
    valuesToUpdate.vendorName = input.vendorName.trim();
  if (input.contactPerson !== undefined)
    valuesToUpdate.contactPerson = input.contactPerson.trim();
  if (input.phoneNumber !== undefined)
    valuesToUpdate.phoneNumber = input.phoneNumber.trim();
  if (input.address !== undefined)
    valuesToUpdate.address = input.address.trim();

  const [updated] = await db
    .update(vendor)
    .set(valuesToUpdate)
    .where(eq(vendor.id, id))
    .returning();

  return (updated as Vendor) ?? null;
}

export async function deleteVendorRecord(id: string): Promise<boolean> {
  const [target] = await db
    .select({ id: vendor.id })
    .from(vendor)
    .where(eq(vendor.id, id))
    .limit(1);

  if (!target) return false;

  const result = await db
    .delete(vendor)
    .where(eq(vendor.id, id))
    .returning({ id: vendor.id });

  return result.length > 0;
}
