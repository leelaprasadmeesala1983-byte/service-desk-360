import { type NextRequest, NextResponse } from "next/server";

import { createWorkHistory } from "@/lib/actions/work-history";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: NextRequest) {
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
