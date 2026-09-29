import { notFound } from "next/navigation";
import { VendorsView } from "@/components/vendors/vendors-view";
import { listVendors } from "@/db/queries/vendors";
import { APP_MODULES } from "@/lib/modules";
import { requireUser } from "@/lib/session";

export default async function VendorsPage() {
  const user = await requireUser();

  if (!APP_MODULES["asset-management"].roles.includes(user.role)) {
    notFound();
  }

  const initialVendors = await listVendors({
    page: 1,
    limit: 10,
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <VendorsView initialVendors={initialVendors} />
    </div>
  );
}
