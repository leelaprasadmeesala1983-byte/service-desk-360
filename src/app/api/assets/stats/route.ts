import { type NextRequest, NextResponse } from "next/server";

import { getAssetStats } from "@/db/queries/assets";
import { getCurrentUser } from "@/lib/session";

export async function GET(_request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await getAssetStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (err: unknown) {
    console.error("GET /api/assets/stats error:", err);
    return NextResponse.json(
      { error: "Failed to fetch asset stats" },
      { status: 500 },
    );
  }
}
