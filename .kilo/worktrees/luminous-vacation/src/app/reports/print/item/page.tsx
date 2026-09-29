import { notFound } from "next/navigation";
import { ItemPrintReport } from "@/components/assets/reports/print/item-print-report";
import { getItemReport } from "@/db/queries/reports";
import { requireUser } from "@/lib/session";

export default async function ItemPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; trackId?: string }>;
}) {
  await requireUser();
  const params = await searchParams;
  const trackId = params.trackId || params.id;

  if (!trackId) {
    return notFound();
  }

  const reportData = await getItemReport(decodeURIComponent(trackId));

  if (!reportData) {
    return notFound();
  }

  return <ItemPrintReport data={reportData} />;
}
