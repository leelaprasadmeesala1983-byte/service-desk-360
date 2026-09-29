import { Suspense } from "react";
import type { ReportTabKey } from "@/components/assets/reports/report-tabs";
import { ReportsView } from "@/components/assets/reports/reports-view";
import { requireUser } from "@/lib/session";

export const metadata = {
  title: "Reports | ServiceDesk 360",
  description: "Customer, Vendor, and Material Item Service & Repair Reports",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const initialTab = (params.tab as ReportTabKey) || "customer";

  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-muted-foreground">
          Loading reports...
        </div>
      }
    >
      <ReportsView initialTab={initialTab} />
    </Suspense>
  );
}
