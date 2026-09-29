import { type NextRequest, NextResponse } from "next/server";
import { getAssetLifecycleHistory } from "@/db/queries/asset-lifecycle";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: assetId } = await params;

  try {
    const history = await getAssetLifecycleHistory(assetId);
    return NextResponse.json({ success: true, data: history });
  } catch (err: unknown) {
    console.error("GET /api/assets/[id]/history error:", err);
    return NextResponse.json(
      { error: "Failed to fetch asset history" },
      { status: 500 },
    );
  }
}
