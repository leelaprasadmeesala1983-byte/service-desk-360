import { type NextRequest, NextResponse } from "next/server";

import {
  deleteAssetProductRecord,
  deleteAssetRecord,
  getAssetById,
  updateAssetRecord,
} from "@/db/queries/assets";
import { getCurrentUser } from "@/lib/session";
import { assetFormSchema } from "@/lib/validations/assets";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const item = await getAssetById(id);
    if (!item) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: item });
  } catch (err: unknown) {
    console.error("GET /api/assets/[id] error:", err);
    return NextResponse.json(
      { error: "Failed to fetch asset details" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const targetProductId = searchParams.get("productId") || undefined;

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
    const updated = await updateAssetRecord(id, {
      name:
        data.name && data.name.trim().length > 0 ? data.name.trim() : undefined,
      customerName: data.customerName,
      customerNumber: data.customerNumber,
      location: data.location,
      status: data.status,
      products: data.products,
      targetProductId,
    });

    if (!updated) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    console.error("PUT /api/assets/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Failed to update asset";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");

  try {
    const deleted = productId
      ? await deleteAssetProductRecord(id, productId)
      : await deleteAssetRecord(id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Asset or product not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: productId ? "Product record deleted" : "Asset deleted",
    });
  } catch (err: unknown) {
    console.error("DELETE /api/assets/[id] error:", err);
    const msg = err instanceof Error ? err.message : "Failed to delete asset";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
