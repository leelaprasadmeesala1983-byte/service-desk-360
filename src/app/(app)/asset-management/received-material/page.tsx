import { notFound } from "next/navigation";
import { ReceivedMaterialView } from "@/components/assets/received-material-view";
import { listAssets } from "@/db/queries/assets";
import { APP_MODULES } from "@/lib/modules";
import { requireUser } from "@/lib/session";

export default async function ReceivedMaterialPage() {
  const user = await requireUser();

  if (!APP_MODULES["asset-management"].roles.includes(user.role)) {
    notFound();
  }

  const viewer = { role: user.role, id: user.id };
  const initialAssets = await listAssets(
    {
      page: 1,
      limit: 10,
      status: "ALL",
    },
    viewer,
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <ReceivedMaterialView initialAssets={initialAssets} />
    </div>
  );
}
