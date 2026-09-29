import { type NextRequest, NextResponse } from "next/server";

import {
  createSendToVendorRecord,
  listSendToVendor,
} from "@/db/queries/send-to-vendor";
import { getCurrentUser } from "@/lib/session";
import { sendToVendorFormSchema } from "@/lib/validations/send-to-vendor";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");
  const page = pageParam ? Number.parseInt(pageParam, 10) : 1;
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 10;
  const search = searchParams.get("search") || undefined;

  try {
    const viewer = { role: user.role, id: user.id };
    const result = await listSendToVendor({ page, limit, search }, viewer);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("GET /api/assets/send-to-vendor error:", err);
    return NextResponse.json(
      { error: "Failed to fetch send to vendor records" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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
    const created = await createSendToVendorRecord(
      {
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
      },
      user.id,
    );

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/assets/send-to-vendor error:", err);
    const msg =
      err instanceof Error
        ? err.message
        : "Failed to create Send to Vendor record";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
