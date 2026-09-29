import { type NextRequest, NextResponse } from "next/server";

import { createAssetRecord, listAssets } from "@/db/queries/assets";
import { getCurrentUser } from "@/lib/session";
import { assetFormSchema } from "@/lib/validations/assets";

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
  const status = searchParams.get("status") || undefined;

  try {
    const viewer = { role: user.role, id: user.id };
    const result = await listAssets({ page, limit, search, status }, viewer);
    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("GET /api/assets error:", err);
    return NextResponse.json(
      { error: "Failed to fetch assets" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden. Admins only." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const parsed = assetFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const assetName =
      data.name && data.name.trim().length > 0
        ? data.name.trim()
        : `${data.customerName.trim()} Asset`;

    const created = await createAssetRecord(
      {
        name: assetName,
        customerName: data.customerName,
        customerNumber: data.customerNumber,
        location: data.location,
        status: data.status,
        products: data.products,
      },
      user.id,
    );

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/assets error:", err);
    const msg = err instanceof Error ? err.message : "Failed to create asset";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
