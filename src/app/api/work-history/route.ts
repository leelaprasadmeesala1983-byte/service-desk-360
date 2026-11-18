import { type NextRequest, NextResponse } from "next/server";

import { createWorkHistory } from "@/lib/actions/work-history";
import { withApiLogging } from "@/lib/api-logger";
import { getCurrentUser } from "@/lib/session";

async function postHandler(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await createWorkHistory(body);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, fieldErrors: result.fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to create work history";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const POST = withApiLogging(postHandler);
