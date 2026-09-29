import { notFound } from "next/navigation";
import { VendorReceivedView } from "@/components/assets/vendor-received-view";
import { listSendToVendor } from "@/db/queries/send-to-vendor";
import { APP_MODULES } from "@/lib/modules";
import { requireUser } from "@/lib/session";

export default async function VendorReceivedPage() {
  const user = await requireUser();

  if (!APP_MODULES["asset-management"].roles.includes(user.role)) {
    notFound();
  }

  const viewer = { role: user.role, id: user.id };
  const initialDispatches = await listSendToVendor(
    {
      page: 1,
      limit: 10,
      workflowStage: "VENDOR_RECEIVED",
    },
    viewer,
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <VendorReceivedView initialDispatches={initialDispatches} />
    </div>
  );
}
