import { type NextRequest, NextResponse } from "next/server";

import {
  deleteSendToVendorRecord,
  getSendToVendorById,
  updateSendToVendorRecord,
} from "@/db/queries/send-to-vendor";
import { getCurrentUser } from "@/lib/session";
import { sendToVendorFormSchema } from "@/lib/validations/send-to-vendor";

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
    const item = await getSendToVendorById(id);
    if (!item) {
      return NextResponse.json(
        { error: "Send to Vendor record not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, data: item });
  } catch (err: unknown) {
    console.error("GET /api/assets/send-to-vendor/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch record details" },
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

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden. Admins only." },
      { status: 403 },
    );
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = sendToVendorFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const updated = await updateSendToVendorRecord(id, {
      assetId: data.assetId || null,
      vendorName: data.vendorName,
      contactPerson: data.contactPerson,
      phoneNumber: data.phoneNumber,
      address: data.address,
      reasonForRepair: data.reasonForRepair,
      remarks: data.remarks || "",
      courierName: data.courierName,
      docketAwbNumber: data.docketAwbNumber,
      bookingDate: data.bookingDate,
      numberOfPackages: data.numberOfPackages,
      dispatchRemarks: data.dispatchRemarks || "",
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Send to Vendor record not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    console.error("PUT /api/assets/send-to-vendor/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Failed to update record";
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

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden. Admins only." },
      { status: 403 },
    );
  }

  const { id } = await params;

  try {
    const deleted = await deleteSendToVendorRecord(id, user.id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Send to Vendor record not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Send to Vendor record deleted",
    });
  } catch (err: unknown) {
    console.error("DELETE /api/assets/send-to-vendor/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Failed to delete record";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
