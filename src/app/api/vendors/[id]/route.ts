import { type NextRequest, NextResponse } from "next/server";

import {
  deleteVendorRecord,
  getVendorById,
  updateVendorRecord,
} from "@/db/queries/vendors";
import { getCurrentUser } from "@/lib/session";
import { vendorFormSchema } from "@/lib/validations/vendors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const viewer = { role: user.role, id: user.id };
    const item = await getVendorById(id, viewer);
    if (!item) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: item });
  } catch (err: unknown) {
    console.error("GET /api/vendors/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch vendor details" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN" && (user.role as string) !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Forbidden. Admins only." },
      { status: 403 },
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = vendorFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const viewer = { role: user.role, id: user.id };
    const updated = await updateVendorRecord(id, parsed.data, viewer);
    if (!updated) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    console.error("PUT /api/vendors/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Failed to update vendor";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN" && (user.role as string) !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Forbidden. Admins only." },
      { status: 403 },
    );
  }

  const { id } = await params;

  try {
    const viewer = { role: user.role, id: user.id };
    const deleted = await deleteVendorRecord(id, viewer);
    if (!deleted) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Vendor deleted" });
  } catch (err: unknown) {
    console.error("DELETE /api/vendors/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Failed to delete vendor";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
