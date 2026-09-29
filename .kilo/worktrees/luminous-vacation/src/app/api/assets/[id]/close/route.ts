import { type NextRequest, NextResponse } from "next/server";
import { closeMaterialLifecycle } from "@/db/queries/asset-lifecycle";
import { getCurrentUser } from "@/lib/session";

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
    const body = await request.json().catch(() => ({}));
    const remarks =
      typeof body.remarks === "string" && body.remarks.trim()
        ? body.remarks.trim()
        : "Material lifecycle closed";

    const result = await closeMaterialLifecycle({
      assetId,
      userId: user.id,
      remarks,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    console.error("POST /api/assets/[id]/close error:", err);
    const msg =
      err instanceof Error ? err.message : "Failed to close material lifecycle";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
