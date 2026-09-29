import { type NextRequest, NextResponse } from "next/server";
import { getAssetDashboardData } from "@/db/queries/asset-dashboard";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const viewer = { role: user.role, id: user.id };
    const data = await getAssetDashboardData(viewer);
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    console.error("GET /api/assets/dashboard error:", err);
    return NextResponse.json(
      { error: "Failed to fetch asset dashboard data" },
      { status: 500 },
    );
  }
}
