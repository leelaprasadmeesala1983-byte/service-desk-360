import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { updateSendToVendorStatus } from "@/db/queries/send-to-vendor";
import { getCurrentUser } from "@/lib/session";

const updateStatusSchema = z.object({
  status: z.enum([
    "UNDER_REPAIR",
    "REPAIRED",
    "DEAD",
    "NOT_REPAIRABLE",
    "REPLACEMENT",
    "NO_FAULT_FOUND",
    "WAITING_FOR_PARTS",
    "OTHER",
    "REPAIR_COMPLETED",
    "RETURN_TO_CUSTOMER",
  ]),
  workflowStage: z
    .enum([
      "SENT_TO_VENDOR",
      "REPAIR_STATUS",
      "VENDOR_RECEIVED",
      "CUSTOMER_RETURN",
    ])
    .optional(),
});

export async function PATCH(
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
    const parsed = updateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const updated = await updateSendToVendorStatus(
      id,
      parsed.data.status,
      user.id,
      parsed.data.workflowStage,
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Vendor Dispatch record not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    console.error("PATCH /api/assets/send-to-vendor/[id]/status error:", err);
    const msg = err instanceof Error ? err.message : "Failed to update status";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
