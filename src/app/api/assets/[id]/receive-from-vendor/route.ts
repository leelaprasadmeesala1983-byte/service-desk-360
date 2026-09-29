import { type NextRequest, NextResponse } from "next/server";
import { receiveMaterialFromVendor } from "@/db/queries/asset-lifecycle";
import { getCurrentUser } from "@/lib/session";
import { receiveFromVendorSchema } from "@/lib/validations/send-to-vendor";

export async function POST(
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
    const parsed = receiveFromVendorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const updated = await receiveMaterialFromVendor({
      assetId,
      input: parsed.data,
      userId: user.id,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    console.error("POST /api/assets/[id]/receive-from-vendor error:", err);
    const msg =
      err instanceof Error
        ? err.message
        : "Failed to record material return from vendor";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
