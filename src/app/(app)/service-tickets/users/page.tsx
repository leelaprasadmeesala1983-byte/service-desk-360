import { UsersView } from "@/components/service-tickets/users/users-view";
import { listDepartmentNames } from "@/db/queries/departments";
import { getUserStats, listUsers } from "@/db/queries/users";
import { requireAdmin } from "@/lib/session";

export default async function UsersPage() {
  // Technicians never reach this screen; the nav entry is hidden for them too.
  const admin = await requireAdmin();

  const viewer = { role: admin.role, id: admin.id };

  const [users, stats, departments] = await Promise.all([
    listUsers({}, viewer),
    getUserStats(viewer),
    listDepartmentNames(),
  ]);

  return (
    <UsersView
      users={users}
      stats={stats}
      departments={departments}
      currentUserId={admin.id}
    />
  );
}
