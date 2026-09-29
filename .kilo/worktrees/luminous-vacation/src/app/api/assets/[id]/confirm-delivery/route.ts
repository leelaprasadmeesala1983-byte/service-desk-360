import { type NextRequest, NextResponse } from "next/server";
import { confirmCustomerDelivery } from "@/db/queries/asset-lifecycle";
import { getCurrentUser } from "@/lib/session";
import { confirmDeliverySchema } from "@/lib/validations/customer-dispatch";

export async function POST(
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

  const { id: assetId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = confirmDeliverySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const updated = await confirmCustomerDelivery({
      assetId,
      input: {
        assetId,
        ...parsed.data,
      },
      userId: user.id,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    console.error("POST /api/assets/[id]/confirm-delivery error:", err);
    const msg =
      err instanceof Error
        ? err.message
        : "Failed to confirm material delivery";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
