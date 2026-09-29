import { notFound } from "next/navigation";
import { AssetsDashboard } from "@/components/assets/assets-dashboard";
import { getAssetStats } from "@/db/queries/assets";
import { getSendToVendorStats } from "@/db/queries/send-to-vendor";
import { APP_MODULES } from "@/lib/modules";
import { requireUser } from "@/lib/session";

export default async function AssetManagementDashboardPage() {
  const user = await requireUser();

  if (!APP_MODULES["asset-management"].roles.includes(user.role)) {
    notFound();
  }

  const viewer = { role: user.role, id: user.id };
  const [assetStats, sendToVendorStats] = await Promise.all([
    getAssetStats(viewer),
    getSendToVendorStats(viewer),
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <AssetsDashboard
        stats={assetStats}
        sendToVendorCount={sendToVendorStats.total}
      />
    </div>
  );
}
