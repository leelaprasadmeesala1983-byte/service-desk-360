"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  type CustomerListParams,
  type CustomerListResult,
  type CustomerRow,
  checkCustomerReferences,
  getCustomerByEmail,
  getCustomerById,
  getCustomerByMobile,
  listCustomers,
  listCustomersForDropdown,
} from "@/db/queries/customers";
import { customer } from "@/db/schema/customer";
import { requireAdmin, requireUser } from "@/lib/session";
import {
  addCustomerSchema,
  deleteCustomerSchema,
  editCustomerSchema,
} from "@/lib/validations/customer";

import { type ActionResult, actionError, actionOk } from "./result";

const CUSTOMERS_PATH = "/service-tickets/customers";

export async function createCustomer(
  input: unknown,
): Promise<ActionResult<CustomerRow>> {
  const currentUser = await requireUser();

  const parsed = addCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "Please correct the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const data = parsed.data;
  const mobile = data.mobileNumber.trim();
  const email = data.email?.trim().toLowerCase() || null;

  // Check duplicate mobile
  const existingByMobile = await getCustomerByMobile(mobile);
  if (existingByMobile) {
    return actionError("A customer with this mobile number already exists.", {
      mobileNumber: ["This mobile number is already registered."],
    });
  }

  // Check duplicate email only if an email address is provided
  if (email) {
    const existingByEmail = await getCustomerByEmail(email);
    if (existingByEmail) {
      return actionError("A customer with this email address already exists.", {
        email: ["This email address is already registered."],
      });
    }
  }

  try {
    const [inserted] = await db
      .insert(customer)
      .values({
        customerName: data.customerName.trim(),
        mobileNumber: mobile,
        email: email,
        address: data.address.trim(),
        createdById: currentUser.id,
      })
      .returning();

    revalidatePath(CUSTOMERS_PATH);
    revalidatePath("/service-tickets/service-management");
    revalidatePath("/service-tickets/installation-management");
    revalidatePath("/service-tickets/project-management");

    return actionOk(inserted as unknown as CustomerRow);
  } catch (err) {
    console.error("Error creating customer:", err);
    return actionError("Failed to create customer. Please try again.");
  }
}

export async function updateCustomer(
  input: unknown,
): Promise<ActionResult<CustomerRow>> {
  const currentUser = await requireUser();
  const viewer = { role: currentUser.role, id: currentUser.id };

  const parsed = editCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "Please correct the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const data = parsed.data;

  // Enforce server-side ownership: only the owner can fetch and edit
  const existing = await getCustomerById(data.id, viewer);
  if (!existing) {
    return actionError("Customer not found or unauthorized.");
  }

  const mobile = data.mobileNumber.trim();
  const email = data.email?.trim().toLowerCase() || null;

  // Check duplicate mobile excluding this customer
  const duplicateMobile = await getCustomerByMobile(mobile, data.id);
  if (duplicateMobile) {
    return actionError("A customer with this mobile number already exists.", {
      mobileNumber: [
        "This mobile number is already in use by another customer.",
      ],
    });
  }

  // Check duplicate email excluding this customer only if email is provided
  if (email) {
    const duplicateEmail = await getCustomerByEmail(email, data.id);
    if (duplicateEmail) {
      return actionError("A customer with this email address already exists.", {
        email: ["This email address is already in use by another customer."],
      });
    }
  }

  try {
    const [updated] = await db
      .update(customer)
      .set({
        customerName: data.customerName.trim(),
        mobileNumber: mobile,
        email: email,
        address: data.address.trim(),
        updatedAt: new Date(),
      })
      .where(
        and(eq(customer.id, data.id), eq(customer.createdById, currentUser.id)),
      )
      .returning();

    revalidatePath(CUSTOMERS_PATH);
    revalidatePath("/service-tickets/service-management");
    revalidatePath("/service-tickets/installation-management");
    revalidatePath("/service-tickets/project-management");

    return actionOk(updated as unknown as CustomerRow);
  } catch (err) {
    console.error("Error updating customer:", err);
    return actionError("Failed to update customer. Please try again.");
  }
}

export async function deleteCustomer(input: unknown): Promise<ActionResult> {
  const currentUser = await requireAdmin();
  const viewer = { role: currentUser.role, id: currentUser.id };

  const parsed = deleteCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Invalid customer ID.");
  }

  const { id } = parsed.data;

  // Enforce server-side ownership: only the owner can delete
  const existing = await getCustomerById(id, viewer);
  if (!existing) {
    return actionError("Customer not found or unauthorized.");
  }

  // Check references across Service, Installation, and Project records
  const referenceCheck = await checkCustomerReferences(
    existing.id,
    existing.mobileNumber,
    existing.customerName,
  );

  if (referenceCheck.isLinked) {
    return actionError(
      referenceCheck.message ||
        "Cannot delete customer because they are linked to existing service requests, installations, or projects.",
    );
  }

  try {
    await db
      .delete(customer)
      .where(
        and(eq(customer.id, id), eq(customer.createdById, currentUser.id)),
      );

    revalidatePath(CUSTOMERS_PATH);
    revalidatePath("/service-tickets/service-management");
    revalidatePath("/service-tickets/installation-management");
    revalidatePath("/service-tickets/project-management");

    return actionOk();
  } catch (err) {
    console.error("Error deleting customer:", err);
    return actionError("Failed to delete customer. Please try again.");
  }
}

export async function fetchCustomers(
  params: CustomerListParams = {},
): Promise<ActionResult<CustomerListResult>> {
  const currentUser = await requireUser();
  const viewer = { role: currentUser.role, id: currentUser.id };

  try {
    const result = await listCustomers(params, viewer);
    return actionOk(result);
  } catch (err) {
    console.error("Error fetching customers:", err);
    return actionError("Failed to fetch customers.");
  }
}

export async function searchCustomersDropdown(search?: string): Promise<
  ActionResult<
    Array<{
      id: string;
      customerName: string;
      mobileNumber: string;
      email: string | null;
      address: string;
    }>
  >
> {
  const currentUser = await requireUser();
  const viewer = { role: currentUser.role, id: currentUser.id };

  try {
    const items = await listCustomersForDropdown(search, viewer);
    return actionOk(items);
  } catch (err) {
    console.error("Error searching customers:", err);
    return actionError("Failed to search customers.");
  }
}
