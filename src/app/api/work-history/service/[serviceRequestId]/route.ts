import { type NextRequest, NextResponse } from "next/server";

import { getCombinedWorkHistory } from "@/db/queries/work-history";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ serviceRequestId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { serviceRequestId } = await params;
  if (!serviceRequestId) {
    return NextResponse.json(
      { error: "Service request ID is required" },
      { status: 400 },
    );
  }

  try {
    const result = await getCombinedWorkHistory({
      workType: "SERVICE",
      referenceId: serviceRequestId,
    });

    if (!result.serviceRequest) {
      return NextResponse.json(
        { error: "Service request not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      serviceRequest: result.serviceRequest,
      history: result.history,
      totalLogs: result.totalLogs,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to fetch work history";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
