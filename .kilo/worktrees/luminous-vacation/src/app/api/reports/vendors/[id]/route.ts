import { type NextRequest, NextResponse } from "next/server";
import { getVendorReport } from "@/db/queries/reports";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "Vendor ID is required" },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");
  const page = pageParam ? Number.parseInt(pageParam, 10) : 1;
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 10;
  const search = searchParams.get("search") || undefined;

  try {
    const reportData = await getVendorReport(decodeURIComponent(id), {
      page,
      limit,
      search,
    });

    if (!reportData) {
      return NextResponse.json(
        { error: "Vendor report not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(reportData);
  } catch (err: unknown) {
    console.error(`GET /api/reports/vendors/${id} error:`, err);
    return NextResponse.json(
      { error: "Failed to fetch vendor report" },
      { status: 500 },
    );
  }
}
