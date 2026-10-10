import { type NextRequest, NextResponse } from "next/server";

import { updateInstallationDetails } from "@/lib/actions/installations";
import { getCurrentUser } from "@/lib/session";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const result = await updateInstallationDetails({ ...body, id });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, fieldErrors: result.fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json({ success: true, data: result.data });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to update installation details";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return PUT(request, context);
}
