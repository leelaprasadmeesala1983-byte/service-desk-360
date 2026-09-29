import { type NextRequest, NextResponse } from "next/server";
import { customerReturnMaterial } from "@/db/queries/asset-lifecycle";
import { getCurrentUser } from "@/lib/session";
import { customerReturnFormSchema } from "@/lib/validations/customer-dispatch";

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
    const body = await request.json();
    const parsed = customerReturnFormSchema.safeParse({
      ...body,
      assetId,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await customerReturnMaterial({
      assetId,
      input: parsed.data,
      userId: user.id,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    console.error("POST /api/assets/[id]/customer-return error:", err);
    const msg =
      err instanceof Error ? err.message : "Failed to process customer return";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
