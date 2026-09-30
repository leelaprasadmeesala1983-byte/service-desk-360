import { notFound } from "next/navigation";
import { VendorPrintReport } from "@/components/assets/reports/print/vendor-print-report";
import { getVendorReport } from "@/db/queries/reports";
import { requireUser } from "@/lib/session";

export default async function VendorPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; vendor?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const vendorId = params.id || params.vendor;

  if (!vendorId) {
    return notFound();
  }

  const viewer = { role: user.role, id: user.id };
  const reportData = await getVendorReport(
    decodeURIComponent(vendorId),
    {
      limit: 1000,
    },
    viewer,
  );

  if (!reportData) {
    return notFound();
  }

  return <VendorPrintReport data={reportData} />;
}
