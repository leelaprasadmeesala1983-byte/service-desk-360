"use client";

import { Loader2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { RecordTechnicianWorkReport } from "@/db/queries/technician-reports";
import { fetchRecordTechnicianWorkReport } from "@/lib/actions/technician-reports";
import type { RecordType } from "@/lib/constants";

interface RecordWorkSummaryProps {
  workType: RecordType;
  referenceId: string;
}

export function RecordWorkSummary({
  workType,
  referenceId,
}: RecordWorkSummaryProps) {
  const [report, setReport] = useState<RecordTechnicianWorkReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      const res = await fetchRecordTechnicianWorkReport({
        workType,
        referenceId,
      });
      if (isMounted && res.ok && res.data) {
        setReport(res.data);
      }
      if (isMounted) setLoading(false);
    }
    void loadData();
    return () => {
      isMounted = false;
    };
  }, [workType, referenceId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        <span>Loading technician work breakdown...</span>
      </div>
    );
  }

  if (!report || report.technicians.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card/40 p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          <Users className="size-3.5 text-primary" />
          Technician Work Activity
        </span>
        <span className="text-muted-foreground">
          Total:{" "}
          <strong className="text-foreground">{report.totalWorkDays}</strong>{" "}
          technician work days
        </span>
      </div>

      <div className="divide-y divide-border/60">
        {report.technicians.map((tech) => (
          <div
            key={tech.technicianId}
            className="flex items-center justify-between py-1.5 text-xs"
          >
            <div>
              <span className="font-medium text-foreground">
                {tech.technicianName}
              </span>
              {tech.department && (
                <span className="ml-1.5 text-[11px] text-muted-foreground">
                  ({tech.department})
                </span>
              )}
              <div className="mt-0.5 space-y-0.5 text-[10px] text-muted-foreground">
                {tech.dates && tech.dates.length > 0 ? (
                  tech.dates.map((d) => <div key={d}>Work date: {d}</div>)
                ) : (
                  <div>Work date: {tech.firstWorkDate}</div>
                )}
              </div>
            </div>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {tech.workedDays} {tech.workedDays === 1 ? "day" : "days"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
