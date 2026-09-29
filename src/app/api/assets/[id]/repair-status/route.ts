import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateAssetRepairStatus } from "@/db/queries/asset-lifecycle";
import { getCurrentUser } from "@/lib/session";

const repairStatusSchema = z.object({
  repairStatus: z.enum([
    "UNDER_REPAIR",
    "REPAIR_COMPLETED",
    "REPAIR_NOT_COMPLETED",
    "REPAIR_REJECTED",
    "RECEIVED_FROM_VENDOR",
  ]),
  remarks: z.string().optional().default(""),
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

  const { id: assetId } = await params;

  try {
    const body = await request.json();
    const parsed = repairStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const updated = await updateAssetRepairStatus({
      assetId,
      repairStatus: parsed.data.repairStatus,
      remarks: parsed.data.remarks,
      userId: user.id,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    console.error("PATCH /api/assets/[id]/repair-status error:", err);
    const msg =
      err instanceof Error
        ? err.message
        : "Failed to update material repair status";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
