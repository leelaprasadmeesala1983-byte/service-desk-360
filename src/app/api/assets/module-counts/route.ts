import { type NextRequest, NextResponse } from "next/server";
import { getModuleCounts } from "@/db/queries/asset-dashboard";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getModuleCounts();
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    console.error("GET /api/assets/module-counts error:", err);
    return NextResponse.json(
      { error: "Failed to fetch module counts" },
      { status: 500 },
    );
  }
}
