import { type NextRequest, NextResponse } from "next/server";
import { getCustomerReportOptions } from "@/db/queries/reports";
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
    const customers = await getCustomerReportOptions(search, viewer);
    return NextResponse.json({ customers });
  } catch (err: unknown) {
    console.error("GET /api/reports/customers error:", err);
    return NextResponse.json(
      { error: "Failed to fetch customer report options" },
      { status: 500 },
    );
  }
}
