import { type NextRequest, NextResponse } from "next/server";
import { getVendorReportOptions } from "@/db/queries/reports";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;

  try {
    const viewer = { role: user.role, id: user.id };
    const vendors = await getVendorReportOptions(search, viewer);
    return NextResponse.json({ vendors });
  } catch (err: unknown) {
    console.error("GET /api/reports/vendors error:", err);
    return NextResponse.json(
      { error: "Failed to fetch vendor report options" },
      { status: 500 },
    );
  }
}
