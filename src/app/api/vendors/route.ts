import { type NextRequest, NextResponse } from "next/server";

import { createVendorRecord, listVendors } from "@/db/queries/vendors";
import { getCurrentUser } from "@/lib/session";
import { vendorFormSchema } from "@/lib/validations/vendors";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pageParam = searchParams.get("page");
  const limitParam = searchParams.get("limit");
  const page = pageParam ? Number.parseInt(pageParam, 10) : 1;
  const limit = limitParam ? Number.parseInt(limitParam, 10) : 10;
  const search = searchParams.get("search") || undefined;

  try {
    const viewer = { role: user.role, id: user.id };
    const result = await listVendors({ page, limit, search }, viewer);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("GET /api/vendors error:", err);
    return NextResponse.json(
      { error: "Failed to fetch vendors" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN" && (user.role as string) !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Forbidden. Admins only." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const parsed = vendorFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const created = await createVendorRecord(parsed.data, user.id);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/vendors error:", err);
    const msg = err instanceof Error ? err.message : "Failed to create vendor";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
