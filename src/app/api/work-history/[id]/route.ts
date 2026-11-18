import { type NextRequest, NextResponse } from "next/server";

import { getWorkHistoryById } from "@/db/queries/work-history";
import {
  deleteWorkHistory,
  updateWorkHistory,
} from "@/lib/actions/work-history";
import { withApiLogging } from "@/lib/api-logger";
import { getCurrentUser } from "@/lib/session";

async function getHandler(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const item = await getWorkHistoryById(id);
    if (!item) {
      return NextResponse.json(
        { error: "Work history entry not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ data: item });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch entry";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function putHandler(
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
    const result = await updateWorkHistory({ ...body, id });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, fieldErrors: result.fieldErrors },
        { status: 400 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update entry";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function patchHandler(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return PUT(request, context);
}

async function deleteHandler(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    const result = await deleteWorkHistory({ id });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete entry";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const GET = withApiLogging(getHandler);
export const PUT = withApiLogging(putHandler);
export const PATCH = withApiLogging(patchHandler);
export const DELETE = withApiLogging(deleteHandler);
