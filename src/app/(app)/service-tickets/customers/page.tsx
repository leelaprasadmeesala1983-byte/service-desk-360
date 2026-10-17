import { CustomersView } from "@/components/service-tickets/customers/customers-view";
import { listCustomers } from "@/db/queries/customers";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const admin = await requireAdmin();
  const viewer = { role: admin.role, id: admin.id };

  const initialData = await listCustomers({ page: 1, limit: 10 }, viewer);

  return <CustomersView initialData={initialData} />;
}
