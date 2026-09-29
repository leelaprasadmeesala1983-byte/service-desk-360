import { type NextRequest, NextResponse } from "next/server";
import { getItemReport } from "@/db/queries/reports";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const trackId =
    searchParams.get("trackId") || searchParams.get("search") || undefined;

  if (!trackId || !trackId.trim()) {
    return NextResponse.json(
      { error: "Track ID or Search query is required" },
      { status: 400 },
    );
  }

  try {
    const reportData = await getItemReport(trackId.trim());

    if (!reportData) {
      return NextResponse.json(
        { error: `No material found with Track ID "${trackId}"` },
        { status: 404 },
      );
    }

    return NextResponse.json(reportData);
  } catch (err: unknown) {
    console.error("GET /api/reports/items error:", err);
    return NextResponse.json(
      { error: "Failed to fetch item report" },
      { status: 500 },
    );
  }
}
